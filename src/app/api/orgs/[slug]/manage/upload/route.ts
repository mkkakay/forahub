// POST /api/orgs/[slug]/manage/upload  (multipart/form-data)
//   Fields:
//     - file:  the image
//     - kind:  'logo' | 'cover'
//
// Reuses the same storage helpers + "hero-images" bucket that the admin
// banner upload uses, gated on isOrgManager(slug, auth.uid()) instead of
// the admin secret. Manager-uploaded files land at
// `orgs/{slug}/{kind}-{ts}.{ext}` so they're easy to spot and rotate.
//
// Mimes: jpeg/png/webp. 5MB cap. Magic-byte sniff via validateImageUpload
// so a misnamed extension can't smuggle a different type past us.

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isOrgManager } from "@/lib/orgs/managers";
import {
  validateImageUpload,
  uploadToStorage,
  removeFromStorage,
  EXT_BY_MIME,
  type AllowedMime,
} from "@/lib/admin/imageUpload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "hero-images";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set<AllowedMime>(["image/jpeg", "image/png", "image/webp"]);
const COLUMN_BY_KIND: Record<"logo" | "cover", "logo_url" | "cover_image_url"> = {
  logo: "logo_url",
  cover: "cover_image_url",
};

export async function POST(req: NextRequest, ctx: { params: { slug: string } }) {
  const sb = createServerSupabaseClient();
  const { data: u } = await sb.auth.getUser();
  const userId = u.user?.id ?? null;
  if (!userId) return NextResponse.json({ error: "signin_required" }, { status: 401 });
  if (!(await isOrgManager(ctx.params.slug, userId))) {
    return NextResponse.json({ error: "not_a_manager" }, { status: 403 });
  }

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "invalid_multipart" }, { status: 400 }); }

  const kindField = ((form.get("kind") as string | null) ?? "").trim();
  const kind = kindField === "logo" || kindField === "cover" ? kindField : null;
  if (!kind) return NextResponse.json({ error: "kind_required" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file_required" }, { status: 400 });

  const validation = await validateImageUpload({ file, allowedMimes: ALLOWED, maxBytes: MAX_BYTES });
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: validation.status });

  const { data: orgRow, error: lookupErr } = await adminSupabase
    .from("organizations_directory")
    .select("slug")
    .eq("slug", ctx.params.slug)
    .maybeSingle();
  if (lookupErr) return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  if (!orgRow) return NextResponse.json({ error: "org_not_found" }, { status: 404 });

  const ext = EXT_BY_MIME[validation.mime];
  const storagePath = `orgs/${ctx.params.slug}/${kind}-${Date.now()}.${ext}`;

  let publicUrl: string;
  try {
    const r = await uploadToStorage({
      bucket: BUCKET,
      storagePath,
      buf: validation.buf,
      contentType: validation.mime,
    });
    publicUrl = r.publicUrl;
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }

  const column = COLUMN_BY_KIND[kind];
  const { error: updErr } = await adminSupabase
    .from("organizations_directory")
    .update({ [column]: publicUrl })
    .eq("slug", ctx.params.slug);
  if (updErr) {
    await removeFromStorage(BUCKET, storagePath);
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, kind, url: publicUrl });
}
