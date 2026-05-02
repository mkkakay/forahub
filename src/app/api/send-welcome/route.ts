import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ ok: true });

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://forahub.org";

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "ForaHub <hello@forahub.org>",
      to: email,
      subject: "Welcome to ForaHub — your 7-day Pro trial has started",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0f2a4a;padding:32px;border-radius:12px">
          <h1 style="color:#4ea8de;margin-top:0">Fora<span style="color:#ffffff">Hub</span></h1>
          <h2 style="color:#ffffff">Welcome to ForaHub!</h2>
          <p style="color:#bfdbfe">You now have free access to the full 24-month global SDG events calendar —
          conferences, side events, webinars, and convenings across all 17 Sustainable Development Goals.</p>
          <p style="color:#bfdbfe">Your 7-day Pro trial gives you full access to:</p>
          <ul style="color:#93c5fd">
            <li>Full 24-month event calendar</li>
            <li>Unlimited saved events &amp; collections</li>
            <li>Calendar export to Google, Outlook, Apple</li>
            <li>Weekly digest emails</li>
          </ul>
          <p style="color:#bfdbfe">After your trial, the free tier shows events in the next 30 days.
          Upgrade to Pro for $9.99/year to keep full access.</p>
          <a href="${appUrl}/events"
            style="display:inline-block;background:#4ea8de;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px">
            Explore Events →
          </a>
          <a href="${appUrl}/pricing"
            style="display:inline-block;background:transparent;color:#4ea8de;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;border:1px solid #4ea8de">
            View Pricing →
          </a>
          <p style="color:#64748b;font-size:12px;margin-top:24px">ForaHub · Global Development Events</p>
        </div>`,
    }),
  });

  return NextResponse.json({ ok: true });
}
