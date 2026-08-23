import { supabase } from '../utils/supabaseClient';
import { subtitleService } from './subtitleService';

export interface SubtitleCue {
  index: string;
  timestamp: string;
  text: string;
}

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#10;/g, '\n')
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

/**
 * Parses subtitle text into structured dialogue cues.
 * Supports VTT and SRT.
 */
export function cleanPersianToKurdish(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
  let cleaned = decodeHtmlEntities(text);

  const replacements: [RegExp, string][] = [
    // --- Present-habitual verbs (می + verb stem) ---
    [/\bشروع کرد\b/g, 'دەستی پێکرد'],
    [/\bشروع می کند\b/g, 'دەست پێدەکات'],
    [/\bشروع می‌کند\b/g, 'دەست پێدەکات'],
    [/\bشروع به\b/g, 'دەست بە'],
    [/\bشروع\b/g, 'دەستپێک'],
    [/\bغرش کردن\b/g, 'نەڕاندن'],
    [/\bغرش\b/g, 'نەڕە'],
    [/\bلرزیدن\b/g, 'لەرزین'],
    [/\bمی کند\b/g, 'دەکات'],
    [/\bمی‌کند\b/g, 'دەکات'],
    [/\bمی کنم\b/g, 'دەکەم'],
    [/\bمی‌کنم\b/g, 'دەکەم'],
    [/\bمی کنیم\b/g, 'دەکەین'],
    [/\bمی‌کنیم\b/g, 'دەکەین'],
    [/\bمی کنند\b/g, 'دەکەن'],
    [/\bمی‌کنند\b/g, 'دەکەن'],
    [/\bمی شود\b/g, 'دەبێت'],
    [/\bمی‌شود\b/g, 'دەبێت'],
    [/\bمی گوید\b/g, 'دەڵێت'],
    [/\bمی‌گوید\b/g, 'دەڵێت'],
    [/\bمی داند\b/g, 'دەزانێت'],
    [/\bمی‌داند\b/g, 'دەزانێت'],
    [/\bمی بیند\b/g, 'دەبینێت'],
    [/\bمی‌بیند\b/g, 'دەبینێت'],
    [/\bمی تواند\b/g, 'دەتوانێت'],
    [/\bمی‌تواند\b/g, 'دەتوانێت'],
    [/\bمی آید\b/g, 'دێت'],
    [/\bمی‌آید\b/g, 'دێت'],
    [/\bمی رود\b/g, 'دەچێت'],
    [/\bمی‌رود\b/g, 'دەچێت'],
    // --- Negative present (نمی + verb stem) ---
    [/\bنمی\u200Cکند\b/g, 'ناکات'],
    [/\bنمی کند\b/g, 'ناکات'],
    [/\bنمی\u200Cکنم\b/g, 'ناکەم'],
    [/\bنمی کنم\b/g, 'ناکەم'],
    [/\bنمی\u200Cکنیم\b/g, 'ناکەین'],
    [/\bنمی کنیم\b/g, 'ناکەین'],
    [/\bنمی\u200Cکنند\b/g, 'ناکەن'],
    [/\bنمی کنند\b/g, 'ناکەن'],
    [/\bنمی\u200Cشود\b/g, 'نابێت'],
    [/\bنمی شود\b/g, 'نابێت'],
    [/\bنمی\u200Cتوانم\b/g, 'ناتوانم'],
    [/\bنمی توانم\b/g, 'ناتوانم'],
    [/\bنمی\u200Cخواهم\b/g, 'نامەوێت'],
    [/\bنمی خواهم\b/g, 'نامەوێت'],
    [/\bنمی\u200Cدانم\b/g, 'نازانم'],
    [/\bنمی دانم\b/g, 'نازانم'],
    [/\bنمی\u200Cبینم\b/g, 'نابینم'],
    [/\bنمی بینم\b/g, 'نابینم'],
    [/\bنمی\u200Cتواند\b/g, 'ناتوانێت'],
    [/\bنمی تواند\b/g, 'ناتوانێت'],
    [/\bنمی\u200Cآید\b/g, 'نایێت'],
    [/\bنمی آید\b/g, 'نایێت'],
    [/\bنمی\u200Cرود\b/g, 'نایچێت'],
    [/\bنمی رود\b/g, 'نایچێت'],
    // --- Future tense (خواهد + verb stem) ---
    [/\bخواهد کرد\b/g, 'دەکات'],
    [/\bخواهد شد\b/g, 'دەبێت'],
    [/\bخواهد رفت\b/g, 'دەچێت'],
    [/\bخواهد آمد\b/g, 'دێت'],
    [/\bخواهم کرد\b/g, 'دەکەم'],
    [/\bخواهی کرد\b/g, 'دەکەیت'],
    // --- Past habitual verbs (می + past stem) ---
    [/\bمی\u200Cرفتم\b/g, 'چووم'],
    [/\bمی رفتم\b/g, 'چووم'],
    [/\bرفتم\b/g, 'چووم'],
    [/\bمی\u200Cآمدم\b/g, 'هاتم'],
    [/\bمی آمدم\b/g, 'هاتم'],
    [/\bآمدم\b/g, 'هاتم'],
    [/\bمی\u200Cدیدم\b/g, 'بینیم'],
    [/\bمی دیدم\b/g, 'بینیم'],
    [/\bدیدم\b/g, 'بینیم'],
    [/\bمی\u200Cگفتم\b/g, 'وتم'],
    [/\bمی گفتم\b/g, 'وتم'],
    [/\bگفتم\b/g, 'وتم'],
    [/\bمی\u200Cخوردم\b/g, 'خواردم'],
    [/\bمی خوردم\b/g, 'خواردم'],
    [/\bمی\u200Cنشستم\b/g, 'نیشتم'],
    [/\bمی نشستم\b/g, 'نیشتم'],
    [/\bمی\u200Cخوابیدم\b/g, 'خەوتم'],
    [/\bمی خوابیدم\b/g, 'خەوتم'],
    [/\bمی\u200Cایستادم\b/g, 'وەستام'],
    [/\bمی ایستادم\b/g, 'وەستام'],
    [/\bمی\u200Cدویدم\b/g, 'ڕامکرد'],
    [/\bمی دویدم\b/g, 'ڕامکرد'],
    // --- Modal / auxiliary ---
    [/\bباید\b/g, 'دەبێت'],
    // --- Interrogative & common function words ---
    [/\bچرا\b/g, 'بۆچی'],
    [/\bچگونه\b/g, 'چۆن'],
    [/\bکجا\b/g, 'لەکوێ'],
    [/\bهنگام\b/g, 'کاتێک'],
    [/\bتا\b/g, 'هەتا'],
    [/\bاز\b/g, 'لە'],
    [/\bبه\b/g, 'بە'],
    [/\bهمچنین\b/g, 'هەروەها'],
    [/\bچه\b/g, 'چی'],
    // --- Intensifiers & adjectives ---
    [/\bبسیار\b/g, 'زۆر'],
    [/\bخیلی\b/g, 'زۆر'],
    [/\bخوب\b/g, 'باش'],
    [/\bبد\b/g, 'خراپ'],
    // --- Affirmation / negation ---
    [/\bبله\b/g, 'بەڵێ'],
    [/\bنه\b/g, 'نەخێر'],
    // --- Demonstratives & conjunctions (existing) ---
    [/\bبرای\b/g, 'بۆ'],
    [/\bاگر\b/g, 'ئەگەر'],
    [/\bاین\b/g, 'ئەم'],
    [/\bآن\b/g, 'ئەو']
  ];

  for (const [pattern, replacement] of replacements) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  return cleaned;
}

