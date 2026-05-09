import type { ScraperSource } from './types';
import { SOURCES_GLOBAL } from './sources-global-orgs';
import { SOURCES_AFRICA } from './sources-africa';
import { SOURCES_MENA } from './sources-mena';
import { SOURCES_ASIA } from './sources-asia';
import { SOURCES_AMERICAS } from './sources-americas';
import { SOURCES_EUROPE } from './sources-europe';
import { SOURCES_TECH } from './sources-tech';
import { SOURCES_CLIMATE } from './sources-climate-environment';
import { SOURCES_EDUCATION } from './sources-education';
import { SOURCES_GENDER_SOCIAL } from './sources-gender-social';
import { SOURCES_FOOD_AGRICULTURE } from './sources-food-agriculture';
import { SOURCES_GOVERNANCE_PEACE } from './sources-governance-peace';
import { SOURCES_ECONOMIC_FINANCE } from './sources-economic-finance';
import { SOURCES_HUMANITARIAN } from './sources-humanitarian';
import { SOURCES_YOUTH_STUDENTS } from './sources-youth-students';
import { SOURCES_EUROPE_EXPANDED } from './sources-europe-expanded';
import { SOURCES_PACIFIC_OCEANIA } from './sources-pacific-oceania';
import { SOURCES_SOUTH_ASIA } from './sources-south-asia';
import { SOURCES_LATIN_AMERICA } from './sources-latin-america';
import { SOURCES_GLOBAL_CONFERENCES } from './sources-global-conferences';

export const SOURCES: ScraperSource[] = [
  ...SOURCES_GLOBAL,
  ...SOURCES_AFRICA,
  ...SOURCES_MENA,
  ...SOURCES_ASIA,
  ...SOURCES_AMERICAS,
  ...SOURCES_EUROPE,
  ...SOURCES_TECH,
  ...SOURCES_CLIMATE,
  ...SOURCES_EDUCATION,
  ...SOURCES_GENDER_SOCIAL,
  ...SOURCES_FOOD_AGRICULTURE,
  ...SOURCES_GOVERNANCE_PEACE,
  ...SOURCES_ECONOMIC_FINANCE,
  ...SOURCES_HUMANITARIAN,
  ...SOURCES_YOUTH_STUDENTS,
  ...SOURCES_EUROPE_EXPANDED,
  ...SOURCES_PACIFIC_OCEANIA,
  ...SOURCES_SOUTH_ASIA,
  ...SOURCES_LATIN_AMERICA,
  ...SOURCES_GLOBAL_CONFERENCES,

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
