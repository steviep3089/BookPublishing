import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { supabaseServer } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/roles";
import { isBookcaseShelfNavProfileKey, type BookcaseShelfNavProfileKey } from "@/lib/bookcase/shelfNavDeviceLayout";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TABLE_NAME = "bookcase_book_layouts";
const PROFILE_TABLE_NAME = "device_layout_profiles";
const PROFILE_PREFIX = "bookcase-books:";

type BookItem = {
  key: string;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  label: string;
  targetPath: string;
  spineType: "gold" | "brown";
  titleFont: "classic" | "story" | "elegant" | "script";
  titleSizeVw: number;
  titleColor: "brown" | "black";
  titleBoxXPercent: number;
  titleBoxYPercent: number;
  titleBoxWidthPercent: number;
  titleBoxHeightPercent: number;
  coverImageUrl: string;
  readerSampleText: string;
  infoPageText: string;
  readerSampleMediaUrl: string;
  readerSampleMediaType: string;
  infoPageMediaUrl: string;
  infoPageMediaType: string;
  fullBookMediaUrl: string;
  fullBookMediaType: string;
  fullBookHideFirstPages: number;
  fullBookMaxPages: number;
};

type FrontTemplate = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  coverWindow: {
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
  };
  actionButtons: {
    sample: FrontActionTemplate;
    info: FrontActionTemplate;
  };
};

type FrontActionTemplate = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

type AdminLogoTemplate = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

type FrontTemplates = {
  gold: FrontTemplate;
  brown: FrontTemplate;
  adminLogo: AdminLogoTemplate;
};

