import { supabase } from '../utils/supabaseClient';

class BannedService {
    private bannedIds: Set<string> = new Set();
    private lastFetch: number = 0;
    private CACHE_TTL = 60000; // 1 minute
    private initPromise: Promise<Set<string>> | null = null;

    constructor() {
        try {
            if (typeof window !== 'undefined') {
                const saved = localStorage.getItem('flkrd_banned_ids');
                if (saved) {
                    const list = JSON.parse(saved);
                    if (Array.isArray(list)) {
                        list.forEach(id => {
                            const str = String(id);
                            this.bannedIds.add(str);
                            this.bannedIds.add(str.replace(/^custom_/, ''));
                            if (!str.startsWith('custom_')) {
                                this.bannedIds.add(`custom_${str}`);
                            }
                        });
                    }
                }
            }
        } catch (e) {
            // Ignore local load failure
        }
    }

    private saveLocal() {
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem('flkrd_banned_ids', JSON.stringify(Array.from(this.bannedIds)));
            }
        } catch (e) {}
    }

    hasFetched(): boolean {
        return this.lastFetch > 0;
    }

    private async performFetch(now: number): Promise<Set<string>> {
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                const dbFetchPromise = supabase
                    .from('banned_content')
                    .select('content_id');
                
                let timeoutId: any;
                const timeoutPromise = new Promise<{ data: any, error: any }>((resolve) => {
                    timeoutId = setTimeout(() => resolve({ data: null, error: null }), 1500);
                });
                
                const response = await Promise.race([
                    dbFetchPromise.then(val => {
                        clearTimeout(timeoutId);
                        return val;
                    }),
                    timeoutPromise
                ]);
                
                const { data, error } = response;
                if (!error && data && Array.isArray(data)) {
                    data.forEach((item: any) => {
                        if (item?.content_id) {
                            const str = String(item.content_id);
                            this.bannedIds.add(str);
                            this.bannedIds.add(str.replace(/^custom_/, ''));
                            if (!str.startsWith('custom_')) {
                                this.bannedIds.add(`custom_${str}`);
                            }
                        }
                    });
                    this.lastFetch = now;
                    this.saveLocal();
                    console.log("[BANNED SERVICE] Quantum registry updated:", this.bannedIds.size);
                }
                return this.bannedIds;
            } catch (err) {
                console.warn("[BANNED SERVICE] Signal degraded, using cached registry:", err);
                return this.bannedIds;
            } finally {
                this.initPromise = null;
            }
        })();

        return this.initPromise;
    }

    async fetchBannedList(force = false): Promise<Set<string>> {
        const now = Date.now();
        if (!force && this.lastFetch > 0) {
            if (now - this.lastFetch < this.CACHE_TTL) {
                return this.bannedIds;
            }
            // Background update
            this.performFetch(now).catch(err => {
                console.error("[BANNED SERVICE] Background fetch failed:", err);
            });
            return this.bannedIds;
        }
        return this.performFetch(now);
    }

    isBanned(id: string | number | undefined | null): boolean {
        if (!id) return false;
        const str = String(id);
        const clean = str.replace(/^custom_/, '');
        const custom = str.startsWith('custom_') ? str : `custom_${str}`;
        return this.bannedIds.has(str) || this.bannedIds.has(clean) || this.bannedIds.has(custom);
    }

    async banContent(id: string | number, mediaType: string) {
        const rawId = String(id);
        const cleanId = rawId.replace(/^custom_/, '');
        const customId = rawId.startsWith('custom_') ? rawId : `custom_${rawId}`;

        // Immediately update memory and local store
        this.bannedIds.add(rawId);
        this.bannedIds.add(cleanId);
        this.bannedIds.add(customId);
        this.saveLocal();
        this.notify();

        try {
            await supabase
                .from('banned_content')
                .upsert([
                    { content_id: cleanId, media_type: mediaType },
                    { content_id: customId, media_type: mediaType }
                ], { onConflict: 'content_id' });
        } catch (err) {
            console.warn("[BANNED SERVICE] Supabase ban registration synced locally:", err);
        }
        return true;
    }

    async getBannedRegistry() {
        const results: any[] = [];
        const seen = new Set<string>();

        try {
            const { data, error } = await supabase
                .from('banned_content')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error && Array.isArray(data)) {
                data.forEach((item: any) => {
                    if (item?.content_id && !seen.has(String(item.content_id))) {
                        seen.add(String(item.content_id));
                        results.push(item);
                    }
                });
            }
        } catch (err) {
            console.warn("[BANNED SERVICE] Remote registry fetch degraded:", err);
        }

        // Fill with local items if missing
        this.bannedIds.forEach((id) => {
            if (!seen.has(id)) {
                seen.add(id);
                results.push({
                    content_id: id,
                    media_type: id.startsWith('custom_') ? 'dubbed' : 'movie',
                    created_at: new Date().toISOString()
                });
            }
        });

        return results;
    }

    async unbanContent(id: string | number) {
        const rawId = String(id);
        const cleanId = rawId.replace(/^custom_/, '');
        const customId = rawId.startsWith('custom_') ? rawId : `custom_${rawId}`;

        this.bannedIds.delete(rawId);
        this.bannedIds.delete(cleanId);
        this.bannedIds.delete(customId);
        this.saveLocal();
        this.notify();

        try {
            await supabase
                .from('banned_content')
                .delete()
                .or(`content_id.eq.${cleanId},content_id.eq.${customId}`);
        } catch (err) {
            console.warn("[BANNED SERVICE] Supabase unban synced locally:", err);
        }
        return true;
    }

    private notify() {
        window.dispatchEvent(new CustomEvent('banned-list-updated'));
        window.dispatchEvent(new Event('storage'));
    }

    setupRealtime() {
        try {
            const channel = supabase
                .channel('banned_content_sync')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'banned_content' },
                    async (payload) => {
                        console.log("[BANNED SERVICE] Realtime sync received:", payload.eventType);
                        await this.fetchBannedList(true);
                        const { clearTMDBCache } = await import('./tmdbService');
                        clearTMDBCache();
                        this.notify();
                    }
                );
            channel.subscribe((status) => {
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    // Silent
                }
            });
            return channel;
        } catch (e) {
            // Silent catch
        }
    }
}

export const bannedService = new BannedService();

(async () => {
    try {
        const { data, error } = await supabase.from('banned_content').select('content_id').limit(1);
        if (!error) {
            bannedService.setupRealtime();
        }
    } catch (e) {
        // Skip
    }
})();

