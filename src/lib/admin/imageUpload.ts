import { adminSupabase } from "@/lib/supabase/admin";

export type AllowedMime = "image/jpeg" | "image/png" | "image/webp" | "image/svg+xml";

const BINARY_MAGIC: Array<[AllowedMime, (b: Buffer) => boolean]> = [
  ["image/jpeg", b => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  ["image/png",  b => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a],
  ["image/webp", b => b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50],
];

export const EXT_BY_MIME: Record<AllowedMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

function normalizeDeclaredType(t: string): string {
  return t === "image/jpg" ? "image/jpeg" : t;
}

/**
 * Sniff a real image MIME from the file bytes. SVG is checked as text;
 * everything else via magic-byte signatures. Returns null if the bytes
 * don't match anything we accept.
 */
export function sniffImageMime(buf: Buffer, declaredType: string): AllowedMime | null {
  const declared = normalizeDeclaredType(declaredType);
  if (declared === "image/svg+xml") {
    const head = buf.subarray(0, 512).toString("utf8").trimStart().toLowerCase();
    if (head.startsWith("<svg") || head.startsWith("<?xml")) return "image/svg+xml";
    return null;
  }
  for (const [mime, check] of BINARY_MAGIC) {
    if (check(buf)) return mime;
  }
  return null;
}

export interface ValidateImageInput {
  file: File;
  allowedMimes: Set<AllowedMime>;
  maxBytes: number;
}

export type ValidateImageResult =
  | { ok: true; buf: Buffer; mime: AllowedMime }
  | { ok: false; error: string; status: number };

export async function validateImageUpload(input: ValidateImageInput): Promise<ValidateImageResult> {
  const { file, allowedMimes, maxBytes } = input;
  if (file.size === 0) return { ok: false, error: "File is empty", status: 400 };
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `File exceeds ${(maxBytes / 1024 / 1024).toFixed(1)}MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
      status: 413,
    };
  }
  const declared = normalizeDeclaredType(file.type);
  if (!allowedMimes.has(declared as AllowedMime)) {
    return {
      ok: false,
      error: `Unsupported type ${file.type || "unknown"}. Allowed: ${Array.from(allowedMimes).join(", ")}`,
      status: 415,
    };
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageMime(buf, declared);
  if (!sniffed) {
    return { ok: false, error: "File contents don't match a supported image format", status: 415 };
  }
  if (!allowedMimes.has(sniffed)) {
    return { ok: false, error: `Sniffed type ${sniffed} is not allowed here.`, status: 415 };
  }
  return { ok: true, buf, mime: sniffed };
}

export interface UploadToStorageInput {
  bucket: string;
  storagePath: string;
  buf: Buffer;
  contentType: AllowedMime;
}

export async function uploadToStorage(input: UploadToStorageInput): Promise<{ publicUrl: string; storagePath: string }> {
  const { error } = await adminSupabase.storage
    .from(input.bucket)
    .upload(input.storagePath, input.buf, {
      contentType: input.contentType,
      upsert: false,
    });
  if (error) {
    throw new Error(
      `Storage upload failed: ${error.message}. Confirm the "${input.bucket}" bucket exists and is public.`
    );
  }
  const { data } = adminSupabase.storage.from(input.bucket).getPublicUrl(input.storagePath);
  return { publicUrl: data.publicUrl, storagePath: input.storagePath };
}

export async function removeFromStorage(bucket: string, path: string): Promise<void> {
  await adminSupabase.storage.from(bucket).remove([path]);
}
