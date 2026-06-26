// Centralized API error handler.
//
// The old pattern across our route handlers was:
//
//   if (error) return NextResponse.json({ error: error.message }, { status: 500 });
//
// That leaks Supabase / Postgres error text (constraint names, column
// names, "duplicate key", etc.) straight to the client. The security
// audit flagged this across ~55 routes.
//
// Use sanitizeApiError(err, label) instead. It:
//   1. Logs the full error server-side with the label, so the operator
//      can still trace what went wrong in Vercel function logs.
//   2. Returns a generic `{ error: "server_error" }` body to the client.
//   3. Defaults to 500; passes a different status when the caller knows
//      it should be 4xx (rare — most leaks are 500s).
//
// This helper is *only* for unexpected errors. Intentional, user-
// readable error codes ("signin_required", "not_a_manager",
// "invalid_email", etc.) are part of the API contract with the UI and
// must NOT be routed through this helper — keep returning them as
// literal strings.

import { NextResponse } from "next/server";

export function sanitizeApiError(
  err: unknown,
  label: string,
  status = 500,
): NextResponse {
  const detail =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : (() => { try { return JSON.stringify(err); } catch { return String(err); } })();
  console.error(`[api:${label}]`, detail);
  return NextResponse.json({ error: "server_error" }, { status });
}
