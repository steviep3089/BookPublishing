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
  popupH: number;
};

type PreviewBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type StageRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type PageBounds = {
  left: StageRect | null;
  right: StageRect | null;
};

type PreviewAuthMode = "signup" | "signin" | "reset";

function loginModeQuery(mode: PreviewAuthMode) {
  if (mode === "signin") return "&mode=login";
  if (mode === "reset") return "&mode=reset";
  return "";
}

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

function parseUnitless(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
}

function parseRem(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const match = value.match(/^(-?\d+(?:\.\d+)?)rem$/);
  if (!match) return fallback;
  const numeric = Number.parseFloat(match[1]);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
}

function toPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function toVw(value: number) {
  return `${value.toFixed(2)}vw`;
}

const INSERT_X_MIN = -150;
const INSERT_X_MAX = 250;
const PAGE_INSERT_X_MIN = INSERT_X_MIN * 2;
const PAGE_INSERT_X_MAX = INSERT_X_MAX * 2;
const INSERT_TOP_MIN = -150;
const INSERT_TOP_MAX = 300;
const INSERT_WIDTH_MIN = 8;
const INSERT_WIDTH_MAX = 100;
const INSERT_HEIGHT_MIN = 8;
const INSERT_HEIGHT_MAX = 220;

function maxLeftWidthForStart(start: number) {
  return Math.max(INSERT_WIDTH_MIN, Math.min(INSERT_WIDTH_MAX, (PAGE_INSERT_X_MAX - start) / 2));
}

function maxRightWidthForStart(start: number) {
  return Math.max(INSERT_WIDTH_MIN, Math.min(INSERT_WIDTH_MAX, (PAGE_INSERT_X_MAX - start) / 2));
}

function stageSizeForProfile(profile: DeviceProfileKey) {
  switch (profile) {
    case "desktop":
      return { width: 1440, height: 900 };
    case "iphone-portrait":
      return { width: 393, height: 852 };
    case "iphone-portrait-max":
      return { width: 430, height: 932 };
    case "iphone-landscape":
      return { width: 852, height: 393 };
    case "iphone-landscape-max":
      return { width: 932, height: 430 };
    case "ipad-portrait":
      return { width: 768, height: 1024 };
    default:
      return { width: 1024, height: 768 };
  }
}

