// Curated list of free-mail / personal email providers used by the org-claim
// flow as an integrity signal: a custom organization domain is good evidence
// of affiliation, free-mail domains are not (anyone can register one in 30
// seconds and pick any "from" name). When the claimant's email lives on one
// of these domains, the claim is NEVER auto-verified — it always goes to
// admin review.
//
// Add a domain here only after confirming it is a true free-mail / consumer
// provider rather than a small org domain we just don't recognize.
//
// Stored as a Set for O(1) lookup. All entries are lowercase.
const FREE_MAIL_DOMAINS = new Set<string>([
  // Google
  "gmail.com",
  "googlemail.com",

  // Yahoo (global + major regional variants)
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.co.in",
  "yahoo.co.jp",
  "yahoo.fr",
  "yahoo.de",
  "yahoo.es",
  "yahoo.it",
  "yahoo.ca",
  "yahoo.com.au",
  "yahoo.com.br",
  "yahoo.com.mx",
  "yahoo.com.ar",
  "ymail.com",
  "rocketmail.com",

  // Microsoft consumer
  "outlook.com",
  "outlook.co.uk",
  "outlook.fr",
  "outlook.de",
  "outlook.es",
  "outlook.com.br",
  "hotmail.com",
  "hotmail.co.uk",
  "hotmail.fr",
  "hotmail.de",
  "hotmail.es",
  "hotmail.it",
  "hotmail.com.br",
  "hotmail.com.mx",
  "live.com",
  "live.co.uk",
  "live.fr",
  "live.de",
  "msn.com",

  // Apple
  "icloud.com",
  "me.com",
  "mac.com",

  // AOL / Verizon-era consumer
  "aol.com",
  "aol.co.uk",
  "aim.com",

  // Proton
  "protonmail.com",
  "proton.me",
  "pm.me",

  // GMX
  "gmx.com",
  "gmx.de",
  "gmx.net",
  "gmx.at",
  "gmx.ch",
  "gmx.fr",

  // Other Western consumer
  "mail.com",
  "fastmail.com",
  "fastmail.fm",
  "tutanota.com",
  "tutamail.com",
  "hushmail.com",
  "zoho.com", // commonly used as personal even though also business
  "zohomail.com",

  // Yandex
  "yandex.com",
  "yandex.ru",
  "yandex.by",
  "yandex.kz",
  "yandex.ua",
  "ya.ru",

  // China consumer
  "qq.com",
  "163.com",
  "126.com",
  "yeah.net",
  "sina.com",
  "sina.cn",
  "sohu.com",
  "foxmail.com",
  "aliyun.com",

  // Japan / Korea consumer
  "naver.com",
  "daum.net",
  "hanmail.net",
  "kakao.com",
  "nate.com",

  // India / South Asia consumer
  "rediffmail.com",
  "rediff.com",

  // Brazil / Latin America consumer
  "bol.com.br",
  "uol.com.br",
  "terra.com.br",
  "ig.com.br",

  // ISPs that are still very commonly used as personal addresses
  "comcast.net",
  "verizon.net",
  "att.net",
  "charter.net",
  "sbcglobal.net",
  "bellsouth.net",
  "cox.net",
  "earthlink.net",
  "frontier.com",
  "btinternet.com",
  "virginmedia.com",
  "sky.com",
  "talktalk.net",
  "ntlworld.com",
  "blueyonder.co.uk",
  "tiscali.co.uk",

  // Continental Europe consumer
  "web.de",
  "t-online.de",
  "freenet.de",
  "arcor.de",
  "orange.fr",
  "wanadoo.fr",
  "free.fr",
  "laposte.net",
  "sfr.fr",
  "libero.it",
  "virgilio.it",
  "tin.it",
  "alice.it",
  "tiscali.it",
  "telefonica.net",
  "ono.com",
  "wp.pl",
  "onet.pl",
  "interia.pl",
  "o2.pl",
  "abv.bg",
  "mail.bg",
  "seznam.cz",
  "centrum.cz",
]);

/**
 * Lowercases and tests the given email-host part against the free-mail set.
 * Pass the host portion only (everything after the @, no whitespace).
 */
export function isFreeMailDomain(domain: string | null | undefined): boolean {
  if (!domain) return false;
  return FREE_MAIL_DOMAINS.has(domain.trim().toLowerCase());
}

/** Read-only export for tests / admin tooling. Don't mutate. */
export const FREE_MAIL_DOMAINS_LIST: readonly string[] = Array.from(FREE_MAIL_DOMAINS).sort();
