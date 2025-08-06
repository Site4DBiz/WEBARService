/**
 * Supabase Database Type Definitions
 * 
 * These types will be generated from your Supabase database schema
 * You can generate them using the Supabase CLI:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
 * 
 * For now, we'll define a basic structure that can be extended
 */

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
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          email: string
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          email: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          email?: string
        }
        Relationships: []
      }
      ar_contents: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          title: string
          description: string | null
          marker_url: string | null
          model_url: string | null
          is_public: boolean
          view_count: number
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          title: string
          description?: string | null
          marker_url?: string | null
          model_url?: string | null
          is_public?: boolean
          view_count?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          title?: string
          description?: string | null
          marker_url?: string | null
          model_url?: string | null
          is_public?: boolean
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "ar_contents_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      ar_markers: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          content_id: string
          marker_image_url: string
          marker_pattern_url: string | null
          width: number
          height: number
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          content_id: string
          marker_image_url: string
          marker_pattern_url?: string | null
          width?: number
          height?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          content_id?: string
          marker_image_url?: string
          marker_pattern_url?: string | null
          width?: number
          height?: number
        }
        Relationships: [
          {
            foreignKeyName: "ar_markers_content_id_fkey"
            columns: ["content_id"]
            referencedRelation: "ar_contents"
            referencedColumns: ["id"]
          }
        ]
      }
      access_logs: {
        Row: {
          id: string
          created_at: string
          user_id: string | null
          content_id: string
          ip_address: string | null
          user_agent: string | null
          session_duration: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id?: string | null
          content_id: string
          ip_address?: string | null
          user_agent?: string | null
          session_duration?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string | null
          content_id?: string
          ip_address?: string | null
          user_agent?: string | null
          session_duration?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_content_id_fkey"
            columns: ["content_id"]
            referencedRelation: "ar_contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_logs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}