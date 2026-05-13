
import { API_KEY, API_BASE_URL, FORBIDDEN_KEYWORDS_EN, FORBIDDEN_KEYWORDS_KU, FORBIDDEN_GENRE_IDS, FORBIDDEN_CONTENT_IDS } from '../constants';
import { Content } from '../types';
import { bannedService } from './bannedService';

// Quantum Cache Layers
const sessionCache = new Map<string, any>();
const pendingRequests = new Map<string, Promise<any>>();

export const clearTMDBCache = () => {
  sessionCache.clear();
  pendingRequests.clear();
  console.log("[TMDB SERVICE] Quantum Cache Purged.");
};

export const isForbidden = (item: Content, language: 'en' | 'ku', isAdmin: boolean = false): boolean => {
  if (isAdmin) return false;
  if (item.adult) return true;
  
  const itemId = String(item.id).replace('custom_', '');
  if (FORBIDDEN_CONTENT_IDS.includes(Number(itemId))) return true;
  if (bannedService.isBanned(itemId)) return true;

  const itemGenreIds = item.genre_ids || item.genres?.map(g => g.id) || [];
  if (itemGenreIds.some(id => FORBIDDEN_GENRE_IDS.includes(id))) return true;

  const currentLangKeywords = language === 'ku' ? FORBIDDEN_KEYWORDS_KU : FORBIDDEN_KEYWORDS_EN;
  const allKeywords = [...new Set([...currentLangKeywords, ...FORBIDDEN_KEYWORDS_EN])];

  const title = (item.title || item.name || '').toLowerCase();
  const originalTitle = (item.original_title || item.original_name || '').toLowerCase();
  const overview = (item.overview || '').toLowerCase();

  const textToScan = `${title} ${originalTitle} ${overview}`;
  return allKeywords.some(keyword => {
    const k = keyword.toLowerCase().trim();
    return k !== '' && textToScan.includes(k);
  });
};

const filterContent = (data: any, language: 'en' | 'ku'): any => {
    if (!data) return null;
    if (Array.isArray(data)) {
        return data.filter((item: Content) => !isForbidden(item, language));
    }
    return isForbidden(data, language) ? null : data;
};

export const fetchData = async (endpoint: string, language: 'en' | 'ku') => {
  const cacheKey = `tmdb_v3_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // 1. Instant Memory Access
  if (sessionCache.has(cacheKey)) {
    return filterContent(sessionCache.get(cacheKey), language);
  }

  // 2. Request Deduplication
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const fetchPromise = (async () => {
    try {
      // 3. Persistent Disk Access
      const { db } = await import('../utils/db');
      const persistentData = await db.getCache(cacheKey);
      
      if (persistentData) {
        sessionCache.set(cacheKey, persistentData);
        // Trigger background revalidation for next visit
        fetch(`${API_BASE_URL}${endpoint}`).then(async res => {
          if (res.ok) {
            const fresh = await res.json();
            const result = fresh.results || fresh;
            sessionCache.set(cacheKey, result);
            db.setCache(cacheKey, result);
          }
        }).catch(() => {});
        
        return filterContent(persistentData, language);
      }

      // 4. Network Fallback
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      if (!response || !response.ok) return null;
      
      const rawData = await response.json();
      const result = rawData.results || rawData;
      
      sessionCache.set(cacheKey, result);
      db.setCache(cacheKey, result);
      
      return filterContent(result, language);
    } catch (error) {
      return null;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
};

export interface PaginatedResponse {
  results: Content[];
  page: number;
  total_pages: number;
}

export const fetchPaginatedData = async (endpoint: string, language: 'en' | 'ku'): Promise<PaginatedResponse | null> => {
  const cacheKey = `tmdb_pag_v3_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // 1. Memory Check
  if (sessionCache.has(cacheKey)) {
    const data = sessionCache.get(cacheKey);
    return {
      results: filterContent(data.results, language),
      page: data.page,
      total_pages: data.total_pages
    };
  }

  // 2. Deduplication
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const fetchPromise = (async () => {
    try {
      // 3. Disk Check
      const { db } = await import('../utils/db');
      const persistentData = await db.getCache(cacheKey);
      
      if (persistentData) {
        sessionCache.set(cacheKey, persistentData);
        // Background Refresh
        fetch(`${API_BASE_URL}${endpoint}`).then(async res => {
            if (res.ok) {
                const fresh = await res.json();
                sessionCache.set(cacheKey, fresh);
                db.setCache(cacheKey, fresh);
            }
        }).catch(() => {});
        
        return {
          results: filterContent(persistentData.results, language),
          page: persistentData.page,
          total_pages: persistentData.total_pages
        };
      }

      // 4. Network
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      if (!response || !response.ok) return null;
      
      const data = await response.json();
      sessionCache.set(cacheKey, data);
      db.setCache(cacheKey, data);

      return {
        results: filterContent(data.results, language),
        page: data.page,
        total_pages: data.total_pages,
      };
    } catch (error) {
      return null;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
};

export const fetchExternalIds = async (id: string | number, type: 'movie' | 'tv') => {
  const endpoint = `/${type}/${id}/external_ids?api_key=${API_KEY}`;
  return await fetchData(endpoint, 'en');
};
