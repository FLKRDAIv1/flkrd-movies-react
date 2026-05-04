import { supabase } from '../utils/supabaseClient';

export interface KurdishCCEntry {
    tmdb_id: number;
    media_type: 'movie' | 'tv';
    title: string;
    poster_path: string;
    detected_at: string;
}

export const kurdishCcService = {
    /**
     * Fetch all movies/tv shows that have Kurdish subtitles
     */
    async getAll(): Promise<KurdishCCEntry[]> {
        try {
            const { data, error } = await supabase
                .from('kurdish_cc_registry')
                .select('*')
                .order('detected_at', { ascending: false });
                
            if (error) {
                console.error("[KurdishCCService] Error fetching registry:", error);
                return [];
            }
            return data || [];
        } catch (err) {
            console.error("[KurdishCCService] Exception fetching registry:", err);
            return [];
        }
    },

    /**
     * Register a movie/tv show as having Kurdish subtitles
     */
    async register(tmdbId: number, mediaType: 'movie' | 'tv', title: string, posterPath: string): Promise<void> {
        if (!tmdbId) return;
        
        try {
            // First check if it already exists to save unnecessary writes
            const { data: existing } = await supabase
                .from('kurdish_cc_registry')
                .select('tmdb_id')
                .eq('tmdb_id', tmdbId)
                .single();
                
            if (existing) return; // Already registered

            const { error } = await supabase
                .from('kurdish_cc_registry')
                .insert([{
                    tmdb_id: tmdbId,
                    media_type: mediaType,
                    title: title || 'Unknown Title',
                    poster_path: posterPath || ''
                }]);
                
            if (error) {
                console.error(`[KurdishCCService] Error registering ${tmdbId}:`, error);
            } else {
                console.log(`[KurdishCCService] Successfully registered ${mediaType} ${tmdbId} as Kurdish CC.`);
            }
        } catch (err) {
            console.error(`[KurdishCCService] Exception registering ${tmdbId}:`, err);
        }
    },

    /**
     * Remove a movie from the registry (Admin only)
     */
    async remove(tmdbId: number): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('kurdish_cc_registry')
                .delete()
                .eq('tmdb_id', tmdbId);
                
            return !error;
        } catch (err) {
            console.error(`[KurdishCCService] Exception removing ${tmdbId}:`, err);
            return false;
        }
    }
};
