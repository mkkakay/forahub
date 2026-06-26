import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { sanitizeApiError } from "@/lib/security/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface EarlyAccessBody {
  email?: string;
  interest?: string;
}

const ALLOWED_INTERESTS = new Set(["org_accounts", "other"]);

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  let body: EarlyAccessBody;
  try {
    body = (await req.json()) as EarlyAccessBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !isEmail(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const interest = body.interest && ALLOWED_INTERESTS.has(body.interest) ? body.interest : "org_accounts";

  const { error } = await adminSupabase
    .from("early_access_signups")
    .insert({ email, interest, signed_up_at: new Date().toISOString() });

  if (error) {
    // Unique-violation = already signed up; treat as success.
    if (error.code === "23505") {
      return NextResponse.json({ success: true, message: "You're already on the list — we'll be in touch." });
    }
    console.error("[early-access] insert failed:", error.message);
    return sanitizeApiError(error, "early-access", 500);
  }

  return NextResponse.json({
    success: true,
    message: "You're on the list. We'll email you when org accounts go live.",
  });
}
