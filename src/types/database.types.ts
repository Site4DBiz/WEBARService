export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          email: string
          avatar_url: string | null
          bio: string | null
          website: string | null
          company: string | null
          location: string | null
          phone: string | null
          is_public: boolean
          is_verified: boolean
          role: 'user' | 'creator' | 'admin'
          subscription_tier: 'free' | 'pro' | 'enterprise'
          preferences: Json
          social_links: Json
          created_at: string
          updated_at: string
          last_login_at: string | null
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          email: string
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          company?: string | null
          location?: string | null
          phone?: string | null
          is_public?: boolean
          is_verified?: boolean
          role?: 'user' | 'creator' | 'admin'
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          preferences?: Json
          social_links?: Json
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          email?: string
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          company?: string | null
          location?: string | null
          phone?: string | null
          is_public?: boolean
          is_verified?: boolean
          role?: 'user' | 'creator' | 'admin'
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          preferences?: Json
          social_links?: Json
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
        Relationships: []
      }
      ar_contents: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          category: string | null
          tags: string[] | null
          content_type: 'image-target' | 'marker-based' | 'location-based'
          marker_url: string | null
          model_url: string | null
          thumbnail_url: string | null
          metadata: Json
          settings: Json
          is_public: boolean
          is_featured: boolean
          is_approved: boolean
          status: 'draft' | 'published' | 'archived' | 'deleted'
          view_count: number
          like_count: number
          share_count: number
          version: number
          parent_id: string | null
          created_at: string
          updated_at: string
          published_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          category?: string | null
          tags?: string[] | null
          content_type: 'image-target' | 'marker-based' | 'location-based'
          marker_url?: string | null
          model_url?: string | null
          thumbnail_url?: string | null
          metadata?: Json
          settings?: Json
          is_public?: boolean
          is_featured?: boolean
          is_approved?: boolean
          status?: 'draft' | 'published' | 'archived' | 'deleted'
          view_count?: number
          like_count?: number
          share_count?: number
          version?: number
          parent_id?: string | null
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          category?: string | null
          tags?: string[] | null
          content_type?: 'image-target' | 'marker-based' | 'location-based'
          marker_url?: string | null
          model_url?: string | null
          thumbnail_url?: string | null
          metadata?: Json
          settings?: Json
          is_public?: boolean
          is_featured?: boolean
          is_approved?: boolean
          status?: 'draft' | 'published' | 'archived' | 'deleted'
          view_count?: number
          like_count?: number
          share_count?: number
          version?: number
          parent_id?: string | null
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ar_contents_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ar_contents_parent_id_fkey'
            columns: ['parent_id']
            referencedRelation: 'ar_contents'
            referencedColumns: ['id']
          },
        ]
      }
      ar_markers: {
        Row: {
          id: string
          content_id: string
          marker_type: 'image' | 'qr' | 'barcode' | 'nft'
          marker_image_url: string
          marker_pattern_url: string | null
          marker_data: Json
          width: number
          height: number
          detection_threshold: number
          tracking_quality: 'low' | 'standard' | 'high'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          content_id: string
          marker_type: 'image' | 'qr' | 'barcode' | 'nft'
          marker_image_url: string
          marker_pattern_url?: string | null
          marker_data?: Json
          width?: number
          height?: number
          detection_threshold?: number
          tracking_quality?: 'low' | 'standard' | 'high'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content_id?: string
          marker_type?: 'image' | 'qr' | 'barcode' | 'nft'
          marker_image_url?: string
          marker_pattern_url?: string | null
          marker_data?: Json
          width?: number
          height?: number
          detection_threshold?: number
          tracking_quality?: 'low' | 'standard' | 'high'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ar_markers_content_id_fkey'
            columns: ['content_id']
            referencedRelation: 'ar_contents'
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
            referencedRelation: 'ar_contents'
            referencedColumns: ['id']
          },
        ]
      }
      user_activity_logs: {
        Row: {
          id: string
          user_id: string | null
          activity_type: string
          resource_type: string | null
          resource_id: string | null
          action_details: Json
          ip_address: string | null
          user_agent: string | null
          device_info: Json
          location: Json
          session_id: string | null
          duration_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          activity_type: string
          resource_type?: string | null
          resource_id?: string | null
          action_details?: Json
          ip_address?: string | null
          user_agent?: string | null
          device_info?: Json
          location?: Json
          session_id?: string | null
          duration_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          activity_type?: string
          resource_type?: string | null
          resource_id?: string | null
          action_details?: Json
          ip_address?: string | null
          user_agent?: string | null
          device_info?: Json
          location?: Json
          session_id?: string | null
          duration_seconds?: number | null
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
      user_relationships: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_relationships_follower_id_fkey'
            columns: ['follower_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_relationships_following_id_fkey'
            columns: ['following_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      user_notifications: {
        Row: {
          id: string
          user_id: string
          type: 'follow' | 'like' | 'comment' | 'mention' | 'system'
          title: string
          message: string | null
          data: Json
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'follow' | 'like' | 'comment' | 'mention' | 'system'
          title: string
          message?: string | null
          data?: Json
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'follow' | 'like' | 'comment' | 'mention' | 'system'
          title?: string
          message?: string | null
          data?: Json
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_notifications_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          name: string
          key_hash: string
          key_prefix: string
          permissions: Json
          rate_limit: number
          is_active: boolean
          last_used_at: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          key_hash: string
          key_prefix: string
          permissions?: Json
          rate_limit?: number
          is_active?: boolean
          last_used_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          key_hash?: string
          key_prefix?: string
          permissions?: Json
          rate_limit?: number
          is_active?: boolean
          last_used_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'api_keys_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_view_count: {
        Args: {
          content_id: string
        }
        Returns: void
      }
      get_user_stats: {
        Args: {
          user_id: string
        }
        Returns: {
          total_contents: number
          total_views: number
          total_likes: number
          total_followers: number
          total_following: number
        }
      }
    }
    Enums: {
      user_role: 'user' | 'creator' | 'admin'
      subscription_tier: 'free' | 'pro' | 'enterprise'
      content_type: 'image-target' | 'marker-based' | 'location-based'
      content_status: 'draft' | 'published' | 'archived' | 'deleted'
      marker_type: 'image' | 'qr' | 'barcode' | 'nft'
      tracking_quality: 'low' | 'standard' | 'high'
      notification_type: 'follow' | 'like' | 'comment' | 'mention' | 'system'
      activity_type: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'share'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

export type Profile = Tables<'profiles'>
export type ARContent = Tables<'ar_contents'>
export type ARMarker = Tables<'ar_markers'>
export type UserFavorite = Tables<'user_favorites'>
export type UserActivityLog = Tables<'user_activity_logs'>
export type UserRelationship = Tables<'user_relationships'>
export type UserNotification = Tables<'user_notifications'>
export type APIKey = Tables<'api_keys'>

export interface UserStats {
  total_contents: number
  total_views: number
  total_likes: number
  total_followers: number
  total_following: number
}

export interface SocialLinks {
  twitter?: string
  linkedin?: string
  github?: string
  instagram?: string
  youtube?: string
  website?: string
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  language?: string
  emailNotifications?: boolean
  pushNotifications?: boolean
  privacy?: {
    showEmail?: boolean
    showPhone?: boolean
    showLocation?: boolean
  }
}

export interface ARContentSettings {
  autoPlay?: boolean
  showControls?: boolean
  allowInteraction?: boolean
  scale?: number
  rotation?: { x: number; y: number; z: number }
  position?: { x: number; y: number; z: number }
  animation?: {
    enabled: boolean
    loop: boolean
    speed: number
  }
}

export interface MarkerData {
  patternRatio?: number
  minConfidence?: number
  smooth?: boolean
  smoothCount?: number
  smoothTolerance?: number
}

export interface DeviceInfo {
  platform?: string
  browser?: string
  version?: string
  isMobile?: boolean
  screenResolution?: string
}

export interface LocationInfo {
  country?: string
  city?: string
  region?: string
  lat?: number
  lng?: number
}

export interface ActionDetails {
  before?: Json
  after?: Json
  changes?: string[]
  reason?: string
}

export interface APIPermissions {
  read?: boolean
  write?: boolean
  delete?: boolean
  admin?: boolean
  scopes?: string[]
}
