// scrape-events edge function
// Orchestrates the full ForaHub event scraping pipeline.
//
// Cron schedule (set in Supabase dashboard or pg_cron):
//   Hourly:  0 * * * *   → triggers with { frequency: "hourly" }
//   Daily:   0 6 * * *   → triggers with { frequency: "daily" }
//   Weekly:  0 6 * * 0   → triggers with { frequency: "weekly" }
//
// Test mode: POST { testMode: true } — runs full pipeline but writes nothing to DB.
// Dry run:   POST { dryRun: true }   — extracts events but skips DB writes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk";

// ── Types (inline to keep edge function self-contained) ───────────────────────

type ScrapeFrequency = "hourly" | "daily" | "weekly";
type Region = "Africa" | "Americas" | "Asia-Pacific" | "Europe" | "Middle-East" | "South-Asia" | "Global" | "Online";

interface Source {
  id: string;
  organization: string;
  url: string;
  scrape_method: "html" | "rss" | "ical" | "pdf" | "twitter" | "linkedin" | "newsletter" | "youtube";
  scrape_frequency: ScrapeFrequency;
  primary_sdg_goals: number[];
  region: Region;
  language: string;
  requires_auth: boolean;
  rss_url?: string;
  phase2?: boolean;
}

interface ExtractedEvent {
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  location_city?: string;
  location_country?: string;
  location_venue?: string;
  organization: string;
  registration_url?: string;
  event_type?: string;
  format?: string;
  cost_type?: string;
  cost_amount?: string;
  audience_level?: string;
  is_public: boolean;
  expected_attendance?: string;
  sdg_goals: number[];
  sdg_inferred: boolean;
  region?: string;
  is_side_event: boolean;
  parent_conference_name?: string;
  is_recurring: boolean;
  series_name?: string;
  speakers: string[];
  deadlines: { type: string; date: string; description?: string }[];
  confidence_score: number;
  quality_score: number;
  event_brief?: string;
  language: string;
  title_original?: string;
  description_original?: string;
  source_url: string;
}

interface RunResult {
  sourceId: string;
  eventsFound: number;
  eventsInserted: number;
  eventsUpdated: number;
  eventsRejected: number;
  eventsPendingReview: number;
  estimatedCost: number;
  error?: string;
}

// ── All sources (mirrors src/lib/scraper/sources.ts) ─────────────────────────

