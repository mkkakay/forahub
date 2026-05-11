/**
 * Sources that cannot be scraped via server-side HTTP requests.
 * These are NOT included in the active SOURCES array.
 * They are tracked here for documentation, future retry, or manual import.
 */

export type BlockedReason =
  | 'blocked_cloudflare'
  | 'login_required'
  | 'js_rendered'
  | 'rate_limited'
  | 'manual_review';

export interface BlockedSource {
  id: string;
  url: string;
  name: string;
  organization: string;
  primary_sdg_goals: number[];
  region: string;
  status: BlockedReason;
  notes: string;
}

export const BLOCKED_SOURCES: BlockedSource[] = [
  {
    id: 'iisd-sdg-events',
    url: 'https://sdg.iisd.org/events/',
    name: 'IISD SDG Knowledge Hub Events',
    organization: 'IISD',
    primary_sdg_goals: [17, 13, 16],
    region: 'Global',
    status: 'blocked_cloudflare',
    notes: 'Server-side requests return Cloudflare challenge HTML as of 2026-05-11.',
  },
  {
    id: 'iisd-enb-events',
    url: 'https://enb.iisd.org/events',
    name: 'IISD Earth Negotiations Bulletin Events',
    organization: 'IISD',
    primary_sdg_goals: [13, 17],
    region: 'Global',
    status: 'blocked_cloudflare',
    notes: 'Server-side requests return Cloudflare challenge HTML as of 2026-05-11.',
  },
  {
    id: 'iisd-climate-events',
    url: 'https://www.iisd.org/events',
    name: 'IISD Main Events',
    organization: 'IISD',
    primary_sdg_goals: [13, 17],
    region: 'Global',
    status: 'blocked_cloudflare',
    notes: 'Server-side requests return Cloudflare challenge HTML as of 2026-05-11.',
  },
];
