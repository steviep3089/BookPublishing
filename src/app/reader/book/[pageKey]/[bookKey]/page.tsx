import Link from "next/link";
import Reader from "@/components/reader";
import { supabaseService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type BookRecord = {
  key?: string;
  label?: string;
  readerSampleText?: string;
  infoPageText?: string;
  readerSampleMediaUrl?: string;
  readerSampleMediaType?: string;
  infoPageMediaUrl?: string;
  infoPageMediaType?: string;
  fullBookMediaUrl?: string;
  fullBookMediaType?: string;
  fullBookHideFirstPages?: number;
  fullBookMaxPages?: number;
};

type PageProps = {
  params:
    | {
        pageKey: string;
        bookKey: string;
      }
    | Promise<{
        pageKey: string;
        bookKey: string;
      }>;
  searchParams?:
    | {
        slot?: string;
      }
    | Promise<{
        slot?: string;
      }>;
};

function safeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function safePageLimit(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5000, Math.round(n)));
}

export default async function BookReaderPage({ params, searchParams }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const pageKey = decodeURIComponent(resolvedParams?.pageKey || "").trim().toLowerCase();
  const bookKey = decodeURIComponent(resolvedParams?.bookKey || "").trim();
  const slot =
    resolvedSearchParams?.slot === "info" ? "info" : resolvedSearchParams?.slot === "full" ? "full" : "sample";

  if (!pageKey || !bookKey) {
    return (
      <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
        <h1>Reader</h1>
        <p>Missing book reference.</p>
        <Link href="/bookcase/recommended">Back to shelf</Link>
      </main>
    );
  }

  const { data, error } = await supabaseService
    .from("bookcase_book_layouts")
    .select("books")
    .eq("page_key", pageKey)
    .maybeSingle();

  if (error) {
    return (
      <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
        <h1>Reader</h1>
        <p style={{ color: "crimson" }}>{error.message}</p>
      </main>
    );
  }

  const books = Array.isArray(data?.books) ? (data.books as BookRecord[]) : [];
  const book = books.find((item) => safeString(item?.key) === bookKey) ?? null;

  if (!book) {
    return (
      <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
        <h1>Reader</h1>
        <p>Book data not found for this shelf.</p>
        <Link href={`/bookcase/${pageKey}`}>Back to shelf</Link>
      </main>
    );
  }

  const isSample = slot === "sample";
  const isInfo = slot === "info";
  const title = safeString(book.label) || bookKey;
  const content = isSample ? safeString(book.readerSampleText) : isInfo ? safeString(book.infoPageText) : "";
  const mediaUrl = isSample
    ? safeString(book.readerSampleMediaUrl)
    : isInfo
      ? safeString(book.infoPageMediaUrl)
      : safeString(book.fullBookMediaUrl);
  const mediaType = isSample
    ? safeString(book.readerSampleMediaType)
    : isInfo
      ? safeString(book.infoPageMediaType)
      : safeString(book.fullBookMediaType);
  const sectionLabel = isSample ? "Reader Sample" : isInfo ? "Information Page" : "Full Book";
  const hideFirstPages = slot === "full" ? safePageLimit(book.fullBookHideFirstPages) : 0;
  const maxVisiblePages = slot === "full" ? safePageLimit(book.fullBookMaxPages) : 0;

  return (
    <Reader
      chapterId={`${pageKey}-${bookKey}-${slot}`}
      title={title}
      sectionLabel={sectionLabel}
      content={content}
      mediaUrl={mediaUrl}
      mediaType={mediaType}
      hideFirstPages={hideFirstPages}
      maxVisiblePages={maxVisiblePages}
      backHref={`/bookcase/${pageKey}`}
      backLabel="Back to shelf"
      prevId={null}
      nextId={null}
    />
  );
}
