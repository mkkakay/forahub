// Upload an image for one audience_cards row. Reuses the shared
// validateImageUpload + uploadToStorage pipeline and the existing public
// "hero-images" bucket (same bucket the Page Banners and Event Banners
// panels already upload to — no new bucket).

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import {
  validateImageUpload,
  uploadToStorage,
  removeFromStorage,
  EXT_BY_MIME,
  type AllowedMime,
} from "@/lib/admin/imageUpload";
import { invalidateAudienceCardsCache } from "@/lib/audienceCards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "hero-images";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set<AllowedMime>(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  const expected = process.env.ADMIN_SECRET;
  return !!expected && key === expected;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 }); }

  const id = ((form.get("id") as string | null) ?? "").trim();
  if (!id) return NextResponse.json({ error: "id field required" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const validation = await validateImageUpload({ file, allowedMimes: ALLOWED, maxBytes: MAX_BYTES });
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: validation.status });

  // Confirm the row exists before uploading so we don't leave orphan files.
  const { data: existing, error: lookupError } = await adminSupabase
    .from("audience_cards")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "audience card not found" }, { status: 404 });

  const ext = EXT_BY_MIME[validation.mime];
  const storagePath = `audience-cards/${id}-${Date.now()}.${ext}`;

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

  const { data, error: updateError } = await adminSupabase
    .from("audience_cards")
    .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, label, icon, image_url, link_url, bg_class, icon_color_class, sort_order, is_active, created_at, updated_at")
    .single();
  if (updateError) {
    await removeFromStorage(BUCKET, storagePath);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  invalidateAudienceCardsCache();
  return NextResponse.json({ data, image_url: publicUrl });
}