const ALL_SOURCES: Source[] = [
  { id: "who-events", organization: "World Health Organization", url: "https://www.who.int/news-room/events", scrape_method: "html", scrape_frequency: "daily", primary_sdg_goals: [3], region: "Global", language: "en", requires_auth: false },
  { id: "gates-foundation-events", organization: "Gates Foundation", url: "https://www.gatesfoundation.org/ideas/events", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3, 1, 2], region: "Global", language: "en", requires_auth: false },
  { id: "wellcome-events", organization: "Wellcome Trust", url: "https://wellcome.org/events", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3], region: "Global", language: "en", requires_auth: false },
  { id: "world-health-summit", organization: "World Health Summit", url: "https://www.worldhealthsummit.org", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3, 17], region: "Europe", language: "en", requires_auth: false },
  { id: "cugh-events", organization: "CUGH", url: "https://cugh.org/events", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3, 4], region: "Americas", language: "en", requires_auth: false },
  { id: "afhea-events", organization: "AfHEA", url: "https://www.afhea.org/en/events", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3, 10], region: "Africa", language: "en", requires_auth: false },
  { id: "geneva-health-forum", organization: "Geneva Health Forum", url: "https://www.genevahealthforum.org", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3, 17], region: "Europe", language: "en", requires_auth: false },
  { id: "pmac-events", organization: "Prince Mahidol Award Conference", url: "https://www.princemahidolawardconference.com", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3], region: "Asia-Pacific", language: "en", requires_auth: false },
  { id: "lancet-events", organization: "The Lancet", url: "https://www.thelancet.com/events", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3], region: "Global", language: "en", requires_auth: false },
  { id: "health-systems-global-events", organization: "Health Systems Global", url: "https://www.healthsystemsglobal.org/events/", scrape_method: "rss", rss_url: "https://www.healthsystemsglobal.org/feed/", scrape_frequency: "daily", primary_sdg_goals: [3, 16], region: "Global", language: "en", requires_auth: false },
  { id: "ihea-events", organization: "iHEA", url: "https://healtheconomics.org/events", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3, 10], region: "Global", language: "en", requires_auth: false },
  { id: "astmh-annual-meeting", organization: "ASTMH", url: "https://www.astmh.org/Annual-Meeting", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3], region: "Americas", language: "en", requires_auth: false },
  { id: "unicef-events", organization: "UNICEF", url: "https://www.unicef.org/events", scrape_method: "html", scrape_frequency: "daily", primary_sdg_goals: [3, 4, 1, 2], region: "Global", language: "en", requires_auth: false },
  { id: "unaids-events", organization: "UNAIDS", url: "https://www.unaids.org/en/events", scrape_method: "html", scrape_frequency: "daily", primary_sdg_goals: [3], region: "Global", language: "en", requires_auth: false },
  { id: "unwomen-events", organization: "UN Women", url: "https://www.unwomen.org/en/events", scrape_method: "html", scrape_frequency: "daily", primary_sdg_goals: [5, 10, 16], region: "Global", language: "en", requires_auth: false },
  { id: "unfpa-events", organization: "UNFPA", url: "https://www.unfpa.org/events", scrape_method: "html", scrape_frequency: "daily", primary_sdg_goals: [3, 5], region: "Global", language: "en", requires_auth: false },
  { id: "undp-events", organization: "UNDP", url: "https://www.undp.org/events", scrape_method: "html", scrape_frequency: "daily", primary_sdg_goals: [1, 10, 16, 17], region: "Global", language: "en", requires_auth: false },
  { id: "unesco-events", organization: "UNESCO", url: "https://en.unesco.org/events", scrape_method: "html", scrape_frequency: "daily", primary_sdg_goals: [4, 11, 13], region: "Global", language: "en", requires_auth: false },
  { id: "fao-events", organization: "FAO", url: "https://www.fao.org/events/en/", scrape_method: "html", scrape_frequency: "daily", primary_sdg_goals: [2, 15, 12], region: "Global", language: "en", requires_auth: false },
  { id: "wfp-events", organization: "WFP", url: "https://www.wfp.org/events", scrape_method: "html", scrape_frequency: "daily", primary_sdg_goals: [2, 17], region: "Global", language: "en", requires_auth: false },
  { id: "iom-events", organization: "IOM", url: "https://www.iom.int/events", scrape_method: "html", scrape_frequency: "daily", primary_sdg_goals: [10, 16], region: "Global", language: "en", requires_auth: false },
  { id: "unhcr-events", organization: "UNHCR", url: "https://www.unhcr.org/events", scrape_method: "html", scrape_frequency: "daily", primary_sdg_goals: [10, 16], region: "Global", language: "en", requires_auth: false },
  { id: "global-fund-events", organization: "The Global Fund", url: "https://www.theglobalfund.org/en/events/", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3, 17], region: "Global", language: "en", requires_auth: false },
  { id: "gavi-events", organization: "Gavi", url: "https://www.gavi.org/events", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3], region: "Global", language: "en", requires_auth: false },
  { id: "chatham-house-events", organization: "Chatham House", url: "https://www.chathamhouse.org/events", scrape_method: "rss", rss_url: "https://www.chathamhouse.org/rss/events", scrape_frequency: "daily", primary_sdg_goals: [16, 17, 3], region: "Europe", language: "en", requires_auth: false },
  { id: "wilton-park-events", organization: "Wilton Park", url: "https://www.wiltonpark.org.uk/events/", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [16, 17], region: "Europe", language: "en", requires_auth: false },
  { id: "brookings-events", organization: "Brookings Institution", url: "https://www.brookings.edu/events/", scrape_method: "rss", rss_url: "https://www.brookings.edu/feed/events/", scrape_frequency: "daily", primary_sdg_goals: [1, 10, 16, 17], region: "Americas", language: "en", requires_auth: false },
  { id: "odi-events", organization: "ODI", url: "https://odi.org/en/events/", scrape_method: "html", scrape_frequency: "daily", primary_sdg_goals: [1, 10, 17], region: "Europe", language: "en", requires_auth: false },
  { id: "ihme-events", organization: "IHME", url: "https://www.healthdata.org/events", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3], region: "Americas", language: "en", requires_auth: false },
  { id: "fcdo-events", organization: "FCDO", url: "https://www.gov.uk/government/organisations/foreign-commonwealth-development-office/about/news", scrape_method: "html", scrape_frequency: "daily", primary_sdg_goals: [17, 16], region: "Global", language: "en", requires_auth: false },
  { id: "msf-events", organization: "MSF", url: "https://www.msf.org/events", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3, 16], region: "Global", language: "en", requires_auth: false },
  { id: "icrc-events", organization: "ICRC", url: "https://www.icrc.org/en/events", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [16, 3], region: "Global", language: "en", requires_auth: false },
  { id: "sphere-events", organization: "Sphere", url: "https://spherestandards.org/events/", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [16, 1], region: "Global", language: "en", requires_auth: false },
  { id: "interaction-events", organization: "InterAction", url: "https://www.interaction.org/events/", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [17, 1, 16], region: "Americas", language: "en", requires_auth: false },
  { id: "africa-cdc-events", organization: "Africa CDC", url: "https://africacdc.org/events/", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3], region: "Africa", language: "en", requires_auth: false },
  { id: "paho-events", organization: "PAHO", url: "https://www.paho.org/en/events", scrape_method: "html", scrape_frequency: "daily", primary_sdg_goals: [3], region: "Americas", language: "en", requires_auth: false },
  { id: "who-afro-events", organization: "WHO AFRO", url: "https://www.afro.who.int/news/events", scrape_method: "html", scrape_frequency: "daily", primary_sdg_goals: [3], region: "Africa", language: "en", requires_auth: false },
  { id: "who-emro-events", organization: "WHO EMRO", url: "https://www.emro.who.int/events.html", scrape_method: "html", scrape_frequency: "daily", primary_sdg_goals: [3], region: "Middle-East", language: "en", requires_auth: false },
  { id: "world-bank-health-events", organization: "World Bank", url: "https://www.worldbank.org/en/events", scrape_method: "html", scrape_frequency: "daily", primary_sdg_goals: [3, 1, 10], region: "Global", language: "en", requires_auth: false },
  { id: "usaid-global-health-events", organization: "USAID Global Health", url: "https://www.usaid.gov/global-health", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3, 1, 2], region: "Global", language: "en", requires_auth: false },
  { id: "dfat-australia-events", organization: "DFAT Australia", url: "https://www.dfat.gov.au/aid/topics/investment-priorities/health", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3, 17], region: "Asia-Pacific", language: "en", requires_auth: false },
  { id: "giz-events", organization: "GIZ", url: "https://www.giz.de/en/html/events.html", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [17, 1, 3], region: "Global", language: "en", requires_auth: false },
  { id: "rockefeller-events", organization: "Rockefeller Foundation", url: "https://www.rockefellerfoundation.org/events/", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3, 11, 13], region: "Global", language: "en", requires_auth: false },
  { id: "osf-events", organization: "Open Society Foundations", url: "https://www.opensocietyfoundations.org/events", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [16, 10], region: "Global", language: "en", requires_auth: false },
  { id: "aga-khan-events", organization: "Aga Khan Foundation", url: "https://www.akdn.org/events", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [1, 3, 4, 11], region: "South-Asia", language: "en", requires_auth: false },
  { id: "path-events", organization: "PATH", url: "https://www.path.org/articles/?issue=events", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3], region: "Global", language: "en", requires_auth: false },
  { id: "fhi360-events", organization: "FHI 360", url: "https://www.fhi360.org/news-events/events", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3, 4, 5], region: "Global", language: "en", requires_auth: false },
  { id: "r4d-events", organization: "Results for Development", url: "https://r4d.org/events/", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3, 4, 1], region: "Global", language: "en", requires_auth: false },
  { id: "global-health-council-events", organization: "Global Health Council", url: "https://globalhealth.org/events/", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3, 17], region: "Americas", language: "en", requires_auth: false },
  { id: "oecd-dev-events", organization: "OECD Development Centre", url: "https://www.oecd.org/dev/events/", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [1, 10, 17], region: "Europe", language: "en", requires_auth: false },
  { id: "wef-events", organization: "World Economic Forum", url: "https://www.weforum.org/events/", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [17, 8, 13], region: "Global", language: "en", requires_auth: false },
  { id: "commonwealth-events", organization: "Commonwealth Secretariat", url: "https://thecommonwealth.org/events", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [16, 17, 1], region: "Global", language: "en", requires_auth: false },
  { id: "eclac-events", organization: "ECLAC", url: "https://www.cepal.org/en/events", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [1, 10, 8], region: "Americas", language: "en", requires_auth: false },
  { id: "unescap-events", organization: "UN ESCAP", url: "https://www.unescap.org/events", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [1, 10, 17], region: "Asia-Pacific", language: "en", requires_auth: false },
  { id: "who-euro-events", organization: "WHO EURO", url: "https://www.euro.who.int/en/media-centre/events", scrape_method: "html", scrape_frequency: "daily", primary_sdg_goals: [3], region: "Europe", language: "en", requires_auth: false },
  { id: "who-searo-events", organization: "WHO SEARO", url: "https://www.who.int/southeastasia/news/events", scrape_method: "html", scrape_frequency: "daily", primary_sdg_goals: [3], region: "South-Asia", language: "en", requires_auth: false },
  { id: "bmj-events", organization: "The BMJ", url: "https://www.bmj.com/events", scrape_method: "html", scrape_frequency: "weekly", primary_sdg_goals: [3], region: "Global", language: "en", requires_auth: false },
  // Phase 2 stubs
  { id: "who-twitter", organization: "World Health Organization", url: "https://twitter.com/WHO", scrape_method: "twitter", scrape_frequency: "hourly", primary_sdg_goals: [3], region: "Global", language: "en", requires_auth: true, phase2: true },
  { id: "un-linkedin", organization: "United Nations", url: "https://www.linkedin.com/company/united-nations", scrape_method: "linkedin", scrape_frequency: "daily", primary_sdg_goals: [17], region: "Global", language: "en", requires_auth: true, phase2: true },
  { id: "cidrap-newsletter", organization: "CIDRAP", url: "https://www.cidrap.umn.edu/newsletters", scrape_method: "newsletter", scrape_frequency: "daily", primary_sdg_goals: [3], region: "Americas", language: "en", requires_auth: true, phase2: true },
  { id: "who-youtube", organization: "WHO YouTube", url: "https://www.youtube.com/@WHO", scrape_method: "youtube", scrape_frequency: "daily", primary_sdg_goals: [3], region: "Global", language: "en", requires_auth: false, phase2: true },
];

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHLY_COST_LIMIT_USD = 50;
const INPUT_COST_PER_M = 3.0;
const OUTPUT_COST_PER_M = 15.0;
const MODEL = "claude-sonnet-4-20250514";

