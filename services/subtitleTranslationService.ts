import { supabase } from '../utils/supabaseClient';
import { subtitleService } from './subtitleService';

export interface SubtitleCue {
  index: string;
  timestamp: string;
  text: string;
}

/**
 * Parses subtitle text into structured dialogue cues.
 * Supports VTT and SRT.
 */
export function parseSubtitleToCues(text: string): SubtitleCue[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  let cleanText = normalized;
  if (normalized.startsWith('WEBVTT')) {
    cleanText = normalized.replace(/^WEBVTT[^\n]*\n/, '');
  }

  const sections = cleanText.split(/\n\n+/);
  const cues: SubtitleCue[] = [];

  for (const section of sections) {
    const lines = section.trim().split('\n');
    if (lines.length >= 2) {
      const timeIndex = lines.findIndex(l => l.includes('-->'));
      if (timeIndex !== -1) {
        const timestamp = lines[timeIndex].trim();
        const index = timeIndex > 0 ? lines[timeIndex - 1].trim() : '';
        const textLines = lines.slice(timeIndex + 1);
        const filteredLines = textLines.filter(line => !/^\s*\d+\s*$/.test(line) && !line.includes('-->'));
        const textContent = filteredLines.join('\n').trim();
        if (textContent) {
          cues.push({ index, timestamp, text: textContent });
        }
      }
    }
  }
  return cues;
}

const getApiBaseUrl = (): string => {
  if (typeof window === 'undefined') return 'https://fkurd.pro';
  const proto = window.location.protocol;
  if (proto === 'tauri:' || (window as any).__TAURI_INTERNALS__) {
    return 'https://fkurd.pro';
  }
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.')
  ) {
    return '';
  }
  return '';
};

/**
 * Translates an array of text strings via Vercel translation proxy.
 * Passes the array directly so the backend can manage line counts and fallbacks.
 * On any error, returns the original text array so the player never crashes.
 */
async function translateText(text: string[]): Promise<string[]> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, source: 'en', target: 'ckb' }),
    });

    if (!response.ok) {
      console.warn(`[TRANSLATE] HTTP ${response.status} — returning original text`);
      return text;
    }

    const data = await response.json();
    return data.translation ?? text;
  } catch (err: any) {
    console.warn(`[TRANSLATE] Fetch failed: ${err.message} — returning original text`);
    return text;
  }
}

/**
 * Translates an array of subtitle cues to Kurdish Sorani.
 * Batches cues and uses divide & conquer fallback to translate each item safely.
 * Falls back to original text on any error — player will never crash.
 */
// Helper function to translate a chunk of cues recursively if line mismatch occurs (divide & conquer)
async function translateChunkWithFallback(chunk: SubtitleCue[]): Promise<string[]> {
  const chunkTexts = chunk.map(c => c.text.replace(/\n/g, ' / '));

  try {
    const translatedTexts = await translateText(chunkTexts);
    if (Array.isArray(translatedTexts) && translatedTexts.length === chunk.length) {
      return translatedTexts;
    }
  } catch (err) {
    console.warn("[TRANSLATE] Chunk translation exception, falling back:", err);
  }

  // If there's a mismatch or error and the chunk has more than 1 item, divide and conquer!
  if (chunk.length > 1) {
    const mid = Math.floor(chunk.length / 2);
    const left = chunk.slice(0, mid);
    const right = chunk.slice(mid);

    console.warn(`[TRANSLATE] Line count mismatch in chunk (size ${chunk.length}). Retrying by splitting into halves: ${left.length} and ${right.length}`);

    // Wait a brief moment to avoid overloading the API on retries
    await new Promise(resolve => setTimeout(resolve, 30));

    const [leftRes, rightRes] = await Promise.all([
      translateChunkWithFallback(left),
      translateChunkWithFallback(right)
    ]);
    return [...leftRes, ...rightRes];
  }

  // If a single cue translation fails, return its original text so we never drop subtitles
  return chunkTexts;
}

