import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-haiku-4-5-20251001";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const URL_FETCH_TIMEOUT_MS = 15_000;
const MAX_HTML_TEXT = 3000;

const EXTRACTION_PROMPT = `You are extracting event information for ForaHub, a global SDG/development events platform. Extract these fields from the provided content. Respond ONLY with valid JSON, no commentary:
{
  "title": string (event name, 4-100 chars),
  "description": string (2-3 sentences, 100-500 chars, professional tone),
  "organization": string (hosting org name),
  "start_date": string (ISO 8601 with timezone if possible),
  "end_date": string (ISO 8601 or null if same day),
  "registration_deadline": string (ISO 8601) or null,
  "location": string (city, country) OR "Online",
  "is_online": boolean,
  "registration_url": string (where to register/learn more) or null,
  "primary_sdg": number (1-17, best fit) or null,
  "cost_type": "free" | "paid" | "sliding_scale" | "donor_funded" | null,
  "cost_details": string (e.g., "$50 USD", "Free for low-income countries") or null,
  "target_audience": array of strings from this set or null: ["all", "researchers", "government", "civil_society", "private_sector", "youth", "donors", "invite_only"],
  "co_organizers": string (comma-separated partner org names) or null,
  "speakers": string (newline or comma separated featured speakers) or null,
  "event_languages": array of ISO 639-1 codes (e.g., ["en", "fr"]) or null,
  "confidence": "high" | "medium" | "low"
}
If you can't find a field, set it to null. Don't fabricate. Set confidence based on how much was explicit in the source.`;

interface ExtractedFields {
  title: string | null;
  description: string | null;
  organization: string | null;
  start_date: string | null;
  end_date: string | null;
  registration_deadline: string | null;
  location: string | null;
  is_online: boolean | null;
  registration_url: string | null;
  primary_sdg: number | null;
  cost_type: "free" | "paid" | "sliding_scale" | "donor_funded" | null;
  cost_details: string | null;
  target_audience: string[] | null;
  co_organizers: string | null;
  speakers: string | null;
  event_languages: string[] | null;
  confidence: "high" | "medium" | "low";
}

function extractFirstText(message: Anthropic.Message): string {
  for (const block of message.content) {
    if (block.type === "text") return block.text;
  }
  return "";
}

const ALLOWED_AUDIENCE = new Set([
  "all", "researchers", "government", "civil_society",
  "private_sector", "youth", "donors", "invite_only",
]);
const ALLOWED_COST_TYPES = new Set(["free", "paid", "sliding_scale", "donor_funded"]);

function parseExtraction(raw: string): ExtractedFields | null {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Partial<ExtractedFields>;
    const audience = Array.isArray(parsed.target_audience)
      ? (parsed.target_audience.filter(
          (a): a is string => typeof a === "string" && ALLOWED_AUDIENCE.has(a)
        ))
      : null;
    const langs = Array.isArray(parsed.event_languages)
      ? parsed.event_languages.filter((l): l is string => typeof l === "string" && l.length > 0)
      : null;
    return {
      title: typeof parsed.title === "string" ? parsed.title : null,
      description: typeof parsed.description === "string" ? parsed.description : null,
      organization: typeof parsed.organization === "string" ? parsed.organization : null,
      start_date: typeof parsed.start_date === "string" ? parsed.start_date : null,
      end_date: typeof parsed.end_date === "string" ? parsed.end_date : null,
      registration_deadline: typeof parsed.registration_deadline === "string" ? parsed.registration_deadline : null,
      location: typeof parsed.location === "string" ? parsed.location : null,
      is_online: typeof parsed.is_online === "boolean" ? parsed.is_online : null,
      registration_url: typeof parsed.registration_url === "string" ? parsed.registration_url : null,
      primary_sdg:
        typeof parsed.primary_sdg === "number" && parsed.primary_sdg >= 1 && parsed.primary_sdg <= 17
          ? parsed.primary_sdg
          : null,
      cost_type:
        typeof parsed.cost_type === "string" && ALLOWED_COST_TYPES.has(parsed.cost_type)
          ? (parsed.cost_type as ExtractedFields["cost_type"])
          : null,
      cost_details: typeof parsed.cost_details === "string" ? parsed.cost_details : null,
      target_audience: audience && audience.length > 0 ? audience : null,
      co_organizers: typeof parsed.co_organizers === "string" ? parsed.co_organizers : null,
      speakers: typeof parsed.speakers === "string" ? parsed.speakers : null,
      event_languages: langs && langs.length > 0 ? langs : null,
      confidence:
        parsed.confidence === "high" || parsed.confidence === "low" ? parsed.confidence : "medium",
    };
  } catch {
    return null;
  }
}

function sniffMime(buf: Buffer): "image/jpeg" | "image/png" | "image/webp" | "application/pdf" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf"; // "%PDF"
  return null;
}