export function stripAllHtmlTags(text: string, targetLang?: string): string {
  if (!text) return '';
  const stripped = text
    .replace(/<[^>]*>?/g, '')
    .replace(/><font/gi, '')
    .replace(/<font/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .trim();

  const isKurdishTarget = targetLang ? ['ckb', 'ku', 'badini', 'sorani'].includes(targetLang) : false;
  return isKurdishTarget ? cleanPersianToKurdish(stripped) : stripped;
}

export function parseSubtitleToCues(text: string, targetLang?: string): SubtitleCue[] {
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
        const textContent = stripAllHtmlTags(filteredLines.join('\n').trim(), targetLang);
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
 * Direct Google Apps Script translator (ultra-fast serverless macro with auto-redirect resolution)
 */
async function translateWithGoogleAppsScript(chunkItems: string[], src: string, tgt: string): Promise<string[] | null> {
  if (!chunkItems || chunkItems.length === 0) return null;
  const gasEndpoints = [
    'https://script.google.com/macros/s/AKfycbzCTsm3ez5RPANs8NbrGRZxeWN1XNGUy8IBM1wie_zDEygekQoY6GXvuJu7oyFxW48v8w/exec',
    'https://script.google.com/macros/s/AKfycbwBTWzXzyNxSe51K5MfzYYAdOxkLjYZobb3XULgZMHJE8r_hofMfo8DpmT7hbzFASyC/exec'
  ];
  const effectiveSrc = (src && src !== 'auto') ? src : 'auto';
  const effectiveTgt = (tgt === 'ku' || tgt === 'ckb' || tgt === 'sorani') ? 'ckb' : (tgt === 'badini' ? 'ku' : tgt);
  const isKurdishTarget = ['ckb', 'ku', 'badini', 'sorani'].includes(tgt);

  for (const gasUrl of gasEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const res = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          texts: chunkItems,
          text: chunkItems,
          source: effectiveSrc,
          target: effectiveTgt
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const rawTranslations = data?.translations || data?.translation || (Array.isArray(data) ? data : null);
        if (Array.isArray(rawTranslations) && rawTranslations.length === chunkItems.length) {
          return rawTranslations.map((item: string, idx: number) => {
            const cleaned = (item || '').trim();
            return (isKurdishTarget ? cleanPersianToKurdish(cleaned) : cleaned) || chunkItems[idx];
          });
        }
      }
    } catch (gasErr) {
      // Continue to next endpoint
    }
  }
  return null;
}

