import { supabaseService } from "@/lib/supabase/service";
import { STATIC_BOOKCASE_KEYS, bookcasePathForKey, normalizeBookcaseKey } from "@/lib/bookcase/pageKey";

type KeySortRank = {
  bucket: number;
  numeric: number;
  text: string;
};

function inferGroupBase(pageKey: string) {
  const key = normalizeBookcaseKey(pageKey);
  if (!key) return "recommended";
  if (key === "recommended" || key.startsWith("recommended-")) return "recommended";
  if (key === "creating" || key.startsWith("creating-")) return "creating";
  const dash = key.indexOf("-");
  return dash > 0 ? key.slice(0, dash) : key;
}

function sortRank(base: string, key: string): KeySortRank {
  if (key === base) return { bucket: 0, numeric: 1, text: "" };

  const suffix = key.startsWith(`${base}-`) ? key.slice(base.length + 1) : "";
  if (!suffix) return { bucket: 3, numeric: Number.MAX_SAFE_INTEGER, text: key };

  if (/^\d+$/.test(suffix)) {
    return { bucket: 1, numeric: Number(suffix), text: "" };
  }

  return { bucket: 2, numeric: Number.MAX_SAFE_INTEGER, text: suffix };
}

function compareKeys(base: string, a: string, b: string) {
  const ra = sortRank(base, a);
  const rb = sortRank(base, b);
  if (ra.bucket !== rb.bucket) return ra.bucket - rb.bucket;
  if (ra.numeric !== rb.numeric) return ra.numeric - rb.numeric;
  return ra.text.localeCompare(rb.text, undefined, { numeric: true, sensitivity: "base" });
}

export async function getBookcaseNav(pageKeyInput: string) {
  const pageKey = normalizeBookcaseKey(pageKeyInput);
  const base = inferGroupBase(pageKey);
  const startsWithBase = `${base}-`;

  const keys = new Set<string>(STATIC_BOOKCASE_KEYS);
  const { data } = await supabaseService.from("bookcase_book_layouts").select("page_key");
  if (Array.isArray(data)) {
    for (const row of data) {
      const value = row && typeof row === "object" ? (row as Record<string, unknown>).page_key : "";
      if (typeof value !== "string") continue;
      const key = normalizeBookcaseKey(value);
      if (key) keys.add(key);
    }
  }

  const group = Array.from(keys)
    .filter((key) => key === base || key.startsWith(startsWithBase))
    .sort((a, b) => compareKeys(base, a, b));

  if (!group.includes(pageKey)) {
    group.push(pageKey);
    group.sort((a, b) => compareKeys(base, a, b));
  }

  const index = Math.max(0, group.indexOf(pageKey));
  const backKey = index > 0 ? group[index - 1] : null;
  const nextKey = index < group.length - 1 ? group[index + 1] : null;

  return {
    base,
    backHref: backKey ? bookcasePathForKey(backKey) : "/bookcase",
    nextHref: nextKey ? bookcasePathForKey(nextKey) : bookcasePathForKey(pageKey),
  };
}

