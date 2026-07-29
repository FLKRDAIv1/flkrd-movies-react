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
 * Direct client-side Google GTX POST array translator (runs directly in browser as secondary fail-safe)
 */
async function translateArrayDirectClient(chunkItems: string[], src: string, tgt: string): Promise<string[] | null> {
  if (!chunkItems || chunkItems.length === 0) return null;
  const effectiveSrc = (src && src !== 'auto') ? src : 'auto';

  const doFetch = async (sourceCode: string) => {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sourceCode)}&tl=${encodeURIComponent(tgt)}&dt=t`;
      const bodyParams = chunkItems.map(t => `q=${encodeURIComponent((t || '').replace(/\r\n/g, ' ').replace(/\n/g, ' ') || ' ')}`).join('&');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: bodyParams
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          return chunkItems.map((item, idx) => {
            const resItem = data[idx];
            if (Array.isArray(resItem)) {
              const translated = resItem.map((subItem: any) => (Array.isArray(subItem) ? (subItem[0] || '') : '')).join('').trim();
              return translated || item;
            }
            return item;
          });
        }
      }
    } catch (e) {}
    return null;
  };

  let res = await doFetch(effectiveSrc);
  if (!res || (effectiveSrc !== 'auto' && !res.some((t, i) => t && t.trim() && t !== chunkItems[i]))) {
    res = await doFetch('auto');
  }
  return res;
}

/**
 * Translates an array of text strings via Vercel translation proxy with direct client fallback.
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

    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.translation)) {
        const validCount = data.translation.filter((t: string, i: number) => t && t.trim() && t !== text[i]).length;
        if (validCount > 0) {
          return data.translation;
        }
      }
    }
  } catch (err: any) {
    console.warn(`[TRANSLATE] Server proxy fetch notice: ${err?.message || err} — trying direct client fallback...`);
  }

  // Fail-Safe Fallback: Try direct browser client translation with Google GTX
  const clientDirect = await translateArrayDirectClient(text, sourceLang, targetLang);
  if (clientDirect && Array.isArray(clientDirect) && clientDirect.length === text.length) {
    return clientDirect;
  }

  return text;
}

/**
 * Translates an array of subtitle cues batch recursively if line mismatch occurs.
 */
async function translateChunkWithFallback(chunk: SubtitleCue[], sourceLang: string, targetLang: string): Promise<string[]> {
  const chunkTexts = chunk.map(c => c.text);

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

  if (chunk.length === 1) {
    const singleText = chunk[0].text;
    try {
      const fetchSingle = async (srcCode: string) => {
        const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(srcCode)}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(singleText)}`;
        const res = await fetch(gtxUrl);
        if (res.ok) {
          const data = await res.json();
          if (data && data[0]) {
            const trans = data[0].map((x: any) => x[0]).join('');
            if (trans && trans.trim()) return trans;
          }
        }
        return null;
      };

      const primary = await fetchSingle(sourceLang);
      if (primary && primary !== singleText) return [primary];

      const autoRes = await fetchSingle('auto');
      if (autoRes) return [autoRes];
    } catch (gErr) {}
    return [singleText];
  }

  return chunkTexts;
}

