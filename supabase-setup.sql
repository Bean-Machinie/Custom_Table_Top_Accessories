-- ============================================================================
-- Supabase Database Setup for Custom Table Top Accessories
-- ============================================================================
-- This script sets up the profiles table and storage bucket with proper
-- Row-Level Security (RLS) policies.
--
-- To apply this:
-- 1. Go to your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project
-- 3. Go to SQL Editor
-- 4. Paste this script and run it
-- ============================================================================

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  social_links JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Optional: Allow public read access to profiles (uncomment if you want profiles to be publicly visible)
-- CREATE POLICY "Public profiles are viewable by everyone"
--   ON public.profiles
--   FOR SELECT
--   USING (true);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STORAGE BUCKET FOR AVATARS
-- ============================================================================

-- Create storage bucket for assets (avatars, etc.) if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- Policy: Users can upload their own avatar
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'assets'
    AND (storage.foldername(name))[1] = 'assets'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Policy: Users can update their own avatar
CREATE POLICY "Users can update their own avatar"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'assets'
    AND (storage.foldername(name))[1] = 'assets'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'assets'
    AND (storage.foldername(name))[1] = 'assets'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Policy: Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'assets'
    AND (storage.foldername(name))[1] = 'assets'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Policy: Anyone can view avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'assets');

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================

SELECT 'Supabase setup complete! You can now create and update profiles.' AS message;
