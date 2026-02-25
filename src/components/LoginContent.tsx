"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Caveat } from "next/font/google";
import { supabaseBrowser } from "@/lib/supabase/browser";
import {
  DEVICE_PROFILE_KEYS,
  DEVICE_PROFILE_LABELS,
  isDeviceProfileKey,
  type DeviceProfileKey,
} from "@/lib/login/deviceLayout";

type AuthView = "signin" | "signup";
type LayoutEditTarget = "left" | "left-size" | "right" | "right-size" | "popup" | "popup-size";

type LayoutDragState = {
  target: LayoutEditTarget;
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

type DeviceLayoutApiResult = {
  profile?: string;
  vars?: Record<string, string>;
  error?: string;
};

type SetupModeKey = "signup" | "signin" | "reset";

type SetupStep = {
  profile: DeviceProfileKey;
  mode: SetupModeKey;
};

type PhoneProfileKey = Extract<
  DeviceProfileKey,
  "iphone-portrait" | "iphone-portrait-max" | "iphone-landscape" | "iphone-landscape-max"
>;

type RectFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type LayoutPageBounds = {
  left: RectFrame | null;
  right: RectFrame | null;
};

const caveat = Caveat({ subsets: ["latin"], weight: ["400", "600"] });

const JOIN_LEFT_TEXT =
  "Hello and welcome to my Reading Club. Create your account and then step into this story world with me.";
const LOGIN_LEFT_TEXT =
  "This is my story world. A place where I share the stories I've written and the wonderful stories I've discovered on my own reading journey.";
const SIGNIN_INTRO_TEXT = "Sign in with your email and password to open the bookcase.";
const SIGNUP_INTRO_TEXT = "Create an account with a username, email, and password.";
const RESET_INTRO_TEXT = "Set a new password for your account.";

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

const QUICK_SETUP_STEPS: SetupStep[] = [
  { profile: "iphone-portrait", mode: "signup" },
  { profile: "iphone-portrait", mode: "signin" },
  { profile: "iphone-portrait", mode: "reset" },
  { profile: "iphone-portrait-max", mode: "signup" },
  { profile: "iphone-portrait-max", mode: "signin" },
  { profile: "iphone-portrait-max", mode: "reset" },
  { profile: "iphone-landscape", mode: "signup" },
  { profile: "iphone-landscape", mode: "signin" },
  { profile: "iphone-landscape", mode: "reset" },
  { profile: "iphone-landscape-max", mode: "signup" },
  { profile: "iphone-landscape-max", mode: "signin" },
  { profile: "iphone-landscape-max", mode: "reset" },
];

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

function parsePx(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const match = value.match(/^(-?\d+(?:\.\d+)?)px$/);
  if (!match) return fallback;
  const numeric = Number.parseFloat(match[1]);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
}

function parseDvh(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const match = value.match(/^(-?\d+(?:\.\d+)?)dvh$/);
  if (!match) return fallback;
  const numeric = Number.parseFloat(match[1]);
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

function maxLeftWidthForStart(start: number) {
  return Math.max(INSERT_WIDTH_MIN, Math.min(INSERT_WIDTH_MAX, (PAGE_INSERT_X_MAX - start) / 2));
}

function maxRightWidthForStart(start: number) {
  return Math.max(INSERT_WIDTH_MIN, Math.min(INSERT_WIDTH_MAX, (PAGE_INSERT_X_MAX - start) / 2));
}

function rectToFrame(elementRect: DOMRect, containerRect: DOMRect): RectFrame {
  return {
    left: ((elementRect.left - containerRect.left) / containerRect.width) * 100,
    top: ((elementRect.top - containerRect.top) / containerRect.height) * 100,
    width: (elementRect.width / containerRect.width) * 100,
    height: (elementRect.height / containerRect.height) * 100,
  };
}

function frameDelta(a: RectFrame | null, b: RectFrame | null) {
  if (!a && !b) return 0;
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return (
    Math.abs(a.left - b.left) +
    Math.abs(a.top - b.top) +
    Math.abs(a.width - b.width) +
    Math.abs(a.height - b.height)
  );
}

function areVarsEqual(a: Record<string, string>, b: Record<string, string>) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

function setupModeFromQuery(mode: string | null): SetupModeKey {
  if (mode === "login") return "signin";
  if (mode === "reset") return "reset";
  return "signup";
}

function setupModeToQuery(mode: SetupModeKey) {
  if (mode === "signin") return "login";
  if (mode === "reset") return "reset";
  return null;
}

function setupModeLabel(mode: SetupModeKey) {
  if (mode === "signin") return "Sign in";
  if (mode === "reset") return "Reset";
  return "Sign up";
}

function isPhonePortraitProfile(profile: DeviceProfileKey | null): profile is PhoneProfileKey {
  return !!profile && profile.startsWith("iphone-portrait");
}

function isPhoneLandscapeProfile(profile: DeviceProfileKey | null): profile is PhoneProfileKey {
  return !!profile && profile.startsWith("iphone-landscape");
}

function isPhoneProfile(profile: DeviceProfileKey | null): profile is PhoneProfileKey {
  return isPhonePortraitProfile(profile) || isPhoneLandscapeProfile(profile);
}

function localLayoutStorageKey(profile: DeviceProfileKey) {
  return `reading-club:local-device-layout:${profile}`;
}

function readLocalLayoutVars(profile: DeviceProfileKey) {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(localLayoutStorageKey(profile));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string") {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function writeLocalLayoutVars(profile: DeviceProfileKey, vars: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(localLayoutStorageKey(profile), JSON.stringify(vars));
  } catch {}
}

function clearLocalLayoutVars(profile: DeviceProfileKey) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(localLayoutStorageKey(profile));
  } catch {}
}

