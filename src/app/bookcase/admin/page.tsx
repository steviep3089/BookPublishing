import Link from "next/link";
import { redirect } from "next/navigation";
import { Caveat } from "next/font/google";
import { getCurrentUserAndRole } from "@/lib/supabase/roles";
import { supabaseService } from "@/lib/supabase/service";
import {
  STATIC_BOOKCASE_KEYS,
  bookcaseLabelForKey,
  bookcasePathForKey,
  isValidBookcaseKey,
  normalizeBookcaseKey,
} from "@/lib/bookcase/pageKey";

const caveat = Caveat({ subsets: ["latin"], weight: ["600", "700"] });

export default async function BookcaseAdminPage() {
  const { isAdmin } = await getCurrentUserAndRole();
  if (!isAdmin) {
    redirect("/bookcase");
  }
  const rows = await supabaseService.from("bookcase_book_layouts").select("page_key").order("page_key");

  const keySet = new Set<string>(STATIC_BOOKCASE_KEYS);
  if (Array.isArray(rows.data)) {
    for (const row of rows.data) {
      const value = row && typeof row === "object" ? (row as Record<string, unknown>).page_key : "";
      if (typeof value === "string" && value.trim()) {
        keySet.add(normalizeBookcaseKey(value));
      }
    }
  }

  const pageLinks = Array.from(keySet)
    .filter((key) => STATIC_BOOKCASE_KEYS.includes(key as (typeof STATIC_BOOKCASE_KEYS)[number]) || isValidBookcaseKey(key))
    .sort((a, b) => a.localeCompare(b))
    .map((key) => ({
      key,
      label: `Edit ${bookcaseLabelForKey(key)} Shelf`,
      href: `${bookcasePathForKey(key)}?edit=1`,
    }));

  return (
    <main className="bookcase-scene">
      <section className="bookcase-admin-card">
        <h1 className={caveat.className}>Bookcase Edit Pages</h1>
        <p>Select where you want to edit.</p>

        <div className="bookcase-admin-links">
          <Link href="/bookcase/admin/device-setup">Device Layout Setup</Link>
          {pageLinks.map((item) => (
            <Link key={item.key} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href="/bookcase">Back to Bookcase</Link>
        </div>
      </section>
    </main>
  );
}
