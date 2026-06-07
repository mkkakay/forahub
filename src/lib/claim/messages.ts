// Single source of truth for every user-visible message in the org-claim
// flow. Server routes return short internal codes (snake_case) for API
// consumers and logs; the UI MUST run those codes through resolveClaimMessage
// before rendering. Any unmapped code falls back to a generic friendly
// sentence — a raw "already_owned_by_you" or "email_send_failed" must never
// reach the user.
//
// Each entry carries a `kind`:
//   - "positive": this is good news (e.g. the user already owns the org).
//     Render in green / brand-emerald, no error styling, with an optional
//     CTA that points at the relevant page.
//   - "info": informational, not an error (e.g. a claim routed to manual
//     review). Render in a neutral / blue / amber tone — never red.
//   - "error": something the user should retry. Render in the usual red
//     error pill.

export type ClaimMessageKind = "positive" | "info" | "error";

export interface ClaimMessage {
  kind: ClaimMessageKind;
  text: string;
  /** Optional follow-up action surfaced beside the text. */
  cta?: { label: string; href: string };
}

const GENERIC_ERROR: ClaimMessage = {
  kind: "error",
  text: "Something went wrong. Please try again, or contact hello@forahub.org.",
};

const REVIEW_ROUTING: ClaimMessage = {
  kind: "info",
  text: "Thanks — we'll review your request and follow up by email.",
};

// IMPORTANT: keys here are the EXACT codes the server returns in `error`
// (snake_case, no spaces). The "valid email required" / "org_slug required"
// codes are kept verbatim because that's how the request-claim 400 handler
// emits them today.
const MAP: Record<string, (ctx: { orgSlug?: string | null }) => ClaimMessage> = {
  // ── Positive / informational claim states ───────────────────────────────
  already_owned_by_you: ({ orgSlug }) => ({
    kind: "positive",
    text: "You already manage this organization.",
    cta: orgSlug
      ? { label: "Manage organization", href: `/orgs/${orgSlug}/manage` }
      : undefined,
  }),
  already_claimed: () => ({
    kind: "info",
    text: "This organization has already been claimed. If you think this is a mistake, contact hello@forahub.org.",
  }),

  // ── Review-queue routing (server now silently routes these; historical
  //    codes that may appear in cached responses are mapped to the same
  //    friendly copy as the new path so the message stays consistent). ─────
  domain_mismatch: () => REVIEW_ROUTING,
  no_org_domain: () => REVIEW_ROUTING,
  free_mail_domain: () => REVIEW_ROUTING,
  routed_to_review: () => REVIEW_ROUTING,

  // ── Real errors ─────────────────────────────────────────────────────────
  email_send_failed: () => ({
    kind: "error",
    text: "We couldn't send the verification email. Please try again in a few minutes, or contact hello@forahub.org if it keeps failing.",
  }),
  org_not_found: () => ({
    kind: "error",
    text: "We couldn't find that organization. Please pick another from the list or contact hello@forahub.org.",
  }),
  invalid_json: () => GENERIC_ERROR,

  // ── 400-validation codes from the request-claim route ──────────────────
  "org_slug required": () => GENERIC_ERROR,
  "valid email required": () => ({
    kind: "error",
    text: "Please enter a valid email address.",
  }),
};

/**
 * Resolve a server-returned error code (or the bare absence of one) into a
 * UI-renderable message. Always returns something — falls back to a friendly
 * generic if the code is unknown.
 *
 * @param code  The raw `error` field from a server response, or null/undefined
 *              if no error was set.
 * @param ctx   Optional context (e.g. orgSlug) used to enrich CTAs.
 */
export function resolveClaimMessage(
  code: string | null | undefined,
  ctx: { orgSlug?: string | null } = {},
): ClaimMessage {
  if (!code) return GENERIC_ERROR;
  const handler = MAP[code];
  if (!handler) return GENERIC_ERROR;
  return handler(ctx);
}

/**
 * Re-export of the generic message in case a caller wants to render the
 * fallback without a code lookup (e.g. a thrown network error).
 */
export const CLAIM_GENERIC_ERROR = GENERIC_ERROR;
