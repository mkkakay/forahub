import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "hero-images";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const FETCH_TIMEOUT_MS = 15_000;

function sniffMime(buf: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "image/png";
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  return null;
}

const KNOWN_IMAGE_CDN_HOSTS = [
  /^images\.unsplash\.com$/i,
  /^images\.pexels\.com$/i,
  /^cdn\.pixabay\.com$/i,
];

function isKnownImageCdn(hostname: string): boolean {
  return KNOWN_IMAGE_CDN_HOSTS.some(re => re.test(hostname));
}

function pathnameHasImageExt(pathname: string): boolean {
  return /\.(jpe?g|png|webp)$/i.test(pathname);
}

function looksLikeDirectImage(u: URL): boolean {
  return isKnownImageCdn(u.hostname) || pathnameHasImageExt(u.pathname);
}

function pickExtensionFromMime(mime: string): "jpg" | "png" | "webp" {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 ForaHubAdmin/1.0 (+hero-image-fetch)",
        Accept: "image/*,text/html,*/*;q=0.5",
        ...(init?.headers ?? {}),
      },
      redirect: "follow",
    });
  } finally {
    clearTimeout(t);
  }
}

function parseOgImageFromHtml(html: string, baseUrl: string): string | null {
  const headChunk = html.slice(0, 200_000);
  const re = /<meta\s+[^>]*?(?:property|name)\s*=\s*["']([^"']+)["'][^>]*?content\s*=\s*["']([^"']+)["'][^>]*>/gi;
  const reAlt = /<meta\s+[^>]*?content\s*=\s*["']([^"']+)["'][^>]*?(?:property|name)\s*=\s*["']([^"']+)["'][^>]*>/gi;
  const candidates: { key: string; value: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(headChunk))) candidates.push({ key: m[1].toLowerCase(), value: m[2] });
  while ((m = reAlt.exec(headChunk))) candidates.push({ key: m[2].toLowerCase(), value: m[1] });
  const preference = ["og:image:secure_url", "og:image:url", "og:image", "twitter:image", "twitter:image:src"];
  for (const key of preference) {
    const hit = candidates.find(c => c.key === key);
    if (hit?.value) {
      try {
        return new URL(hit.value, baseUrl).toString();
      } catch {
        return null;
      }
    }
  }
  return null;
}

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

