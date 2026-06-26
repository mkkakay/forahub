import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import {
  validateImageUpload,
  uploadToStorage,
  removeFromStorage,
  EXT_BY_MIME,
  type AllowedMime,
} from "@/lib/admin/imageUpload";
import { safeEqual } from "@/lib/security/timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "hero-images";
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set<AllowedMime>(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);

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

  const validation = await validateImageUpload({ file, allowedMimes: ALLOWED, maxBytes: MAX_BYTES });
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: validation.status });

  const ext = EXT_BY_MIME[validation.mime];
  const storagePath = `logos/org-${slug}-${Date.now()}.${ext}`;

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

  const { error: upsertError } = await adminSupabase
    .from("organization_overrides")
    .upsert(
      {
        slug,
        manual_logo_url: publicUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    );

  if (upsertError) {
    await removeFromStorage(BUCKET, storagePath);
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ logo_url: publicUrl, slug });
}
