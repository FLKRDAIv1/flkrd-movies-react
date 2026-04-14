import { redis } from '../utils/upstashClient';
import { API_BASE_URL, FORBIDDEN_KEYWORDS_EN, FORBIDDEN_KEYWORDS_KU, FORBIDDEN_GENRE_IDS, FORBIDDEN_CONTENT_IDS } from '../constants';
import { Content } from '../types';
import { bannedService } from './bannedService';

export const isForbidden = (item: Content, language: 'en' | 'ku'): boolean => {
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
  return allKeywords.some(keyword => textToScan.includes(keyword));
};

export const fetchData = async (endpoint: string, language: 'en' | 'ku') => {
  // Parallelize Banned Registry sync with TMDB Fetch
  const bannedPromise = bannedService.fetchBannedList();

  // Use Upstash Redis to BOOST performance (Cache for 1 hour)
  const cacheKey = `tmdb_v3_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;

  const rawData = await redis.fetchCached(cacheKey, 3600, async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`).catch(() => null);
      if (!response) return null;
      if (response.status === 404) {
        console.warn(`[TMDB] Content missing (404): ${endpoint}`);
        return null;
      }
      if (!response.ok) return null;
      return await response.json();
    } catch (error) { return null; }
  });

  // Ensure banned check is ready before filtering
  await bannedPromise;

  if (!rawData) return null;

  // Quantum Filter Layer (Always runs, bypassing cache state)
  const result = rawData.results || rawData;

  if (Array.isArray(result)) {
    return result.filter((item: Content) => !isForbidden(item, language));
  }

  if (result && result.id) {
    if (isForbidden(result, language)) return null;
  }

  return result;
};

export interface PaginatedResponse {
  results: Content[];
  page: number;
  total_pages: number;
}

export const fetchPaginatedData = async (endpoint: string, language: 'en' | 'ku'): Promise<PaginatedResponse | null> => {
  // Parallelize Banned Registry sync
  const bannedPromise = bannedService.fetchBannedList();

  const cacheKey = `tmdb_paginated_v3_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;

  const data = await redis.fetchCached(cacheKey, 3600, async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`).catch(() => null);
      if (!response || !response.ok) return null;
      return await response.json();
    } catch (error) { return null; }
  });

  await bannedPromise;

  if (!data || !data.results) return null;

  // Apply real-time filtering to cached results
  const filteredResults = data.results.filter((item: Content) => !isForbidden(item, language));
  return {
    results: filteredResults,
    page: data.page,
    total_pages: data.total_pages,
  };
};
