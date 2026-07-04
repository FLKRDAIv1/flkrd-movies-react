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

// ============================================================
// Google Apps Script Web App — Official Google Translate Engine
// Content-Type: text/plain bypasses CORS preflight OPTIONS block
// GAS backend still parses the JSON body correctly
// ============================================================
const GAS_TRANSLATE_URL =
  'https://script.google.com/macros/s/AKfycbwBTWzXzyNxSe51K5MfzYYAdOxkLjYZobb3XULgZMHJE8r_hofMfo8DpmT7hbzFASyC/exec';

/**
 * Translates a block of text via Google Apps Script.
 * Can handle multiline text (joined by \n) for batch translation.
 * On any error, returns the original text so the player never crashes.
 */
async function translateText(text: string): Promise<string> {
  try {
    const response = await fetch(GAS_TRANSLATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ text, targetLang: 'ckb' }),
    });

    if (!response.ok) {
      console.warn(`[GAS] HTTP ${response.status} — returning original text`);
      return text;
    }

    const data = await response.json();

    if (!data.success) {
      console.warn(`[GAS] API error: ${data.error} — returning original text`);
      return text;
    }

    return data.translation ?? text;
  } catch (err: any) {
    console.warn(`[GAS] Fetch failed: ${err.message} — returning original text`);
    return text;
  }
}

/**
 * Translates an array of subtitle cues to Kurdish Sorani.
 * Batches 30 cues per GAS call (joined by \n), splits on \n to restore lines.
 * Falls back to original text on any error — player will never crash.
 */
// Helper function to translate a chunk of cues recursively if line mismatch occurs (divide & conquer)
async function translateChunkWithFallback(chunk: SubtitleCue[]): Promise<string[]> {
  const chunkTexts = chunk.map(c => c.text.replace(/\n/g, ' / '));
  const combinedText = chunkTexts.join('\n');

  try {
    const rawTranslation = await translateText(combinedText);
    const translatedTexts = rawTranslation.split('\n');

    if (translatedTexts.length === chunk.length) {
      return translatedTexts;
    }
  } catch (err) {
    console.warn("[GAS] Chunk translation exception, falling back:", err);
  }

  // If there's a mismatch or error and the chunk has more than 1 item, divide and conquer!
  if (chunk.length > 1) {
    const mid = Math.floor(chunk.length / 2);
    const left = chunk.slice(0, mid);
    const right = chunk.slice(mid);

    console.warn(`[GAS] Line count mismatch in chunk (size ${chunk.length}). Retrying by splitting into halves: ${left.length} and ${right.length}`);

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
  onProgress?: (progress: number) => void
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
      onProgress(Math.round(((i + chunk.length) / cues.length) * 100));
    }

    // Small breather between batches to avoid GAS rate-limiting
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
 * Handles the full pipeline: download, translate, compile, upload to Supabase, and save DB reference.
 */
export async function translateAndSavePipeline(
  sub: any,
  tmdbId: string | number,
  mediaType: string,
  season: number = 0,
  episode: number = 0,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; subtitleUrl?: string; error?: string }> {
  try {
    // 1. Download subtitle text
    const text = await subtitleService.downloadSubtitle(sub);
    if (!text) throw new Error("Could not download subtitle track.");

    // 2. Parse cues
    const cues = parseSubtitleToCues(text);
    if (cues.length === 0) throw new Error("No subtitle cues found.");

    // 3. Translate cues
    const translatedCues = await translateCuesToKurdish(cues, onProgress);

    // 4. Compile to VTT
    const vttContent = compileToVTT(translatedCues);
    const blob = new Blob([vttContent], { type: 'text/vtt' });

    // 5. Upload to Supabase Storage
    const timeStamp = Date.now();
    const filePath = mediaType === 'tv'
      ? `custom/${tmdbId}_s${season}_e${episode}_ku_${timeStamp}.vtt`
      : `custom/${tmdbId}_ku_${timeStamp}.vtt`;

    const { error: uploadErr } = await supabase.storage
      .from('subtitles')
      .upload(filePath, blob, {
        contentType: 'text/vtt',
        upsert: true
      });

    if (uploadErr) throw uploadErr;

    // 6. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('subtitles')
      .getPublicUrl(filePath);

    let resolvedPublicUrl = publicUrl;
    if (resolvedPublicUrl.startsWith('//')) {
      resolvedPublicUrl = `https:${resolvedPublicUrl}`;
    }

    // 7. Save reference in custom_subtitles database table
    const { error: dbErr } = await supabase
      .from('custom_subtitles')
      .upsert({
        tmdb_id: String(tmdbId),
        media_type: mediaType || 'movie',
        language: 'ku',
        subtitle_url: resolvedPublicUrl,
        file_name: `${sub.attributes?.display_name || 'Translated'}_ku.vtt`,
        season,
        episode
      }, {
        onConflict: 'tmdb_id,media_type,language,season,episode'
      });

    if (dbErr) throw dbErr;

    return { success: true, subtitleUrl: resolvedPublicUrl };
  } catch (err: any) {
    console.error("[SubtitleTranslationService] Pipeline failed:", err);
    return { success: false, error: err.message || "Unknown error occurred" };
  }
}
