"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Caveat } from "next/font/google";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { isDeviceProfileKey, type DeviceProfileKey } from "@/lib/login/deviceLayout";

type AuthView = "signin" | "signup";

const caveat = Caveat({ subsets: ["latin"], weight: ["400", "600"] });

const JOIN_LEFT_TEXT =
  "Hello and welcome to my Reading Club. Create your account and then step into this story world with me.";
const LOGIN_LEFT_TEXT =
  "This is my story world. A place where I share the stories I've written and the wonderful stories I've discovered on my own reading journey.";
const SIGNIN_INTRO_TEXT = "Sign in with your email and password to open the bookcase.";
const SIGNUP_INTRO_TEXT = "Create an account with a username, email, and password.";
const RESET_INTRO_TEXT = "Set a new password for your account.";

export default function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const isPreviewMode = searchParams.get("previewMode") === "1";
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
  const [typedText, setTypedText] = useState("");
  const [typedAction, setTypedAction] = useState("");
  const [actionReady, setActionReady] = useState(false);
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfileKey | null>(null);
  const [deviceVars, setDeviceVars] = useState<Record<string, string>>({});
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const heroRef = useRef<HTMLElement | null>(null);
  const forcedDeviceProfile: DeviceProfileKey | null = isDeviceProfileKey(previewProfile || "")
    ? (previewProfile as DeviceProfileKey)
    : null;
  const isPhoneLayout = deviceProfile === "iphone-portrait" || deviceProfile === "iphone-landscape";

  const runtimeStyle = useMemo<CSSProperties | undefined>(() => {
    if (!deviceProfile) return undefined;
    const styleVars: Record<string, string> = {};
    const mergedVars = { ...deviceVars, ...previewVars };
    for (const [key, value] of Object.entries(mergedVars)) {
      styleVars[key] = value;
    }
    return styleVars as CSSProperties;
  }, [deviceProfile, deviceVars, previewVars]);

  useEffect(() => {
    const phonePortraitQuery = window.matchMedia("(max-width: 680px)");
    const phoneLandscapeQuery = window.matchMedia("(max-height: 500px)");
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

    const syncLayout = () => {
      if (forcedDeviceProfile) {
        setDeviceProfile(forcedDeviceProfile);
        return;
      }

      let nextProfile: DeviceProfileKey | null = null;
      if (phonePortraitQuery.matches) {
        nextProfile = "iphone-portrait";
      } else if (phoneLandscapeQuery.matches) {
        nextProfile = "iphone-landscape";
      } else if (ipadPortraitQuery.matches) {
        nextProfile = "ipad-portrait";
      } else if (ipadLandscapeQuery.matches) {
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
    if (!isPreviewMode || !forcedDeviceProfile) return;

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
  }, [forcedDeviceProfile, isPreviewMode]);

  useEffect(() => {
    if (!isPhoneLayout || isResetMode) {
      setShowPhoneForm(true);
      return;
    }
    setShowPhoneForm(false);
  }, [isPhoneLayout, isResetMode]);

  useEffect(() => {
    if (deviceProfile !== "iphone-portrait" || !heroRef.current) return;
    const viewport = heroRef.current;
    const center = () => {
      viewport.scrollLeft = Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2);
    };
    center();
    const raf = window.requestAnimationFrame(center);
    return () => window.cancelAnimationFrame(raf);
  }, [deviceProfile, showPhoneForm, actionReady]);

  useEffect(() => {
    if (isPreviewMode) {
      setTypedText(leftText);
      setTypedAction(rightIntroText);
      setActionReady(true);
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      const timer = window.setTimeout(() => {
        setTypedText(leftText);
        setTypedAction(rightIntroText);
        setActionReady(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    let leftIndex = 0;
    let rightIndex = 0;
    let phase: "left" | "right" = "left";

    const timer = setInterval(() => {
      if (phase === "left") {
        leftIndex += 1;
        setTypedText(leftText.slice(0, leftIndex));
        if (leftIndex >= leftText.length) {
          phase = "right";
        }
        return;
      }

      rightIndex += 1;
      setTypedAction(rightIntroText.slice(0, rightIndex));
      if (rightIndex >= rightIntroText.length) {
        setActionReady(true);
        clearInterval(timer);
      }
    }, 18);

    return () => clearInterval(timer);
  }, [isPreviewMode, leftText, rightIntroText]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

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

  return (
    <main
      ref={heroRef}
      className="login-hero"
      data-device-profile={deviceProfile ?? "default"}
      data-preview-mode={isPreviewMode ? "1" : "0"}
      style={runtimeStyle}
    >
      <section className="login-book">
        <div className="login-page login-page-left">
          <div className="login-left-insert">
            <p className="login-kicker">Reading Club</p>
            <p className={`typewriter ink-text ${caveat.className}`} aria-live="polite">
              {typedText}
            </p>
          </div>
        </div>

        <div className="login-page login-page-right login-page-right-mode">
          <div className="login-right-insert">
            <p className="login-kicker">
              {isResetMode ? "Reset password" : effectiveAuthView === "signin" ? "Welcome back" : "Join the story"}
            </p>
            {!actionReady ? (
              <p className={`login-subtitle ink-text ${caveat.className}`}>
                {typedAction}
              </p>
            ) : (
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
                            if (isPhoneLayout) setShowPhoneForm(true);
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
                            if (isPhoneLayout) setShowPhoneForm(true);
                          }}
                          disabled={busy}
                        >
                          Create account
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={`auth-form-shell ${isPhoneLayout ? "auth-form-shell-phone" : ""} ${(showPhoneForm || isResetMode) ? "open" : ""}`}>
                    {(showPhoneForm || !isPhoneLayout || isResetMode) && (isResetMode ? (
                    <form className="auth-form" onSubmit={handleResetPassword}>
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

                    {isPhoneLayout && !isResetMode && showPhoneForm && (
                      <button
                        type="button"
                        className="auth-mobile-close"
                        onClick={() => setShowPhoneForm(false)}
                        disabled={busy}
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            {notice && <p className="login-note">{notice}</p>}
            {(err || authError) && <p className="login-error">{err || authError}</p>}
          </div>
        </div>
      </section>
    </main>
  );
}

