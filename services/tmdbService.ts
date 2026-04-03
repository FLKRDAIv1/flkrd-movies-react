import { redis } from '../utils/upstashClient';
import { API_BASE_URL, FORBIDDEN_KEYWORDS_EN, FORBIDDEN_KEYWORDS_KU, FORBIDDEN_GENRE_IDS, FORBIDDEN_CONTENT_IDS } from '../constants';
import { Content } from '../types';

export const isForbidden = (item: Content, language: 'en' | 'ku'): boolean => {
  if (item.adult) return true;
  if (FORBIDDEN_CONTENT_IDS.includes(item.id)) return true;

  const itemGenreIds = item.genre_ids || item.genres?.map(g => g.id) || [];
  if (itemGenreIds.some(id => FORBIDDEN_GENRE_IDS.includes(id))) return true;

  const currentLangKeywords = language === 'ku' ? FORBIDDEN_KEYWORDS_KU : FORBIDDEN_KEYWORDS_EN;
  const allKeywords = [...new Set([...currentLangKeywords, ...FORBIDDEN_KEYWORDS_EN])];

  const title = (item.title || item.name || '').toLowerCase();
  const originalTitle = (item.original_title || item.original_name || '').toLowerCase();
  const overview = (item.overview || '').toLowerCase();

  const textToScan = `${title} ${originalTitle} ${overview}`;
  return allKeywords.some(keyword => textToScan.includes(keyword));
};

export const fetchData = async (endpoint: string, language: 'en' | 'ku') => {
  // Use Upstash Redis to BOOST performance (Cache for 1 hour)
  const cacheKey = `tmdb_v2_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return await redis.fetchCached(cacheKey, 3600, async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`).catch(() => null);

      if (!response || !response.ok) {
        return null;
      }
      const data = await response.json();
      const result = data.results || data;

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
  });
};

export interface PaginatedResponse {
  results: Content[];
  page: number;
  total_pages: number;
}

export const fetchPaginatedData = async (endpoint: string, language: 'en' | 'ku'): Promise<PaginatedResponse | null> => {
  const cacheKey = `tmdb_paginated_v2_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return await redis.fetchCached(cacheKey, 3600, async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`).catch(() => null);
      if (!response || !response.ok) return null;
      const data = await response.json();

      if (!data.results) return null;

      const filteredResults = data.results.filter((item: Content) => !isForbidden(item, language));
      return {
        results: filteredResults,
        page: data.page,
        total_pages: data.total_pages,
      };
    } catch (error) {
      return null;
    }
  });
};
