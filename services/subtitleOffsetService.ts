/**
 * subtitleOffsetService.ts
 *
 * Single source of truth for subtitle timing offsets.
 *
 * Priority (highest → lowest):
 *   1. User's local override  (localStorage key: flkrd_sub_offset_user_{tmdbId}_{s}_{e})
 *   2. Admin default          (Supabase subtitle_offsets table)
 *   3. Zero (no adjustment)
 *
 * The admin can set a default for:
 *   • An entire TV show   → season=0, episode=0
 *   • A specific episode  → season=S, episode=E
 *   • A movie             → season=0, episode=0
 */

import { supabase } from '../utils/supabaseClient';

export interface SubtitleOffsetRow {
  id: string;
  tmdb_id: string;
  media_type: 'movie' | 'tv';
  season: number;
  episode: number;
  offset_ms: number;
  note: string | null;
  set_by: string;
  updated_at: string;
}

export type OffsetSource = 'user' | 'admin' | 'none';

export interface ResolvedOffset {
  offsetMs: number;
  source: OffsetSource;
  adminOffsetMs: number;
}

// ── localStorage helpers ─────────────────────────────────────────────────────

function userKey(tmdbId: string, season: number, episode: number): string {
  return `flkrd_sub_offset_user_${tmdbId}_s${season}_e${episode}`;
}

export function saveUserOverride(
  tmdbId: string, season: number, episode: number, offsetMs: number
): void {
  try {
    if (offsetMs === 0) localStorage.removeItem(userKey(tmdbId, season, episode));
    else localStorage.setItem(userKey(tmdbId, season, episode), String(offsetMs));
  } catch (_) { /* storage full */ }
}

export function clearUserOverride(
  tmdbId: string, season: number, episode: number
): void {
  try { localStorage.removeItem(userKey(tmdbId, season, episode)); } catch (_) {}
}

function loadUserOverride(
  tmdbId: string, season: number, episode: number
): number | null {
  try {
    const raw = localStorage.getItem(userKey(tmdbId, season, episode));
    if (raw === null) return null;
    const n = parseInt(raw, 10);
    return isNaN(n) ? null : n;
  } catch (_) { return null; }
}

// ── Supabase reads ───────────────────────────────────────────────────────────

export async function fetchAdminOffset(
  tmdbId: string, mediaType: 'movie' | 'tv', season = 0, episode = 0
): Promise<SubtitleOffsetRow | null> {
  if (!tmdbId) return null;

  // For TV: try exact episode, then show-level default (s=0, e=0)
  const seasons  = mediaType === 'tv' ? [season, 0]  : [0];
  const episodes = mediaType === 'tv' ? [episode, 0] : [0];

  const { data, error } = await supabase
    .from('subtitle_offsets')
    .select('*')
    .eq('tmdb_id', tmdbId)
    .eq('media_type', mediaType)
    .in('season', seasons)
    .in('episode', episodes)
    .order('season', { ascending: false })
    .order('episode', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as SubtitleOffsetRow;
}

export async function resolveOffset(
  tmdbId: string, mediaType: 'movie' | 'tv', season = 0, episode = 0
): Promise<ResolvedOffset> {
  const userMs = loadUserOverride(tmdbId, season, episode);
  const adminRow = await fetchAdminOffset(tmdbId, mediaType, season, episode);
  const adminMs = adminRow?.offset_ms ?? 0;

  if (userMs !== null) return { offsetMs: userMs, source: 'user', adminOffsetMs: adminMs };
  if (adminMs !== 0)   return { offsetMs: adminMs, source: 'admin', adminOffsetMs: adminMs };
  return { offsetMs: 0, source: 'none', adminOffsetMs: 0 };
}

// ── Supabase writes (admin only) ─────────────────────────────────────────────

export async function upsertAdminOffset(
  tmdbId: string, mediaType: 'movie' | 'tv',
  season: number, episode: number,
  offsetMs: number, note?: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('subtitle_offsets')
    .upsert(
      { tmdb_id: tmdbId, media_type: mediaType, season, episode, offset_ms: offsetMs, note: note ?? null, set_by: 'admin' },
      { onConflict: 'tmdb_id,media_type,season,episode' }
    );
  return { error: error?.message ?? null };
}

export async function deleteAdminOffset(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('subtitle_offsets').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export function autoSaveCalibratedOffset(
  tmdbId: string, mediaType: 'movie' | 'tv',
  season: number, episode: number,
  offsetMs: number
): void {
  saveUserOverride(tmdbId, season, episode, offsetMs);
  try {
    Promise.resolve(
      supabase
        .from('subtitle_offsets')
        .upsert(
          { tmdb_id: tmdbId, media_type: mediaType, season, episode, offset_ms: offsetMs, note: 'AI calibrated sync', set_by: 'ai-sync' },
          { onConflict: 'tmdb_id,media_type,season,episode' }
        )
    ).catch(() => {});
  } catch (_) {}
}

export async function listAdminOffsets(): Promise<SubtitleOffsetRow[]> {
  const { data, error } = await supabase
    .from('subtitle_offsets')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error || !data) return [];
  return data as SubtitleOffsetRow[];
}
