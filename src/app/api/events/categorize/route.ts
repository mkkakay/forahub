// Lightweight categorize endpoint used by the submit form to suggest a
// category to the user before they submit. Uses the same hybrid classifier
// as the bulk endpoint — keyword + SDG inference run inline. AI is invoked
// only when the cheap stages miss AND ANTHROPIC_API_KEY is configured.

import { NextRequest, NextResponse } from "next/server";
import { buildAnthropicClient, classifyEvent } from "@/lib/categories/classify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface RequestBody {
  title?: string;
  organization?: string | null;
  description?: string | null;
  primary_sdg?: number | null;
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const title = (body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const sdgGoals =
    typeof body.primary_sdg === "number" && body.primary_sdg >= 1 && body.primary_sdg <= 17
      ? [Math.floor(body.primary_sdg)]
      : [];

  const client = buildAnthropicClient();
  const result = await classifyEvent(
    {
      title,
      organization: body.organization ?? null,
      description: body.description ?? null,
      sdg_goals: sdgGoals,
    },
    client,
  );

  if (!result) {
    return NextResponse.json({ category: null });
  }

  return NextResponse.json({
    category: result.category,
    secondary: result.secondary,
    confidence: result.confidence,
    source: result.source,
    reasoning: result.reasoning,
  });
}