async function persistImage({
  buf,
  mime,
  title,
  subtitle,
  cta_text,
  cta_url,
  display_order,
}: {
  buf: Buffer;
  mime: "image/jpeg" | "image/png" | "image/webp";
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_url: string | null;
  display_order: number;
}) {
  const ext = pickExtensionFromMime(mime);
  const storage_path = `hero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await adminSupabase.storage
    .from(BUCKET)
    .upload(storage_path, buf, { contentType: mime, upsert: false });

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

async function handleUrlUpload(req: NextRequest) {
  let body: {
    source_url?: string;
    title?: string | null;
    subtitle?: string | null;
    cta_text?: string | null;
    cta_url?: string | null;
    display_order?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sourceUrl = (body.source_url ?? "").trim();
  if (!sourceUrl) {
    return NextResponse.json({ error: "source_url required" }, { status: 400 });
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return NextResponse.json({ error: "URL must use http or https" }, { status: 400 });
  }

  let imageRes: Response;
  try {
    // First, fetch the original URL — either it IS the image, or it's an HTML page we
    // can extract the image URL from. We make this single round-trip work for both.
    const firstRes = await fetchWithTimeout(sourceUrl);
    if (!firstRes.ok) {
      return NextResponse.json(
        { error: `Host returned HTTP ${firstRes.status}` },
        { status: 502 }
      );
    }

    const firstCt = (firstRes.headers.get("content-type") ?? "").toLowerCase().split(";")[0].trim();
    const firstIsImage = firstCt.startsWith("image/");
    const firstIsHtml = firstCt.includes("text/html") || firstCt.includes("application/xhtml");

    // Treat as direct image if: hostname is a known CDN, OR pathname has an image ext,
    // OR the actual Content-Type is image/*.
    if (looksLikeDirectImage(parsedUrl) || firstIsImage) {
      imageRes = firstRes;
    } else if (firstIsHtml) {
      // Parse og:image from the body we already have — no second fetch of the page.
      const html = await firstRes.text();
      const resolved = parseOgImageFromHtml(html, sourceUrl);
      if (!resolved) {
        return NextResponse.json(
          { error: "Could not find an og:image / twitter:image on that page. Paste the direct image URL instead." },
          { status: 400 }
        );
      }
      imageRes = await fetchWithTimeout(resolved);
      if (!imageRes.ok) {
        return NextResponse.json(
          { error: `Image host returned HTTP ${imageRes.status}` },
          { status: 502 }
        );
      }
    } else {
      return NextResponse.json(
        { error: `Unrecognized response type: ${firstCt || "unknown"}. Paste a direct image URL.` },
        { status: 400 }
      );
    }
  } catch (err) {
    const msg = err instanceof Error && err.name === "AbortError"
      ? "Image fetch timed out after 15s"
      : `Image fetch failed: ${err instanceof Error ? err.message : String(err)}`;
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const contentLengthHeader = imageRes.headers.get("content-length");
  if (contentLengthHeader && Number(contentLengthHeader) > MAX_BYTES) {
    return NextResponse.json(
      { error: `Image exceeds 5MB limit (${(Number(contentLengthHeader) / 1024 / 1024).toFixed(2)}MB)` },
      { status: 413 }
    );
  }

  const declaredMime = (imageRes.headers.get("content-type") ?? "").toLowerCase().split(";")[0].trim();
  const buf = Buffer.from(await imageRes.arrayBuffer());

  if (buf.length === 0) {
    return NextResponse.json({ error: "Fetched image is empty" }, { status: 400 });
  }
  if (buf.length > MAX_BYTES) {
    return NextResponse.json(
      { error: `Image exceeds 5MB limit (${(buf.length / 1024 / 1024).toFixed(2)}MB)` },
      { status: 413 }
    );
  }

  const sniffed = sniffMime(buf);
  if (!sniffed) {
    return NextResponse.json(
      { error: `Fetched bytes don't look like a JPG, PNG, or WebP. Declared type: ${declaredMime || "unknown"}` },
      { status: 415 }
    );
  }
  if (declaredMime && ALLOWED_MIME.has(declaredMime) && declaredMime !== sniffed && !(declaredMime === "image/jpg" && sniffed === "image/jpeg")) {
    console.warn(`hero-images: declared MIME ${declaredMime} disagrees with sniffed ${sniffed}; trusting sniff`);
  }
  if (declaredMime && !ALLOWED_MIME.has(declaredMime) && declaredMime !== "application/octet-stream") {
    return NextResponse.json(
      { error: `Unsupported declared type ${declaredMime}. Use JPG, PNG, or WebP.` },
      { status: 415 }
    );
  }

  return persistImage({
    buf,
    mime: sniffed,
    title: (body.title ?? null) || null,
    subtitle: (body.subtitle ?? null) || null,
    cta_text: (body.cta_text ?? null) || null,
    cta_url: (body.cta_url ?? null) || null,
    display_order: typeof body.display_order === "number" ? body.display_order : 0,
  });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  const contentType = (req.headers.get("content-type") ?? "").toLowerCase();
  if (contentType.includes("application/json")) {
    return handleUrlUpload(req);
  }

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
      { error: `Unsupported type ${file.type || "unknown"}. Use JPG, PNG, or WebP.` },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffMime(buf);
  if (!sniffed) {
    return NextResponse.json(
      { error: "File contents don't match a JPG, PNG, or WebP." },
      { status: 400 }
    );
  }

  const title = (form.get("title") as string | null) || null;
  const subtitle = (form.get("subtitle") as string | null) || null;
  const cta_text = (form.get("cta_text") as string | null) || null;
  const cta_url = (form.get("cta_url") as string | null) || null;
  const displayOrderRaw = form.get("display_order") as string | null;
  const display_order = displayOrderRaw ? Number(displayOrderRaw) || 0 : 0;

  return persistImage({
    buf,
    mime: sniffed,
    title,
    subtitle,
    cta_text,
    cta_url,
    display_order,
  });
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
