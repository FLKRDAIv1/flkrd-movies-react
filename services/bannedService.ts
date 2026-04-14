import { supabase } from '../utils/supabaseClient';

class BannedService {
    private bannedIds: Set<string> = new Set();
    private lastFetch: number = 0;
    private CACHE_TTL = 60000; // 1 minute

    async fetchBannedList() {
        const now = Date.now();
        if (now - this.lastFetch < this.CACHE_TTL && this.bannedIds.size > 0) {
            return this.bannedIds;
        }

        try {
            const { data, error } = await supabase
                .from('banned_content')
                .select('content_id');
            
            if (error) throw error;
            
            this.bannedIds = new Set(data.map(item => String(item.content_id)));
            this.lastFetch = now;
            console.log("[BANNED SERVICE] Quantum registry updated:", this.bannedIds.size);
            return this.bannedIds;
        } catch (err) {
            console.error("[BANNED SERVICE] Signal failure:", err);
            return this.bannedIds;
        }
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
            return true;
        } catch (err) {
            console.error("[BANNED SERVICE] Ban registration failed:", err);
            return false;
        }
    }
}

export const bannedService = new BannedService();
