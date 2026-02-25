"use client";

import Link from "next/link";
import { Caveat } from "next/font/google";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type TouchEvent as ReactTouchEvent } from "react";
import {
  BOOKCASE_HOME_PROFILE_KEYS,
  BOOKCASE_HOME_PROFILE_LABELS,
  isBookcaseHomeProfileKey,
  type BookcaseHomeProfileKey,
} from "@/lib/bookcase/homeDeviceLayout";

const caveat = Caveat({ subsets: ["latin"], weight: ["600", "700"] });

type ApiResult = {
  profile?: BookcaseHomeProfileKey;
  vars?: Record<string, string>;
  source?: string;
  warning?: string;
  error?: string;
};

type DragTarget = "creating" | "creating-size" | "recommended" | "recommended-size";
type SelectedBox = "creating" | "recommended";

type DragState = {
  target: DragTarget;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  stageWidth: number;
  stageHeight: number;
  creatingLeft: number;
  creatingTop: number;
  creatingWidth: number;
  creatingHeight: number;
  recommendedLeft: number;
  recommendedTop: number;
  recommendedWidth: number;
  recommendedHeight: number;
};

type PanelDragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  maxX: number;
  maxY: number;
};

const BOX_MIN_WIDTH = 10;
const BOX_MAX_WIDTH = 70;
const BOX_MIN_HEIGHT = 5;
const BOX_MAX_HEIGHT = 35;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parsePercent(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
}

function parseScale(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
}

function toPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function toScale(value: number) {
  return value.toFixed(2);
}

function isPhoneProfile(profile: BookcaseHomeProfileKey | null) {
  return !!profile && profile.startsWith("iphone-");
}

function isPhoneLandscapeProfile(profile: BookcaseHomeProfileKey | null) {
  return !!profile && profile.startsWith("iphone-landscape");
}

