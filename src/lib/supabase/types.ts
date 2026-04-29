export type EventType = 'conference' | 'side_event' | 'webinar' | 'training'
export type EventFormat = 'in_person' | 'virtual' | 'hybrid'

interface EventRow {
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
}

interface SavedEventRow {
  id: string
  user_id: string
  event_id: string
  created_at: string
}

interface UserPreferencesRow {
  id: string
  user_id: string
  sdg_goals: number[]
  event_types: EventType[]
  regions: string[]
  email_alerts: boolean
  created_at: string
}

export interface Database {
  public: {
    Views: Record<string, never>
    Functions: Record<string, never>
    Tables: {
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
    }
  }
}
