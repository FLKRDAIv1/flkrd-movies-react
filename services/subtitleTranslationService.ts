import { supabase } from '../utils/supabaseClient';
import { subtitleService } from './subtitleService';

const LINGVA_INSTANCES = [
  "https://lingva.ml",
  "https://translate.plausibility.cloud",
  "https://lingva.garudalinux.org",
  "https://lingva.lunar.icu",
  "https://lingva.recepty.it"
];

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
        const textContent = lines.slice(timeIndex + 1).join('\n').trim();
        if (textContent) {
          cues.push({ index, timestamp, text: textContent });
        }
      }
    }
  }
  return cues;
}

async function translateText(text: string, source: string = 'en', target: string = 'ckb'): Promise<string> {
  let lastError: Error | null = null;
  
  // 1. Invoke the deployed Supabase Edge Function (highly secure backend call, hides GAS URL, bypasses CORS completely)
  try {
    const { data, error } = await supabase.functions.invoke('translate', {
      body: { text, source, target }
    });
    
    if (error) throw error;
    if (data && data.translation) {
      return data.translation;
    }
  } catch (err: any) {
    console.warn(`[SubtitleTranslationService] Supabase Edge Function failed, running Vercel fallback:`, err.message);
    lastError = err;
  }

  // 2. Call Vercel serverless function /api/translate as fallback (also executes on backend)
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text, source, target })
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.translation) {
        return data.translation;
      }
    }
  } catch (err: any) {
    console.warn(`[SubtitleTranslationService] Vercel Serverless fallback failed, running browser fallbacks:`, err.message);
    lastError = err;
  }

  // 3. Browser Fallback: Try MyMemory API (Native CORS)
  try {
    const mymymoryTarget = target === 'ckb' ? 'ku' : target;
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${mymymoryTarget}`;
    const response = await fetch(myMemoryUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
      }
    }
  } catch (err: any) {
    console.warn(`[SubtitleTranslationService] MyMemory API fallback failed:`, err.message);
    lastError = err;
  }

  // 4. Last resort: Try Lingva POST via CORS proxies
  for (const instance of LINGVA_INSTANCES) {
    const targetUrl = `${instance}/api/v1/${source}/${target}`;
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
    ];

    for (const proxyUrl of proxies) {
      try {
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ text })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.translation) {
            return data.translation;
          }
        }
      } catch (err: any) {
        console.warn(`[SubtitleTranslationService] Last resort proxy POST failed for ${instance}:`, err.message);
        lastError = err;
      }
    }
  }
  
  throw lastError || new Error("All translation routes failed");
}

/**
 * Translates an array of subtitle cues to Kurdish Sorani.
 */
export async function translateCuesToKurdish(
  cues: SubtitleCue[],
  onProgress?: (progress: number) => void
): Promise<SubtitleCue[]> {
  const translatedCues = [...cues];
  const chunkSize = 20; // Safe and fast chunk size for line translation
  
  for (let i = 0; i < cues.length; i += chunkSize) {
    const chunk = cues.slice(i, i + chunkSize);
    // Replace internal newlines in each cue text with a slash to avoid breaking translation separators
    const chunkTexts = chunk.map(c => c.text.replace(/\n/g, ' / '));
    
    // Join using newline "\n" as separator
    const combinedText = chunkTexts.join('\n');
    
    let translatedTexts: string[] = [];
    try {
      const translation = await translateText(combinedText);
      // Split by newline
      translatedTexts = translation.split('\n');
      
      if (translatedTexts.length !== chunkTexts.length) {
        throw new Error(`Line count mismatch: expected ${chunkTexts.length}, got ${translatedTexts.length}.`);
      }
    } catch (err: any) {
      console.warn(`[SubtitleTranslationService] Chunk translation failed. Falling back to line-by-line:`, err.message);
      
      translatedTexts = [];
      for (const text of chunkTexts) {
        try {
          const singleTranslation = await translateText(text);
          translatedTexts.push(singleTranslation.trim());
        } catch (e) {
          translatedTexts.push(text); // Fallback to original
        }
        await new Promise(resolve => setTimeout(resolve, 80));
      }
    }

    // Apply translations and restore internal newlines
    for (let j = 0; j < chunk.length; j++) {
      const translatedText = translatedTexts[j] || chunk[j].text;
      translatedCues[i + j].text = translatedText.replace(/\s*\/\s*/g, '\n');
    }

    if (onProgress) {
      onProgress(Math.round(((i + chunk.length) / cues.length) * 100));
    }
    
    await new Promise(resolve => setTimeout(resolve, 150)); // Breather
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
  vtt += `1\n00:00:01.000 --> 00:00:04.000\nژێرنووسکراوە لەلایەن زانا فارۆقەوە\n\n`;
  vtt += `2\n00:00:04.500 --> 00:00:07.500\nPowered by FLKRD STUDIO\n\n`;

  // Filter out original cues starting in the first 7.5s to prevent overlaps
  const filteredCues = cues.filter(cue => timestampToSeconds(cue.timestamp) >= 7.5);

  filteredCues.forEach((cue, index) => {
    // Ensure timestamp uses dot instead of comma for VTT
    const timestamp = cue.timestamp.replace(/,/g, '.');
    vtt += `${index + 3}\n${timestamp}\n${cue.text}\n\n`;
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
