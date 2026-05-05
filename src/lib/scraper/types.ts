export type ScrapeMethod = 'html' | 'rss' | 'ical' | 'pdf' | 'twitter' | 'linkedin' | 'newsletter' | 'youtube';
export type SourceType = 'website' | 'rss' | 'ical' | 'pdf' | 'twitter' | 'linkedin' | 'newsletter' | 'youtube';
export type ScrapeFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly';
export type Region =
  | 'Global' | 'Online'
  | 'Africa' | 'Africa-West' | 'Africa-East' | 'Africa-Central' | 'Africa-Southern' | 'Africa-North'
  | 'Americas' | 'Americas-North' | 'Americas-Latin' | 'Americas-Caribbean'
  | 'Asia-Pacific' | 'Asia-South' | 'Asia-Southeast' | 'Asia-East' | 'Asia-Central'
  | 'Pacific'
  | 'Europe' | 'Europe-West' | 'Europe-East' | 'Europe-Nordic' | 'Europe-South'
  | 'Middle-East' | 'South-Asia';
export type EventFormat = 'in_person' | 'virtual' | 'hybrid';
export type EventType = 'conference' | 'side_event' | 'webinar' | 'training' | 'consultation' | 'summit';
export type EventStatus = 'pending' | 'published' | 'rejected';
export type AudienceLevel = 'researchers' | 'practitioners' | 'policymakers' | 'donors' | 'all';
export type DeadlineType = 'abstract' | 'early_bird' | 'travel_grant' | 'side_event_proposal' | 'registration';

export interface CssSelectors {
  title?: string;
  date?: string;
  location?: string;
  description?: string;
  link?: string;
  container?: string;
}

export interface ScraperSource {
  id: string;
  url: string;
  organization: string;
  primary_sdg_goals: number[];
  scrape_method: ScrapeMethod;
  source_type: SourceType;
  scrape_frequency: ScrapeFrequency;
  requires_auth: boolean;
  css_selectors?: CssSelectors;
  rss_url?: string;
  language: string;
  region: Region;
  /** Phase 2 stub — no real scraping implemented yet */
  phase2?: boolean;
}

export interface FetchResult {
  content: string;
  contentType: 'html' | 'rss' | 'ical' | 'pdf' | 'json' | 'empty';
  detectedLanguage: string;
  paginationPages: string[];
  requiresAuth: boolean;
  error?: string;
}

export interface EventDeadline {
  type: DeadlineType;
  date: string;        // ISO 8601
  description?: string;
}

export interface ExtractedEvent {
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  location_city?: string;
  location_country?: string;
  location_venue?: string;
  organization: string;
  registration_url?: string;
  event_type?: EventType;
  format?: EventFormat;
  cost_type?: 'free' | 'paid';
  cost_amount?: string;
  audience_level?: AudienceLevel;
  is_public: boolean;
  expected_attendance?: string;
  sdg_goals: number[];
  sdg_inferred: boolean;
  region?: Region;
  is_side_event: boolean;
  parent_conference_name?: string;
  is_recurring: boolean;
  series_name?: string;
  speakers: string[];
  deadlines: EventDeadline[];
  confidence_score: number;  // 1–5
  quality_score: number;     // 0–5
  event_brief?: string;
  language: string;
  title_original?: string;
  description_original?: string;
  source_url: string;
}

export interface UpsertResult {
  inserted: number;
  updated: number;
  rejected: number;
  pendingReview: number;
}

export interface ScrapingRunRecord {
  sourceId: string;
  sourceUrl: string;
  startedAt: Date;
  completedAt?: Date;
  eventsFound: number;
  eventsInserted: number;
  eventsUpdated: number;
  eventsRejected: number;
  eventsPendingReview: number;
  errorMessage?: string;
  estimatedApiCost: number;
}

export interface PipelineOptions {
  dryRun?: boolean;
  sourceIds?: string[];           // restrict to specific sources
  frequency?: ScrapeFrequency;    // restrict to a frequency tier
  maxSources?: number;
}
