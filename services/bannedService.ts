import { supabase } from '../utils/supabaseClient';

class BannedService {
    private bannedIds: Set<string> = new Set();
    private lastFetch: number = 0;
    private CACHE_TTL = 60000; // 1 minute
    private initPromise: Promise<Set<string>> | null = null;

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
                
                const response = await Promise.race([
                    dbFetchPromise,
                    new Promise<{ data: null, error: any }>((_, reject) => 
                        setTimeout(() => reject(new Error("Supabase request timed out")), 6000)
                    )
                ]);
                
                const { data, error } = response;
                if (error) throw error;
                
                this.bannedIds = new Set((data || []).map(item => String(item.content_id)));
                this.lastFetch = now;
                console.log("[BANNED SERVICE] Quantum registry updated:", this.bannedIds.size);
                return this.bannedIds;
            } catch (err) {
                console.error("[BANNED SERVICE] Signal failure:", err);
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

    isBanned(id: string | number): boolean {
        return this.bannedIds.has(String(id));
    }

    async banContent(id: string | number, mediaType: string) {
        const stringId = String(id);
        try {
            const { error } = await supabase
                .from('banned_content')
                .insert([{ content_id: stringId, media_type: mediaType }]);
            
            if (error) throw error;
            
            this.bannedIds.add(stringId);
            this.notify();
            return true;
        } catch (err) {
            console.error("[BANNED SERVICE] Ban registration failed:", err);
            return false;
        }
    }
    async getBannedRegistry() {
        try {
            const { data, error } = await supabase
                .from('banned_content')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        } catch (err) {
            console.error("[BANNED SERVICE] Registry fetch failed:", err);
            return [];
        }
    }

    async unbanContent(id: string | number) {
        const stringId = String(id);
        try {
            const { error } = await supabase
                .from('banned_content')
                .delete()
                .eq('content_id', stringId);
            
            if (error) throw error;
            
            this.bannedIds.delete(stringId);
            this.notify();
            return true;
        } catch (err) {
            console.error("[BANNED SERVICE] Unban failed:", err);
            return false;
        }
    }

    private notify() {
        window.dispatchEvent(new CustomEvent('banned-list-updated'));
    }

    setupRealtime() {
        return supabase
            .channel('banned_content_sync')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'banned_content' },
                async (payload) => {
                    console.log("[BANNED SERVICE] Realtime sync received:", payload.eventType);
                    await this.fetchBannedList(true); // Force refresh
                    
                    // Import and clear TMDB cache to ensure the UI removes the banned movie
                    const { clearTMDBCache } = await import('./tmdbService');
                    clearTMDBCache();
                    
                    this.notify();
                }
            )
            .subscribe();
    }
}

export const bannedService = new BannedService();
bannedService.setupRealtime(); // Initialize immediately
