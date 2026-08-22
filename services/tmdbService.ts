
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

export const getMediaType = (item: any): 'movie' | 'tv' => {
  if (!item) return 'movie';
  if (item.media_type === 'tv' || item.type === 'tv') return 'tv';
  if (item.media_type === 'movie' || item.type === 'movie') return 'movie';

  // Robust TV show detection across raw TMDB data and mapped objects
  if (
    item.first_air_date ||
    item.original_name ||
    item.number_of_seasons !== undefined ||
    item.number_of_episodes !== undefined ||
    (Array.isArray(item.origin_country) && item.origin_country.length > 0) ||
    (item.name && (!item.title || item.name === item.title) && !item.release_date) ||
    (item.name && !item.original_title)
  ) {
    return 'tv';
  }
  return 'movie';
};

const fetchWithFallback = async (endpoint: string, signal?: AbortSignal): Promise<Response | null> => {
  const cleanEndpoint = (endpoint.startsWith('http://') || endpoint.startsWith('https://'))
    ? endpoint.replace(/^https?:\/\/api\.themoviedb\.org\/3/, '')
    : endpoint;

  // Strategy 1: Primary configured URL (/api/tmdb or https://api.tmdb.org/3)
  const primaryUrl = (cleanEndpoint.startsWith('http://') || cleanEndpoint.startsWith('https://'))
    ? cleanEndpoint
    : `${API_BASE_URL}${cleanEndpoint}`;

  try {
    const res = await fetch(primaryUrl, { signal });
    if (res) {
      if (res.ok) return res;
      if (res.status === 404) return null; // Resource 404 Not Found on TMDB - do not retry on proxy mirrors
    }
  } catch (e) { }

  // Strategy 2: Direct TMDB API endpoint fallback
  if (API_BASE_URL !== "https://api.tmdb.org/3") {
    try {
      const targetPath = (cleanEndpoint.startsWith('http://') || cleanEndpoint.startsWith('https://'))
        ? cleanEndpoint
        : `https://api.themoviedb.org/3${cleanEndpoint}`;
      const res = await fetch(targetPath, { signal });
      if (res) {
        if (res.ok) return res;
        if (res.status === 404) return null;
      }
    } catch (e) { }
  }

  // Strategy 3: Public CORS proxy fallback for mobile PWAs / restricted physical mobile webviews
  try {
    const targetUrl = endpoint.startsWith('http') ? endpoint : `https://api.tmdb.org/3${endpoint}`;
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, { signal });
    if (res && res.ok) return res;
  } catch (e) { }

  return null;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours

const getPersistentCache = (key: string) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - (parsed.timestamp || 0) < CACHE_TTL_MS) {
      return parsed.data;
    }
  } catch (e) {}
  return null;
};

const setPersistentCache = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (e) {
    // Local storage full: clean up expired or older tmdb cache entries
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('tmdb_v3_')) localStorage.removeItem(k);
      });
      localStorage.setItem(key, JSON.stringify({
        timestamp: Date.now(),
        data
      }));
    } catch (err) {}
  }
};

export const fetchData = async (endpoint: string, language: 'en' | 'ku' | 'badini') => {
  // Guard against querying TMDB with custom UUIDs or non-numeric IDs in /movie/{id} or /tv/{id}
  const idMatch = endpoint.match(/^\/(movie|tv)\/([^/?]+)/);
  if (idMatch && !/^\d+$/.test(idMatch[2])) {
    return null;
  }

  const cacheKey = `tmdb_v3_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // 1. Instant In-Memory Access + Background SWR
  if (sessionCache.has(cacheKey)) {
    if (!bannedService.hasFetched()) {
      await bannedService.fetchBannedList();
    } else {
      bannedService.fetchBannedList().catch(() => {});
    }

    // Silent background revalidation
    (async () => {
      try {
        const response = await fetchWithFallback(endpoint);
        if (response && response.ok) {
          const rawData = await response.json();
          const result = rawData.results || rawData;
          sessionCache.set(cacheKey, result);
          setPersistentCache(cacheKey, result);
        }
      } catch (e) {
        console.warn("[TMDB SWR] Silent revalidation failed:", e);
      }
    })();

    return filterContent(sessionCache.get(cacheKey), language);
  }

  // 2. Instant Local Storage Persistent Cache Access + Background SWR
  const persistentData = getPersistentCache(cacheKey);
  if (persistentData) {
    sessionCache.set(cacheKey, persistentData);
    bannedService.fetchBannedList().catch(() => {});

    // Silent background revalidation
    (async () => {
      try {
        const response = await fetchWithFallback(endpoint);
        if (response && response.ok) {
          const rawData = await response.json();
          const result = rawData.results || rawData;
          sessionCache.set(cacheKey, result);
          setPersistentCache(cacheKey, result);
        }
      } catch (e) {}
    })();

    return filterContent(persistentData, language);
  }

  // 3. Request Deduplication
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const fetchPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for mobile
    try {
      const [response, _bannedList] = await Promise.all([
        fetchWithFallback(endpoint, controller.signal),
        bannedService.fetchBannedList()
      ]);

      if (!response || !response.ok) {
        console.warn(`[TMDB] All fetch strategies failed for ${endpoint}`);
        return null;
      }
      
      const rawData = await response.json();
      const result = rawData.results || rawData;
      
      sessionCache.set(cacheKey, result);
      setPersistentCache(cacheKey, result);
      return filterContent(result, language);
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error(`[TMDB] Fetch failed for ${endpoint}:`, error?.message || error);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
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
  const idMatch = endpoint.match(/^\/(movie|tv)\/([^/?]+)/);
  if (idMatch && !/^\d+$/.test(idMatch[2])) {
    return null;
  }

  const cacheKey = `tmdb_pag_v3_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // 1. Memory Check + Purely In-Memory SWR
  if (sessionCache.has(cacheKey)) {
    const data = sessionCache.get(cacheKey);

    // Only block if we have NEVER fetched the banned list before
    if (!bannedService.hasFetched()) {
      await bannedService.fetchBannedList();
    } else {
      // Fire-and-forget background update
      bannedService.fetchBannedList().catch(() => {});
    }

    // Background revalidation
    (async () => {
      try {
        const response = await fetchWithFallback(endpoint);
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for mobile
    try {
      // 3. Network Fetch - Fetch TMDB data with multi-strategy fallback and Supabase blocked IDs simultaneously
      const [response, _bannedList] = await Promise.all([
        fetchWithFallback(endpoint, controller.signal),
        bannedService.fetchBannedList()
      ]);

      if (!response || !response.ok) {
        console.warn(`[TMDB] All paginated fetch strategies failed for ${endpoint}`);
        return null;
      }
      
      const data = await response.json();
      sessionCache.set(cacheKey, data);

      return {
        results: filterContent(data.results, language),
        page: data.page,
        total_pages: data.total_pages,
      };
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error(`[TMDB] Paginated fetch failed for ${endpoint}:`, error?.message || error);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
};

export const fetchExternalIds = async (id: string | number, type: 'movie' | 'tv') => {
  const cleanId = String(id || '').replace(/^custom_/, '');
  if (!cleanId || !/^\d+$/.test(cleanId)) return null;
  const endpoint = `/${type}/${cleanId}/external_ids?api_key=${API_KEY}`;
  return await fetchData(endpoint, 'en');
};

export const fetchTranslations = async (id: string | number, type: 'movie' | 'tv') => {
  const cleanId = String(id || '').replace(/^custom_/, '');
  if (!cleanId || !/^\d+$/.test(cleanId)) return null;
  const endpoint = `/${type}/${cleanId}/translations?api_key=${API_KEY}`;
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
