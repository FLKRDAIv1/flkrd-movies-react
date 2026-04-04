
import { useState, useCallback } from 'react';
import { Content } from '../types';
import { fetchData } from '../services/tmdbService';
import { API_KEY, FORBIDDEN_KEYWORDS_EN, FORBIDDEN_KEYWORDS_KU } from '../constants';
import { supabase } from '../utils/supabaseClient';
import { db } from '../utils/db';

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

export const useSearchEngine = (language: 'en' | 'ku') => {
  const [results, setResults] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBlockedQuery, setIsBlockedQuery] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const langCode = language === 'ku' ? 'ku' : 'en-US';

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
    const keywords = language === 'ku' ? FORBIDDEN_KEYWORDS_KU : FORBIDDEN_KEYWORDS_EN;
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
      
      // 1. Parallel Fetch: TMDB + Local Archive + Supabase
      const [tmdbData, cachedMovies] = await Promise.all([
        fetchData(endpoint, language),
        db.getMovies()
      ]);

      let combinedResults: any[] = [];

      // Pass A: TMDB Results
      if (tmdbData && Array.isArray(tmdbData)) {
        combinedResults = tmdbData
          .filter((item: Content) => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path)
          .map((item: Content) => ({
            ...item,
            _relevanceScore: calculateSearchRelevance(trimmed, item)
          }));
      }

      // Pass B: Local Dubbed Archive (for speed and offline reliability)
      if (cachedMovies && cachedMovies.length > 0) {
        const dubbedMatches = cachedMovies
          .filter((m: any) => {
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
        .filter((item: any) => item._relevanceScore > 40)
        .sort((a: any, b: any) => b._relevanceScore - a._relevanceScore);
      
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
