"use client";

import { useEffect, useMemo, useState } from "react";
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

function labelForVar(key: string) {
  return key
    .replace(/^--login-/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function DeviceLayoutEditor() {
  const [profile, setProfile] = useState<DeviceProfileKey>("iphone-portrait");
  const [vars, setVars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

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

  const keys = useMemo(() => Object.keys(vars).sort((a, b) => a.localeCompare(b)), [vars]);

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

  return (
    <section className="bookcase-admin-card device-layout-editor">
      <h1>Device Layout Setup</h1>
      <p>Adjust login layout values for iPhone/iPad profiles. Save, then refresh `/login` on the target device.</p>

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

      <div className="bookcase-editor-actions">
        <button type="button" onClick={() => void saveLayout()} disabled={loading || saving}>
          {saving ? "Saving..." : "Save Device Layout"}
        </button>
        <a href="/login?mode=login" target="_blank" rel="noreferrer">
          Open Login Preview
        </a>
      </div>

      {status && <p className="bookcase-editor-hint">{status}</p>}
    </section>
  );
}
