// Pull a normalized "registered domain" from a website URL. Conservative —
// keeps the host as-is (strips leading www.), no public-suffix trickery so
// `gov.uk` stays `gov.uk` and `org.uk` stays `org.uk`. Caller is responsible
// for deciding whether the resulting string is sane to use as a claim
// auto-verify anchor.

const KNOWN_HOSTING_PLATFORMS = new Set<string>([
  "eventbrite.com", "eventbrite.co.uk",
  "hopin.com",
  "swapcard.com",
  "hubilo.com",
  "livestream.com",
  "youtube.com",
  "vimeo.com",
  "zoom.us",
  "teams.microsoft.com",
  "gather.town",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "instagram.com",
  "github.com",
  "medium.com",
  "wordpress.com",
  "blogspot.com",
  "wix.com",
  "weebly.com",
  "google.com",
  "docs.google.com",
  "drive.google.com",
]);

export interface ExtractDomainResult {
  domain: string | null;
  reason?: "empty" | "invalid_url" | "known_platform";
}

export function extractDomain(url: string | null | undefined): ExtractDomainResult {
  if (!url) return { domain: null, reason: "empty" };
  const trimmed = url.trim();
  if (!trimmed) return { domain: null, reason: "empty" };

  // URL parser is strict; pad missing scheme so bare "example.org" parses.
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let host: string;
  try {
    host = new URL(candidate).hostname.toLowerCase();
  } catch {
    return { domain: null, reason: "invalid_url" };
  }
  host = host.replace(/^www\./, "");
  if (!host || host.length < 3 || !host.includes(".")) {
    return { domain: null, reason: "invalid_url" };
  }
  if (KNOWN_HOSTING_PLATFORMS.has(host)) {
    return { domain: null, reason: "known_platform" };
  }
  return { domain: host };
}
