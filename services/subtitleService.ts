
/**
 * OpenSubtitles API Service
 * Professional Subtitle Retrieval for FLKRD MOVIES
 */

// IMPORTANT: User must generate their own API key at https://www.opensubtitles.com/en/consumers
const OPENSUBTITLES_API_KEY = 'TMK1BRNZCmW3AfZaJBZiGlieOD8Cq1hl'; 
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
                const fetchOptions: any = {
                    method: options.method || 'GET',
                    body: options.body,
                    headers: isDirect ? (options.headers || {}) : { 'Accept': '*/*' }
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
        // [STRATEGY 1] Priority Discovery: Stremio Addon Ecosystem
        // Stremio addons provide DIRECT download links, bypassing the need for complex proxy POST requests
        // and API keys that trigger CORS preflight blocks in the browser.
        try {
            const cleanImdbId = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;
            // Correct Stremio URL format for TV Shows: tt1234567:1:1.json
            const stremioPath = (type === 'tv' && season && episode) 
                ? `${cleanImdbId}:${season}:${episode}` 
                : cleanImdbId;
            const stremioUrl = `https://opensubtitles-v3.strem.io/subtitles/${type}/${stremioPath}.json`;
            console.log("[SUBTITLE SERVICE] Discovery Phase - Trying Stremio Proxy:", stremioUrl);
            
            const response = await this.fetchWithFallback(stremioUrl);
            if (response.ok) {
                const data = await response.json();
                if (data.subtitles && data.subtitles.length > 0) {
                    const results: SubtitleResult[] = data.subtitles
                        .filter((s: any) => {
                            if (allLanguages) return true;
                            const lang = (s.lang || '').toLowerCase();
                            // 'per' is Persian, often useful. 'ara' is Arabic.
                            return lang === 'ku' || lang === 'ckb' || lang === 'ara' || lang === 'eng' || lang === 'per';
                        })
                        .map((s: any) => ({
                            id: s.id || Math.random().toString(),
                            attributes: {
                                language: s.lang,
                                display_name: s.name || `${(s.lang || 'UN').toUpperCase()} Subtitle (Stremio Proxy)`,
                                url: s.url,
                                file_id: 0 // Indicates a direct link, no POST needed!
                            }
                        }));
                    
                    // If we found results via Stremio, RETURN THEM IMMEDIATELY.
                    if (results.length > 0) return results;
                }
            }
        } catch (e) {
            console.warn("[SUBTITLE SERVICE] Discovery failed, falling back to REST API.", e);
        }

        // [STRATEGY 2] Fallback to OpenSubtitles.com REST API
        if (!OPENSUBTITLES_API_KEY || OPENSUBTITLES_API_KEY.includes('YOUR_API_KEY')) {
            return [];
        }

        try {
            const cleanImdbId = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;
            let url = `https://api.opensubtitles.com/api/v1/subtitles?imdb_id=${cleanImdbId}`;
            
            if (!allLanguages) {
                const langCodes = language === 'ku' ? 'ku,ckb,ar,en' : `${language},en`;
                url += `&languages=${langCodes}`;
            }

            if (type === 'tv' && season && episode) {
                url += `&season_number=${season}&episode_number=${episode}`;
            }

            const response = await this.fetchWithFallback(url, {
                headers: {
                    'Api-Key': OPENSUBTITLES_API_KEY,
                    'User-Agent': USER_AGENT,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) return [];

            const data = await response.json();
            return data.data as SubtitleResult[];
        } catch (error) {
            console.error("[SUBTITLE SERVICE] REST API Search error:", error);
            return [];
        }
    },

    async getDownloadLink(fileId: number) {
        if (fileId === 0) return null;
        try {
            const response = await this.fetchWithFallback('https://api.opensubtitles.com/api/v1/download', {
                method: 'POST',
                headers: {
                    'Api-Key': OPENSUBTITLES_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ file_id: fileId })
            });

            const data = await response.json();
            if (!data || !data.link) {
                throw new Error("Invalid download link data");
            }
            return data.link;
        } catch (error) {
            console.error("[SUBTITLE SERVICE] getDownloadLink failed:", error);
            return null;
        }
    },

    async downloadSubtitle(sub: SubtitleResult) {
        try {
            let link = sub.attributes.url;
            if (sub.attributes.file_id !== 0) {
                link = await this.getDownloadLink(sub.attributes.file_id);
            }
            
            if (!link) throw new Error("Could not obtain download link");

            // Fetch the actual text content
            const response = await this.fetchWithFallback(link);
            if (!response.ok) throw new Error("Could not fetch subtitle content");
            
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
            let fetchUrl = url;
            const { isTauri } = await import("../utils/tauriUtils");
            
            // Only use proxy for official opensubtitles.com links which have strict CORS
            // Stremio links (strem.io) often work better directly in browser
            if (!isTauri() && url.includes('opensubtitles.com')) {
                fetchUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            }

            const response = await fetch(fetchUrl);
            if (!response.ok) {
                // If it failed with proxy, try one last time directly if it's strem.io
                if (fetchUrl !== url) {
                    const directRes = await fetch(url);
                    if (directRes.ok) return this.processSubtitleText(await directRes.text(), offset);
                }
                return null;
            }
            
            return this.processSubtitleText(await response.text(), offset);
        } catch (error) {
            console.error("[SUBTITLE SERVICE] Blob creation error:", error);
            // Last resort: try direct fetch if proxy failed
            try {
                const response = await fetch(url);
                if (response.ok) return this.processSubtitleText(await response.text(), offset);
            } catch (e) {}
            return null;
        }
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

            const blob = new Blob([processedText], { type: 'text/vtt' });
            return URL.createObjectURL(blob);
        } catch (e) {
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
