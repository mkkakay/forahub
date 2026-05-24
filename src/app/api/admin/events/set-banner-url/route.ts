import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  const expected = process.env.ADMIN_SECRET;
  return !!expected && key === expected;
}

async function looksLikeImageUrl(url: string): Promise<{ ok: boolean; contentType?: string; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow" });
    if (!res.ok) {
      // Some CDNs reject HEAD; fall through to a small ranged GET.
      const getRes = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-1023" },
        signal: controller.signal,
        redirect: "follow",
      });
      if (!getRes.ok) return { ok: false, error: `Host returned HTTP ${getRes.status}` };
      const ct = (getRes.headers.get("content-type") ?? "").toLowerCase();
      return { ok: ct.startsWith("image/"), contentType: ct };
    }
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    return { ok: ct.startsWith("image/"), contentType: ct };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "URL probe timed out" };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { event_id?: string; banner_url?: string; banner_display_mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventId = (body.event_id ?? "").trim();
  const bannerUrl = (body.banner_url ?? "").trim();
  if (!eventId) return NextResponse.json({ error: "event_id required" }, { status: 400 });
  if (!bannerUrl) return NextResponse.json({ error: "banner_url required" }, { status: 400 });

  const displayMode: "contain" | "cover" | null =
    body.banner_display_mode === "cover" || body.banner_display_mode === "contain"
      ? body.banner_display_mode
      : null;

  try {
    const u = new URL(bannerUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return NextResponse.json({ error: "URL must be http or https" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const probe = await looksLikeImageUrl(bannerUrl);
  if (!probe.ok) {
    return NextResponse.json(
      { error: probe.error ?? `URL does not return an image (content-type: ${probe.contentType ?? "unknown"})` },
      { status: 400 }
    );
  }

  const updatePatch: Record<string, unknown> = {
    banner_image_url: bannerUrl,
    banner_fetched_at: new Date().toISOString(),
  };
  if (displayMode) updatePatch.banner_display_mode = displayMode;

  const { error } = await adminSupabase
    .from("events")
    .update(updatePatch)
    .eq("id", eventId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ banner_url: bannerUrl, event_id: eventId });
}
