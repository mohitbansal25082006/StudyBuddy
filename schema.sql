-- F:\StudyBuddy\complete_schema.sql
-- ============================================
-- STUDYBUDDY COMPLETE DATABASE SCHEMA
-- Combines Part 1 (Authentication & Profiles) and Part 2 (Study Features)
-- ============================================

-- Enable UUID extension (for generating unique IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- Stores user profile information (from Part 1)
-- ============================================
DO $$ 
BEGIN
    -- Check if profiles table exists before creating
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        CREATE TABLE profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT,
            avatar_url TEXT,
            bio TEXT,
            learning_style TEXT CHECK (learning_style IN ('visual', 'auditory', 'reading', 'kinesthetic')),
            grade_level TEXT,
            subjects TEXT[], -- Array of subjects user is studying
            study_goals TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Enable RLS on profiles table
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

        -- Profiles policies
        CREATE POLICY "Users can view own profile"
            ON profiles
            FOR SELECT
            USING (auth.uid() = id);

        CREATE POLICY "Users can insert own profile"
            ON profiles
            FOR INSERT
            WITH CHECK (auth.uid() = id);

        CREATE POLICY "Users can update own profile"
            ON profiles
            FOR UPDATE
            USING (auth.uid() = id)
            WITH CHECK (auth.uid() = id);

        -- Indexes for profiles
        CREATE INDEX idx_profiles_email ON profiles(email);
        CREATE INDEX idx_profiles_created_at ON profiles(created_at);

        -- Comments for documentation
        COMMENT ON TABLE profiles IS 'User profile information';
        COMMENT ON COLUMN profiles.learning_style IS 'User preferred learning style: visual, auditory, reading, or kinesthetic';
        COMMENT ON COLUMN profiles.subjects IS 'Array of subjects the user is studying';

        RAISE NOTICE 'Profiles table created successfully';
    ELSE
        RAISE NOTICE 'Profiles table already exists, skipping creation';
    END IF;
END $$;

-- ============================================
-- STUDY PLANS TABLE
-- Stores AI-generated study plans
-- ============================================
CREATE TABLE IF NOT EXISTS study_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    subject TEXT NOT NULL,
    difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    duration_weeks INTEGER,
    daily_hours INTEGER,
    plan_data JSONB, -- Stores the structured study plan
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add public column to study_plans table if it doesn't exist
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS public BOOLEAN DEFAULT false;

-- Add rating column to study_plans table if it doesn't exist
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS rating FLOAT DEFAULT 0;

-- Add completed column to study_plans table if it doesn't exist
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false;

-- ============================================
-- FLASHCARDS TABLE
-- Stores flashcards for studying
-- ============================================
CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5),
    last_reviewed TIMESTAMP WITH TIME ZONE,
    next_review TIMESTAMP WITH TIME ZONE,
    review_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STUDY SESSIONS TABLE
-- Tracks user study sessions
-- ============================================
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    session_type TEXT CHECK (session_type IN ('study_plan', 'flashcards', 'review')),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Add study_plan_id column to study_sessions table if it doesn't exist
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS study_plan_id UUID REFERENCES study_plans(id) ON DELETE SET NULL;

-- ============================================
-- CALENDAR EVENTS TABLE
-- Stores calendar events for study sessions
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    subject TEXT NOT NULL,
    event_type TEXT CHECK (event_type IN ('study_session', 'review', 'exam')),
    google_calendar_id TEXT, -- ID from Google Calendar if synced
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STUDY PLAN CATEGORIES TABLE
-- Lookup table for study plan categories
-- ============================================
CREATE TABLE IF NOT EXISTS study_plan_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STUDY PLAN PREFERENCES TABLE
-- User-specific study plan preferences
-- ============================================
CREATE TABLE IF NOT EXISTS study_plan_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  preferred_difficulty TEXT CHECK (preferred_difficulty IN ('beginner', 'intermediate', 'advanced')),
  preferred_session_length INTEGER,
  preferred_time_of_day TEXT CHECK (preferred_time_of_day IN ('morning', 'afternoon', 'evening', 'night')),
  notification_preferences JSONB,
  focus_areas TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- These control who can read/write data
-- ============================================

-- Enable RLS on all tables
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_preferences ENABLE ROW LEVEL SECURITY;

