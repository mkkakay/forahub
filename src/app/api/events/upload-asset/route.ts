import { NextRequest, NextResponse } from "next/server";
import {
  validateImageUpload,
  uploadToStorage,
  EXT_BY_MIME,
  type AllowedMime,
} from "@/lib/admin/imageUpload";
import { sanitizeApiError } from "@/lib/security/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public-facing upload for the /submit flow. Saves a flyer or banner image to
// the existing hero-images bucket under a scratch path; returns the public URL
// for the client to attach to the form payload. No DB write — the actual event
// row picks the URL up at submit time.
//
// Storage layout:
//   events/scratch-<purpose>-<timestamp>-<rand>.<ext>
//
// Purpose values: 'flyer' | 'banner'. Used only for naming clarity.

const BUCKET = "hero-images";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB cap (Vercel-safe)
const ALLOWED = new Set<AllowedMime>(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const purposeRaw = ((form.get("purpose") as string | null) ?? "banner").trim();
  const purpose = purposeRaw === "flyer" ? "flyer" : "banner";

  const validation = await validateImageUpload({ file, allowedMimes: ALLOWED, maxBytes: MAX_BYTES });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const ext = EXT_BY_MIME[validation.mime];
  const rand = Math.random().toString(36).slice(2, 8);
  const storagePath = `events/scratch-${purpose}-${Date.now()}-${rand}.${ext}`;

  try {
    const { publicUrl } = await uploadToStorage({
      bucket: BUCKET,
      storagePath,
      buf: validation.buf,
      contentType: validation.mime,
    });
    return NextResponse.json({ url: publicUrl, storage_path: storagePath, purpose });
  } catch (err) {
    return sanitizeApiError(err, "events/upload-asset", 500);
  }
}
