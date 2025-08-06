-- Comprehensive User Tables Schema for Web AR Service
-- This migration consolidates and improves upon previous user table designs

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist to avoid conflicts
DROP TABLE IF EXISTS public.user_activity_logs CASCADE;
DROP TABLE IF EXISTS public.user_favorites CASCADE;
DROP TABLE IF EXISTS public.access_logs CASCADE;
DROP TABLE IF EXISTS public.ar_markers CASCADE;
DROP TABLE IF EXISTS public.user_ar_contents CASCADE;
DROP TABLE IF EXISTS public.ar_contents CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create enhanced profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE,
    full_name VARCHAR(255),
    email TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    website VARCHAR(255),
    company VARCHAR(255),
    location VARCHAR(255),
    phone VARCHAR(50),
    is_public BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    role VARCHAR(50) DEFAULT 'user', -- user, creator, admin
    subscription_tier VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
    preferences JSONB DEFAULT '{}',
    social_links JSONB DEFAULT '{}', -- {twitter: "", linkedin: "", etc.}
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_login_at TIMESTAMPTZ,
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 50),
    CONSTRAINT email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create comprehensive AR contents table
CREATE TABLE public.ar_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    tags TEXT[],
    content_type VARCHAR(50) NOT NULL, -- image-target, marker-based, location-based
    marker_url TEXT,
    model_url TEXT,
    thumbnail_url TEXT,
    metadata JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}', -- AR specific settings
    is_public BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived, deleted
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    parent_id UUID REFERENCES public.ar_contents(id) ON DELETE SET NULL, -- for versioning
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    published_at TIMESTAMPTZ,
    CONSTRAINT title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 255)
);

-- Create AR markers table with enhanced tracking capabilities
CREATE TABLE public.ar_markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES public.ar_contents(id) ON DELETE CASCADE NOT NULL,
    marker_type VARCHAR(50) NOT NULL, -- image, qr, barcode, nft
    marker_image_url TEXT NOT NULL,
    marker_pattern_url TEXT,
    marker_data JSONB DEFAULT '{}', -- Additional marker-specific data
    width INTEGER DEFAULT 512,
    height INTEGER DEFAULT 512,
    detection_threshold FLOAT DEFAULT 0.5,
    tracking_quality VARCHAR(50) DEFAULT 'standard', -- low, standard, high
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT dimensions_positive CHECK (width > 0 AND height > 0),
    CONSTRAINT threshold_range CHECK (detection_threshold >= 0 AND detection_threshold <= 1)
);

-- Create user favorites/bookmarks table
CREATE TABLE public.user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content_id UUID REFERENCES public.ar_contents(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, content_id)
);

-- Create comprehensive activity logs table
CREATE TABLE public.user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- login, logout, create, update, delete, view, share
    resource_type VARCHAR(50), -- profile, ar_content, marker, etc.
    resource_id UUID,
    action_details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    location JSONB DEFAULT '{}', -- {country: "", city: "", lat: 0, lng: 0}
    session_id VARCHAR(255),
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create user relationships/follows table
CREATE TABLE public.user_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- Create user notifications table
CREATE TABLE public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) NOT NULL, -- follow, like, comment, mention, system
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create API keys table for developer access
CREATE TABLE public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    key_hash TEXT NOT NULL, -- Store hashed API key
    key_prefix VARCHAR(10) NOT NULL, -- First few characters for identification
    permissions JSONB DEFAULT '{}',
    rate_limit INTEGER DEFAULT 1000, -- requests per hour
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create comprehensive indexes for performance
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_is_public ON public.profiles(is_public);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at);

CREATE INDEX idx_ar_contents_user_id ON public.ar_contents(user_id);
CREATE INDEX idx_ar_contents_status ON public.ar_contents(status);
CREATE INDEX idx_ar_contents_is_public ON public.ar_contents(is_public);
CREATE INDEX idx_ar_contents_category ON public.ar_contents(category);
CREATE INDEX idx_ar_contents_tags ON public.ar_contents USING GIN(tags);
CREATE INDEX idx_ar_contents_created_at ON public.ar_contents(created_at);
CREATE INDEX idx_ar_contents_published_at ON public.ar_contents(published_at);

CREATE INDEX idx_ar_markers_content_id ON public.ar_markers(content_id);
CREATE INDEX idx_ar_markers_marker_type ON public.ar_markers(marker_type);
CREATE INDEX idx_ar_markers_is_active ON public.ar_markers(is_active);

CREATE INDEX idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX idx_user_favorites_content_id ON public.user_favorites(content_id);

CREATE INDEX idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_activity_type ON public.user_activity_logs(activity_type);
CREATE INDEX idx_user_activity_logs_resource_type ON public.user_activity_logs(resource_type);
CREATE INDEX idx_user_activity_logs_created_at ON public.user_activity_logs(created_at);
CREATE INDEX idx_user_activity_logs_session_id ON public.user_activity_logs(session_id);

CREATE INDEX idx_user_relationships_follower_id ON public.user_relationships(follower_id);
CREATE INDEX idx_user_relationships_following_id ON public.user_relationships(following_id);

CREATE INDEX idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX idx_user_notifications_is_read ON public.user_notifications(is_read);
CREATE INDEX idx_user_notifications_created_at ON public.user_notifications(created_at);

CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_key_prefix ON public.api_keys(key_prefix);
CREATE INDEX idx_api_keys_is_active ON public.api_keys(is_active);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_ar_contents_updated_at BEFORE UPDATE ON public.ar_contents
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_ar_markers_updated_at BEFORE UPDATE ON public.ar_markers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_view_count(content_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.ar_contents
    SET view_count = view_count + 1
    WHERE id = content_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION public.get_user_stats(user_id UUID)
RETURNS TABLE (
    total_contents INTEGER,
    total_views INTEGER,
    total_likes INTEGER,
    total_followers INTEGER,
    total_following INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM public.ar_contents WHERE ar_contents.user_id = $1),
        (SELECT COALESCE(SUM(view_count), 0)::INTEGER FROM public.ar_contents WHERE ar_contents.user_id = $1),
        (SELECT COALESCE(SUM(like_count), 0)::INTEGER FROM public.ar_contents WHERE ar_contents.user_id = $1),
        (SELECT COUNT(*)::INTEGER FROM public.user_relationships WHERE following_id = $1),
        (SELECT COUNT(*)::INTEGER FROM public.user_relationships WHERE follower_id = $1);
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for ar_contents
CREATE POLICY "Public contents are viewable by everyone" ON public.ar_contents
    FOR SELECT USING (is_public = true AND status = 'published');

CREATE POLICY "Users can view their own contents" ON public.ar_contents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contents" ON public.ar_contents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contents" ON public.ar_contents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contents" ON public.ar_contents
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for ar_markers
CREATE POLICY "Markers for public contents are viewable" ON public.ar_markers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ar_contents
            WHERE ar_contents.id = ar_markers.content_id
            AND (ar_contents.is_public = true OR ar_contents.user_id = auth.uid())
        )
    );

CREATE POLICY "Users can manage markers for their contents" ON public.ar_markers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.ar_contents
            WHERE ar_contents.id = ar_markers.content_id
            AND ar_contents.user_id = auth.uid()
        )
    );

-- RLS Policies for user_favorites
CREATE POLICY "Users can view their own favorites" ON public.user_favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own favorites" ON public.user_favorites
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for user_activity_logs
CREATE POLICY "Users can view their own activity" ON public.user_activity_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity logs" ON public.user_activity_logs
    FOR INSERT WITH CHECK (true);

-- RLS Policies for user_relationships
CREATE POLICY "Anyone can view relationships" ON public.user_relationships
    FOR SELECT USING (true);

CREATE POLICY "Users can create relationships" ON public.user_relationships
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their relationships" ON public.user_relationships
    FOR DELETE USING (auth.uid() = follower_id);

-- RLS Policies for user_notifications
CREATE POLICY "Users can view their own notifications" ON public.user_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.user_notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.user_notifications
    FOR INSERT WITH CHECK (true);

-- RLS Policies for api_keys
CREATE POLICY "Users can view their own API keys" ON public.api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own API keys" ON public.api_keys
    FOR ALL USING (auth.uid() = user_id);

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('ar-markers', 'ar-markers', true),
    ('ar-models', 'ar-models', true),
    ('user-avatars', 'user-avatars', true),
    ('ar-thumbnails', 'ar-thumbnails', true)
ON CONFLICT (id) DO NOTHING;