const MAX_BOOKS = 8;
const PRESET_BOOK_WIDTH = 14.67;
const PRESET_BOOK_HEIGHT = 73.59;
const MIN_TITLE_BOX_WIDTH = 20;
const MIN_TITLE_BOX_HEIGHT = 6;
const MIN_FRONT_WIDTH = 16;
const MIN_FRONT_HEIGHT = 26;
const MIN_COVER_WINDOW_WIDTH = 16;
const MIN_COVER_WINDOW_HEIGHT = 20;
const MAX_COVER_WINDOW_PERCENT = 100;
const MIN_ACTION_WIDTH_PERCENT = 10;
const MIN_ACTION_HEIGHT_PERCENT = 4;
const MAX_ACTION_WIDTH_PERCENT = 52;
const MAX_ACTION_HEIGHT_PERCENT = 26;
const MIN_ADMIN_LOGO_WIDTH_PERCENT = 5;
const MIN_ADMIN_LOGO_HEIGHT_PERCENT = 5;
const MAX_ADMIN_LOGO_WIDTH_PERCENT = 30;
const MAX_ADMIN_LOGO_HEIGHT_PERCENT = 30;
const DEFAULT_COVER_WINDOW_HEIGHT = 92;
const LEGACY_COVER_WINDOW_WIDTH = 70;
const LEGACY_COVER_WINDOW_HEIGHT = 77;
const DEFAULT_COVER_WINDOW = {
  xPercent: 50,
  yPercent: 50,
  widthPercent: MAX_COVER_WINDOW_PERCENT,
  heightPercent: DEFAULT_COVER_WINDOW_HEIGHT,
} as const;
const DEFAULT_SAMPLE_ACTION = {
  xPercent: 28,
  yPercent: 86,
  widthPercent: 32,
  heightPercent: 9,
} as const;
const DEFAULT_INFO_ACTION = {
  xPercent: 72,
  yPercent: 86,
  widthPercent: 32,
  heightPercent: 9,
} as const;
const DEFAULT_ADMIN_LOGO = {
  xPercent: 50,
  yPercent: 90,
  widthPercent: 10,
  heightPercent: 10,
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pageDefaults(pageKey: string): BookItem[] {
  return [];
}

function defaultTargetPath(pageKey: string) {
  return "/bookcase";
}

function defaultBookByIndex(pageKey: string, index: number): BookItem {
  const slot = clamp(index, 0, MAX_BOOKS - 1);
  const halfWidth = PRESET_BOOK_WIDTH / 2;
  const minX = halfWidth;
  const maxX = 100 - halfWidth;
  const xStep = MAX_BOOKS > 1 ? (maxX - minX) / (MAX_BOOKS - 1) : 0;
  const x = minX + slot * xStep;
  const y = 63;

  return {
    key: `book-${index + 1}`,
    xPercent: Number(x.toFixed(2)),
    yPercent: Number(y.toFixed(2)),
    widthPercent: PRESET_BOOK_WIDTH,
    heightPercent: PRESET_BOOK_HEIGHT,
    label: "",
    targetPath: defaultTargetPath(pageKey),
    spineType: index % 2 === 0 ? "gold" : "brown",
    titleFont: "classic",
    titleSizeVw: 1.6,
    titleColor: "brown",
    titleBoxXPercent: 50,
    titleBoxYPercent: 16,
    titleBoxWidthPercent: 46,
    titleBoxHeightPercent: 13,
    coverImageUrl: "",
    readerSampleText: "",
    infoPageText: "",
    readerSampleMediaUrl: "",
    readerSampleMediaType: "",
    infoPageMediaUrl: "",
    infoPageMediaType: "",
    fullBookMediaUrl: "",
    fullBookMediaType: "",
    fullBookHideFirstPages: 0,
    fullBookMaxPages: 0,
  };
}

function defaultFrontTemplate(): FrontTemplate {
  return {
    xPercent: 50,
    yPercent: 58,
    widthPercent: 34,
    heightPercent: 72,
    coverWindow: { ...DEFAULT_COVER_WINDOW },
    actionButtons: {
      sample: { ...DEFAULT_SAMPLE_ACTION },
      info: { ...DEFAULT_INFO_ACTION },
    },
  };
}

function sanitizeCoverWindow(
  raw: unknown,
  fallback: FrontTemplate["coverWindow"]
): FrontTemplate["coverWindow"] {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const widthRaw = Number(row.widthPercent);
  const heightRaw = Number(row.heightPercent);
  const xRaw = Number(row.xPercent);
  const yRaw = Number(row.yPercent);

  const width = Number.isFinite(widthRaw)
    ? clamp(widthRaw, MIN_COVER_WINDOW_WIDTH, MAX_COVER_WINDOW_PERCENT)
    : fallback.widthPercent;
  const height = Number.isFinite(heightRaw)
    ? clamp(heightRaw, MIN_COVER_WINDOW_HEIGHT, MAX_COVER_WINDOW_PERCENT)
    : fallback.heightPercent;
  const x = Number.isFinite(xRaw) ? clamp(xRaw, width / 2, 100 - width / 2) : fallback.xPercent;
  const y = Number.isFinite(yRaw) ? clamp(yRaw, height / 2, 100 - height / 2) : fallback.yPercent;
  const widthRounded = Number(width.toFixed(2));
  const heightRounded = Number(height.toFixed(2));
  const xRounded = Number(x.toFixed(2));
  const yRounded = Number(y.toFixed(2));
  const isLegacyDefault =
    Math.abs(widthRounded - LEGACY_COVER_WINDOW_WIDTH) <= 0.5 &&
    Math.abs(heightRounded - LEGACY_COVER_WINDOW_HEIGHT) <= 0.5;

  if (isLegacyDefault) {
    return { ...DEFAULT_COVER_WINDOW };
  }

  const rounded = {
    xPercent: xRounded,
    yPercent: yRounded,
    widthPercent: widthRounded,
    heightPercent: heightRounded,
  };

  if (
    Math.abs(rounded.xPercent - DEFAULT_COVER_WINDOW.xPercent) <= 0.01 &&
    Math.abs(rounded.yPercent - DEFAULT_COVER_WINDOW.yPercent) <= 0.01 &&
    Math.abs(rounded.widthPercent - DEFAULT_COVER_WINDOW.widthPercent) <= 0.01 &&
    Math.abs(rounded.heightPercent - DEFAULT_COVER_WINDOW.heightPercent) <= 0.01
  ) {
    return { ...DEFAULT_COVER_WINDOW };
  }

  return rounded;
}

function sanitizeFrontAction(
  raw: unknown,
  fallback: FrontActionTemplate
): FrontActionTemplate {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const widthRaw = Number(row.widthPercent);
  const heightRaw = Number(row.heightPercent);
  const xRaw = Number(row.xPercent);
  const yRaw = Number(row.yPercent);

  const width = Number.isFinite(widthRaw)
    ? clamp(widthRaw, MIN_ACTION_WIDTH_PERCENT, MAX_ACTION_WIDTH_PERCENT)
    : fallback.widthPercent;
  const height = Number.isFinite(heightRaw)
    ? clamp(heightRaw, MIN_ACTION_HEIGHT_PERCENT, MAX_ACTION_HEIGHT_PERCENT)
    : fallback.heightPercent;
  const x = Number.isFinite(xRaw) ? clamp(xRaw, width / 2, 100 - width / 2) : fallback.xPercent;
  const y = Number.isFinite(yRaw) ? clamp(yRaw, height / 2, 100 - height / 2) : fallback.yPercent;

  return {
    xPercent: Number(x.toFixed(2)),
    yPercent: Number(y.toFixed(2)),
    widthPercent: Number(width.toFixed(2)),
    heightPercent: Number(height.toFixed(2)),
  };
}

function sanitizeFrontTemplate(raw: unknown, fallback: FrontTemplate): FrontTemplate {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const actionButtonsRow =
    row.actionButtons && typeof row.actionButtons === "object"
      ? (row.actionButtons as Record<string, unknown>)
      : {};
  const widthRaw = Number(row.widthPercent);
  const heightRaw = Number(row.heightPercent);
  const xRaw = Number(row.xPercent);
  const yRaw = Number(row.yPercent);

  const width = Number.isFinite(widthRaw) ? clamp(widthRaw, MIN_FRONT_WIDTH, 92) : fallback.widthPercent;
  const height = Number.isFinite(heightRaw) ? clamp(heightRaw, MIN_FRONT_HEIGHT, 96) : fallback.heightPercent;
  const x = Number.isFinite(xRaw) ? clamp(xRaw, width / 2, 100 - width / 2) : fallback.xPercent;
  const y = Number.isFinite(yRaw) ? clamp(yRaw, height / 2, 100 - height / 2) : fallback.yPercent;

  return {
    xPercent: Number(x.toFixed(2)),
    yPercent: Number(y.toFixed(2)),
    widthPercent: Number(width.toFixed(2)),
    heightPercent: Number(height.toFixed(2)),
    coverWindow: sanitizeCoverWindow(row.coverWindow, fallback.coverWindow),
    actionButtons: {
      sample: sanitizeFrontAction(actionButtonsRow.sample, fallback.actionButtons.sample),
      info: sanitizeFrontAction(actionButtonsRow.info, fallback.actionButtons.info),
    },
  };
}

function sanitizeAdminLogo(raw: unknown, fallback: AdminLogoTemplate): AdminLogoTemplate {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const widthRaw = Number(row.widthPercent);
  const heightRaw = Number(row.heightPercent);
  const xRaw = Number(row.xPercent);
  const yRaw = Number(row.yPercent);

  const width = Number.isFinite(widthRaw)
    ? clamp(widthRaw, MIN_ADMIN_LOGO_WIDTH_PERCENT, MAX_ADMIN_LOGO_WIDTH_PERCENT)
    : fallback.widthPercent;
  const height = Number.isFinite(heightRaw)
    ? clamp(heightRaw, MIN_ADMIN_LOGO_HEIGHT_PERCENT, MAX_ADMIN_LOGO_HEIGHT_PERCENT)
    : fallback.heightPercent;
  const x = Number.isFinite(xRaw) ? clamp(xRaw, width / 2, 100 - width / 2) : fallback.xPercent;
  const y = Number.isFinite(yRaw) ? clamp(yRaw, height / 2, 100 - height / 2) : fallback.yPercent;

  return {
    xPercent: Number(x.toFixed(2)),
    yPercent: Number(y.toFixed(2)),
    widthPercent: Number(width.toFixed(2)),
    heightPercent: Number(height.toFixed(2)),
  };
}

function sanitizeFrontTemplates(raw: unknown): FrontTemplates {
  const base = defaultFrontTemplate();
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  return {
    gold: sanitizeFrontTemplate(row.gold, base),
    brown: sanitizeFrontTemplate(row.brown, base),
    adminLogo: sanitizeAdminLogo(row.adminLogo, DEFAULT_ADMIN_LOGO),
  };
}

function sanitizeBook(raw: unknown, fallback: BookItem): BookItem {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const keyRaw = typeof row.key === "string" ? row.key.trim() : fallback.key;
  const labelRaw = typeof row.label === "string" ? row.label : fallback.label;
  const targetRaw = typeof row.targetPath === "string" ? row.targetPath.trim() : fallback.targetPath;
  const spineRaw = row.spineType === "gold" || row.spineType === "brown" ? row.spineType : fallback.spineType;
  const titleFontRaw =
    row.titleFont === "classic" ||
    row.titleFont === "story" ||
    row.titleFont === "elegant" ||
    row.titleFont === "script"
      ? row.titleFont
      : fallback.titleFont;
  const titleSizeRaw = Number(row.titleSizeVw);
  const titleColorRaw = row.titleColor === "black" || row.titleColor === "brown" ? row.titleColor : fallback.titleColor;
  const titleBoxXRaw = Number(row.titleBoxXPercent);
  const titleBoxYRaw = Number(row.titleBoxYPercent);
  const titleBoxWidthRaw = Number(row.titleBoxWidthPercent);
  const titleBoxHeightRaw = Number(row.titleBoxHeightPercent);
  const coverImageUrlRaw = typeof row.coverImageUrl === "string" ? row.coverImageUrl.trim() : fallback.coverImageUrl;
  const readerSampleTextRaw =
    typeof row.readerSampleText === "string" ? row.readerSampleText : fallback.readerSampleText;
  const infoPageTextRaw = typeof row.infoPageText === "string" ? row.infoPageText : fallback.infoPageText;
  const readerSampleMediaUrlRaw =
    typeof row.readerSampleMediaUrl === "string" ? row.readerSampleMediaUrl.trim() : fallback.readerSampleMediaUrl;
  const readerSampleMediaTypeRaw =
    typeof row.readerSampleMediaType === "string"
      ? row.readerSampleMediaType.trim()
      : fallback.readerSampleMediaType;
  const infoPageMediaUrlRaw =
    typeof row.infoPageMediaUrl === "string" ? row.infoPageMediaUrl.trim() : fallback.infoPageMediaUrl;
  const infoPageMediaTypeRaw =
    typeof row.infoPageMediaType === "string" ? row.infoPageMediaType.trim() : fallback.infoPageMediaType;
  const fullBookMediaUrlRaw =
    typeof row.fullBookMediaUrl === "string" ? row.fullBookMediaUrl.trim() : fallback.fullBookMediaUrl;
  const fullBookMediaTypeRaw =
    typeof row.fullBookMediaType === "string" ? row.fullBookMediaType.trim() : fallback.fullBookMediaType;
  const fullBookHideFirstPagesRaw = Number(row.fullBookHideFirstPages);
  const fullBookMaxPagesRaw = Number(row.fullBookMaxPages);

  const width = Number.isFinite(Number(row.widthPercent))
    ? clamp(Number(row.widthPercent), 4, 40)
    : fallback.widthPercent;
  const height = Number.isFinite(Number(row.heightPercent))
    ? clamp(Number(row.heightPercent), 8, 82)
    : fallback.heightPercent;

  const x = Number.isFinite(Number(row.xPercent))
    ? clamp(Number(row.xPercent), width / 2, 100 - width / 2)
    : fallback.xPercent;
  const y = Number.isFinite(Number(row.yPercent))
    ? clamp(Number(row.yPercent), height / 2, 100 - height / 2)
    : fallback.yPercent;

  const titleBoxWidth = Number.isFinite(titleBoxWidthRaw)
    ? clamp(titleBoxWidthRaw, MIN_TITLE_BOX_WIDTH, 90)
    : fallback.titleBoxWidthPercent;
  const titleBoxHeight = Number.isFinite(titleBoxHeightRaw)
    ? clamp(titleBoxHeightRaw, MIN_TITLE_BOX_HEIGHT, 40)
    : fallback.titleBoxHeightPercent;
  const titleBoxX = Number.isFinite(titleBoxXRaw)
    ? clamp(titleBoxXRaw, titleBoxWidth / 2, 100 - titleBoxWidth / 2)
    : fallback.titleBoxXPercent;
  const titleBoxY = Number.isFinite(titleBoxYRaw)
    ? clamp(titleBoxYRaw, titleBoxHeight / 2, 100 - titleBoxHeight / 2)
    : fallback.titleBoxYPercent;

  return {
    key: keyRaw || fallback.key,
    xPercent: Number(x.toFixed(2)),
    yPercent: Number(y.toFixed(2)),
    widthPercent: Number(width.toFixed(2)),
    heightPercent: Number(height.toFixed(2)),
    label: labelRaw,
    targetPath: targetRaw.startsWith("/") ? targetRaw : fallback.targetPath,
    spineType: spineRaw,
    titleFont: titleFontRaw,
    titleSizeVw: Number.isFinite(titleSizeRaw) ? clamp(titleSizeRaw, 1.2, 3.8) : fallback.titleSizeVw,
    titleColor: titleColorRaw,
    titleBoxXPercent: Number(titleBoxX.toFixed(2)),
    titleBoxYPercent: Number(titleBoxY.toFixed(2)),
    titleBoxWidthPercent: Number(titleBoxWidth.toFixed(2)),
    titleBoxHeightPercent: Number(titleBoxHeight.toFixed(2)),
    coverImageUrl: coverImageUrlRaw,
    readerSampleText: readerSampleTextRaw,
    infoPageText: infoPageTextRaw,
    readerSampleMediaUrl: readerSampleMediaUrlRaw,
    readerSampleMediaType: readerSampleMediaTypeRaw,
    infoPageMediaUrl: infoPageMediaUrlRaw,
    infoPageMediaType: infoPageMediaTypeRaw,
    fullBookMediaUrl: fullBookMediaUrlRaw,
    fullBookMediaType: fullBookMediaTypeRaw,
    fullBookHideFirstPages: Number.isFinite(fullBookHideFirstPagesRaw)
      ? clamp(Math.round(fullBookHideFirstPagesRaw), 0, 5000)
      : fallback.fullBookHideFirstPages,
    fullBookMaxPages: Number.isFinite(fullBookMaxPagesRaw) ? clamp(Math.round(fullBookMaxPagesRaw), 0, 5000) : fallback.fullBookMaxPages,
  };
}

function sanitizeBooks(raw: unknown, pageKey: string): BookItem[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  return raw
    .slice(0, MAX_BOOKS)
    .map((item, index) => sanitizeBook(item, defaultBookByIndex(pageKey, index)));
}

function getPageKey(url: URL) {
  return (url.searchParams.get("page") || "").trim().toLowerCase();
}

function getProfileQuery(url: URL): BookcaseShelfNavProfileKey | null | "__invalid__" {
  const raw = (url.searchParams.get("profile") || "").trim().toLowerCase();
  if (!raw) return null;
  if (!isBookcaseShelfNavProfileKey(raw)) return "__invalid__";
  return raw;
}

function toProfileKey(pageKey: string, profile: BookcaseShelfNavProfileKey) {
  return `${PROFILE_PREFIX}${pageKey}:${profile}`;
}

async function loadLegacyLayout(pageKey: string) {
  const { data, error } = await supabaseService
    .from(TABLE_NAME)
    .select("page_key, books, front_templates")
    .eq("page_key", pageKey)
    .maybeSingle();

  if (error) {
    const missingFrontTemplatesColumn =
      (typeof error.code === "string" && error.code === "42703") ||
      error.message.toLowerCase().includes("front_templates");

    if (missingFrontTemplatesColumn) {
      const legacy = await supabaseService
        .from(TABLE_NAME)
        .select("page_key, books")
        .eq("page_key", pageKey)
        .maybeSingle();

      if (!legacy.error) {
        const legacyRow = legacy.data && typeof legacy.data === "object" ? (legacy.data as Record<string, unknown>) : null;
        return {
          layout: {
            books: sanitizeBooks(legacyRow?.books, pageKey),
            frontTemplates: sanitizeFrontTemplates(null),
          },
          source: legacy.data ? "supabase-legacy" : "default",
          warning: "front_templates column missing; run SQL migration to enable shared front positions",
        };
      }
    }

    return {
      layout: { books: pageDefaults(pageKey), frontTemplates: sanitizeFrontTemplates(null) },
      source: "default",
      warning: error.message,
    };
  }

  const row = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  return {
    layout: {
      books: sanitizeBooks(row?.books, pageKey),
      frontTemplates: sanitizeFrontTemplates(row?.front_templates),
    },
    source: data ? "supabase" : "default",
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const pageKey = getPageKey(url);
  const profile = getProfileQuery(url);
  if (!pageKey) {
    return NextResponse.json({ error: "Missing page query parameter" }, { status: 400 });
  }
  if (profile === "__invalid__") {
    return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
  }

  if (profile) {
    const { data, error } = await supabaseService
      .from(PROFILE_TABLE_NAME)
      .select("profile_key, layout")
      .eq("profile_key", toProfileKey(pageKey, profile))
      .maybeSingle();

    if (!error && data) {
      const row = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
      const rawLayout =
        row?.layout && typeof row.layout === "object" ? (row.layout as Record<string, unknown>) : null;
      return NextResponse.json({
        profile,
        layout: {
          books: sanitizeBooks(rawLayout?.books, pageKey),
          frontTemplates: sanitizeFrontTemplates(rawLayout?.frontTemplates),
        },
        source: "supabase-profile",
      });
    }

    const legacy = await loadLegacyLayout(pageKey);
    return NextResponse.json({
      profile,
      ...legacy,
      source: `${legacy.source}-fallback`,
      warning: error ? `Profile load failed (${error.message}). Using fallback.` : legacy.warning,
    });
  }

  const legacy = await loadLegacyLayout(pageKey);
  return NextResponse.json(legacy);
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
  const profileRaw = typeof payload.profile === "string" ? payload.profile.trim().toLowerCase() : "";
  const profile: BookcaseShelfNavProfileKey | null = profileRaw
    ? (isBookcaseShelfNavProfileKey(profileRaw) ? profileRaw : null)
    : null;
  if (!pageKey) {
    return NextResponse.json({ error: "pageKey is required" }, { status: 400 });
  }
  if (profileRaw && !profile) {
    return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
  }

  const books = sanitizeBooks(payload.books, pageKey);
  const frontTemplates = sanitizeFrontTemplates(payload.frontTemplates);
  const invalid = books.find((item) => !item.targetPath.startsWith("/"));
  if (invalid) {
    return NextResponse.json(
      { error: "Each book needs a target path starting with '/'" },
      { status: 400 }
    );
  }

  if (profile) {
    const { error } = await supabaseService.from(PROFILE_TABLE_NAME).upsert(
      {
        profile_key: toProfileKey(pageKey, profile),
        layout: { books, frontTemplates },
        updated_by: user.id,
      },
      { onConflict: "profile_key" }
    );
    if (error) {
      return NextResponse.json({ error: `Save failed: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ saved: true, profile, layout: { books, frontTemplates } });
  }

  let { error } = await supabaseService.from(TABLE_NAME).upsert(
    {
      page_key: pageKey,
      books,
      front_templates: frontTemplates,
      updated_by: user.id,
    },
    { onConflict: "page_key" }
  );

  if (
    error &&
    ((typeof error.code === "string" && error.code === "42703") ||
      error.message.toLowerCase().includes("front_templates"))
  ) {
    const legacyWrite = await supabaseService.from(TABLE_NAME).upsert(
      {
        page_key: pageKey,
        books,
        updated_by: user.id,
      },
      { onConflict: "page_key" }
    );
    error = legacyWrite.error;
  }

  if (error) {
    return NextResponse.json({ error: `Save failed: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ saved: true, layout: { books, frontTemplates } });
}
