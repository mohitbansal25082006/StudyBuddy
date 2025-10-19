-- ============================================
-- STUDYBUDDY COMPLETE DATABASE SCHEMA
-- Combines Authentication & Profiles, Study Features, Community Features, Q&A System, Achievements, and Leaderboard
-- Version: 2.0 - Updated with all migrations
-- ============================================

-- Enable UUID extension (for generating unique IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- Stores user profile information
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        CREATE TABLE profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT,
            avatar_url TEXT,
            bio TEXT,
            learning_style TEXT CHECK (learning_style IN ('visual', 'auditory', 'reading', 'kinesthetic')),
            grade_level TEXT,
            subjects TEXT[],
            study_goals TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
        CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
        CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

        CREATE INDEX idx_profiles_email ON profiles(email);
        CREATE INDEX idx_profiles_created_at ON profiles(created_at);

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
    plan_data JSONB,
    public BOOLEAN DEFAULT false,
    rating FLOAT DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FLASHCARDS TABLE
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
-- ============================================
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    study_plan_id UUID REFERENCES study_plans(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    session_type TEXT CHECK (session_type IN ('study_plan', 'flashcards', 'review')),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- ============================================
-- CALENDAR EVENTS TABLE
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
    google_calendar_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STUDY PLAN CATEGORIES TABLE
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
-- COMMUNITY POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    tags TEXT[],
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- POST LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- ============================================
-- POST COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- COMMENT LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- ============================================
-- POST BOOKMARKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS post_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- ============================================
-- COMMENT REPLIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS comment_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- REPLY LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reply_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reply_id UUID REFERENCES comment_replies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reply_id, user_id)
);

-- ============================================
-- CONTENT REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS content_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment', 'reply', 'question', 'answer')),
    content_id UUID NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    ai_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- POST IMAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS post_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- COMMUNITY GUIDELINES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_guidelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- COMMUNITY Q&A SYSTEM TABLES
-- ============================================

-- Drop existing Q&A tables if they exist (for clean recreation)
DROP TABLE IF EXISTS question_votes CASCADE;
DROP TABLE IF EXISTS answer_votes CASCADE;
DROP TABLE IF EXISTS question_comments CASCADE;
DROP TABLE IF EXISTS answer_comments CASCADE;
DROP TABLE IF EXISTS question_answers CASCADE;
DROP TABLE IF EXISTS community_questions CASCADE;

-- COMMUNITY QUESTIONS TABLE
CREATE TABLE community_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    views INTEGER DEFAULT 0,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    has_accepted_answer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QUESTION ANSWERS TABLE
CREATE TABLE question_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES community_questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    is_accepted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QUESTION VOTES TABLE
CREATE TABLE question_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES community_questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vote_type TEXT CHECK (vote_type IN ('up', 'down')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(question_id, user_id)
);

-- ANSWER VOTES TABLE
CREATE TABLE answer_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    answer_id UUID NOT NULL REFERENCES question_answers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vote_type TEXT CHECK (vote_type IN ('up', 'down')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(answer_id, user_id)
);

-- QUESTION COMMENTS TABLE
CREATE TABLE question_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES community_questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ANSWER COMMENTS TABLE
CREATE TABLE answer_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    answer_id UUID NOT NULL REFERENCES question_answers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ACHIEVEMENTS & XP TABLES
-- ============================================

-- USER ACHIEVEMENTS TABLE
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    achievement_name TEXT NOT NULL,
    achievement_description TEXT NOT NULL,
    achievement_icon TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- USER XP TABLE
CREATE TABLE IF NOT EXISTS user_xp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    xp_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- XP TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS xp_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    xp_amount INTEGER NOT NULL,
    source TEXT NOT NULL,
    source_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WEEKLY LEADERBOARD TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    xp_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    answers_given INTEGER DEFAULT 0,
    questions_asked INTEGER DEFAULT 0,
    accepted_answers INTEGER DEFAULT 0,
    week_start DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, week_start)
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE reply_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_leaderboard ENABLE ROW LEVEL SECURITY;

