import Link from "next/link";
import Reader from "@/components/reader";
import { supabaseService } from "@/lib/supabase/service";
import { supabaseServer } from "@/lib/supabase/server";

export default async function ReaderPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const supabase = await supabaseServer();

  // Allow public preview in reader route; when logged in, keep using session-aware client.
  const { data: userData } = await supabase.auth.getUser();
  const readerClient = userData?.user ? supabase : supabaseService;

  // Pull the chapter content
  const { data: chapter, error } = await readerClient
    .from("chapters")
    .select("id, episode_number, title, content_md")
    .eq("id", resolvedParams.id)
    .maybeSingle();

  if (error) {
    return (
      <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
        <h1>Reader</h1>
        <p style={{ color: "crimson" }}>{error.message}</p>
      </main>
    );
  }

  if (!chapter) {
    return (
      <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
        <h1>Locked / not found</h1>
        <p>This chapter isn&apos;t available to this account.</p>
        <Link href="/episodes">Back to episodes</Link>
      </main>
    );
  }

  // Get prev/next by episode_number (optional)
  const { data: prev } = await readerClient
    .from("chapters")
    .select("id, episode_number, title")
    .lt("episode_number", chapter.episode_number)
    .order("episode_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: next } = await readerClient
    .from("chapters")
    .select("id, episode_number, title")
    .gt("episode_number", chapter.episode_number)
    .order("episode_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <Reader
      chapterId={chapter.id}
      title={`Episode ${chapter.episode_number}: ${chapter.title}`}
      content={chapter.content_md ?? ""}
      userId={userData?.user?.id ?? null}
      prevId={prev?.id ?? null}
      nextId={next?.id ?? null}
    />
  );
}
