import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import type { ScraperSource, FetchResult } from './types';

const rssParser = new Parser({ timeout: 10000 });

// ── Rate limiting ─────────────────────────────────────────────────────────────

const domainLastRequest = new Map<string, number>();

async function respectRateLimit(url: string): Promise<void> {
  const domain = new URL(url).hostname;
  const last = domainLastRequest.get(domain) ?? 0;
  const wait = 2000 - (Date.now() - last);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  domainLastRequest.set(domain, Date.now());
}

// ── Language detection ────────────────────────────────────────────────────────

// ISO 639-3 → ISO 639-1 map for the most common languages in dev/health sources
const LANG_MAP: Record<string, string> = {
  eng: 'en', fra: 'fr', spa: 'es', por: 'pt', ara: 'ar',
  zho: 'zh', deu: 'de', rus: 'ru', hin: 'hi', swh: 'sw',
  und: 'en', // undetermined → assume English
};

async function detectLanguage(text: string): Promise<string> {
  try {
    const { franc } = await import('franc-min');
    const code3 = franc(text.slice(0, 2000));
    return LANG_MAP[code3] ?? 'en';
  } catch {
    return 'en';
  }
}

// ── Login detection ───────────────────────────────────────────────────────────

const LOGIN_SIGNALS = [
  'sign in to continue', 'login to view', 'please log in',
  'members only', 'you must be logged in', 'create an account to',
  'restricted access', 'content available to members',
];

function detectsLoginWall(html: string): boolean {
  const lower = html.toLowerCase();
  return LOGIN_SIGNALS.some(signal => lower.includes(signal));
}

// ── HTTP fetch with timeout ───────────────────────────────────────────────────

async function fetchWithTimeout(url: string, timeoutMs = 10_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ForaHubBot/1.0; +https://forahub.org/about)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timer);
  }
}

// ── RSS ───────────────────────────────────────────────────────────────────────

async function fetchRss(source: ScraperSource): Promise<FetchResult> {
  const feedUrl = source.rss_url ?? source.url;
  await respectRateLimit(feedUrl);
  try {
    const feed = await rssParser.parseURL(feedUrl);
    const text = feed.items
      .map(item => [
        item.title ?? '',
        item.pubDate ?? '',
        item.contentSnippet ?? item.content ?? '',
        item.link ?? '',
      ].join('\n'))
      .join('\n\n---\n\n');
    return {
      content: text,
      contentType: 'rss',
      detectedLanguage: await detectLanguage(text),
      paginationPages: [],
      requiresAuth: false,
    };
  } catch (err) {
    return { content: '', contentType: 'empty', detectedLanguage: 'en', paginationPages: [], requiresAuth: false, error: String(err) };
  }
}

// ── iCal ──────────────────────────────────────────────────────────────────────

function parseIcal(raw: string): string {
  const events: string[] = [];
  const blocks = raw.split('BEGIN:VEVENT');
  for (const block of blocks.slice(1)) {
    const get = (key: string) => {
      const match = block.match(new RegExp(`${key}(?:;[^:]+)?:(.+?)(?:\r?\n(?![ \t])|\r?\nEND:VEVENT)`, 's'));
      return match ? match[1].replace(/\r?\n[ \t]/g, '').trim() : '';
    };
    events.push([
      `SUMMARY: ${get('SUMMARY')}`,
      `DTSTART: ${get('DTSTART')}`,
      `DTEND: ${get('DTEND')}`,
      `DESCRIPTION: ${get('DESCRIPTION')}`,
      `LOCATION: ${get('LOCATION')}`,
      `URL: ${get('URL')}`,
    ].join('\n'));
  }
  return events.join('\n\n---\n\n');
}

