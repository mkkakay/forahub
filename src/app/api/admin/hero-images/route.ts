import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "hero-images";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png"]);

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  const expected = process.env.ADMIN_SECRET;
  return !!expected && key === expected;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  const { data, error } = await adminSupabase
    .from("hero_images")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

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
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File exceeds 5MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)` },
      { status: 400 }
    );
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported type ${file.type || "unknown"}. Use JPG or PNG.` },
      { status: 400 }
    );
  }

  const title = (form.get("title") as string | null) || null;
  const subtitle = (form.get("subtitle") as string | null) || null;
  const cta_text = (form.get("cta_text") as string | null) || null;
  const cta_url = (form.get("cta_url") as string | null) || null;
  const displayOrderRaw = form.get("display_order") as string | null;
  const display_order = displayOrderRaw ? Number(displayOrderRaw) || 0 : 0;

  const ext = file.type === "image/png" ? "png" : "jpg";
  const storage_path = `hero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const buf = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await adminSupabase.storage
    .from(BUCKET)
    .upload(storage_path, buf, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}. Make sure the "${BUCKET}" bucket exists and is public.` },
      { status: 500 }
    );
  }

  const { data: urlData } = adminSupabase.storage.from(BUCKET).getPublicUrl(storage_path);
  const public_url = urlData.publicUrl;

  const { data, error: insertError } = await adminSupabase
    .from("hero_images")
    .insert({
      storage_path,
      public_url,
      title,
      subtitle,
      cta_text,
      cta_url,
      display_order,
      is_active: true,
    })
    .select()
    .single();

  if (insertError) {
    await adminSupabase.storage.from(BUCKET).remove([storage_path]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  let body: {
    id?: string;
    title?: string | null;
    subtitle?: string | null;
    cta_text?: string | null;
    cta_url?: string | null;
    display_order?: number;
    is_active?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if ("title" in body) patch.title = body.title;
  if ("subtitle" in body) patch.subtitle = body.subtitle;
  if ("cta_text" in body) patch.cta_text = body.cta_text;
  if ("cta_url" in body) patch.cta_url = body.cta_url;
  if (typeof body.display_order === "number") patch.display_order = body.display_order;
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;

  const { data, error } = await adminSupabase
    .from("hero_images")
    .update(patch)
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { data: row, error: fetchError } = await adminSupabase
    .from("hero_images")
    .select("storage_path")
    .eq("id", body.id)
    .single();

  if (fetchError || !row) {
    return NextResponse.json({ error: fetchError?.message ?? "Not found" }, { status: 404 });
  }

  const { error: storageError } = await adminSupabase.storage
    .from(BUCKET)
    .remove([row.storage_path]);

  if (storageError) {
    console.warn(`hero-images: storage delete failed for ${row.storage_path}: ${storageError.message}`);
  }

  const { error: dbError } = await adminSupabase
    .from("hero_images")
    .delete()
    .eq("id", body.id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
