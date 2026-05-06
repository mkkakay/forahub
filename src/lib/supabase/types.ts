export type SubscriptionTier = 'free' | 'pro' | 'founding'

export interface ProfileRow {
  id: string
  subscription_tier: SubscriptionTier
  stripe_customer_id: string | null
  subscription_end_date: string | null
  trial_end_date: string | null
  created_at: string
}

export type EventType = 'conference' | 'side_event' | 'webinar' | 'training' | 'consultation' | 'summit'
export type EventFormat = 'in_person' | 'virtual' | 'hybrid'
export type EventStatus = 'pending' | 'published' | 'rejected'
export type AttendanceStatus = 'interested' | 'registered' | 'attended'
export type AudienceLevel = 'researchers' | 'practitioners' | 'policymakers' | 'donors' | 'all'

export interface EventRow {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string | null
  location: string | null
  organization: string | null
  sdg_goals: number[]
  event_type: EventType
  format: EventFormat
  registration_url: string | null
  is_featured: boolean
  created_at: string
  registration_deadline: string | null
  // Scraping metadata
  status: EventStatus
  source_url: string | null
  source_id: string | null
  confidence_score: number | null
  quality_score: number | null
  event_brief: string | null
  parent_event_id: string | null
  parent_conference_name: string | null
  is_side_event: boolean
  is_recurring: boolean
  series_name: string | null
  sdg_inferred: boolean
  region: string | null
  cost_type: 'free' | 'paid' | null
  cost_amount: string | null
  audience_level: AudienceLevel | null
  is_public: boolean
  expected_attendance: string | null
  speakers: string[] | null
  language: string
  title_original: string | null
  description_original: string | null
  is_hero_featured: boolean
  hero_panel_position: number | null
  hero_featured_until: string | null
}

export interface EventDeadlineRow {
  id: string
  event_id: string
  deadline_type: 'abstract' | 'early_bird' | 'travel_grant' | 'side_event_proposal' | 'registration'
  deadline_date: string
  description: string | null
  created_at: string
}

export interface SourceRow {
  id: string
  organization: string
  url: string
  source_type: string
  scrape_method: string
  scrape_frequency: 'hourly' | 'daily' | 'weekly'
  primary_sdg_goals: number[]
  region: string | null
  language: string
  requires_auth: boolean
  last_scraped_at: string | null
  consecutive_failures: number
  needs_attention: boolean
  total_events_found: number
  is_active: boolean
  created_at: string
}

export interface ScrapingRunRow {
  id: string
  source_id: string | null
  source_url: string | null
  started_at: string
  completed_at: string | null
  events_found: number
  events_inserted: number
  events_updated: number
  events_rejected: number
  events_pending_review: number
  error_message: string | null
  estimated_api_cost: number
  created_at: string
}

export interface SavedEventRow {
  id: string
  user_id: string
  event_id: string
  status: AttendanceStatus | null
  notes: string | null
  reminder_date: string | null
  created_at: string
}

export interface UserPreferencesRow {
  id: string
  user_id: string
  sdg_goals: number[]
  event_types: EventType[]
  regions: string[]
  email_alerts: boolean
  created_at: string
}

export interface UserCollectionRow {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface CollectionEventRow {
  id: string
  collection_id: string
  event_id: string
  added_at: string
}

export interface Database {
  public: {
    Views: Record<string, never>
    Functions: {
      get_founding_member_count: { Returns: number }
    }
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: Omit<ProfileRow, 'created_at'> & { created_at?: string }
        Update: Partial<Omit<ProfileRow, 'id' | 'created_at'>>
        Relationships: []
      }
      events: {
        Row: EventRow
        Insert: Omit<EventRow, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<EventRow, 'id' | 'created_at'>>
        Relationships: []
      }
      saved_events: {
        Row: SavedEventRow
        Insert: Omit<SavedEventRow, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<SavedEventRow, 'id' | 'created_at'>>
        Relationships: []
      }
      user_preferences: {
        Row: UserPreferencesRow
        Insert: Omit<UserPreferencesRow, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<UserPreferencesRow, 'id' | 'created_at'>>
        Relationships: []
      }
      user_collections: {
        Row: UserCollectionRow
        Insert: Omit<UserCollectionRow, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<UserCollectionRow, 'id' | 'created_at'>>
        Relationships: []
      }
      collection_events: {
        Row: CollectionEventRow
        Insert: Omit<CollectionEventRow, 'id' | 'added_at'> & { id?: string; added_at?: string }
        Update: Partial<Omit<CollectionEventRow, 'id' | 'added_at'>>
        Relationships: []
      }
    }
  }
}
