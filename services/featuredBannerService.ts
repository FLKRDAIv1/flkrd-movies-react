import { supabase } from '../utils/supabaseClient';

export interface FeaturedBannerItem {
  id?: number;
  content_id: string;
  media_type: string;
  title?: string;
  kurdish_title?: string;
  overview?: string;
  kurdish_overview?: string;
  backdrop_path?: string;
  poster_path?: string;
  logo_path?: string;
  video_url?: string;
  rating?: number;
  year?: string;
  sort_order?: number;
  created_at?: string;
}

class FeaturedBannerService {
  async fetchFeaturedItems(): Promise<FeaturedBannerItem[]> {
    try {
      const { data, error } = await supabase
        .from('featured_banner')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[FEATURED BANNER SERVICE] Fetch failed:', err);
      return [];
    }
  }

  async addFeaturedItem(item: Partial<FeaturedBannerItem>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('featured_banner')
        .insert([item]);

      if (error) throw error;
      this.notify();
      return true;
    } catch (err) {
      console.error('[FEATURED BANNER SERVICE] Add failed:', err);
      return false;
    }
  }

  async updateFeaturedItem(id: number, item: Partial<FeaturedBannerItem>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('featured_banner')
        .update(item)
        .eq('id', id);

      if (error) throw error;
      this.notify();
      return true;
    } catch (err) {
      console.error('[FEATURED BANNER SERVICE] Update failed:', err);
      return false;
    }
  }

  async deleteFeaturedItem(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('featured_banner')
        .delete()
        .eq('id', id);

      if (error) throw error;
      this.notify();
      return true;
    } catch (err) {
      console.error('[FEATURED BANNER SERVICE] Delete failed:', err);
      return false;
    }
  }

  async reorderFeaturedItems(items: { id: number; sort_order: number }[]): Promise<boolean> {
    try {
      const promises = items.map(item =>
        supabase
          .from('featured_banner')
          .update({ sort_order: item.sort_order })
          .eq('id', item.id)
      );

      const results = await Promise.all(promises);
      const error = results.find(r => r.error);
      if (error) throw error.error;

      this.notify();
      return true;
    } catch (err) {
      console.error('[FEATURED BANNER SERVICE] Reorder failed:', err);
      return false;
    }
  }

  private notify() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('featured-banner-updated'));
    }
  }
}

export const featuredBannerService = new FeaturedBannerService();