// ── Helpers ───────────────────────────────────────────────────────────────────

function estimateCost(inputLen: number, outputLen: number): number {
  return (inputLen / 4 / 1_000_000) * INPUT_COST_PER_M
       + (outputLen / 4 / 1_000_000) * OUTPUT_COST_PER_M;
}

async function fetchWithTimeout(url: string, timeoutMs = 10_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ForaHubBot/1.0; +https://forahub.org/about)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPageContent(source: Source): Promise<string> {
  if (source.phase2) {
    console.log(`[scraper] Phase 2 not implemented: ${source.scrape_method} — skipping ${source.id}`);
    return "";
  }

  if (source.scrape_method === "rss") {
    const feedUrl = source.rss_url ?? source.url;
    const res = await fetchWithTimeout(feedUrl);
    if (!res.ok) throw new Error(`RSS fetch failed: HTTP ${res.status}`);
    const xml = await res.text();
    // Minimal RSS text extraction
    return xml
      .replace(/<!\[CDATA\[([^\]]*)\]\]>/g, "$1")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{3,}/g, "\n\n")
      .trim()
      .slice(0, 50_000);
  }

  if (source.scrape_method === "ical") {
    const res = await fetchWithTimeout(source.url);
    if (!res.ok) throw new Error(`iCal fetch failed: HTTP ${res.status}`);
    return await res.text();
  }

  // HTML: fetch and strip tags
  const res = await fetchWithTimeout(source.url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // Check for login wall
  const lower = html.toLowerCase();
  if (["sign in to continue", "login to view", "members only", "restricted access"].some(s => lower.includes(s))) {
    console.log(`[scraper] Login wall detected for ${source.id}`);
    return "";
  }

  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{3,}/g, "\n\n")
    .trim()
    .slice(0, 50_000);
}

