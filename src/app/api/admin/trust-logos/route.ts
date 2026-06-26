// Admin API for the homepage trust-strip logos.
//   GET    → list all rows (admin sees inactive too)
//   POST   → create a row, either from multipart upload or a JSON {image_url}
//   PATCH  → edit name/image_url/display_order/is_active by id
//   DELETE → drop row + storage object (if it was an upload)
//
// Mirrors the hero-images pipeline but routes uploads through the shared
// validateImageUpload/uploadToStorage helpers (the safer path used by
// page-banners), and writes to a separate "logos" bucket with explicit
// storage policies declared in migration 035.

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

const BUCKET = "logos";
// Logos are tiny — 500KB is plenty for SVG/PNG/WebP. The strip renders at
// max-h-7 (28px) so anything heavier is wasted bytes.
const MAX_BYTES = 500 * 1024;
// SVG/PNG/WebP only. No JPEG: logos shouldn't be lossy raster.
const ALLOWED = new Set<AllowedMime>(["image/svg+xml", "image/png", "image/webp"]);

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  return safeEqual(key, process.env.ADMIN_SECRET);
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();
  const { data, error } = await adminSupabase
    .from("trust_logos")
    .select("id, name, image_url, storage_path, display_order, is_active, created_at")
    .order("display_order", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(JSON.stringify({ data: data ?? [] }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

interface InsertRow {
  name: string;
  image_url: string;
  storage_path: string | null;
  display_order: number;
  is_active: boolean;
}

async function insertRow(row: InsertRow) {
  const { data, error } = await adminSupabase
    .from("trust_logos")
    .insert(row)
    .select("id, name, image_url, storage_path, display_order, is_active, created_at")
    .single();
  if (error) {
    // Best-effort: if the insert fails after a successful upload, clean up the
    // orphan file. Mirrors the hero-images recovery path.
    if (row.storage_path) {
      await removeFromStorage(BUCKET, row.storage_path).catch(() => {});
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  const contentType = (req.headers.get("content-type") ?? "").toLowerCase();

  // ── URL paste path (JSON body) ──────────────────────────────────────
  if (contentType.includes("application/json")) {
    let body: { name?: string; image_url?: string; display_order?: number; is_active?: boolean };
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    const name = (body.name ?? "").trim();
    const imageUrl = (body.image_url ?? "").trim();
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    if (!imageUrl) return NextResponse.json({ error: "image_url required" }, { status: 400 });

    // Sanity-validate the URL shape so we don't store javascript: or data: junk
    // on a public surface.
    try {
      const parsed = new URL(imageUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return NextResponse.json({ error: "image_url must be http(s)" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid image_url" }, { status: 400 });
    }

    return insertRow({
      name,
      image_url: imageUrl,
      storage_path: null,
      display_order: typeof body.display_order === "number" ? body.display_order : 0,
      is_active: typeof body.is_active === "boolean" ? body.is_active : true,
    });
  }

  // ── File upload path (multipart) ────────────────────────────────────
  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 }); }

  const name = ((form.get("name") as string | null) ?? "").trim();
  if (!name) return NextResponse.json({ error: "name field required" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const validation = await validateImageUpload({ file, allowedMimes: ALLOWED, maxBytes: MAX_BYTES });
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: validation.status });

  const ext = EXT_BY_MIME[validation.mime];
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "logo";
  const storagePath = `${slug}-${Date.now()}.${ext}`;

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

  const orderRaw = form.get("display_order") as string | null;
  const activeRaw = form.get("is_active") as string | null;
  return insertRow({
    name,
    image_url: publicUrl,
    storage_path: storagePath,
    display_order: orderRaw ? Number(orderRaw) || 0 : 0,
    is_active: activeRaw === null ? true : activeRaw !== "false",
  });
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();
  let body: {
    id?: string;
    name?: string;
    image_url?: string;
    display_order?: number;
    is_active?: boolean;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.image_url === "string") {
    const url = body.image_url.trim();
    if (url) {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return NextResponse.json({ error: "image_url must be http(s)" }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "Invalid image_url" }, { status: 400 });
      }
      patch.image_url = url;
    }
  }
  if (typeof body.display_order === "number") patch.display_order = body.display_order;
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;

  const { data, error } = await adminSupabase
    .from("trust_logos")
    .update(patch)
    .eq("id", body.id)
    .select("id, name, image_url, storage_path, display_order, is_active, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();
  let body: { id?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Fetch the row first so we know whether to delete a storage object.
  const { data: row, error: fetchError } = await adminSupabase
    .from("trust_logos")
    .select("storage_path")
    .eq("id", body.id)
    .maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only remove from Storage when this row owns a file. External URL rows have
  // storage_path = null and we leave the external host alone.
  if (row.storage_path) {
    const { error: storageError } = await adminSupabase.storage.from(BUCKET).remove([row.storage_path]);
    if (storageError) {
      // Log but don't block the DB delete — better to lose a small orphan file
      // than to leave the user stuck unable to remove a broken row.
      console.warn(`trust-logos: storage delete failed for ${row.storage_path}: ${storageError.message}`);
    }
  }

  const { error: dbError } = await adminSupabase.from("trust_logos").delete().eq("id", body.id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