export default function DeviceLayoutEditor() {
  const [profile, setProfile] = useState<DeviceProfileKey>("iphone-portrait");
  const [previewAuthMode, setPreviewAuthMode] = useState<PreviewAuthMode>("signup");
  const [vars, setVars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedTarget, setSelectedTarget] = useState<BoxTarget>("left");
  const [showGuides, setShowGuides] = useState(true);
  const [snapToGuides, setSnapToGuides] = useState(false);
  const [desktopViewport, setDesktopViewport] = useState({ width: 1440, height: 900 });
  const [desktopPreviewScale, setDesktopPreviewScale] = useState(1);
  const [phoneTextScaleBase, setPhoneTextScaleBase] = useState(1);
  const [previewBounds, setPreviewBounds] = useState<PreviewBounds>({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  });
  const [pageBounds, setPageBounds] = useState<PageBounds>({
    left: null,
    right: null,
  });
  const stageRef = useRef<HTMLDivElement | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const appliedPreviewVarKeysRef = useRef<string[]>([]);

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
        const nextVars = payload.vars || {};
        setVars(nextVars);
        if (profile.startsWith("iphone-")) {
          setPhoneTextScaleBase(clamp(parseUnitless(nextVars["--login-phone-text-scale"], 1), 0.6, 3));
        }
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

  useEffect(() => {
    function syncDesktopViewport() {
      const width = Math.max(1024, Math.round(window.innerWidth || 0));
      const height = Math.max(640, Math.round(window.innerHeight || 0));
      setDesktopViewport((current) => {
        if (current.width === width && current.height === height) return current;
        return { width, height };
      });
    }

    syncDesktopViewport();
    window.addEventListener("resize", syncDesktopViewport);
    return () => window.removeEventListener("resize", syncDesktopViewport);
  }, []);

  useEffect(() => {
    if (profile !== "desktop") {
      setDesktopPreviewScale(1);
      return;
    }
    const stage = stageRef.current;
    if (!stage) return;

    const updateScale = () => {
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const scale = Math.min(rect.width / desktopViewport.width, rect.height / desktopViewport.height);
      setDesktopPreviewScale((current) => (Math.abs(current - scale) < 0.002 ? current : scale));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(stage);
    window.addEventListener("resize", updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [desktopViewport.height, desktopViewport.width, profile]);

  const isPhoneProfile = profile.startsWith("iphone-");
  const isIpadProfile = profile.startsWith("ipad-");
  const isDesktopProfile = profile === "desktop";
  const stageSize = profile === "desktop" ? desktopViewport : stageSizeForProfile(profile);
  const keys = useMemo(() => Object.keys(vars).sort((a, b) => a.localeCompare(b)), [vars]);
  const previewSrc = useMemo(() => {
    return `/login?previewProfile=${profile}&previewMode=1${loginModeQuery(previewAuthMode)}`;
  }, [previewAuthMode, profile]);
  const desktopFrameStyle =
    profile === "desktop"
      ? ({
          width: `${desktopViewport.width}px`,
          height: `${desktopViewport.height}px`,
          transform: `scale(${desktopPreviewScale})`,
          transformOrigin: "top left",
        } satisfies React.CSSProperties)
      : undefined;

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
  const popupHeight = parsePercent(
    vars["--login-popup-height"],
    isPhoneProfile ? (profile.includes("landscape") ? 16 : 18) : 24
  );
  const bgSizeX = parsePercent(
    vars["--login-bg-size-x"],
    parsePercent(vars["--login-bg-size"], isPhoneProfile ? 180 : 100)
  );
  const bgSizeY = parsePercent(vars["--login-bg-size-y"], 100);
  const bgPosY = parsePercent(vars["--login-bg-pos-y"], 2);
  const desktopTextScaleRaw = Number.parseFloat(vars["--login-desktop-text-scale"] ?? "1");
  const desktopTextScale = Number.isFinite(desktopTextScaleRaw) ? desktopTextScaleRaw : 1;
  const phoneTextScale = parseUnitless(vars["--login-phone-text-scale"], 1);
  const ipadTextSize = parseRem(vars["--login-ipad-text-size"], profile === "ipad-portrait" ? 1.16 : 1);
  const safePhoneTextScaleBase = clamp(phoneTextScaleBase, 0.6, 3);
  const phoneTextBoost = Math.max(0, ((phoneTextScale / safePhoneTextScaleBase) - 1) * 100);

  const safeLeftWidth = clamp(leftWidth, INSERT_WIDTH_MIN, INSERT_WIDTH_MAX);
  const safeRightWidth = clamp(rightWidth, INSERT_WIDTH_MIN, INSERT_WIDTH_MAX);
  const safeLeftHeight = clamp(leftHeight, INSERT_HEIGHT_MIN, INSERT_HEIGHT_MAX);
  const safeRightHeight = clamp(rightHeight, INSERT_HEIGHT_MIN, INSERT_HEIGHT_MAX);

  const safeLeftPageStart = clamp(leftLeft, PAGE_INSERT_X_MIN, PAGE_INSERT_X_MAX - safeLeftWidth * 2);
  const safeRightPageStart = clamp(rightLeft, PAGE_INSERT_X_MIN, PAGE_INSERT_X_MAX - safeRightWidth * 2);
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

    if (Math.abs(leftLeft - safeLeftPageStart) > 0.01) {
      nextValues["--login-left-left"] = toPercent(safeLeftPageStart);
    }
    if (Math.abs(rightLeft - safeRightPageStart) > 0.01) {
      nextValues["--login-right-left"] = toPercent(safeRightPageStart);
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
    safeLeftPageStart,
    safeLeftTop,
    safeLeftWidth,
    safeRightHeight,
    safeRightPageStart,
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
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Best effort only. Drag still works via window listeners.
    }
    const rect = stageRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    let activeWidth = rect.width;
    let activeHeight = rect.height;
    if (target === "left" || target === "left-size" || target === "right" || target === "right-size") {
      const page =
        target === "left" || target === "left-size"
          ? pageBounds.left
          : target === "right" || target === "right-size"
            ? pageBounds.right
            : null;
      if (page && page.width > 0 && page.height > 0) {
        activeWidth = (rect.width * page.width) / 100;
        activeHeight = (rect.height * page.height) / 100;
      } else {
        const bookWidth = (rect.width * previewBounds.width) / 100;
        const bookHeight = (rect.height * previewBounds.height) / 100;
        activeWidth = bookWidth > 0 ? bookWidth / 2 : rect.width / 2;
        activeHeight = bookHeight > 0 ? bookHeight : rect.height;
      }
    }
    if (!activeWidth || !activeHeight) return;

    setSelectedTarget(boxTargetForDragTarget(target));
    setDragState({
      target,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      stageWidth: activeWidth,
      stageHeight: activeHeight,
      leftX: safeLeftPageStart,
      leftY: safeLeftTop,
      leftW: safeLeftWidth,
      leftH: safeLeftHeight,
      rightX: safeRightPageStart,
      rightY: safeRightModeTop,
      rightModeY: safeRightModeTop,
      rightW: safeRightWidth,
      rightH: safeRightHeight,
      popupX: popupLeft,
      popupY: popupTop,
      popupW: popupWidth,
      popupH: popupHeight,
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
        const nextLeftStart = snapValue(
          clamp(activeDrag.leftX + deltaXPercent, PAGE_INSERT_X_MIN, PAGE_INSERT_X_MAX - activeDrag.leftW * 2),
          [10, 20, 30, 40, 50]
        );
        const nextTop = snapValue(
          clamp(activeDrag.leftY + deltaYPercent, INSERT_TOP_MIN, INSERT_TOP_MAX),
          [10, 20, 30, 40, 50, 60, 70]
        );
        setVarValues({
          "--login-left-left": toPercent(nextLeftStart),
          "--login-left-top": toPercent(nextTop),
        });
        return;
      }

      if (activeDrag.target === "left-size") {
        const leftStart = activeDrag.leftX;
        const maxWidth = maxLeftWidthForStart(leftStart);
        setVarValues({
          "--login-left-width": toPercent(clamp(activeDrag.leftW + deltaXPercent / 2, INSERT_WIDTH_MIN, maxWidth)),
          "--login-left-height": toPercent(clamp(activeDrag.leftH + deltaYPercent, INSERT_HEIGHT_MIN, INSERT_HEIGHT_MAX)),
        });
        return;
      }

      if (activeDrag.target === "right") {
        const newTop = snapValue(
          clamp(activeDrag.rightY + deltaYPercent, INSERT_TOP_MIN, INSERT_TOP_MAX),
          [10, 20, 30, 40, 50, 60, 70]
        );
        const nextRightStart = snapValue(
          clamp(activeDrag.rightX + deltaXPercent, PAGE_INSERT_X_MIN, PAGE_INSERT_X_MAX - activeDrag.rightW * 2),
          [10, 20, 30, 40, 50]
        );
        setVarValues({
          "--login-right-left": toPercent(nextRightStart),
          "--login-right-top": toPercent(newTop),
          "--login-right-mode-top": toPercent(newTop),
        });
        return;
      }

      if (activeDrag.target === "right-size") {
        const rightStart = activeDrag.rightX;
        const maxWidth = maxRightWidthForStart(rightStart);
        setVarValues({
          "--login-right-width": toPercent(clamp(activeDrag.rightW + deltaXPercent / 2, INSERT_WIDTH_MIN, maxWidth)),
          "--login-right-height": toPercent(clamp(activeDrag.rightH + deltaYPercent, INSERT_HEIGHT_MIN, INSERT_HEIGHT_MAX)),
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
        setVarValues({
          "--login-popup-width": toVw(clamp(activeDrag.popupW + deltaXPercent, 10, 120)),
          "--login-popup-height": toPercent(clamp(activeDrag.popupH + deltaYPercent, 5, 95)),
        });
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
        const leftStart = clamp(safeLeftPageStart + dx, PAGE_INSERT_X_MIN, PAGE_INSERT_X_MAX - safeLeftWidth * 2);
        const top = clamp(safeLeftTop + dy, INSERT_TOP_MIN, INSERT_TOP_MAX);
        setVarValues({
          "--login-left-left": toPercent(leftStart),
          "--login-left-top": toPercent(top),
        });
        return;
      }

      if (selectedTarget === "right") {
        const top = clamp(safeRightModeTop + dy, INSERT_TOP_MIN, INSERT_TOP_MAX);
        const rightStart = clamp(safeRightPageStart + dx, PAGE_INSERT_X_MIN, PAGE_INSERT_X_MAX - safeRightWidth * 2);
        setVarValues({
          "--login-right-left": toPercent(rightStart),
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
    safeLeftPageStart,
    safeLeftTop,
    safeLeftWidth,
    safeRightPageStart,
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

  const popupBoxStyle = {
    left: `${popupLeft}%`,
    top: `${popupTop}%`,
    width: `${popupWidth}%`,
    height: `${popupHeight}%`,
  };

  const leftBoxStageStyle = pageBounds.left
    ? {
        left: `${pageBounds.left.left + (pageBounds.left.width * safeLeftPageStart) / 100}%`,
        top: `${pageBounds.left.top + (pageBounds.left.height * safeLeftTop) / 100}%`,
        width: `${(pageBounds.left.width * (safeLeftWidth * 2)) / 100}%`,
        height: `${(pageBounds.left.height * safeLeftHeight) / 100}%`,
      }
    : {
        left: `${previewBounds.left + (previewBounds.width * (safeLeftPageStart / 2)) / 100}%`,
        top: `${previewBounds.top + (previewBounds.height * safeLeftTop) / 100}%`,
        width: `${(previewBounds.width * safeLeftWidth) / 100}%`,
        height: `${(previewBounds.height * safeLeftHeight) / 100}%`,
      };

  const rightBoxStageStyle = pageBounds.right
    ? {
        left: `${pageBounds.right.left + (pageBounds.right.width * safeRightPageStart) / 100}%`,
        top: `${pageBounds.right.top + (pageBounds.right.height * safeRightModeTop) / 100}%`,
        width: `${(pageBounds.right.width * (safeRightWidth * 2)) / 100}%`,
        height: `${(pageBounds.right.height * safeRightHeight) / 100}%`,
      }
    : {
        left: `${previewBounds.left + (previewBounds.width * (50 + safeRightPageStart / 2)) / 100}%`,
        top: `${previewBounds.top + (previewBounds.height * safeRightModeTop) / 100}%`,
        width: `${(previewBounds.width * safeRightWidth) / 100}%`,
        height: `${(previewBounds.height * safeRightHeight) / 100}%`,
      };

  const guideViewportLeft = 0;
  const guideViewportRight = 100;
  const guideSeamLeft = previewBounds.left + previewBounds.width * 0.5;
  const guideViewportTop = 0;
  const guideViewportBottom = 100;

  function rectToStageRect(elementRect: DOMRect, containerRect: DOMRect): StageRect {
    return {
      left: ((elementRect.left - containerRect.left) / containerRect.width) * 100,
      top: ((elementRect.top - containerRect.top) / containerRect.height) * 100,
      width: (elementRect.width / containerRect.width) * 100,
      height: (elementRect.height / containerRect.height) * 100,
    };
  }

  function rectDelta(a: StageRect | null, b: StageRect | null) {
    if (!a && !b) return 0;
    if (!a || !b) return Number.POSITIVE_INFINITY;
    return (
      Math.abs(a.left - b.left) +
      Math.abs(a.top - b.top) +
      Math.abs(a.width - b.width) +
      Math.abs(a.height - b.height)
    );
  }

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

    const leftPage = frameDocument.querySelector(".login-page-left") as HTMLElement | null;
    const rightPage = frameDocument.querySelector(".login-page-right") as HTMLElement | null;

    const nextPageBounds: PageBounds = { left: null, right: null };
    let nextBounds: PreviewBounds;

    if (leftPage && rightPage) {
      const leftRect = leftPage.getBoundingClientRect();
      const rightRect = rightPage.getBoundingClientRect();
      if (leftRect.width > 0 && leftRect.height > 0) {
        nextPageBounds.left = rectToStageRect(leftRect, heroRect);
      }
      if (rightRect.width > 0 && rightRect.height > 0) {
        nextPageBounds.right = rectToStageRect(rightRect, heroRect);
      }

      const unionLeft = Math.min(leftRect.left, rightRect.left);
      const unionTop = Math.min(leftRect.top, rightRect.top);
      const unionRight = Math.max(leftRect.right, rightRect.right);
      const unionBottom = Math.max(leftRect.bottom, rightRect.bottom);
      nextBounds = {
        left: clamp(((unionLeft - heroRect.left) / heroRect.width) * 100, -250, 250),
        top: clamp(((unionTop - heroRect.top) / heroRect.height) * 100, 0, 100),
        width: clamp(((unionRight - unionLeft) / heroRect.width) * 100, 20, 400),
        height: clamp(((unionBottom - unionTop) / heroRect.height) * 100, 20, 100),
      };
    } else {
      nextBounds = {
        // Fallback when pages are not available yet.
        left: clamp(((bookRect.left - heroRect.left) / heroRect.width) * 100, -250, 250),
        top: clamp(((bookRect.top - heroRect.top) / heroRect.height) * 100, 0, 100),
        width: clamp((bookRect.width / heroRect.width) * 100, 20, 400),
        height: clamp((bookRect.height / heroRect.height) * 100, 20, 100),
      };
    }

    setPreviewBounds((current) => {
      const delta =
        Math.abs(current.left - nextBounds.left) +
        Math.abs(current.top - nextBounds.top) +
        Math.abs(current.width - nextBounds.width) +
        Math.abs(current.height - nextBounds.height);
      if (delta < 0.15) return current;
      return nextBounds;
    });

    setPageBounds((current) => {
      const leftDelta = rectDelta(current.left, nextPageBounds.left);
      const rightDelta = rectDelta(current.right, nextPageBounds.right);
      if (leftDelta < 0.15 && rightDelta < 0.15) return current;
      return nextPageBounds;
    });
  }

  const leftLabel = `Left edge ${(safeLeftPageStart / 2).toFixed(1)}%, ${safeLeftTop.toFixed(1)}%`;
  const rightLabel = `Right edge ${(50 + safeRightPageStart / 2).toFixed(1)}%, ${safeRightModeTop.toFixed(1)}%`;
  const popupLabel = `Popup ${popupLeft.toFixed(1)}%, ${popupTop.toFixed(1)}%`;

  function postPreviewVars() {
    const target = previewFrameRef.current?.contentWindow;
    const frameDoc = previewFrameRef.current?.contentDocument;

    if (frameDoc) {
      const hero = frameDoc.querySelector(".login-hero") as HTMLElement | null;
      if (hero) {
        for (const key of appliedPreviewVarKeysRef.current) {
          if (!(key in vars)) {
            hero.style.removeProperty(key);
          }
        }
        for (const [key, value] of Object.entries(vars)) {
          hero.style.setProperty(key, value);
        }
        appliedPreviewVarKeysRef.current = Object.keys(vars);
      }
    }

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
    if (dragState) return;
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

    timer = window.setInterval(runMeasure, 500);
    frame.addEventListener("load", onFrameLoad);
    runMeasure();

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      frame.removeEventListener("load", onFrameLoad);
      frame.contentWindow?.removeEventListener("resize", runMeasure);
      if (timer !== null) window.clearInterval(timer);
    };
  }, [dragState, profile, reloadToken]);

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

        <div className="bookcase-editor-label">
          <span>Preview Auth Mode</span>
          <select
            value={previewAuthMode}
            onChange={(event) => setPreviewAuthMode(event.target.value as PreviewAuthMode)}
            disabled={loading || saving}
          >
            <option value="signup">Sign up (default /login)</option>
            <option value="signin">Sign in (/login?mode=login)</option>
            <option value="reset">Reset (/login?mode=reset)</option>
          </select>
        </div>

        {isPhoneProfile ? (
          <>
            <label className="bookcase-editor-label">
              <span>Background Width (%)</span>
              <input
                type="range"
                min={60}
                max={280}
                value={Math.round(bgSizeX)}
                onChange={(event) =>
                  setVarValues({
                    "--login-bg-size-x": `${event.target.value}%`,
                    "--login-bg-size": `${event.target.value}%`,
                  })
                }
                disabled={loading || saving}
              />
            </label>

            <label className="bookcase-editor-label">
              <span>Background Height (%)</span>
              <input
                type="range"
                min={60}
                max={220}
                value={Math.round(bgSizeY)}
                onChange={(event) => setVarValue("--login-bg-size-y", `${event.target.value}%`)}
                disabled={loading || saving}
              />
            </label>
          </>
        ) : (
          <label className="bookcase-editor-label">
            <span>Background Zoom (%)</span>
            <input
              type="range"
              min={80}
              max={220}
              value={Math.round(bgSizeX)}
              onChange={(event) =>
                setVarValues({
                  "--login-bg-size": `${event.target.value}%`,
                  "--login-bg-size-x": `${event.target.value}%`,
                })
              }
              disabled={loading || saving}
            />
          </label>
        )}

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
          <label className="bookcase-editor-label">
            <span>Phone Text Boost (%)</span>
            <input
              type="range"
              min={0}
              max={200}
              step={1}
              value={Math.round(phoneTextBoost)}
              onChange={(event) => {
                const boost = Number(event.target.value);
                const nextScale = clamp(safePhoneTextScaleBase * (1 + boost / 100), 0.6, 3);
                setVarValue("--login-phone-text-scale", nextScale.toFixed(2));
              }}
              disabled={loading || saving}
            />
          </label>
        )}

        {isIpadProfile && (
          <label className="bookcase-editor-label">
            <span>iPad Text Size (rem)</span>
            <input
              type="range"
              min={0.7}
              max={2.4}
              step={0.02}
              value={ipadTextSize}
              onChange={(event) => setVarValue("--login-ipad-text-size", `${Number(event.target.value).toFixed(2)}rem`)}
              disabled={loading || saving}
            />
          </label>
        )}

        {isDesktopProfile && (
          <label className="bookcase-editor-label">
            <span>Desktop Text Scale</span>
            <input
              type="range"
              min={0.6}
              max={4}
              step={0.05}
              value={desktopTextScale}
              onChange={(event) => setVarValue("--login-desktop-text-scale", Number(event.target.value).toFixed(2))}
              disabled={loading || saving}
            />
          </label>
        )}

        {(isPhoneProfile || isIpadProfile) && (
          <>
            <label className="bookcase-editor-label">
              <span>Left Insert Width (%)</span>
              <input
                type="range"
                min={INSERT_WIDTH_MIN}
                max={INSERT_WIDTH_MAX}
                value={Math.round(leftWidth)}
                onChange={(event) => {
                  const candidate = Number(event.target.value);
                  const maxWidth = maxLeftWidthForStart(safeLeftPageStart);
                  setVarValue("--login-left-width", `${clamp(candidate, INSERT_WIDTH_MIN, maxWidth).toFixed(2)}%`);
                }}
                disabled={loading || saving}
              />
            </label>

            <label className="bookcase-editor-label">
              <span>Left Insert Height (%)</span>
              <input
                type="range"
                min={INSERT_HEIGHT_MIN}
                max={INSERT_HEIGHT_MAX}
                value={Math.round(leftHeight)}
                onChange={(event) => setVarValue("--login-left-height", `${event.target.value}%`)}
                disabled={loading || saving}
              />
            </label>

            <label className="bookcase-editor-label">
              <span>Right Insert Width (%)</span>
              <input
                type="range"
                min={INSERT_WIDTH_MIN}
                max={INSERT_WIDTH_MAX}
                value={Math.round(rightWidth)}
                onChange={(event) => {
                  const candidate = Number(event.target.value);
                  const maxWidth = maxRightWidthForStart(safeRightPageStart);
                  setVarValue("--login-right-width", `${clamp(candidate, INSERT_WIDTH_MIN, maxWidth).toFixed(2)}%`);
                }}
                disabled={loading || saving}
              />
            </label>

            <label className="bookcase-editor-label">
              <span>Right Insert Height (%)</span>
              <input
                type="range"
                min={INSERT_HEIGHT_MIN}
                max={INSERT_HEIGHT_MAX}
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
          <a
            href={`/login?previewProfile=${profile}${loginModeQuery(previewAuthMode)}`}
            target="_blank"
            rel="noreferrer"
          >
            Open Login Tab
          </a>
          <a href={`/login?previewProfile=${profile}`} target="_blank" rel="noreferrer">
            Open Sign-up Tab
          </a>
          <a href={`/login?previewProfile=${profile}&mode=login`} target="_blank" rel="noreferrer">
            Open Sign-in Tab
          </a>
          <a href={`/login?previewProfile=${profile}&mode=reset`} target="_blank" rel="noreferrer">
            Open Reset Tab
          </a>
          <a href={`/login?previewProfile=${profile}&editLayout=1`} target="_blank" rel="noreferrer">
            Open Direct Edit
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
          className={`device-layout-stage ${dragState ? "is-dragging" : ""}`}
          style={{
            aspectRatio: `${stageSize.width} / ${stageSize.height}`,
          }}
        >
          <iframe
            ref={previewFrameRef}
            src={previewSrc}
            title={`${DEVICE_PROFILE_LABELS[profile]} Preview`}
            className="device-layout-stage-frame"
            style={desktopFrameStyle}
            onLoad={postPreviewVars}
          />
          <div className={`device-layout-guides ${showGuides ? "" : "device-layout-guides-hidden"}`} aria-hidden="true">
            <span className="device-layout-guide device-layout-guide-book-edge" style={{ left: `${guideViewportLeft}%` }} />
            <span className="device-layout-guide device-layout-guide-book-edge" style={{ left: `${guideViewportRight}%` }} />
            <span className="device-layout-guide device-layout-guide-seam" style={{ left: `${guideSeamLeft}%` }} />
            <span
              className="device-layout-guide-horizontal device-layout-guide-book-edge"
              style={{ top: `${guideViewportTop}%`, left: `${guideViewportLeft}%`, width: "100%" }}
            />
            <span
              className="device-layout-guide-horizontal device-layout-guide-book-edge"
              style={{ top: `${guideViewportBottom}%`, left: `${guideViewportLeft}%`, width: "100%" }}
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

          {(
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
