export const DEVICE_PROFILE_KEYS = [
  "desktop",
  "iphone-portrait",
  "iphone-portrait-max",
  "iphone-landscape",
  "iphone-landscape-max",
  "ipad-portrait",
  "ipad-landscape",
] as const;

export type DeviceProfileKey = (typeof DEVICE_PROFILE_KEYS)[number];

export const DEVICE_PROFILE_LABELS: Record<DeviceProfileKey, string> = {
  desktop: "Desktop",
  "iphone-portrait": "iPhone Portrait (Regular)",
  "iphone-portrait-max": "iPhone Portrait (Max)",
  "iphone-landscape": "iPhone Landscape (Regular)",
  "iphone-landscape-max": "iPhone Landscape (Max)",
  "ipad-portrait": "iPad Portrait",
  "ipad-landscape": "iPad Landscape",
};

export const DEFAULT_DEVICE_LAYOUTS: Record<DeviceProfileKey, Record<string, string>> = {
  desktop: {
    "--login-bg-size": "100%",
    "--login-bg-size-x": "100%",
    "--login-bg-size-y": "100%",
    "--login-bg-pos-y": "0%",
    "--login-left-top": "36%",
    "--login-left-left": "24%",
    "--login-left-width": "24%",
    "--login-left-height": "20%",
    "--login-right-top": "34%",
    "--login-right-left": "10%",
    "--login-right-mode-top": "30%",
    "--login-right-width": "26%",
    "--login-right-height": "18%",
    "--login-desktop-text-scale": "1",
  },
  "iphone-portrait": {
    "--login-bg-size": "180%",
    "--login-bg-size-x": "180%",
    "--login-bg-size-y": "100%",
    "--login-bg-pos-y": "2%",
    "--login-book-width": "860px",
    "--login-book-min-width": "860px",
    "--login-book-height": "100%",
    "--login-book-min-height": "100%",
    "--login-left-top": "43%",
    "--login-left-left": "31%",
    "--login-left-width": "24%",
    "--login-left-height": "20%",
    "--login-right-top": "40%",
    "--login-right-left": "10%",
    "--login-right-mode-top": "37%",
    "--login-right-width": "26%",
    "--login-right-height": "18%",
    "--login-phone-panel-width": "43vw",
    "--login-phone-panel-max-width": "190px",
    "--login-popup-left": "70%",
    "--login-popup-top": "63%",
    "--login-popup-width": "82vw",
    "--login-popup-height": "18%",
    "--login-popup-max-width": "335px",
    "--login-popup-max-height": "56dvh",
    "--login-phone-form-scale": "1",
    "--login-phone-text-scale": "1",
    "--login-close-top": "calc(63% + min(30vh, 176px))",
  },
  "iphone-landscape": {
    "--login-bg-size": "130%",
    "--login-bg-size-x": "130%",
    "--login-bg-size-y": "100%",
    "--login-bg-pos-y": "0%",
    "--login-book-width": "930px",
    "--login-book-min-width": "930px",
    "--login-book-height": "min(92dvh, 470px)",
    "--login-book-min-height": "440px",
    "--login-left-top": "34%",
    "--login-left-left": "22%",
    "--login-left-width": "24%",
    "--login-left-height": "20%",
    "--login-right-top": "32%",
    "--login-right-left": "10%",
    "--login-right-mode-top": "30%",
    "--login-right-width": "26%",
    "--login-right-height": "18%",
    "--login-phone-panel-width": "38vw",
    "--login-phone-panel-max-width": "220px",
    "--login-popup-left": "69%",
    "--login-popup-top": "57%",
    "--login-popup-width": "50vw",
    "--login-popup-height": "16%",
    "--login-popup-max-width": "268px",
    "--login-popup-max-height": "50dvh",
    "--login-phone-form-scale": "1",
    "--login-phone-text-scale": "1",
    "--login-close-top": "calc(57% + min(26vh, 110px))",
  },
  "iphone-portrait-max": {
    "--login-bg-size": "180%",
    "--login-bg-size-x": "180%",
    "--login-bg-size-y": "100%",
    "--login-bg-pos-y": "2%",
    "--login-book-width": "900px",
    "--login-book-min-width": "900px",
    "--login-book-height": "100%",
    "--login-book-min-height": "100%",
    "--login-left-top": "43%",
    "--login-left-left": "31%",
    "--login-left-width": "24%",
    "--login-left-height": "20%",
    "--login-right-top": "40%",
    "--login-right-left": "10%",
    "--login-right-mode-top": "37%",
    "--login-right-width": "26%",
    "--login-right-height": "18%",
    "--login-phone-panel-width": "43vw",
    "--login-phone-panel-max-width": "210px",
    "--login-popup-left": "70%",
    "--login-popup-top": "63%",
    "--login-popup-width": "80vw",
    "--login-popup-height": "18%",
    "--login-popup-max-width": "360px",
    "--login-popup-max-height": "58dvh",
    "--login-phone-form-scale": "1",
    "--login-phone-text-scale": "1",
    "--login-close-top": "calc(63% + min(30vh, 186px))",
  },
  "iphone-landscape-max": {
    "--login-bg-size": "130%",
    "--login-bg-size-x": "130%",
    "--login-bg-size-y": "100%",
    "--login-bg-pos-y": "0%",
    "--login-book-width": "980px",
    "--login-book-min-width": "980px",
    "--login-book-height": "min(92dvh, 500px)",
    "--login-book-min-height": "460px",
    "--login-left-top": "34%",
    "--login-left-left": "22%",
    "--login-left-width": "24%",
    "--login-left-height": "20%",
    "--login-right-top": "32%",
    "--login-right-left": "10%",
    "--login-right-mode-top": "30%",
    "--login-right-width": "26%",
    "--login-right-height": "18%",
    "--login-phone-panel-width": "42vw",
    "--login-phone-panel-max-width": "240px",
    "--login-popup-left": "69%",
    "--login-popup-top": "57%",
    "--login-popup-width": "56vw",
    "--login-popup-height": "16%",
    "--login-popup-max-width": "300px",
    "--login-popup-max-height": "54dvh",
    "--login-phone-form-scale": "1",
    "--login-phone-text-scale": "1",
    "--login-close-top": "calc(57% + min(26vh, 124px))",
  },
  "ipad-portrait": {
    "--login-ipad-page-top": "2.6rem",
    "--login-ipad-right-mode-top": "2.4rem",
    "--login-ipad-text-size": "1.16rem",
    "--login-ipad-text-line-height": "1.66",
    "--login-left-width": "24%",
    "--login-left-height": "20%",
    "--login-right-width": "26%",
    "--login-right-height": "18%",
  },
  "ipad-landscape": {
    "--login-ipad-page-top": "2.2rem",
    "--login-ipad-right-mode-top": "1.95rem",
    "--login-ipad-text-size": "1rem",
    "--login-ipad-text-line-height": "1.58",
    "--login-left-width": "24%",
    "--login-left-height": "20%",
    "--login-right-width": "26%",
    "--login-right-height": "18%",
  },
};