export default function EditableBookcaseHome() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const editMode = searchParams.get("edit") === "1";
  const previewProfile = searchParams.get("previewProfile");
  const forcedProfile = isBookcaseHomeProfileKey(previewProfile || "")
    ? (previewProfile as BookcaseHomeProfileKey)
    : null;

  const [profile, setProfile] = useState<BookcaseHomeProfileKey>("desktop");
  const [vars, setVars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedBox, setSelectedBox] = useState<SelectedBox>("creating");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [showTools, setShowTools] = useState(true);
  const [panelPosition, setPanelPosition] = useState({ x: 12, y: 12 });
  const [panelDragState, setPanelDragState] = useState<PanelDragState | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const phonePortraitQuery = window.matchMedia("(max-width: 680px) and (orientation: portrait)");
    const phoneLandscapeQuery = window.matchMedia("(max-height: 500px) and (orientation: landscape)");
    const ipadPortraitQuery = window.matchMedia("(max-width: 1024px) and (orientation: portrait)");
    const ipadLandscapeQuery = window.matchMedia(
      "(max-width: 1366px) and (orientation: landscape) and (pointer: coarse)"
    );

    function addMediaChangeListener(query: MediaQueryList, listener: () => void) {
      if (typeof query.addEventListener === "function") {
        query.addEventListener("change", listener);
        return () => query.removeEventListener("change", listener);
      }
      query.addListener(listener);
      return () => query.removeListener(listener);
    }

    const syncProfile = () => {
      if (forcedProfile) {
        setProfile(forcedProfile);
        return;
      }

      let nextProfile: BookcaseHomeProfileKey = "desktop";
      if (phonePortraitQuery.matches) {
        const portraitWidth = Math.max(window.innerWidth || 0, Math.round(window.visualViewport?.width || 0));
        nextProfile = portraitWidth >= 420 ? "iphone-portrait-max" : "iphone-portrait";
      } else if (phoneLandscapeQuery.matches) {
        const landscapeHeight = Math.max(window.innerHeight || 0, Math.round(window.visualViewport?.height || 0));
        nextProfile = landscapeHeight >= 410 ? "iphone-landscape-max" : "iphone-landscape";
      } else if (ipadPortraitQuery.matches) {
        nextProfile = "ipad-portrait";
      } else if (ipadLandscapeQuery.matches) {
        nextProfile = "ipad-landscape";
      }

      setProfile(nextProfile);
    };

    syncProfile();

    if (!forcedProfile) {
      const removePhonePortrait = addMediaChangeListener(phonePortraitQuery, syncProfile);
      const removePhoneLandscape = addMediaChangeListener(phoneLandscapeQuery, syncProfile);
      const removeIpadPortrait = addMediaChangeListener(ipadPortraitQuery, syncProfile);
      const removeIpadLandscape = addMediaChangeListener(ipadLandscapeQuery, syncProfile);
      window.addEventListener("resize", syncProfile);
      window.addEventListener("orientationchange", syncProfile);
      return () => {
        removePhonePortrait();
        removePhoneLandscape();
        removeIpadPortrait();
        removeIpadLandscape();
        window.removeEventListener("resize", syncProfile);
        window.removeEventListener("orientationchange", syncProfile);
      };
    }
    return undefined;
  }, [forcedProfile]);

  useEffect(() => {
    let cancelled = false;

    async function loadLayout() {
      setLoading(true);
      setStatus(null);
      try {
        const response = await fetch(`/api/bookcase-home-layout?profile=${profile}&ts=${Date.now()}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as ApiResult;
        if (!response.ok) {
          throw new Error(payload.error || "Unable to load layout.");
        }
        if (cancelled) return;
        setVars(payload.vars || {});
        if (payload.warning) {
          setStatus(`Loaded defaults (${payload.warning}).`);
        } else if (payload.source === "supabase") {
          setStatus("Loaded saved values.");
        } else {
          setStatus("Loaded default values.");
        }
      } catch (error: unknown) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Unable to load layout.";
        setStatus(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadLayout();
    return () => {
      cancelled = true;
    };
  }, [profile, reloadToken]);

  const bgSizeX = parsePercent(vars["--bookcase-bg-size-x"], isPhoneProfile(profile) ? 170 : 100);
  const bgSizeY = parsePercent(vars["--bookcase-bg-size-y"], 100);
  const bgPosX = parsePercent(vars["--bookcase-bg-pos-x"], 50);
  const bgPosY = parsePercent(vars["--bookcase-bg-pos-y"], isPhoneLandscapeProfile(profile) ? 50 : 46);

  const creatingWidth = parsePercent(vars["--bookcase-creating-width"], 30);
  const creatingHeight = parsePercent(vars["--bookcase-creating-height"], 11);
  const creatingLeft = parsePercent(vars["--bookcase-creating-left"], 25);
  const creatingTop = parsePercent(vars["--bookcase-creating-top"], 18);
  const creatingScale = parseScale(vars["--bookcase-creating-text-scale"], 1);

  const recommendedWidth = parsePercent(vars["--bookcase-recommended-width"], 30);
  const recommendedHeight = parsePercent(vars["--bookcase-recommended-height"], 11);
  const recommendedLeft = parsePercent(vars["--bookcase-recommended-left"], 75);
  const recommendedTop = parsePercent(vars["--bookcase-recommended-top"], 18);
  const recommendedScale = parseScale(vars["--bookcase-recommended-text-scale"], 1);

  const safeCreatingWidth = clamp(creatingWidth, BOX_MIN_WIDTH, BOX_MAX_WIDTH);
  const safeCreatingHeight = clamp(creatingHeight, BOX_MIN_HEIGHT, BOX_MAX_HEIGHT);
  const safeCreatingLeft = clamp(creatingLeft, safeCreatingWidth / 2, 100 - safeCreatingWidth / 2);
  const safeCreatingTop = clamp(creatingTop, safeCreatingHeight / 2, 100 - safeCreatingHeight / 2);
  const safeCreatingScale = clamp(creatingScale, 0.6, 3.5);

  const safeRecommendedWidth = clamp(recommendedWidth, BOX_MIN_WIDTH, BOX_MAX_WIDTH);
  const safeRecommendedHeight = clamp(recommendedHeight, BOX_MIN_HEIGHT, BOX_MAX_HEIGHT);
  const safeRecommendedLeft = clamp(recommendedLeft, safeRecommendedWidth / 2, 100 - safeRecommendedWidth / 2);
  const safeRecommendedTop = clamp(recommendedTop, safeRecommendedHeight / 2, 100 - safeRecommendedHeight / 2);
  const safeRecommendedScale = clamp(recommendedScale, 0.6, 3.5);

  useEffect(() => {
    const next: Record<string, string> = {};

    if (Math.abs(creatingWidth - safeCreatingWidth) > 0.01) next["--bookcase-creating-width"] = toPercent(safeCreatingWidth);
    if (Math.abs(creatingHeight - safeCreatingHeight) > 0.01)
      next["--bookcase-creating-height"] = toPercent(safeCreatingHeight);
    if (Math.abs(creatingLeft - safeCreatingLeft) > 0.01) next["--bookcase-creating-left"] = toPercent(safeCreatingLeft);
    if (Math.abs(creatingTop - safeCreatingTop) > 0.01) next["--bookcase-creating-top"] = toPercent(safeCreatingTop);
    if (Math.abs(creatingScale - safeCreatingScale) > 0.01)
      next["--bookcase-creating-text-scale"] = toScale(safeCreatingScale);

    if (Math.abs(recommendedWidth - safeRecommendedWidth) > 0.01)
      next["--bookcase-recommended-width"] = toPercent(safeRecommendedWidth);
    if (Math.abs(recommendedHeight - safeRecommendedHeight) > 0.01)
      next["--bookcase-recommended-height"] = toPercent(safeRecommendedHeight);
    if (Math.abs(recommendedLeft - safeRecommendedLeft) > 0.01)
      next["--bookcase-recommended-left"] = toPercent(safeRecommendedLeft);
    if (Math.abs(recommendedTop - safeRecommendedTop) > 0.01) next["--bookcase-recommended-top"] = toPercent(safeRecommendedTop);
    if (Math.abs(recommendedScale - safeRecommendedScale) > 0.01)
      next["--bookcase-recommended-text-scale"] = toScale(safeRecommendedScale);

    if (Object.keys(next).length > 0) {
      setVars((current) => ({ ...current, ...next }));
    }
  }, [
    creatingHeight,
    creatingLeft,
    creatingScale,
    creatingTop,
    creatingWidth,
    recommendedHeight,
    recommendedLeft,
    recommendedScale,
    recommendedTop,
    recommendedWidth,
    safeCreatingHeight,
    safeCreatingLeft,
    safeCreatingScale,
    safeCreatingTop,
    safeCreatingWidth,
    safeRecommendedHeight,
    safeRecommendedLeft,
    safeRecommendedScale,
    safeRecommendedTop,
    safeRecommendedWidth,
  ]);

  function setVarValue(key: string, value: string) {
    setVars((current) => ({ ...current, [key]: value }));
  }

  function setVarValues(nextValues: Record<string, string>) {
    setVars((current) => ({ ...current, ...nextValues }));
  }

  function beginDrag(clientX: number, clientY: number, target: DragTarget, pointerId: number) {
    if (!editMode || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    setSelectedBox(target.startsWith("recommended") ? "recommended" : "creating");
    setDragState({
      target,
      pointerId,
      startClientX: clientX,
      startClientY: clientY,
      stageWidth: rect.width,
      stageHeight: rect.height,
      creatingLeft: safeCreatingLeft,
      creatingTop: safeCreatingTop,
      creatingWidth: safeCreatingWidth,
      creatingHeight: safeCreatingHeight,
      recommendedLeft: safeRecommendedLeft,
      recommendedTop: safeRecommendedTop,
      recommendedWidth: safeRecommendedWidth,
      recommendedHeight: safeRecommendedHeight,
    });
  }

  function startDrag(event: React.PointerEvent, target: DragTarget) {
    if (!editMode) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}
    beginDrag(event.clientX, event.clientY, target, event.pointerId);
  }

  function startTouchDrag(event: ReactTouchEvent, target: DragTarget) {
    if (!editMode) return;
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    beginDrag(touch.clientX, touch.clientY, target, -1);
  }

  function startPanelDrag(event: React.PointerEvent) {
    if (!editMode || !showTools || !stageRef.current || !panelRef.current) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}

    const stageRect = stageRef.current.getBoundingClientRect();
    const panelRect = panelRef.current.getBoundingClientRect();
    const maxX = Math.max(8, stageRect.width - panelRect.width - 8);
    const maxY = Math.max(8, stageRect.height - panelRect.height - 8);

    setPanelDragState({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: panelPosition.x,
      startY: panelPosition.y,
      maxX,
      maxY,
    });
  }

  useEffect(() => {
    if (!dragState) return;
    const activeDrag = dragState;

    function applyDrag(clientX: number, clientY: number) {
      const dx = ((clientX - activeDrag.startClientX) / activeDrag.stageWidth) * 100;
      const dy = ((clientY - activeDrag.startClientY) / activeDrag.stageHeight) * 100;

      if (activeDrag.target === "creating") {
        const nextLeft = clamp(
          activeDrag.creatingLeft + dx,
          activeDrag.creatingWidth / 2,
          100 - activeDrag.creatingWidth / 2
        );
        const nextTop = clamp(
          activeDrag.creatingTop + dy,
          activeDrag.creatingHeight / 2,
          100 - activeDrag.creatingHeight / 2
        );
        setVarValues({
          "--bookcase-creating-left": toPercent(nextLeft),
          "--bookcase-creating-top": toPercent(nextTop),
        });
        return;
      }

      if (activeDrag.target === "creating-size") {
        const nextWidth = clamp(activeDrag.creatingWidth + dx, BOX_MIN_WIDTH, BOX_MAX_WIDTH);
        const nextHeight = clamp(activeDrag.creatingHeight + dy, BOX_MIN_HEIGHT, BOX_MAX_HEIGHT);
        const nextLeft = clamp(activeDrag.creatingLeft, nextWidth / 2, 100 - nextWidth / 2);
        const nextTop = clamp(activeDrag.creatingTop, nextHeight / 2, 100 - nextHeight / 2);
        setVarValues({
          "--bookcase-creating-width": toPercent(nextWidth),
          "--bookcase-creating-height": toPercent(nextHeight),
          "--bookcase-creating-left": toPercent(nextLeft),
          "--bookcase-creating-top": toPercent(nextTop),
        });
        return;
      }

      if (activeDrag.target === "recommended") {
        const nextLeft = clamp(
          activeDrag.recommendedLeft + dx,
          activeDrag.recommendedWidth / 2,
          100 - activeDrag.recommendedWidth / 2
        );
        const nextTop = clamp(
          activeDrag.recommendedTop + dy,
          activeDrag.recommendedHeight / 2,
          100 - activeDrag.recommendedHeight / 2
        );
        setVarValues({
          "--bookcase-recommended-left": toPercent(nextLeft),
          "--bookcase-recommended-top": toPercent(nextTop),
        });
        return;
      }

      const nextWidth = clamp(activeDrag.recommendedWidth + dx, BOX_MIN_WIDTH, BOX_MAX_WIDTH);
      const nextHeight = clamp(activeDrag.recommendedHeight + dy, BOX_MIN_HEIGHT, BOX_MAX_HEIGHT);
      const nextLeft = clamp(activeDrag.recommendedLeft, nextWidth / 2, 100 - nextWidth / 2);
      const nextTop = clamp(activeDrag.recommendedTop, nextHeight / 2, 100 - nextHeight / 2);
      setVarValues({
        "--bookcase-recommended-width": toPercent(nextWidth),
        "--bookcase-recommended-height": toPercent(nextHeight),
        "--bookcase-recommended-left": toPercent(nextLeft),
        "--bookcase-recommended-top": toPercent(nextTop),
      });
    }

    function onPointerMove(event: PointerEvent) {
      if (activeDrag.pointerId === -1) return;
      if (event.pointerId !== activeDrag.pointerId) return;
      applyDrag(event.clientX, event.clientY);
    }

    function onPointerUp(event: PointerEvent) {
      if (activeDrag.pointerId === -1) return;
      if (event.pointerId !== activeDrag.pointerId) return;
      setDragState(null);
    }

    function onTouchMove(event: TouchEvent) {
      if (activeDrag.pointerId !== -1) return;
      const touch = event.touches[0];
      if (!touch) return;
      event.preventDefault();
      applyDrag(touch.clientX, touch.clientY);
    }

    function onTouchEnd() {
      if (activeDrag.pointerId !== -1) return;
      setDragState(null);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [dragState, editMode]);

  useEffect(() => {
    if (!panelDragState) return;
    const activeDrag = panelDragState;

    function onPointerMove(event: PointerEvent) {
      if (event.pointerId !== activeDrag.pointerId) return;
      const dx = event.clientX - activeDrag.startClientX;
      const dy = event.clientY - activeDrag.startClientY;
      setPanelPosition({
        x: clamp(activeDrag.startX + dx, 8, activeDrag.maxX),
        y: clamp(activeDrag.startY + dy, 8, activeDrag.maxY),
      });
    }

    function onPointerUp(event: PointerEvent) {
      if (event.pointerId !== activeDrag.pointerId) return;
      setPanelDragState(null);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [panelDragState]);

  async function saveLayout() {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/bookcase-home-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, vars }),
      });
      const payload = (await response.json()) as ApiResult;
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save layout.");
      }
      setVars(payload.vars || vars);
      setStatus("Saved.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to save layout.";
      setStatus(message);
    } finally {
      setSaving(false);
    }
  }

  function onProfileChange(next: BookcaseHomeProfileKey) {
    setProfile(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("previewProfile", next);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function hotspotFontSize(scale: number) {
    return `clamp(0.94rem, ${(3.8 * scale).toFixed(2)}vw, ${(3.6 * scale).toFixed(2)}rem)`;
  }

  const sceneStyle: CSSProperties = useMemo(
    () => ({
      backgroundSize: `${bgSizeX}% ${bgSizeY}%`,
      backgroundPosition: `${bgPosX}% ${bgPosY}%`,
    }),
    [bgPosX, bgPosY, bgSizeX, bgSizeY]
  );

  const creatingBaseStyle: CSSProperties = {
    left: `${safeCreatingLeft}%`,
    top: `${safeCreatingTop}%`,
    width: `${safeCreatingWidth}%`,
    height: `${safeCreatingHeight}%`,
    fontSize: hotspotFontSize(safeCreatingScale),
  };

  const recommendedBaseStyle: CSSProperties = {
    left: `${safeRecommendedLeft}%`,
    top: `${safeRecommendedTop}%`,
    width: `${safeRecommendedWidth}%`,
    height: `${safeRecommendedHeight}%`,
    fontSize: hotspotFontSize(safeRecommendedScale),
  };

  const creatingLinkStyle: CSSProperties = {
    ...creatingBaseStyle,
    pointerEvents: "auto",
  };

  const recommendedLinkStyle: CSSProperties = {
    ...recommendedBaseStyle,
    pointerEvents: "auto",
  };

  const panelStyle: CSSProperties = {
    left: `${panelPosition.x}px`,
    top: `${panelPosition.y}px`,
  };

  return (
    <main
      className="bookcase-scene bookcase-scene-home"
      style={sceneStyle}
      data-bookcase-profile={profile}
      data-layout-edit={editMode ? "1" : "0"}
    >
      <div ref={stageRef} className="bookcase-canvas bookcase-home-canvas">
        {editMode && showTools && (
          <aside ref={panelRef} className="bookcase-home-editor-panel" style={panelStyle}>
            <div className="bookcase-home-editor-header" onPointerDown={startPanelDrag}>
              <h2>Bookcase Home Layout</h2>
              <button type="button" className="bookcase-home-editor-hide" onClick={() => setShowTools(false)}>
                Hide
              </button>
            </div>
            <label className="bookcase-editor-label">
              Profile
              <select value={profile} onChange={(event) => onProfileChange(event.target.value as BookcaseHomeProfileKey)}>
                {BOOKCASE_HOME_PROFILE_KEYS.map((item) => (
                  <option key={item} value={item}>
                    {BOOKCASE_HOME_PROFILE_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>

            <label className="bookcase-editor-label">
              Background Width (%)
              <input
                type="range"
                min={60}
                max={280}
                value={Math.round(bgSizeX)}
                onChange={(event) => setVarValue("--bookcase-bg-size-x", `${event.target.value}%`)}
                disabled={loading || saving}
              />
            </label>

            <label className="bookcase-editor-label">
              Background Height (%)
              <input
                type="range"
                min={60}
                max={220}
                value={Math.round(bgSizeY)}
                onChange={(event) => setVarValue("--bookcase-bg-size-y", `${event.target.value}%`)}
                disabled={loading || saving}
              />
            </label>

            <label className="bookcase-editor-label">
              Background X (%)
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(bgPosX)}
                onChange={(event) => setVarValue("--bookcase-bg-pos-x", `${event.target.value}%`)}
                disabled={loading || saving}
              />
            </label>

            <label className="bookcase-editor-label">
              Background Y (%)
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(bgPosY)}
                onChange={(event) => setVarValue("--bookcase-bg-pos-y", `${event.target.value}%`)}
                disabled={loading || saving}
              />
            </label>

            <label className="bookcase-editor-label">
              Creating text scale
              <input
                type="range"
                min={0.6}
                max={3.5}
                step={0.05}
                value={safeCreatingScale}
                onChange={(event) => setVarValue("--bookcase-creating-text-scale", toScale(Number(event.target.value)))}
                disabled={loading || saving}
              />
            </label>

            <label className="bookcase-editor-label">
              Recommended text scale
              <input
                type="range"
                min={0.6}
                max={3.5}
                step={0.05}
                value={safeRecommendedScale}
                onChange={(event) =>
                  setVarValue("--bookcase-recommended-text-scale", toScale(Number(event.target.value)))
                }
                disabled={loading || saving}
              />
            </label>

            <div className="bookcase-editor-actions">
              <button type="button" onClick={() => void saveLayout()} disabled={loading || saving}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setReloadToken((current) => current + 1)}
                disabled={loading || saving}
              >
                Reload
              </button>
            </div>
            <p className="bookcase-editor-hint">
              Drag either text box and resize from the corner. Selected: {selectedBox}.
            </p>
            {status && <p className="bookcase-home-editor-status">{status}</p>}
          </aside>
        )}

        {editMode && !showTools && (
          <button type="button" className="bookcase-home-tools-toggle" onClick={() => setShowTools(true)}>
            Show layout tools
          </button>
        )}

        {!editMode && (
          <>
            <Link
              href="/bookcase/creating"
              className={`bookcase-hotspot bookcase-hotspot-home bookcase-home-link ${caveat.className}`}
              style={creatingLinkStyle}
            >
              Books I&apos;m creating
            </Link>
            <Link
              href="/bookcase/recommended"
              className={`bookcase-hotspot bookcase-hotspot-home bookcase-home-link ${caveat.className}`}
              style={recommendedLinkStyle}
            >
              Books I&apos;d recommend
            </Link>
          </>
        )}

        {editMode && (
          <>
            <button
              type="button"
              className={`bookcase-home-edit-box ${selectedBox === "creating" ? "is-selected" : ""}`}
              style={creatingBaseStyle}
              onPointerDown={(event) => startDrag(event, "creating")}
              onTouchStart={(event) => startTouchDrag(event, "creating")}
              onClick={() => setSelectedBox("creating")}
            >
              <span className={`bookcase-home-link ${caveat.className}`}>Books I&apos;m creating</span>
              <span
                className="bookcase-home-edit-handle"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  startDrag(event, "creating-size");
                }}
                onTouchStart={(event) => {
                  event.stopPropagation();
                  startTouchDrag(event, "creating-size");
                }}
              />
            </button>

            <button
              type="button"
              className={`bookcase-home-edit-box ${selectedBox === "recommended" ? "is-selected" : ""}`}
              style={recommendedBaseStyle}
              onPointerDown={(event) => startDrag(event, "recommended")}
              onTouchStart={(event) => startTouchDrag(event, "recommended")}
              onClick={() => setSelectedBox("recommended")}
            >
              <span className={`bookcase-home-link ${caveat.className}`}>Books I&apos;d recommend</span>
              <span
                className="bookcase-home-edit-handle"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  startDrag(event, "recommended-size");
                }}
                onTouchStart={(event) => {
                  event.stopPropagation();
                  startTouchDrag(event, "recommended-size");
                }}
              />
            </button>
          </>
        )}
      </div>
    </main>
  );
}
