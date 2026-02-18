import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Great_Vibes } from "next/font/google";
import { notFound } from "next/navigation";
import EditableBooksLayer from "@/components/EditableBooksLayer";
import { getCurrentUserAndRole } from "@/lib/supabase/roles";
import { bookcaseLabelForKey, isValidBookcaseKey, normalizeBookcaseKey } from "@/lib/bookcase/pageKey";
import { getBookcaseNav } from "@/lib/bookcase/navigation";

const greatVibes = Great_Vibes({ subsets: ["latin"], weight: "400" });

type DynamicBookcasePageProps = {
  params: { pageKey: string } | Promise<{ pageKey: string }>;
};

export default async function DynamicBookcasePage({ params }: DynamicBookcasePageProps) {
  const resolvedParams = await Promise.resolve(params);
  const pageKey = normalizeBookcaseKey(decodeURIComponent(resolvedParams.pageKey || ""));
  if (!isValidBookcaseKey(pageKey)) {
    notFound();
  }

  const { isAdmin } = await getCurrentUserAndRole();
  const heading = bookcaseLabelForKey(pageKey);
  const nav = await getBookcaseNav(pageKey);

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
          className={`bookcase-hotspot bookcase-hotspot-title ${greatVibes.className}`}
          style={{ left: "50%", top: "11.22%" }}
        >
          {heading}
        </Link>
        <Suspense fallback={<div className="bookcase-status">Loading...</div>}>
          <EditableBooksLayer pageKey={pageKey} isAdmin={isAdmin} />
        </Suspense>
      </div>
    </main>
  );
}
