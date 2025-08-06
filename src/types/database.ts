export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'admin' | 'creator' | 'viewer' | 'moderator'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          website: string | null
          is_public: boolean
          role: UserRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          is_public?: boolean
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          is_public?: boolean
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_ar_contents: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          content_type: string | null
          target_file_url: string | null
          model_file_url: string | null
          metadata: Json | null
          is_public: boolean
          view_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          content_type?: string | null
          target_file_url?: string | null
          model_file_url?: string | null
          metadata?: Json | null
          is_public?: boolean
          view_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          content_type?: string | null
          target_file_url?: string | null
          model_file_url?: string | null
          metadata?: Json | null
          is_public?: boolean
          view_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_ar_contents_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      user_favorites: {
        Row: {
          id: string
          user_id: string
          content_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_favorites_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_favorites_content_id_fkey'
            columns: ['content_id']
            referencedRelation: 'user_ar_contents'
            referencedColumns: ['id']
          },
        ]
      }
      user_activity_logs: {
        Row: {
          id: string
          user_id: string
          activity_type: string
          resource_type: string | null
          resource_id: string | null
          metadata: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity_type: string
          resource_type?: string | null
          resource_id?: string | null
          metadata?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          activity_type?: string
          resource_type?: string | null
          resource_id?: string | null
          metadata?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_activity_logs_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      permissions: {
        Row: {
          id: string
          resource: string
          action: string
          role: UserRole
          created_at: string
        }
        Insert: {
          id?: string
          resource: string
          action: string
          role: UserRole
          created_at?: string
        }
        Update: {
          id?: string
          resource?: string
          action?: string
          role?: UserRole
          created_at?: string
        }
        Relationships: []
      }
      role_assignments: {
        Row: {
          id: string
          user_id: string
          role: UserRole
          assigned_by: string | null
          reason: string | null
          created_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          role: UserRole
          assigned_by?: string | null
          reason?: string | null
          created_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          role?: UserRole
          assigned_by?: string | null
          reason?: string | null
          created_at?: string
          expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'role_assignments_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'role_assignments_assigned_by_fkey'
            columns: ['assigned_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      ar_markers: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          category: string
          tags: string[]
          is_public: boolean
          marker_image_url: string
          marker_pattern_url: string | null
          width: number
          height: number
          quality_score: number
          metadata: Json
          view_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          category?: string
          tags?: string[]
          is_public?: boolean
          marker_image_url: string
          marker_pattern_url?: string | null
          width?: number
          height?: number
          quality_score?: number
          metadata?: Json
          view_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          category?: string
          tags?: string[]
          is_public?: boolean
          marker_image_url?: string
          marker_pattern_url?: string | null
          width?: number
          height?: number
          quality_score?: number
          metadata?: Json
          view_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ar_marker_usage: {
        Row: {
          id: string
          marker_id: string
          user_id: string | null
          session_id: string | null
          ip_address: string | null
          user_agent: string | null
          duration_seconds: number | null
          detection_count: number
          created_at: string
        }
        Insert: {
          id?: string
          marker_id: string
          user_id?: string | null
          session_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          duration_seconds?: number | null
          detection_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          marker_id?: string
          user_id?: string | null
          session_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          duration_seconds?: number | null
          detection_count?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ar_marker_usage_marker_id_fkey'
            columns: ['marker_id']
            referencedRelation: 'ar_markers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ar_marker_usage_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      ar_marker_favorites: {
        Row: {
          id: string
          user_id: string
          marker_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          marker_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          marker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ar_marker_favorites_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ar_marker_favorites_marker_id_fkey'
            columns: ['marker_id']
            referencedRelation: 'ar_markers'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_permission: {
        Args: { p_resource: string; p_action: string }
        Returns: boolean
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: UserRole
      }
      can_update_role: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      increment_marker_view_count: {
        Args: { marker_id: string }
        Returns: void
      }
      get_popular_markers: {
        Args: { limit_count?: number }
        Returns: Array<{
          id: string
          name: string
          description: string | null
          marker_image_url: string
          view_count: number
          user_id: string
          created_at: string
        }>
      }
    }
    Enums: {
      user_role: UserRole
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
