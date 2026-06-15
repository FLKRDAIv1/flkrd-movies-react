-- Table: subtitle_line_edits
-- Stores admin-edited subtitle lines per movie/show
-- Primary key: (tmdb_id, media_type, season, episode, language, cue_index)
-- All users query this table; edits override original subtitle text

CREATE TABLE IF NOT EXISTS subtitle_line_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id text NOT NULL,
  media_type text NOT NULL DEFAULT 'movie',
  season integer NOT NULL DEFAULT 0,
  episode integer NOT NULL DEFAULT 0,
  language text NOT NULL DEFAULT 'ku',
  cue_index integer NOT NULL,          -- matches position in parsed subtitle array
  original_text text NOT NULL,
  edited_text text NOT NULL,
  edited_by text NOT NULL DEFAULT 'admin',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tmdb_id, media_type, season, episode, language, cue_index)
);

-- Enable RLS
ALTER TABLE subtitle_line_edits ENABLE ROW LEVEL SECURITY;

-- Anyone can read edits
CREATE POLICY "Public read subtitle_line_edits"
  ON subtitle_line_edits FOR SELECT USING (true);

-- Only authenticated service-role or anon with secret header can insert/update
-- (In this app admin status is local, so we allow all writes — admin check is done in app code)
CREATE POLICY "Allow insert subtitle_line_edits"
  ON subtitle_line_edits FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update subtitle_line_edits"
  ON subtitle_line_edits FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete subtitle_line_edits"
  ON subtitle_line_edits FOR DELETE USING (true);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE subtitle_line_edits;
