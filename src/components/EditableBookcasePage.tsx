"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { Great_Vibes } from "next/font/google";

const greatVibes = Great_Vibes({ subsets: ["latin"], weight: "400" });

type Hotspot = {
  key: string;
  xPercent: number;
  yPercent: number;
  label: string;
  targetPath: string;
  fontSizeVw: number;
};

type Layout = { hotspots: Hotspot[] };

type Props = { pageKey: string };

function defaultHotspot(pageKey: string): Hotspot {
  if (pageKey === "recommended") {
    return {
      key: "main",
      xPercent: 74,
      yPercent: 18,
      label: "Add link",
      targetPath: "/bookcase",
      fontSizeVw: 4.2,
    };
  }

  return {
    key: "main",
    xPercent: 26,
    yPercent: 18,
    label: "Add link",
    targetPath: "/bookcase",
    fontSizeVw: 4.2,
  };
}

function defaultLayout(pageKey: string): Layout {
  return { hotspots: [defaultHotspot(pageKey)] };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isHotspot(value: unknown): value is Hotspot {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.key === "string" &&
    typeof row.xPercent === "number" &&
    typeof row.yPercent === "number" &&
    typeof row.label === "string" &&
    typeof row.targetPath === "string" &&
    typeof row.fontSizeVw === "number"
  );
}

function normalizeLayout(value: unknown, pageKey: string): Layout {
  const fallback = defaultHotspot(pageKey);
  if (!value || typeof value !== "object") return { hotspots: [fallback] };
  const row = value as Record<string, unknown>;
  if (!Array.isArray(row.hotspots) || row.hotspots.length === 0) {
    return { hotspots: [fallback] };
  }

  const first = row.hotspots[0];
  if (!isHotspot(first)) return { hotspots: [fallback] };
  return { hotspots: [first] };
}

export default function EditableBookcasePage({ pageKey }: Props) {
  const searchParams = useSearchParams();
  const editMode = searchParams.get("edit") === "1";
  const containerRef = useRef<HTMLDivElement>(null);

  const [layout, setLayout] = useState<Layout>(() => defaultLayout(pageKey));
  const [draft, setDraft] = useState<Layout>(() => defaultLayout(pageKey));
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");

  const active = draft.hotspots[0];

  useEffect(() => {
    const fallback = defaultLayout(pageKey);
    setLayout(fallback);
    setDraft(fallback);
    setLoading(true);

    let cancelled = false;

    async function loadLayout() {
      try {
        const response = await fetch(`/api/bookcase-page-layout?page=${pageKey}`, {
          cache: "no-store",
        });
        const data: unknown = await response.json();
        const row =
          data && typeof data === "object"
            ? (data as Record<string, unknown>).layout
            : null;
        const normalized = normalizeLayout(row, pageKey);

        if (!cancelled) {
          setLayout(normalized);
          setDraft(normalized);
        }
      } catch {
        if (!cancelled) setStatus("Using default placement.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadLayout();
    return () => {
      cancelled = true;
    };
  }, [pageKey]);

  function updateDraft(updates: Partial<Hotspot>) {
    setDraft((prev) => ({ hotspots: [{ ...prev.hotspots[0], ...updates }] }));
  }

  function updatePosition(clientX: number, clientY: number) {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;

    const x = clamp(((clientX - box.left) / box.width) * 100, 0, 100);
    const y = clamp(((clientY - box.top) / box.height) * 100, 0, 100);

    updateDraft({
      xPercent: Number(x.toFixed(2)),
      yPercent: Number(y.toFixed(2)),
    });
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!editMode) return;
    event.preventDefault();
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    updatePosition(event.clientX, event.clientY);
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!editMode || !dragging) return;
    updatePosition(event.clientX, event.clientY);
  }

  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (!editMode) return;
    setDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  async function saveLayout() {
    setStatus("Saving...");
    try {
      const response = await fetch("/api/bookcase-page-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageKey, hotspots: [draft.hotspots[0]] }),
      });

      const data: unknown = await response.json();
      if (!response.ok) {
        const message =
          data &&
          typeof data === "object" &&
          typeof (data as Record<string, unknown>).error === "string"
            ? String((data as Record<string, unknown>).error)
            : "Unable to save layout.";
        setStatus(message);
        return;
      }

      const row =
        data && typeof data === "object"
          ? (data as Record<string, unknown>).layout
          : null;
      const normalized = normalizeLayout(row, pageKey);
      setLayout(normalized);
      setDraft(normalized);
      setStatus("Saved.");
    } catch {
      setStatus("Unable to save layout.");
    }
  }

  function resetDraft() {
    setDraft(layout);
  }

  return (
    <main className="bookcase-scene bookcase-scene-empty">
      <div ref={containerRef} className="bookcase-canvas">
        {loading && <p className="bookcase-status">Loading layout...</p>}
        {!loading && status && <p className="bookcase-status">{status}</p>}

        {editMode && (
          <aside className="bookcase-editor">
            <h2>Bookcase Position Editor</h2>
            <label className="bookcase-editor-label">
              Label
              <input
                value={active.label}
                onChange={(event) => updateDraft({ label: event.target.value })}
              />
            </label>
            <label className="bookcase-editor-label">
              Target Path
              <input
                value={active.targetPath}
                onChange={(event) => updateDraft({ targetPath: event.target.value })}
              />
            </label>
            <label className="bookcase-editor-label">
              Font Size (vw)
              <input
                type="number"
                min={1.2}
                max={10}
                step={0.1}
                value={active.fontSizeVw}
                onChange={(event) =>
                  updateDraft({
                    fontSizeVw: clamp(Number(event.target.value) || 1.2, 1.2, 10),
                  })
                }
              />
            </label>
            <details className="bookcase-coords-panel">
              <summary>Coordinates</summary>
              <p className="bookcase-coords">
                X: {active.xPercent.toFixed(2)}% | Y: {active.yPercent.toFixed(2)}%
              </p>
            </details>
            <div className="bookcase-editor-actions">
              <button type="button" onClick={saveLayout}>
                Save Coordinates
              </button>
              <button type="button" onClick={resetDraft}>
                Reset
              </button>
            </div>
            <p className="bookcase-editor-hint">
              Drag the text to place it. Adjust font size in the editor.
            </p>
          </aside>
        )}

        {editMode ? (
          <button
            type="button"
            className={`bookcase-hotspot bookcase-hotspot-edit ${greatVibes.className}${
              dragging ? " dragging" : ""
            } active`}
            style={{
              left: `${active.xPercent}%`,
              top: `${active.yPercent}%`,
              fontSize: `${active.fontSizeVw}vw`,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {active.label}
          </button>
        ) : (
          <Link
            href={active.targetPath}
            className={`bookcase-hotspot ${greatVibes.className}`}
            style={{
              left: `${active.xPercent}%`,
              top: `${active.yPercent}%`,
              fontSize: `${active.fontSizeVw}vw`,
            }}
          >
            {active.label}
          </Link>
        )}
      </div>
    </main>
  );
}
