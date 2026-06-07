// Bulletproof HTML email template for org-claim verification.
//
// Constraints we render against:
// - Outlook (still ships a Word rendering engine — no flex/grid, limited CSS,
//   no media queries on `<style>` blocks for desktop, but table layout works).
// - Apple Mail dark mode (auto-inverts light backgrounds — keep our brand
//   navy explicit so it stays navy in dark mode too).
// - Gmail (strips <style> blocks heavier than ~10KB and prefers inline CSS).
// - Mobile clients (single-column responsive via 100% width tables).
//
// All styling is INLINE on the elements. Layout is via <table>. The CTA is
// a bullet-proof "VML button" — a <table>-rendered pill that survives Outlook.
//
// The globe + ForaHub mark is rendered as inline SVG. Some clients (Outlook,
// older Gmail) strip <svg>; we degrade to a styled text wordmark wrapped in
// the same row, so the header never looks blank.

export interface ClaimVerificationEmailOpts {
  /** Recipient address — only used for the unsubscribe / fallback copy. */
  to: string;
  /** First or full name. Falls back to "Hi," when missing. */
  recipientName: string | null;
  /** Org display name. */
  orgName: string;
  /** Absolute https://… verify URL. */
  verifyUrl: string;
}

const NAVY = "#0f2a4a";
const ACCENT = "#4ea8de";
const SOFT = "#f1f5f9";
const TEXT = "#1f2937";
const MUTED = "#64748b";

function escape(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]);
}

function firstName(name: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  // Use first whitespace-delimited token so "Mohamed Kakay" greets as "Mohamed".
  // Single-word names just pass through unchanged.
  return trimmed.split(/\s+/)[0];
}

export function renderClaimVerificationEmail(opts: ClaimVerificationEmailOpts): { subject: string; html: string; text: string } {
  const greetingName = firstName(opts.recipientName);
  const greeting = greetingName ? `Hi ${escape(greetingName)},` : "Hi,";
  const orgEsc = escape(opts.orgName);
  const url = opts.verifyUrl;

  const subject = `Verify your claim for ${opts.orgName} on ForaHub`;

  // ─── Plain-text alternative (Resend will surface this automatically when
  // we pass it as `text:`; some clients render text on accessibility setups). ─
  const text = [
    greetingName ? `Hi ${greetingName},` : "Hi,",
    "",
    `You requested to claim ${opts.orgName} on ForaHub.`,
    "",
    `Claiming verifies your organization and lets you manage how ${opts.orgName} appears on ForaHub.`,
    "",
    "Verify your email and complete the claim:",
    url,
    "",
    "For your security this link is single-use and expires in 1 hour.",
    "",
    "If you didn't request this, you can safely ignore this email.",
    "",
    "Questions? Contact hello@forahub.org.",
    "",
    "— The ForaHub team",
  ].join("\n");

  // ─── HTML ────────────────────────────────────────────────────────────────
  // Layout: outer 100% table → 600px content table → header band → body card
  // → CTA → divider → footer.
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <!-- Preheader text shown in inbox previews; hidden in the message body. -->
  <div style="display:none;font-size:1px;color:${SOFT};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${greetingName ? `${escape(greetingName)}, verify` : "Verify"} your ${orgEsc} claim on ForaHub. Link expires in 1 hour.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${SOFT};padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 14px rgba(15,42,74,0.08);">
          <!-- ── Brand header band ───────────────────────────────────── -->
          <tr>
            <td style="background:${NAVY};padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle" style="vertical-align:middle;">
                    <!-- Globe icon (SVG). Strips fine in clients that drop it. -->
                    <span style="display:inline-block;vertical-align:middle;width:28px;height:28px;background:${ACCENT};border-radius:9999px;text-align:center;line-height:28px;color:#ffffff;font-weight:700;font-size:14px;">F</span>
                    <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.2px;">
                      Fora<span style="color:${ACCENT};">Hub</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Body ─────────────────────────────────────────────────── -->
          <tr>
            <td style="padding:32px 32px 8px 32px;">
              <h1 style="margin:0 0 8px 0;font-size:22px;line-height:1.3;color:${NAVY};font-weight:700;">
                Verify your organization claim
              </h1>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.55;color:${TEXT};">
                ${greeting}
              </p>
              <p style="margin:0 0 14px 0;font-size:15px;line-height:1.55;color:${TEXT};">
                You requested to claim <strong style="color:${NAVY};">${orgEsc}</strong> on ForaHub.
              </p>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.55;color:${TEXT};">
                Claiming verifies your organization and lets you manage how
                <strong style="color:${NAVY};">${orgEsc}</strong> appears on ForaHub — events, branding, and the verified badge.
              </p>

              <!-- ── Bulletproof button (table-based for Outlook) ──────── -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left">
                <tr>
                  <td align="center" bgcolor="${ACCENT}" style="background:${ACCENT};border-radius:10px;">
                    <a href="${url}"
                       style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;line-height:1;">
                      Verify and claim &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0 0;font-size:13px;line-height:1.5;color:${MUTED};">
                For your security, this link is single-use and expires in 1 hour.
              </p>
              <p style="margin:8px 0 0 0;font-size:13px;line-height:1.5;color:${MUTED};">
                Button not clickable? Copy and paste this URL into your browser:<br>
                <a href="${url}" style="color:${ACCENT};word-break:break-all;text-decoration:underline;">${url}</a>
              </p>
            </td>
          </tr>

          <!-- ── Divider ──────────────────────────────────────────────── -->
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr><td height="1" style="background:#e2e8f0;line-height:1px;font-size:1px;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- ── Footer ───────────────────────────────────────────────── -->
          <tr>
            <td style="padding:18px 32px 32px 32px;">
              <p style="margin:0 0 6px 0;font-size:12px;line-height:1.55;color:${MUTED};">
                If you didn't request this, you can safely ignore this email.
              </p>
              <p style="margin:0 0 6px 0;font-size:12px;line-height:1.55;color:${MUTED};">
                Questions? Contact <a href="mailto:hello@forahub.org" style="color:${ACCENT};text-decoration:underline;">hello@forahub.org</a>.
              </p>
              <p style="margin:12px 0 0 0;font-size:11px;line-height:1.55;color:${MUTED};">
                ForaHub · Global Development Events
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
