/**
 * Subtitle Line Edit Service
 * Allows admins to edit individual subtitle cue lines in real-time.
 * Edits are stored in Supabase subtitle_line_edits table and
 * propagated to all users via Realtime subscriptions.
 */

import { supabase } from '../utils/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface SubtitleLineEdit {
  id: string;
  tmdb_id: string;
  media_type: string;
  season: number;
  episode: number;
  language: string;
  cue_index: number;
  original_text: string;
  edited_text: string;
  edited_by: string;
  updated_at: string;
}

export interface SubtitleEditKey {
  tmdbId: string;
  mediaType: string;
  season: number;
  episode: number;
  language: string;
}

/**
 * Fetch all line edits for a given content + language.
 * Returns a map of cue_index → edited_text for fast O(1) lookup.
 */
export async function fetchSubtitleEdits(key: SubtitleEditKey): Promise<Map<number, string>> {
  const { tmdbId, mediaType, season, episode, language } = key;

  const { data, error } = await supabase
    .from('subtitle_line_edits')
    .select('cue_index, edited_text')
    .eq('tmdb_id', String(tmdbId))
    .eq('media_type', mediaType)
    .eq('season', season)
    .eq('episode', episode)
    .eq('language', language);

  if (error) {
    console.error('[SubtitleEditService] Failed to fetch edits:', error.message);
    return new Map();
  }

  const map = new Map<number, string>();
  for (const row of data ?? []) {
    map.set(row.cue_index, row.edited_text);
  }
  return map;
}

/**
 * Save (upsert) a single subtitle line edit to Supabase.
 */
export async function saveSubtitleLineEdit(
  key: SubtitleEditKey,
  cueIndex: number,
  originalText: string,
  editedText: string
): Promise<boolean> {
  const { tmdbId, mediaType, season, episode, language } = key;

  const { error } = await supabase
    .from('subtitle_line_edits')
    .upsert(
      {
        tmdb_id: String(tmdbId),
        media_type: mediaType,
        season,
        episode,
        language,
        cue_index: cueIndex,
        original_text: originalText,
        edited_text: editedText,
        edited_by: 'admin',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tmdb_id,media_type,season,episode,language,cue_index' }
    );

  if (error) {
    console.error('[SubtitleEditService] Upsert failed:', error.message);
    return false;
  }

  return true;
}

/**
 * Delete a line edit (restore to original subtitle text).
 */
export async function deleteSubtitleLineEdit(
  key: SubtitleEditKey,
  cueIndex: number
): Promise<boolean> {
  const { tmdbId, mediaType, season, episode, language } = key;

  const { error } = await supabase
    .from('subtitle_line_edits')
    .delete()
    .eq('tmdb_id', String(tmdbId))
    .eq('media_type', mediaType)
    .eq('season', season)
    .eq('episode', episode)
    .eq('language', language)
    .eq('cue_index', cueIndex);

  if (error) {
    console.error('[SubtitleEditService] Delete failed:', error.message);
    return false;
  }

  return true;
}

/**
 * Subscribe to real-time changes in subtitle_line_edits for a given content.
 * Fires `onChange(updatedMap)` whenever any edit is inserted, updated, or deleted.
 * Returns the Realtime channel — call `.unsubscribe()` on cleanup.
 */
export function subscribeSubtitleEdits(
  key: SubtitleEditKey,
  onChange: (editMap: Map<number, string>) => void
): RealtimeChannel {
  const { tmdbId, mediaType, season, episode, language } = key;

  const channel = supabase
    .channel(`subtitle_edits:${tmdbId}:${mediaType}:${season}:${episode}:${language}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'subtitle_line_edits',
        filter: `tmdb_id=eq.${tmdbId}`,
      },
      async () => {
        // Re-fetch the full edit map whenever anything changes
        const updatedMap = await fetchSubtitleEdits(key);
        onChange(updatedMap);
      }
    )
    .subscribe();

  return channel;
}
