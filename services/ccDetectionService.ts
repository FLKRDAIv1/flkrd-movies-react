import { fetchExternalIds } from './tmdbService';

interface CCQueueItem {
    tmdbId: number;
    type: 'movie' | 'tv';
    resolve: (hasCC: boolean) => void;
}

class CCDetectionService {
    private queue: CCQueueItem[] = [];
    private isProcessing = false;
    private cache = new Map<string, boolean>();

    private getCacheKey(tmdbId: number, type: string) {
        return `cc_status_${type}_${tmdbId}`;
    }

    private loadFromStorage(key: string): boolean | null {
        try {
            const val = localStorage.getItem(key);
            if (val !== null) return val === 'true';
        } catch(e) {}
        return null;
    }

    private saveToStorage(key: string, value: boolean) {
        try {
            localStorage.setItem(key, String(value));
            this.cache.set(key, value);
        } catch(e) {}
    }

    public async checkKurdishCC(tmdbId: number, type: 'movie' | 'tv'): Promise<boolean> {
        const key = this.getCacheKey(tmdbId, type);
        
        // 1. Check Memory Cache
        if (this.cache.has(key)) return this.cache.get(key)!;
        
        // 2. Check LocalStorage
        const stored = this.loadFromStorage(key);
        if (stored !== null) {
            this.cache.set(key, stored);
            
            // If it's cached as true, we should make sure it's in Supabase registry
            // We can push it to the queue just to fetch TMDB details and register it.
            if (stored === true) {
                this.queue.push({ tmdbId, type, resolve: () => {} });
                this.processQueue();
            }
            
            return stored;
        }

        // 3. Add to Queue
        return new Promise<boolean>((resolve) => {
            this.queue.push({ tmdbId, type, resolve });
            this.processQueue();
        });
    }

    private async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;
        this.isProcessing = true;

        while (this.queue.length > 0) {
            const item = this.queue.shift();
            if (!item) continue;

            const key = this.getCacheKey(item.tmdbId, item.type);
            
            try {
                // Fetch IMDB ID
                const externalIds = await fetchExternalIds(item.tmdbId, item.type);
                if (!externalIds || !externalIds.imdb_id) {
                    this.saveToStorage(key, false);
                    item.resolve(false);
                    continue;
                }

                const imdbId = externalIds.imdb_id;
                
                // Fast-check Stremio API ONLY (No REST API fallback for batching to save rate limits)
                // We only check Stremio for covers. If it's on Stremio, it gets the badge.
                // Doing OpenSubtitles REST for 50 covers will get IP banned instantly.
                const stremioUrl = `https://opensubtitles-v3.strem.io/subtitles/${item.type}/${imdbId}.json`;
                const res = await fetch(stremioUrl).catch(() => null);
                
                let hasCC = false;
                if (res && res.ok) {
                    const data = await res.json();
                    if (data && data.subtitles && Array.isArray(data.subtitles)) {
                        hasCC = data.subtitles.some((s: any) => s.lang === 'ku' || s.lang === 'ckb');
                    }
                }

                this.saveToStorage(key, hasCC);
                item.resolve(hasCC);
            } catch (err) {
                console.warn("[CC DETECT] Error:", err);
                item.resolve(false);
            }

            // Sleep 300ms between checks to prevent hammering Stremio/TMDB
            await new Promise(r => setTimeout(r, 300));
        }

        this.isProcessing = false;
    }
}

export const ccDetectionService = new CCDetectionService();
