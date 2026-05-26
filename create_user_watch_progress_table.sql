-- ====================================================================
-- SUPABASE MIGRATION: Continue Watching / Resume Playback Registry
-- ====================================================================

-- 1. Create the user_watch_progress table
CREATE TABLE IF NOT EXISTS public.user_watch_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    movie_id VARCHAR(255) NOT NULL,
    movie_type VARCHAR(50) NOT NULL CHECK (movie_type IN ('movie', 'tv', 'dubbed')),
    progress_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_duration DOUBLE PRECISION NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraint: Ensure only one progress record per user per content item exists
    CONSTRAINT unique_user_content UNIQUE (user_id, movie_id, movie_type)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.user_watch_progress ENABLE ROW LEVEL SECURITY;

-- 3. Establish RLS Access Control Policies
CREATE POLICY "Enable SELECT for owners"
ON public.user_watch_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Enable INSERT for owners"
ON public.user_watch_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable UPDATE for owners"
ON public.user_watch_progress FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable DELETE for owners"
ON public.user_watch_progress FOR DELETE
USING (auth.uid() = user_id);

-- 4. Create composite lookup indexes to optimize query performance
CREATE INDEX IF NOT EXISTS idx_user_watch_progress_lookup 
ON public.user_watch_progress (user_id, movie_id, movie_type);