function buildPrompt(content: string, source: Source): string {
  return `You are an event extraction system for ForaHub, a platform tracking global development events.

SOURCE CONTEXT:
- Organization: ${source.organization}
- Primary SDGs: ${source.primary_sdg_goals.join(", ")}
- Region: ${source.region}
- Language: ${source.language}
- URL: ${source.url}

Extract ALL upcoming events. Return a JSON array. If no events, return [].
Each object:
{
  "title": "string",
  "description": "string|null",
  "start_date": "ISO8601|null",
  "end_date": "ISO8601|null",
  "location_city": "string|null",
  "location_country": "string|null",
  "location_venue": "string|null",
  "organization": "string",
  "registration_url": "string|null",
  "event_type": "conference|side_event|webinar|training|consultation|summit|null",
  "format": "in_person|virtual|hybrid|null",
  "cost_type": "free|paid|null",
  "cost_amount": "string|null",
  "audience_level": "researchers|practitioners|policymakers|donors|all|null",
  "is_public": true,
  "expected_attendance": "string|null",
  "sdg_goals": [3],
  "sdg_inferred": true,
  "region": "Africa|Americas|Asia-Pacific|Europe|Middle-East|South-Asia|Online|null",
  "is_side_event": false,
  "parent_conference_name": "string|null",
  "is_recurring": false,
  "series_name": "string|null",
  "speakers": [],
  "deadlines": [{"type":"abstract|early_bird|travel_grant|side_event_proposal|registration","date":"ISO8601","description":"string|null"}],
  "confidence_score": 4,
  "quality_score": 3,
  "event_brief": "Three paragraph brief (120-180 words): para1=what it is and why, para2=why it matters now, para3=who attends and key debates",
  "language": "en",
  "title_original": "string|null",
  "description_original": "string|null",
  "source_url": "${source.url}"
}
Rules: every event needs ≥1 SDG goal; infer if not explicit. confidence 1-5. quality: +1 desc, +1 reg_url, +1 both dates, +1 specific location, +1 explicit SDGs.
Return ONLY the JSON array.

CONTENT:
---
${content.slice(0, 40_000)}
---`;
}

function shouldAutoPublish(e: ExtractedEvent): boolean {
  if (!e.title || !e.start_date) return false;
  if (e.confidence_score < 4 || e.quality_score < 3) return false;
  const start = new Date(e.start_date).getTime();
  const now = Date.now();
  const cutoff = now + 24 * 30 * 24 * 3600_000;
  return start > now && start < cutoff;
}

function titleSimilarity(a: string, b: string): number {
  const words = (s: string) => new Set(s.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean));
  const wa = words(a);
  const wb = words(b);
  let inter = 0;
  wa.forEach(w => { if (wb.has(w)) inter++; });
  const union = wa.size + wb.size - inter;
  return union === 0 ? 1 : inter / union;
}

// ── Main scrape-source function ───────────────────────────────────────────────

async function scrapeSource(
  source: Source,
  supabase: ReturnType<typeof createClient>,
  anthropicKey: string,
  dryRun: boolean,
): Promise<RunResult> {
  const result: RunResult = {
    sourceId: source.id,
    eventsFound: 0,
    eventsInserted: 0,
    eventsUpdated: 0,
    eventsRejected: 0,
    eventsPendingReview: 0,
    estimatedCost: 0,
  };

  const startedAt = new Date().toISOString();
  let runId: string | null = null;

  if (!dryRun) {
    const { data } = await supabase.from("scraping_runs").insert({
      source_id: source.id,
      source_url: source.url,
      started_at: startedAt,
    }).select("id").single();
    runId = data?.id ?? null;
  }

  try {
    const content = await fetchPageContent(source);

    if (!content || content.trim().length < 100) {
      result.error = "Empty or insufficient content";
      await finaliseRun(supabase, runId, result, dryRun);
      return result;
    }

    const prompt = buildPrompt(content, source);
    const client = new Anthropic({ apiKey: anthropicKey });

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const rawOutput = message.content
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { type: string; text?: string }) => b.text ?? "")
      .join("");

    result.estimatedCost = estimateCost(prompt.length, rawOutput.length);

    let events: ExtractedEvent[] = [];
    try {
      const json = rawOutput.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      events = JSON.parse(json) as ExtractedEvent[];
    } catch {
      result.error = "JSON parse failed";
      await finaliseRun(supabase, runId, result, dryRun);
      return result;
    }

    result.eventsFound = events.length;

    if (dryRun) {
      result.eventsInserted = events.filter(e => e.title && e.start_date && new Date(e.start_date) > new Date()).length;
      await finaliseRun(supabase, runId, result, dryRun);
      return result;
    }

    // Fetch recent existing events for dedup
    const lookAhead = new Date();
    lookAhead.setMonth(lookAhead.getMonth() + 24);
    const { data: existing } = await supabase
      .from("events")
      .select("id, title, start_date, end_date")
      .gte("start_date", new Date().toISOString())
      .lte("start_date", lookAhead.toISOString());
    const existingEvents = existing ?? [];

    for (const event of events) {
      if (!event.title || !event.start_date) { result.eventsRejected++; continue; }
      const start = new Date(event.start_date);
      if (isNaN(start.getTime()) || start <= new Date()) { result.eventsRejected++; continue; }

      const dupe = existingEvents.find(row => {
        if (titleSimilarity(event.title, row.title) < 0.85) return false;
        const aS = new Date(event.start_date!).getTime();
        const bS = new Date(row.start_date).getTime();
        return Math.abs(aS - bS) < 14 * 86_400_000;
      });

      const status = shouldAutoPublish(event) ? "published" : "pending";
      if (status === "pending") result.eventsPendingReview++;

      const location = [event.location_venue, event.location_city, event.location_country].filter(Boolean).join(", ") || null;

      const row = {
        title: event.title,
        description: event.description ?? null,
        start_date: event.start_date,
        end_date: event.end_date ?? null,
        location,
        organization: event.organization,
        sdg_goals: event.sdg_goals,
        event_type: event.event_type ?? "conference",
        format: event.format ?? "in_person",
        registration_url: event.registration_url ?? null,
        status,
        source_url: event.source_url ?? source.url,
        source_id: source.id,
        confidence_score: event.confidence_score,
        quality_score: event.quality_score,
        event_brief: event.event_brief ?? null,
        is_side_event: event.is_side_event ?? false,
        parent_conference_name: event.parent_conference_name ?? null,
        is_recurring: event.is_recurring ?? false,
        series_name: event.series_name ?? null,
        sdg_inferred: event.sdg_inferred ?? true,
        region: event.region ?? null,
        cost_type: event.cost_type ?? null,
        cost_amount: event.cost_amount ?? null,
        audience_level: event.audience_level ?? null,
        is_public: event.is_public ?? true,
        expected_attendance: event.expected_attendance ?? null,
        speakers: event.speakers?.length ? event.speakers : null,
        language: event.language ?? "en",
        title_original: event.title_original ?? null,
        description_original: event.description_original ?? null,
      };

      if (dupe) {
        await supabase.from("events").update(row).eq("id", dupe.id);
        result.eventsUpdated++;
      } else {
        const { data: inserted, error } = await supabase.from("events").insert(row).select("id").single();
        if (error) { result.eventsRejected++; continue; }

        // Upsert deadlines
        for (const dl of event.deadlines ?? []) {
          if (!dl.date) continue;
          await supabase.from("event_deadlines").upsert(
            { event_id: inserted.id, deadline_type: dl.type, deadline_date: dl.date, description: dl.description ?? null },
            { onConflict: "event_id,deadline_type" },
          );
        }

        existingEvents.push({ id: inserted.id, title: event.title, start_date: event.start_date!, end_date: event.end_date ?? null });
        result.eventsInserted++;
      }
    }

    // Mark source as successfully scraped
    await supabase.from("sources").update({
      last_scraped_at: new Date().toISOString(),
      consecutive_failures: 0,
      needs_attention: false,
      total_events_found: supabase.rpc("coalesce", {}), // handled via raw increment below
    }).eq("id", source.id);

    await supabase.rpc("increment_source_events", { p_source_id: source.id, p_count: result.eventsFound }).catch(() => {
      // RPC may not exist yet — best effort
    });

  } catch (err) {
    result.error = String(err);
    // Increment consecutive failures
    const { data: src } = await supabase.from("sources").select("consecutive_failures").eq("id", source.id).single();
    const failures = (src?.consecutive_failures ?? 0) + 1;
    await supabase.from("sources").update({
      consecutive_failures: failures,
      needs_attention: failures >= 3,
    }).eq("id", source.id);
  }

  await finaliseRun(supabase, runId, result, dryRun);
  return result;
}

