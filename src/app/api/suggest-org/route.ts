import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { name, website } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  try {
    await resend.emails.send({
      from: "ForaHub <noreply@forahub.org>",
      to: "mo@forahub.org",
      subject: `[ForaHub] Organization suggestion: ${name}`,
      text: `Organization: ${name}\nWebsite: ${website || "Not provided"}`,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
