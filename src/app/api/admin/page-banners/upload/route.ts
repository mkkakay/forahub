// Upload endpoint for page-banner images. Reuses the existing imageUpload
// utility (validateImageUpload + uploadToStorage) — same pipeline used by the
// Hero Images + Event Banners admin panels — so we don't duplicate upload
// logic. Stores into the same `hero-images` public bucket.

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import {
  validateImageUpload,
  uploadToStorage,
  removeFromStorage,
  EXT_BY_MIME,
  type AllowedMime,
} from "@/lib/admin/imageUpload";
import { invalidatePageBannerCache } from "@/lib/pageBanners";
import { safeEqual } from "@/lib/security/timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "hero-images";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set<AllowedMime>(["image/jpeg", "image/png", "image/webp"]);

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  return safeEqual(key, process.env.ADMIN_SECRET);
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 }); }

  const pageKey = ((form.get("page_key") as string | null) ?? "").trim();
  if (!pageKey) return NextResponse.json({ error: "page_key field required" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const validation = await validateImageUpload({ file, allowedMimes: ALLOWED, maxBytes: MAX_BYTES });
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: validation.status });

  // Confirm the page_banner row exists before uploading.
  const { data: existing, error: lookupError } = await adminSupabase
    .from("page_banners")
    .select("id")
    .eq("page_key", pageKey)
    .maybeSingle();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "page_key not found" }, { status: 404 });

  const ext = EXT_BY_MIME[validation.mime];
  const storagePath = `page-banners/${pageKey}-${Date.now()}.${ext}`;

  let publicUrl: string;
  try {
    const result = await uploadToStorage({
      bucket: BUCKET,
      storagePath,
      buf: validation.buf,
      contentType: validation.mime,
    });
    publicUrl = result.publicUrl;
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }

  // Auto-enable on upload — same one-step UX as the PATCH route.
  const { error: updateError } = await adminSupabase
    .from("page_banners")
    .update({
      image_url: publicUrl,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("page_key", pageKey);
  if (updateError) {
    await removeFromStorage(BUCKET, storagePath);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  invalidatePageBannerCache();
  return NextResponse.json({ image_url: publicUrl, page_key: pageKey });
}
