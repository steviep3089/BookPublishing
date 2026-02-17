import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { supabaseServer } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/roles";

const BUCKET_NAME = "book-reader-media";
const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;

function sanitizeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-_/]/g, "-").replace(/-+/g, "-").replace(/^[-/]+|[-/]+$/g, "");
}

function extensionFor(file: File) {
  const byType = file.type.split("/")[1]?.toLowerCase();
  if (byType && /^[a-z0-9]+$/.test(byType)) return byType;

  const byName = file.name.split(".").pop()?.toLowerCase();
  if (byName && /^[a-z0-9]+$/.test(byName)) return byName;
  return "bin";
}

function isAllowedMediaType(mimeType: string) {
  return (
    mimeType.startsWith("image/") ||
    mimeType.startsWith("video/") ||
    mimeType.startsWith("audio/") ||
    mimeType === "application/pdf" ||
    mimeType === "application/epub+zip" ||
    mimeType.startsWith("text/")
  );
}

async function ensureBucket() {
  const { error } = await supabaseService.storage.createBucket(BUCKET_NAME, {
    public: true,
    fileSizeLimit: `${MAX_UPLOAD_BYTES}`,
  });

  if (!error) return;
  if (error.message.toLowerCase().includes("already exists")) return;

  throw new Error(error.message);
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = await getUserRole(user.id);
  if (role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const pageKeyRaw = String(formData.get("pageKey") ?? "").trim();
  const bookKeyRaw = String(formData.get("bookKey") ?? "").trim();
  const slotRaw = String(formData.get("slot") ?? "").trim().toLowerCase();
  const fileEntry = formData.get("file");

  if (!pageKeyRaw || !bookKeyRaw) {
    return NextResponse.json({ error: "pageKey and bookKey are required" }, { status: 400 });
  }

  if (slotRaw !== "sample" && slotRaw !== "info" && slotRaw !== "full") {
    return NextResponse.json({ error: "slot must be 'sample', 'info', or 'full'" }, { status: 400 });
  }

  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (!isAllowedMediaType(fileEntry.type)) {
    return NextResponse.json(
      { error: "Only image, video, audio, PDF, EPUB, and text files are supported" },
      { status: 400 }
    );
  }

  if (fileEntry.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File is too large (max 40MB)" }, { status: 400 });
  }

  const pageKey = sanitizeSegment(pageKeyRaw);
  const bookKey = sanitizeSegment(bookKeyRaw);
  if (!pageKey || !bookKey) {
    return NextResponse.json({ error: "Invalid pageKey or bookKey" }, { status: 400 });
  }

  try {
    await ensureBucket();

    const extension = extensionFor(fileEntry);
    const storagePath = `${pageKey}/${bookKey}/${slotRaw}-${Date.now()}.${extension}`;
    const bytes = new Uint8Array(await fileEntry.arrayBuffer());

    const { error: uploadError } = await supabaseService.storage
      .from(BUCKET_NAME)
      .upload(storagePath, bytes, {
        contentType: fileEntry.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data } = supabaseService.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
    return NextResponse.json({
      url: data.publicUrl,
      path: storagePath,
      contentType: fileEntry.type || "",
      slot: slotRaw,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
