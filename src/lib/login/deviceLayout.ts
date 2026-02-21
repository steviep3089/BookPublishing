export const DEVICE_PROFILE_KEYS = [
  "iphone-portrait",
  "iphone-landscape",
  "ipad-portrait",
  "ipad-landscape",
] as const;

export type DeviceProfileKey = (typeof DEVICE_PROFILE_KEYS)[number];

export const DEVICE_PROFILE_LABELS: Record<DeviceProfileKey, string> = {
  "iphone-portrait": "iPhone Portrait",
  "iphone-landscape": "iPhone Landscape",
  "ipad-portrait": "iPad Portrait",
  "ipad-landscape": "iPad Landscape",
};

export const DEFAULT_DEVICE_LAYOUTS: Record<DeviceProfileKey, Record<string, string>> = {
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
    "--login-popup-max-width": "335px",
    "--login-popup-max-height": "56dvh",
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
    "--login-popup-max-width": "268px",
    "--login-popup-max-height": "50dvh",
    "--login-close-top": "calc(57% + min(26vh, 110px))",
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
  "iphone-portrait": new Set(Object.keys(DEFAULT_DEVICE_LAYOUTS["iphone-portrait"])),
  "iphone-landscape": new Set(Object.keys(DEFAULT_DEVICE_LAYOUTS["iphone-landscape"])),
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
    merged[key] = sanitized;
  }

  return merged;
}
