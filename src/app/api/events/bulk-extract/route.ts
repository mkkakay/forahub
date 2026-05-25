import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-haiku-4-5-20251001";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const URL_FETCH_TIMEOUT_MS = 15_000;
const MAX_CONTENT_CHARS = 30_000;
const MAX_EVENTS = 50;

const BULK_PROMPT = `You are extracting MULTIPLE events from a document/list for ForaHub, a global development events platform. Identify each distinct event and return a JSON array of events. Each event has these fields:
{
  "title": string,
  "description": string (50-300 chars),
  "organization": string or null,
  "start_date": string (ISO 8601) or null,
  "end_date": string (ISO 8601) or null,
  "location": string or null,
  "is_online": boolean,
  "registration_url": string or null,
  "primary_sdg": number (1-17) or null,
  "confidence": "high" | "medium" | "low"
}

Return ONLY a JSON array, no commentary, no markdown fences. If you can't detect any distinct events, return an empty array [].
Hard limit: maximum ${MAX_EVENTS} events. If source has more, return the first ${MAX_EVENTS} with confidence='low'.`;

interface BulkEvent {
  title: string;
  description: string | null;
  organization: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  is_online: boolean;
  registration_url: string | null;
  primary_sdg: number | null;
  confidence: "high" | "medium" | "low";
}

type SourceType = "text" | "url" | "pdf" | "docx" | "csv" | "xlsx" | "txt" | "image";

function extractFirstText(message: Anthropic.Message): string {
  for (const block of message.content) {
    if (block.type === "text") return block.text;
  }
  return "";
}

function parseEventsArray(raw: string): BulkEvent[] | null {
  const trimmed = raw.trim();
  // Strip optional markdown fences.
  const cleaned = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start < 0 || end < 0 || end <= start) return null;

  let arr: unknown;
  try {
    arr = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!Array.isArray(arr)) return null;

  const events: BulkEvent[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const title = typeof r.title === "string" ? r.title.trim() : "";
    if (!title) continue; // title is required
    events.push({
      title: title.slice(0, 200),
      description: typeof r.description === "string" ? r.description.trim().slice(0, 500) : null,
      organization: typeof r.organization === "string" && r.organization.trim() ? r.organization.trim() : null,
      start_date: typeof r.start_date === "string" && r.start_date.trim() ? r.start_date.trim() : null,
      end_date: typeof r.end_date === "string" && r.end_date.trim() ? r.end_date.trim() : null,
      location: typeof r.location === "string" && r.location.trim() ? r.location.trim() : null,
      is_online: typeof r.is_online === "boolean" ? r.is_online : false,
      registration_url:
        typeof r.registration_url === "string" && r.registration_url.trim() ? r.registration_url.trim() : null,
      primary_sdg:
        typeof r.primary_sdg === "number" && r.primary_sdg >= 1 && r.primary_sdg <= 17
          ? Math.floor(r.primary_sdg)
          : null,
      confidence:
        r.confidence === "high" || r.confidence === "low" ? r.confidence : "medium",
    });
    if (events.length >= MAX_EVENTS) break;
  }
  return events;
}

function csvBufferToText(buf: Buffer): string {
  // Lightweight CSV → readable text. We don't need true CSV parsing; we just need
  // the model to see rows. Trim BOM, normalize newlines.
  let s = buf.toString("utf-8").replace(/^﻿/, "");
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return s;
}

function xlsxBufferToText(buf: Buffer): string {
  const workbook = XLSX.read(buf, { type: "buffer" });
  const out: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    out.push(`# Sheet: ${sheetName}`);
    const csv = XLSX.utils.sheet_to_csv(sheet);
    out.push(csv);
    out.push("");
  }
  return out.join("\n");
}

async function docxBufferToText(buf: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer: buf });
  return result.value ?? "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function sniffMime(buf: Buffer): "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | "zip" | null {
  if (buf.length < 4) return null;
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  if (buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)) return "zip";
  return null;
}

function classifyByName(name: string): SourceType | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "xlsx";
  if (lower.endsWith(".txt") || lower.endsWith(".md")) return "txt";
  return null;
}

async function runBulkExtractionFromText(
  client: Anthropic,
  text: string
): Promise<{ events: BulkEvent[]; truncated: boolean; usage: { input_tokens: number; output_tokens: number } }> {
  const truncated = text.length > MAX_CONTENT_CHARS;
  const content = truncated ? text.slice(0, MAX_CONTENT_CHARS) : text;
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `${BULK_PROMPT}\n\n---\nContent:\n${content}`,
      },
    ],
  });
  const events = parseEventsArray(extractFirstText(message)) ?? [];
  return {
    events,
    truncated,
    usage: { input_tokens: message.usage.input_tokens, output_tokens: message.usage.output_tokens },
  };
}

