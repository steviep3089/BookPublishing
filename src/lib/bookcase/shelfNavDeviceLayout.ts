import {
  DEVICE_PROFILE_KEYS,
  type DeviceProfileKey,
} from "@/lib/login/deviceLayout";

export const BOOKCASE_SHELF_NAV_PROFILE_KEYS = DEVICE_PROFILE_KEYS;
export type BookcaseShelfNavProfileKey = DeviceProfileKey;

export const BOOKCASE_SHELF_NAV_PROFILE_LABELS: Record<BookcaseShelfNavProfileKey, string> = {
  desktop: "Desktop",
  "iphone-portrait": "iPhone Portrait (Regular)",
  "iphone-portrait-max": "iPhone Portrait (Max)",
  "iphone-landscape": "iPhone Landscape (Regular)",
  "iphone-landscape-max": "iPhone Landscape (Max)",
  "ipad-portrait": "iPad Portrait",
  "ipad-landscape": "iPad Landscape",
};

export const DEFAULT_BOOKCASE_SHELF_NAV_LAYOUTS: Record<BookcaseShelfNavProfileKey, Record<string, string>> = {
  desktop: {
    "--bookcase-nav-back-x": "10%",
    "--bookcase-nav-back-y": "7%",
    "--bookcase-nav-next-x": "90%",
    "--bookcase-nav-next-y": "7%",
    "--bookcase-nav-width": "16%",
  },
  "iphone-portrait": {
    "--bookcase-nav-back-x": "12%",
    "--bookcase-nav-back-y": "7%",
    "--bookcase-nav-next-x": "88%",
    "--bookcase-nav-next-y": "7%",
    "--bookcase-nav-width": "24%",
  },
  "iphone-portrait-max": {
    "--bookcase-nav-back-x": "12%",
    "--bookcase-nav-back-y": "7%",
    "--bookcase-nav-next-x": "88%",
    "--bookcase-nav-next-y": "7%",
    "--bookcase-nav-width": "22%",
  },
  "iphone-landscape": {
    "--bookcase-nav-back-x": "8%",
    "--bookcase-nav-back-y": "10%",
    "--bookcase-nav-next-x": "92%",
    "--bookcase-nav-next-y": "10%",
    "--bookcase-nav-width": "16%",
  },
  "iphone-landscape-max": {
    "--bookcase-nav-back-x": "8%",
    "--bookcase-nav-back-y": "10%",
    "--bookcase-nav-next-x": "92%",
    "--bookcase-nav-next-y": "10%",
    "--bookcase-nav-width": "15%",
  },
  "ipad-portrait": {
    "--bookcase-nav-back-x": "10%",
    "--bookcase-nav-back-y": "6%",
    "--bookcase-nav-next-x": "90%",
    "--bookcase-nav-next-y": "6%",
    "--bookcase-nav-width": "18%",
  },
  "ipad-landscape": {
    "--bookcase-nav-back-x": "8%",
    "--bookcase-nav-back-y": "6%",
    "--bookcase-nav-next-x": "92%",
    "--bookcase-nav-next-y": "6%",
    "--bookcase-nav-width": "14%",
  },
};

const PROFILE_ALLOWED_KEYS: Record<BookcaseShelfNavProfileKey, Set<string>> = {
  desktop: new Set(Object.keys(DEFAULT_BOOKCASE_SHELF_NAV_LAYOUTS.desktop)),
  "iphone-portrait": new Set(Object.keys(DEFAULT_BOOKCASE_SHELF_NAV_LAYOUTS["iphone-portrait"])),
  "iphone-portrait-max": new Set(Object.keys(DEFAULT_BOOKCASE_SHELF_NAV_LAYOUTS["iphone-portrait-max"])),
  "iphone-landscape": new Set(Object.keys(DEFAULT_BOOKCASE_SHELF_NAV_LAYOUTS["iphone-landscape"])),
  "iphone-landscape-max": new Set(Object.keys(DEFAULT_BOOKCASE_SHELF_NAV_LAYOUTS["iphone-landscape-max"])),
  "ipad-portrait": new Set(Object.keys(DEFAULT_BOOKCASE_SHELF_NAV_LAYOUTS["ipad-portrait"])),
  "ipad-landscape": new Set(Object.keys(DEFAULT_BOOKCASE_SHELF_NAV_LAYOUTS["ipad-landscape"])),
};

function sanitizeVarValue(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 80) return null;
  return trimmed;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function clampPercent(value: string, min: number, max: number) {
  const match = value.match(/^(-?\d+(?:\.\d+)?)%$/);
  if (!match) return null;
  const numeric = Number.parseFloat(match[1]);
  if (!Number.isFinite(numeric)) return null;
  return `${formatNumber(clamp(numeric, min, max))}%`;
}

const PERCENT_LIMITS: Record<string, [number, number]> = {
  "--bookcase-nav-back-x": [0, 100],
  "--bookcase-nav-back-y": [0, 100],
  "--bookcase-nav-next-x": [0, 100],
  "--bookcase-nav-next-y": [0, 100],
  "--bookcase-nav-width": [6, 40],
};

function sanitizeKeyedVar(key: string, value: string) {
  const limits = PERCENT_LIMITS[key];
  if (!limits) return null;
  return clampPercent(value, limits[0], limits[1]);
}

function pickRawVars(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const row = raw as Record<string, unknown>;
  const varsRaw = row.vars;
  if (varsRaw && typeof varsRaw === "object") {
    return varsRaw as Record<string, unknown>;
  }
  return row;
}

export function isBookcaseShelfNavProfileKey(value: string): value is BookcaseShelfNavProfileKey {
  return BOOKCASE_SHELF_NAV_PROFILE_KEYS.includes(value as BookcaseShelfNavProfileKey);
}

export function defaultBookcaseShelfNavLayout(profile: BookcaseShelfNavProfileKey) {
  return { ...DEFAULT_BOOKCASE_SHELF_NAV_LAYOUTS[profile] };
}

export function mergeBookcaseShelfNavLayout(profile: BookcaseShelfNavProfileKey, raw: unknown) {
  const defaults = DEFAULT_BOOKCASE_SHELF_NAV_LAYOUTS[profile];
  const merged: Record<string, string> = { ...defaults };
  const vars = pickRawVars(raw);
  const allowed = PROFILE_ALLOWED_KEYS[profile];

  for (const [key, value] of Object.entries(vars)) {
    if (!allowed.has(key)) continue;
    const sanitized = sanitizeVarValue(value);
    if (!sanitized) continue;
    const normalized = sanitizeKeyedVar(key, sanitized);
    if (!normalized) continue;
    merged[key] = normalized;
  }

  return merged;
}
