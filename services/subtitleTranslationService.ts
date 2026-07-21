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
async function translateText(text: string[], sourceLang: string, targetLang: string): Promise<string[]> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, source: sourceLang, target: targetLang }),
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
 * Translates an array of subtitle cues batch recursively if line mismatch occurs.
 */
async function translateChunkWithFallback(chunk: SubtitleCue[], sourceLang: string, targetLang: string): Promise<string[]> {
  const chunkTexts = chunk.map(c => c.text.replace(/\n/g, ' / '));

  try {
    const translatedTexts = await translateText(chunkTexts, sourceLang, targetLang);
    if (Array.isArray(translatedTexts) && translatedTexts.length === chunk.length) {
      return translatedTexts;
    }
  } catch (err) {
    console.warn("[TRANSLATE] Chunk translation exception, falling back:", err);
  }

  if (chunk.length > 1) {
    const mid = Math.floor(chunk.length / 2);
    const left = chunk.slice(0, mid);
    const right = chunk.slice(mid);

    console.warn(`[TRANSLATE] Line count mismatch in chunk (size ${chunk.length}). Retrying by splitting into halves: ${left.length} and ${right.length}`);

    await new Promise(resolve => setTimeout(resolve, 30));

    const [leftRes, rightRes] = await Promise.all([
      translateChunkWithFallback(left, sourceLang, targetLang),
      translateChunkWithFallback(right, sourceLang, targetLang)
    ]);
    return [...leftRes, ...rightRes];
  }

  return chunkTexts;
}

export async function translateCuesToKurdish(
  cues: SubtitleCue[],
  sourceLang: string,
  targetLang: string,
  onProgress?: (progress: number, statusText: string) => void
): Promise<SubtitleCue[]> {
  const translatedCues = cues.map(c => ({ ...c }));
  const chunkSize = 80;
  const chunks: SubtitleCue[][] = [];
  
  for (let i = 0; i < cues.length; i += chunkSize) {
    chunks.push(cues.slice(i, i + chunkSize));
  }

  const concurrency = 3;
  let completedCount = 0;

  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency);
    const batchPromises = batch.map((chunk, batchIdx) => {
      const chunkIndex = i + batchIdx;
      return translateChunkWithFallback(chunk, sourceLang, targetLang).then((translatedTexts) => {
        const offset = chunkIndex * chunkSize;
        for (let j = 0; j < chunk.length; j++) {
          const translated = translatedTexts[j] ?? chunk[j].text;
          translatedCues[offset + j].text = translated.replace(/\s*\/\s*/g, '\n');
        }
        completedCount += chunk.length;
        if (onProgress) {
          const progressPct = Math.round((completedCount / cues.length) * 100);
          const statusText = `Translating dialogue lines (${Math.min(completedCount, cues.length)} / ${cues.length})...`;
          onProgress(progressPct, statusText);
        }
      });
    });

    await Promise.all(batchPromises);
    await new Promise(resolve => setTimeout(resolve, 60)); // tiny throttle between batches
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

export function compileToVTT(cues: SubtitleCue[]): string {
  let vtt = 'WEBVTT\n\n';

  vtt += `00:00:01.000 --> 00:00:04.000\nژێرنووسکراوە لەلایەن زانا فارۆقەوە\n\n`;
  vtt += `00:00:04.500 --> 00:00:07.500\nPowered by FLKRD STUDIO\n\n`;

  const filteredCues = cues.filter(cue => timestampToSeconds(cue.timestamp) >= 7.5);

  filteredCues.forEach((cue) => {
    const timestamp = cue.timestamp.replace(/,/g, '.');
    vtt += `${timestamp}\n${cue.text}\n\n`;
  });
  return vtt;
}

