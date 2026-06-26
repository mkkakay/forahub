import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/security/timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "hero-images"; // reusing the existing public bucket
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  return safeEqual(key, process.env.ADMIN_SECRET);
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const slug = ((form.get("slug") as string | null) ?? "").trim();
  if (!slug) return NextResponse.json({ error: "slug field required" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "File is empty" }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File exceeds 5MB (${(file.size / 1024 / 1024).toFixed(2)}MB)` },
      { status: 413 }
    );
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported type ${file.type || "unknown"}. Use JPG, PNG, or WebP.` },
      { status: 415 }
    );
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const storage_path = `regions/region-${slug}-${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await adminSupabase.storage
    .from(BUCKET)
    .upload(storage_path, buf, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}. Confirm the "${BUCKET}" bucket exists and is public.` },
      { status: 500 }
    );
  }

  const { data: urlData } = adminSupabase.storage.from(BUCKET).getPublicUrl(storage_path);
  const public_url = urlData.publicUrl;

  // Save the URL onto the region row in one go.
  const { error: updateError } = await adminSupabase
    .from("regions")
    .update({ banner_image_url: public_url, updated_at: new Date().toISOString() })
    .eq("slug", slug);

  if (updateError) {
    // Best-effort cleanup on DB failure.
    await adminSupabase.storage.from(BUCKET).remove([storage_path]);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ banner_image_url: public_url, storage_path });
}
