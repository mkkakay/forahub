// Confirmation email sent after a user self-serves an account deletion.
//
// Tone: neutral, brief, GDPR-receipt — not promotional. We can't link
// back to anything user-specific (the account is gone), so the only
// CTA is the "wasn't me?" admin contact for fraud reports.

export interface AccountDeletedEmailOpts {
  email: string;
  /** UTC ISO timestamp the deletion was processed at. */
  deletedAt: string;
}

export function renderAccountDeletedEmail({ email, deletedAt }: AccountDeletedEmailOpts): {
  subject: string;
  html: string;
  text: string;
} {
  const when = new Date(deletedAt).toUTCString();
  const subject = "Your ForaHub account has been deleted";
  const text =
    `Hi,\n\n` +
    `This is to confirm that the ForaHub account registered to ${email} ` +
    `was deleted on ${when}.\n\n` +
    `Personal data we held on you (your profile, saved events, alerts, ` +
    `notifications, analytics rows, and any organization-manager seats ` +
    `you held) has been removed. Events you previously submitted have ` +
    `been retained for the broader community but the attribution to ` +
    `your account has been severed.\n\n` +
    `If you didn't request this deletion, reply to this email or write ` +
    `to admin@forahub.org right away so we can investigate.\n\n` +
    `— ForaHub`;
  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;background:#0f2a4a;padding:32px;border-radius:12px;color:#e2e8f0;">
      <h1 style="color:#4ea8de;margin-top:0;font-size:22px;">Fora<span style="color:#ffffff">Hub</span></h1>
      <h2 style="color:#ffffff;font-size:18px;">Your account has been deleted</h2>
      <p style="color:#bfdbfe;line-height:1.55;">
        This is to confirm that the ForaHub account registered to
        <strong style="color:#ffffff">${escapeHtml(email)}</strong> was deleted on
        <strong style="color:#ffffff">${escapeHtml(when)}</strong>.
      </p>
      <p style="color:#bfdbfe;line-height:1.55;">
        Personal data we held on you — your profile, saved events, alerts,
        notifications, analytics rows, and any organization-manager seats
        you held — has been removed. Events you previously submitted have
        been retained for the broader community, with attribution to your
        account severed.
      </p>
      <p style="color:#94a3b8;line-height:1.55;font-size:13px;border-top:1px solid #1f3a5e;padding-top:16px;margin-top:24px;">
        Didn't request this? Reply to this email or write to
        <a href="mailto:admin@forahub.org" style="color:#4ea8de;">admin@forahub.org</a>
        right away so we can investigate.
      </p>
      <p style="color:#64748b;font-size:11px;margin-top:24px;">ForaHub · Global Development Events</p>
    </div>`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]
  );
}
