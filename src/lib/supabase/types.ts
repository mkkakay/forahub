export type EventType = 'conference' | 'side_event' | 'webinar' | 'training'
export type EventFormat = 'in_person' | 'virtual' | 'hybrid'

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['events']['Insert']>
      }
      saved_events: {
        Row: {
          id: string
          user_id: string
          event_id: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['saved_events']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['saved_events']['Insert']>
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          sdg_goals: number[]
          event_types: EventType[]
          regions: string[]
          email_alerts: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_preferences']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_preferences']['Insert']>
      }
    }
  }
}
