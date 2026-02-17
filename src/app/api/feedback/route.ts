import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const form = await req.formData();

  const chapter_id = String(form.get("chapter_id") || "");
  const fav_moment = String(form.get("fav_moment") || "");
  const confusing_bit = String(form.get("confusing_bit") || "");
  const suggestion = String(form.get("suggestion") || "");
  const extra_note = String(form.get("extra_note") || "");

  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  // Insert feedback — RLS will enforce allowed inserts only if chapter is readable (published)
  const { error } = await supabase.from("feedback").insert({
    chapter_id,
    user_id: user.id,
    fav_moment,
    confusing_bit,
    suggestion,
    extra_note,
    status: "pending",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.redirect(new URL(`/episodes/${chapter_id}`, req.url));
}
