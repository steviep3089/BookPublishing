import {
  DEVICE_PROFILE_KEYS,
  type DeviceProfileKey,
} from "@/lib/login/deviceLayout";

export const BOOKCASE_HOME_PROFILE_KEYS = DEVICE_PROFILE_KEYS;
export type BookcaseHomeProfileKey = DeviceProfileKey;

export const BOOKCASE_HOME_PROFILE_LABELS: Record<BookcaseHomeProfileKey, string> = {
  desktop: "Desktop",
  "iphone-portrait": "iPhone Portrait (Regular)",
  "iphone-portrait-max": "iPhone Portrait (Max)",
  "iphone-landscape": "iPhone Landscape (Regular)",
  "iphone-landscape-max": "iPhone Landscape (Max)",
  "ipad-portrait": "iPad Portrait",
  "ipad-landscape": "iPad Landscape",
};

export const DEFAULT_BOOKCASE_HOME_LAYOUTS: Record<BookcaseHomeProfileKey, Record<string, string>> = {
  desktop: {
    "--bookcase-bg-size-x": "100%",
    "--bookcase-bg-size-y": "100%",
    "--bookcase-bg-pos-x": "50%",
    "--bookcase-bg-pos-y": "50%",
    "--bookcase-creating-left": "25%",
    "--bookcase-creating-top": "18%",
    "--bookcase-creating-width": "30%",
    "--bookcase-creating-height": "11%",
    "--bookcase-creating-text-scale": "1",
    "--bookcase-recommended-left": "75%",
    "--bookcase-recommended-top": "18%",
    "--bookcase-recommended-width": "30%",
    "--bookcase-recommended-height": "11%",
    "--bookcase-recommended-text-scale": "1",
  },
  "iphone-portrait": {
    "--bookcase-bg-size-x": "170%",
    "--bookcase-bg-size-y": "100%",
    "--bookcase-bg-pos-x": "50%",
    "--bookcase-bg-pos-y": "46%",
    "--bookcase-creating-left": "28%",
    "--bookcase-creating-top": "16%",
    "--bookcase-creating-width": "38%",
    "--bookcase-creating-height": "11%",
    "--bookcase-creating-text-scale": "1",
    "--bookcase-recommended-left": "72%",
    "--bookcase-recommended-top": "16%",
    "--bookcase-recommended-width": "38%",
    "--bookcase-recommended-height": "11%",
    "--bookcase-recommended-text-scale": "1",
  },
  "iphone-portrait-max": {
    "--bookcase-bg-size-x": "165%",
    "--bookcase-bg-size-y": "100%",
    "--bookcase-bg-pos-x": "50%",
    "--bookcase-bg-pos-y": "46%",
    "--bookcase-creating-left": "28%",
    "--bookcase-creating-top": "16%",
    "--bookcase-creating-width": "38%",
    "--bookcase-creating-height": "11%",
    "--bookcase-creating-text-scale": "1",
    "--bookcase-recommended-left": "72%",
    "--bookcase-recommended-top": "16%",
    "--bookcase-recommended-width": "38%",
    "--bookcase-recommended-height": "11%",
    "--bookcase-recommended-text-scale": "1",
  },
  "iphone-landscape": {
    "--bookcase-bg-size-x": "122%",
    "--bookcase-bg-size-y": "100%",
    "--bookcase-bg-pos-x": "50%",
    "--bookcase-bg-pos-y": "50%",
    "--bookcase-creating-left": "26%",
    "--bookcase-creating-top": "14%",
    "--bookcase-creating-width": "32%",
    "--bookcase-creating-height": "13%",
    "--bookcase-creating-text-scale": "1",
    "--bookcase-recommended-left": "74%",
    "--bookcase-recommended-top": "14%",
    "--bookcase-recommended-width": "32%",
    "--bookcase-recommended-height": "13%",
    "--bookcase-recommended-text-scale": "1",
  },
  "iphone-landscape-max": {
    "--bookcase-bg-size-x": "118%",
    "--bookcase-bg-size-y": "100%",
    "--bookcase-bg-pos-x": "50%",
    "--bookcase-bg-pos-y": "50%",
    "--bookcase-creating-left": "26%",
    "--bookcase-creating-top": "14%",
    "--bookcase-creating-width": "32%",
    "--bookcase-creating-height": "13%",
    "--bookcase-creating-text-scale": "1",
    "--bookcase-recommended-left": "74%",
    "--bookcase-recommended-top": "14%",
    "--bookcase-recommended-width": "32%",
    "--bookcase-recommended-height": "13%",
    "--bookcase-recommended-text-scale": "1",
  },
  "ipad-portrait": {
    "--bookcase-bg-size-x": "118%",
    "--bookcase-bg-size-y": "100%",
    "--bookcase-bg-pos-x": "50%",
    "--bookcase-bg-pos-y": "48%",
    "--bookcase-creating-left": "26%",
    "--bookcase-creating-top": "16%",
    "--bookcase-creating-width": "33%",
    "--bookcase-creating-height": "11%",
    "--bookcase-creating-text-scale": "1",
    "--bookcase-recommended-left": "74%",
    "--bookcase-recommended-top": "16%",
    "--bookcase-recommended-width": "33%",
    "--bookcase-recommended-height": "11%",
    "--bookcase-recommended-text-scale": "1",
  },
  "ipad-landscape": {
    "--bookcase-bg-size-x": "106%",
    "--bookcase-bg-size-y": "100%",
    "--bookcase-bg-pos-x": "50%",
    "--bookcase-bg-pos-y": "50%",
    "--bookcase-creating-left": "25%",
    "--bookcase-creating-top": "16%",
    "--bookcase-creating-width": "31%",
    "--bookcase-creating-height": "11%",
    "--bookcase-creating-text-scale": "1",
    "--bookcase-recommended-left": "75%",
    "--bookcase-recommended-top": "16%",
    "--bookcase-recommended-width": "31%",
    "--bookcase-recommended-height": "11%",
    "--bookcase-recommended-text-scale": "1",
  },
};

