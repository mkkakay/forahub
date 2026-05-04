import type { ScraperSource } from './types';
import { SOURCES_GLOBAL } from './sources-global-orgs';
import { SOURCES_AFRICA } from './sources-africa';
import { SOURCES_MENA } from './sources-mena';
import { SOURCES_ASIA } from './sources-asia';
import { SOURCES_AMERICAS } from './sources-americas';
import { SOURCES_EUROPE } from './sources-europe';
import { SOURCES_TECH } from './sources-tech';

/**
 * Canonical list of event sources for ForaHub — 1000+ sources total.
 *
 * Sources are split into regional/thematic sub-files to keep each file
 * manageable and prevent build timeouts:
 *   sources-global-orgs.ts  – UN system, global bodies, thematic SDG orgs
 *   sources-africa.ts       – Sub-Saharan Africa ministries, regional bodies, universities
 *   sources-mena.ts         – Middle East and North Africa
 *   sources-asia.ts         – South/Southeast/East/Central Asia and Pacific
 *   sources-americas.ts     – Latin America and the Caribbean
 *   sources-europe.ts       – Eastern Europe and Caucasus ministries
 *   sources-tech.ts         – Technology, AI/data science, fintech for development
 *
 * Scrape method priority: rss > ical > html > pdf
 * Phase 2 stubs (twitter, linkedin, newsletter, youtube) are included for
 * architecture completeness but return empty content gracefully.
 */
export const SOURCES: ScraperSource[] = [
  ...SOURCES_GLOBAL,
  ...SOURCES_AFRICA,
  ...SOURCES_MENA,
  ...SOURCES_ASIA,
  ...SOURCES_AMERICAS,
  ...SOURCES_EUROPE,
  ...SOURCES_TECH,

  // ── PHASE 2 STUBS ─────────────────────────────────────────────────────────
  // Phase 2 requires API keys and additional setup.
  // These return empty content gracefully with a log message.

  {
    id: 'who-twitter',
    organization: 'World Health Organization',
    url: 'https://twitter.com/WHO',
    source_type: 'twitter',
    scrape_method: 'twitter',
    scrape_frequency: 'hourly',
    primary_sdg_goals: [3],
    region: 'Global',
    language: 'en',
    requires_auth: true,
    phase2: true,
  },
  {
    id: 'un-linkedin',
    organization: 'United Nations',
    url: 'https://www.linkedin.com/company/united-nations',
    source_type: 'linkedin',
    scrape_method: 'linkedin',
    scrape_frequency: 'daily',
    primary_sdg_goals: [17],
    region: 'Global',
    language: 'en',
    requires_auth: true,
    phase2: true,
  },
  {
    id: 'cidrap-newsletter',
    organization: 'CIDRAP (Center for Infectious Disease Research and Policy)',
    url: 'https://www.cidrap.umn.edu/newsletters',
    source_type: 'newsletter',
    scrape_method: 'newsletter',
    scrape_frequency: 'daily',
    primary_sdg_goals: [3],
    region: 'Americas',
    language: 'en',
    requires_auth: true,
    phase2: true,
  },
  {
    id: 'who-youtube',
    organization: 'World Health Organization',
    url: 'https://www.youtube.com/@WHO',
    source_type: 'youtube',
    scrape_method: 'youtube',
    scrape_frequency: 'daily',
    primary_sdg_goals: [3],
    region: 'Global',
    language: 'en',
    requires_auth: false,
    phase2: true,
  },
];

/** Return only active non-phase2 sources, optionally filtered by frequency. */
export function getActiveSources(frequency?: 'hourly' | 'daily' | 'weekly'): ScraperSource[] {
  return SOURCES.filter(s => {
    if (s.phase2) return false;
    if (frequency && s.scrape_frequency !== frequency) return false;
    return true;
  });
}

/** Return a source by id. */
export function getSourceById(id: string): ScraperSource | undefined {
  return SOURCES.find(s => s.id === id);
}
