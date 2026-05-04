-- Create the kurdish_cc_registry table
CREATE TABLE IF NOT EXISTS public.kurdish_cc_registry (
    tmdb_id BIGINT PRIMARY KEY,
    media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
    title TEXT,
    poster_path TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.kurdish_cc_registry ENABLE ROW LEVEL SECURITY;

-- Allow public read access (everyone can see the Kurdish CC movies)
CREATE POLICY "Allow public read access on kurdish_cc_registry"
ON public.kurdish_cc_registry FOR SELECT
TO public
USING (true);

-- Allow public insert (since clients will auto-register them)
CREATE POLICY "Allow public insert on kurdish_cc_registry"
ON public.kurdish_cc_registry FOR INSERT
TO public
WITH CHECK (true);

-- Allow public update (in case we need to update title/poster)
CREATE POLICY "Allow public update on kurdish_cc_registry"
ON public.kurdish_cc_registry FOR UPDATE
TO public
USING (true);

-- Allow public delete (admins can remove fake/bad ones)
CREATE POLICY "Allow public delete on kurdish_cc_registry"
ON public.kurdish_cc_registry FOR DELETE
TO public
USING (true);
