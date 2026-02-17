export const STATIC_BOOKCASE_KEYS = ["creating", "recommended"] as const;
export const RESERVED_BOOKCASE_KEYS = ["admin", "inner"] as const;

const STATIC_SET = new Set<string>(STATIC_BOOKCASE_KEYS);
const RESERVED_SET = new Set<string>(RESERVED_BOOKCASE_KEYS);

export function normalizeBookcaseKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isBookcaseKeyReserved(key: string) {
  return RESERVED_SET.has(key);
}

export function isValidBookcaseKey(key: string) {
  return /^[a-z0-9][a-z0-9-]{1,39}$/.test(key) && !isBookcaseKeyReserved(key);
}

export function bookcasePathForKey(key: string) {
  const normalized = normalizeBookcaseKey(key);
  if (STATIC_SET.has(normalized)) {
    return `/bookcase/${normalized}`;
  }
  return `/bookcase/${encodeURIComponent(normalized)}`;
}

export function bookcaseLabelForKey(key: string) {
  const normalized = normalizeBookcaseKey(key);
  if (!normalized) return "Bookcase";
  return normalized
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