-- Study plans policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own study plans' AND tablename = 'study_plans') THEN
        CREATE POLICY "Users can view own study plans" ON study_plans FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own study plans' AND tablename = 'study_plans') THEN
        CREATE POLICY "Users can insert own study plans" ON study_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own study plans' AND tablename = 'study_plans') THEN
        CREATE POLICY "Users can update own study plans" ON study_plans FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own study plans' AND tablename = 'study_plans') THEN
        CREATE POLICY "Users can delete own study plans" ON study_plans FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Flashcards policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own flashcards' AND tablename = 'flashcards') THEN
        CREATE POLICY "Users can view own flashcards" ON flashcards FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own flashcards' AND tablename = 'flashcards') THEN
        CREATE POLICY "Users can insert own flashcards" ON flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own flashcards' AND tablename = 'flashcards') THEN
        CREATE POLICY "Users can update own flashcards" ON flashcards FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own flashcards' AND tablename = 'flashcards') THEN
        CREATE POLICY "Users can delete own flashcards" ON flashcards FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Study sessions policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own study sessions' AND tablename = 'study_sessions') THEN
        CREATE POLICY "Users can view own study sessions" ON study_sessions FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own study sessions' AND tablename = 'study_sessions') THEN
        CREATE POLICY "Users can insert own study sessions" ON study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Calendar events policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own calendar events' AND tablename = 'calendar_events') THEN
        CREATE POLICY "Users can view own calendar events" ON calendar_events FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own calendar events' AND tablename = 'calendar_events') THEN
        CREATE POLICY "Users can insert own calendar events" ON calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own calendar events' AND tablename = 'calendar_events') THEN
        CREATE POLICY "Users can update own calendar events" ON calendar_events FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own calendar events' AND tablename = 'calendar_events') THEN
        CREATE POLICY "Users can delete own calendar events" ON calendar_events FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Study plan preferences policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own study plan preferences' AND tablename = 'study_plan_preferences') THEN
        CREATE POLICY "Users can view own study plan preferences" ON study_plan_preferences FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own study plan preferences' AND tablename = 'study_plan_preferences') THEN
        CREATE POLICY "Users can insert own study plan preferences" ON study_plan_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own study plan preferences' AND tablename = 'study_plan_preferences') THEN
        CREATE POLICY "Users can update own study plan preferences" ON study_plan_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own study plan preferences' AND tablename = 'study_plan_preferences') THEN
        CREATE POLICY "Users can delete own study plan preferences" ON study_plan_preferences FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Study plan categories policies (public read)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view study plan categories' AND tablename = 'study_plan_categories') THEN
        CREATE POLICY "Public can view study plan categories" ON study_plan_categories FOR SELECT USING (true);
    END IF;
END $$;

