-- NOTE: DO NOT RUN THIS IN THE APP, PASTE IT IN THE SUPABASE SQL EDITOR!

-- Add the 'level' and 'bannerBase64' columns if you previously created the table, otherwise this will just add it to your existing table
ALTER TABLE public.dubbed_movies 
ADD COLUMN IF NOT EXISTS "level" VARCHAR(50) DEFAULT 'NEW',
ADD COLUMN IF NOT EXISTS "bannerBase64" TEXT NULL;

-- Turn on Row Level Security (RLS) but allow anonymous/public reads and inserts
-- because the web app handles the Admin Authentication layer via our custom login modal.
ALTER TABLE public.dubbed_movies ENABLE ROW LEVEL SECURITY;

-- Safely create policies if they do not exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'dubbed_movies' AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access" ON public.dubbed_movies FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROMr
         pg_policies WHERE tablename = 'dubbed_movies' AND policyname = 'Allow public insert access'
    ) THEN
        CREATE POLICY "Allow public insert access" ON public.dubbed_movies FOR INSERT WITH CHECK (true);
    END IF;
END $$;