const PROFILE_ALLOWED_KEYS: Record<BookcaseHomeProfileKey, Set<string>> = {
  desktop: new Set(Object.keys(DEFAULT_BOOKCASE_HOME_LAYOUTS.desktop)),
  "iphone-portrait": new Set(Object.keys(DEFAULT_BOOKCASE_HOME_LAYOUTS["iphone-portrait"])),
  "iphone-portrait-max": new Set(Object.keys(DEFAULT_BOOKCASE_HOME_LAYOUTS["iphone-portrait-max"])),
  "iphone-landscape": new Set(Object.keys(DEFAULT_BOOKCASE_HOME_LAYOUTS["iphone-landscape"])),
  "iphone-landscape-max": new Set(Object.keys(DEFAULT_BOOKCASE_HOME_LAYOUTS["iphone-landscape-max"])),
  "ipad-portrait": new Set(Object.keys(DEFAULT_BOOKCASE_HOME_LAYOUTS["ipad-portrait"])),
  "ipad-landscape": new Set(Object.keys(DEFAULT_BOOKCASE_HOME_LAYOUTS["ipad-landscape"])),
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

function clampUnitless(value: string, min: number, max: number) {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return null;
  return formatNumber(clamp(numeric, min, max));
}

const PERCENT_LIMITS: Record<string, [number, number]> = {
  "--bookcase-bg-size-x": [60, 280],
  "--bookcase-bg-size-y": [60, 220],
  "--bookcase-bg-pos-x": [0, 100],
  "--bookcase-bg-pos-y": [0, 100],
  "--bookcase-creating-left": [0, 100],
  "--bookcase-creating-top": [0, 100],
  "--bookcase-creating-width": [8, 90],
  "--bookcase-creating-height": [6, 70],
  "--bookcase-recommended-left": [0, 100],
  "--bookcase-recommended-top": [0, 100],
  "--bookcase-recommended-width": [8, 90],
  "--bookcase-recommended-height": [6, 70],
};

function sanitizeKeyedVar(key: string, value: string) {
  const limits = PERCENT_LIMITS[key];
  if (limits) {
    return clampPercent(value, limits[0], limits[1]);
  }

  if (key === "--bookcase-creating-text-scale" || key === "--bookcase-recommended-text-scale") {
    return clampUnitless(value, 0.6, 3.5);
  }

  return null;
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

export function isBookcaseHomeProfileKey(value: string): value is BookcaseHomeProfileKey {
  return BOOKCASE_HOME_PROFILE_KEYS.includes(value as BookcaseHomeProfileKey);
}

export function defaultBookcaseHomeLayout(profile: BookcaseHomeProfileKey) {
  return { ...DEFAULT_BOOKCASE_HOME_LAYOUTS[profile] };
}

export function mergeBookcaseHomeLayout(profile: BookcaseHomeProfileKey, raw: unknown) {
  const defaults = DEFAULT_BOOKCASE_HOME_LAYOUTS[profile];
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