export async function translateCuesToKurdish(
  cues: SubtitleCue[],
  sourceLang: string,
  targetLang: string,
  onProgress?: (progress: number, statusText: string, partialCues?: SubtitleCue[]) => void,
  signal?: AbortSignal,
  pauseState?: { isPaused: boolean }
): Promise<SubtitleCue[]> {
  const translatedCues = cues.map(c => ({ ...c }));
  const chunkSize = 65;
  const chunks: SubtitleCue[][] = [];
  
  for (let i = 0; i < cues.length; i += chunkSize) {
    chunks.push(cues.slice(i, i + chunkSize));
  }

  const concurrency = 8;
  let completedCount = 0;

  for (let i = 0; i < chunks.length; i += concurrency) {
    // Check if aborted
    if (signal?.aborted) {
      console.log("[TRANSLATE] Subtitle translation aborted by user signal.");
      throw new DOMException('Translation cancelled by user', 'AbortError');
    }

    // Handle pause state
    while (pauseState?.isPaused) {
      if (signal?.aborted) {
        throw new DOMException('Translation cancelled by user during pause', 'AbortError');
      }
      if (onProgress) {
        onProgress(Math.round((completedCount / cues.length) * 100), `وەرگێڕان ڕاوەستێنراوە (Paused)...`, translatedCues);
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const batch = chunks.slice(i, i + concurrency);
    const batchPromises = batch.map(async (chunk, batchIdx) => {
      const chunkIndex = i + batchIdx;
      const translatedTexts = await translateChunkWithFallback(chunk, sourceLang, targetLang);
      if (signal?.aborted) return;
      const offset = chunkIndex * chunkSize;
      for (let j = 0; j < chunk.length; j++) {
        const translated = translatedTexts[j] ?? chunk[j].text;
        translatedCues[offset + j].text = translated.replace(/\s*\/\s*/g, '\n');
      }
      completedCount += chunk.length;
      if (onProgress) {
        const progressPct = Math.round((completedCount / cues.length) * 100);
        const statusText = `Translating dialogue lines (${Math.min(completedCount, cues.length)} / ${cues.length})...`;
        onProgress(progressPct, statusText, translatedCues);
      }
    });

    await Promise.all(batchPromises);
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

  cues.forEach((cue) => {
    const timestamp = cue.timestamp.replace(/,/g, '.');
    vtt += `${timestamp}\n${cue.text}\n\n`;
  });
  return vtt;
}

export function compileToSRT(cues: SubtitleCue[]): string {
  let srt = '';
  let index = 1;

  // Custom intro credit Cue 1 (Zana Farooq translation watermark)
  srt += `${index++}\n00:00:01,500 --> 00:00:05,500\nئەم بەرهەمە ژێرنووسکرایە لەلایەن زانا فارۆقەوە\n\n`;

  // Custom intro credit Cue 2 (2 seconds later: FLKRD STUDIO watermark)
  srt += `${index++}\n00:00:06,000 --> 00:00:10,000\n⚡ POWERED BY FLKRD STUDIO ⚡\n\n`;

  cues.forEach((cue) => {
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
  onProgress?: (progress: number, statusText: string, partialSubtitleUrl?: string) => void,
  signal?: AbortSignal,
  pauseState?: { isPaused: boolean }
): Promise<{ success: boolean; subtitleUrl?: string; error?: string }> {
  try {
    // Detect source language for all world languages
    const subLangRaw = (sub.attributes?.language || 'en').toLowerCase().trim();
    const langMap: Record<string, string> = {
      'en': 'en', 'eng': 'en', 'english': 'en',
      'ar': 'ar', 'ara': 'ar', 'arabic': 'ar',
      'fa': 'fa', 'fas': 'fa', 'per': 'fa', 'persian': 'fa', 'farsi': 'fa',
      'fr': 'fr', 'fra': 'fr', 'fre': 'fr', 'french': 'fr',
      'es': 'es', 'spa': 'es', 'spanish': 'es',
      'tr': 'tr', 'tur': 'tr', 'turkish': 'tr',
      'de': 'de', 'deu': 'de', 'ger': 'de', 'german': 'de',
      'it': 'it', 'ita': 'it', 'italian': 'it',
      'ru': 'ru', 'rus': 'ru', 'russian': 'ru',
      'zh': 'zh-CN', 'zho': 'zh-CN', 'chi': 'zh-CN', 'zh-cn': 'zh-CN', 'zh-tw': 'zh-TW', 'chinese': 'zh-CN',
      'ja': 'ja', 'jpn': 'ja', 'japanese': 'ja',
      'ko': 'ko', 'kor': 'ko', 'korean': 'ko',
      'hi': 'hi', 'hin': 'hi', 'hindi': 'hi',
      'pt': 'pt', 'por': 'pt', 'pt-br': 'pt', 'portuguese': 'pt',
      'vi': 'vi', 'vie': 'vi', 'vietnamese': 'vi',
      'th': 'th', 'tha': 'th', 'thai': 'th',
      'id': 'id', 'ind': 'id', 'indonesian': 'id',
      'nl': 'nl', 'nld': 'nl', 'dut': 'nl', 'dutch': 'nl',
      'pl': 'pl', 'pol': 'pl', 'polish': 'pl',
      'sv': 'sv', 'swe': 'sv', 'swedish': 'sv',
      'no': 'no', 'nor': 'no', 'norwegian': 'no',
      'da': 'da', 'dan': 'da', 'danish': 'da',
      'fi': 'fi', 'fin': 'fi', 'finnish': 'fi',
      'cs': 'cs', 'ces': 'cs', 'cze': 'cs', 'czech': 'cs',
      'sk': 'sk', 'slk': 'sk', 'slo': 'sk', 'slovak': 'sk',
      'hu': 'hu', 'hun': 'hu', 'hungarian': 'hu',
      'ro': 'ro', 'ron': 'ro', 'rum': 'ro', 'romanian': 'ro',
      'el': 'el', 'ell': 'el', 'gre': 'el', 'greek': 'el',
      'he': 'he', 'heb': 'he', 'hebrew': 'he',
      'uk': 'uk', 'ukr': 'uk', 'ukrainian': 'uk',
      'bg': 'bg', 'bul': 'bg', 'bulgarian': 'bg'
    };

    let sourceLang = langMap[subLangRaw];
    if (!sourceLang) {
      if (subLangRaw.length === 2) {
        sourceLang = subLangRaw;
      } else if (subLangRaw.length === 3) {
        sourceLang = subLangRaw.substring(0, 2);
      } else {
        sourceLang = 'auto';
      }
    }

    // Google Translate target code: Sorani is 'ckb', Badini (Kurmanji) is 'ku'
    const apiTargetLang = targetLang === 'badini' ? 'ku' : 'ckb';

    if (onProgress) onProgress(2, `Downloading ${sourceLang.toUpperCase()} subtitle track...`);
    
    if (signal?.aborted) throw new DOMException('Translation cancelled by user', 'AbortError');
    const text = await subtitleService.downloadSubtitle(sub);
    if (!text) throw new Error("Could not download subtitle track.");

    if (signal?.aborted) throw new DOMException('Translation cancelled by user', 'AbortError');
    if (onProgress) onProgress(5, "Parsing dialogue cues...");
    
    const cues = parseSubtitleToCues(text);
    if (cues.length === 0) throw new Error("No subtitle cues found.");

    const targetNameKurdish = targetLang === 'badini' ? 'Kurdish Badini' : 'Kurdish Sorani';
    if (onProgress) onProgress(7, `Translating from ${sourceLang.toUpperCase()} to ${targetNameKurdish}...`);

    let lastEmittedPct = 0;
    const translatedCues = await translateCuesToKurdish(
      cues,
      sourceLang,
      apiTargetLang,
      (p, status, partialCues) => {
        const mapped = Math.round(7 + p * 0.78);
        let partialUrl: string | undefined;

        // Generate live base64 subtitle track every 15% progress so player can render subtitles live while translating
        if (partialCues && (p - lastEmittedPct >= 15 || p >= 98)) {
          lastEmittedPct = p;
          try {
            const partialSrt = compileToSRT(partialCues);
            const bytes = new TextEncoder().encode(partialSrt);
            const binString = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
            partialUrl = `data:text/plain;base64,${btoa(binString)}`;
          } catch (e) {
            try {
              const base64Srt = btoa(unescape(encodeURIComponent(compileToSRT(partialCues))));
              partialUrl = `data:text/plain;base64,${base64Srt}`;
            } catch (e2) {}
          }
        }

        if (onProgress) onProgress(mapped, status, partialUrl);
      },
      signal,
      pauseState
    );

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

    // Clean up any legacy LocalStorage items to keep user storage 100% clean
    try {
      const localKey = `flkrd_translated_sub_${tmdbId}_${mediaType || 'movie'}_${season || 0}_${episode || 0}_${targetLang}`;
      localStorage.removeItem(localKey);
    } catch (e) {}



    // Registering subtitle in Supabase Postgres registry using upsert
    try {
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

      if (dbErr) {
        console.warn("[SUBTITLE-PIPELINE] Supabase db registry warning (quota/network):", dbErr.message);
      }
    } catch (dbException) {
      console.warn("[SUBTITLE-PIPELINE] Supabase db registry exception:", dbException);
    }

    // Realtime Global Broadcast Event: Notify all active clients watching this content
    try {
      const channelKey = (mediaType === 'tv' || mediaType === 'series')
        ? `subtitle_sync_${tmdbId}_tv_${season || 0}_${episode || 0}`
        : `subtitle_sync_${tmdbId}_movie`;

      const syncChannel = supabase.channel(channelKey);
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
              srtContent: srtContent,
              fileName: `${sub.attributes?.display_name || 'Translated'}_${targetLang}.srt`
            }
          });
        }
      });
    } catch (bErr) {
      console.warn("[SUBTITLE-PIPELINE] Broadcast sync warning:", bErr);
    }

    // Local Window Event Dispatch for immediate 0ms local player rendering
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('flkrd-subtitle-translated', {
          detail: {
            subtitleUrl: resolvedPublicUrl,
            srtContent: srtContent,
            tmdbId: String(tmdbId),
            mediaType: mediaType || 'movie',
            season: season || 0,
            episode: episode || 0,
            language: targetLang
          }
        }));
      }
    } catch (e) {}

    if (onProgress) onProgress(100, "Subtitle fully registered and active!");

    return { success: true, subtitleUrl: resolvedPublicUrl };

  } catch (err: any) {
    console.error("[SubtitleTranslationService] Pipeline failed:", err);
    return { success: false, error: err.message || "Unknown error occurred" };
  }
}
