import { supabase } from '../utils/supabaseClient';

export interface BlockedAdItem {
  id?: string | number;
  domain: string;
  created_at?: string;
  created_by?: string;
}

const LOCAL_STORAGE_KEY = 'flkrd_custom_blocked_ads';

class AdBlockerService {
  private dynamicBlockedDomains: Set<string> = new Set();
  private listeners: Set<() => void> = new Set();
  private isInitialized = false;

  constructor() {
    this.loadFromLocal();
    this.syncWithSupabase();
  }

  private loadFromLocal() {
    try {
      if (typeof window === 'undefined') return;
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        parsed.forEach((d) => this.dynamicBlockedDomains.add(d.toLowerCase().trim()));
      }
    } catch (e) {
      console.warn('[AD-BLOCKER-SERVICE] Local load warning:', e);
    }
  }

  private saveToLocal() {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(Array.from(this.dynamicBlockedDomains)));
    } catch (e) {}
  }

  async syncWithSupabase(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('blocked_ads')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && Array.isArray(data)) {
        data.forEach((item: any) => {
          if (item?.domain) {
            this.dynamicBlockedDomains.add(item.domain.toLowerCase().trim());
          }
        });
        this.saveToLocal();
        this.notify();
      }
      this.isInitialized = true;
      return Array.from(this.dynamicBlockedDomains);
    } catch {
      this.isInitialized = true;
      return Array.from(this.dynamicBlockedDomains);
    }
  }

  getBlockedDomains(): string[] {
    return Array.from(this.dynamicBlockedDomains);
  }

  isDomainBlocked(urlOrDomain: string): boolean {
    if (!urlOrDomain) return false;
    const lower = urlOrDomain.toLowerCase().trim();
    for (const domain of this.dynamicBlockedDomains) {
      if (!domain) continue;
      if (lower.includes(domain)) return true;
      try {
        if (lower.startsWith('http://') || lower.startsWith('https://')) {
          const host = new URL(lower).hostname.toLowerCase();
          if (host.includes(domain) || domain.includes(host)) return true;
        }
      } catch (e) {}
    }
    return false;
  }

  async addBlockedDomain(input: string, adminId?: string): Promise<boolean> {
    if (!input) return false;
    let clean = input.toLowerCase().trim();
    try {
      if (clean.startsWith('http://') || clean.startsWith('https://')) {
        const parsed = new URL(clean);
        if (parsed.hostname.includes('google.') && parsed.searchParams.has('q')) {
          clean = (parsed.searchParams.get('q') || '').trim() || clean;
        } else {
          clean = parsed.hostname.replace(/^www\./, '') + (parsed.pathname !== '/' ? parsed.pathname : '');
        }
      }
    } catch (e) {}

    clean = clean.replace(/^https?:\/\//, '').replace(/\/$/, '').trim();
    if (!clean) return false;

    this.dynamicBlockedDomains.add(clean);
    this.saveToLocal();
    this.notify();

    try {
      const { error } = await supabase
        .from('blocked_ads')
        .insert([{ domain: clean, created_by: adminId || 'admin' }]);

      if (error) {
        console.warn('[AD-BLOCKER-SERVICE] Supabase insert warning (persisted locally):', error.message);
      }
      return true;
    } catch (err) {
      console.warn('[AD-BLOCKER-SERVICE] Saved locally with Supabase notice:', err);
      return true;
    }
  }

  async removeBlockedDomain(domain: string): Promise<boolean> {
    const cleanDomain = domain.toLowerCase().trim();
    this.dynamicBlockedDomains.delete(cleanDomain);
    this.saveToLocal();
    this.notify();

    try {
      await supabase
        .from('blocked_ads')
        .delete()
        .eq('domain', cleanDomain);
      return true;
    } catch (err) {
      return true;
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flkrd-blocked-ads-updated'));
    }
  }
}

export const adBlockerService = new AdBlockerService();