/**
 * Direct client-side Google GTX GET array translator (ultra-fast, direct browser-to-engine with zero CORS lag)
 */
async function translateArrayDirectClient(chunkItems: string[], src: string, tgt: string): Promise<string[] | null> {
  if (!chunkItems || chunkItems.length === 0) return null;
  const effectiveSrc = (src && src !== 'auto') ? src : 'auto';
  const effectiveTgt = (tgt === 'badini' || tgt === 'kmr') ? 'ku' : (tgt === 'ckb' || tgt === 'sorani' || tgt === 'ku') ? 'ckb' : tgt;
  const isKurdishTarget = ['ckb', 'ku', 'badini', 'sorani'].includes(tgt);

  // 1. Try Delimiter-Based single-string fetch (Translates all cues in a chunk in ONE ultra-fast 120ms request)
  try {
    const delimiter = '\n\n:::FLKRD_CUE:::\n\n';
    const joined = chunkItems.map(t => (t || '').replace(/\r\n/g, ' ').replace(/\n/g, ' ')).join(delimiter);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(effectiveSrc)}&tl=${encodeURIComponent(effectiveTgt)}&dt=t&q=${encodeURIComponent(joined)}`;
    
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data && data[0] && Array.isArray(data[0])) {
        const transStr = data[0].map((x: any) => (Array.isArray(x) ? (x[0] || '') : '')).join('');
        if (transStr) {
          const splitRes = transStr.split(/[\r\n]*:::FLKRD_CUE:::[\r\n]*/);
          if (splitRes.length === chunkItems.length) {
            return splitRes.map((item, idx) => {
              const cleaned = item.trim();
              return (isKurdishTarget ? cleanPersianToKurdish(cleaned) : cleaned) || chunkItems[idx];
            });
          }
        }
      }
    }
  } catch (e) {}

  // 2. Fallback to individual items in small concurrent batches
  try {
    const BATCH_SIZE = 5;
    const results: string[] = [];

    for (let i = 0; i < chunkItems.length; i += BATCH_SIZE) {
      const batch = chunkItems.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (item) => {
        if (!item || !item.trim()) return item || '';
        try {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(effectiveSrc)}&tl=${encodeURIComponent(effectiveTgt)}&dt=t&q=${encodeURIComponent(item)}`;
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 3000);
          const res = await fetch(url, { signal: ctrl.signal });
          clearTimeout(t);
          if (res.ok) {
            const data = await res.json();
            if (data && data[0] && Array.isArray(data[0])) {
              const trans = data[0].map((x: any) => (Array.isArray(x) ? (x[0] || '') : '')).join('').trim();
              if (trans) return isKurdishTarget ? cleanPersianToKurdish(trans) : trans;
            }
          }
        } catch (e) {}
        return item;
      });

      const translatedBatch = await Promise.all(batchPromises);
      results.push(...translatedBatch);
    }

    if (results.length === chunkItems.length) {
      return results;
    }
  } catch (e) {}
  return null;
}

/**
 * Translates an array of text strings with multi-tier fast failover.
 */
async function translateText(text: string[], sourceLang: string, targetLang: string): Promise<string[]> {
  const effectiveTgt = (targetLang === 'badini' || targetLang === 'kmr') ? 'ku' : (targetLang === 'ckb' || targetLang === 'sorani' || targetLang === 'ku') ? 'ckb' : targetLang;

  // Tier 1: Serverless proxy endpoint (Powered by zero-429 Google Mobile translation for 100% authentic Kurdish Sorani)
  const currentBase = getApiBaseUrl();
  const endpoints = Array.from(new Set([
    `${currentBase}/api/translate`,
    'https://fkurd.pro/api/translate'
  ])).filter(Boolean);

  for (const endpoint of endpoints) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, source: sourceLang, target: effectiveTgt }),
        signal: ctrl.signal
      });
      clearTimeout(t);

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.translation) && data.translation.length === text.length) {
          const validCount = data.translation.filter((t: string, i: number) => t && t.trim() && t !== text[i]).length;
          if (validCount > 0) {
            return data.translation.map((s: string) => decodeHtmlEntities(s));
          }
        }
      }
    } catch (err: any) {}
  }

  // Tier 2: Ultra-fast client-side GTX
  const clientDirect = await translateArrayDirectClient(text, sourceLang, effectiveTgt);
  if (clientDirect && Array.isArray(clientDirect) && clientDirect.length === text.length) {
    return clientDirect.map((s: string) => decodeHtmlEntities(s));
  }

  // Tier 3: Direct Google Apps Script
  const gasDirect = await translateWithGoogleAppsScript(text, sourceLang, effectiveTgt);
  if (gasDirect && Array.isArray(gasDirect) && gasDirect.length === text.length) {
    return gasDirect.map((s: string) => decodeHtmlEntities(s));
  }

  return text;
}

/**
 * Translates an array of subtitle cues batch recursively if line mismatch occurs.
 */
