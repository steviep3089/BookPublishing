"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Props = {
  chapterId: string;
  title: string;
  content: string;
  prevId: string | null;
  nextId: string | null;
  userId?: string | null;
  backHref?: string;
  backLabel?: string;
  sectionLabel?: string;
  mediaUrl?: string;
  mediaType?: string;
  hideFirstPages?: number;
  maxVisiblePages?: number;
};

type MediaKind = "image" | "video" | "audio" | "pdf" | "epub" | "link";
type PaperTheme = "ivory" | "parchment" | "cream" | "stone";
type BookmarkRecord =
  | { type: "scroll"; y: number; at: number }
  | { type: "epub"; cfi: string; at: number };
type ReaderPrefs = {
  mode: "light" | "dark";
  fontSize: number;
  paperTheme: PaperTheme;
  brightness: number;
  focusMode: boolean;
};

type EpubRelocatedLocation = {
  start?: {
    cfi?: string;
    percentage?: number;
    displayed?: {
      page?: number;
      total?: number;
    };
    href?: string;
  };
};

type EpubRenditionLike = {
  on: (event: "relocated", callback: (location: unknown) => void) => void;
  display: (target?: string) => Promise<unknown> | unknown;
  prev?: () => Promise<unknown> | unknown;
  next?: () => Promise<unknown> | unknown;
  destroy?: () => void;
  currentLocation?: () => EpubRelocatedLocation | undefined;
  themes?: {
    default: (styles: Record<string, unknown>) => void;
    fontSize: (size: string) => void;
  };
};

type EpubBookLike = {
  renderTo: (
    element: HTMLElement,
    options: {
      width: string;
      height: string;
      spread: string;
      flow: string;
    }
  ) => EpubRenditionLike;
  destroy?: () => void;
};