async function fetchIcal(source: ScraperSource): Promise<FetchResult> {
  await respectRateLimit(source.url);
  try {
    const res = await fetchWithTimeout(source.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.text();
    const content = parseIcal(raw);
    return { content, contentType: 'ical', detectedLanguage: 'en', paginationPages: [], requiresAuth: false };
  } catch (err) {
    return { content: '', contentType: 'empty', detectedLanguage: 'en', paginationPages: [], requiresAuth: false, error: String(err) };
  }
}

// ── PDF ───────────────────────────────────────────────────────────────────────

async function fetchPdf(source: ScraperSource): Promise<FetchResult> {
  await respectRateLimit(source.url);
  try {
    const res = await fetchWithTimeout(source.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    // Dynamic require — pdf-parse is an optional dependency; gracefully skip if missing
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = await Promise.resolve().then(() => require('pdf-parse') as { default: (b: Buffer) => Promise<{ text: string }> }).catch(() => null);
    if (!pdfParse) {
      return { content: '', contentType: 'empty', detectedLanguage: 'en', paginationPages: [], requiresAuth: false, error: 'pdf-parse not available' };
    }
    const data = await pdfParse.default(buffer);
    const lang = await detectLanguage(data.text);
    return { content: data.text, contentType: 'pdf', detectedLanguage: lang, paginationPages: [], requiresAuth: false };
  } catch (err) {
    return { content: '', contentType: 'empty', detectedLanguage: 'en', paginationPages: [], requiresAuth: false, error: String(err) };
  }
}

// ── HTML ──────────────────────────────────────────────────────────────────────

/** Extract the main text content from an HTML page. */
function extractPageText($: cheerio.CheerioAPI, selectors?: ScraperSource['css_selectors']): string {
  // Remove noise
  $('script, style, nav, footer, header, [role="banner"], [role="navigation"]').remove();

  if (selectors?.container) {
    const items: string[] = [];
    $(selectors.container).each((_, el) => {
      const title = selectors.title ? $(el).find(selectors.title).text().trim() : '';
      const date = selectors.date ? $(el).find(selectors.date).text().trim() : '';
      const desc = selectors.description ? $(el).find(selectors.description).text().trim() : '';
      const link = selectors.link ? $(el).find(selectors.link).attr('href') ?? '' : '';
      items.push([title, date, desc, link].filter(Boolean).join(' | '));
    });
    if (items.length) return items.join('\n\n');
  }

  // Fallback: full page text, limited to first 50k chars to control token usage
  return $('main, [role="main"], #content, .content, body').first().text()
    .replace(/\s{3,}/g, '\n\n')
    .trim()
    .slice(0, 50_000);
}

/** Find pagination links and return up to 5 unique page URLs. */
function findPaginationLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const seen = new Set<string>([baseUrl]);
  const links: string[] = [];

  $('a[href]').each((_, el) => {
    if (links.length >= 4) return false; // cheerio uses false to break
    const href = $(el).attr('href') ?? '';
    const text = $(el).text().toLowerCase();
    if (!/page|next|p=\d+|\?page=\d+|\/\d+\/?$/.test(href) && !/next|›|»|more/.test(text)) return;
    try {
      const abs = new URL(href, base).toString();
      if (!seen.has(abs) && abs.startsWith(base.origin)) {
        seen.add(abs);
        links.push(abs);
      }
    } catch { /* relative URL that failed to parse */ }
  });
  return links;
}

async function fetchHtml(source: ScraperSource): Promise<FetchResult> {
  const pages: string[] = [];
  const visitedUrls: string[] = [];
  let detectedLanguage = source.language;
  let requiresAuth = false;

  const fetchPage = async (url: string): Promise<string | null> => {
    await respectRateLimit(url);
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  };

  // First page
  const firstHtml = await fetchPage(source.url);
  if (!firstHtml) {
    return { content: '', contentType: 'empty', detectedLanguage, paginationPages: [], requiresAuth, error: 'Failed to fetch first page' };
  }

  if (detectsLoginWall(firstHtml)) {
    requiresAuth = true;
    return { content: '', contentType: 'html', detectedLanguage, paginationPages: [], requiresAuth };
  }

  const $first = cheerio.load(firstHtml);
  pages.push(extractPageText($first, source.css_selectors));
  detectedLanguage = await detectLanguage(pages[0].slice(0, 2000));

  // Pagination pages
  const nextUrls = findPaginationLinks($first, source.url);
  visitedUrls.push(source.url, ...nextUrls);

  for (const nextUrl of nextUrls) {
    if (pages.length >= 5) break;
    const html = await fetchPage(nextUrl);
    if (!html) break;
    const $ = cheerio.load(html);
    pages.push(extractPageText($, source.css_selectors));
  }

  const content = pages.join('\n\n=== PAGE BREAK ===\n\n');
  return {
    content,
    contentType: 'html',
    detectedLanguage,
    paginationPages: visitedUrls.slice(1),
    requiresAuth,
  };
}

// ── Phase 2 stubs ─────────────────────────────────────────────────────────────

function phase2Stub(method: string): FetchResult {
  console.log(`[scraper] Phase 2 not implemented: ${method} — returning empty content`);
  return { content: '', contentType: 'empty', detectedLanguage: 'en', paginationPages: [], requiresAuth: true };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchSource(source: ScraperSource): Promise<FetchResult> {
  if (source.phase2) return phase2Stub(source.scrape_method);

  switch (source.scrape_method) {
    case 'rss':       return fetchRss(source);
    case 'ical':      return fetchIcal(source);
    case 'pdf':       return fetchPdf(source);
    case 'html':      return fetchHtml(source);
    case 'twitter':   return phase2Stub('twitter');
    case 'linkedin':  return phase2Stub('linkedin');
    case 'newsletter':return phase2Stub('newsletter');
    case 'youtube':   return phase2Stub('youtube');
    default:          return fetchHtml(source);
  }
}
