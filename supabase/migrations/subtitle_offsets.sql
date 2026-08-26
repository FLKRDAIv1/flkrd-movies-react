-- Table: subtitle_offsets
-- Admin sets a default subtitle timing offset (in ms) for any movie or TV show episode.
-- All users automatically receive this offset when they load that content.
-- Users can override it locally; their personal override takes priority.
--
-- Key logic (enforced in app code):
--   Priority: user_local_override > admin_default_offset > 0
--
-- Lookup key: (tmdb_id, media_type, season, episode)
--   • For movies:  season=0, episode=0
--   • For TV show (whole show default): season=0, episode=0
--   • For specific episode: season=S, episode=E
--   The app tries exact episode match first, then falls back to show-level default.

CREATE TABLE IF NOT EXISTS subtitle_offsets (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id       text        NOT NULL,
  media_type    text        NOT NULL DEFAULT 'movie',   -- 'movie' | 'tv'
  season        integer     NOT NULL DEFAULT 0,
  episode       integer     NOT NULL DEFAULT 0,
  offset_ms     integer     NOT NULL DEFAULT 0,         -- milliseconds, e.g. 2000 = +2 s
  note          text,                                   -- optional admin note ("Arabic sub -1.5s")
  set_by        text        NOT NULL DEFAULT 'admin',
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tmdb_id, media_type, season, episode)
);

-- Automatically refresh updated_at on every update
CREATE OR REPLACE FUNCTION update_subtitle_offsets_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_subtitle_offsets_updated_at
  BEFORE UPDATE ON subtitle_offsets
  FOR EACH ROW EXECUTE FUNCTION update_subtitle_offsets_updated_at();

-- RLS
ALTER TABLE subtitle_offsets ENABLE ROW LEVEL SECURITY;

-- Everyone can read (needed by every visitor's player)
CREATE POLICY "Public read subtitle_offsets"
  ON subtitle_offsets FOR SELECT USING (true);

-- Writes are allowed (admin check is enforced in app code)
CREATE POLICY "Allow insert subtitle_offsets"
  ON subtitle_offsets FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update subtitle_offsets"
  ON subtitle_offsets FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete subtitle_offsets"
  ON subtitle_offsets FOR DELETE USING (true);

-- Realtime so the admin panel and player update instantly
ALTER PUBLICATION supabase_realtime ADD TABLE subtitle_offsets;
