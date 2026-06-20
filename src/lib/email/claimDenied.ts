// Email shell for org-claim denials. Same brand + bulletproof-table layout
// as the verification email — see claimVerification.ts for the design
// rationale (Outlook-safe tables, inline CSS, light color-scheme lock,
// plain-text alternative). Renders the denial reason verbatim so the
// admin can write whatever they want in plain English.

export interface ClaimDeniedEmailOpts {
  to: string;
  recipientName: string | null;
  orgName: string;
  reason: string;
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
  return trimmed.split(/\s+/)[0];
}

export function renderClaimDeniedEmail(opts: ClaimDeniedEmailOpts): { subject: string; html: string; text: string } {
  const greetingName = firstName(opts.recipientName);
  const greeting = greetingName ? `Hi ${escape(greetingName)},` : "Hi,";
  const orgEsc = escape(opts.orgName);
  const reasonEsc = escape(opts.reason);

  const subject = `Your ForaHub claim for ${opts.orgName}`;

  const text = [
    greetingName ? `Hi ${greetingName},` : "Hi,",
    "",
    `Thanks for requesting to claim ${opts.orgName} on ForaHub.`,
    "",
    "After reviewing your request, we weren't able to grant the claim at this time.",
    "",
    "Reason:",
    opts.reason,
    "",
    "If you believe this was a mistake, or if you can share more evidence of your affiliation, just reply to this email or write to admin@forahub.org and we'll take another look.",
    "",
    "Thanks again for your interest in ForaHub.",
    "",
    "— The ForaHub team",
  ].join("\n");

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
  <div style="display:none;font-size:1px;color:${SOFT};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    Update on your ${orgEsc} claim
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${SOFT};padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 14px rgba(15,42,74,0.08);">
        <tr>
          <td style="background:${NAVY};padding:24px 32px;">
            <span style="display:inline-block;vertical-align:middle;width:28px;height:28px;background:${ACCENT};border-radius:9999px;text-align:center;line-height:28px;color:#ffffff;font-weight:700;font-size:14px;">F</span>
            <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.2px;">
              Fora<span style="color:${ACCENT};">Hub</span>
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h1 style="margin:0 0 8px 0;font-size:22px;line-height:1.3;color:${NAVY};font-weight:700;">
              Update on your claim
            </h1>
            <p style="margin:0 0 16px 0;font-size:15px;line-height:1.55;color:${TEXT};">
              ${greeting}
            </p>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.55;color:${TEXT};">
              Thanks for requesting to claim <strong style="color:${NAVY};">${orgEsc}</strong> on ForaHub. After reviewing your request, we weren&apos;t able to grant the claim at this time.
            </p>
            <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:${NAVY};letter-spacing:0.04em;text-transform:uppercase;">
              Reason
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;">
              <tr><td style="background:${SOFT};border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.55;color:${TEXT};">
                ${reasonEsc}
              </td></tr>
            </table>
            <p style="margin:0 0 14px 0;font-size:14px;line-height:1.55;color:${TEXT};">
              If you believe this was a mistake — or if you can share more evidence of your affiliation — just reply to this email, or write to
              <a href="mailto:admin@forahub.org" style="color:${ACCENT};text-decoration:underline;">admin@forahub.org</a>
              and we&apos;ll take another look.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 0 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr><td height="1" style="background:#e2e8f0;line-height:1px;font-size:1px;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px 32px 32px;">
            <p style="margin:0 0 6px 0;font-size:12px;line-height:1.55;color:${MUTED};">
              Thanks again for your interest in ForaHub.
            </p>
            <p style="margin:12px 0 0 0;font-size:11px;line-height:1.55;color:${MUTED};">
              ForaHub · Global Development Events
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
