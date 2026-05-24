import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
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

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  const expected = process.env.ADMIN_SECRET;
  return !!expected && key === expected;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const eventId = ((form.get("event_id") as string | null) ?? "").trim();
  if (!eventId) return NextResponse.json({ error: "event_id field required" }, { status: 400 });

  const modeField = ((form.get("banner_display_mode") as string | null) ?? "").trim();
  const displayMode: "contain" | "cover" | null = modeField === "cover" || modeField === "contain" ? modeField : null;

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const validation = await validateImageUpload({ file, allowedMimes: ALLOWED, maxBytes: MAX_BYTES });
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: validation.status });

  // Verify event exists before uploading.
  const { data: existing, error: lookupError } = await adminSupabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const ext = EXT_BY_MIME[validation.mime];
  const storagePath = `events/event-${eventId}-${Date.now()}.${ext}`;

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

  const updatePatch: Record<string, unknown> = {
    banner_image_url: publicUrl,
    banner_fetched_at: new Date().toISOString(),
  };
  if (displayMode) updatePatch.banner_display_mode = displayMode;

  const { error: updateError } = await adminSupabase
    .from("events")
    .update(updatePatch)
    .eq("id", eventId);

  if (updateError) {
    await removeFromStorage(BUCKET, storagePath);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ banner_url: publicUrl, event_id: eventId });
}
