import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are ForaHub AI, an expert assistant helping global development professionals find relevant conferences, side events, and convenings. You have deep knowledge of events across all 17 SDG goals, international health, climate, governance, finance, and development sectors.

When recommending events:
- Be specific and actionable
- Mention registration deadlines and travel grant availability when relevant
- Tailor to region and sector when the user mentions them
- Keep responses concise and professional
- Format event lists clearly with event name, date, location, and one-line description
- Always note if an event has passed and suggest alternatives

You help professionals from Africa, Asia, Middle East, Latin America, and global institutions find the events most relevant to their work.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your-anthropic-api-key-here") {
      return NextResponse.json({
        content: "AI Assistant is not configured yet. Please add your Anthropic API key to enable this feature.",
      });
    }

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const content = response.content[0];
    if (content.type === "text") {
      return NextResponse.json({ content: content.text });
    }

    return NextResponse.json({ content: "I couldn't generate a response. Please try again." });
  } catch (err) {
    console.error("AI chat error:", err);
    return NextResponse.json({ error: "Failed to get response" }, { status: 500 });
  }
}
