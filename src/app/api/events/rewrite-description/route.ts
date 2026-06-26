import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { sanitizeApiError } from "@/lib/security/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MODEL = "claude-haiku-4-5-20251001";
const HAIKU_INPUT_PER_1M = 1.0;   // USD
const HAIKU_OUTPUT_PER_1M = 5.0;  // USD

type Mode =
  | "polish"
  | "shorten"
  | "expand"
  | "translate_en"
  | "translate_fr"
  | "translate_es"
  | "translate_ar";

const ALLOWED_MODES = new Set<Mode>([
  "polish", "shorten", "expand",
  "translate_en", "translate_fr", "translate_es", "translate_ar",
]);

const PROMPT_BY_MODE: Record<Mode, string> = {
  polish:
    "You are an editor for ForaHub, a global SDG/development events platform. Rewrite this event description to be clear, credible, and professional. Keep the same facts. Match a senior international institutional tone — confident but not exaggerated, diplomatic where needed. Avoid clichés ('elevate', 'game-changing', overly promotional language). Keep 200-500 characters. Return ONLY the rewritten description, no commentary.",
  shorten:
    "Shorten this event description to fit 200 characters maximum while keeping the most important facts. Match professional development sector tone. Return ONLY the shortened description.",
  expand:
    "Expand this brief event description to 300-500 characters with more useful context. Don't fabricate facts not present in the original. Match professional development sector tone. Return ONLY the expanded description.",
  translate_en:
    "Translate this event description to professional English. Preserve all facts. Match international development sector tone. Return ONLY the translation.",
  translate_fr:
    "Translate this event description to French. Preserve all facts. Match professional development sector tone. Return ONLY the translation.",
  translate_es:
    "Translate this event description to Spanish. Preserve all facts. Match professional development sector tone. Return ONLY the translation.",
  translate_ar:
    "Translate this event description to Arabic. Preserve all facts. Match professional development sector tone. Return ONLY the translation.",
};

interface RewriteBody {
  text?: string;
  mode?: string;
  context?: {
    title?: string;
    sdg?: number;
    organization?: string;
  };
}

function strip(s: string): string {
  // Remove surrounding quotes / triple-backticks the model sometimes adds.
  return s
    .trim()
    .replace(/^```(?:[a-z]+)?\n?/i, "")
    .replace(/```$/, "")
    .replace(/^["'“”‘’]|["'“”‘’]$/g, "")
    .trim();
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  let body: RewriteBody;
  try {
    body = (await req.json()) as RewriteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
  if (text.length < 10) return NextResponse.json({ error: "text must be at least 10 characters" }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "text must be 2000 characters or fewer" }, { status: 400 });

  const mode = body.mode as Mode | undefined;
  if (!mode || !ALLOWED_MODES.has(mode)) {
    return NextResponse.json(
      { error: `mode required and must be one of: ${Array.from(ALLOWED_MODES).join(", ")}` },
      { status: 400 }
    );
  }

  // Optional context lines.
  const ctx = body.context ?? {};
  const ctxLines: string[] = [];
  if (ctx.title) ctxLines.push(`Event title: ${ctx.title}`);
  if (ctx.organization) ctxLines.push(`Hosting organization: ${ctx.organization}`);
  if (typeof ctx.sdg === "number" && ctx.sdg >= 1 && ctx.sdg <= 17) {
    ctxLines.push(`Primary SDG: ${ctx.sdg}`);
  }
  const ctxBlock = ctxLines.length > 0 ? `\n\nContext:\n${ctxLines.join("\n")}\n` : "";

  const userMessage = `${PROMPT_BY_MODE[mode]}${ctxBlock}\n\nDescription to rewrite:\n${text}`;

  const client = new Anthropic();
  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      messages: [{ role: "user", content: userMessage }],
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Rate limited by Anthropic. Try again shortly." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      return sanitizeApiError(err, "events/rewrite-description", 502);
    }
    return sanitizeApiError(err, "events/rewrite-description", 500);
  }

  let rewritten = "";
  for (const block of message.content) {
    if (block.type === "text") {
      rewritten += block.text;
    }
  }
  rewritten = strip(rewritten);

  if (!rewritten) {
    return NextResponse.json({ error: "Model returned an empty response" }, { status: 502 });
  }

  const cost =
    (message.usage.input_tokens / 1_000_000) * HAIKU_INPUT_PER_1M +
    (message.usage.output_tokens / 1_000_000) * HAIKU_OUTPUT_PER_1M;

  return NextResponse.json({
    rewritten_text: rewritten,
    mode,
    cost: Number(cost.toFixed(6)),
    usage: {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    },
  });
}
