# Supabase Auth email templates

These HTML files are **pasted into the Supabase dashboard**, not loaded by
the app. Supabase Auth ships its own SMTP/template runtime; the only way
to override the templates is via the dashboard UI.

## Where to paste each template

Open your project in [supabase.com/dashboard](https://supabase.com/dashboard),
then navigate to:

> **Authentication → Emails → Templates**

For each template below, open the corresponding template editor in the
sidebar, click into the HTML pane, paste the file's contents (replacing
whatever is there), and click **Save changes**.

The matching **Subject** lines are listed too — these go in the
`Subject heading` field above the HTML editor.

| Supabase template name | File to paste | Subject heading |
|---|---|---|
| Confirm signup | [`confirm-signup.html`](./confirm-signup.html) | `Welcome to ForaHub — confirm your email` |
| Magic Link | [`magic-link.html`](./magic-link.html) | `Your ForaHub sign-in link` |
| Reset Password | [`reset-password.html`](./reset-password.html) | `Reset your ForaHub password` |
| Invite user | [`invite-user.html`](./invite-user.html) | `You've been invited to ForaHub` |

After saving each one, send yourself a test (Supabase's **Send test
email** button is in the same panel) to confirm the layout renders and
the link works.

## Template variables

All four templates use a single Supabase variable for the action link:

```text
{{ .ConfirmationURL }}
```

Supabase substitutes this server-side. Other variables that are
available but not used in these templates:

- `{{ .Email }}` — recipient address
- `{{ .Token }}` — six-digit OTP (only for OTP flows)
- `{{ .TokenHash }}` — hashed token (for advanced custom verifiers)
- `{{ .SiteURL }}` — your project's configured site URL
- `{{ .Data.<key> }}` — anything in `auth.user_metadata`

## Optional: send via your verified Resend domain instead of Supabase's default

By default these emails ship from Supabase's shared sender
(`noreply@mail.app.supabase.io`), which is rate-limited and not aligned
to forahub.org's DKIM/SPF/DMARC. To send them through your own
authenticated Resend domain so corporate inboxes (WHO, etc.) trust
them more readily:

> Dashboard → **Authentication → Emails → SMTP Settings** → **Enable Custom SMTP**

| Field | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | _(your `RESEND_API_KEY`)_ |
| Sender email | `admin@forahub.org` |
| Sender name | `ForaHub` |
| Use SSL/TLS | yes |

Save, then send a test from the same panel. Once SMTP is verified, every
auth email above ships through Resend with your domain's DKIM/SPF/DMARC
alignment.

## Design choices baked into the HTML

- **Bulletproof button**: the CTA is a `<table>` with both `bgcolor` and
  inline `background` so it renders as a solid pill in Outlook (Word
  rendering engine), Apple Mail, and Gmail.
- **Light-mode-safe**: `<meta name="color-scheme" content="light only">`
  + explicit colour on every cell so Apple Mail / Outlook dark mode
  don't auto-invert the navy header into something muddy.
- **No external assets**: the wordmark is text-styled (no remote logo
  image to break or get blocked by tracking blockers).
- **Plain-text fallback**: not needed — Supabase generates a plain-text
  alternative automatically from the HTML when SMTP is configured.
- **Mobile**: single 600px column, max-width via inline `style`, no
  media queries (Gmail strips them on some clients).

If you change the brand colours in the future, the two values to
search-and-replace across all four files are:

- `#0f2a4a` — navy (header background, headings, brand text)
- `#4ea8de` — accent blue (CTA button, highlight links)
