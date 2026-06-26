import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { safeEqual } from "@/lib/security/timing";
import { sanitizeApiError } from "@/lib/security/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-haiku-4-5-20251001";

const COMMON_INSTRUCTIONS = `You are writing overlay text for a hero image on ForaHub, a global events discovery platform for the UN Sustainable Development Goals (SDGs). The audience is development professionals, NGOs, UN staff, and researchers tracking events across all 17 SDGs.

Generate:
- title: 4-8 words, evocative, action-oriented (NOT a description of the image)
- subtitle: 8-15 words, expanding on the title with a clear value proposition
- cta_text: 2-4 words, action verb (e.g., 'Explore Events', 'Browse Summits', 'Find Forums')

Respond ONLY with valid JSON in this exact shape: {"title":"...","subtitle":"...","cta_text":"..."}
Do not add commentary, markdown fences, or any text outside the JSON object.`;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  return safeEqual(key, process.env.ADMIN_SECRET);
}

function extractFirstText(message: Anthropic.Message): string {
  for (const block of message.content) {
    if (block.type === "text") return block.text;
  }
  return "";
}

function parseSuggestion(raw: string): {
  title: string;
  subtitle: string;
  cta_text: string;
} | null {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) return null;
  const sliced = trimmed.slice(start, end + 1);
  try {
    const parsed = JSON.parse(sliced);
    if (
      typeof parsed?.title === "string" &&
      typeof parsed?.subtitle === "string" &&
      typeof parsed?.cta_text === "string"
    ) {
      return {
        title: parsed.title.trim(),
        subtitle: parsed.subtitle.trim(),
        cta_text: parsed.cta_text.trim(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchImageAsBase64(url: string): Promise<{
  data: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
} | null> {
  if (url.startsWith("data:")) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    const mt = match[1].toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mt)) return null;
    return { data: match[2], mediaType: mt as "image/jpeg" | "image/png" | "image/webp" | "image/gif" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    const mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null =
      ct.includes("image/jpeg") || ct.includes("image/jpg") ? "image/jpeg" :
      ct.includes("image/png") ? "image/png" :
      ct.includes("image/webp") ? "image/webp" :
      ct.includes("image/gif") ? "image/gif" : null;
    if (!mediaType) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 8 * 1024 * 1024) return null;
    return { data: buf.toString("base64"), mediaType };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  let body: { mode?: string; image_url?: string; topic?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const client = new Anthropic();

  let message: Anthropic.Message;
  try {
    if (body.mode === "image") {
      if (!body.image_url || typeof body.image_url !== "string") {
        return NextResponse.json({ error: "image_url required for mode=image" }, { status: 400 });
      }

      const img = await fetchImageAsBase64(body.image_url);
      if (!img) {
        return NextResponse.json(
          { error: "Could not load image. Use a direct JPG/PNG/WebP URL or a data URL under 8MB." },
          { status: 400 }
        );
      }

      message = await client.messages.create({
        model: MODEL,
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: img.mediaType, data: img.data },
              },
              {
                type: "text",
                text: `${COMMON_INSTRUCTIONS}\n\nLook at this image and write overlay text that ties it to ForaHub's mission of connecting development professionals to SDG events.`,
              },
            ],
          },
        ],
      });
    } else if (body.mode === "topic") {
      const topic = (body.topic ?? "").toString().trim();
      if (!topic) {
        return NextResponse.json({ error: "topic required for mode=topic" }, { status: 400 });
      }
      if (topic.length > 500) {
        return NextResponse.json({ error: "topic must be under 500 characters" }, { status: 400 });
      }

      message = await client.messages.create({
        model: MODEL,
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: `${COMMON_INSTRUCTIONS}\n\nThe admin specified this topic: "${topic}"\n\nWrite overlay text aligned to ForaHub's mission and this topic.`,
          },
        ],
      });
    } else {
      return NextResponse.json({ error: "mode must be 'image' or 'topic'" }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Rate limited by Anthropic. Try again in a moment." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      return sanitizeApiError(err, "admin/hero-images/suggest-text", 502);
    }
    return sanitizeApiError(err, "admin/hero-images/suggest-text", 500);
  }

  const raw = extractFirstText(message);
  const parsed = parseSuggestion(raw);
  if (!parsed) {
    return NextResponse.json(
      { error: "Model returned unparseable output", raw },
      { status: 502 }
    );
  }

  return NextResponse.json({
    data: parsed,
    usage: {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    },
  });
}
