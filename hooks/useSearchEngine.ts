
import { useState, useCallback } from 'react';
import { Content } from '../types';
import { fetchData } from '../services/tmdbService';
import { API_KEY, FORBIDDEN_KEYWORDS_EN, FORBIDDEN_KEYWORDS_KU } from '../constants';
import { supabase } from '../utils/supabaseClient';
import { db } from '../utils/db';
import { bannedService } from '../services/bannedService';

/**
 * Advanced Scoring Engine (Multi-pass Relevance)
 */
const calculateSearchRelevance = (query: string, item: Content): number => {
  const q = query.toLowerCase().trim();
  const title = (item.title || item.name || '').toLowerCase();
  const overview = (item.overview || '').toLowerCase();
  const popularity = (item as any).popularity || 0;
  
  if (!q) return 0;

  let score = 0;

  if (title === q) score += 5000; 
  if (title.startsWith(q)) score += 1000;
  if (title.includes(q)) score += 500;

  const qTokens = q.split(/\s+/).filter(t => t.length > 2);
  const titleTokens = title.split(/\s+/);
  
  let matchCount = 0;
  qTokens.forEach(token => {
    if (titleTokens.includes(token)) {
      score += 400;
      matchCount++;
    } else if (title.includes(token)) {
      score += 200;
      matchCount++;
    } else if (overview.includes(token)) {
      score += 40;
    }
  });

  if (qTokens.length > 1 && matchCount >= qTokens.length * 0.8) {
    score += 1000;
  }

  score += Math.min(popularity / 2, 100);

  return score;
};

export const useSearchEngine = (language: 'en' | 'ku' | 'badini') => {
  const [results, setResults] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBlockedQuery, setIsBlockedQuery] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const langCode = (language === 'ku' || language === 'badini') ? 'ku' : 'en-US';

  const executeSearch = useCallback(async (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setIsBlockedQuery(false);
      setIsProcessing(false);
      return;
    }

    const queryLower = trimmed.toLowerCase();
    const keywords = (language === 'ku' || language === 'badini') ? FORBIDDEN_KEYWORDS_KU : FORBIDDEN_KEYWORDS_EN;
    const isBlocked = keywords.some(keyword => queryLower.includes(keyword));

    if (isBlocked) {
      setIsBlockedQuery(true);
      setResults([]);
      setLoading(false);
      setIsProcessing(false);
      return;
    }

    setIsBlockedQuery(false);
    setLoading(true);
    setIsProcessing(true);
    
    try {
      const endpoint = `/search/multi?api_key=${API_KEY}&language=${langCode}&query=${encodeURIComponent(trimmed)}&page=1&include_adult=false`;
      
      const [tmdbData, cachedMovies] = await Promise.all([
        fetchData(endpoint, language),
        (async () => {
          const local = await db.getMovies();
          if (local && local.length > 0) return local;
          
          // Fallback to Supabase directly if local is empty
          const { data } = await supabase.from('dubbed_movies').select('*').limit(20);
          if (data) {
              db.saveMovies(data).catch(() => {});
              return data;
          }
          return [];
        })()
      ]);

      let combinedResults: any[] = [];

      // Pass A: TMDB Results
      let tmdbResults: any[] = [];
      if (tmdbData && Array.isArray(tmdbData)) {
        tmdbResults = tmdbData
          .filter((item: Content) => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path)
          .map((item: Content, index: number) => ({
            ...item,
            _relevanceScore: calculateSearchRelevance(trimmed, item) + Math.max(50, 100 - index)
          }));
      }

      // Pass A-2: High-Performance Merge (Always fetch English results in Kurdish mode to maximize coverage of all regions)
      if (language === 'ku' || language === 'badini') {
        const engEndpoint = `/search/multi?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(trimmed)}&page=1&include_adult=false`;
        const engData = await fetchData(engEndpoint, 'en');
        if (engData && Array.isArray(engData)) {
            const extraEngResults = engData
                .filter((item: Content) => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path)
                .map((item: Content, index: number) => ({
                    ...item,
                    _relevanceScore: calculateSearchRelevance(trimmed, item) + Math.max(50, 100 - index)
                }));
            tmdbResults = [...tmdbResults, ...extraEngResults];
        }
      }

      combinedResults = [...tmdbResults];

      // Pass B: Local Dubbed Archive (for speed and offline reliability)
      if (cachedMovies && cachedMovies.length > 0) {
        const bannedIds = await bannedService.fetchBannedList();
        const dubbedMatches = cachedMovies
          .filter((m: any) => {
            if (bannedIds.has(String(m.id))) return false;
            const t = (m.title || m.kurdishTitle || '').toLowerCase();
            const o = (m.overview || m.kurdishOverview || '').toLowerCase();
            return t.includes(queryLower) || o.includes(queryLower);
          })
          .map((m: any) => ({
            ...m,
            media_type: 'dubbed',
            _relevanceScore: calculateSearchRelevance(trimmed, m) + 500 // Boost custom dubbed movies
          }));
        
        combinedResults = [...combinedResults, ...dubbedMatches];
      }

      // Deduplicate by ID and Sort
      const uniqueResults = Array.from(new Map(combinedResults.map(item => [item.id, item])).values());
      
      const rankedResults = uniqueResults
        .filter((item: any) => item._relevanceScore >= 20) // Lowered from 40 for higher inclusivity
        .sort((a: any, b: any) => {
          if (b._relevanceScore !== a._relevanceScore) {
              return b._relevanceScore - a._relevanceScore;
          }
          // Tie-breaker: Newest first based on ID
          const idA = typeof a.id === 'string' && a.id.startsWith('custom_') ? Number(a.id.replace('custom_', '')) : Number(a.id);
          const idB = typeof b.id === 'string' && b.id.startsWith('custom_') ? Number(b.id.replace('custom_', '')) : Number(b.id);
          if (!isNaN(idA) && !isNaN(idB)) return idB - idA;
          return 0;
        });
      
      setResults(rankedResults);
    } catch (error) {
      console.error("Neural search engine failure:", error);
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  }, [langCode, language]);

  return { results, loading, isBlockedQuery, isProcessing, executeSearch, setResults, setIsProcessing };
};
