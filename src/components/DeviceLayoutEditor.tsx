"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEVICE_PROFILE_KEYS,
  DEVICE_PROFILE_LABELS,
  type DeviceProfileKey,
} from "@/lib/login/deviceLayout";

type ApiResult = {
  profile: DeviceProfileKey;
  vars: Record<string, string>;
  source?: string;
  warning?: string;
  error?: string;
};

type DragTarget = "left" | "left-size" | "right" | "right-size" | "popup" | "popup-size";
type BoxTarget = "left" | "right" | "popup";

type DragState = {
  target: DragTarget;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  stageWidth: number;
  stageHeight: number;
  leftX: number;
  leftY: number;
  leftW: number;
  leftH: number;
  rightX: number;
  rightY: number;
  rightModeY: number;
  rightW: number;
  rightH: number;
  popupX: number;
  popupY: number;
  popupW: number;
};

type PreviewBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function labelForVar(key: string) {
  return key
    .replace(/^--login-/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parsePercent(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
}

function parseVw(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
}

function toPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function toVw(value: number) {
  return `${value.toFixed(2)}vw`;
}

function clampLeftCenter(center: number, width: number) {
  const minCenter = width / 2;
  const maxCenter = 50 - width / 2;
  return clamp(center, minCenter, maxCenter);
}

function clampRightCenter(center: number, width: number) {
  const minCenter = 50 + width / 2;
  const maxCenter = 100 - width / 2;
  return clamp(center, minCenter, maxCenter);
}

function maxLeftWidthForCenter(center: number) {
  return Math.max(8, Math.min(center * 2, (50 - center) * 2));
}

function maxRightWidthForCenter(center: number) {
  return Math.max(8, Math.min((center - 50) * 2, (100 - center) * 2));
}

function maxLeftWidthForStart(start: number) {
  return Math.max(8, 50 - start);
}

function maxRightWidthForStart(start: number) {
  return Math.max(8, 100 - start);
}

function leftCenterFromVars(leftLeft: number, leftWidth: number) {
  return leftLeft / 2 + leftWidth / 2;
}

function rightCenterFromVars(rightLeft: number, rightWidth: number) {
  return 50 + rightLeft / 2 + rightWidth / 2;
}

const INSERT_TOP_MIN = 0;
const INSERT_TOP_MAX = 88;

function stageSizeForProfile(profile: DeviceProfileKey) {
  switch (profile) {
    case "iphone-portrait":
      return { width: 430, height: 932 };
    case "iphone-landscape":
      return { width: 932, height: 430 };
    case "ipad-portrait":
      return { width: 768, height: 1024 };
    default:
      return { width: 1024, height: 768 };
  }
}

export default function DeviceLayoutEditor() {
  const [profile, setProfile] = useState<DeviceProfileKey>("iphone-portrait");
  const [vars, setVars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedTarget, setSelectedTarget] = useState<BoxTarget>("left");
  const [showGuides, setShowGuides] = useState(true);
  const [snapToGuides, setSnapToGuides] = useState(true);
  const [previewBounds, setPreviewBounds] = useState<PreviewBounds>({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  });
  const stageRef = useRef<HTMLDivElement | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLayout() {
      setLoading(true);
      setStatus(null);
      try {
        const response = await fetch(`/api/device-layout?profile=${profile}&ts=${Date.now()}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as ApiResult;
        if (!response.ok) {
          throw new Error(payload.error || "Unable to load profile.");
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
        const message = error instanceof Error ? error.message : "Unable to load profile.";
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

  const isPhoneProfile = profile === "iphone-portrait" || profile === "iphone-landscape";
  const stageSize = stageSizeForProfile(profile);
  const keys = useMemo(() => Object.keys(vars).sort((a, b) => a.localeCompare(b)), [vars]);
  const previewSrc = useMemo(
    () => `/login?mode=login&previewMode=1&previewProfile=${profile}`,
    [profile]
  );

  const leftLeft = parsePercent(vars["--login-left-left"], isPhoneProfile ? 31 : 24);
  const leftTop = parsePercent(vars["--login-left-top"], isPhoneProfile ? 43 : 36);
  const rightLeft = parsePercent(vars["--login-right-left"], isPhoneProfile ? 10 : 10);
  const rightTop = parsePercent(vars["--login-right-top"], isPhoneProfile ? 40 : 34);
  const rightModeTop = parsePercent(vars["--login-right-mode-top"], isPhoneProfile ? 37 : 30);
  const leftWidth = parsePercent(vars["--login-left-width"], 24);
  const leftHeight = parsePercent(vars["--login-left-height"], 20);
  const rightWidth = parsePercent(vars["--login-right-width"], 26);
  const rightHeight = parsePercent(vars["--login-right-height"], 18);
  const popupLeft = parsePercent(vars["--login-popup-left"], 70);
  const popupTop = parsePercent(vars["--login-popup-top"], 63);
  const popupWidth = parseVw(vars["--login-popup-width"], 82);
  const bgSize = parsePercent(vars["--login-bg-size"], isPhoneProfile ? 180 : 100);
  const bgPosY = parsePercent(vars["--login-bg-pos-y"], 2);

  const safeLeftWidth = clamp(leftWidth, 8, 46);
  const safeRightWidth = clamp(rightWidth, 8, 46);
  const safeLeftHeight = clamp(leftHeight, 8, 46);
  const safeRightHeight = clamp(rightHeight, 8, 46);

  const safeLeftStart = clamp(leftLeft / 2, 0, 50 - safeLeftWidth);
  const safeRightStart = clamp(50 + rightLeft / 2, 50, 100 - safeRightWidth);
  const safeLeftTop = clamp(leftTop, INSERT_TOP_MIN, INSERT_TOP_MAX);
  const safeRightTop = clamp(rightTop, INSERT_TOP_MIN, INSERT_TOP_MAX);
  const safeRightModeTop = clamp(rightModeTop, INSERT_TOP_MIN, INSERT_TOP_MAX);

  function setVarValue(key: string, value: string) {
    setVars((current) => ({ ...current, [key]: value }));
  }

  function setVarValues(nextValues: Record<string, string>) {
    setVars((current) => ({
      ...current,
      ...nextValues,
    }));
  }

  useEffect(() => {
    const nextValues: Record<string, string> = {};

    if (Math.abs(leftLeft / 2 - safeLeftStart) > 0.01) {
      nextValues["--login-left-left"] = toPercent(safeLeftStart * 2);
    }
    if (Math.abs(rightLeft / 2 - (safeRightStart - 50)) > 0.01) {
      nextValues["--login-right-left"] = toPercent((safeRightStart - 50) * 2);
    }
    if (Math.abs(leftWidth - safeLeftWidth) > 0.01) {
      nextValues["--login-left-width"] = toPercent(safeLeftWidth);
    }
    if (Math.abs(rightWidth - safeRightWidth) > 0.01) {
      nextValues["--login-right-width"] = toPercent(safeRightWidth);
    }
    if (Math.abs(leftHeight - safeLeftHeight) > 0.01) {
      nextValues["--login-left-height"] = toPercent(safeLeftHeight);
    }
    if (Math.abs(rightHeight - safeRightHeight) > 0.01) {
      nextValues["--login-right-height"] = toPercent(safeRightHeight);
    }
    if (Math.abs(leftTop - safeLeftTop) > 0.01) {
      nextValues["--login-left-top"] = toPercent(safeLeftTop);
    }
    if (Math.abs(rightTop - safeRightTop) > 0.01) {
      nextValues["--login-right-top"] = toPercent(safeRightTop);
    }
    if (Math.abs(rightModeTop - safeRightModeTop) > 0.01) {
      nextValues["--login-right-mode-top"] = toPercent(safeRightModeTop);
    }

    if (Object.keys(nextValues).length > 0) {
      setVarValues(nextValues);
    }
  }, [
    leftHeight,
    leftLeft,
    leftTop,
    leftWidth,
    rightHeight,
    rightLeft,
    rightModeTop,
    rightTop,
    rightWidth,
    safeLeftHeight,
    safeLeftStart,
    safeLeftTop,
    safeLeftWidth,
    safeRightHeight,
    safeRightStart,
    safeRightTop,
    safeRightModeTop,
    safeRightWidth,
  ]);

  function snapValue(value: number, guides: number[], threshold = 1.25) {
    if (!snapToGuides) return value;
    let best = value;
    let closest = threshold;
    for (const guide of guides) {
      const delta = Math.abs(value - guide);
      if (delta <= closest) {
        closest = delta;
        best = guide;
      }
    }
    return best;
  }

  function boxTargetForDragTarget(target: DragTarget): BoxTarget {
    if (target === "left" || target === "left-size") return "left";
    if (target === "right" || target === "right-size") return "right";
    return "popup";
  }

  function startDrag(event: React.PointerEvent, target: DragTarget) {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const useBookSpace = target === "left" || target === "left-size" || target === "right" || target === "right-size";
    const activeWidth = useBookSpace ? (rect.width * previewBounds.width) / 100 : rect.width;
    const activeHeight = useBookSpace ? (rect.height * previewBounds.height) / 100 : rect.height;
    if (!activeWidth || !activeHeight) return;

    setSelectedTarget(boxTargetForDragTarget(target));
    setDragState({
      target,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      stageWidth: activeWidth,
      stageHeight: activeHeight,
      leftX: safeLeftStart * 2,
      leftY: safeLeftTop,
      leftW: safeLeftWidth,
      leftH: safeLeftHeight,
      rightX: (safeRightStart - 50) * 2,
      rightY: safeRightModeTop,
      rightModeY: safeRightModeTop,
      rightW: safeRightWidth,
      rightH: safeRightHeight,
      popupX: popupLeft,
      popupY: popupTop,
      popupW: popupWidth,
    });
  }

  useEffect(() => {
    if (!dragState) return;
    const activeDrag = dragState;

    let animationFrameId = 0;
    let queuedEvent: PointerEvent | null = null;

    function applyPointerMove(event: PointerEvent) {
      const deltaXPercent = ((event.clientX - activeDrag.startClientX) / activeDrag.stageWidth) * 100;
      const deltaYPercent = ((event.clientY - activeDrag.startClientY) / activeDrag.stageHeight) * 100;

      if (activeDrag.target === "left") {
        const currentCenter = leftCenterFromVars(activeDrag.leftX, activeDrag.leftW);
        const nextCenterRaw = clampLeftCenter(currentCenter + deltaXPercent, activeDrag.leftW);
        const nextCenter = clampLeftCenter(snapValue(nextCenterRaw, [12.5, 25, 37.5]), activeDrag.leftW);
        const nextLeftStart = nextCenter - activeDrag.leftW / 2;
        const nextTop = snapValue(
          clamp(activeDrag.leftY + deltaYPercent, INSERT_TOP_MIN, INSERT_TOP_MAX),
          [10, 20, 30, 40, 50, 60, 70]
        );
        setVarValues({
          "--login-left-left": toPercent(nextLeftStart * 2),
          "--login-left-top": toPercent(nextTop),
        });
        return;
      }

      if (activeDrag.target === "left-size") {
        const leftStart = activeDrag.leftX / 2;
        const maxWidth = maxLeftWidthForStart(leftStart);
        setVarValues({
          "--login-left-width": toPercent(clamp(activeDrag.leftW + deltaXPercent, 8, maxWidth)),
          "--login-left-height": toPercent(clamp(activeDrag.leftH + deltaYPercent, 8, 46)),
        });
        return;
      }

      if (activeDrag.target === "right") {
        const newTop = snapValue(
          clamp(activeDrag.rightY + deltaYPercent, INSERT_TOP_MIN, INSERT_TOP_MAX),
          [10, 20, 30, 40, 50, 60, 70]
        );
        const currentCenter = rightCenterFromVars(activeDrag.rightX, activeDrag.rightW);
        const nextCenterRaw = clampRightCenter(currentCenter + deltaXPercent, activeDrag.rightW);
        const nextCenter = clampRightCenter(snapValue(nextCenterRaw, [62.5, 75, 87.5]), activeDrag.rightW);
        const nextRightStart = nextCenter - activeDrag.rightW / 2;
        setVarValues({
          "--login-right-left": toPercent((nextRightStart - 50) * 2),
          "--login-right-top": toPercent(newTop),
          "--login-right-mode-top": toPercent(newTop),
        });
        return;
      }

      if (activeDrag.target === "right-size") {
        const rightStart = 50 + activeDrag.rightX / 2;
        const maxWidth = maxRightWidthForStart(rightStart);
        setVarValues({
          "--login-right-width": toPercent(clamp(activeDrag.rightW + deltaXPercent, 8, maxWidth)),
          "--login-right-height": toPercent(clamp(activeDrag.rightH + deltaYPercent, 8, 46)),
        });
        return;
      }

      if (activeDrag.target === "popup") {
        const nextPopupLeft = snapValue(clamp(activeDrag.popupX + deltaXPercent, 18, 92), [25, 50, 75]);
        const nextPopupTop = snapValue(clamp(activeDrag.popupY + deltaYPercent, 14, 92), [24, 38, 50, 62, 74]);
        setVarValues({
          "--login-popup-left": toPercent(nextPopupLeft),
          "--login-popup-top": toPercent(nextPopupTop),
        });
        return;
      }

      if (activeDrag.target === "popup-size") {
        setVarValue("--login-popup-width", toVw(clamp(activeDrag.popupW + deltaXPercent, 20, 96)));
      }
    }

    function flushQueuedMove() {
      animationFrameId = 0;
      if (!queuedEvent) return;
      const nextEvent = queuedEvent;
      queuedEvent = null;
      applyPointerMove(nextEvent);
    }

    function onPointerMove(event: PointerEvent) {
      if (event.pointerId !== activeDrag.pointerId) return;
      queuedEvent = event;
      if (!animationFrameId) {
        animationFrameId = window.requestAnimationFrame(flushQueuedMove);
      }
    }

    function onPointerUp(event: PointerEvent) {
      if (event.pointerId !== activeDrag.pointerId) return;
      setDragState(null);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragState]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (loading || saving || dragState) return;
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      const step = event.shiftKey ? 1.5 : event.altKey ? 0.1 : 0.35;
      let dx = 0;
      let dy = 0;
      if (event.key === "ArrowLeft") dx = -step;
      if (event.key === "ArrowRight") dx = step;
      if (event.key === "ArrowUp") dy = -step;
      if (event.key === "ArrowDown") dy = step;
      if (!dx && !dy) return;
      event.preventDefault();

      if (selectedTarget === "left") {
        const center = clampLeftCenter(leftCenterFromVars(safeLeftStart * 2, safeLeftWidth) + dx, safeLeftWidth);
        const leftStart = center - safeLeftWidth / 2;
        const top = clamp(safeLeftTop + dy, INSERT_TOP_MIN, INSERT_TOP_MAX);
        setVarValues({
          "--login-left-left": toPercent(leftStart * 2),
          "--login-left-top": toPercent(top),
        });
        return;
      }

      if (selectedTarget === "right") {
        const top = clamp(safeRightModeTop + dy, INSERT_TOP_MIN, INSERT_TOP_MAX);
        const center = clampRightCenter(
          rightCenterFromVars((safeRightStart - 50) * 2, safeRightWidth) + dx,
          safeRightWidth
        );
        const rightStart = center - safeRightWidth / 2;
        setVarValues({
          "--login-right-left": toPercent((rightStart - 50) * 2),
          "--login-right-top": toPercent(top),
          "--login-right-mode-top": toPercent(top),
        });
        return;
      }

      const popupX = clamp(popupLeft + dx, 18, 92);
      const popupY = clamp(popupTop + dy, 14, 92);
      setVarValues({
        "--login-popup-left": toPercent(popupX),
        "--login-popup-top": toPercent(popupY),
      });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    dragState,
    leftLeft,
    leftTop,
    leftWidth,
    loading,
    popupLeft,
    popupTop,
    rightLeft,
    rightModeTop,
    rightTop,
    rightWidth,
    saving,
    safeLeftStart,
    safeLeftTop,
    safeLeftWidth,
    safeRightStart,
    safeRightModeTop,
    safeRightWidth,
    selectedTarget,
  ]);

  async function saveLayout() {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/device-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, vars }),
      });

      const payload = (await response.json()) as ApiResult;
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save profile.");
      }

      setVars(payload.vars || vars);
      setStatus("Saved.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to save profile.";
      setStatus(message);
    } finally {
      setSaving(false);
    }
  }

  const leftOverlayCenterX = isPhoneProfile ? safeLeftStart + safeLeftWidth / 2 : safeLeftStart;
  const leftOverlayCenterY = isPhoneProfile ? safeLeftTop + safeLeftHeight / 2 : safeLeftTop;
  const rightOverlayCenterX = isPhoneProfile ? safeRightStart + safeRightWidth / 2 : safeRightStart;
  const rightOverlayCenterY = isPhoneProfile ? safeRightModeTop + safeRightHeight / 2 : safeRightModeTop;

  const leftBoxStyle = {
    left: `${leftOverlayCenterX}%`,
    top: `${leftOverlayCenterY}%`,
    width: `${safeLeftWidth}%`,
    height: `${safeLeftHeight}%`,
  };

  const rightBoxStyle = {
    left: `${rightOverlayCenterX}%`,
    top: `${rightOverlayCenterY}%`,
    width: `${safeRightWidth}%`,
    height: `${safeRightHeight}%`,
  };

  const popupBoxStyle = {
    left: `${popupLeft}%`,
    top: `${popupTop}%`,
    width: `${popupWidth}%`,
    height: "24%",
  };

  const leftBoxStageStyle = {
    left: `${previewBounds.left + (previewBounds.width * safeLeftStart) / 100}%`,
    top: `${previewBounds.top + (previewBounds.height * safeLeftTop) / 100}%`,
    width: `${(previewBounds.width * safeLeftWidth) / 100}%`,
    height: `${(previewBounds.height * safeLeftHeight) / 100}%`,
  };

  const rightBoxStageStyle = {
    left: `${previewBounds.left + (previewBounds.width * safeRightStart) / 100}%`,
    top: `${previewBounds.top + (previewBounds.height * safeRightModeTop) / 100}%`,
    width: `${(previewBounds.width * safeRightWidth) / 100}%`,
    height: `${(previewBounds.height * safeRightHeight) / 100}%`,
  };

  const guideBookLeft = previewBounds.left;
  const guideBookRight = previewBounds.left + previewBounds.width;
  const guideSeamLeft = previewBounds.left + previewBounds.width * 0.5;
  const guideBookTop = previewBounds.top;
  const guideBookBottom = previewBounds.top + previewBounds.height;

  function measurePreviewBounds() {
    const frame = previewFrameRef.current;
    if (!frame) return;

    const frameWindow = frame.contentWindow;
    const frameDocument = frame.contentDocument;
    if (!frameWindow || !frameDocument) return;

    const hero = frameDocument.querySelector(".login-hero") as HTMLElement | null;
    const book = frameDocument.querySelector(".login-book") as HTMLElement | null;
    if (!hero || !book) return;

    const heroRect = hero.getBoundingClientRect();
    const bookRect = book.getBoundingClientRect();
    if (!heroRect.width || !heroRect.height || !bookRect.width || !bookRect.height) return;

    const nextBounds: PreviewBounds = {
      // On phone profiles the book can be wider than the viewport. Keep that full ratio
      // so drag math stays aligned with the real rendered layout.
      left: clamp(((bookRect.left - heroRect.left) / heroRect.width) * 100, -250, 250),
      top: clamp(((bookRect.top - heroRect.top) / heroRect.height) * 100, 0, 100),
      width: clamp((bookRect.width / heroRect.width) * 100, 20, 400),
      height: clamp((bookRect.height / heroRect.height) * 100, 20, 100),
    };

    setPreviewBounds((current) => {
      const delta =
        Math.abs(current.left - nextBounds.left) +
        Math.abs(current.top - nextBounds.top) +
        Math.abs(current.width - nextBounds.width) +
        Math.abs(current.height - nextBounds.height);
      if (delta < 0.15) return current;
      return nextBounds;
    });
  }

  const leftLabel = `Left edge ${safeLeftStart.toFixed(1)}%, ${safeLeftTop.toFixed(1)}%`;
  const rightLabel = `Right edge ${safeRightStart.toFixed(1)}%, ${safeRightModeTop.toFixed(1)}%`;
  const popupLabel = `Popup ${popupLeft.toFixed(1)}%, ${popupTop.toFixed(1)}%`;

  function postPreviewVars() {
    const target = previewFrameRef.current?.contentWindow;
    if (!target) return;
    target.postMessage(
      {
        type: "device-layout-preview-vars",
        profile,
        vars,
      },
      window.location.origin
    );
  }

  useEffect(() => {
    postPreviewVars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, vars]);

  useEffect(() => {
    const frame = previewFrameRef.current;
    if (!frame) return;

    let timer: number | null = null;
    let raf = 0;
    const runMeasure = () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        measurePreviewBounds();
      });
    };

    const onFrameLoad = () => {
      runMeasure();
      frame.contentWindow?.addEventListener("resize", runMeasure);
    };

    timer = window.setInterval(runMeasure, 350);
    frame.addEventListener("load", onFrameLoad);
    runMeasure();

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      frame.removeEventListener("load", onFrameLoad);
      frame.contentWindow?.removeEventListener("resize", runMeasure);
      if (timer !== null) window.clearInterval(timer);
    };
  }, [profile, reloadToken]);

  return (
    <section className="device-layout-shell">
      <div className="bookcase-admin-card device-layout-editor">
        <h1>Device Layout Setup</h1>
        <p>Use the live preview on the right. Drag left/right inserts, resize them from the corner, and drag/resize popup form.</p>

        <div className="bookcase-editor-label">
          <span>Profile</span>
          <select
            value={profile}
            onChange={(event) => setProfile(event.target.value as DeviceProfileKey)}
            disabled={loading || saving}
          >
            {DEVICE_PROFILE_KEYS.map((item) => (
              <option key={item} value={item}>
                {DEVICE_PROFILE_LABELS[item]}
              </option>
            ))}
          </select>
        </div>

        <label className="bookcase-editor-label">
          <span>Background Zoom (%)</span>
          <input
            type="range"
            min={80}
            max={220}
            value={Math.round(bgSize)}
            onChange={(event) => setVarValue("--login-bg-size", `${event.target.value}%`)}
            disabled={loading || saving}
          />
        </label>

        <label className="bookcase-editor-label">
          <span>Background Y Position (%)</span>
          <input
            type="range"
            min={-10}
            max={40}
            value={Math.round(bgPosY)}
            onChange={(event) => setVarValue("--login-bg-pos-y", `${event.target.value}%`)}
            disabled={loading || saving}
          />
        </label>

        {isPhoneProfile && (
          <>
            <label className="bookcase-editor-label">
              <span>Left Insert Width (%)</span>
              <input
                type="range"
                min={8}
                max={40}
                value={Math.round(leftWidth)}
                onChange={(event) => {
                  const candidate = Number(event.target.value);
                  const maxWidth = maxLeftWidthForStart(safeLeftStart);
                  setVarValue("--login-left-width", `${clamp(candidate, 8, maxWidth).toFixed(2)}%`);
                }}
                disabled={loading || saving}
              />
            </label>

            <label className="bookcase-editor-label">
              <span>Left Insert Height (%)</span>
              <input
                type="range"
                min={8}
                max={46}
                value={Math.round(leftHeight)}
                onChange={(event) => setVarValue("--login-left-height", `${event.target.value}%`)}
                disabled={loading || saving}
              />
            </label>

            <label className="bookcase-editor-label">
              <span>Right Insert Width (%)</span>
              <input
                type="range"
                min={8}
                max={46}
                value={Math.round(rightWidth)}
                onChange={(event) => {
                  const candidate = Number(event.target.value);
                  const maxWidth = maxRightWidthForStart(safeRightStart);
                  setVarValue("--login-right-width", `${clamp(candidate, 8, maxWidth).toFixed(2)}%`);
                }}
                disabled={loading || saving}
              />
            </label>

            <label className="bookcase-editor-label">
              <span>Right Insert Height (%)</span>
              <input
                type="range"
                min={8}
                max={46}
                value={Math.round(rightHeight)}
                onChange={(event) => setVarValue("--login-right-height", `${event.target.value}%`)}
                disabled={loading || saving}
              />
            </label>
          </>
        )}

        <details className="bookcase-coords-panel">
          <summary>Advanced Values</summary>
          <div className="device-layout-fields">
            {keys.map((key) => (
              <label key={key} className="bookcase-editor-label">
                <span>{labelForVar(key)}</span>
                <input
                  type="text"
                  value={vars[key] ?? ""}
                  onChange={(event) =>
                    setVars((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  disabled={loading || saving}
                  spellCheck={false}
                />
              </label>
            ))}
          </div>
        </details>

        <div className="bookcase-editor-actions">
          <button type="button" onClick={() => void saveLayout()} disabled={loading || saving}>
            {saving ? "Saving..." : "Save Device Layout"}
          </button>
          <button type="button" onClick={() => setReloadToken((current) => current + 1)} disabled={loading || saving}>
            Reload Profile
          </button>
          <a href={`/login?mode=login&previewProfile=${profile}`} target="_blank" rel="noreferrer">
            Open Login Tab
          </a>
        </div>

        <div className="device-layout-tools">
          <label className="device-layout-tool-toggle">
            <input
              type="checkbox"
              checked={showGuides}
              onChange={(event) => setShowGuides(event.target.checked)}
            />
            <span>Show guides</span>
          </label>
          <label className="device-layout-tool-toggle">
            <input
              type="checkbox"
              checked={snapToGuides}
              onChange={(event) => setSnapToGuides(event.target.checked)}
            />
            <span>Snap to guides</span>
          </label>
          <p className="bookcase-editor-hint">Arrow keys nudge selection. Hold Shift for faster, Alt for fine.</p>
        </div>

        {status && <p className="bookcase-editor-hint">{status}</p>}
      </div>

      <div className="bookcase-admin-card device-layout-preview device-layout-preview-live">
        <h2>{DEVICE_PROFILE_LABELS[profile]} Live Preview</h2>
        <div
          ref={stageRef}
          className="device-layout-stage"
          style={{
            width: `${stageSize.width}px`,
            maxWidth: "100%",
            aspectRatio: `${stageSize.width} / ${stageSize.height}`,
          }}
        >
          <iframe
            ref={previewFrameRef}
            src={previewSrc}
            title={`${DEVICE_PROFILE_LABELS[profile]} Preview`}
            className="device-layout-stage-frame"
            onLoad={postPreviewVars}
          />
          <div className={`device-layout-guides ${showGuides ? "" : "device-layout-guides-hidden"}`} aria-hidden="true">
            <span className="device-layout-guide device-layout-guide-book-edge" style={{ left: `${guideBookLeft}%` }} />
            <span className="device-layout-guide device-layout-guide-book-edge" style={{ left: `${guideBookRight}%` }} />
            <span className="device-layout-guide device-layout-guide-seam" style={{ left: `${guideSeamLeft}%` }} />
            <span
              className="device-layout-guide-horizontal device-layout-guide-book-edge"
              style={{ top: `${guideBookTop}%`, left: `${guideBookLeft}%`, width: `${previewBounds.width}%` }}
            />
            <span
              className="device-layout-guide-horizontal device-layout-guide-book-edge"
              style={{ top: `${guideBookBottom}%`, left: `${guideBookLeft}%`, width: `${previewBounds.width}%` }}
            />
          </div>
          <button
            type="button"
            className={`device-drag-box device-drag-left ${selectedTarget === "left" ? "is-selected" : ""}`}
            style={leftBoxStageStyle}
            onPointerDown={(event) => startDrag(event, "left")}
            onClick={() => setSelectedTarget("left")}
          >
            {leftLabel}
            <span
              className="device-drag-handle device-drag-handle-size"
              onPointerDown={(event) => {
                event.stopPropagation();
                startDrag(event, "left-size");
              }}
            />
          </button>
          <button
            type="button"
            className={`device-drag-box device-drag-right ${selectedTarget === "right" ? "is-selected" : ""}`}
            style={rightBoxStageStyle}
            onPointerDown={(event) => startDrag(event, "right")}
            onClick={() => setSelectedTarget("right")}
          >
            {rightLabel}
            <span
              className="device-drag-handle device-drag-handle-size"
              onPointerDown={(event) => {
                event.stopPropagation();
                startDrag(event, "right-size");
              }}
            />
          </button>

          {isPhoneProfile && (
            <button
              type="button"
              className={`device-drag-box device-drag-popup ${selectedTarget === "popup" ? "is-selected" : ""}`}
              style={popupBoxStyle}
              onPointerDown={(event) => startDrag(event, "popup")}
              onClick={() => setSelectedTarget("popup")}
            >
              {popupLabel}
              <span
                className="device-drag-handle"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  startDrag(event, "popup-size");
                }}
              />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
