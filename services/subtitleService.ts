
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
  // Local dev — Vite proxy handles /api routes
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.')
  ) {
    return 'https://fkurd.pro'; // Always use Vercel to avoid CORS
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
                const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
                console.log("[SUBTITLE SERVICE] Using Tauri Native Fetch for:", url);
                const response = await tauriFetch(url, {
                    method: options.method || 'GET',
                    headers: options.headers || {},
                    body: options.body
                });
                if (response.ok) return response;
            }
        } catch (e) {
            console.warn("[SUBTITLE SERVICE] Tauri fetch failed, falling back to proxies...", e);
        }

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

                const fetchOptions: any = {
                    method: options.method || 'GET',
                    body: options.body,
                    headers: supportsHeaders ? (options.headers || {}) : { 'Accept': '*/*' }
                };

                const response = await fetch(proxy.url, fetchOptions);

                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType?.includes('text/html') && !url.includes('.html')) continue;
                    return response;
                }
            } catch (e) {
                console.warn(`[SUBTITLE SERVICE] ${proxy.type} failed...`);
            }
        }
        throw new Error("CRITICAL: All network routes failed. The subtitle server might be down.");
    },

    async searchSubtitles(imdbId: string, type: 'movie' | 'tv', season?: number, episode?: number, language: string = 'ku', allLanguages: boolean = false) {
        const cleanImdbId = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;
        const promises: Promise<SubtitleResult[]>[] = [];

        // 1. Stremio Addon Proxy Strategy
        const fetchStremio = async (): Promise<SubtitleResult[]> => {
            try {
                const stremioPath = (type === 'tv' && season && episode) 
                    ? `${cleanImdbId}:${season}:${episode}` 
                    : cleanImdbId;
                const stremioUrl = `https://opensubtitles-v3.strem.io/subtitles/${type}/${stremioPath}.json`;
                console.log("[SUBTITLE SERVICE] Discovery Phase - Trying Stremio Proxy:", stremioUrl);
                
                const response = await this.fetchWithFallback(stremioUrl);
                if (response.ok) {
                    const data = await response.json();
                    if (data.subtitles && data.subtitles.length > 0) {
                        return data.subtitles
                            .filter((s: any) => {
                                if (allLanguages) return true;
                                const lang = (s.lang || '').toLowerCase();
                                return lang === 'ku' || lang === 'ckb' || lang === 'ara' || lang === 'eng' || lang === 'per' || lang === 'fa' || lang === 'ar' || lang === 'en';
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

        // 2. SubDL Discovery Strategy
        if (SUBDL_API_KEY && !SUBDL_API_KEY.includes('YOUR_API_KEY')) {
            const fetchSubDL = async (): Promise<SubtitleResult[]> => {
                try {
                    const resultsKu = await this.searchSubDL(imdbId, type, season, episode, 'ku');
                    let resultsOther: SubtitleResult[] = [];
                    if (allLanguages) {
                        const otherLangs = ['en', 'fa', 'ar'];
                        const otherRes = await Promise.all(otherLangs.map(l => this.searchSubDL(imdbId, type, season, episode, l)));
                        resultsOther = otherRes.flat();
                    }
                    return [...resultsKu, ...resultsOther];
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
                let query = `?imdb_id=${encodeURIComponent(cleanImdbId)}`;
                if (!allLanguages) {
                    const langCodes = 'ku,ckb,fa,ar,en';
                    query += `&languages=${encodeURIComponent(langCodes)}`;
                }
                if (type === 'tv' && season && episode) {
                    query += `&season_number=${encodeURIComponent(season.toString())}&episode_number=${encodeURIComponent(episode.toString())}`;
                }

                const baseUrl = getSubApiBase();
                const apiUrl = `${baseUrl}/api/subtitle${query}`;

                const response = await fetch(apiUrl);

                if (response.ok) {
                    const data = await response.json();
                    return (data.data || []) as SubtitleResult[];
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

    async searchSubDL(imdbId: string, type: 'movie' | 'tv', season?: number, episode?: number, language: string = 'ku') {
        try {
            const cleanImdbId = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;
            const langMap: Record<string, string> = { 'ku': 'Kurdish', 'ckb': 'Kurdish', 'fa': 'Persian', 'ar': 'Arabic', 'en': 'English' };
            const subdlLang = langMap[language] || 'Kurdish';
            
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
                return data.subtitles.map((s: any) => ({
                    id: `subdl-${s.sd_id || Math.random()}`,
                    attributes: {
                        language: language,
                        display_name: s.release_name || `${subdlLang} Subtitle (SubDL)`,
                        url: s.url || `https://dl.subdl.com/subtitle/${s.sd_id}.zip`,
                        file_id: 0
                    }
                }));
            }
            return [];
        } catch (e: any) {
            console.warn("[SUBTITLE SERVICE] SubDL search failed gracefully:", e?.message);
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

            if (!response.ok) throw new Error(`Backend download failed with status ${response.status}`);
            
            const data = await response.json();
            if (data.error || data._error) {
                 console.warn("[SUBTITLE SERVICE] Backend reported an error:", data.error || data._error);
            }
            return data.link || null;
        } catch (error: any) {
            console.warn("[SUBTITLE SERVICE] Custom proxy download failed gracefully:", error?.message);
            throw error;
        }
    },

    async downloadSubtitle(sub: SubtitleResult) {
        try {
            let link = sub.attributes.url;
            if (sub.attributes.file_id !== 0) {
                link = await this.getDownloadLink(sub.attributes.file_id);
            }
            
            if (!link) throw new Error("Could not obtain download link");

            // Resolve relative paths to absolute URLs (e.g. from Stremio Proxy or local custom storage)
            if (link.startsWith('/')) {
                if (link.startsWith('/subtitle/')) {
                    link = `https://opensubtitles-v3.strem.io${link}`;
                } else {
                    link = `https://fkurd.pro${link}`;
                }
            }

            // Fetch the actual text content (or zip)
            const response = await this.fetchWithFallback(link);
            if (!response.ok) throw new Error("Could not fetch subtitle content");
            
            const contentType = response.headers.get('content-type') || '';
            
            // Handle ZIP extraction for SubDL
            if (contentType.includes('zip') || link.endsWith('.zip')) {
                const blob = await response.blob();
                
                const zip = new JSZip();
                const zipContent = await zip.loadAsync(blob);
                
                // Find first .srt or .vtt file
                const srtFile = Object.values(zipContent.files).find((f: any) => 
                    !f.dir && (f.name.toLowerCase().endsWith('.srt') || f.name.toLowerCase().endsWith('.vtt'))
                ) as any;
                
                if (srtFile) {
                    console.log("[SUBTITLE SERVICE] Extracted subtitle from SubDL ZIP:", srtFile.name);
                    return await srtFile.async('string');
                }
                throw new Error("No subtitle file found in ZIP archive");
            }

            const text = await response.text();
            if (!text || text.length < 10) throw new Error("Empty subtitle content");
            
            return text;
        } catch (e) {
            console.error("[SUBTITLE SERVICE] Unified download failed:", e);
            throw e;
        }
    },

    async getSubtitleBlob(url: string, offset: number = 0) {
        try {
            let absoluteUrl = url;
            if (url.startsWith('/')) {
                if (url.startsWith('/subtitle/')) {
                    absoluteUrl = `https://opensubtitles-v3.strem.io${url}`;
                } else {
                    absoluteUrl = `https://fkurd.pro${url}`;
                }
            }
            console.log("[SUBTITLE SERVICE] Fetching subtitle VTT with proxy rotation for:", absoluteUrl);
            const response = await this.fetchWithFallback(absoluteUrl);
            if (response && response.ok) {
                const text = await response.text();
                
                // Process VTT (SRT-to-VTT + Offset)
                let processedText = text;
                if (!processedText.startsWith('WEBVTT')) {
                    processedText = 'WEBVTT\n\n' + processedText
                        .replace(/(\d+:\d+:\d+),(\d+)/g, '$1.$2')
                        .replace(/^\d+$/gm, '');
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
            if (!processedText.startsWith('WEBVTT')) {
                processedText = 'WEBVTT\n\n' + processedText
                    .replace(/(\d+:\d+:\d+),(\d+)/g, '$1.$2')
                    .replace(/^\d+$/gm, '');
            }

            if (offset !== 0) {
                processedText = this.shiftVtt(processedText, offset);
            }

            // Create a local memory blob URL as the modern, high-performance solution
            const blob = new Blob([processedText], { type: 'text/vtt' });
            return URL.createObjectURL(blob);
        } catch (e) {
            console.error("[SUBTITLE SERVICE] Error creating Blob URL:", e);
            return null;
        }
    },

    parseVtt(vttText: string) {
        const cues: { start: number, end: number, text: string }[] = [];
        const lines = vttText.split('\n');
        let currentCue: any = null;

        const timeRegex = /(\d{2}:\d{2}:\d{2}.\d{3}) --> (\d{2}:\d{2}:\d{2}.\d{3})/;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const match = line.match(timeRegex);

            if (match) {
                if (currentCue) cues.push(currentCue);
                currentCue = {
                    start: this.timeToSeconds(match[1]),
                    end: this.timeToSeconds(match[2]),
                    text: ''
                };
            } else if (currentCue && line !== '' && !line.includes('-->')) {
                currentCue.text += (currentCue.text ? '\n' : '') + line;
            }
        }
        if (currentCue) cues.push(currentCue);
        return cues;
    },

    timeToSeconds(timeStr: string) {
        const parts = timeStr.split(':');
        const h = parseInt(parts[0]);
        const m = parseInt(parts[1]);
        const s = parseFloat(parts[2]);
        return h * 3600 + m * 60 + s;
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
