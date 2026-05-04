import type { ScraperSource } from './types';

export const SOURCES_EUROPE: ScraperSource[] = [
  { id: 'moh-ua', organization: 'Ministry of Health — Ukraine', url: 'https://moz.gov.ua/en/news', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [3], region: 'Europe-East', language: 'en', requires_auth: false },
  { id: 'moh-am', organization: 'Ministry of Health — Armenia', url: 'https://www.moh.am/en/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [3], region: 'Europe-East', language: 'en', requires_auth: false },
  { id: 'moh-az', organization: 'Ministry of Health — Azerbaijan', url: 'https://www.sehiyye.gov.az/en/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [3], region: 'Europe-East', language: 'en', requires_auth: false },
  { id: 'moh-ge', organization: 'Ministry of Health — Georgia', url: 'https://www.moh.gov.ge/en/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [3], region: 'Europe-East', language: 'en', requires_auth: false },

  { id: 'moh-al', organization: 'Ministry of Health — Albania', url: 'https://shendetesia.gov.al/en/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [3], region: 'Europe-South', language: 'en', requires_auth: false },
  { id: 'moh-ba', organization: 'Ministry of Health — Bosnia and Herzegovina', url: 'https://www.mz.gov.ba/en', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [3], region: 'Europe-East', language: 'en', requires_auth: false },
  { id: 'moh-rs', organization: 'Ministry of Health — Serbia', url: 'https://www.zdravlje.gov.rs/en', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [3], region: 'Europe-East', language: 'en', requires_auth: false },
];
