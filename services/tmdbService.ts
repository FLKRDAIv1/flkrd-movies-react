import { API_KEY, API_BASE_URL, FORBIDDEN_KEYWORDS_EN, FORBIDDEN_KEYWORDS_KU, FORBIDDEN_GENRE_IDS, FORBIDDEN_CONTENT_IDS } from '../constants';
import { Content } from '../types';
import { bannedService } from './bannedService';

// Lightweight In-Memory Cache (Replaces Upstash Redis)
const sessionCache = new Map<string, any>();

export const clearTMDBCache = () => {
  sessionCache.clear();
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

export const fetchData = async (endpoint: string, language: 'en' | 'ku') => {
  const cacheKey = `tmdb_v3_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // 1. Check In-Memory Cache first (Instant)
  if (sessionCache.has(cacheKey)) {
    const cachedData = sessionCache.get(cacheKey);
    await bannedService.fetchBannedList();

    if (Array.isArray(cachedData)) {
      const filtered = cachedData.filter((item: Content) => !isForbidden(item, language));
      if (filtered.length > 0 || cachedData.length === 0) return filtered;
    } else {
      if (!isForbidden(cachedData, language)) return cachedData;
    }
  }

  // 2. Check Persistent IndexedDB Cache (Pro Sync)
  try {
    const { db } = await import('../utils/db');
    const persistentData = await db.getCache(cacheKey);
    if (persistentData) {
        sessionCache.set(cacheKey, persistentData);
        if (Array.isArray(persistentData)) {
            return persistentData.filter((item: Content) => !isForbidden(item, language));
        }
        if (!isForbidden(persistentData, language)) return persistentData;
    }
  } catch (e) { }

  // 3. Network Fetch
  try {
    const [_, response] = await Promise.all([
      bannedService.fetchBannedList(),
      fetch(`${API_BASE_URL}${endpoint}`).catch(() => null)
    ]);

    if (!response || !response.ok) return null;
    const rawData = await response.json();
    
    // Normalize data
    const result = rawData.results || rawData;
    
    sessionCache.set(cacheKey, result);
    
    // Async persist to Disk
    import('../utils/db').then(({ db }) => db.setCache(cacheKey, result));

    if (Array.isArray(result)) {
      return result.filter((item: Content) => !isForbidden(item, language));
    }

    if (result && result.id) {
      if (isForbidden(result, language)) return null;
    }

    return result;
  } catch (error) {
    return null;
  }
};

export interface PaginatedResponse {
  results: Content[];
  page: number;
  total_pages: number;
}

export const fetchPaginatedData = async (endpoint: string, language: 'en' | 'ku'): Promise<PaginatedResponse | null> => {
  const cacheKey = `tmdb_pag_v3_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;

  const [bannedIds, response] = await Promise.all([
    bannedService.fetchBannedList(),
    fetch(`${API_BASE_URL}${endpoint}`).catch(() => null)
  ]);

  if (sessionCache.has(cacheKey) && (!response || !response.ok)) {
    const data = sessionCache.get(cacheKey);
    const filteredResults = data.results.filter((item: Content) => !isForbidden(item, language));
    return { results: filteredResults, page: data.page, total_pages: data.total_pages };
  }

  try {
    if (!response || !response.ok) return null;
    const data = await response.json();
    sessionCache.set(cacheKey, data);

    if (!data || !data.results) return null;
    const filteredResults = data.results.filter((item: Content) => !isForbidden(item, language));
    return {
      results: filteredResults,
      page: data.page,
      total_pages: data.total_pages,
    };
  } catch (error) {
    return null;
  }
};

export const fetchExternalIds = async (id: string | number, type: 'movie' | 'tv') => {
  const endpoint = `/${type}/${id}/external_ids?api_key=${API_KEY}`;
  const data = await fetchData(endpoint, 'en');
  return data;
};