async function translateChunkWithFallback(chunk: SubtitleCue[], sourceLang: string, targetLang: string): Promise<string[]> {
  const chunkTexts = chunk.map(c => c.text);
  const effectiveTgt = (targetLang === 'badini' || targetLang === 'kmr') ? 'ku' : (targetLang === 'ckb' || targetLang === 'sorani' || targetLang === 'ku') ? 'ckb' : targetLang;

  try {
    const translatedTexts = await translateText(chunkTexts, sourceLang, effectiveTgt);
    if (Array.isArray(translatedTexts) && translatedTexts.length === chunk.length) {
      return translatedTexts;
    }
  } catch (err) {}

  if (chunk.length > 1) {
    const mid = Math.floor(chunk.length / 2);
    const left = chunk.slice(0, mid);
    const right = chunk.slice(mid);

    const [leftRes, rightRes] = await Promise.all([
      translateChunkWithFallback(left, sourceLang, effectiveTgt),
      translateChunkWithFallback(right, sourceLang, effectiveTgt)
    ]);
    return [...leftRes, ...rightRes];
  }

  if (chunk.length === 1) {
    const singleText = chunk[0].text;
    try {
      const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sourceLang)}&tl=${encodeURIComponent(effectiveTgt)}&dt=t&q=${encodeURIComponent(singleText)}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch(gtxUrl, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data && data[0]) {
          const trans = data[0].map((x: any) => x[0]).join('');
          if (trans && trans.trim()) return [trans];
        }
      }
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
  const chunkSize = 15;
  const chunks: SubtitleCue[][] = [];
  
  for (let i = 0; i < cues.length; i += chunkSize) {
    chunks.push(cues.slice(i, i + chunkSize));
  }

  const concurrency = 6;
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
        const percent = Math.round((completedCount / cues.length) * 100);
        onProgress(percent, `وەرگێڕان ڕاوەستێنراوە (Paused)...`, translatedCues);
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const batch = chunks.slice(i, i + concurrency);
    const batchPromises = batch.map(async (chunk, batchIdx) => {
      const chunkIndex = i + batchIdx;
      const translatedTexts = await translateChunkWithFallback(chunk, sourceLang, targetLang);
      if (signal?.aborted) return;
      
      const isKurdishTarget = ['ckb', 'ku', 'badini', 'sorani'].includes(targetLang);
      const offset = chunkIndex * chunkSize;
      for (let j = 0; j < chunk.length; j++) {
        const rawTrans = translatedTexts[j] ?? chunk[j].text;
        const cleanedText = rawTrans.replace(/\s*\/\s*/g, '\n');
        translatedCues[offset + j].text = isKurdishTarget ? cleanPersianToKurdish(cleanedText) : cleanedText;
      }
      
      completedCount += chunk.length;
      if (onProgress) {
        const percent = Math.min(100, Math.round((completedCount / cues.length) * 100));
        const statusText = `Translating dialogue lines (${Math.min(completedCount, cues.length)} / ${cues.length})...`;
        onProgress(percent, statusText, translatedCues);
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
  targetLang: string = 'ku',
  onProgress?: (progress: number, statusText: string, partialSubtitleUrl?: string) => void,
  signal?: AbortSignal,
  pauseState?: { isPaused: boolean }
): Promise<{ success: boolean; subtitleUrl?: string; error?: string }> {
  try {
    // Detect source language for all world languages from sub.lang, sub.label, or sub.attributes
    const rawLangStr = (sub.lang || sub.label || sub.attributes?.language || 'auto').toLowerCase().trim();
    const langMap: Record<string, string> = {
      'arabic': 'ar', 'ara': 'ar', 'ar': 'ar',
      'english': 'en', 'eng': 'en', 'en': 'en',
      'persian': 'fa', 'farsi': 'fa', 'per': 'fa', 'fas': 'fa', 'fa': 'fa',
      'french': 'fr', 'fra': 'fr', 'fre': 'fr', 'fr': 'fr',
      'spanish': 'es', 'spa': 'es', 'es': 'es',
      'turkish': 'tr', 'tur': 'tr', 'tr': 'tr',
      'german': 'de', 'ger': 'de', 'deu': 'de', 'de': 'de',
      'italian': 'it', 'ita': 'it', 'it': 'it',
      'russian': 'ru', 'rus': 'ru', 'ru': 'ru',
      'chinese': 'zh-CN', 'chi': 'zh-CN', 'zho': 'zh-CN', 'zh': 'zh-CN',
      'japanese': 'ja', 'jpn': 'ja', 'ja': 'ja',
      'korean': 'ko', 'kor': 'ko', 'ko': 'ko',
      'hindi': 'hi', 'hin': 'hi', 'hi': 'hi',
      'portuguese': 'pt', 'por': 'pt', 'pt': 'pt',
      'vietnamese': 'vi', 'vie': 'vi', 'vi': 'vi',
      'thai': 'th', 'tha': 'th', 'th': 'th',
      'indonesian': 'id', 'ind': 'id', 'id': 'id',
      'dutch': 'nl', 'nld': 'nl', 'dut': 'nl', 'nl': 'nl',
      'polish': 'pl', 'pol': 'pl', 'pl': 'pl',
      'swedish': 'sv', 'swe': 'sv', 'sv': 'sv',
      'norwegian': 'no', 'nor': 'no', 'no': 'no',
      'danish': 'da', 'dan': 'da', 'da': 'da',
      'finnish': 'fi', 'fin': 'fi', 'fi': 'fi',
      'czech': 'cs', 'ces': 'cs', 'cze': 'cs', 'cs': 'cs',
      'slovak': 'sk', 'slk': 'sk', 'slo': 'sk', 'sk': 'sk',
      'hungarian': 'hu', 'hun': 'hu', 'hu': 'hu',
      'romanian': 'ro', 'ron': 'ro', 'rum': 'ro', 'ro': 'ro',
      'greek': 'el', 'ell': 'el', 'gre': 'el', 'el': 'el',
      'hebrew': 'he', 'heb': 'he', 'he': 'he',
      'ukrainian': 'uk', 'ukr': 'uk', 'uk': 'uk',
      'bulgarian': 'bg', 'bul': 'bg', 'bg': 'bg'
    };

    let sourceLang = 'auto';
    for (const [key, val] of Object.entries(langMap)) {
      if (rawLangStr === key || rawLangStr.startsWith(key) || rawLangStr.includes(` ${key}`) || rawLangStr.includes(`${key} `)) {
        sourceLang = val;
        break;
      }
    }

    // Google Translate target code: Sorani is 'ckb', Badini (Kurmanji) is 'ku', pass-through any other language
    const apiTargetLang =
      targetLang === 'badini' ? 'ku' :
      (targetLang === 'ku' || targetLang === 'ckb' || targetLang === 'sorani') ? 'ckb' :
      targetLang;

    if (onProgress) onProgress(2, `Downloading ${sourceLang.toUpperCase()} subtitle track...`);
    
    if (signal?.aborted) throw new DOMException('Translation cancelled by user', 'AbortError');
    const text = await subtitleService.downloadSubtitle(sub);
    if (!text) throw new Error("Could not download subtitle track.");

    if (signal?.aborted) throw new DOMException('Translation cancelled by user', 'AbortError');
    if (onProgress) onProgress(5, "Parsing dialogue cues...");
    
    const cues = parseSubtitleToCues(text, apiTargetLang);
    if (cues.length === 0) throw new Error("No subtitle cues found.");

    const targetName =
      targetLang === 'badini' ? 'Kurdish Badini' :
      targetLang === 'ku' || targetLang === 'ckb' ? 'Kurdish Sorani' :
      targetLang.toUpperCase();

    if (onProgress) onProgress(7, `Translating from ${sourceLang.toUpperCase()} to ${targetName}...`);

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
    // Yield to the event loop so the 86% UI frame paints before synchronous SRT build.
    await new Promise(r => setTimeout(r, 0));

    const srtContent = compileToSRT(translatedCues);
    const blob = new Blob([srtContent], { type: 'text/plain' });

    if (onProgress) onProgress(88, "Preparing subtitle file for upload...");
    // Yield before the network upload so the 88% frame paints.
    await new Promise(r => setTimeout(r, 0));

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

      if (onProgress) onProgress(92, "Upload complete, registering in database...");
      // Yield so the 92% frame paints before the Postgres upsert.
      await new Promise(r => setTimeout(r, 0));

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
      if (onProgress) onProgress(90, "Storage upload failed, using high-reliability base64 fallback...");
      await new Promise(r => setTimeout(r, 0));
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
    if (onProgress) onProgress(97, "Broadcasting to all connected viewers...");
    // Yield so the 97% frame paints before Supabase Realtime subscription overhead.
    await new Promise(r => setTimeout(r, 0));
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
            language: targetLang,
            progress: 100,
            isFinal: true
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
