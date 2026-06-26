// Constant-time secret comparison utilities.
//
// Shared admin / cron / scraper secrets must never be compared with `===`,
// `!==`, or template-string equality — those short-circuit on the first
// differing byte and leak the prefix length over time. Use `safeEqual` for
// every server-side secret check so the comparison takes the same time
// regardless of where the mismatch is.
//
// The helper is intentionally null-safe: if either side is missing it
// returns false rather than throwing, so callers can pass `req.headers.get(...)`
// (string | null) and `process.env.X` (string | undefined) directly.

import { timingSafeEqual } from "node:crypto";

const encoder = new TextEncoder();

export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length === 0 || b.length === 0) return false;
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

// Convenience for the common pattern: header `x-admin-key` vs `ADMIN_SECRET`.
export function isAuthorizedAdmin(headerValue: string | null | undefined): boolean {
  return safeEqual(headerValue, process.env.ADMIN_SECRET);
}