const PROFILE_ALLOWED_KEYS: Record<DeviceProfileKey, Set<string>> = {
  desktop: new Set(Object.keys(DEFAULT_DEVICE_LAYOUTS.desktop)),
  "iphone-portrait": new Set(Object.keys(DEFAULT_DEVICE_LAYOUTS["iphone-portrait"])),
  "iphone-portrait-max": new Set(Object.keys(DEFAULT_DEVICE_LAYOUTS["iphone-portrait-max"])),
  "iphone-landscape": new Set(Object.keys(DEFAULT_DEVICE_LAYOUTS["iphone-landscape"])),
  "iphone-landscape-max": new Set(Object.keys(DEFAULT_DEVICE_LAYOUTS["iphone-landscape-max"])),
  "ipad-portrait": new Set(Object.keys(DEFAULT_DEVICE_LAYOUTS["ipad-portrait"])),
  "ipad-landscape": new Set(Object.keys(DEFAULT_DEVICE_LAYOUTS["ipad-landscape"])),
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

function clampPx(value: string, min: number, max: number) {
  const match = value.match(/^(-?\d+(?:\.\d+)?)px$/);
  if (!match) return null;
  const numeric = Number.parseFloat(match[1]);
  if (!Number.isFinite(numeric)) return null;
  return `${formatNumber(clamp(numeric, min, max))}px`;
}

function clampVw(value: string, min: number, max: number) {
  const match = value.match(/^(-?\d+(?:\.\d+)?)vw$/);
  if (!match) return null;
  const numeric = Number.parseFloat(match[1]);
  if (!Number.isFinite(numeric)) return null;
  return `${formatNumber(clamp(numeric, min, max))}vw`;
}

function clampDvh(value: string, min: number, max: number) {
  const match = value.match(/^(-?\d+(?:\.\d+)?)dvh$/);
  if (!match) return null;
  const numeric = Number.parseFloat(match[1]);
  if (!Number.isFinite(numeric)) return null;
  return `${formatNumber(clamp(numeric, min, max))}dvh`;
}

function clampUnitless(value: string, min: number, max: number) {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return null;
  return formatNumber(clamp(numeric, min, max));
}

const PERCENT_LIMITS: Record<string, [number, number]> = {
  "--login-bg-size": [60, 320],
  "--login-bg-size-x": [60, 320],
  "--login-bg-size-y": [60, 220],
  "--login-bg-pos-y": [-20, 50],
  "--login-left-top": [-30, 130],
  "--login-left-left": [-80, 260],
  "--login-left-width": [8, 90],
  "--login-left-height": [8, 80],
  "--login-right-top": [-30, 130],
  "--login-right-left": [-80, 260],
  "--login-right-mode-top": [-30, 130],
  "--login-right-width": [8, 90],
  "--login-right-height": [8, 80],
  "--login-popup-left": [10, 95],
  "--login-popup-top": [10, 95],
  "--login-popup-height": [5, 95],
};

const PX_LIMITS: Record<string, [number, number]> = {
  "--login-book-width": [640, 1200],
  "--login-book-min-width": [640, 1200],
  "--login-book-min-height": [320, 1400],
  "--login-phone-panel-max-width": [120, 360],
  "--login-popup-max-width": [180, 440],
};

const VW_LIMITS: Record<string, [number, number]> = {
  "--login-phone-panel-width": [20, 80],
  "--login-popup-width": [10, 120],
};

function sanitizeKeyedVar(profile: DeviceProfileKey, key: string, value: string) {
  const percentLimits = PERCENT_LIMITS[key];
  if (percentLimits) {
    return clampPercent(value, percentLimits[0], percentLimits[1]);
  }

  const pxLimits = PX_LIMITS[key];
  if (pxLimits) {
    return clampPx(value, pxLimits[0], pxLimits[1]);
  }

  const vwLimits = VW_LIMITS[key];
  if (vwLimits) {
    return clampVw(value, vwLimits[0], vwLimits[1]);
  }

  if (key === "--login-book-height") {
    if (value === "100%") return value;
    return null;
  }

  if (key === "--login-popup-max-height") {
    return clampDvh(value, 30, 80);
  }

  if (key === "--login-close-top") {
    if (!value.startsWith("calc(") || !value.endsWith(")")) return null;
    return value;
  }

  if (key === "--login-phone-form-scale") {
    return clampUnitless(value, 0.65, 1.4);
  }

  if (key === "--login-phone-text-scale") {
    return clampUnitless(value, 0.6, 3);
  }

  if (key === "--login-desktop-text-scale") {
    return clampUnitless(value, 0.6, 3);
  }

  if (profile === "ipad-portrait" || profile === "ipad-landscape") {
    if (key === "--login-ipad-page-top" || key === "--login-ipad-right-mode-top") {
      const match = value.match(/^(-?\d+(?:\.\d+)?)rem$/);
      if (!match) return null;
      const numeric = Number.parseFloat(match[1]);
      if (!Number.isFinite(numeric)) return null;
      return `${formatNumber(clamp(numeric, 0, 6))}rem`;
    }
    if (key === "--login-ipad-text-size") {
      const match = value.match(/^(-?\d+(?:\.\d+)?)rem$/);
      if (!match) return null;
      const numeric = Number.parseFloat(match[1]);
      if (!Number.isFinite(numeric)) return null;
      return `${formatNumber(clamp(numeric, 0.7, 2.4))}rem`;
    }
    if (key === "--login-ipad-text-line-height") {
      const numeric = Number.parseFloat(value);
      if (!Number.isFinite(numeric)) return null;
      return formatNumber(clamp(numeric, 1, 2.2));
    }
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

export function isDeviceProfileKey(value: string): value is DeviceProfileKey {
  return DEVICE_PROFILE_KEYS.includes(value as DeviceProfileKey);
}

export function defaultDeviceLayout(profile: DeviceProfileKey) {
  return { ...DEFAULT_DEVICE_LAYOUTS[profile] };
}

export function mergeDeviceLayout(profile: DeviceProfileKey, raw: unknown) {
  const defaults = DEFAULT_DEVICE_LAYOUTS[profile];
  const merged: Record<string, string> = { ...defaults };
  const vars = pickRawVars(raw);
  const allowed = PROFILE_ALLOWED_KEYS[profile];

  for (const [key, value] of Object.entries(vars)) {
    if (!allowed.has(key)) continue;
    const sanitized = sanitizeVarValue(value);
    if (!sanitized) continue;
    const normalized = sanitizeKeyedVar(profile, key, sanitized);
    if (!normalized) continue;
    merged[key] = normalized;
  }

  return merged;
}
