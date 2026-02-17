import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(req: Request) {
  const form = await req.formData();
  const token = String(form.get("token") || "");

  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  // Must be logged in
  const supa = await supabaseServer();
  const { data: authData } = await supa.auth.getUser();
  const user = authData.user;
  if (!user) return NextResponse.redirect(new URL(`/login`, req.url));

  // Fetch invite (service role; invites are not readable client-side)
  const { data: invite, error: invErr } = await supabaseService
    .from("invites")
    .select("*")
    .eq("token", token)
    .single();

  if (invErr || !invite) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  // Check invite status
  const now = new Date();
  if (invite.used_at) {
    return NextResponse.json({ error: "Invite already used" }, { status: 400 });
  }
  if (new Date(invite.expires_at) <= now) {
    return NextResponse.json({ error: "Invite expired" }, { status: 400 });
  }

  // OPTIONAL: enforce email match (recommended)
  // Supabase user emails are on user.email
  if ((user.email || "").toLowerCase() !== String(invite.email).toLowerCase()) {
    return NextResponse.json({ error: "This invite is for a different email address." }, { status: 403 });
  }

  // Ensure profile exists (display name fallback)
  await supabaseService.from("profiles").upsert({
    id: user.id,
    display_name: (user.email || "Reader").split("@")[0],
    role: "user",
  });

  // Find Episode 1 chapter id
  const { data: ch1, error: chErr } = await supabaseService
    .from("chapters")
    .select("id")
    .eq("episode_number", 1)
    .single();

  if (chErr || !ch1) return NextResponse.json({ error: "Episode 1 not found" }, { status: 500 });

  // Prevent re-trial: if they already had a trial entitlement once, do not refresh
  const { data: existingTrial } = await supabaseService
    .from("entitlements")
    .select("id, expires_at")
    .eq("user_id", user.id)
    .eq("chapter_id", ch1.id)
    .eq("source", "trial")
    .maybeSingle();

  if (existingTrial) {
    return NextResponse.json({ error: "Trial already claimed for this account." }, { status: 400 });
  }

  // Grant 7-day entitlement for episode 1
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: entErr } = await supabaseService.from("entitlements").insert({
    user_id: user.id,
    chapter_id: ch1.id,
    expires_at: expiresAt,
    source: "trial",
  });

  if (entErr) return NextResponse.json({ error: entErr.message }, { status: 500 });

  // Mark invite used
  await supabaseService.from("invites").update({ used_at: new Date().toISOString() }).eq("id", invite.id);

  return NextResponse.redirect(new URL(`/episodes`, req.url));
}
