import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { supabaseServer } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/roles";

const TABLE_NAME = "bookcase_page_layouts";

type Hotspot = {
  key: string;
  xPercent: number;
  yPercent: number;
  label: string;
  targetPath: string;
  fontSizeVw: number;
};

const DEFAULTS: Record<string, Hotspot[]> = {
  creating: [
    {
      key: "main",
      xPercent: 26,
      yPercent: 18,
      label: "Add link",
      targetPath: "/bookcase",
      fontSizeVw: 4.2,
    },
  ],
  recommended: [
    {
      key: "main",
      xPercent: 74,
      yPercent: 18,
      label: "Add link",
      targetPath: "/bookcase",
      fontSizeVw: 4.2,
    },
  ],
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pageDefaults(pageKey: string): Hotspot[] {
  return DEFAULTS[pageKey] ?? DEFAULTS.creating;
}

function sanitizeHotspot(raw: unknown, fallback: Hotspot): Hotspot {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const keyRaw = typeof row.key === "string" ? row.key.trim() : fallback.key;
  const labelRaw = typeof row.label === "string" ? row.label.trim() : fallback.label;
  const targetPathRaw =
    typeof row.targetPath === "string" ? row.targetPath.trim() : fallback.targetPath;
  const xRaw = Number(row.xPercent);
  const yRaw = Number(row.yPercent);
  const fontSizeRaw = Number(row.fontSizeVw);

  return {
    key: keyRaw || fallback.key,
    label: labelRaw || fallback.label,
    targetPath: targetPathRaw.startsWith("/") ? targetPathRaw : fallback.targetPath,
    xPercent: Number.isFinite(xRaw) ? clamp(xRaw, 0, 100) : fallback.xPercent,
    yPercent: Number.isFinite(yRaw) ? clamp(yRaw, 0, 100) : fallback.yPercent,
    fontSizeVw: Number.isFinite(fontSizeRaw)
      ? clamp(fontSizeRaw, 1.2, 10)
      : fallback.fontSizeVw,
  };
}

function sanitizeHotspots(raw: unknown, pageKey: string): Hotspot[] {
  const defaults = pageDefaults(pageKey);
  if (!Array.isArray(raw) || raw.length === 0) return defaults;
  return [sanitizeHotspot(raw[0], defaults[0])];
}

function getPageKey(url: URL) {
  return (url.searchParams.get("page") || "").trim().toLowerCase();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const pageKey = getPageKey(url);
  if (!pageKey) {
    return NextResponse.json({ error: "Missing page query parameter" }, { status: 400 });
  }

  const { data, error } = await supabaseService
    .from(TABLE_NAME)
    .select("page_key, hotspots")
    .eq("page_key", pageKey)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { layout: { hotspots: pageDefaults(pageKey) }, source: "default", warning: error.message },
      { status: 200 }
    );
  }

  const row = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  return NextResponse.json({
    layout: { hotspots: sanitizeHotspots(row?.hotspots, pageKey) },
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
  const pageKeyRaw = typeof payload.pageKey === "string" ? payload.pageKey.trim() : "";
  const pageKey = pageKeyRaw.toLowerCase();
  if (!pageKey) {
    return NextResponse.json({ error: "pageKey is required" }, { status: 400 });
  }

  const hotspots = sanitizeHotspots(payload.hotspots, pageKey);
  if (hotspots.length === 0) {
    return NextResponse.json({ error: "At least one hotspot is required" }, { status: 400 });
  }

  const invalid = hotspots.find((item) => !item.label || !item.targetPath.startsWith("/"));
  if (invalid) {
    return NextResponse.json(
      { error: "Each hotspot needs a label and a target path starting with '/'" },
      { status: 400 }
    );
  }

  const { error } = await supabaseService.from(TABLE_NAME).upsert(
    {
      page_key: pageKey,
      hotspots,
      updated_by: user.id,
    },
    { onConflict: "page_key" }
  );

  if (error) {
    return NextResponse.json({ error: `Save failed: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ saved: true, layout: { hotspots } });
}
