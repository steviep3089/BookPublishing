import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { supabaseServer } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/roles";

const TABLE_NAME = "bookcase_layout";
const LAYOUT_ID = 1;

type Hotspot = {
  key: string;
  xPercent: number;
  yPercent: number;
  label: string;
  targetPath: string;
};

const DEFAULT_HOTSPOTS: Hotspot[] = [
  {
    key: "creating",
    xPercent: 24,
    yPercent: 18,
    label: "Books I'm creating",
    targetPath: "/bookcase/creating",
  },
  {
    key: "recommended",
    xPercent: 74,
    yPercent: 18,
    label: "Books I'd recommend",
    targetPath: "/bookcase/recommended",
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeHotspot(raw: unknown, index: number): Hotspot {
  const fallback = DEFAULT_HOTSPOTS[index] ?? DEFAULT_HOTSPOTS[0];
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const keyRaw = typeof row.key === "string" ? row.key.trim() : "";
  const labelRaw = typeof row.label === "string" ? row.label.trim() : "";
  const pathRaw = typeof row.targetPath === "string" ? row.targetPath.trim() : "";
  const xRaw = Number(row.xPercent);
  const yRaw = Number(row.yPercent);

  return {
    key: keyRaw || fallback.key,
    label: labelRaw || fallback.label,
    targetPath: pathRaw.startsWith("/") ? pathRaw : fallback.targetPath,
    xPercent: Number.isFinite(xRaw) ? clamp(xRaw, 0, 100) : fallback.xPercent,
    yPercent: Number.isFinite(yRaw) ? clamp(yRaw, 0, 100) : fallback.yPercent,
  };
}

function withDefaultSlots(hotspots: Hotspot[]): Hotspot[] {
  const byKey = new Map<string, Hotspot>();
  for (const item of hotspots) byKey.set(item.key, item);

  const merged: Hotspot[] = DEFAULT_HOTSPOTS.map((slot) => byKey.get(slot.key) ?? slot);
  for (const item of hotspots) {
    if (!merged.some((entry) => entry.key === item.key)) merged.push(item);
  }

  return merged;
}

function parseLayout(raw: unknown) {
  if (!raw || typeof raw !== "object") return { hotspots: DEFAULT_HOTSPOTS };
  const row = raw as Record<string, unknown>;

  if (Array.isArray(row.hotspots)) {
    const parsed = row.hotspots.map((item, index) => sanitizeHotspot(item, index));
    return { hotspots: withDefaultSlots(parsed) };
  }

  // Legacy single-hotspot fallback.
  const xRaw = Number(row.x_percent);
  const yRaw = Number(row.y_percent);
  const labelRaw = typeof row.label === "string" ? row.label.trim() : "";
  const pathRaw = typeof row.target_path === "string" ? row.target_path.trim() : "";

  const legacy: Hotspot = {
    key: "creating",
    xPercent: Number.isFinite(xRaw) ? clamp(xRaw, 0, 100) : DEFAULT_HOTSPOTS[0].xPercent,
    yPercent: Number.isFinite(yRaw) ? clamp(yRaw, 0, 100) : DEFAULT_HOTSPOTS[0].yPercent,
    label: labelRaw || DEFAULT_HOTSPOTS[0].label,
    targetPath: pathRaw.startsWith("/") ? pathRaw : DEFAULT_HOTSPOTS[0].targetPath,
  };

  return { hotspots: withDefaultSlots([legacy]) };
}

function parseIncomingHotspots(raw: unknown): Hotspot[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return raw.map((item, index) => sanitizeHotspot(item, index));
}

export async function GET() {
  const { data, error } = await supabaseService
    .from(TABLE_NAME)
    .select("x_percent, y_percent, label, target_path, hotspots")
    .eq("id", LAYOUT_ID)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { layout: { hotspots: DEFAULT_HOTSPOTS }, source: "default", warning: error.message },
      { status: 200 }
    );
  }

  return NextResponse.json({
    layout: parseLayout(data),
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
  const hotspots = parseIncomingHotspots(payload.hotspots);

  if (!hotspots) {
    return NextResponse.json({ error: "At least one hotspot is required" }, { status: 400 });
  }

  const invalid = hotspots.find(
    (item) => !item.label || !item.targetPath.startsWith("/")
  );
  if (invalid) {
    return NextResponse.json(
      { error: "Each hotspot needs a label and target path starting with '/'" },
      { status: 400 }
    );
  }

  const primary = hotspots[0];

  const { error } = await supabaseService.from(TABLE_NAME).upsert(
    {
      id: LAYOUT_ID,
      x_percent: primary.xPercent,
      y_percent: primary.yPercent,
      label: primary.label,
      target_path: primary.targetPath,
      hotspots,
      updated_by: user.id,
    },
    { onConflict: "id" }
  );

  if (error) {
    return NextResponse.json(
      { error: `Save failed: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    saved: true,
    layout: { hotspots },
  });
}
