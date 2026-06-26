// Welcome email for newly-signed-up users.
//
// Authorization: the route is callable in two ways —
//   1. An authenticated session (Supabase cookie). The signed-in user can
//      only request a welcome to THEIR OWN email — the request body's
//      `email` must match the session email. This keeps the legit
//      signup flow working (client posts after auth.signUp() resolves).
//   2. A signed bearer with `ADMIN_SECRET` — used by server-side helpers
//      or the admin panel to re-send a welcome.
// Unauthenticated callers are rejected with 401. Without these gates the
// route is an open relay through our Resend account.
//
// Rate limiting: per-IP, in-process token bucket. Good-enough on Vercel's
// Fluid Compute model where instances are reused; not a substitute for
// edge-level WAF, but it keeps the most obvious abuse cheap to block.

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeEqual } from "@/lib/security/timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-IP rate limit: up to 5 welcomes per 10 minutes. The legitimate
// signup flow fires this exactly once.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const ipHits = new Map<string, number[]>();

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const first = xff.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip") || "unknown";
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const hits = (ipHits.get(ip) ?? []).filter(t => t > cutoff);
  if (hits.length >= RATE_LIMIT_MAX) {
    ipHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  return false;
}

export async function POST(req: NextRequest) {
  // ── Rate limit (cheap reject; runs before reading the body) ─────────
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // ── Authorization ───────────────────────────────────────────────────
  const adminKey = req.headers.get("x-admin-key");
  const isAdmin = safeEqual(adminKey, process.env.ADMIN_SECRET);

  let body: { email?: unknown };
  try { body = await req.json(); } catch { body = {}; }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) return NextResponse.json({ error: "missing_email" }, { status: 400 });

  if (!isAdmin) {
    const sb = createServerSupabaseClient();
    const { data: u } = await sb.auth.getUser();
    const sessionEmail = u.user?.email?.toLowerCase() ?? null;
    if (!sessionEmail) {
      return NextResponse.json({ error: "signin_required" }, { status: 401 });
    }
    if (sessionEmail !== email.toLowerCase()) {
      return NextResponse.json({ error: "email_mismatch" }, { status: 403 });
    }
  }

  // ── Send via Resend ─────────────────────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ ok: true, email_sent: false });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://forahub.org";

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "ForaHub <admin@forahub.org>",
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

  return NextResponse.json({ ok: true, email_sent: true });
}