async function finaliseRun(
  supabase: ReturnType<typeof createClient>,
  runId: string | null,
  result: RunResult,
  dryRun: boolean,
): Promise<void> {
  if (dryRun || !runId) return;
  await supabase.from("scraping_runs").update({
    completed_at: new Date().toISOString(),
    events_found: result.eventsFound,
    events_inserted: result.eventsInserted,
    events_updated: result.eventsUpdated,
    events_rejected: result.eventsRejected,
    events_pending_review: result.eventsPendingReview,
    error_message: result.error ?? null,
    estimated_api_cost: result.estimatedCost,
  }).eq("id", runId);
}

// ── Attention digest email ────────────────────────────────────────────────────

async function sendAttentionDigest(
  supabase: ReturnType<typeof createClient>,
  resendKey: string,
  adminEmail: string,
): Promise<void> {
  const { data: sources } = await supabase
    .from("sources")
    .select("id, organization, url, consecutive_failures, last_scraped_at")
    .eq("needs_attention", true)
    .eq("is_active", true);

  if (!sources || sources.length === 0) return;

  const lines = sources.map((s: { organization: string; url: string; consecutive_failures: number; last_scraped_at: string | null }) =>
    `• ${s.organization} (${s.url}) — ${s.consecutive_failures} consecutive failures, last scraped: ${s.last_scraped_at ?? "never"}`
  ).join("\n");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "ForaHub Pipeline <pipeline@forahub.org>",
      to: [adminEmail],
      subject: `[ForaHub] ${sources.length} source(s) need attention`,
      text: `Daily scraping digest — sources requiring attention:\n\n${lines}\n\nReview at https://forahub.org/admin/review`,
    }),
  });
}

