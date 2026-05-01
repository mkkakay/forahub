export type EventType = 'conference' | 'side_event' | 'webinar' | 'training'
export type EventFormat = 'in_person' | 'virtual' | 'hybrid'
export type AttendanceStatus = 'interested' | 'registered' | 'attended'

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