async function runBulkExtractionFromPdf(
  client: Anthropic,
  pdfBase64: string
): Promise<{ events: BulkEvent[]; usage: { input_tokens: number; output_tokens: number } }> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
          { type: "text", text: BULK_PROMPT },
        ],
      },
    ],
  });
  const events = parseEventsArray(extractFirstText(message)) ?? [];
  return {
    events,
    usage: { input_tokens: message.usage.input_tokens, output_tokens: message.usage.output_tokens },
  };
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const contentType = (req.headers.get("content-type") ?? "").toLowerCase();
  const client = new Anthropic();

  try {
    // ── File path ────────────────────────────────────────────────────
    if (contentType.includes("multipart/form-data")) {
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
      const byName = classifyByName(file.name ?? "");

      // PDF → send straight to Claude.
      if (mime === "application/pdf" || byName === "pdf") {
        const { events, usage } = await runBulkExtractionFromPdf(client, buf.toString("base64"));
        return NextResponse.json({
          events,
          detected_count: events.length,
          source_type: "pdf" as SourceType,
          truncated: false,
          usage,
        });
      }

      // DOCX → mammoth → text.
      if (byName === "docx") {
        const text = await docxBufferToText(buf);
        if (!text.trim()) {
          return NextResponse.json({ error: "Could not extract text from DOCX" }, { status: 422 });
        }
        const r = await runBulkExtractionFromText(client, text);
        return NextResponse.json({
          events: r.events,
          detected_count: r.events.length,
          source_type: "docx" as SourceType,
          truncated: r.truncated,
          usage: r.usage,
        });
      }

      // CSV.
      if (byName === "csv") {
        const text = csvBufferToText(buf);
        if (!text.trim()) {
          return NextResponse.json({ error: "Could not read CSV content" }, { status: 422 });
        }
        const r = await runBulkExtractionFromText(client, text);
        return NextResponse.json({
          events: r.events,
          detected_count: r.events.length,
          source_type: "csv" as SourceType,
          truncated: r.truncated,
          usage: r.usage,
        });
      }

      // XLSX.
      if (byName === "xlsx") {
        const text = xlsxBufferToText(buf);
        if (!text.trim()) {
          return NextResponse.json({ error: "Could not read spreadsheet content" }, { status: 422 });
        }
        const r = await runBulkExtractionFromText(client, text);
        return NextResponse.json({
          events: r.events,
          detected_count: r.events.length,
          source_type: "xlsx" as SourceType,
          truncated: r.truncated,
          usage: r.usage,
        });
      }

      // Plain text / markdown.
      if (byName === "txt") {
        const text = buf.toString("utf-8");
        const r = await runBulkExtractionFromText(client, text);
        return NextResponse.json({
          events: r.events,
          detected_count: r.events.length,
          source_type: "txt" as SourceType,
          truncated: r.truncated,
          usage: r.usage,
        });
      }

      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, DOCX, CSV, XLSX, or TXT." },
        { status: 415 }
      );
    }

    // ── JSON paths (text or URL) ─────────────────────────────────────
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as { text?: string; url?: string };

      if (typeof body.text === "string" && body.text.trim().length > 0) {
        const r = await runBulkExtractionFromText(client, body.text);
        return NextResponse.json({
          events: r.events,
          detected_count: r.events.length,
          source_type: "text" as SourceType,
          truncated: r.truncated,
          usage: r.usage,
        });
      }

      const sourceUrl = (body.url ?? "").trim();
      if (!sourceUrl) {
        return NextResponse.json({ error: "Provide `text` or `url`" }, { status: 400 });
      }

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
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });
        if (!res.ok) {
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
          message: isTimeout
            ? "Page fetch timed out"
            : `Page fetch failed: ${err instanceof Error ? err.message : String(err)}`,
          status_code: isTimeout ? 408 : 0,
          allow_paste: true,
        });
      } finally {
        clearTimeout(timeout);
      }

      const text = `URL: ${sourceUrl}\n\n${stripHtml(html)}`;
      const r = await runBulkExtractionFromText(client, text);
      return NextResponse.json({
        events: r.events,
        detected_count: r.events.length,
        source_type: "url" as SourceType,
        source_url: sourceUrl,
        truncated: r.truncated,
        usage: r.usage,
      });
    }

    return NextResponse.json(
      { error: "Use multipart/form-data with a file, or application/json with text/url" },
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
