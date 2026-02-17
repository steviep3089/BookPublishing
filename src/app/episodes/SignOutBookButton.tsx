"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function SignOutBookButton() {
  const router = useRouter();
  const [isClosing, setIsClosing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  async function handleSignOut() {
    if (isBusy) return;
    setIsBusy(true);
    setIsClosing(true);

    // Let the close animation start before signing out.
    await new Promise((resolve) => setTimeout(resolve, 350));

    const supabase = supabaseBrowser();
    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      className={`signout-book${isClosing ? " closing" : ""}`}
      onClick={handleSignOut}
      aria-label="Sign out"
      disabled={isBusy}
    >
      <span className="signout-label">Sign out</span>
      <span className="signout-cover">Log in</span>
    </button>
  );
}