export async function translateCuesToKurdish(
  cues: SubtitleCue[],
  onProgress?: (progress: number, statusText: string) => void
): Promise<SubtitleCue[]> {
  const translatedCues = cues.map(c => ({ ...c }));
  const chunkSize = 50;

  for (let i = 0; i < cues.length; i += chunkSize) {
    const chunk = cues.slice(i, i + chunkSize);

    const translatedTexts = await translateChunkWithFallback(chunk);

    // Apply translations — restore " / " back to newlines inside each cue
    for (let j = 0; j < chunk.length; j++) {
      const translated = translatedTexts[j] ?? chunk[j].text;
      translatedCues[i + j].text = translated.replace(/\s*\/\s*/g, '\n');
    }

    if (onProgress) {
      const progressPct = Math.round(((i + chunk.length) / cues.length) * 100);
      const statusText = `Translating dialogue lines (${Math.min(i + chunk.length, cues.length)} / ${cues.length})...`;
      onProgress(progressPct, statusText);
    }

    // Small breather between batches to avoid rate-limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  return translatedCues;
}

function timestampToSeconds(ts: string): number {
  const clean = ts.split('-->')[0].trim().replace(',', '.');
  const parts = clean.split(':');
  if (parts.length === 3) {
    const h = parseFloat(parts[0]);
    const m = parseFloat(parts[1]);
    const s = parseFloat(parts[2]);
    return h * 3600 + m * 60 + s;
  }
  return 0;
}

/**
 * Compiles cues back into WebVTT format.
 */
export function compileToVTT(cues: SubtitleCue[]): string {
  let vtt = 'WEBVTT\n\n';

  // Prepend custom intro/branding cues
  vtt += `00:00:01.000 --> 00:00:04.000\nژێرنووسکراوە لەلایەن زانا فارۆقەوە\n\n`;
  vtt += `00:00:04.500 --> 00:00:07.500\nPowered by FLKRD STUDIO\n\n`;

  // Filter out original cues starting in the first 7.5s to prevent overlaps
  const filteredCues = cues.filter(cue => timestampToSeconds(cue.timestamp) >= 7.5);

  filteredCues.forEach((cue) => {
    // Ensure timestamp uses dot instead of comma for VTT
    const timestamp = cue.timestamp.replace(/,/g, '.');
    vtt += `${timestamp}\n${cue.text}\n\n`;
  });
  return vtt;
}

/**
 * Compiles cues back into SRT format.
 */
export function compileToSRT(cues: SubtitleCue[]): string {
  let srt = '';
  let index = 1;

  // Prepend custom intro/branding cues (using standard SubRip format)
  srt += `${index++}\n00:00:01,000 --> 00:00:04,000\nژێرنووسکراوە لەلایەن زانا فارۆقەوە\n\n`;
  srt += `${index++}\n00:00:04,500 --> 00:00:07,500\nPowered by FLKRD STUDIO\n\n`;

  // Filter out original cues starting in the first 7.5s to prevent overlaps
  const filteredCues = cues.filter(cue => timestampToSeconds(cue.timestamp) >= 7.5);

  filteredCues.forEach((cue) => {
    // Ensure timestamp uses comma instead of dot for SRT
    let timestamp = cue.timestamp.replace(/\./g, ',');
    
    // Normalize timestamp to SRT format (e.g. 00:00:00,000)
    const parts = timestamp.split('-->');
    if (parts.length === 2) {
      let start = parts[0].trim();
      let end = parts[1].trim();
      
      // Ensure HH:MM:SS format
      if (start.split(':').length === 2) start = '00:' + start;
      if (end.split(':').length === 2) end = '00:' + end;
      
      timestamp = `${start} --> ${end}`;
    }

    srt += `${index++}\n${timestamp}\n${cue.text}\n\n`;
  });
  return srt;
}

export async function translateAndSavePipeline(
  sub: any,
  tmdbId: string | number,
  mediaType: string,
  season: number = 0,
  episode: number = 0,
  onProgress?: (progress: number, statusText: string) => void
): Promise<{ success: boolean; subtitleUrl?: string; error?: string }> {
  try {
    if (onProgress) onProgress(2, "Downloading subtitle track from OpenSubtitles...");
    
    // 1. Download subtitle text
    const text = await subtitleService.downloadSubtitle(sub);
    if (!text) throw new Error("Could not download subtitle track.");

    if (onProgress) onProgress(5, "Parsing dialogue cues...");
    
    // 2. Parse cues
    const cues = parseSubtitleToCues(text);
    if (cues.length === 0) throw new Error("No subtitle cues found.");

    if (onProgress) onProgress(7, "Starting Google translation to Kurdish Sorani...");

    // 3. Translate cues
    const translatedCues = await translateCuesToKurdish(cues, (p, status) => {
      // Map 0-100% of translation to 7% - 85% of total progress
      const mapped = Math.round(7 + p * 0.78);
      if (onProgress) onProgress(mapped, status);
    });

    if (onProgress) onProgress(86, "Compiling translated dialogue to SRT format...");

    // 4. Compile to SRT (as requested by user)
    const srtContent = compileToSRT(translatedCues);
    const blob = new Blob([srtContent], { type: 'text/plain' });

    if (onProgress) onProgress(90, "Uploading SRT subtitle to Supabase storage...");

    // 5. Upload to Supabase Storage as .srt
    const timeStamp = Date.now();
    const filePath = mediaType === 'tv'
      ? `custom/${tmdbId}_s${season}_e${episode}_ku_${timeStamp}.srt`
      : `custom/${tmdbId}_ku_${timeStamp}.srt`;

    const { error: uploadErr } = await supabase.storage
      .from('subtitles')
      .upload(filePath, blob, {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadErr) throw uploadErr;

    if (onProgress) onProgress(94, "Retrieving secure public Vtt URL...");

    // 6. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('subtitles')
      .getPublicUrl(filePath);

    let resolvedPublicUrl = publicUrl;
    if (resolvedPublicUrl.startsWith('//')) {
      resolvedPublicUrl = `https:${resolvedPublicUrl}`;
    }

    if (onProgress) onProgress(97, "Registering subtitle in Supabase Postgres registry (for all users)...");

    // 7. Save reference in custom_subtitles database table
    const { error: dbErr } = await supabase
      .from('custom_subtitles')
      .upsert({
        tmdb_id: String(tmdbId),
        media_type: mediaType || 'movie',
        language: 'ku',
        subtitle_url: resolvedPublicUrl,
        file_name: `${sub.attributes?.display_name || 'Translated'}_ku.srt`,
        season,
        episode
      }, {
        onConflict: 'tmdb_id,media_type,language,season,episode'
      });

    if (dbErr) throw dbErr;

    if (onProgress) onProgress(100, "Subtitle fully registered and active!");

    return { success: true, subtitleUrl: resolvedPublicUrl };
  } catch (err: any) {
    console.error("[SubtitleTranslationService] Pipeline failed:", err);
    return { success: false, error: err.message || "Unknown error occurred" };
  }
}
