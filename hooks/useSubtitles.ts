// hooks/useSubtitles.ts
// Custom React Hook for fetching, parsing, and syncing SRT/VTT subtitles with time offset control

import { useState, useEffect, useCallback } from 'react';

export interface SubtitleCue {
  id: number;
  startMs: number;
  endMs: number;
  text: string;
}

interface UseSubtitlesOptions {
  subtitleUrl?: string;
  mediaId?: string | number;
  initialOffsetMs?: number;
  proxyEndpoint?: string;
}

/**
 * Converts timestamp strings (00:01:23.456 or 00:01:23,456) into milliseconds
 */
export function parseTimestampToMs(timestamp: string): number {
  const clean = timestamp.trim().replace(',', '.');
  const parts = clean.split(':');

  let hours = 0;
  let minutes = 0;
  let secondsWithMs = '0';

  if (parts.length === 3) {
    hours = parseFloat(parts[0]);
    minutes = parseFloat(parts[1]);
    secondsWithMs = parts[2];
  } else if (parts.length === 2) {
    minutes = parseFloat(parts[0]);
    secondsWithMs = parts[1];
  } else {
    secondsWithMs = parts[0];
  }

  const secParts = secondsWithMs.split('.');
  const seconds = parseFloat(secParts[0] || '0');
  const msStr = (secParts[1] || '0').padEnd(3, '0').slice(0, 3);
  const milliseconds = parseFloat(msStr);

  return hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
}

/**
 * Parses SRT or WebVTT raw text into an array of SubtitleCue objects
 */
export function parseSubtitleText(rawText: string): SubtitleCue[] {
  if (!rawText) return [];

  // Strip BOM, directional RTL control codes, and normalize line endings
  const text = rawText
    .replace(/[\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const blocks = text.split(/\n\n+/);
  const cues: SubtitleCue[] = [];
  let cueId = 1;

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // Skip WEBVTT header line
    if (lines[0].toUpperCase().startsWith('WEBVTT')) continue;

    let timeLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIndex = i;
        break;
      }
    }

    if (timeLineIndex === -1) continue;

    const timeLine = lines[timeLineIndex];
    const [startStr, endStr] = timeLine.split('-->').map((s) => s.trim().split(' ')[0]);

    if (!startStr || !endStr) continue;

    const startMs = parseTimestampToMs(startStr);
    const endMs = parseTimestampToMs(endStr);
    const textLines = lines.slice(timeLineIndex + 1);

    // Strip HTML formatting tags (e.g., <i>, <b>, <font>)
    const cleanText = textLines
      .join('\n')
      .replace(/<[^>]*>/g, '')
      .trim();

    if (cleanText) {
      cues.push({
        id: cueId++,
        startMs,
        endMs,
        text: cleanText,
      });
    }
  }

  return cues;
}

export function useSubtitles({
  subtitleUrl,
  mediaId,
  initialOffsetMs = 0,
  proxyEndpoint = '/api/subtitle-proxy',
}: UseSubtitlesOptions) {
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const storageKey = subtitleUrl || mediaId ? `flkrd_sub_offset_${mediaId || encodeURIComponent(subtitleUrl || '')}` : null;

  const [timeOffsetMs, setTimeOffsetMsState] = useState<number>(() => {
    if (typeof window !== 'undefined' && storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) return parsed;
      }
    }
    return initialOffsetMs;
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if storageKey changes
  useEffect(() => {
    if (typeof window !== 'undefined' && storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) {
          setTimeOffsetMsState(parsed);
          return;
        }
      }
    }
    setTimeOffsetMsState(initialOffsetMs);
  }, [storageKey, initialOffsetMs]);

  const setTimeOffsetMs = useCallback((newOffset: number | ((prev: number) => number)) => {
    setTimeOffsetMsState((prev) => {
      const val = typeof newOffset === 'function' ? newOffset(prev) : newOffset;
      if (typeof window !== 'undefined' && storageKey) {
        localStorage.setItem(storageKey, String(val));
      }
      return val;
    });
  }, [storageKey]);

  // Fetch and parse subtitle via CORS Proxy
  useEffect(() => {
    if (!subtitleUrl) {
      setCues([]);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchUrl = subtitleUrl.startsWith('http')
      ? `${proxyEndpoint}?url=${encodeURIComponent(subtitleUrl)}`
      : subtitleUrl;

    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch subtitle`);
        return res.text();
      })
      .then((rawText) => {
        if (!isMounted) return;
        const parsed = parseSubtitleText(rawText);
        setCues(parsed);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('[useSubtitles] Proxy fetch error:', err);
        setError(err.message || 'Subtitle fetch failed');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [subtitleUrl, proxyEndpoint]);

  /**
   * Returns active cue for the given video playback timestamp (seconds) considering time offset
   */
  const getActiveCue = useCallback(
    (currentTimeSeconds: number): SubtitleCue | null => {
      if (cues.length === 0) return null;
      // Adjusted current time in ms (- offset: positive offset delays subtitles)
      const currentMs = currentTimeSeconds * 1000 - timeOffsetMs;
      return cues.find((c) => currentMs >= c.startMs && currentMs <= c.endMs) || null;
    },
    [cues, timeOffsetMs]
  );

  const adjustOffset = useCallback((deltaMs: number) => {
    setTimeOffsetMs((prev) => prev + deltaMs);
  }, [setTimeOffsetMs]);

  const resetOffset = useCallback(() => {
    setTimeOffsetMs(0);
  }, [setTimeOffsetMs]);

  return {
    cues,
    timeOffsetMs,
    setTimeOffsetMs,
    adjustOffset,
    resetOffset,
    getActiveCue,
    loading,
    error,
  };
}

export default useSubtitles;
