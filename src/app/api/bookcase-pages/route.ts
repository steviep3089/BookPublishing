import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { getUserRole } from "@/lib/supabase/roles";
import {
  STATIC_BOOKCASE_KEYS,
  bookcaseLabelForKey,
  bookcasePathForKey,
  isBookcaseKeyReserved,
  isValidBookcaseKey,
  normalizeBookcaseKey,
} from "@/lib/bookcase/pageKey";

const TABLE_NAME = "bookcase_book_layouts";
const MAX_BOOKS = 8;

type RawBook = Record<string, unknown>;

function emptyBookFromTemplate(book: unknown, index: number): RawBook {
  const row = book && typeof book === "object" ? (book as RawBook) : {};
  return {
    ...row,
    key: typeof row.key === "string" && row.key.trim() ? row.key : `book-${index + 1}`,
    label: "",
    targetPath: "/bookcase",
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

export async function GET() {
  const { data, error } = await supabaseService.from(TABLE_NAME).select("page_key").order("page_key");

  if (error) {
    return NextResponse.json(
      {
        pages: STATIC_BOOKCASE_KEYS.map((key) => ({
          key,
          label: bookcaseLabelForKey(key),
          path: bookcasePathForKey(key),
        })),
        warning: error.message,
      },
      { status: 200 }
    );
  }

  const keys = new Set<string>(STATIC_BOOKCASE_KEYS);
  for (const row of data ?? []) {
    const value = row && typeof row === "object" ? (row as Record<string, unknown>).page_key : "";
    if (typeof value !== "string") continue;
    const key = normalizeBookcaseKey(value);
    if (!key || isBookcaseKeyReserved(key)) continue;
    keys.add(key);
  }

  const pages = Array.from(keys)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => ({
      key,
      label: bookcaseLabelForKey(key),
      path: bookcasePathForKey(key),
    }));

  return NextResponse.json({ pages });
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const pageKeyRaw = typeof payload.pageKey === "string" ? payload.pageKey : "";
  const sourceRaw = typeof payload.sourcePageKey === "string" ? payload.sourcePageKey : "recommended";
  const templateBooksRaw = Array.isArray(payload.templateBooks) ? payload.templateBooks : [];
  const templateFrontTemplatesRaw =
    payload.templateFrontTemplates && typeof payload.templateFrontTemplates === "object"
      ? (payload.templateFrontTemplates as Record<string, unknown>)
      : null;

  const pageKey = normalizeBookcaseKey(pageKeyRaw);
  const sourcePageKey = normalizeBookcaseKey(sourceRaw) || "recommended";

  if (!pageKey) return NextResponse.json({ error: "New bookcase key is required" }, { status: 400 });
  if (!isValidBookcaseKey(pageKey)) {
    return NextResponse.json(
      { error: "Bookcase key must be 2-40 chars: letters, numbers, hyphen (not reserved)." },
      { status: 400 }
    );
  }

  const exists = await supabaseService.from(TABLE_NAME).select("page_key").eq("page_key", pageKey).maybeSingle();
  if (exists.data) {
    return NextResponse.json({ error: `Bookcase '${pageKey}' already exists.` }, { status: 409 });
  }
  if (exists.error) {
    return NextResponse.json({ error: exists.error.message }, { status: 500 });
  }

  let books: RawBook[] = [];
  let frontTemplates: Record<string, unknown> = {};

  if (templateBooksRaw.length > 0) {
    books = templateBooksRaw.slice(0, MAX_BOOKS).map((book, index) => emptyBookFromTemplate(book, index));
    frontTemplates = templateFrontTemplatesRaw ?? {};
  } else {
    const source = await supabaseService
      .from(TABLE_NAME)
      .select("books, front_templates")
      .eq("page_key", sourcePageKey)
      .maybeSingle();

    if (source.error) {
      return NextResponse.json({ error: source.error.message }, { status: 500 });
    }

    const sourceRow =
      source.data && typeof source.data === "object"
        ? (source.data as Record<string, unknown>)
        : ({} as Record<string, unknown>);
    const sourceBooks = Array.isArray(sourceRow.books) ? sourceRow.books : [];
    books = sourceBooks.slice(0, MAX_BOOKS).map((book, index) => emptyBookFromTemplate(book, index));
    frontTemplates =
      sourceRow.front_templates && typeof sourceRow.front_templates === "object"
        ? (sourceRow.front_templates as Record<string, unknown>)
        : {};
  }

  const insert = await supabaseService.from(TABLE_NAME).insert({
    page_key: pageKey,
    books,
    front_templates: frontTemplates,
    updated_by: user.id,
  });

  if (insert.error) {
    return NextResponse.json({ error: insert.error.message || "Failed to create bookcase." }, { status: 500 });
  }

  return NextResponse.json({
    created: true,
    page: {
      key: pageKey,
      label: bookcaseLabelForKey(pageKey),
      path: bookcasePathForKey(pageKey),
    },
  });
}