// ── Edge function handler ─────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const adminEmail = Deno.env.get("ADMIN_EMAIL") ?? "mkkakay@gmail.com";

  if (!anthropicKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let body: { frequency?: ScrapeFrequency; dryRun?: boolean; testMode?: boolean; sourceIds?: string[] } = {};
  try { body = await req.json(); } catch { /* no body */ }

  const { frequency, dryRun = false, testMode = false, sourceIds } = body;
  const isTestMode = testMode || dryRun;

  // Check monthly API cost — if over limit, pause low-priority sources
  const { data: costData } = await supabase.rpc("get_monthly_api_cost_estimate");
  const monthlyCost = Number(costData ?? 0);
  if (monthlyCost >= MONTHLY_COST_LIMIT_USD) {
    console.warn(`[scraper] Monthly cost limit reached: $${monthlyCost.toFixed(2)} — pausing weekly sources`);
    if (!isTestMode) {
      await supabase.from("sources").update({ is_active: false }).eq("scrape_frequency", "weekly");
    }
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "ForaHub Pipeline <pipeline@forahub.org>",
          to: [adminEmail],
          subject: "[ForaHub] Monthly API cost limit reached",
          text: `Monthly Claude API cost has reached $${monthlyCost.toFixed(2)} (limit: $${MONTHLY_COST_LIMIT_USD}). Weekly sources have been paused. Review at https://forahub.org/admin.`,
        }),
      });
    }
  }

  // Determine which sources to run
  let sources = ALL_SOURCES.filter(s => !s.phase2);

  if (sourceIds?.length) {
    sources = sources.filter(s => sourceIds.includes(s.id));
  } else if (frequency) {
    sources = sources.filter(s => s.scrape_frequency === frequency);
  } else {
    // No frequency specified — scrape based on what is due
    const { data: dbSources } = await supabase.from("sources").select("id, last_scraped_at, scrape_frequency, is_active");
    const now = Date.now();
    const thresholds: Record<ScrapeFrequency, number> = {
      hourly: 3600_000,
      daily: 86_400_000,
      weekly: 7 * 86_400_000,
    };
    sources = sources.filter(s => {
      const db = (dbSources ?? []).find((r: { id: string }) => r.id === s.id);
      if (db && !db.is_active) return false;
      const last = db?.last_scraped_at ? new Date(db.last_scraped_at).getTime() : 0;
      return now - last >= thresholds[s.scrape_frequency];
    });
  }

  console.log(`[scraper] Running ${sources.length} sources (dryRun=${dryRun}, testMode=${testMode})`);

  const results: RunResult[] = [];
  let totalCost = 0;

  for (const source of sources) {
    // Stop if we hit the monthly limit mid-run
    if (totalCost + monthlyCost >= MONTHLY_COST_LIMIT_USD && source.scrape_frequency === "weekly") {
      console.warn(`[scraper] Skipping ${source.id} — cost limit approaching`);
      continue;
    }

    try {
      const result = await scrapeSource(source, supabase, anthropicKey, isTestMode);
      results.push(result);
      totalCost += result.estimatedCost;
      console.log(`[scraper] ${source.id}: found=${result.eventsFound} inserted=${result.eventsInserted} updated=${result.eventsUpdated} cost=$${result.estimatedCost.toFixed(4)} ${result.error ? `error=${result.error}` : ""}`);
    } catch (err) {
      console.error(`[scraper] Unhandled error for ${source.id}:`, err);
      results.push({
        sourceId: source.id,
        eventsFound: 0, eventsInserted: 0, eventsUpdated: 0,
        eventsRejected: 0, eventsPendingReview: 0, estimatedCost: 0,
        error: String(err),
      });
    }
  }

  // Send daily attention digest (8am UTC guard is handled by the cron schedule)
  if (!isTestMode && resendKey && frequency === "daily") {
    await sendAttentionDigest(supabase, resendKey, adminEmail).catch(err =>
      console.error("[scraper] Digest email failed:", err)
    );
  }

  const summary = {
    sourcesRun: results.length,
    totalEventsFound: results.reduce((s, r) => s + r.eventsFound, 0),
    totalInserted: results.reduce((s, r) => s + r.eventsInserted, 0),
    totalUpdated: results.reduce((s, r) => s + r.eventsUpdated, 0),
    totalRejected: results.reduce((s, r) => s + r.eventsRejected, 0),
    totalPendingReview: results.reduce((s, r) => s + r.eventsPendingReview, 0),
    estimatedRunCost: totalCost,
    monthlyCostSoFar: monthlyCost + totalCost,
    dryRun: isTestMode,
    failures: results.filter(r => r.error).map(r => ({ source: r.sourceId, error: r.error })),
  };

  console.log("[scraper] Run complete:", summary);
  return new Response(JSON.stringify(summary), { headers: { "Content-Type": "application/json" } });
});
