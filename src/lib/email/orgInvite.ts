// Bulletproof HTML email for org co-manager invitations. Same layout chrome
// as the claim verification template (navy header band, accent-blue table
// CTA, light-mode-safe) so the brand stays coherent.

export interface OrgInviteEmailOpts {
  to: string;
  orgName: string;
  inviterName: string | null;
  inviterEmail: string | null;
  note: string | null;
  acceptUrl: string;
  /** Whole days until expiry, used for the "expires in N days" line. */
  expiresInDays: number;
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

export function renderOrgInviteEmail(opts: OrgInviteEmailOpts): { subject: string; html: string; text: string } {
  const orgEsc = escape(opts.orgName);
  const inviterDisplay = opts.inviterName || opts.inviterEmail || "A teammate";
  const inviterEsc = escape(inviterDisplay);
  const inviterFirst = escape(firstName(opts.inviterName) ?? inviterDisplay);
  const url = opts.acceptUrl;
  const note = opts.note?.trim() || null;

  const subject = `${inviterDisplay} invited you to co-manage ${opts.orgName} on ForaHub`;

  const text = [
    `Hi,`,
    "",
    `${inviterDisplay} invited you to co-manage ${opts.orgName} on ForaHub.`,
    "",
    note ? `Note from ${inviterFirst}:` : "",
    note ? `  "${note}"` : "",
    note ? "" : "",
    `As a co-manager you can update ${opts.orgName}'s profile, publish events, and invite more colleagues.`,
    "",
    "Accept the invitation:",
    url,
    "",
    `This invitation is single-use and expires in ${opts.expiresInDays} day${opts.expiresInDays === 1 ? "" : "s"}.`,
    "",
    "If you didn't expect this, you can safely ignore this email.",
    "",
    "Questions? Write to admin@forahub.org.",
    "",
    "— The ForaHub team",
  ].filter(Boolean).join("\n");

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
    ${inviterEsc} invited you to co-manage ${orgEsc} on ForaHub. Link expires in ${opts.expiresInDays} day${opts.expiresInDays === 1 ? "" : "s"}.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${SOFT};padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 14px rgba(15,42,74,0.08);">
          <tr>
            <td style="background:${NAVY};padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle" style="vertical-align:middle;">
                    <span style="display:inline-block;vertical-align:middle;width:28px;height:28px;background:${ACCENT};border-radius:9999px;text-align:center;line-height:28px;color:#ffffff;font-weight:700;font-size:14px;">F</span>
                    <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.2px;">
                      Fora<span style="color:${ACCENT};">Hub</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px 32px;">
              <h1 style="margin:0 0 8px 0;font-size:22px;line-height:1.3;color:${NAVY};font-weight:700;">
                You've been invited to co-manage ${orgEsc}
              </h1>
              <p style="margin:0 0 14px 0;font-size:15px;line-height:1.55;color:${TEXT};">
                Hi,
              </p>
              <p style="margin:0 0 14px 0;font-size:15px;line-height:1.55;color:${TEXT};">
                <strong style="color:${NAVY};">${inviterEsc}</strong> invited you to join <strong style="color:${NAVY};">${orgEsc}</strong> on ForaHub as a co-manager.
              </p>
              ${note ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;">
                <tr>
                  <td style="border-left:3px solid ${ACCENT};background:#f8fafc;padding:12px 16px;">
                    <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:0.4px;color:${MUTED};font-weight:700;">Note from ${inviterFirst}</p>
                    <p style="margin:0;font-size:14px;line-height:1.55;color:${TEXT};font-style:italic;">${escape(note)}</p>
                  </td>
                </tr>
              </table>` : ""}
              <p style="margin:0 0 22px 0;font-size:15px;line-height:1.55;color:${TEXT};">
                Co-managers can update ${orgEsc}'s profile, publish events, and invite more colleagues to help run the org's presence on ForaHub.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left">
                <tr>
                  <td align="center" bgcolor="${ACCENT}" style="background:${ACCENT};border-radius:10px;">
                    <a href="${url}"
                       style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;line-height:1;">
                      Accept invitation &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0 0;font-size:13px;line-height:1.5;color:${MUTED};">
                For your security, this invitation is single-use and expires in ${opts.expiresInDays} day${opts.expiresInDays === 1 ? "" : "s"}. You'll be asked to sign in with <strong style="color:${TEXT};">${escape(opts.to)}</strong> to accept.
              </p>
              <p style="margin:8px 0 0 0;font-size:13px;line-height:1.5;color:${MUTED};">
                Button not clickable? Copy and paste this URL into your browser:<br>
                <a href="${url}" style="color:${ACCENT};word-break:break-all;text-decoration:underline;">${url}</a>
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
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <p style="margin:0 0 6px 0;font-size:12px;line-height:1.55;color:${MUTED};">
                Questions? Contact <a href="mailto:admin@forahub.org" style="color:${ACCENT};text-decoration:underline;">admin@forahub.org</a>.
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