export function compileToSRT(cues: SubtitleCue[]): string {
  let srt = '';
  let index = 1;

  srt += `${index++}\n00:00:01,000 --> 00:00:04,000\nژێرنووسکراوە لەلایەن زانا فارۆقەوە\n\n`;
  srt += `${index++}\n00:00:04,500 --> 00:00:07,500\nPowered by FLKRD STUDIO\n\n`;

  const filteredCues = cues.filter(cue => timestampToSeconds(cue.timestamp) >= 7.5);

  filteredCues.forEach((cue) => {
    let timestamp = cue.timestamp.replace(/\./g, ',');
    
    const parts = timestamp.split('-->');
    if (parts.length === 2) {
      let start = parts[0].trim();
      let end = parts[1].trim();
      
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
  targetLang: 'ku' | 'badini' = 'ku',
  onProgress?: (progress: number, statusText: string) => void
): Promise<{ success: boolean; subtitleUrl?: string; error?: string }> {
  try {
    // Detect source language for all world languages
    const subLangRaw = (sub.attributes?.language || 'en').toLowerCase().trim();
    const langMap: Record<string, string> = {
      'en': 'en', 'eng': 'en',
      'ar': 'ar', 'ara': 'ar',
      'fa': 'fa', 'fas': 'fa', 'per': 'fa',
      'fr': 'fr', 'fra': 'fr', 'fre': 'fr',
      'es': 'es', 'spa': 'es',
      'tr': 'tr', 'tur': 'tr',
      'de': 'de', 'deu': 'de', 'ger': 'de',
      'it': 'it', 'ita': 'it',
      'ru': 'ru', 'rus': 'ru',
      'zh': 'zh-CN', 'zho': 'zh-CN', 'chi': 'zh-CN', 'zh-cn': 'zh-CN', 'zh-tw': 'zh-TW',
      'ja': 'ja', 'jpn': 'ja',
      'ko': 'ko', 'kor': 'ko',
      'hi': 'hi', 'hin': 'hi',
      'pt': 'pt', 'por': 'pt', 'pt-br': 'pt',
      'vi': 'vi', 'vie': 'vi',
      'th': 'th', 'tha': 'th',
      'id': 'id', 'ind': 'id',
      'nl': 'nl', 'nld': 'nl', 'dut': 'nl',
      'pl': 'pl', 'pol': 'pl',
      'sv': 'sv', 'swe': 'sv',
      'no': 'no', 'nor': 'no',
      'da': 'da', 'dan': 'da',
      'fi': 'fi', 'fin': 'fi',
      'cs': 'cs', 'ces': 'cs', 'cze': 'cs',
      'sk': 'sk', 'slk': 'sk', 'slo': 'sk',
      'hu': 'hu', 'hun': 'hu',
      'ro': 'ro', 'ron': 'ro', 'rum': 'ro',
      'el': 'el', 'ell': 'el', 'gre': 'el',
      'he': 'he', 'heb': 'he',
      'uk': 'uk', 'ukr': 'uk',
      'bg': 'bg', 'bul': 'bg'
    };

    let sourceLang = langMap[subLangRaw];
    if (!sourceLang) {
      if (subLangRaw.length === 2 || subLangRaw.length === 3) {
        sourceLang = subLangRaw.substring(0, 2);
      } else {
        sourceLang = 'auto';
      }
    }

    // Google Translate target code: Sorani is 'ckb', Badini (Kurmanji) is 'ku'
    const apiTargetLang = targetLang === 'badini' ? 'ku' : 'ckb';

    if (onProgress) onProgress(2, `Downloading ${sourceLang.toUpperCase()} subtitle track...`);
    
    const text = await subtitleService.downloadSubtitle(sub);
    if (!text) throw new Error("Could not download subtitle track.");

    if (onProgress) onProgress(5, "Parsing dialogue cues...");
    
    const cues = parseSubtitleToCues(text);
    if (cues.length === 0) throw new Error("No subtitle cues found.");

    const targetNameKurdish = targetLang === 'badini' ? 'Kurdish Badini' : 'Kurdish Sorani';
    if (onProgress) onProgress(7, `Translating from ${sourceLang.toUpperCase()} to ${targetNameKurdish}...`);

    const translatedCues = await translateCuesToKurdish(cues, sourceLang, apiTargetLang, (p, status) => {
      const mapped = Math.round(7 + p * 0.78);
      if (onProgress) onProgress(mapped, status);
    });

    if (onProgress) onProgress(86, "Compiling translated dialogue to SRT format...");

    const srtContent = compileToSRT(translatedCues);
    const blob = new Blob([srtContent], { type: 'text/plain' });

    if (onProgress) onProgress(90, "Uploading SRT subtitle to Supabase storage...");

    const timeStamp = Date.now();
    const filePath = mediaType === 'tv'
      ? `custom/${tmdbId}_s${season}_e${episode}_${targetLang}_${timeStamp}.srt`
      : `custom/${tmdbId}_${targetLang}_${timeStamp}.srt`;

    let resolvedPublicUrl = "";

    try {
      const { error: uploadErr } = await supabase.storage
        .from('subtitles')
        .upload(filePath, blob, {
          contentType: 'text/plain',
          upsert: true
        });

      if (uploadErr) throw uploadErr;

      if (onProgress) onProgress(94, "Retrieving secure public Vtt URL...");

      const { data: { publicUrl } } = supabase.storage
        .from('subtitles')
        .getPublicUrl(filePath);

      resolvedPublicUrl = publicUrl;
      if (resolvedPublicUrl.startsWith('//')) {
        resolvedPublicUrl = `https:${resolvedPublicUrl}`;
      }
    } catch (storageErr) {
      console.warn("[SUBTITLE-PIPELINE] Primary storage upload failed, using high-reliability base64 fallback:", storageErr);
      const base64Srt = btoa(unescape(encodeURIComponent(srtContent)));
      resolvedPublicUrl = `data:text/plain;base64,${base64Srt}`;
    }

    // Registering subtitle in Supabase Postgres registry using upsert to avoid DELETE CORS / 409 Duplicate Key Conflict
    const { error: dbErr } = await supabase
      .from('custom_subtitles')
      .upsert({
        tmdb_id: String(tmdbId),
        media_type: mediaType || 'movie',
        language: targetLang,
        subtitle_url: resolvedPublicUrl,
        file_name: `${sub.attributes?.display_name || 'Translated'}_${targetLang}.srt`,
        season: season || 0,
        episode: episode || 0
      }, {
        onConflict: 'tmdb_id,media_type,language,season,episode'
      });

    if (dbErr) throw dbErr;

    // Realtime Global Broadcast Event: Notify all active clients watching this content
    try {
      const syncChannel = supabase.channel(`subtitle_sync_${tmdbId}_${mediaType || 'movie'}`);
      syncChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await syncChannel.send({
            type: 'broadcast',
            event: 'new_subtitle_available',
            payload: {
              tmdbId: String(tmdbId),
              mediaType: mediaType || 'movie',
              season: season || 0,
              episode: episode || 0,
              language: targetLang,
              subtitleUrl: resolvedPublicUrl,
              fileName: `${sub.attributes?.display_name || 'Translated'}_${targetLang}.srt`
            }
          });
        }
      });
    } catch (bErr) {
      console.warn("[SUBTITLE-PIPELINE] Broadcast sync warning:", bErr);
    }

    if (onProgress) onProgress(100, "Subtitle fully registered and active!");

    return { success: true, subtitleUrl: resolvedPublicUrl };
  } catch (err: any) {
    console.error("[SubtitleTranslationService] Pipeline failed:", err);
    return { success: false, error: err.message || "Unknown error occurred" };
  }
}
