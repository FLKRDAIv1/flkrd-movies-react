
/**
 * OpenSubtitles API Service
 * Professional Subtitle Retrieval for FLKRD MOVIES
 */

// IMPORTANT: User must generate their own API key at https://www.opensubtitles.com/en/consumers
import { OPENSUBTITLES_API_KEY, SUBDL_API_KEY } from '../constants';
import JSZip from 'jszip';

/**
 * Resolve the base URL for API calls.
 * - In Tauri (DMG/desktop): window.location.protocol is 'tauri:',
 *   so relative paths like '/api/subtitle' resolve to tauri://localhost/api/subtitle (dead end).
 *   We must always use the absolute Vercel URL.
 * - In local dev (http://localhost): use relative paths (proxied by Vite).
 * - In production web (https://fkurd.pro): use empty string (relative paths work).
 */
const getSubApiBase = (): string => {
  if (typeof window === 'undefined') return 'https://fkurd.pro';
  const proto = window.location.protocol;
  // Tauri uses 'tauri:' protocol — always hit Vercel
  if (proto === 'tauri:' || (window as any).__TAURI_INTERNALS__) {
    return 'https://fkurd.pro';
  }
  // Local dev — relative path (served by local Vite with our middleware)
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.')
  ) {
    return '';
  }
  // Production web — use relative paths
  return '';
};

const USER_AGENT = 'flkrd_movies_v1';

export interface SubtitleResult {
    id: string;
    attributes: {
        language: string;
        display_name: string;
        url: string;
        file_id: number;
    };
}

