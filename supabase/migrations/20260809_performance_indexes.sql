-- Migration: 20260809_performance_indexes.sql
-- Description: Compound indexes for performance optimization on user_watch_progress, comments, site_analytics, and custom_subtitles.

CREATE INDEX IF NOT EXISTS idx_user_watch_progress_user_updated 
ON public.user_watch_progress (user_id ASC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_user_created 
ON public.comments (user_id ASC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_analytics_created 
ON public.site_analytics (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_custom_subtitles_tmdb_lang 
ON public.custom_subtitles (tmdb_id, language);

ANALYZE public.user_watch_progress;
ANALYZE public.comments;
ANALYZE public.site_analytics;
ANALYZE public.custom_subtitles;