export default function LoginContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const isPreviewMode = searchParams.get("previewMode") === "1";
  const isLayoutEditMode = searchParams.get("editLayout") === "1";
  const previewProfile = searchParams.get("previewProfile");
  const isResetMode = mode === "reset";
  const authError = searchParams.get("authError");
  const [authView, setAuthView] = useState<AuthView>(mode === "login" ? "signin" : "signup");
  const effectiveAuthView: AuthView = mode === "login" ? "signin" : authView;

  const leftText = isResetMode || effectiveAuthView === "signin" ? LOGIN_LEFT_TEXT : JOIN_LEFT_TEXT;
  const rightIntroText = useMemo(() => {
    if (isResetMode) return RESET_INTRO_TEXT;
    return effectiveAuthView === "signin" ? SIGNIN_INTRO_TEXT : SIGNUP_INTRO_TEXT;
  }, [effectiveAuthView, isResetMode]);

  const [signUpUsername, setSignUpUsername] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfileKey | null>(null);
  const [deviceVars, setDeviceVars] = useState<Record<string, string>>({});
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});
  const [layoutVars, setLayoutVars] = useState<Record<string, string>>({});
  const [layoutVarsProfile, setLayoutVarsProfile] = useState<DeviceProfileKey | null>(null);
  const [layoutDirty, setLayoutDirty] = useState(false);
  const [layoutSaving, setLayoutSaving] = useState(false);
  const [layoutStatus, setLayoutStatus] = useState<string | null>(null);
  const [layoutLocalOnly, setLayoutLocalOnly] = useState(false);
  const [showAdminAuthPrompt, setShowAdminAuthPrompt] = useState(false);
  const [adminAuthEmail, setAdminAuthEmail] = useState("");
  const [adminAuthPassword, setAdminAuthPassword] = useState("");
  const [adminAuthBusy, setAdminAuthBusy] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [layoutDragState, setLayoutDragState] = useState<LayoutDragState | null>(null);
  const [selectedLayoutBox, setSelectedLayoutBox] = useState<"left" | "right" | "popup">("left");
  const [showLayoutPanel, setShowLayoutPanel] = useState(true);
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [showResetPopup, setShowResetPopup] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [bookFrame, setBookFrame] = useState<RectFrame>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const [layoutPageBounds, setLayoutPageBounds] = useState<LayoutPageBounds>({
    left: null,
    right: null,
  });
  const heroRef = useRef<HTMLElement | null>(null);
  const bookRef = useRef<HTMLElement | null>(null);
  const forcedDeviceProfile: DeviceProfileKey | null = isDeviceProfileKey(previewProfile || "")
    ? (previewProfile as DeviceProfileKey)
    : null;
  const isPhoneLayout = isPhoneProfile(deviceProfile);
  const isIpadLayout = !!deviceProfile && deviceProfile.startsWith("ipad-");

  const resolvedVars = useMemo(() => {
    const merged = { ...deviceVars, ...previewVars };
    if (isLayoutEditMode) {
      return { ...merged, ...layoutVars };
    }
    return merged;
  }, [deviceVars, isLayoutEditMode, layoutVars, previewVars]);

  const runtimeStyle = useMemo<CSSProperties | undefined>(() => {
    if (!deviceProfile) return undefined;
    const styleVars: Record<string, string> = {};
    for (const [key, value] of Object.entries(resolvedVars)) {
      styleVars[key] = value;
    }
    return styleVars as CSSProperties;
  }, [deviceProfile, resolvedVars]);

  useEffect(() => {
    const phonePortraitQuery = window.matchMedia("(max-width: 680px) and (orientation: portrait)");
    const phoneLandscapeQuery = window.matchMedia("(max-height: 500px) and (orientation: landscape)");
    const ipadPortraitQuery = window.matchMedia("(max-width: 1024px) and (orientation: portrait)");
    const ipadLandscapeQuery = window.matchMedia("(max-width: 1366px) and (orientation: landscape)");
    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const isLikelyIpad =
      /iPad/i.test(ua) || ((/Macintosh|MacIntel/i.test(ua) || /MacIntel/i.test(platform)) && navigator.maxTouchPoints > 1);

    function addMediaChangeListener(query: MediaQueryList, listener: () => void) {
      if (typeof query.addEventListener === "function") {
        query.addEventListener("change", listener);
        return () => query.removeEventListener("change", listener);
      }
      query.addListener(listener);
      return () => query.removeListener(listener);
    }

    const syncLayout = () => {
      if (forcedDeviceProfile) {
        setDeviceProfile(forcedDeviceProfile);
        return;
      }

      let nextProfile: DeviceProfileKey = "desktop";
      if (phonePortraitQuery.matches) {
        const portraitWidth = Math.max(window.innerWidth || 0, Math.round(window.visualViewport?.width || 0));
        nextProfile = portraitWidth >= 420 ? "iphone-portrait-max" : "iphone-portrait";
      } else if (phoneLandscapeQuery.matches) {
        const landscapeHeight = Math.max(window.innerHeight || 0, Math.round(window.visualViewport?.height || 0));
        nextProfile = landscapeHeight >= 410 ? "iphone-landscape-max" : "iphone-landscape";
      } else if (isLikelyIpad && ipadPortraitQuery.matches) {
        nextProfile = "ipad-portrait";
      } else if (isLikelyIpad && ipadLandscapeQuery.matches) {
        nextProfile = "ipad-landscape";
      }

      setDeviceProfile(nextProfile);
    };

    syncLayout();
    if (!forcedDeviceProfile) {
      const removePhonePortrait = addMediaChangeListener(phonePortraitQuery, syncLayout);
      const removePhoneLandscape = addMediaChangeListener(phoneLandscapeQuery, syncLayout);
      const removeIpadPortrait = addMediaChangeListener(ipadPortraitQuery, syncLayout);
      const removeIpadLandscape = addMediaChangeListener(ipadLandscapeQuery, syncLayout);
      window.addEventListener("resize", syncLayout);
      window.addEventListener("orientationchange", syncLayout);
      return () => {
        removePhonePortrait();
        removePhoneLandscape();
        removeIpadPortrait();
        removeIpadLandscape();
        window.removeEventListener("resize", syncLayout);
        window.removeEventListener("orientationchange", syncLayout);
      };
    }
    return undefined;
  }, [forcedDeviceProfile]);

  useEffect(() => {
    if (!deviceProfile) {
      setDeviceVars({});
      return;
    }

    let cancelled = false;

    async function loadDeviceLayout() {
      try {
        const response = await fetch(`/api/device-layout?profile=${deviceProfile}&ts=${Date.now()}`, {
          cache: "no-store",
        });

        const payload = (await response.json()) as {
          profile?: string;
          vars?: Record<string, string>;
        };

        if (!response.ok || !isDeviceProfileKey(payload.profile || "")) {
          return;
        }

        if (!cancelled && payload.vars && typeof payload.vars === "object") {
          setDeviceVars(payload.vars);
        }
      } catch {}
    }

    void loadDeviceLayout();
    return () => {
      cancelled = true;
    };
  }, [deviceProfile]);

  useEffect(() => {
    if (!forcedDeviceProfile) return;

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      const payload = data as Record<string, unknown>;
      if (payload.type !== "device-layout-preview-vars") return;
      if (payload.profile !== forcedDeviceProfile) return;
      const varsRaw = payload.vars;
      if (!varsRaw || typeof varsRaw !== "object") return;
      setPreviewVars(varsRaw as Record<string, string>);
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [forcedDeviceProfile]);

  useEffect(() => {
    if (!isLayoutEditMode || !deviceProfile) {
      setLayoutVars((current) => (Object.keys(current).length ? {} : current));
      setLayoutVarsProfile((current) => (current === null ? current : null));
      setLayoutDirty(false);
      setLayoutStatus(null);
      setLayoutLocalOnly(false);
      setShowAdminAuthPrompt(false);
      setAdminAuthError(null);
      return;
    }

    const localOverrides = readLocalLayoutVars(deviceProfile);
    const sourceVars = { ...deviceVars, ...previewVars, ...localOverrides };
    if (layoutVarsProfile !== deviceProfile) {
      setLayoutVars((current) => (areVarsEqual(current, sourceVars) ? current : sourceVars));
      setLayoutVarsProfile(deviceProfile);
      setLayoutDirty(false);
      setLayoutLocalOnly(false);
      setLayoutStatus(
        Object.keys(localOverrides).length > 0 ? "Layout edit mode active (local draft loaded)." : "Layout edit mode active."
      );
      return;
    }

    if (!layoutDirty) {
      setLayoutVars((current) => (areVarsEqual(current, sourceVars) ? current : sourceVars));
    }
  }, [
    deviceProfile,
    deviceVars,
    isLayoutEditMode,
    layoutDirty,
    layoutVarsProfile,
    previewVars,
  ]);

  useEffect(() => {
    if (isLayoutEditMode) {
      setShowPhoneForm(true);
      return;
    }
    setShowPhoneForm(false);
  }, [isLayoutEditMode]);

  useEffect(() => {
    if (!isResetMode) {
      setShowResetPopup(false);
      return;
    }
    setShowResetPopup(isLayoutEditMode);
  }, [isLayoutEditMode, isResetMode]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!deviceProfile) return;
    let raf = 0;
    let timer: number | null = null;

    const measure = () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const rect = bookRef.current?.getBoundingClientRect();
        if (!rect?.width || !rect.height) return;
        const nextFrame: RectFrame = {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        };
        setBookFrame((current) => {
          const delta =
            Math.abs(current.left - nextFrame.left) +
            Math.abs(current.top - nextFrame.top) +
            Math.abs(current.width - nextFrame.width) +
            Math.abs(current.height - nextFrame.height);
          if (delta < 0.5) return current;
          return nextFrame;
        });
      });
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    window.addEventListener("scroll", measure, { passive: true });
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);
    timer = window.setInterval(measure, 350);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.removeEventListener("scroll", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
      if (timer !== null) window.clearInterval(timer);
    };
  }, [deviceProfile]);

  useEffect(() => {
    const layoutEditingActive = isLayoutEditMode && !!deviceProfile;
    if (!layoutEditingActive) {
      setLayoutPageBounds((current) => {
        if (!current.left && !current.right) return current;
        return { left: null, right: null };
      });
      return;
    }

    let raf = 0;
    let timer: number | null = null;

    const measure = () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const bookEl = bookRef.current;
        if (!bookEl) return;
        const bookRect = bookEl.getBoundingClientRect();
        if (!bookRect.width || !bookRect.height) return;

        const leftPage = bookEl.querySelector(".login-page-left") as HTMLElement | null;
        const rightPage = bookEl.querySelector(".login-page-right") as HTMLElement | null;

        const next: LayoutPageBounds = { left: null, right: null };
        if (leftPage) {
          const leftRect = leftPage.getBoundingClientRect();
          if (leftRect.width > 0 && leftRect.height > 0) {
            next.left = rectToFrame(leftRect, bookRect);
          }
        }
        if (rightPage) {
          const rightRect = rightPage.getBoundingClientRect();
          if (rightRect.width > 0 && rightRect.height > 0) {
            next.right = rectToFrame(rightRect, bookRect);
          }
        }

        setLayoutPageBounds((current) => {
          if (frameDelta(current.left, next.left) < 0.15 && frameDelta(current.right, next.right) < 0.15) {
            return current;
          }
          return next;
        });
      });
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    window.visualViewport?.addEventListener("resize", measure);
    timer = window.setInterval(measure, 350);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      if (timer !== null) window.clearInterval(timer);
    };
  }, [deviceProfile, isLayoutEditMode]);

  function resetFeedback() {
    setErr(null);
    setNotice(null);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    resetFeedback();
    const email = signInEmail.trim();
    if (!email || !signInPassword) {
      setErr("Please add your email and password.");
      return;
    }

    const supabase = supabaseBrowser();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: signInPassword });
    if (error) {
      setErr(error.message);
    } else {
      router.push("/bookcase");
    }
    setBusy(false);
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    resetFeedback();

    const username = signUpUsername.trim();
    const email = signUpEmail.trim();
    if (!username || !email || !signUpPassword || !signUpConfirmPassword) {
      setErr("Please complete username, email, password, and confirm password.");
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setErr("Passwords do not match.");
      return;
    }
    if (signUpPassword.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }

    const supabase = supabaseBrowser();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: signUpPassword,
      options: {
        data: {
          username,
          display_name: username,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login?mode=login`,
      },
    });

    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }

    if (data.session) {
      router.push("/bookcase");
      setBusy(false);
      return;
    }

    setNotice("Account created. Check your email to confirm, then sign in.");
    setAuthView("signin");
    setSignInEmail(email);
    setBusy(false);
  }

  async function handleForgotPassword() {
    resetFeedback();
    const email = (signInEmail || signUpEmail).trim();
    if (!email) {
      setErr("Add your email first, then click Forgot password.");
      return;
    }

    const supabase = supabaseBrowser();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login?mode=reset`,
    });

    if (error) {
      setErr(error.message);
    } else {
      setNotice("Password reset email sent. Use the newest email link.");
    }
    setBusy(false);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    resetFeedback();

    if (!resetPassword || !resetConfirmPassword) {
      setErr("Please enter and confirm your new password.");
      return;
    }
    if (resetPassword !== resetConfirmPassword) {
      setErr("Passwords do not match.");
      return;
    }
    if (resetPassword.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }

    const supabase = supabaseBrowser();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: resetPassword });

    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }

    setNotice("Password updated. Please sign in.");
    setBusy(false);
    window.setTimeout(() => router.replace("/login?mode=login"), 900);
  }

  const leftLeft = parsePercent(resolvedVars["--login-left-left"], isPhoneLayout ? 31 : 24);
  const leftTop = parsePercent(resolvedVars["--login-left-top"], isPhoneLayout ? 43 : 36);
  const rightLeft = parsePercent(resolvedVars["--login-right-left"], isPhoneLayout ? 10 : 10);
  const rightTop = parsePercent(resolvedVars["--login-right-top"], isPhoneLayout ? 40 : 34);
  const rightModeTop = parsePercent(resolvedVars["--login-right-mode-top"], isPhoneLayout ? 37 : 30);
  const leftWidth = parsePercent(resolvedVars["--login-left-width"], 24);
  const leftHeight = parsePercent(resolvedVars["--login-left-height"], 20);
  const rightWidth = parsePercent(resolvedVars["--login-right-width"], 26);
  const rightHeight = parsePercent(resolvedVars["--login-right-height"], 18);
  const popupLeft = parsePercent(resolvedVars["--login-popup-left"], 70);
  const popupTop = parsePercent(resolvedVars["--login-popup-top"], 63);
  const popupWidth = parseVw(resolvedVars["--login-popup-width"], 82);
  const popupHeight = parsePercent(
    resolvedVars["--login-popup-height"],
    isPhoneLayout ? (isPhoneLandscapeProfile(deviceProfile) ? 16 : 18) : 24
  );
  const popupMaxWidthPx = parsePx(
    resolvedVars["--login-popup-max-width"],
    isPhoneLandscapeProfile(deviceProfile) ? 268 : isPhoneLayout ? 335 : isIpadLayout ? 460 : 520
  );
  const popupMaxHeightDvh = parseDvh(
    resolvedVars["--login-popup-max-height"],
    isPhoneLandscapeProfile(deviceProfile) ? 50 : isPhoneLayout ? 56 : 72
  );
  const bgSizeX = parsePercent(
    resolvedVars["--login-bg-size-x"],
    parsePercent(resolvedVars["--login-bg-size"], isPhoneLayout ? 180 : 100)
  );
  const bgSizeY = parsePercent(resolvedVars["--login-bg-size-y"], 100);
  const bgPosY = parsePercent(resolvedVars["--login-bg-pos-y"], 2);

  const safeLeftWidth = clamp(leftWidth, INSERT_WIDTH_MIN, INSERT_WIDTH_MAX);
  const safeRightWidth = clamp(rightWidth, INSERT_WIDTH_MIN, INSERT_WIDTH_MAX);
  const safeLeftHeight = clamp(leftHeight, INSERT_HEIGHT_MIN, INSERT_HEIGHT_MAX);
  const safeRightHeight = clamp(rightHeight, INSERT_HEIGHT_MIN, INSERT_HEIGHT_MAX);
  const safeLeftPageStart = clamp(leftLeft, PAGE_INSERT_X_MIN, PAGE_INSERT_X_MAX - safeLeftWidth * 2);
  const safeRightPageStart = clamp(rightLeft, PAGE_INSERT_X_MIN, PAGE_INSERT_X_MAX - safeRightWidth * 2);
  const safeLeftTop = clamp(leftTop, INSERT_TOP_MIN, INSERT_TOP_MAX);
  const safeRightTop = clamp(rightTop, INSERT_TOP_MIN, INSERT_TOP_MAX);
  const safeRightModeTop = clamp(rightModeTop, INSERT_TOP_MIN, INSERT_TOP_MAX);
  const canEditLayout = isLayoutEditMode && !!deviceProfile;
  const canPhoneQuickSetup = canEditLayout && isPhoneLayout;
  const leftPageBounds = layoutPageBounds.left ?? { left: 0, top: 0, width: 50, height: 100 };
  const rightPageBounds = layoutPageBounds.right ?? { left: 50, top: 0, width: 50, height: 100 };
  const hasBookFrame = bookFrame.width > 0 && bookFrame.height > 0;
  const viewportWidth = isMounted && typeof window !== "undefined" ? window.innerWidth : 430;
  const viewportHeight = isMounted && typeof window !== "undefined" ? window.innerHeight : 932;
  const popupWidthFromBookPx = hasBookFrame ? (bookFrame.width * popupWidth) / 100 : (viewportWidth * popupWidth) / 100;
  const popupWidthPx = isLayoutEditMode
    ? popupWidthFromBookPx
    : Math.min(popupWidthFromBookPx, popupMaxWidthPx);
  const popupHeightFromBookPx = hasBookFrame ? (bookFrame.height * popupHeight) / 100 : (viewportHeight * popupHeight) / 100;
  const popupMaxHeightPx = (viewportHeight * popupMaxHeightDvh) / 100;
  const popupHeightPx = isLayoutEditMode ? popupHeightFromBookPx : Math.min(popupHeightFromBookPx, popupMaxHeightPx);
  const popupLeftPx = hasBookFrame ? bookFrame.left + (bookFrame.width * popupLeft) / 100 : (viewportWidth * popupLeft) / 100;
  const popupTopPx = hasBookFrame ? bookFrame.top + (bookFrame.height * popupTop) / 100 : (viewportHeight * popupTop) / 100;
  const popupCloseTopPx = popupTopPx + popupHeightPx / 2 + 4;
  const popupScaleBaseWidthPx = isPhoneLandscapeProfile(deviceProfile) ? 268 : 335;
  const popupScaleBaseHeightPx = isPhoneLandscapeProfile(deviceProfile) ? 180 : 240;
  const phoneTextScaleRaw = Number.parseFloat(resolvedVars["--login-phone-text-scale"] ?? "0.6");
  const phoneTextScale = Number.isFinite(phoneTextScaleRaw) ? clamp(phoneTextScaleRaw, 0.6, 3) : 1;
  const ipadTextSize = parseRem(
    resolvedVars["--login-ipad-text-size"],
    deviceProfile === "ipad-portrait" ? 1.16 : 1
  );
  const autoPhoneFormScale = clamp(
    Math.min(popupWidthPx / popupScaleBaseWidthPx, popupHeightPx / popupScaleBaseHeightPx),
    0.58,
    1.4
  );
  const autoPhoneLeftTextScale = clamp(phoneTextScale, 0.6, 3);
  const autoPhoneRightTextScale = clamp(phoneTextScale, 0.6, 3);
  const activeSetupProfile: DeviceProfileKey = (() => {
    if (isPhoneProfile(forcedDeviceProfile)) return forcedDeviceProfile;
    if (isPhoneProfile(deviceProfile)) return deviceProfile;
    return "iphone-portrait";
  })();
  const activeSetupMode = setupModeFromQuery(mode);
  const activeSetupIndex = Math.max(
    0,
    QUICK_SETUP_STEPS.findIndex((step) => step.profile === activeSetupProfile && step.mode === activeSetupMode)
  );
  const activeSetupLabel = `${DEVICE_PROFILE_LABELS[activeSetupProfile]} | ${setupModeLabel(activeSetupMode)}`;
  const isResetPopupOpen = isResetMode && showResetPopup;
  const shouldShowAuthForm = isLayoutEditMode
    ? true
    : (isResetMode ? showResetPopup : showPhoneForm);
  const shouldOpenAuthShell = isLayoutEditMode
    ? true
    : (showPhoneForm || isResetPopupOpen);
  // Keep popup-open visual hiding out of direct edit mode so page text remains visible
  // while adjusting layout/text scale.
  const isPhonePopupVisible = shouldOpenAuthShell && !isLayoutEditMode;
  const runtimeStyleWithAutoScale = useMemo<CSSProperties | undefined>(() => {
    const nextStyle: Record<string, string> = runtimeStyle ? { ...(runtimeStyle as Record<string, string>) } : {};
    if (isMounted) {
      nextStyle["--login-popup-left-fixed-px"] = `${popupLeftPx.toFixed(2)}px`;
      nextStyle["--login-popup-top-fixed-px"] = `${popupTopPx.toFixed(2)}px`;
      nextStyle["--login-popup-width-fixed-px"] = `${popupWidthPx.toFixed(2)}px`;
      nextStyle["--login-popup-height-fixed-px"] = `${popupHeightPx.toFixed(2)}px`;
      nextStyle["--login-close-top-fixed-px"] = `${popupCloseTopPx.toFixed(2)}px`;
    }
    if (isPhoneLayout) {
      nextStyle["--login-phone-form-scale"] = autoPhoneFormScale.toFixed(2);
      nextStyle["--login-phone-left-text-scale"] = autoPhoneLeftTextScale.toFixed(2);
      nextStyle["--login-phone-right-text-scale"] = autoPhoneRightTextScale.toFixed(2);
      nextStyle["--login-phone-text-scale"] = phoneTextScale.toFixed(2);
    }
    return Object.keys(nextStyle).length > 0 ? (nextStyle as CSSProperties) : undefined;
  }, [
    autoPhoneFormScale,
    autoPhoneLeftTextScale,
    autoPhoneRightTextScale,
    hasBookFrame,
    isMounted,
    isPhoneLayout,
    phoneTextScale,
    popupCloseTopPx,
    popupHeightPx,
    popupLeftPx,
    popupTopPx,
    popupWidthPx,
    runtimeStyle,
  ]);

  useEffect(() => {
    if (!canEditLayout) return;
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
      setLayoutVarValues(nextValues);
    }
  }, [
    canEditLayout,
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
    safeRightModeTop,
    safeRightPageStart,
    safeRightTop,
    safeRightWidth,
  ]);

  function goToSetupStep(offset: number) {
    const length = QUICK_SETUP_STEPS.length;
    const nextIndex = (activeSetupIndex + offset + length) % length;
    const nextStep = QUICK_SETUP_STEPS[nextIndex];
    const params = new URLSearchParams(searchParams.toString());
    params.set("editLayout", "1");
    params.set("previewProfile", nextStep.profile);
    const modeQuery = setupModeToQuery(nextStep.mode);
    if (modeQuery) {
      params.set("mode", modeQuery);
    } else {
      params.delete("mode");
    }
    params.delete("authError");
    router.replace(`${pathname}?${params.toString()}`);
  }

  function switchEditProfile(nextProfile: DeviceProfileKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("editLayout", "1");
    params.set("previewProfile", nextProfile);
    params.delete("authError");
    router.replace(`${pathname}?${params.toString()}`);
  }

  function setLayoutVarValue(key: string, value: string) {
    if (!isLayoutEditMode) return;
    setLayoutVars((current) => ({ ...current, [key]: value }));
    setLayoutDirty(true);
  }

  function setLayoutVarValues(nextValues: Record<string, string>) {
    if (!isLayoutEditMode) return;
    setLayoutVars((current) => ({ ...current, ...nextValues }));
    setLayoutDirty(true);
  }

  function startLayoutDrag(event: React.PointerEvent, target: LayoutEditTarget) {
    if (!canEditLayout) return;
    event.preventDefault();
    event.stopPropagation();

    let stageWidth = 0;
    let stageHeight = 0;
    if (target === "popup" || target === "popup-size") {
      const bookRect = bookRef.current?.getBoundingClientRect();
      if (target === "popup-size") {
        stageWidth = bookRect?.width || window.innerWidth || 1;
        stageHeight = bookRect?.height || window.innerHeight || 1;
      } else if (bookRect?.width && bookRect.height) {
        stageWidth = bookRect.width;
        stageHeight = bookRect.height;
      } else {
        stageWidth = window.innerWidth || 1;
        stageHeight = window.innerHeight || 1;
      }
    } else {
      const bookRect = bookRef.current?.getBoundingClientRect();
      if (!bookRect?.width || !bookRect.height) return;
      const page =
        target === "left" || target === "left-size"
          ? leftPageBounds
          : target === "right" || target === "right-size"
            ? rightPageBounds
            : null;
      if (page && page.width > 0 && page.height > 0) {
        stageWidth = (bookRect.width * page.width) / 100;
        stageHeight = (bookRect.height * page.height) / 100;
      } else {
        stageWidth = bookRect.width / 2;
        stageHeight = bookRect.height;
      }
    }

    setSelectedLayoutBox(target === "left" || target === "left-size" ? "left" : target === "right" || target === "right-size" ? "right" : "popup");
    setLayoutDragState({
      target,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      stageWidth,
      stageHeight,
      leftX: safeLeftPageStart,
      leftY: safeLeftTop,
      leftW: safeLeftWidth,
      leftH: safeLeftHeight,
      rightX: safeRightPageStart,
      rightY: safeRightTop,
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
    if (!layoutDragState || !canEditLayout) return;
    const activeDrag = layoutDragState;

    function onPointerMove(event: PointerEvent) {
      if (event.pointerId !== activeDrag.pointerId) return;
      const deltaXPercent = ((event.clientX - activeDrag.startClientX) / activeDrag.stageWidth) * 100;
      const deltaYPercent = ((event.clientY - activeDrag.startClientY) / activeDrag.stageHeight) * 100;

      if (activeDrag.target === "left") {
        const nextStart = clamp(
          activeDrag.leftX + deltaXPercent,
          PAGE_INSERT_X_MIN,
          PAGE_INSERT_X_MAX - activeDrag.leftW * 2
        );
        const nextTop = clamp(activeDrag.leftY + deltaYPercent, INSERT_TOP_MIN, INSERT_TOP_MAX);
        setLayoutVarValues({
          "--login-left-left": toPercent(nextStart),
          "--login-left-top": toPercent(nextTop),
        });
        return;
      }

      if (activeDrag.target === "left-size") {
        const start = activeDrag.leftX;
        const maxWidth = maxLeftWidthForStart(start);
        setLayoutVarValues({
          "--login-left-width": toPercent(clamp(activeDrag.leftW + deltaXPercent / 2, INSERT_WIDTH_MIN, maxWidth)),
          "--login-left-height": toPercent(clamp(activeDrag.leftH + deltaYPercent, INSERT_HEIGHT_MIN, INSERT_HEIGHT_MAX)),
        });
        return;
      }

      if (activeDrag.target === "right") {
        const nextStart = clamp(
          activeDrag.rightX + deltaXPercent,
          PAGE_INSERT_X_MIN,
          PAGE_INSERT_X_MAX - activeDrag.rightW * 2
        );
        const nextTop = clamp(activeDrag.rightModeY + deltaYPercent, INSERT_TOP_MIN, INSERT_TOP_MAX);
        setLayoutVarValues({
          "--login-right-left": toPercent(nextStart),
          "--login-right-top": toPercent(nextTop),
          "--login-right-mode-top": toPercent(nextTop),
        });
        return;
      }

      if (activeDrag.target === "right-size") {
        const start = activeDrag.rightX;
        const maxWidth = maxRightWidthForStart(start);
        setLayoutVarValues({
          "--login-right-width": toPercent(clamp(activeDrag.rightW + deltaXPercent / 2, INSERT_WIDTH_MIN, maxWidth)),
          "--login-right-height": toPercent(clamp(activeDrag.rightH + deltaYPercent, INSERT_HEIGHT_MIN, INSERT_HEIGHT_MAX)),
        });
        return;
      }

      if (activeDrag.target === "popup") {
        setLayoutVarValues({
          "--login-popup-left": toPercent(clamp(activeDrag.popupX + deltaXPercent, 18, 92)),
          "--login-popup-top": toPercent(clamp(activeDrag.popupY + deltaYPercent, 14, 92)),
        });
        return;
      }

      if (activeDrag.target === "popup-size") {
        setLayoutVarValues({
          "--login-popup-width": toVw(clamp(activeDrag.popupW + deltaXPercent, 10, 120)),
          "--login-popup-height": toPercent(clamp(activeDrag.popupH + deltaYPercent, 5, 220)),
        });
      }
    }

    function onPointerUp(event: PointerEvent) {
      if (event.pointerId !== activeDrag.pointerId) return;
      setLayoutDragState(null);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [canEditLayout, layoutDragState]);

  async function reloadLayoutDraft() {
    if (!deviceProfile) return;
    setLayoutStatus("Reloading...");
    try {
      const response = await fetch(`/api/device-layout?profile=${deviceProfile}&ts=${Date.now()}`, { cache: "no-store" });
      const payload = (await response.json()) as DeviceLayoutApiResult;
      if (!response.ok || !isDeviceProfileKey(payload.profile || "")) {
        throw new Error(payload.error || "Unable to reload layout.");
      }
      setLayoutVars(payload.vars || {});
      setLayoutDirty(false);
      setLayoutStatus("Reloaded.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to reload layout.";
      setLayoutStatus(message);
    }
  }

  function clearLocalLayoutDraft() {
    if (!deviceProfile) return;
    clearLocalLayoutVars(deviceProfile);
    setLayoutStatus("Cleared local draft. Tap Reload to pull server/default values.");
  }

  async function saveLayoutDraft(options?: { forceServer?: boolean }) {
    if (!deviceProfile) return;
    setLayoutSaving(true);
    setLayoutStatus("Saving...");
    try {
      if (layoutLocalOnly && !options?.forceServer) {
        writeLocalLayoutVars(deviceProfile, layoutVars);
        setDeviceVars(layoutVars);
        setLayoutVars(layoutVars);
        setLayoutDirty(false);
        setLayoutStatus("Saved locally on this phone.");
        return;
      }

      const response = await fetch("/api/device-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: deviceProfile, vars: layoutVars }),
      });
      const payload = (await response.json()) as DeviceLayoutApiResult;
      if (response.status === 401 || response.status === 403) {
        writeLocalLayoutVars(deviceProfile, layoutVars);
        setLayoutLocalOnly(true);
        setShowAdminAuthPrompt(true);
        setDeviceVars(layoutVars);
        setLayoutVars(layoutVars);
        setLayoutDirty(false);
        setLayoutStatus("Saved locally. Sign in as admin below to save to server.");
        return;
      }

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save layout.");
      }
      const nextVars = payload.vars || layoutVars;
      clearLocalLayoutVars(deviceProfile);
      setDeviceVars(nextVars);
      setLayoutVars(nextVars);
      setLayoutDirty(false);
      setLayoutLocalOnly(false);
      setLayoutStatus("Saved.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to save layout.";
      setLayoutStatus(message);
    } finally {
      setLayoutSaving(false);
    }
  }

  async function handleAdminAuthForLayoutSave(event: React.FormEvent) {
    event.preventDefault();
    const email = adminAuthEmail.trim();
    if (!email || !adminAuthPassword) {
      setAdminAuthError("Enter admin email and password.");
      return;
    }

    setAdminAuthBusy(true);
    setAdminAuthError(null);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: adminAuthPassword,
      });
      if (error) {
        setAdminAuthError(error.message);
        return;
      }

      setLayoutLocalOnly(false);
      setShowAdminAuthPrompt(false);
      setAdminAuthPassword("");
      setLayoutStatus("Admin sign-in successful. Saving to server...");
      await saveLayoutDraft({ forceServer: true });
    } finally {
      setAdminAuthBusy(false);
    }
  }

  const leftEditBoxStyle: CSSProperties = {
    left: `${leftPageBounds.left + (leftPageBounds.width * safeLeftPageStart) / 100}%`,
    top: `${leftPageBounds.top + (leftPageBounds.height * safeLeftTop) / 100}%`,
    width: `${(leftPageBounds.width * (safeLeftWidth * 2)) / 100}%`,
    height: `${(leftPageBounds.height * safeLeftHeight) / 100}%`,
  };

  const rightEditBoxStyle: CSSProperties = {
    left: `${rightPageBounds.left + (rightPageBounds.width * safeRightPageStart) / 100}%`,
    top: `${rightPageBounds.top + (rightPageBounds.height * safeRightModeTop) / 100}%`,
    width: `${(rightPageBounds.width * (safeRightWidth * 2)) / 100}%`,
    height: `${(rightPageBounds.height * safeRightHeight) / 100}%`,
  };

  const popupEditBoxStyle: CSSProperties = {
    left: `${popupLeftPx}px`,
    top: `${popupTopPx}px`,
    width: `${popupWidthPx}px`,
    height: `${popupHeightPx}px`,
  };

  return (
    <main
      ref={heroRef}
      className="login-hero"
      data-device-profile={deviceProfile ?? "default"}
      data-preview-mode={isPreviewMode ? "1" : "0"}
      data-layout-edit={isLayoutEditMode ? "1" : "0"}
      style={runtimeStyleWithAutoScale}
    >
      {canEditLayout && (
        <>
          {canPhoneQuickSetup && (
            <>
              <button
                type="button"
                className="login-direct-step-arrow login-direct-step-arrow-left"
                onClick={() => goToSetupStep(-1)}
              >
                {"<"}
              </button>
              <button
                type="button"
                className="login-direct-step-arrow login-direct-step-arrow-right"
                onClick={() => goToSetupStep(1)}
              >
                {">"}
              </button>
              <div className="login-direct-step-label">{activeSetupLabel}</div>
            </>
          )}
          <button
            type="button"
            className="login-direct-quick-save"
            onClick={() => void saveLayoutDraft()}
            disabled={layoutSaving || adminAuthBusy}
          >
            {layoutSaving ? "Saving..." : "Save"}
          </button>
        </>
      )}

      <section
        ref={bookRef}
        className={`login-book ${isPhonePopupVisible ? "login-book-popup-open" : ""}`}
      >
        <div className="login-page login-page-left">
          <div className="login-left-insert">
            <p className="login-kicker">Reading Club</p>
            <p className={`typewriter ink-text ${caveat.className}`} aria-live="polite">
              {leftText}
            </p>
          </div>
        </div>

        <div className="login-page login-page-right login-page-right-mode">
          <div className="login-right-insert">
            <p className="login-kicker">
              {isResetMode ? "Reset password" : "Reading Club"}
            </p>
            <p className={`login-subtitle ink-text ${caveat.className}`}>
              {rightIntroText}
              {isResetMode && !isLayoutEditMode && (
                <>
                  {" "}
                  <button
                    type="button"
                    className="ink-link login-reset-trigger"
                      onClick={() => {
                        resetFeedback();
                        setShowResetPopup(true);
                        setShowPhoneForm(true);
                      }}
                      disabled={busy}
                    >
                    Click here
                  </button>
                </>
              )}
            </p>
            <>
              <div className={`auth-panel ${caveat.className}`}>
                <div className="auth-heading-row">
                  {!isResetMode && (
                    <div className="auth-switch" role="tablist" aria-label="Authentication mode">
                      <button
                        type="button"
                        className={`auth-switch-btn ${effectiveAuthView === "signin" ? "active" : ""}`}
                        onClick={() => {
                          resetFeedback();
                          setAuthView("signin");
                          setShowPhoneForm(true);
                        }}
                        disabled={busy}
                      >
                        Sign in
                      </button>
                      <button
                        type="button"
                        className={`auth-switch-btn ${effectiveAuthView === "signup" ? "active" : ""}`}
                        onClick={() => {
                          resetFeedback();
                          setAuthView("signup");
                          setShowPhoneForm(true);
                        }}
                        disabled={busy}
                      >
                        Create account
                      </button>
                    </div>
                  )}
                </div>

                <div
                  className={`auth-form-shell auth-form-shell-popup ${isPhoneLayout ? "auth-form-shell-phone" : ""} ${shouldOpenAuthShell ? "open" : ""}`}
                >
                  {shouldShowAuthForm && (isResetMode ? (
                    <form className="auth-form auth-form-reset" onSubmit={handleResetPassword}>
                      <label className="auth-field">
                        <span>New password</span>
                        <div className="auth-password-row">
                          <input
                            type={showResetPassword ? "text" : "password"}
                            value={resetPassword}
                            onChange={(event) => setResetPassword(event.target.value)}
                            autoComplete="new-password"
                            required
                          />
                          <button
                            type="button"
                            className="auth-toggle-password"
                            onClick={() => setShowResetPassword((current) => !current)}
                          >
                            {showResetPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                      </label>

                      <label className="auth-field">
                        <span>Confirm new password</span>
                        <div className="auth-password-row">
                          <input
                            type={showResetConfirmPassword ? "text" : "password"}
                            value={resetConfirmPassword}
                            onChange={(event) => setResetConfirmPassword(event.target.value)}
                            autoComplete="new-password"
                            required
                          />
                          <button
                            type="button"
                            className="auth-toggle-password"
                            onClick={() => setShowResetConfirmPassword((current) => !current)}
                          >
                            {showResetConfirmPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                      </label>

                      <button type="submit" className="auth-submit" disabled={busy}>
                        {busy ? "Updating..." : "Update password"}
                      </button>
                    </form>
                  ) : effectiveAuthView === "signin" ? (
                    <form className="auth-form" onSubmit={handleSignIn}>
                      <label className="auth-field">
                        <span>Email</span>
                        <input
                          type="email"
                          value={signInEmail}
                          onChange={(event) => setSignInEmail(event.target.value)}
                          autoComplete="email"
                          required
                        />
                      </label>

                      <label className="auth-field">
                        <span>Password</span>
                        <div className="auth-password-row">
                          <input
                            type={showSignInPassword ? "text" : "password"}
                            value={signInPassword}
                            onChange={(event) => setSignInPassword(event.target.value)}
                            autoComplete="current-password"
                            required
                          />
                          <button
                            type="button"
                            className="auth-toggle-password"
                            onClick={() => setShowSignInPassword((current) => !current)}
                          >
                            {showSignInPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                      </label>

                      <div className="auth-actions">
                        <button type="submit" className="auth-submit" disabled={busy}>
                          {busy ? "Signing in..." : "Sign in"}
                        </button>
                        <button
                          type="button"
                          className="auth-link"
                          onClick={handleForgotPassword}
                          disabled={busy}
                        >
                          Forgot password?
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form className="auth-form" onSubmit={handleSignUp}>
                      <label className="auth-field">
                        <span>Username</span>
                        <input
                          type="text"
                          value={signUpUsername}
                          onChange={(event) => setSignUpUsername(event.target.value)}
                          autoComplete="username"
                          required
                        />
                      </label>

                      <label className="auth-field">
                        <span>Email</span>
                        <input
                          type="email"
                          value={signUpEmail}
                          onChange={(event) => setSignUpEmail(event.target.value)}
                          autoComplete="email"
                          required
                        />
                      </label>

                      <label className="auth-field">
                        <span>Password</span>
                        <div className="auth-password-row">
                          <input
                            type={showSignUpPassword ? "text" : "password"}
                            value={signUpPassword}
                            onChange={(event) => setSignUpPassword(event.target.value)}
                            autoComplete="new-password"
                            required
                          />
                          <button
                            type="button"
                            className="auth-toggle-password"
                            onClick={() => setShowSignUpPassword((current) => !current)}
                          >
                            {showSignUpPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                      </label>

                      <label className="auth-field">
                        <span>Confirm password</span>
                        <div className="auth-password-row">
                          <input
                            type={showSignUpConfirmPassword ? "text" : "password"}
                            value={signUpConfirmPassword}
                            onChange={(event) => setSignUpConfirmPassword(event.target.value)}
                            autoComplete="new-password"
                            required
                          />
                          <button
                            type="button"
                            className="auth-toggle-password"
                            onClick={() => setShowSignUpConfirmPassword((current) => !current)}
                          >
                            {showSignUpConfirmPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                      </label>

                      <button type="submit" className="auth-submit" disabled={busy}>
                        {busy ? "Creating..." : "Create user"}
                      </button>
                    </form>
                    ))}

                  {shouldOpenAuthShell && !isLayoutEditMode && (
                    <button
                      type="button"
                      className="auth-mobile-close"
                      onClick={() => {
                        if (isResetMode) {
                          setShowResetPopup(false);
                          return;
                        }
                        setShowPhoneForm(false);
                      }}
                      disabled={busy}
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </>

            {notice && <p className="login-note">{notice}</p>}
            {(err || authError) && <p className="login-error">{err || authError}</p>}
          </div>
        </div>

        {canEditLayout && (
          <div className="login-direct-edit-overlay">
            <button
              type="button"
              className={`login-direct-edit-box ${selectedLayoutBox === "left" ? "is-selected" : ""}`}
              style={leftEditBoxStyle}
              onPointerDown={(event) => startLayoutDrag(event, "left")}
              onClick={() => setSelectedLayoutBox("left")}
            >
              Left
              <span
                className="login-direct-edit-handle"
                onPointerDown={(event) => startLayoutDrag(event, "left-size")}
              />
            </button>

            <button
              type="button"
              className={`login-direct-edit-box ${selectedLayoutBox === "right" ? "is-selected" : ""}`}
              style={rightEditBoxStyle}
              onPointerDown={(event) => startLayoutDrag(event, "right")}
              onClick={() => setSelectedLayoutBox("right")}
            >
              Right
              <span
                className="login-direct-edit-handle"
                onPointerDown={(event) => startLayoutDrag(event, "right-size")}
              />
            </button>
          </div>
        )}
      </section>

      {canEditLayout && (
        <button
          type="button"
          className="login-direct-popup-box"
          style={popupEditBoxStyle}
          onPointerDown={(event) => startLayoutDrag(event, "popup")}
          onClick={() => setSelectedLayoutBox("popup")}
        >
          Popup
          <span
            className="login-direct-edit-handle"
            onPointerDown={(event) => startLayoutDrag(event, "popup-size")}
          />
        </button>
      )}

      {canEditLayout && (
        <aside className={`login-direct-panel ${showLayoutPanel ? "" : "is-collapsed"} ${layoutDragState ? "is-dragging" : ""}`}>
          <button
            type="button"
            className="login-direct-panel-toggle"
            onClick={() => setShowLayoutPanel((current) => !current)}
          >
            {showLayoutPanel ? "Hide layout tools" : "Show layout tools"}
          </button>

          {showLayoutPanel && (
            <div className="login-direct-panel-body">
              <p className="login-direct-panel-title">
                {deviceProfile ? `${DEVICE_PROFILE_LABELS[deviceProfile]} Direct Layout Edit` : "Direct Layout Edit"}
              </p>
              <label>
                Profile
                <select
                  value={deviceProfile ?? "desktop"}
                  onChange={(event) => switchEditProfile(event.target.value as DeviceProfileKey)}
                  disabled={layoutSaving || adminAuthBusy}
                >
                  {DEVICE_PROFILE_KEYS.map((profileKey) => (
                    <option key={profileKey} value={profileKey}>
                      {DEVICE_PROFILE_LABELS[profileKey]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Background width
                <input
                  type="range"
                  min={60}
                  max={280}
                  value={Math.round(bgSizeX)}
                  onChange={(event) =>
                    setLayoutVarValues({
                      "--login-bg-size-x": `${event.target.value}%`,
                      "--login-bg-size": `${event.target.value}%`,
                    })
                  }
                />
              </label>
              <label>
                Background height
                <input
                  type="range"
                  min={60}
                  max={220}
                  value={Math.round(bgSizeY)}
                  onChange={(event) => setLayoutVarValue("--login-bg-size-y", `${event.target.value}%`)}
                />
              </label>
              <label>
                Background Y
                <input
                  type="range"
                  min={-10}
                  max={40}
                  value={Math.round(bgPosY)}
                  onChange={(event) => setLayoutVarValue("--login-bg-pos-y", `${event.target.value}%`)}
                />
              </label>
              {isPhoneLayout && (
                <label>
                  Phone text size (%)
                  <input
                    type="range"
                    min={60}
                    max={300}
                    step={1}
                    value={Math.round(phoneTextScale * 100)}
                    onChange={(event) => {
                      const nextScale = clamp(Number(event.target.value) / 100, 0.6, 3);
                      setLayoutVarValue("--login-phone-text-scale", nextScale.toFixed(2));
                    }}
                  />
                </label>
              )}
              {isIpadLayout && (
                <label>
                  iPad text size (rem)
                  <input
                    type="range"
                    min={0.7}
                    max={2.4}
                    step={0.02}
                    value={ipadTextSize}
                    onChange={(event) =>
                      setLayoutVarValue("--login-ipad-text-size", `${Number(event.target.value).toFixed(2)}rem`)
                    }
                  />
                </label>
              )}
              <label>
                Popup height
                <input
                  type="range"
                  min={5}
                  max={220}
                  value={Math.round(popupHeight)}
                  onChange={(event) => setLayoutVarValue("--login-popup-height", `${event.target.value}%`)}
                />
              </label>
              <div className="login-direct-panel-actions">
                <button type="button" onClick={() => void saveLayoutDraft()} disabled={layoutSaving}>
                  {layoutSaving ? "Saving..." : "Save"}
                </button>
                <button type="button" onClick={() => void reloadLayoutDraft()} disabled={layoutSaving}>
                  Reload
                </button>
                <button type="button" onClick={clearLocalLayoutDraft} disabled={layoutSaving}>
                  Clear Local
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminAuthPrompt((current) => !current);
                    setAdminAuthError(null);
                  }}
                  disabled={layoutSaving || adminAuthBusy}
                >
                  {showAdminAuthPrompt ? "Hide Admin Login" : "Admin Login"}
                </button>
              </div>
              <p className="login-direct-panel-status">
                {layoutStatus || (layoutDirty ? "Unsaved changes." : "Ready.")}
              </p>

              {showAdminAuthPrompt && (
                <form className="login-direct-admin-form" onSubmit={handleAdminAuthForLayoutSave}>
                  <label>
                    Admin email
                    <input
                      type="email"
                      value={adminAuthEmail}
                      onChange={(event) => setAdminAuthEmail(event.target.value)}
                      autoComplete="email"
                      required
                    />
                  </label>
                  <label>
                    Admin password
                    <input
                      type="password"
                      value={adminAuthPassword}
                      onChange={(event) => setAdminAuthPassword(event.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </label>
                  <div className="login-direct-admin-actions">
                    <button type="submit" disabled={adminAuthBusy || layoutSaving}>
                      {adminAuthBusy ? "Signing in..." : "Sign in + Save Server"}
                    </button>
                  </div>
                  {adminAuthError && <p className="login-direct-admin-error">{adminAuthError}</p>}
                </form>
              )}
            </div>
          )}
        </aside>
      )}
    </main>
  );
}

