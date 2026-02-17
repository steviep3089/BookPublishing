"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function AuthInviteHashHandler() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.slice(1));
    const error = params.get("error");
    const errorDescription = params.get("error_description");
    if (error) {
      const message = errorDescription || "Authentication link is invalid or expired.";
      const next = `/login?authError=${encodeURIComponent(message)}`;
      window.location.replace(next);
      return;
    }

    if (!hash.includes("access_token=")) return;

    const type = params.get("type");
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const nextPath =
      type === "recovery"
        ? "/login?mode=reset"
        : type === "magiclink" || type === "signup"
          ? "/login?mode=login"
          : "/login";

    if (!accessToken || !refreshToken) return;
    if (type !== "invite" && type !== "magiclink" && type !== "recovery" && type !== "signup") return;

    const supabase = supabaseBrowser();
    void (async () => {
      try {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          await supabase.auth.signOut();
          const next = `/login?authError=${encodeURIComponent(sessionError.message)}`;
          window.location.replace(next);
          return;
        }

        window.location.replace(nextPath);
      } catch {
        await supabase.auth.signOut();
        const next = `/login?authError=${encodeURIComponent("Authentication link is invalid or expired.")}`;
        window.location.replace(next);
      }
    })();
  }, []);

  return null;
}