-- Community posts policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all community posts' AND tablename = 'community_posts') THEN
        CREATE POLICY "Users can view all community posts" ON community_posts FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own community posts' AND tablename = 'community_posts') THEN
        CREATE POLICY "Users can insert own community posts" ON community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own community posts' AND tablename = 'community_posts') THEN
        CREATE POLICY "Users can update own community posts" ON community_posts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own community posts' AND tablename = 'community_posts') THEN
        CREATE POLICY "Users can delete own community posts" ON community_posts FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Post likes, comments, and related policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all post likes' AND tablename = 'post_likes') THEN
        CREATE POLICY "Users can view all post likes" ON post_likes FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own post likes' AND tablename = 'post_likes') THEN
        CREATE POLICY "Users can insert own post likes" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own post likes' AND tablename = 'post_likes') THEN
        CREATE POLICY "Users can delete own post likes" ON post_likes FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all post comments' AND tablename = 'post_comments') THEN
        CREATE POLICY "Users can view all post comments" ON post_comments FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own post comments' AND tablename = 'post_comments') THEN
        CREATE POLICY "Users can insert own post comments" ON post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own post comments' AND tablename = 'post_comments') THEN
        CREATE POLICY "Users can update own post comments" ON post_comments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own post comments' AND tablename = 'post_comments') THEN
        CREATE POLICY "Users can delete own post comments" ON post_comments FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all comment likes' AND tablename = 'comment_likes') THEN
        CREATE POLICY "Users can view all comment likes" ON comment_likes FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own comment likes' AND tablename = 'comment_likes') THEN
        CREATE POLICY "Users can insert own comment likes" ON comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own comment likes' AND tablename = 'comment_likes') THEN
        CREATE POLICY "Users can delete own comment likes" ON comment_likes FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Post bookmarks policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own bookmarks' AND tablename = 'post_bookmarks') THEN
        CREATE POLICY "Users can view own bookmarks" ON post_bookmarks FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own bookmarks' AND tablename = 'post_bookmarks') THEN
        CREATE POLICY "Users can insert own bookmarks" ON post_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own bookmarks' AND tablename = 'post_bookmarks') THEN
        CREATE POLICY "Users can delete own bookmarks" ON post_bookmarks FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Comment replies policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all replies' AND tablename = 'comment_replies') THEN
        CREATE POLICY "Users can view all replies" ON comment_replies FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own replies' AND tablename = 'comment_replies') THEN
        CREATE POLICY "Users can insert own replies" ON comment_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own replies' AND tablename = 'comment_replies') THEN
        CREATE POLICY "Users can update own replies" ON comment_replies FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own replies' AND tablename = 'comment_replies') THEN
        CREATE POLICY "Users can delete own replies" ON comment_replies FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Reply likes policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all reply likes' AND tablename = 'reply_likes') THEN
        CREATE POLICY "Users can view all reply likes" ON reply_likes FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own reply likes' AND tablename = 'reply_likes') THEN
        CREATE POLICY "Users can insert own reply likes" ON reply_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own reply likes' AND tablename = 'reply_likes') THEN
        CREATE POLICY "Users can delete own reply likes" ON reply_likes FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Content reports policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own reports' AND tablename = 'content_reports') THEN
        CREATE POLICY "Users can view own reports" ON content_reports FOR SELECT USING (auth.uid() = reporter_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own reports' AND tablename = 'content_reports') THEN
        CREATE POLICY "Users can insert own reports" ON content_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
    END IF;
END $;

-- Post images policies
DO $ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all post images' AND tablename = 'post_images') THEN
        CREATE POLICY "Users can view all post images" ON post_images FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own post images' AND tablename = 'post_images') THEN
        CREATE POLICY "Users can insert own post images" ON post_images FOR INSERT WITH CHECK (
            EXISTS (SELECT 1 FROM community_posts WHERE id = post_id AND user_id = auth.uid())
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own post images' AND tablename = 'post_images') THEN
        CREATE POLICY "Users can update own post images" ON post_images FOR UPDATE USING (
            EXISTS (SELECT 1 FROM community_posts WHERE id = post_id AND user_id = auth.uid())
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own post images' AND tablename = 'post_images') THEN
        CREATE POLICY "Users can delete own post images" ON post_images FOR DELETE USING (
            EXISTS (SELECT 1 FROM community_posts WHERE id = post_id AND user_id = auth.uid())
        );
    END IF;
END $;

-- Community guidelines policies (public read)
DO $ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view community guidelines' AND tablename = 'community_guidelines') THEN
        CREATE POLICY "Public can view community guidelines" ON community_guidelines FOR SELECT USING (true);
    END IF;
END $;

-- Community questions policies
CREATE POLICY "Users can view all questions" ON community_questions FOR SELECT USING (true);
CREATE POLICY "Users can insert their own questions" ON community_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own questions" ON community_questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own questions" ON community_questions FOR DELETE USING (auth.uid() = user_id);

-- Question answers policies
CREATE POLICY "Users can view all answers" ON question_answers FOR SELECT USING (true);
CREATE POLICY "Users can insert their own answers" ON question_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own answers" ON question_answers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own answers" ON question_answers FOR DELETE USING (auth.uid() = user_id);

-- Question votes policies
CREATE POLICY "Users can view all question votes" ON question_votes FOR SELECT USING (true);
CREATE POLICY "Users can insert their own question votes" ON question_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own question votes" ON question_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own question votes" ON question_votes FOR DELETE USING (auth.uid() = user_id);

-- Answer votes policies
CREATE POLICY "Users can view all answer votes" ON answer_votes FOR SELECT USING (true);
CREATE POLICY "Users can insert their own answer votes" ON answer_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own answer votes" ON answer_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own answer votes" ON answer_votes FOR DELETE USING (auth.uid() = user_id);

-- Question comments policies
CREATE POLICY "Users can view all question comments" ON question_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert their own question comments" ON question_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own question comments" ON question_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own question comments" ON question_comments FOR DELETE USING (auth.uid() = user_id);

-- Answer comments policies
CREATE POLICY "Users can view all answer comments" ON answer_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert their own answer comments" ON answer_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own answer comments" ON answer_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own answer comments" ON answer_comments FOR DELETE USING (auth.uid() = user_id);

-- User achievements policies
CREATE POLICY "Users can view all achievements" ON user_achievements FOR SELECT USING (true);
CREATE POLICY "Users can insert their own achievements" ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User XP policies
CREATE POLICY "Users can view their own XP" ON user_xp FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own XP" ON user_xp FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own XP" ON user_xp FOR UPDATE USING (auth.uid() = user_id);

-- XP transactions policies
CREATE POLICY "Users can view their own XP transactions" ON xp_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own XP transactions" ON xp_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Weekly leaderboard policies
CREATE POLICY "Users can view all leaderboard entries" ON weekly_leaderboard FOR SELECT USING (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Function: Update post likes count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE community_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$ LANGUAGE plpgsql;

-- Function: Update post comments count
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE community_posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$ LANGUAGE plpgsql;

-- Function: Update comment likes count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE post_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE post_comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$ LANGUAGE plpgsql;

-- Function: Update reply likes count
CREATE OR REPLACE FUNCTION update_reply_likes_count()
RETURNS TRIGGER AS $
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE comment_replies SET likes_count = likes_count + 1 WHERE id = NEW.reply_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE comment_replies SET likes_count = likes_count - 1 WHERE id = OLD.reply_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$ LANGUAGE plpgsql;

-- Function: Increment question views
CREATE OR REPLACE FUNCTION increment_question_views(question_uuid UUID)
RETURNS VOID AS $
BEGIN
    UPDATE community_questions SET views = views + 1 WHERE id = question_uuid;
END;
$ LANGUAGE plpgsql;

-- Function: Update question vote counts
CREATE OR REPLACE FUNCTION update_question_vote_counts()
RETURNS TRIGGER AS $
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE community_questions
        SET 
            upvotes = upvotes + CASE WHEN NEW.vote_type = 'up' THEN 1 ELSE 0 END,
            downvotes = downvotes + CASE WHEN NEW.vote_type = 'down' THEN 1 ELSE 0 END
        WHERE id = NEW.question_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE community_questions
        SET 
            upvotes = upvotes + CASE WHEN NEW.vote_type = 'up' AND OLD.vote_type = 'down' THEN 1 
                                WHEN NEW.vote_type = 'down' AND OLD.vote_type = 'up' THEN -1 
                                ELSE 0 END,
            downvotes = downvotes + CASE WHEN NEW.vote_type = 'down' AND OLD.vote_type = 'up' THEN 1 
                                    WHEN NEW.vote_type = 'up' AND OLD.vote_type = 'down' THEN -1 
                                    ELSE 0 END
        WHERE id = NEW.question_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE community_questions
        SET 
            upvotes = upvotes - CASE WHEN OLD.vote_type = 'up' THEN 1 ELSE 0 END,
            downvotes = downvotes - CASE WHEN OLD.vote_type = 'down' THEN 1 ELSE 0 END
        WHERE id = OLD.question_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$ LANGUAGE plpgsql;

-- Function: Update answer vote counts
CREATE OR REPLACE FUNCTION update_answer_vote_counts()
RETURNS TRIGGER AS $
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE question_answers
        SET 
            upvotes = upvotes + CASE WHEN NEW.vote_type = 'up' THEN 1 ELSE 0 END,
            downvotes = downvotes + CASE WHEN NEW.vote_type = 'down' THEN 1 ELSE 0 END
        WHERE id = NEW.answer_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE question_answers
        SET 
            upvotes = upvotes + CASE WHEN NEW.vote_type = 'up' AND OLD.vote_type = 'down' THEN 1 
                                WHEN NEW.vote_type = 'down' AND OLD.vote_type = 'up' THEN -1 
                                ELSE 0 END,
            downvotes = downvotes + CASE WHEN NEW.vote_type = 'down' AND OLD.vote_type = 'up' THEN 1 
                                    WHEN NEW.vote_type = 'up' AND OLD.vote_type = 'down' THEN -1 
                                    ELSE 0 END
        WHERE id = NEW.answer_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE question_answers
        SET 
            upvotes = upvotes - CASE WHEN OLD.vote_type = 'up' THEN 1 ELSE 0 END,
            downvotes = downvotes - CASE WHEN OLD.vote_type = 'down' THEN 1 ELSE 0 END
        WHERE id = OLD.answer_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$ LANGUAGE plpgsql;

-- Function: Award XP to users
CREATE OR REPLACE FUNCTION award_xp(user_uuid UUID, xp_amount INTEGER, source TEXT, source_id UUID DEFAULT NULL)
RETURNS VOID AS $
BEGIN
    INSERT INTO xp_transactions (user_id, xp_amount, source, source_id)
    VALUES (user_uuid, xp_amount, source, source_id);
    
    INSERT INTO user_xp (user_id, xp_points, level, updated_at)
    VALUES (user_uuid, xp_amount, 1, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        xp_points = user_xp.xp_points + xp_amount,
        level = FLOOR(SQRT(user_xp.xp_points + xp_amount) / 10) + 1,
        updated_at = NOW();
END;
$ LANGUAGE plpgsql;

-- Function: Award XP when answer is accepted
CREATE OR REPLACE FUNCTION award_accepted_answer_xp()
RETURNS TRIGGER AS $
BEGIN
    IF NEW.is_accepted = TRUE AND OLD.is_accepted = FALSE THEN
        PERFORM award_xp(NEW.user_id, 50, 'answer_accepted', NEW.id);
    END IF;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Function: Update weekly leaderboard
CREATE OR REPLACE FUNCTION update_weekly_leaderboard()
RETURNS VOID AS $
BEGIN
    DELETE FROM weekly_leaderboard WHERE week_start = date_trunc('week', CURRENT_DATE);
    
    INSERT INTO weekly_leaderboard (
        user_id, full_name, avatar_url, xp_points, level, 
        answers_given, questions_asked, accepted_answers, week_start
    )
    SELECT 
        p.id as user_id,
        p.full_name,
        p.avatar_url,
        COALESCE(ux.xp_points, 0) as xp_points,
        COALESCE(ux.level, 1) as level,
        COUNT(DISTINCT qa.id) as answers_given,
        COUNT(DISTINCT q.id) as questions_asked,
        COUNT(DISTINCT CASE WHEN qa.is_accepted THEN qa.id END) as accepted_answers,
        date_trunc('week', CURRENT_DATE) as week_start
    FROM profiles p
    LEFT JOIN user_xp ux ON p.id = ux.user_id
    LEFT JOIN community_questions q ON p.id = q.user_id
    LEFT JOIN question_answers qa ON p.id = qa.user_id
    GROUP BY p.id, p.full_name, p.avatar_url, ux.xp_points, ux.level
    ORDER BY xp_points DESC;
END;
$ LANGUAGE plpgsql;

-- Function: Get user's leaderboard rank
CREATE OR REPLACE FUNCTION get_user_leaderboard_rank(user_uuid UUID)
RETURNS INTEGER AS $
DECLARE
    user_rank INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO user_rank
    FROM weekly_leaderboard
    WHERE xp_points > (
        SELECT xp_points 
        FROM weekly_leaderboard 
        WHERE user_id = user_uuid 
        AND week_start = date_trunc('week', CURRENT_DATE)
    )
    AND week_start = date_trunc('week', CURRENT_DATE);
    
    RETURN user_rank;
END;
$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Update updated_at for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at for study_plans
DROP TRIGGER IF EXISTS update_study_plans_updated_at ON study_plans;
CREATE TRIGGER update_study_plans_updated_at
    BEFORE UPDATE ON study_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at for study_plan_preferences
DROP TRIGGER IF EXISTS update_study_plan_preferences_updated_at ON study_plan_preferences;
CREATE TRIGGER update_study_plan_preferences_updated_at
    BEFORE UPDATE ON study_plan_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at for community_posts
DROP TRIGGER IF EXISTS update_community_posts_updated_at ON community_posts;
CREATE TRIGGER update_community_posts_updated_at
    BEFORE UPDATE ON community_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at for post_comments
DROP TRIGGER IF EXISTS update_post_comments_updated_at ON post_comments;
CREATE TRIGGER update_post_comments_updated_at
    BEFORE UPDATE ON post_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at for comment_replies
DROP TRIGGER IF EXISTS update_comment_replies_updated_at ON comment_replies;
CREATE TRIGGER update_comment_replies_updated_at
    BEFORE UPDATE ON comment_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at for content_reports
DROP TRIGGER IF EXISTS update_content_reports_updated_at ON content_reports;
CREATE TRIGGER update_content_reports_updated_at
    BEFORE UPDATE ON content_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at for community_guidelines
DROP TRIGGER IF EXISTS update_community_guidelines_updated_at ON community_guidelines;
CREATE TRIGGER update_community_guidelines_updated_at
    BEFORE UPDATE ON community_guidelines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update post likes count
DROP TRIGGER IF EXISTS post_likes_count_trigger ON post_likes;
CREATE TRIGGER post_likes_count_trigger
    AFTER INSERT OR DELETE ON post_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_post_likes_count();

-- Trigger: Update post comments count
DROP TRIGGER IF EXISTS post_comments_count_trigger ON post_comments;
CREATE TRIGGER post_comments_count_trigger
    AFTER INSERT OR DELETE ON post_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_post_comments_count();

-- Trigger: Update comment likes count
DROP TRIGGER IF EXISTS comment_likes_count_trigger ON comment_likes;
CREATE TRIGGER comment_likes_count_trigger
    AFTER INSERT OR DELETE ON comment_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_likes_count();

-- Trigger: Update reply likes count
DROP TRIGGER IF EXISTS reply_likes_count_trigger ON reply_likes;
CREATE TRIGGER reply_likes_count_trigger
    AFTER INSERT OR DELETE ON reply_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_reply_likes_count();

-- Trigger: Update question vote counts
DROP TRIGGER IF EXISTS question_votes_trigger ON question_votes;
CREATE TRIGGER question_votes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON question_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_question_vote_counts();

-- Trigger: Update answer vote counts
DROP TRIGGER IF EXISTS answer_votes_trigger ON answer_votes;
CREATE TRIGGER answer_votes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON answer_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_answer_vote_counts();

-- Trigger: Award XP for accepted answers
DROP TRIGGER IF EXISTS accepted_answer_xp_trigger ON question_answers;
CREATE TRIGGER accepted_answer_xp_trigger
    AFTER UPDATE ON question_answers
    FOR EACH ROW
    EXECUTE FUNCTION award_accepted_answer_xp();

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing avatar policies and recreate
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Create storage bucket for community images
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-images', 'community-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing community image policies and recreate
DROP POLICY IF EXISTS "Community images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own community images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own community images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own community images" ON storage.objects;

CREATE POLICY "Community images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'community-images');

CREATE POLICY "Users can upload own community images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'community-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own community images"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'community-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own community images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'community-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================
-- INDEXES
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
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_community_posts_tags ON community_posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_post_id ON post_bookmarks(post_id);
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user_id ON post_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_replies_comment_id ON comment_replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_replies_user_id ON comment_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_reply_likes_reply_id ON reply_likes(reply_id);
CREATE INDEX IF NOT EXISTS idx_reply_likes_user_id ON reply_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_content ON content_reports(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter_id ON content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_post_images_post_id ON post_images(post_id);
CREATE INDEX IF NOT EXISTS idx_post_images_order ON post_images(post_id, image_order);
CREATE INDEX IF NOT EXISTS idx_community_questions_user_id ON community_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_community_questions_created_at ON community_questions(created_at);
CREATE INDEX IF NOT EXISTS idx_community_questions_tags ON community_questions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_question_answers_question_id ON question_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_question_answers_user_id ON question_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_question_votes_question_id ON question_votes(question_id);
CREATE INDEX IF NOT EXISTS idx_question_votes_user_id ON question_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_answer_votes_answer_id ON answer_votes(answer_id);
CREATE INDEX IF NOT EXISTS idx_answer_votes_user_id ON answer_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_xp_user_id ON user_xp(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_leaderboard_week_start ON weekly_leaderboard(week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_leaderboard_xp_points ON weekly_leaderboard(xp_points DESC);

-- ============================================
-- TABLE COMMENTS
-- ============================================
COMMENT ON TABLE study_plans IS 'AI-generated study plans for users';
COMMENT ON TABLE flashcards IS 'Flashcards for spaced repetition learning';
COMMENT ON TABLE study_sessions IS 'Tracks user study sessions';
COMMENT ON TABLE calendar_events IS 'Calendar events for study sessions';
COMMENT ON TABLE study_plan_categories IS 'Lookup table for study plan categories';
COMMENT ON TABLE study_plan_preferences IS 'User-specific study plan preferences';
COMMENT ON TABLE community_posts IS 'Community posts for sharing study tips and resources';
COMMENT ON TABLE post_likes IS 'Likes on community posts';
COMMENT ON TABLE post_comments IS 'Comments on community posts';
COMMENT ON TABLE comment_likes IS 'Likes on comments';
COMMENT ON TABLE post_bookmarks IS 'User bookmarks for community posts';
COMMENT ON TABLE comment_replies IS 'Replies to comments on community posts';
COMMENT ON TABLE reply_likes IS 'Likes on comment replies';
COMMENT ON TABLE content_reports IS 'User reports for inappropriate content';
COMMENT ON TABLE post_images IS 'Multiple images associated with community posts';
COMMENT ON TABLE community_guidelines IS 'Community guidelines and rules';
COMMENT ON TABLE community_questions IS 'Q&A system questions';
COMMENT ON TABLE question_answers IS 'Answers to community questions';
COMMENT ON TABLE question_votes IS 'Votes on questions';
COMMENT ON TABLE answer_votes IS 'Votes on answers';
COMMENT ON TABLE question_comments IS 'Comments on questions';
COMMENT ON TABLE answer_comments IS 'Comments on answers';
COMMENT ON TABLE user_achievements IS 'User achievements and badges';
COMMENT ON TABLE user_xp IS 'User experience points and levels';
COMMENT ON TABLE xp_transactions IS 'History of XP awards';
COMMENT ON TABLE weekly_leaderboard IS 'Weekly leaderboard rankings';

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Insert default community guidelines
INSERT INTO community_guidelines (title, content) VALUES 
(
    'StudyBuddy Community Guidelines',
    'Welcome to the StudyBuddy Community! We want this to be a safe and supportive space for all learners.

1. Be Respectful: Treat everyone with kindness and respect, even if you disagree with their views.

2. Stay on Topic: Keep posts and comments related to education, studying, and learning.

3. No Spam: Do not post repetitive content, advertisements, or irrelevant links.

4. No Harassment: Do not bully, intimidate, or harass other members.

5. No Inappropriate Content: Do not share explicit, violent, or otherwise inappropriate content.

6. Give Credit: When sharing others work or ideas, always give proper credit.

7. Be Constructive: Provide helpful feedback and contribute positively to discussions.

Violations may result in content removal and account suspension. Thank you for helping keep our community positive and productive!'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- FINAL SUCCESS MESSAGE
-- ============================================
DO $
BEGIN
    RAISE NOTICE 'StudyBuddy complete database schema v2.0 with Q&A, achievements, and leaderboard completed successfully!';
END $;