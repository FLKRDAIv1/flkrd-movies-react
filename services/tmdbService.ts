
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

export const isForbidden = (item: Content, language: 'en' | 'ku' | 'badini', isAdmin: boolean = false): boolean => {
  if (isAdmin) return false;
  if (item.adult) return true;
  
  const itemId = String(item.id).replace('custom_', '');
  if (FORBIDDEN_CONTENT_IDS.includes(Number(itemId))) return true;
  if (bannedService.isBanned(itemId)) return true;

  const itemGenreIds = item.genre_ids || item.genres?.map(g => g.id) || [];
  if (itemGenreIds.some(id => FORBIDDEN_GENRE_IDS.includes(id))) return true;

  const currentLangKeywords = (language === 'ku' || language === 'badini') ? FORBIDDEN_KEYWORDS_KU : FORBIDDEN_KEYWORDS_EN;
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

const filterContent = (data: any, language: 'en' | 'ku' | 'badini'): any => {
    if (!data) return null;
    if (Array.isArray(data)) {
        return data.filter((item: Content) => !isForbidden(item, language));
    }
    return isForbidden(data, language) ? null : data;
};

export const fetchData = async (endpoint: string, language: 'en' | 'ku' | 'badini') => {
  const cacheKey = `tmdb_v3_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // 1. Instant Memory Access + Purely In-Memory SWR (Stale-While-Revalidate)
  if (sessionCache.has(cacheKey)) {
    // Await the banned list loading so we can instantly and accurately filter out banned IDs
    await bannedService.fetchBannedList();

    // Silently revalidate in the background
    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (response && response.ok) {
          const rawData = await response.json();
          const result = rawData.results || rawData;
          sessionCache.set(cacheKey, result);
        }
      } catch (e) {
        console.warn("[TMDB SWR] Silent revalidation failed:", e);
      }
    })();

    // Instantly return the stale content from memory
    return filterContent(sessionCache.get(cacheKey), language);
  }

  // 2. Request Deduplication
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const fetchPromise = (async () => {
    try {
      // 3. Network Fallback - Fetch TMDB data and Supabase blocked IDs simultaneously
      const [response, _bannedList] = await Promise.all([
        fetch(`${API_BASE_URL}${endpoint}`),
        bannedService.fetchBannedList()
      ]);

      if (!response || !response.ok) return null;
      
      const rawData = await response.json();
      const result = rawData.results || rawData;
      
      sessionCache.set(cacheKey, result);
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

export const fetchPaginatedData = async (endpoint: string, language: 'en' | 'ku' | 'badini'): Promise<PaginatedResponse | null> => {
  const cacheKey = `tmdb_pag_v3_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // 1. Memory Check + Purely In-Memory SWR
  if (sessionCache.has(cacheKey)) {
    const data = sessionCache.get(cacheKey);

    // Await the banned list loading so we can instantly and accurately filter out banned IDs
    await bannedService.fetchBannedList();

    // Background revalidation
    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (response && response.ok) {
          const fresh = await response.json();
          sessionCache.set(cacheKey, fresh);
        }
      } catch (e) {
        console.warn("[TMDB SWR] Silent revalidation failed:", e);
      }
    })();

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
      // 3. Network Fetch - Fetch TMDB data and Supabase blocked IDs simultaneously
      const [response, _bannedList] = await Promise.all([
        fetch(`${API_BASE_URL}${endpoint}`),
        bannedService.fetchBannedList()
      ]);

      if (!response || !response.ok) return null;
      
      const data = await response.json();
      sessionCache.set(cacheKey, data);

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

export const fetchTranslations = async (id: string | number, type: 'movie' | 'tv') => {
  const endpoint = `/${type}/${id}/translations?api_key=${API_KEY}`;
  return await fetchData(endpoint, 'en');
};

export const fetchTmdbIdFromImdb = async (imdbId: string, type: 'movie' | 'tv') => {
  const endpoint = `/find/${imdbId}?api_key=${API_KEY}&external_source=imdb_id`;
  const result = await fetchData(endpoint, 'en');
  if (result) {
    // If the search returned a raw object, check movie_results or tv_results
    const movieResults = result.movie_results || [];
    const tvResults = result.tv_results || [];
    if (type === 'movie' && movieResults.length > 0) return movieResults[0].id;
    if (type === 'tv' && tvResults.length > 0) return tvResults[0].id;
  }
  return null;
};