const PAPER_STYLES: Record<PaperTheme, { label: string; page: string; panel: string; border: string }> = {
  ivory: { label: "Ivory", page: "#f5f1e8", panel: "#fbf7ee", border: "rgba(58, 42, 22, 0.14)" },
  parchment: { label: "Parchment", page: "#efe3cc", panel: "#f7ecd8", border: "rgba(88, 62, 28, 0.2)" },
  cream: { label: "Cream", page: "#f7f0da", panel: "#fff8e8", border: "rgba(78, 58, 30, 0.16)" },
  stone: { label: "Stone", page: "#ece8df", panel: "#f6f3ed", border: "rgba(52, 48, 40, 0.16)" },
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function detectMediaKind(mediaUrl: string, mediaType?: string): MediaKind {
  const byType = (mediaType || "").toLowerCase();
  if (byType.startsWith("image/")) return "image";
  if (byType.startsWith("video/")) return "video";
  if (byType.startsWith("audio/")) return "audio";
  if (byType === "application/pdf") return "pdf";
  if (byType === "application/epub+zip") return "epub";

  const url = mediaUrl.toLowerCase();
  if (/(\.png|\.jpe?g|\.gif|\.webp|\.bmp|\.svg)(\?|$)/.test(url)) return "image";
  if (/(\.mp4|\.webm|\.mov|\.m4v|\.ogg)(\?|$)/.test(url)) return "video";
  if (/(\.mp3|\.wav|\.aac|\.m4a|\.flac|\.oga)(\?|$)/.test(url)) return "audio";
  if (/(\.pdf)(\?|$)/.test(url)) return "pdf";
  if (/(\.epub)(\?|$)/.test(url)) return "epub";
  return "link";
}

export default function Reader({
  chapterId,
  title,
  content,
  prevId,
  nextId,
  userId = null,
  backHref = "/episodes",
  backLabel = "Back",
  sectionLabel,
  mediaUrl = "",
  mediaType = "",
  hideFirstPages = 0,
  maxVisiblePages = 0,
}: Props) {
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(userId);
  const userSegment = resolvedUserId || "guest";
  const prefsKey = useMemo(() => `lr_reader_prefs_${userSegment}`, [userSegment]);
  const progressKey = useMemo(() => `lr_reader_progress_${userSegment}_${chapterId}`, [userSegment, chapterId]);
  const bookmarkKey = useMemo(() => `lr_reader_bookmark_${userSegment}_${chapterId}`, [userSegment, chapterId]);

  const [mode, setMode] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    try {
      const raw = localStorage.getItem(`lr_reader_prefs_${userId || "guest"}`);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.mode === "light" || p.mode === "dark") return p.mode;
      }
    } catch {}
    return "light";
  });

  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window === "undefined") return 20;
    try {
      const raw = localStorage.getItem(`lr_reader_prefs_${userId || "guest"}`);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.fontSize === "number") return clamp(p.fontSize, 16, 28);
      }
    } catch {}
    return 20;
  });
  const [paperTheme, setPaperTheme] = useState<PaperTheme>(() => {
    if (typeof window === "undefined") return "ivory";
    try {
      const raw = localStorage.getItem(`lr_reader_prefs_${userId || "guest"}`);
      if (raw) {
        const p = JSON.parse(raw) as { paperTheme?: PaperTheme };
        if (p.paperTheme && p.paperTheme in PAPER_STYLES) return p.paperTheme;
      }
    } catch {}
    return "ivory";
  });
  const [brightness, setBrightness] = useState<number>(() => {
    if (typeof window === "undefined") return 100;
    try {
      const raw = localStorage.getItem(`lr_reader_prefs_${userId || "guest"}`);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.brightness === "number") return clamp(p.brightness, 70, 130);
      }
    } catch {}
    return 100;
  });
  const [focusMode, setFocusMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem(`lr_reader_prefs_${userId || "guest"}`);
      if (raw) {
        const p = JSON.parse(raw);
        return Boolean(p.focusMode);
      }
    } catch {}
    return false;
  });

  const [progress, setProgress] = useState<number>(0);
  const [epubBusy, setEpubBusy] = useState(false);
  const [epubReady, setEpubReady] = useState(false);
  const [epubError, setEpubError] = useState("");
  const [epubLocationLabel, setEpubLocationLabel] = useState("");
  const [epubCurrentPage, setEpubCurrentPage] = useState<number | null>(null);
  const [bookmarkMessage, setBookmarkMessage] = useState("");
  const [hasBookmark, setHasBookmark] = useState(false);
  const [progressRecord, setProgressRecord] = useState<BookmarkRecord | null>(null);
  const [bookmarkRecord, setBookmarkRecord] = useState<BookmarkRecord | null>(null);
  const [remoteHydrated, setRemoteHydrated] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pageTurnFx, setPageTurnFx] = useState<"" | "next" | "prev">("");
  const readerRootRef = useRef<HTMLDivElement | null>(null);
  const epubContainerRef = useRef<HTMLDivElement | null>(null);
  const epubBookRef = useRef<EpubBookLike | null>(null);
  const epubRenditionRef = useRef<EpubRenditionLike | null>(null);
  const epubAutoSkipAttemptsRef = useRef(0);
  const pageTurnTimerRef = useRef<number | null>(null);
  const isDark = mode === "dark";
  const trimmed = content.trim();
  const mediaKind = mediaUrl ? detectMediaKind(mediaUrl, mediaType) : null;
  const isEpub = mediaKind === "epub";
  const normalizedHideFirstPages = Number.isFinite(hideFirstPages)
    ? clamp(Math.round(hideFirstPages), 0, 5000)
    : 0;
  const firstVisiblePage = normalizedHideFirstPages + 1;
  const normalizedMaxVisiblePages = Number.isFinite(maxVisiblePages)
    ? clamp(Math.round(maxVisiblePages), 0, 5000)
    : 0;
  const hitHiddenStartLimit =
    isEpub &&
    normalizedHideFirstPages > 0 &&
    Number.isFinite(epubCurrentPage) &&
    (epubCurrentPage || 0) <= firstVisiblePage;
  const hitPageLimit =
    isEpub && normalizedMaxVisiblePages > 0 && Number.isFinite(epubCurrentPage) && (epubCurrentPage || 0) >= normalizedMaxVisiblePages;
  const paper = PAPER_STYLES[paperTheme];

  useEffect(() => {
    if (resolvedUserId) return;
    let cancelled = false;
    async function resolveUser() {
      try {
        const supabase = supabaseBrowser();
        const { data } = await supabase.auth.getUser();
        if (!cancelled && data?.user?.id) {
          setResolvedUserId(data.user.id);
        }
      } catch {}
    }
    void resolveUser();
    return () => {
      cancelled = true;
    };
  }, [resolvedUserId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(prefsKey);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p.mode === "light" || p.mode === "dark") setMode(p.mode);
      if (typeof p.fontSize === "number") setFontSize(clamp(p.fontSize, 16, 28));
      if (p.paperTheme && p.paperTheme in PAPER_STYLES) setPaperTheme(p.paperTheme as PaperTheme);
      if (typeof p.brightness === "number") setBrightness(clamp(p.brightness, 70, 130));
      setFocusMode(Boolean(p.focusMode));
    } catch {}
  }, [prefsKey]);

  useEffect(() => {
    try {
      const last = localStorage.getItem(progressKey);
      if (!last) return;
      const parsed = JSON.parse(last) as BookmarkRecord;
      setProgressRecord(parsed);
      if (parsed?.type === "scroll" && Number.isFinite(parsed.y)) {
        setTimeout(() => window.scrollTo(0, parsed.y), 0);
      }
    } catch {}
  }, [progressKey]);

  useEffect(() => {
    try {
      localStorage.setItem(
        prefsKey,
        JSON.stringify({ mode, fontSize, paperTheme, brightness, focusMode })
      );
    } catch {}
  }, [mode, fontSize, paperTheme, brightness, focusMode, prefsKey]);

  useEffect(() => {
    try {
      setHasBookmark(Boolean(localStorage.getItem(bookmarkKey)));
    } catch {
      setHasBookmark(false);
    }
  }, [bookmarkKey]);

  useEffect(() => {
    if (isEpub) return;
    const onScroll = () => {
      const scrolled = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const pct = height > 0 ? Math.round((scrolled / height) * 100) : 0;
      setProgress(clamp(pct, 0, 100));
      try {
        localStorage.setItem(
          progressKey,
          JSON.stringify({
            type: "scroll",
            y: scrolled,
            at: Date.now(),
          } satisfies BookmarkRecord)
        );
      } catch {}
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [progressKey, isEpub]);

  useEffect(() => {
    if (!isEpub || !mediaUrl) {
      setEpubBusy(false);
      setEpubReady(false);
      setEpubError("");
      setEpubLocationLabel("");
      setEpubCurrentPage(null);
      return;
    }

    let cancelled = false;
    setEpubBusy(true);
    setEpubReady(false);
    setEpubError("");
    setEpubLocationLabel("");
    epubAutoSkipAttemptsRef.current = 0;

    async function mountEpub() {
      try {
        const mod = await import("epubjs");
        if (cancelled) return;

        const ePubFactory = ((mod as { default?: unknown }).default ?? mod) as (url: string) => EpubBookLike;
        const book = ePubFactory(mediaUrl);
        const container = epubContainerRef.current;
        if (!container) return;
        container.innerHTML = "";

        const rendition = book.renderTo(container, {
          width: "100%",
          height: "72vh",
          spread: "none",
          flow: "paginated",
        });

        rendition.on("relocated", (location: unknown) => {
          const loc = (location as EpubRelocatedLocation) ?? {};
          const start = loc.start ?? {};
          const displayed = start.displayed ?? {};
          try {
            const cfi = typeof start.cfi === "string" ? start.cfi : "";
            if (cfi) {
              localStorage.setItem(
                progressKey,
                JSON.stringify({
                  type: "epub",
                  cfi,
                  at: Date.now(),
                } satisfies BookmarkRecord)
              );
            }
          } catch {}

          const percentage = Number(start.percentage);
          if (Number.isFinite(percentage)) {
            setProgress(clamp(Math.round(percentage * 100), 0, 100));
          }

          const page = Number(displayed.page);
          const total = Number(displayed.total);
          if (Number.isFinite(page) && normalizedHideFirstPages > 0 && page <= normalizedHideFirstPages) {
            setEpubCurrentPage(page);
            if (epubAutoSkipAttemptsRef.current <= normalizedHideFirstPages + 8) {
              epubAutoSkipAttemptsRef.current += 1;
              setBookmarkMessage(`First ${normalizedHideFirstPages} pages are hidden.`);
              setTimeout(() => setBookmarkMessage(""), 1500);
              void rendition.next?.();
            }
            return;
          }
          if (Number.isFinite(page) && Number.isFinite(total) && total > 0) {
            epubAutoSkipAttemptsRef.current = 0;
            setEpubCurrentPage(page);
            setEpubLocationLabel(`Page ${page} of ${total}`);
            return;
          }
          if (Number.isFinite(page)) {
            epubAutoSkipAttemptsRef.current = 0;
            setEpubCurrentPage(page);
          } else {
            setEpubCurrentPage(null);
          }
          if (!Number.isFinite(percentage) && Number.isFinite(page) && Number.isFinite(total) && total > 0) {
            const pct = Math.round((page / total) * 100);
            setProgress(clamp(pct, 0, 100));
          }
          const href = typeof start.href === "string" ? start.href : "";
          setEpubLocationLabel(href || "");
        });

        let initialCfi = "";
        try {
          const saved = localStorage.getItem(progressKey);
          if (saved) {
            const parsed = JSON.parse(saved) as BookmarkRecord;
            if (parsed?.type === "epub" && typeof parsed.cfi === "string") initialCfi = parsed.cfi;
          }
        } catch {}

        await rendition.display(initialCfi || undefined);
        if (cancelled) return;

        epubBookRef.current = book;
        epubRenditionRef.current = rendition;
        setEpubReady(true);
      } catch {
        if (!cancelled) {
          setEpubError("Unable to render this EPUB in-app.");
        }
      } finally {
        if (!cancelled) setEpubBusy(false);
      }
    }

    void mountEpub();

    return () => {
      cancelled = true;
      try {
        epubRenditionRef.current?.destroy?.();
      } catch {}
      try {
        epubBookRef.current?.destroy?.();
      } catch {}
      epubRenditionRef.current = null;
      epubBookRef.current = null;
    };
  }, [isEpub, mediaUrl, progressKey, normalizedHideFirstPages]);

  useEffect(() => {
    const rendition = epubRenditionRef.current;
    if (!rendition) return;

    const fg = isDark ? "#eaeaea" : "#2a2a2a";
    const bg = isDark ? "#181818" : paper.panel;

    try {
      rendition.themes?.default({
        body: {
          background: `${bg} !important`,
          color: `${fg} !important`,
          margin: "0",
          padding: "0",
        },
        p: {
          color: `${fg} !important`,
        },
      });
      rendition.themes?.fontSize(`${fontSize}px`);
      const currentCfi = rendition.currentLocation?.()?.start?.cfi;
      if (currentCfi) {
        void rendition.display(currentCfi);
      }
    } catch {}
  }, [epubReady, fontSize, isDark, paper.panel]);

  const goEpubPrev = () => {
    if (hitHiddenStartLimit) {
      setBookmarkMessage(`First ${normalizedHideFirstPages} pages are hidden.`);
      setTimeout(() => setBookmarkMessage(""), 1500);
      return;
    }
    setPageTurnFx("prev");
    if (pageTurnTimerRef.current) {
      window.clearTimeout(pageTurnTimerRef.current);
    }
    pageTurnTimerRef.current = window.setTimeout(() => setPageTurnFx(""), 560);
    try {
      void epubRenditionRef.current?.prev?.();
    } catch {}
  };

  const goEpubNext = () => {
    if (hitPageLimit) {
      setBookmarkMessage(`Pages after ${normalizedMaxVisiblePages} are hidden.`);
      setTimeout(() => setBookmarkMessage(""), 1500);
      return;
    }
    setPageTurnFx("next");
    if (pageTurnTimerRef.current) {
      window.clearTimeout(pageTurnTimerRef.current);
    }
    pageTurnTimerRef.current = window.setTimeout(() => setPageTurnFx(""), 560);
    try {
      void epubRenditionRef.current?.next?.();
    } catch {}
  };

  useEffect(() => {
    return () => {
      if (pageTurnTimerRef.current) {
        window.clearTimeout(pageTurnTimerRef.current);
      }
    };
  }, []);

  const saveBookmark = () => {
    try {
      if (isEpub) {
        const cfi = epubRenditionRef.current?.currentLocation?.()?.start?.cfi;
        if (!cfi) {
          setBookmarkMessage("Bookmark unavailable yet.");
          return;
        }
        localStorage.setItem(
          bookmarkKey,
          JSON.stringify({
            type: "epub",
            cfi,
            at: Date.now(),
          } satisfies BookmarkRecord)
        );
      } else {
        localStorage.setItem(
          bookmarkKey,
          JSON.stringify({
            type: "scroll",
            y: window.scrollY,
            at: Date.now(),
          } satisfies BookmarkRecord)
        );
      }
      setHasBookmark(true);
      setBookmarkMessage("Bookmark saved.");
      setTimeout(() => setBookmarkMessage(""), 1500);
    } catch {
      setBookmarkMessage("Could not save bookmark.");
    }
  };

  const goToBookmark = () => {
    try {
      const raw = localStorage.getItem(bookmarkKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as BookmarkRecord;
      if (parsed.type === "scroll") {
        window.scrollTo(0, parsed.y || 0);
        return;
      }
      if (parsed.type === "epub" && parsed.cfi) {
        void epubRenditionRef.current?.display?.(parsed.cfi);
      }
    } catch {}
  };

  const enterFocusMode = async () => {
    setFocusMode(true);
    try {
      if (!document.fullscreenElement && document.fullscreenEnabled) {
        const target = readerRootRef.current ?? document.documentElement;
        await target.requestFullscreen();
      }
    } catch {}
  };

  const exitFocusMode = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {}
    setFocusMode(false);
  };

  useEffect(() => {
    function onFullscreenChange() {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active) {
        setFocusMode(false);
      }
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  return (
    <div
      ref={readerRootRef}
      style={{
        minHeight: "100vh",
        background: isDark ? "#121212" : paper.page,
        color: isDark ? "#eaeaea" : "#2a2a2a",
        filter: `brightness(${brightness}%)`,
        transition: "filter 140ms ease, background 140ms ease",
      }}
    >
      {!focusMode && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: 18,
            zIndex: 50,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 5,
              background: isDark ? "rgba(255,255,255,0.12)" : "rgba(40,26,12,0.16)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: 5,
              width: `${progress}%`,
              background: isDark ? "#c9b27c" : "#8a6b2e",
              transition: "width 140ms linear",
            }}
          />
          {[0, 25, 50, 75, 100].map((mark) => (
            <div
              key={mark}
              style={{
                position: "absolute",
                top: 0,
                left: `${mark}%`,
                transform: mark === 0 ? "none" : mark === 100 ? "translateX(-100%)" : "translateX(-50%)",
                color: isDark ? "rgba(255,255,255,0.45)" : "rgba(40,26,12,0.5)",
                fontSize: 9,
                lineHeight: 1,
              }}
            >
              <div
                style={{
                  width: 1,
                  height: 7,
                  margin: "0 auto",
                  background: isDark ? "rgba(255,255,255,0.35)" : "rgba(40,26,12,0.35)",
                }}
              />
              <div style={{ marginTop: 2 }}>{mark}%</div>
            </div>
          ))}
        </div>
      )}

      {!focusMode && <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          padding: "14px 16px",
          backdropFilter: "blur(8px)",
          background: isDark ? "rgba(18,18,18,0.85)" : paper.panel,
          borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : `1px solid ${paper.border}`,
        }}
      >
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", gap: 12, alignItems: "center" }}>
          <Link href={backHref} style={{ textDecoration: "none", color: "inherit" }}>
            &larr; {backLabel}
          </Link>

          <div style={{ flex: 1, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </div>

          <button
            onClick={() => setMode((m) => (m === "dark" ? "light" : "dark"))}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            {isDark ? "Light" : "Dark"}
          </button>

          <button
            onClick={() => {
              void enterFocusMode();
            }}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            Focus
          </button>

          <select
            value={paperTheme}
            onChange={(event) => setPaperTheme(event.target.value as PaperTheme)}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)",
              background: "transparent",
              color: "inherit",
            }}
          >
            {Object.entries(PAPER_STYLES).map(([value, cfg]) => (
              <option key={value} value={value}>
                {cfg.label}
              </option>
            ))}
          </select>

          <input
            type="range"
            min={70}
            max={130}
            step={1}
            value={brightness}
            onChange={(event) => setBrightness(clamp(Number(event.target.value) || 100, 70, 130))}
            aria-label="Brightness"
          />

          <button
            onClick={() => setFontSize((s) => clamp(s - 1, 16, 28))}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            A-
          </button>

          <button
            onClick={() => setFontSize((s) => clamp(s + 1, 16, 28))}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            A+
          </button>

          <button
            onClick={saveBookmark}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            Bookmark
          </button>

          <button
            onClick={goToBookmark}
            disabled={!hasBookmark}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)",
              background: "transparent",
              color: "inherit",
              cursor: hasBookmark ? "pointer" : "not-allowed",
              opacity: hasBookmark ? 1 : 0.5,
            }}
          >
            Go to Mark
          </button>
        </div>
      </header>}

      {focusMode && (
        <button
          type="button"
          onClick={() => {
            void exitFocusMode();
          }}
          style={{
            position: "fixed",
            top: 12,
            right: 12,
            zIndex: 45,
            padding: "6px 10px",
            borderRadius: 10,
            border: isDark ? "1px solid rgba(255,255,255,0.2)" : `1px solid ${paper.border}`,
            background: isDark ? "rgba(0,0,0,0.45)" : paper.panel,
            color: "inherit",
            cursor: "pointer",
          }}
        >
          {isFullscreen ? "Exit Focus" : "Focus (fullscreen unavailable)"}
        </button>
      )}

      <main
        style={{
          maxWidth: focusMode ? "min(1200px, 98vw)" : 860,
          margin: "0 auto",
          padding: focusMode ? "8px 10px 12px" : "30px 18px 60px",
        }}
      >
        {!focusMode && sectionLabel && (
          <p
            style={{
              maxWidth: 760,
              margin: "0 auto 10px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontSize: "0.78rem",
              opacity: 0.75,
            }}
          >
            {sectionLabel}
          </p>
        )}
        {!focusMode && bookmarkMessage && (
          <p style={{ maxWidth: 760, margin: "0 auto 10px", fontSize: "0.86rem", opacity: 0.8 }}>{bookmarkMessage}</p>
        )}

        {mediaUrl && (
          <section
            style={{
              maxWidth: focusMode ? "min(1200px, 96vw)" : 760,
              margin: focusMode ? "0 auto 8px" : "0 auto 18px",
            }}
          >
            {mediaKind === "image" && (
              <img src={mediaUrl} alt={title} style={{ width: "100%", borderRadius: 12, display: "block" }} />
            )}
            {mediaKind === "video" && (
              <video src={mediaUrl} controls style={{ width: "100%", borderRadius: 12, display: "block" }} />
            )}
            {mediaKind === "audio" && <audio src={mediaUrl} controls style={{ width: "100%" }} />}
            {mediaKind === "pdf" && (
              <iframe
                title={`${title} PDF`}
                src={mediaUrl}
                style={{ width: "100%", height: "70vh", border: "none", borderRadius: 12, background: "#fff" }}
              />
            )}
            {mediaKind === "epub" && (
              <div>
                <div className="reader-epub-stage">
                  <div
                    ref={epubContainerRef}
                    style={{
                      width: "100%",
                      height: focusMode ? "calc(100dvh - 130px)" : "72vh",
                      borderRadius: 12,
                      overflow: "hidden",
                      border: isDark ? "1px solid rgba(255,255,255,0.14)" : `1px solid ${paper.border}`,
                      background: isDark ? "#181818" : paper.panel,
                    }}
                  />
                  {pageTurnFx && (
                    <div
                      className={`reader-page-turn-overlay ${
                        pageTurnFx === "next" ? "reader-page-turn-next" : "reader-page-turn-prev"
                      }`}
                    />
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: focusMode ? 6 : 10,
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={goEpubPrev}
                    disabled={!epubReady || hitHiddenStartLimit}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)",
                      background: "transparent",
                      color: "inherit",
                      cursor: epubReady && !hitHiddenStartLimit ? "pointer" : "not-allowed",
                      opacity: epubReady && !hitHiddenStartLimit ? 1 : 0.5,
                    }}
                  >
                    Previous Page
                  </button>
                  <span style={{ fontSize: "0.9rem", opacity: 0.8 }}>
                    {epubBusy ? "Loading EPUB..." : epubLocationLabel || (epubReady ? "EPUB loaded" : "EPUB")}
                  </span>
                  <button
                    type="button"
                    onClick={goEpubNext}
                    disabled={!epubReady || hitPageLimit}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)",
                      background: "transparent",
                      color: "inherit",
                      cursor: epubReady && !hitPageLimit ? "pointer" : "not-allowed",
                      opacity: epubReady && !hitPageLimit ? 1 : 0.5,
                    }}
                  >
                    Next Page
                  </button>
                </div>
                {normalizedHideFirstPages > 0 && (
                  <p style={{ marginTop: 10, marginBottom: 0, opacity: 0.82 }}>
                    First {normalizedHideFirstPages} pages are hidden for this book.
                  </p>
                )}
                {hitPageLimit && (
                  <p style={{ marginTop: 10, marginBottom: 0, opacity: 0.82 }}>
                    Pages after {normalizedMaxVisiblePages} are hidden for this book.
                  </p>
                )}
                {epubError && (
                  <p style={{ marginTop: 10 }}>
                    {epubError}{" "}
                    <a href={mediaUrl} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
                      Open file directly
                    </a>
                  </p>
                )}
              </div>
            )}
            {mediaKind === "link" && (
              <p style={{ margin: 0 }}>
                <a href={mediaUrl} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
                  Open attached media
                </a>
              </p>
            )}
          </section>
        )}

        {(mediaKind !== "epub" || trimmed) && (
          <article
            style={{
              maxWidth: 760,
              margin: "0 auto",
              fontFamily: `"Georgia", serif`,
              fontSize,
              lineHeight: 1.8,
              letterSpacing: 0.2,
              whiteSpace: "pre-wrap",
              background: isDark ? "transparent" : paper.panel,
              border: isDark ? "none" : `1px solid ${paper.border}`,
              borderRadius: 12,
              padding: trimmed ? "18px 18px 12px" : "18px",
            }}
          >
            {trimmed ? (
              <p style={{ marginTop: 0 }}>
                <span style={{ float: "left", fontSize: fontSize * 3, lineHeight: 0.9, fontWeight: 700, marginRight: 10 }}>
                  {trimmed.slice(0, 1)}
                </span>
                {trimmed.slice(1)}
              </p>
            ) : (
              <p style={{ marginTop: 0, opacity: 0.8 }}>No text added yet for this page.</p>
            )}
          </article>
        )}

        {!focusMode && (prevId || nextId) && (
          <div style={{ maxWidth: 760, margin: "36px auto 0", display: "flex", justifyContent: "space-between", gap: 12 }}>
            {prevId ? (
              <Link href={`/reader/${prevId}`} style={{ textDecoration: "none", color: "inherit" }}>
                &larr; Previous
              </Link>
            ) : (
              <span />
            )}

            {nextId ? (
              <Link href={`/reader/${nextId}`} style={{ textDecoration: "none", color: "inherit" }}>
                Next &rarr;
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
