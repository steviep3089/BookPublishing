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

type DragTarget = "left" | "right" | "popup" | "popup-size";

type DragState = {
  target: DragTarget;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  stageWidth: number;
  stageHeight: number;
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
  rightModeY: number;
  popupX: number;
  popupY: number;
  popupW: number;
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

function stageSizeForProfile(profile: DeviceProfileKey) {
  switch (profile) {
    case "iphone-portrait":
      return { width: 390, height: 844 };
    case "iphone-landscape":
      return { width: 844, height: 390 };
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
  const stageRef = useRef<HTMLDivElement | null>(null);

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
  }, [profile]);

  const isPhoneProfile = profile === "iphone-portrait" || profile === "iphone-landscape";
  const stageSize = stageSizeForProfile(profile);
  const keys = useMemo(() => Object.keys(vars).sort((a, b) => a.localeCompare(b)), [vars]);

  const leftLeft = parsePercent(vars["--login-left-left"], isPhoneProfile ? 31 : 24);
  const leftTop = parsePercent(vars["--login-left-top"], isPhoneProfile ? 43 : 36);
  const rightLeft = parsePercent(vars["--login-right-left"], isPhoneProfile ? 10 : 10);
  const rightTop = parsePercent(vars["--login-right-top"], isPhoneProfile ? 40 : 34);
  const rightModeTop = parsePercent(vars["--login-right-mode-top"], isPhoneProfile ? 37 : 30);
  const popupLeft = parsePercent(vars["--login-popup-left"], 70);
  const popupTop = parsePercent(vars["--login-popup-top"], 63);
  const popupWidth = parseVw(vars["--login-popup-width"], 82);
  const bgSize = parsePercent(vars["--login-bg-size"], isPhoneProfile ? 180 : 100);
  const bgPosY = parsePercent(vars["--login-bg-pos-y"], 2);

  function setVarValue(key: string, value: string) {
    setVars((current) => ({ ...current, [key]: value }));
  }

  function startDrag(event: React.PointerEvent, target: DragTarget) {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    setDragState({
      target,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      stageWidth: rect.width,
      stageHeight: rect.height,
      leftX: leftLeft,
      leftY: leftTop,
      rightX: rightLeft,
      rightY: rightTop,
      rightModeY: rightModeTop,
      popupX: popupLeft,
      popupY: popupTop,
      popupW: popupWidth,
    });
  }

  useEffect(() => {
    if (!dragState) return;
    const activeDrag = dragState;

    function onPointerMove(event: PointerEvent) {
      if (event.pointerId !== activeDrag.pointerId) return;
      const deltaXPercent = ((event.clientX - activeDrag.startClientX) / activeDrag.stageWidth) * 100;
      const deltaYPercent = ((event.clientY - activeDrag.startClientY) / activeDrag.stageHeight) * 100;

      if (activeDrag.target === "left") {
        setVarValue("--login-left-left", toPercent(clamp(activeDrag.leftX + deltaXPercent * 2, 0, 60)));
        setVarValue("--login-left-top", toPercent(clamp(activeDrag.leftY + deltaYPercent, 10, 80)));
        return;
      }

      if (activeDrag.target === "right") {
        const newTop = clamp(activeDrag.rightY + deltaYPercent, 10, 80);
        const topDelta = newTop - activeDrag.rightY;
        setVarValue("--login-right-left", toPercent(clamp(activeDrag.rightX + deltaXPercent * 2, 0, 60)));
        setVarValue("--login-right-top", toPercent(newTop));
        setVarValue("--login-right-mode-top", toPercent(clamp(activeDrag.rightModeY + topDelta, 10, 80)));
        return;
      }

      if (activeDrag.target === "popup") {
        setVarValue("--login-popup-left", toPercent(clamp(activeDrag.popupX + deltaXPercent, 18, 92)));
        setVarValue("--login-popup-top", toPercent(clamp(activeDrag.popupY + deltaYPercent, 14, 92)));
        return;
      }

      if (activeDrag.target === "popup-size") {
        setVarValue("--login-popup-width", toVw(clamp(activeDrag.popupW + deltaXPercent, 20, 96)));
      }
    }

    function onPointerUp(event: PointerEvent) {
      if (event.pointerId !== activeDrag.pointerId) return;
      setDragState(null);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragState]);

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

  const leftBoxStyle = {
    left: `${leftLeft / 2}%`,
    top: `${leftTop}%`,
    width: "24%",
    height: "20%",
  };

  const rightBoxStyle = {
    left: `${50 + rightLeft / 2}%`,
    top: `${rightTop}%`,
    width: "26%",
    height: "18%",
  };

  const popupBoxStyle = {
    left: `${popupLeft}%`,
    top: `${popupTop}%`,
    width: `${popupWidth}%`,
    height: "24%",
  };

  return (
    <section className="device-layout-shell">
      <div className="bookcase-admin-card device-layout-editor">
        <h1>Device Layout Setup</h1>
        <p>Use the live preview on the right. Drag text/panel boxes and resize popup width from the handle.</p>

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
          <a href={`/login?mode=login&previewProfile=${profile}`} target="_blank" rel="noreferrer">
            Open Login Tab
          </a>
        </div>

        {status && <p className="bookcase-editor-hint">{status}</p>}
      </div>

      <div className="bookcase-admin-card device-layout-preview device-layout-preview-live">
        <h2>{DEVICE_PROFILE_LABELS[profile]} Live Preview</h2>
        <div
          ref={stageRef}
          className="device-layout-stage"
          style={{
            aspectRatio: `${stageSize.width} / ${stageSize.height}`,
            backgroundSize: `${bgSize}% auto`,
            backgroundPosition: `center ${bgPosY}%`,
          }}
        >
          <button
            type="button"
            className="device-drag-box device-drag-left"
            style={leftBoxStyle}
            onPointerDown={(event) => startDrag(event, "left")}
          >
            Left Page Text
          </button>
          <button
            type="button"
            className="device-drag-box device-drag-right"
            style={rightBoxStyle}
            onPointerDown={(event) => startDrag(event, "right")}
          >
            Right Page Panel
          </button>

          {isPhoneProfile && (
            <button
              type="button"
              className="device-drag-box device-drag-popup"
              style={popupBoxStyle}
              onPointerDown={(event) => startDrag(event, "popup")}
            >
              Popup Form
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
