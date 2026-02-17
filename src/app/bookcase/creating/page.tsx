import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Great_Vibes } from "next/font/google";
import EditableBooksLayer from "@/components/EditableBooksLayer";
import { getCurrentUserAndRole } from "@/lib/supabase/roles";
import { getBookcaseNav } from "@/lib/bookcase/navigation";

const greatVibes = Great_Vibes({ subsets: ["latin"], weight: "400" });

export default async function CreatingBooksPage() {
  const { isAdmin } = await getCurrentUserAndRole();
  const nav = await getBookcaseNav("creating");

  return (
    <main className="bookcase-scene bookcase-scene-empty">
      <div className="bookcase-canvas">
        <Link
          href={nav.backHref}
          className="bookcase-nav-sign bookcase-nav-sign-back"
          aria-label="Back"
        >
          <Image src="/back-sign-v2.png" alt="Back" width={1257} height={335} priority />
        </Link>
        <Link
          href={nav.nextHref}
          className="bookcase-nav-sign bookcase-nav-sign-next"
          aria-label="Next"
        >
          <Image src="/next-sign.png" alt="Next" width={1257} height={335} priority />
        </Link>
        <Link
          href="/bookcase"
          className={`bookcase-hotspot ${greatVibes.className}`}
          style={{ left: "46.56%", top: "11.11%", fontSize: "4.2vw" }}
        >
          Lily-Rose&apos;s books
        </Link>
        <Suspense fallback={<div className="bookcase-status">Loading...</div>}>
          <EditableBooksLayer pageKey="creating" isAdmin={isAdmin} />
        </Suspense>
      </div>
    </main>
  );
}
