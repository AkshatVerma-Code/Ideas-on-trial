export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      settings: {
        Row: { key: string; value: string; updated_at: string }
        Insert: { key: string; value: string; updated_at?: string }
        Update: { key?: string; value?: string; updated_at?: string }
      }
      questions: {
        Row: {
          id: string
          text: string
          timer_seconds: number
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          text: string
          timer_seconds?: number
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          text?: string
          timer_seconds?: number
          display_order?: number
          updated_at?: string
        }
      }
      options: {
        Row: {
          id: string
          question_id: string
          text: string
          weight: number
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          question_id: string
          text: string
          weight?: number
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          question_id?: string
          text?: string
          weight?: number
          display_order?: number
        }
      }
      participants: {
        Row: {
          id: string
          team_name: string
          team_name_normalized: string
          fingerprint: string | null
          ip_address: string | null
          started_at: string
          completed_at: string | null
          total_score: number
          session_token: string
        }
        Insert: {
          id?: string
          team_name: string
          team_name_normalized: string
          fingerprint?: string | null
          ip_address?: string | null
          started_at?: string
          completed_at?: string | null
          total_score?: number
          session_token: string
        }
        Update: {
          completed_at?: string | null
          total_score?: number
          fingerprint?: string | null
        }
      }
      answers: {
        Row: {
          id: string
          participant_id: string
          question_id: string
          option_id: string | null
          score: number
          time_taken_seconds: number | null
          answered_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          question_id: string
          option_id?: string | null
          score?: number
          time_taken_seconds?: number | null
          answered_at?: string
        }
        Update: {
          option_id?: string | null
          score?: number
          time_taken_seconds?: number | null
        }
      }
    }
  }
}

// Convenience types
export type Question = Database['public']['Tables']['questions']['Row']
export type Option = Database['public']['Tables']['options']['Row']
export type Participant = Database['public']['Tables']['participants']['Row']
export type Answer = Database['public']['Tables']['answers']['Row']
export type Setting = Database['public']['Tables']['settings']['Row']

export type QuestionWithOptions = Question & { options: Option[] }