export const subtitleService = {
    async fetchLatestKurdishMovies() {
        try {
            const baseUrl = getSubApiBase();
            const proxyUrl = `${baseUrl}/api/subtitle?languages=ku&order_by=download_count&order_direction=desc`;
            const proxyRes = await fetch(proxyUrl).catch(() => null);

            if (proxyRes && proxyRes.ok) {
                const data = await proxyRes.json();
                return data.data || [];
            }
            return [];
        } catch (err) {
            console.error("[SUBTITLE SERVICE] Error fetching latest Kurdish movies:", err);
            return [];
        }
    },

    async fetchWithFallback(url: string, options: any = {}) {
        // --- STEP 1: TAURI NATIVE FETCH (Bypasses CORS entirely) ---
        try {
            // Check if we are in Tauri
            // @ts-ignore
            if (window.__TAURI_INTERNALS__) {
                const { fetch: tauriFetch } = await import(/* @vite-ignore */ '@tauri-apps/plugin-http');
                console.log("[SUBTITLE SERVICE] Using Tauri Native Fetch for:", url);
                const response = await tauriFetch(url, {
                    method: options.method || 'GET',
                    headers: options.headers || {},
                    body: options.body
                });
                if (response.ok) return response;
            }
        } catch (e) {
            console.warn("[SUBTITLE SERVICE] Tauri fetch failed...", e);
        }

        const isExternalBlockedService = url.includes('opensubtitles');

        if (!isExternalBlockedService) {
            // --- STEP 2: BROWSER PROXY ROTATOR ---
            const proxies = [
                { url: url, type: 'direct' },
                { url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, type: 'codetabs' },
                { url: `https://thingproxy.freeboard.io/fetch/${url}`, type: 'thingproxy' },
                { url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, type: 'allorigins' },
                { url: `https://corsproxy.io/?${encodeURIComponent(url)}`, type: 'corsproxy' }
            ];

            for (const proxy of proxies) {
                try {
                    // To avoid Preflight (OPTIONS) requests that proxies often block:
                    // We ONLY send headers if it's the 'direct' attempt.
                    // For proxies, we try to keep it simple.
                    const isDirect = proxy.type === 'direct';
                    const supportsHeaders = ['direct', 'corsproxy', 'codetabs'].includes(proxy.type);
                    
                    // If it's a POST request but the proxy doesn't support headers, skip it
                    if (options.method === 'POST' && !supportsHeaders) continue;

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3500);

                    const fetchOptions: any = {
                        method: options.method || 'GET',
                        body: options.body,
                        headers: supportsHeaders ? (options.headers || {}) : { 'Accept': '*/*' },
                        signal: controller.signal
                    };

                    const response = await fetch(proxy.url, fetchOptions);
                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const contentType = response.headers.get('content-type');
                        if (contentType?.includes('text/html') && !url.includes('.html')) continue;
                        return response;
                    }
                } catch (e) {
                    console.warn(`[SUBTITLE SERVICE] ${proxy.type} failed...`);
                }
            }
        }

        // Ultimate fallback (or direct path for blocked services): Proxy via our own secure Vercel backend
        try {
            console.log("[SUBTITLE SERVICE] Routing via secure Vercel proxy for:", url);
            const apiUrl = `${getSubApiBase()}/api/subtitle`;
            const proxyRes = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url })
            });
            if (proxyRes.ok) {
                const data = await proxyRes.json();
                if (data && data.data) {
                    const binaryString = atob(data.data);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    const blob = new Blob([bytes], { type: data.contentType || 'application/octet-stream' });
                    return new Response(blob, {
                        status: 200,
                        statusText: 'OK',
                        headers: {
                            'Content-Type': data.contentType || 'application/octet-stream'
                        }
                    });
                } else if (data.error || data._error) {
                    console.warn("[SUBTITLE SERVICE] Secure Vercel proxy returned error:", data.error || data._error);
                }
            }
        } catch (err: any) {
            console.warn("[SUBTITLE SERVICE] Secure Vercel proxy fallback failed:", err?.message);
        }

        throw new Error("CRITICAL: All network routes failed. The subtitle server might be down.");
      async searchSubtitles(imdbId: string, type: 'movie' | 'tv', season?: number, episode?: number, language: string = 'ku', allLanguages: boolean = false, tmdbId?: string) {
        const cleanImdbId = imdbId ? (imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`) : '';
        const promises: Promise<SubtitleResult[]>[] = [];

        // 1. Stremio Addon Proxy Strategy (if imdbId present)
        if (cleanImdbId) {
            const fetchStremio = async (): Promise<SubtitleResult[]> => {
                try {
                    const stremioPath = (type === 'tv' && season && episode) 
                        ? `${cleanImdbId}:${season}:${episode}` 
                        : cleanImdbId;
                    const stremioType = type === 'tv' ? 'series' : 'movie';
                    const stremioUrl = `https://opensubtitles-v3.strem.io/subtitles/${stremioType}/${stremioPath}.json`;
                    console.log("[SUBTITLE SERVICE] Discovery Phase - Trying Stremio Proxy:", stremioUrl);
                    
                    const response = await this.fetchWithFallback(stremioUrl);
                    if (response.ok) {
                        const data = await response.json();
                         if (data.subtitles && data.subtitles.length > 0) {
                             return data.subtitles
                                 .filter((s: any) => {
                                     const lang = (s.lang || '').toLowerCase();
                                     return lang !== 'ku' && lang !== 'ckb' && lang !== 'kur' && !lang.includes('kurd');
                                 })
                                 .map((s: any) => ({
                                     id: s.id || `stremio-${Math.random()}`,
                                     attributes: {
                                         language: s.lang,
                                         display_name: s.name || `${(s.lang || 'UN').toUpperCase()} Subtitle (Stremio Proxy)`,
                                         url: s.url,
                                         file_id: s.file_id || 0
                                     }
                                 }));
                         }
                     }
                 } catch (e) {
                     console.warn("[SUBTITLE SERVICE] Stremio Discovery failed:", e);
                 }
                 return [];
             };
             promises.push(fetchStremio());
        }

        // 2. SubDL Discovery Strategy
        if (SUBDL_API_KEY && !SUBDL_API_KEY.includes('YOUR_API_KEY')) {
            const fetchSubDL = async (): Promise<SubtitleResult[]> => {
                try {
                    const queryLangs = 'all';
                    const results = await this.searchSubDL(imdbId, type, season, episode, queryLangs);
                    return results;
                } catch (e) {
                    console.warn("[SUBTITLE SERVICE] SubDL discovery failed:", e);
                }
                return [];
            };
            promises.push(fetchSubDL());
        }

        // 3. OpenSubtitles REST API Strategy via Secure Vercel Proxy
        const fetchOpenSubs = async (): Promise<SubtitleResult[]> => {
            try {
                let query = `?languages=all`;
                if (cleanImdbId) query += `&imdb_id=${encodeURIComponent(cleanImdbId)}`;
                if (tmdbId) query += `&tmdb_id=${encodeURIComponent(tmdbId)}`;
                if (type) query += `&type=${type}`;
                if (type === 'tv' && season && episode) {
                    query += `&season_number=${encodeURIComponent(season.toString())}&episode_number=${encodeURIComponent(episode.toString())}`;
                }     }

                const baseUrl = getSubApiBase();
                const apiUrl = `${baseUrl}/api/subtitle${query}`;

                const response = await fetch(apiUrl);

                if (response.ok) {
                    const data = await response.json();
                    const rawList = data.data || [];
                    const mappedList = rawList.map((item: any) => {
                        if (item.attributes && typeof item.attributes.file_id !== 'undefined' && item.attributes.display_name) {
                            return item as SubtitleResult;
                        }
                        const files = item.attributes?.files || [];
                        const fileId = files[0]?.file_id || 0;
                        const release = item.attributes?.release || '';
                        const lang = item.attributes?.language || '';
                        const url = item.attributes?.url || '';

                        return {
                            id: item.id || `opensubtitles-${Math.random()}`,
                            attributes: {
                                language: lang,
                                display_name: release || `${lang.toUpperCase()} Subtitle (OpenSubtitles)`,
                                url: url,
                                file_id: fileId
                            }
                        } as SubtitleResult;
                    });

                    return mappedList.filter((item: SubtitleResult) => {
                        const lang = (item.attributes?.language || '').toLowerCase();
                        return lang !== 'ku' && lang !== 'ckb' && lang !== 'kur' && !lang.includes('kurd');
                    });
                }
            } catch (error: any) {
                console.warn("[SUBTITLE SERVICE] REST API Search failed gracefully:", error?.message);
            }
            return [];
        };
        promises.push(fetchOpenSubs());

        // Run concurrently
        const settledResults = await Promise.allSettled(promises);
        const aggregatedResults: SubtitleResult[] = [];

        for (const res of settledResults) {
            if (res.status === 'fulfilled' && res.value) {
                aggregatedResults.push(...res.value);
            }
        }

        // Deduplicate
        const seenUrls = new Set<string>();
        const seenNames = new Set<string>();
        const uniqueResults: SubtitleResult[] = [];

        for (const sub of aggregatedResults) {
            if (!sub.attributes || !sub.attributes.url) continue;
            
            const url = sub.attributes.url.trim().toLowerCase();
            const name = (sub.attributes.display_name || '').trim().toLowerCase();

            if (seenUrls.has(url) || (name && seenNames.has(name))) {
                continue;
            }

            seenUrls.add(url);
            if (name) {
                seenNames.add(name);
            }
            uniqueResults.push(sub);
        }

        // Sort: Kurdish first, then Persian/Arabic, then others
        const sortedResults = uniqueResults.sort((a, b) => {
            const aLang = (a.attributes.language || '').toLowerCase();
            const bLang = (b.attributes.language || '').toLowerCase();
            const aName = (a.attributes.display_name || '').toLowerCase();
            const bName = (b.attributes.display_name || '').toLowerCase();

            const aIsKu = aLang === 'ku' || aLang === 'ckb' || aLang === 'kur' || aName.includes('kurd') || aName.includes('sorani');
            const bIsKu = bLang === 'ku' || bLang === 'ckb' || bLang === 'kur' || bName.includes('kurd') || bName.includes('sorani');

            if (aIsKu && !bIsKu) return -1;
            if (!aIsKu && bIsKu) return 1;
            
            const aIsFaAr = aLang === 'fa' || aLang === 'per' || aLang === 'ar' || aLang === 'ara';
            const bIsFaAr = bLang === 'fa' || bLang === 'per' || bLang === 'ar' || bLang === 'ara';
            if (aIsFaAr && !bIsFaAr) return -1;
            if (!aIsFaAr && bIsFaAr) return 1;

            return 0;
        });

        console.log(`[SUBTITLE SERVICE] Aggregated ${sortedResults.length} unique subtitles across all active engines.`);
        return sortedResults;
    },

    async searchSubDL(imdbId: string, type: 'movie' | 'tv', season?: number, episode?: number, languages: string = 'ku') {
        try {
            const cleanImdbId = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;
            const langMap: Record<string, string> = { 'ku': 'Kurdish', 'ckb': 'Kurdish', 'fa': 'Persian', 'ar': 'Arabic', 'en': 'English' };
            const subdlLang = languages.split(',')
                .map(code => langMap[code.trim().toLowerCase()] || 'Kurdish')
                .join(',');
            
            let query = `?engine=subdl&imdb_id=${encodeURIComponent(cleanImdbId)}&languages=${encodeURIComponent(subdlLang)}`;
            if (type === 'tv' && season && episode) {
                query += `&season_number=${encodeURIComponent(season.toString())}&episode_number=${encodeURIComponent(episode.toString())}`;
            }

            const baseUrl = getSubApiBase();
            const apiUrl = `${baseUrl}/api/subtitle${query}`;

            console.log("[SUBTITLE SERVICE] SubDL Search Engine Engaged via Proxy:", apiUrl);
            const response = await fetch(apiUrl);
            if (!response.ok) return [];

            const data = await response.json();
            if (data.status && data.subtitles && data.subtitles.length > 0) {
                return data.subtitles.map((s: any) => {
                    const rawLang = (s.language || '').toLowerCase();
                    let resolvedLang = 'ku';
                    if (rawLang.includes('english')) resolvedLang = 'en';
                    else if (rawLang.includes('persian') || rawLang.includes('farsi')) resolvedLang = 'fa';
                    else if (rawLang.includes('arabic')) resolvedLang = 'ar';
                    
                    return {
                        id: `subdl-${s.sd_id || Math.random()}`,
                        attributes: {
                            language: resolvedLang,
                            display_name: s.release_name || `${rawLang.charAt(0).toUpperCase() + rawLang.slice(1)} Subtitle (SubDL)`,
                            url: s.url || `https://dl.subdl.com/subtitle/${s.sd_id}.zip`,
                            file_id: 0
                        }
                    };
                });
            }
            return [];
        } catch (e: any) {
            console.warn("[SUBTITLE SERVICE] SubDL search error:", e);
            return [];
        }
    },

    async getDownloadLink(fileId: number) {
        if (fileId === 0) return null;
        try {
            const apiUrl = `${getSubApiBase()}/api/subtitle`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_id: fileId })
            });

            if (!response.ok) return null;
            const data = await response.json();
            if (data.status === 'error' || data.error || (data.remaining !== undefined && data.remaining <= 0)) {
                console.warn("[SUBTITLE SERVICE] OpenSubtitles REST API limit reached:", data.message || data.error || data);
                return null;
            }
            return data.link || null;
        } catch (e) {
            console.warn("[SUBTITLE SERVICE] Error calling getDownloadLink API:", e);
            return null;
        }
    },

    async downloadSubtitle(sub: any) {
        try {
            let link = sub.attributes?.files?.[0]?.file_url || sub.attributes?.url || sub.url || sub.link;

            const isOpenSub = link && link.includes('opensubtitles');

            if (isOpenSub && sub.attributes?.file_id && sub.attributes.file_id !== 0) {
                try {
                    const apiLink = await this.getDownloadLink(sub.attributes.file_id);
                    if (apiLink) {
                        link = apiLink;
                    } else {
                        console.warn("[SUBTITLE SERVICE] OpenSubtitles API download points exhausted. Falling back to direct URL/proxy link...");
                        link = sub.attributes?.url || sub.url || sub.link || link;
                    }
                } catch (err) {
                    console.warn("[SUBTITLE SERVICE] getDownloadLink failed, falling back to direct URL:", err);
                    link = sub.attributes?.url || sub.url || sub.link || link;
                }
            }

            if (!link || link.trim() === '') {
                throw new Error("Could not obtain download link");
            }

            // Handle direct Base64 Data URIs without making network fetch calls
            if (link.startsWith('data:')) {
                console.log("[SUBTITLE SERVICE] Decoding direct Base64 Data URI subtitle...");
                const base64Part = link.split(',')[1] || '';
                try {
                    const binString = atob(base64Part);
                    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
                    return new TextDecoder('utf-8').decode(bytes);
                } catch (bErr) {
                    try {
                        return decodeURIComponent(escape(atob(base64Part)));
                    } catch (e2) {
                        return atob(base64Part);
                    }
                }
            }

            // Resolve relative paths to absolute URLs
            if (link.startsWith('//')) {
                link = `https:${link}`;
            } else if (link.startsWith('/')) {
                if (link.startsWith('/subtitle/')) {
                    if (link.includes('subdl') || link.includes('api_key=subdl')) {
                        link = `https://dl.subdl.com${link}`;
                    } else {
                        link = `https://opensubtitles-v3.strem.io${link}`;
                    }
                } else {
                    link = `https://fkurd.pro${link}`;
                }
            }

            console.log("[SUBTITLE SERVICE] Downloading subtitle from resolved link:", link);
            let response: Response | null = null;
            try {
                response = await fetch(link);
                if (!response || !response.ok) {
                    response = await this.fetchWithFallback(link);
                }
            } catch (netErr) {
                console.warn("[SUBTITLE SERVICE] Direct fetch failed, trying proxy fallback:", netErr);
                response = await this.fetchWithFallback(link);
            }

            if (!response || !response.ok) throw new Error(`Could not fetch subtitle content (status: ${response?.status})`);

            const contentType = response.headers.get('content-type') || '';
            let text = '';

            if (contentType.includes('zip') || link.toLowerCase().includes('.zip')) {
                const blob = await response.blob();
                const zip = new JSZip();
                const zipContent = await zip.loadAsync(blob);
                // Find largest subtitle file (avoids cover art .srt edge cases)
                const subFiles = Object.values(zipContent.files).filter((f: any) =>
                    !f.dir && (f.name.toLowerCase().endsWith('.srt') || f.name.toLowerCase().endsWith('.vtt'))
                ) as any[];
                const srtFile = subFiles.sort((a: any, b: any) => b._data?.uncompressedSize - a._data?.uncompressedSize)[0];
                if (srtFile) {
                    // CRITICAL: Use Uint8Array + TextDecoder('utf-8') to preserve Kurdish/Arabic glyphs
                    const bytes = await srtFile.async('uint8array');
                    text = new TextDecoder('utf-8').decode(bytes);
                } else {
                    throw new Error('No .srt/.vtt file found inside ZIP archive');
                }
            } else {
                // Force UTF-8 decode from raw bytes to prevent mojibake on Kurdish characters
                const buffer = await response.arrayBuffer();
                text = new TextDecoder('utf-8').decode(new Uint8Array(buffer));
            }

            return text;
        } catch (e: any) {
            console.error("[SUBTITLE SERVICE] Unified download failed:", e);
            throw e;
        }
    },

    async getSubtitleBlob(url: string, offset: number = 0) {
        try {
            if (url.startsWith('data:')) {
                console.log("[SUBTITLE SERVICE] Decoding direct Base64 Data URI subtitle in getSubtitleBlob...");
                const base64Part = url.split(',')[1] || '';
                let text = '';
                try {
                    const binString = atob(base64Part);
                    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
                    text = new TextDecoder('utf-8').decode(bytes);
                } catch (bErr) {
                    try {
                        text = decodeURIComponent(escape(atob(base64Part)));
                    } catch (e2) {
                        text = atob(base64Part);
                    }
                }
                return await this.processSubtitleText(text, offset);
            }

            let absoluteUrl = url;
            if (url.startsWith('//')) {
                absoluteUrl = `https:${url}`;
            } else if (url.startsWith('/')) {
                if (url.startsWith('/subtitle/')) {
                    if (url.includes('subdl') || url.includes('api_key=subdl')) {
                        absoluteUrl = `https://dl.subdl.com${url}`;
                    } else {
                        absoluteUrl = `https://opensubtitles-v3.strem.io${url}`;
                    }
                } else {
                    absoluteUrl = `https://fkurd.pro${url}`;
                }
            }
            console.log("[SUBTITLE SERVICE] Fetching subtitle VTT for:", absoluteUrl);
            let response: Response | null = null;
            try {
                response = await fetch(absoluteUrl);
                if (!response || !response.ok) {
                    response = await this.fetchWithFallback(absoluteUrl);
                }
            } catch (netErr) {
                console.warn("[SUBTITLE SERVICE] Direct fetch failed in getSubtitleBlob, trying proxy fallback:", netErr);
                response = await this.fetchWithFallback(absoluteUrl);
            }
            if (response && response.ok) {
                const contentType = response.headers.get('content-type') || '';
                let text = '';

                // Handle ZIP extraction (e.g. from SubDL)
                if (contentType.includes('zip') || absoluteUrl.toLowerCase().includes('.zip')) {
                    const blob = await response.blob();
                    const zip = new JSZip();
                    const zipContent = await zip.loadAsync(blob);
                    
                    // Find largest subtitle file with UTF-8-safe extraction
                    const subFiles = Object.values(zipContent.files).filter((f: any) =>
                        !f.dir && (f.name.toLowerCase().endsWith('.srt') || f.name.toLowerCase().endsWith('.vtt'))
                    ) as any[];
                    const srtFile = subFiles.sort((a: any, b: any) => b._data?.uncompressedSize - a._data?.uncompressedSize)[0];
                    
                    if (srtFile) {
                        console.log('[SUBTITLE SERVICE] Extracted subtitle from ZIP in getSubtitleBlob:', srtFile.name);
                        // CRITICAL: UTF-8 decode — preserves Kurdish/Arabic characters correctly
                        const bytes = await srtFile.async('uint8array');
                        text = new TextDecoder('utf-8').decode(bytes);
                    } else {
                        throw new Error('No subtitle file found in ZIP archive');
                    }
                } else {
                    // Force UTF-8 decode from raw bytes
                    const buffer = await response.arrayBuffer();
                    text = new TextDecoder('utf-8').decode(new Uint8Array(buffer));
                }
                
                // Process VTT (SRT-to-VTT + Offset)
                let processedText = text;
                if (!processedText.startsWith('WEBVTT')) {
                    processedText = 'WEBVTT\n\n' + processedText
                        .replace(/(\d+:\d+:\d+),(\d+)/g, '$1.$2')
                        .replace(/^\d+\r?$/gm, '');
                }

                if (offset !== 0) {
                    processedText = this.shiftVtt(processedText, offset);
                }

                // Create a local memory blob URL
                const blob = new Blob([processedText], { type: 'text/vtt' });
                const blobUrl = URL.createObjectURL(blob);
                return blobUrl;
            }
        } catch (error) {
            console.error("[SUBTITLE SERVICE] Subtitle delivery error:", error);
        }
        
        // Final fallback: return original URL
        return url;
    },

    async processSubtitleText(text: string, offset: number) {
        try {
            let processedText = text;
            // Remove BOM and directional marks before processing
            processedText = processedText
                .replace(/[\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
                .replace(/\u00A0/g, ' ')
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n');

            if (!processedText.trim().startsWith('WEBVTT')) {
                // SRT → VTT: replace commas in timestamps, remove sequence numbers, add header
                processedText = 'WEBVTT\n\n' + processedText
                    .replace(/(\d{1,2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')  // fix timestamps
                    .replace(/^\d+\s*$/gm, '');                             // remove seq numbers
            }

            if (offset !== 0) {
                processedText = this.shiftVtt(processedText, offset);
            }

            // Create a local memory blob URL as the modern, high-performance solution
            const blob = new Blob([processedText], { type: 'text/vtt;charset=utf-8' });
            return URL.createObjectURL(blob);
        } catch (e) {
            console.error('[SUBTITLE SERVICE] Error creating Blob URL:', e);
            return null;
        }
    },

    parseVtt(vttText: string) {
        const cues: { start: number, end: number, text: string }[] = [];
        if (!vttText || !vttText.trim()) return cues;

        // Clean BOM, RTL/LTR directional marks (\u200E, \u200F, \u202A-\u202E, \uFEFF) and non-breaking spaces (\u00A0)
        const cleanedText = vttText
            .replace(/[\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
            .replace(/\u00A0/g, ' ')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');

        const parseTime = (timeStr: string): number => {
            if (!timeStr) return 0;
            const normalized = timeStr.trim().replace(',', '.');
            const parts = normalized.split(':');
            if (parts.length === 3) {
                const h = parseFloat(parts[0]) || 0;
                const m = parseFloat(parts[1]) || 0;
                const s = parseFloat(parts[2]) || 0;
                return h * 3600 + m * 60 + s;
            } else if (parts.length === 2) {
                const m = parseFloat(parts[0]) || 0;
                const s = parseFloat(parts[1]) || 0;
                return m * 60 + s;
            }
            return parseFloat(normalized) || 0;
        };

        const lines = cleanedText.split('\n');
        let currentCue: { start: number, end: number, textLines: string[] } | null = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            if (line.includes('-->')) {
                if (currentCue && currentCue.textLines.length > 0) {
                    const text = currentCue.textLines.join('\n').trim();
                    if (text) {
                        cues.push({ start: currentCue.start, end: currentCue.end, text });
                    }
                }

                const parts = line.split('-->');
                if (parts.length >= 2) {
                    const startStr = parts[0].trim().split(/\s+/).pop() || '';
                    const endStr = parts[1].trim().split(/\s+/)[0] || '';

                    const startSec = parseTime(startStr);
                    const endSec = parseTime(endStr);

                    currentCue = {
                        start: startSec,
                        end: endSec,
                        textLines: []
                    };
                }
            } else if (currentCue) {
                if (!line.startsWith('WEBVTT') && !line.startsWith('NOTE') && !/^\d+$/.test(line)) {
                    const cleanedLine = line
                        .replace(/<[^>]+>/g, '')
                        .replace(/\{[^}]+\}/g, '')
                        .trim();
                    if (cleanedLine) {
                        currentCue.textLines.push(cleanedLine);
                    }
                }
            }
        }

        if (currentCue && currentCue.textLines.length > 0) {
            const text = currentCue.textLines.join('\n').trim();
            if (text) {
                cues.push({ start: currentCue.start, end: currentCue.end, text });
            }
        }

        // Auto inject Intro Watermark Cues for Kurdish subtitles if not already present
        const hasZanaIntro = cues.some(c => c.text.includes('زانا فارۆق') || c.text.includes('FLKRD STUDIO'));
        if (!hasZanaIntro && cues.length > 0) {
            const intro1 = { start: 1.5, end: 5.5, text: 'ئەم بەرهەمە ژێرنووسکرایە لەلایەن زانا فارۆقەوە' };
            const intro2 = { start: 6.0, end: 10.0, text: '⚡ POWERED BY FLKRD STUDIO ⚡' };
            const filteredOriginal = cues.filter(c => c.end > 10.2 || c.start >= 10.2);
            return [intro1, intro2, ...filteredOriginal];
        }

        return cues;
    },

    timeToSeconds(timeStr: string) {

        if (!timeStr) return 0;
        const normalized = timeStr.replace(',', '.');
        const parts = normalized.split(':');
        if (parts.length === 3) {
            const h = parseInt(parts[0], 10) || 0;
            const m = parseInt(parts[1], 10) || 0;
            const s = parseFloat(parts[2]) || 0;
            return h * 3600 + m * 60 + s;
        } else if (parts.length === 2) {
            const m = parseInt(parts[0], 10) || 0;
            const s = parseFloat(parts[1]) || 0;
            return m * 60 + s;
        }
        return parseFloat(timeStr) || 0;
    },

    shiftVtt(vtt: string, offset: number) {
        return vtt.replace(/(\d{2}:\d{2}:\d{2}.\d{3})/g, (match) => {
            let totalSeconds = this.timeToSeconds(match) + offset;
            if (totalSeconds < 0) totalSeconds = 0;
            
            const nh = Math.floor(totalSeconds / 3600);
            const nm = Math.floor((totalSeconds % 3600) / 60);
            const ns = (totalSeconds % 60).toFixed(3);
            
            return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}:${String(ns).padStart(6, '0')}`;
        });
    }
};