function stripHtml(html: string): { title: string | null; description: string | null; ogImage: string | null; text: string } {
  const headChunk = html.slice(0, 200_000);
  const tag = (re: RegExp): string | null => {
    const m = headChunk.match(re);
    return m ? m[1] : null;
  };
  const titleTag = tag(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const ogTitle = tag(/<meta\s+[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  const ogDesc = tag(/<meta\s+[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  const metaDesc = tag(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const ogImage = tag(/<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);

  // Remove scripts/styles/nav, then strip all tags, collapse whitespace.
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    title: ogTitle ?? titleTag ?? null,
    description: ogDesc ?? metaDesc ?? null,
    ogImage: ogImage ?? null,
    text: cleaned.slice(0, MAX_HTML_TEXT),
  };
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const contentType = (req.headers.get("content-type") ?? "").toLowerCase();
  const client = new Anthropic();

  try {
    if (contentType.includes("multipart/form-data")) {
      // ── File path: image or PDF ────────────────────────────────────
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      if (file.size === 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: `File exceeds 10MB (${(file.size / 1024 / 1024).toFixed(2)}MB)` },
          { status: 413 }
        );
      }

      const buf = Buffer.from(await file.arrayBuffer());
      const mime = sniffMime(buf);
      if (!mime) {
        return NextResponse.json(
          { error: "File must be a JPG, PNG, WebP, or PDF" },
          { status: 415 }
        );
      }

      const base64 = buf.toString("base64");
      const sourceBlock: Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam =
        mime === "application/pdf"
          ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
          : { type: "image", source: { type: "base64", media_type: mime, data: base64 } };

      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: [sourceBlock, { type: "text", text: EXTRACTION_PROMPT }],
          },
        ],
      });

      const extracted = parseExtraction(extractFirstText(message));
      if (!extracted) {
        return NextResponse.json({ error: "Model returned unparseable output" }, { status: 502 });
      }
      return NextResponse.json({
        data: extracted,
        source_type: mime === "application/pdf" ? "pdf" : "image",
        usage: { input_tokens: message.usage.input_tokens, output_tokens: message.usage.output_tokens },
      });
    }

    if (contentType.includes("application/json")) {
      const body = (await req.json()) as { source_url?: string; text?: string };

      // ── Text path: caller provides raw event text directly ───────
      if (typeof body.text === "string" && body.text.trim().length > 0) {
        const text = body.text.trim().slice(0, 8000); // cap input
        const message = await client.messages.create({
          model: MODEL,
          max_tokens: 800,
          messages: [
            {
              role: "user",
              content: `${EXTRACTION_PROMPT}\n\n---\nPasted event details:\n${text}`,
            },
          ],
        });
        const extracted = parseExtraction(extractFirstText(message));
        if (!extracted) {
          return NextResponse.json({ error: "Model returned unparseable output" }, { status: 502 });
        }
        return NextResponse.json({
          data: extracted,
          source_type: "text",
          usage: { input_tokens: message.usage.input_tokens, output_tokens: message.usage.output_tokens },
        });
      }

      // ── URL path ──────────────────────────────────────────────────
      const sourceUrl = (body.source_url ?? "").trim();
      if (!sourceUrl) return NextResponse.json({ error: "source_url or text required" }, { status: 400 });

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(sourceUrl);
      } catch {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
      }
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return NextResponse.json({ error: "URL must be http(s)" }, { status: 400 });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);

      let html: string;
      try {
        const res = await fetch(sourceUrl, {
          signal: controller.signal,
          redirect: "follow",
          headers: {
            // Realistic desktop Chrome UA — many institutional sites (afdb.org,
            // un.org, who.int, university calendars) hard-block the Node default UA.
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });
        if (!res.ok) {
          // Return HTTP 200 with a structured fetch_blocked payload so the
          // client UI can show the paste-text fallback without treating this
          // as an unexpected error.
          return NextResponse.json({
            error: "fetch_blocked",
            message: `Page returned HTTP ${res.status}`,
            status_code: res.status,
            allow_paste: true,
          });
        }
        const ct = (res.headers.get("content-type") ?? "").toLowerCase();
        if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
          return NextResponse.json({
            error: "fetch_blocked",
            message: `URL returned non-HTML content (${ct || "unknown"})`,
            status_code: 415,
            allow_paste: true,
          });
        }
        html = await res.text();
      } catch (err) {
        const isTimeout = err instanceof Error && err.name === "AbortError";
        return NextResponse.json({
          error: "fetch_blocked",
          message: isTimeout ? "Page fetch timed out" : `Page fetch failed: ${err instanceof Error ? err.message : String(err)}`,
          status_code: isTimeout ? 408 : 0,
          allow_paste: true,
        });
      } finally {
        clearTimeout(timeout);
      }

      const stripped = stripHtml(html);
      const condensed = [
        `URL: ${sourceUrl}`,
        stripped.title ? `Page title: ${stripped.title}` : null,
        stripped.description ? `Meta description: ${stripped.description}` : null,
        stripped.ogImage ? `og:image URL: ${stripped.ogImage}` : null,
        "",
        "Body text:",
        stripped.text,
      ]
        .filter(Boolean)
        .join("\n");

      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: `${EXTRACTION_PROMPT}\n\n---\n${condensed}`,
          },
        ],
      });

      const extracted = parseExtraction(extractFirstText(message));
      if (!extracted) {
        return NextResponse.json({ error: "Model returned unparseable output" }, { status: 502 });
      }
      // If the model didn't pick up a registration URL, default to the source URL.
      if (!extracted.registration_url) extracted.registration_url = sourceUrl;
      return NextResponse.json({
        data: extracted,
        source_type: "url",
        source_url: sourceUrl,
        og_image: stripped.ogImage,
        usage: { input_tokens: message.usage.input_tokens, output_tokens: message.usage.output_tokens },
      });
    }

    return NextResponse.json(
      { error: "Use multipart/form-data with a file or application/json with source_url" },
      { status: 400 }
    );
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Rate limited by Anthropic. Try again shortly." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Anthropic API error: ${err.message}` }, { status: 502 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
