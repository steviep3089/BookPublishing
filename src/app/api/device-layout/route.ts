import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { getUserRole } from "@/lib/supabase/roles";
import {
  defaultDeviceLayout,
  isDeviceProfileKey,
  mergeDeviceLayout,
  type DeviceProfileKey,
} from "@/lib/login/deviceLayout";

const TABLE_NAME = "device_layout_profiles";

async function loadRow(profile: DeviceProfileKey) {
  const result = await supabaseService
    .from(TABLE_NAME)
    .select("profile_key, layout")
    .eq("profile_key", profile)
    .maybeSingle();

  return result;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const profileRaw = (url.searchParams.get("profile") || "").trim().toLowerCase();
  if (!isDeviceProfileKey(profileRaw)) {
    return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
  }

  const defaults = defaultDeviceLayout(profileRaw);
  const { data, error } = await loadRow(profileRaw);
  if (error) {
    return NextResponse.json({
      profile: profileRaw,
      vars: defaults,
      source: "default",
      warning: error.message,
    });
  }

  const row = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  const vars = mergeDeviceLayout(profileRaw, row?.layout);
  return NextResponse.json({
    profile: profileRaw,
    vars,
    source: data ? "supabase" : "default",
  });
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRole(user.id);
  if (role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const profileRaw = typeof payload.profile === "string" ? payload.profile.trim().toLowerCase() : "";
  if (!isDeviceProfileKey(profileRaw)) {
    return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
  }

  const vars = mergeDeviceLayout(profileRaw, payload.vars);
  const layout = { vars };

  const { error } = await supabaseService.from(TABLE_NAME).upsert(
    {
      profile_key: profileRaw,
      layout,
      updated_by: user.id,
    },
    { onConflict: "profile_key" }
  );

  if (error) {
    return NextResponse.json({ error: `Save failed: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ saved: true, profile: profileRaw, vars });
}