-- Study plans policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can view own study plans' 
        AND tablename = 'study_plans'
    ) THEN
        CREATE POLICY "Users can view own study plans"
            ON study_plans
            FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can insert own study plans' 
        AND tablename = 'study_plans'
    ) THEN
        CREATE POLICY "Users can insert own study plans"
            ON study_plans
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can update own study plans' 
        AND tablename = 'study_plans'
    ) THEN
        CREATE POLICY "Users can update own study plans"
            ON study_plans
            FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can delete own study plans' 
        AND tablename = 'study_plans'
    ) THEN
        CREATE POLICY "Users can delete own study plans"
            ON study_plans
            FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Flashcards policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can view own flashcards' 
        AND tablename = 'flashcards'
    ) THEN
        CREATE POLICY "Users can view own flashcards"
            ON flashcards
            FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can insert own flashcards' 
        AND tablename = 'flashcards'
    ) THEN
        CREATE POLICY "Users can insert own flashcards"
            ON flashcards
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can update own flashcards' 
        AND tablename = 'flashcards'
    ) THEN
        CREATE POLICY "Users can update own flashcards"
            ON flashcards
            FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can delete own flashcards' 
        AND tablename = 'flashcards'
    ) THEN
        CREATE POLICY "Users can delete own flashcards"
            ON flashcards
            FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Study sessions policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can view own study sessions' 
        AND tablename = 'study_sessions'
    ) THEN
        CREATE POLICY "Users can view own study sessions"
            ON study_sessions
            FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can insert own study sessions' 
        AND tablename = 'study_sessions'
    ) THEN
        CREATE POLICY "Users can insert own study sessions"
            ON study_sessions
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Calendar events policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can view own calendar events' 
        AND tablename = 'calendar_events'
    ) THEN
        CREATE POLICY "Users can view own calendar events"
            ON calendar_events
            FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can insert own calendar events' 
        AND tablename = 'calendar_events'
    ) THEN
        CREATE POLICY "Users can insert own calendar events"
            ON calendar_events
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can update own calendar events' 
        AND tablename = 'calendar_events'
    ) THEN
        CREATE POLICY "Users can update own calendar events"
            ON calendar_events
            FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can delete own calendar events' 
        AND tablename = 'calendar_events'
    ) THEN
        CREATE POLICY "Users can delete own calendar events"
            ON calendar_events
            FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Study plan preferences policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can view own study plan preferences' 
        AND tablename = 'study_plan_preferences'
    ) THEN
        CREATE POLICY "Users can view own study plan preferences"
            ON study_plan_preferences
            FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can insert own study plan preferences' 
        AND tablename = 'study_plan_preferences'
    ) THEN
        CREATE POLICY "Users can insert own study plan preferences"
            ON study_plan_preferences
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can update own study plan preferences' 
        AND tablename = 'study_plan_preferences'
    ) THEN
        CREATE POLICY "Users can update own study plan preferences"
            ON study_plan_preferences
            FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can delete own study plan preferences' 
        AND tablename = 'study_plan_preferences'
    ) THEN
        CREATE POLICY "Users can delete own study plan preferences"
            ON study_plan_preferences
            FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Study plan categories policies (public read access)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Public can view study plan categories' 
        AND tablename = 'study_plan_categories'
    ) THEN
        ALTER TABLE study_plan_categories ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Public can view study plan categories"
            ON study_plan_categories
            FOR SELECT
            USING (true);
    END IF;
END $$;

-- ============================================
-- FUNCTION: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    )
    ON CONFLICT (id) DO NOTHING; -- Prevent errors if profile already exists
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger to ensure it's up to date
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STORAGE BUCKET for Profile Pictures
-- ============================================

-- Create storage bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies and recreate them
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- Policy: Anyone can view avatars
CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- Policy: Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy: Users can update their own avatar
CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy: Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================
-- INDEXES for better performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_subject ON study_plans(subject);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_subject ON flashcards(subject);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_subject ON study_sessions(subject);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_study_plan_preferences_user_id ON study_plan_preferences(user_id);

-- ============================================
-- COMMENTS for documentation
-- ============================================
COMMENT ON TABLE study_plans IS 'AI-generated study plans for users';
COMMENT ON TABLE flashcards IS 'Flashcards for spaced repetition learning';
COMMENT ON TABLE study_sessions IS 'Tracks user study sessions';
COMMENT ON TABLE calendar_events IS 'Calendar events for study sessions';
COMMENT ON TABLE study_plan_categories IS 'Lookup table for study plan categories';
COMMENT ON TABLE study_plan_preferences IS 'User-specific study plan preferences';

-- ============================================
-- UPDATE TRIGGER FUNCTION for profiles
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create update trigger for study_plans
DROP TRIGGER IF EXISTS update_study_plans_updated_at ON study_plans;
CREATE TRIGGER update_study_plans_updated_at
    BEFORE UPDATE ON study_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create update trigger for study_plan_preferences
DROP TRIGGER IF EXISTS update_study_plan_preferences_updated_at ON study_plan_preferences;
CREATE TRIGGER update_study_plan_preferences_updated_at
    BEFORE UPDATE ON study_plan_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

RAISE NOTICE 'StudyBuddy database schema setup completed successfully!';