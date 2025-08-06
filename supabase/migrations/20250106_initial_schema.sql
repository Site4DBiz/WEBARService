-- Initial database schema for Web AR Service

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    email TEXT NOT NULL
);

-- Create ar_contents table
CREATE TABLE IF NOT EXISTS public.ar_contents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    marker_url TEXT,
    model_url TEXT,
    is_public BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    CONSTRAINT title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 200)
);

-- Create ar_markers table
CREATE TABLE IF NOT EXISTS public.ar_markers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    content_id UUID REFERENCES public.ar_contents(id) ON DELETE CASCADE NOT NULL,
    marker_image_url TEXT NOT NULL,
    marker_pattern_url TEXT,
    width INTEGER DEFAULT 512,
    height INTEGER DEFAULT 512,
    CONSTRAINT dimensions_positive CHECK (width > 0 AND height > 0)
);

-- Create access_logs table
CREATE TABLE IF NOT EXISTS public.access_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content_id UUID REFERENCES public.ar_contents(id) ON DELETE CASCADE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    session_duration INTEGER -- in seconds
);

-- Create indexes for better performance
CREATE INDEX idx_ar_contents_user_id ON public.ar_contents(user_id);
CREATE INDEX idx_ar_contents_is_public ON public.ar_contents(is_public);
CREATE INDEX idx_ar_markers_content_id ON public.ar_markers(content_id);
CREATE INDEX idx_access_logs_content_id ON public.access_logs(content_id);
CREATE INDEX idx_access_logs_user_id ON public.access_logs(user_id);
CREATE INDEX idx_access_logs_created_at ON public.access_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_ar_contents_updated_at
    BEFORE UPDATE ON public.ar_contents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_ar_markers_updated_at
    BEFORE UPDATE ON public.ar_markers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- AR Contents policies
CREATE POLICY "Anyone can view public AR contents"
    ON public.ar_contents FOR SELECT
    USING (is_public = true);

CREATE POLICY "Users can view their own AR contents"
    ON public.ar_contents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AR contents"
    ON public.ar_contents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AR contents"
    ON public.ar_contents FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AR contents"
    ON public.ar_contents FOR DELETE
    USING (auth.uid() = user_id);

-- AR Markers policies
CREATE POLICY "Anyone can view markers for public contents"
    ON public.ar_markers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ar_contents
            WHERE ar_contents.id = ar_markers.content_id
            AND ar_contents.is_public = true
        )
    );

CREATE POLICY "Users can view markers for their own contents"
    ON public.ar_markers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ar_contents
            WHERE ar_contents.id = ar_markers.content_id
            AND ar_contents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage markers for their own contents"
    ON public.ar_markers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.ar_contents
            WHERE ar_contents.id = ar_markers.content_id
            AND ar_contents.user_id = auth.uid()
        )
    );

-- Access logs policies
CREATE POLICY "Users can view logs for their own contents"
    ON public.access_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ar_contents
            WHERE ar_contents.id = access_logs.content_id
            AND ar_contents.user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can create access logs"
    ON public.access_logs FOR INSERT
    WITH CHECK (true);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('ar-markers', 'ar-markers', true),
    ('ar-models', 'ar-models', true),
    ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ar-markers bucket
CREATE POLICY "Anyone can view AR markers"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'ar-markers');

CREATE POLICY "Authenticated users can upload AR markers"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'ar-markers' 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can update their own AR markers"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'ar-markers'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own AR markers"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'ar-markers'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies for ar-models bucket
CREATE POLICY "Anyone can view AR models"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'ar-models');

CREATE POLICY "Authenticated users can upload AR models"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'ar-models' 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can update their own AR models"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'ar-models'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own AR models"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'ar-models'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies for user-avatars bucket
CREATE POLICY "Anyone can view user avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'user-avatars');

CREATE POLICY "Users can upload their own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'user-avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'user-avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'user-avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );