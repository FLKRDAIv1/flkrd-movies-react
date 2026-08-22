"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Star, Sparkles, Loader2, TrendingUp } from 'lucide-react';
import { API_KEY, IMAGE_BASE_URL_POSTER } from '../../constants';
import { fetchData, isForbidden, getMediaType } from '../../services/tmdbService';
import KurdishCCBadge from '../KurdishCCBadge';
import { ListMoviePreviewDrawer } from '../ListMoviePreviewDrawer';

/* ---------- Types ---------- */
export interface Category {
  id: string;
  label: string;
  icon: React.ReactNode;
  activeColor?: string;
  activeTextColor?: string;
  onClick?: () => void;
  to?: string;
}

export interface MorphingDiscoveryBarProps {
  categories: Category[];
  activeCategoryId?: string;
  onCategorySelect?: (category: Category) => void;
  onSearchSubmit?: (query: string) => void;
  placeholder?: string;
  className?: string;
  isRtl?: boolean;
}

export const MorphingDiscoveryBar: React.FC<MorphingDiscoveryBarProps> = ({
  categories,
  activeCategoryId,
  onCategorySelect,
  onSearchSubmit,
  placeholder = "گەڕان بۆ فیلم و زنجیرە...",
  className = "",
  isRtl = false,
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [internalActiveTab, setInternalActiveTab] = useState(categories[0]?.id || '');
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [trendingSuggestions, setTrendingSuggestions] = useState<any[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [selectedPreviewItem, setSelectedPreviewItem] = useState<any | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const lastCloseTimeRef = useRef<number>(0);

  const activeTab = activeCategoryId !== undefined ? activeCategoryId : internalActiveTab;

  useEffect(() => {
    if (isSearching) {
      const timer = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
  }, [isSearching]);

  // Close search on outside tap
  useEffect(() => {
    if (!isSearching) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        handleCloseSearch(e);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isSearching]);

  // Fetch Trending suggestions when search opens
  useEffect(() => {
    if (isSearching && trendingSuggestions.length === 0) {
      let isMounted = true;
      const fetchTrending = async () => {
        try {
          const lang = isRtl ? 'ku-TR' : 'en-US';
          const res = await fetchData(`/trending/all/day?api_key=${API_KEY}&language=${lang}&include_adult=false`, 'ku');
          if (Array.isArray(res) && isMounted) {
            const clean = res.filter((item: any) => !isForbidden(item, 'ku'));
            setTrendingSuggestions(clean.slice(0, 6));
          }
        } catch (e) {
          console.warn('Failed to load trending suggestions', e);
        }
      };
      fetchTrending();
      return () => { isMounted = false; };
    }
  }, [isSearching, trendingSuggestions.length, isRtl]);

  // Live Real-Time Search Debouncing
  useEffect(() => {
    if (!isSearching) return;

    const trimmed = searchValue.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsLoadingResults(false);
      return;
    }

    setIsLoadingResults(true);
    const timer = setTimeout(async () => {
      try {
        const lang = isRtl ? 'ku-TR' : 'en-US';
        const endpoint = `/search/multi?api_key=${API_KEY}&language=${lang}&query=${encodeURIComponent(trimmed)}&include_adult=false&page=1`;
        const res = await fetchData(endpoint, 'ku');
        
        if (Array.isArray(res)) {
          const filtered = res.filter((item: any) => 
            (item.media_type === 'movie' || item.media_type === 'tv') && 
            (item.poster_path || item.backdrop_path || item.title || item.name) &&
            !isForbidden(item, 'ku')
          );
          setSearchResults(filtered.slice(0, 8));
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.warn('Realtime search error:', err);
        setSearchResults([]);
      } finally {
        setIsLoadingResults(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchValue, isSearching, isRtl]);

  const handleCategoryClick = useCallback((cat: Category, e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (Date.now() - lastCloseTimeRef.current < 300) {
      return;
    }
    setInternalActiveTab(cat.id);
    if (onCategorySelect) {
      onCategorySelect(cat);
    }
    if (cat.onClick) {
      cat.onClick();
    }
  }, [onCategorySelect]);

  const handleItemSelect = (item: any) => {
    setSelectedPreviewItem(item);
    handleCloseSearch();
  };

  const handleCloseSearch = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    lastCloseTimeRef.current = Date.now();
    setIsSearching(false);
    setSearchValue("");
    setSearchResults([]);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      if (onSearchSubmit) {
        onSearchSubmit(searchValue.trim());
      }
      handleCloseSearch();
    }
  };

  return (
    <>
      <div 
        ref={searchContainerRef}
        className={`relative w-full flex items-center justify-center p-1 sm:p-2 bg-transparent select-none transform-gpu ${className}`} 
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* REAL-TIME FLOATING SEARCH RESULTS FLYOUT PANEL */}
        <AnimatePresence>
          {isSearching && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-[calc(100%+10px)] left-2 right-2 sm:left-4 sm:right-4 max-h-[58vh] bg-neutral-950/95 border border-white/15 rounded-3xl p-4 overflow-y-auto shadow-[0_25px_70px_rgba(0,0,0,0.9)] z-[100] flex flex-col gap-3 text-white transform-gpu"
              style={{
                WebkitOverflowScrolling: 'touch',
                overscrollBehaviorY: 'contain'
              }}
            >
              {/* Header Label */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  {searchValue.trim() ? (
                    <Sparkles className="w-4 h-4 text-red-500 animate-pulse" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
                    {searchValue.trim()
                      ? (isRtl ? 'ئەنجامەکانی گەڕان' : 'Live Results')
                      : (isRtl ? 'پێشنیازەکانی ترێندینگ' : 'Trending Suggestions')}
                  </span>
                </div>

                {isLoadingResults && (
                  <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                )}
              </div>

              {/* Live Search Results List */}
              {searchValue.trim() ? (
                searchResults.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {searchResults.map((item) => {
                      const title = isRtl && item.kurdishTitle ? item.kurdishTitle : item.title || item.name || '';
                      const poster = item.poster_path || item.backdrop_path || '';
                      const rating = item.vote_average ? Number(item.vote_average).toFixed(1) : null;
                      const year = (item.release_date || item.first_air_date || '').split('-')[0] || '';
                      const mediaType = getMediaType(item);

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleItemSelect(item)}
                          className="flex items-center gap-3 p-2 rounded-2xl bg-white/5 hover:bg-red-600/20 border border-white/10 hover:border-red-500/40 cursor-pointer active:scale-98 transition-all group"
                        >
                          <img
                            src={
                              poster
                                ? `${IMAGE_BASE_URL_POSTER}${poster}`
                                : '/default-poster.svg'
                            }
                            alt={title}
                            loading="lazy"
                            decoding="async"
                            className="w-10 h-14 rounded-xl object-cover border border-white/10 shrink-0 group-hover:scale-105 transition-transform"
                          />
                          <div className="min-w-0 flex-1 flex flex-col gap-1 text-left" dir={isRtl ? 'rtl' : 'ltr'}>
                            <h4 className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors">
                              {title}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-semibold">
                              {rating && (
                                <div className="flex items-center gap-1 bg-[#F5C518] text-black px-1.5 py-0.5 rounded text-[9px] font-black">
                                  <Star className="w-2.5 h-2.5 fill-black" />
                                  <span>{rating}</span>
                                </div>
                              )}
                              {year && <span>{year}</span>}
                              <span className="uppercase text-red-500 font-black text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                                {mediaType === 'tv' ? 'TV' : 'MOVIE'}
                              </span>
                              <KurdishCCBadge tmdbId={Number(item.id)} type={mediaType === 'tv' ? 'tv' : 'movie'} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : !isLoadingResults ? (
                  <div className="py-6 text-center text-xs text-zinc-400 font-bold">
                    {isRtl ? 'هیچ ئەنجامێک نەدۆزرایەوە' : 'No titles found'}
                  </div>
                ) : null
              ) : (
                /* Trending Suggestions List when search input is empty */
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {trendingSuggestions.map((item) => {
                    const title = isRtl && item.kurdishTitle ? item.kurdishTitle : item.title || item.name || '';
                    const poster = item.poster_path || item.backdrop_path || '';
                    const rating = item.vote_average ? Number(item.vote_average).toFixed(1) : null;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleItemSelect(item)}
                        className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer active:scale-95 transition-all group"
                      >
                        <img
                          src={
                            poster
                              ? `${IMAGE_BASE_URL_POSTER}${poster}`
                              : '/default-poster.svg'
                          }
                          alt={title}
                          loading="lazy"
                          decoding="async"
                          className="w-9 h-12 rounded-lg object-cover border border-white/10 shrink-0 group-hover:scale-105 transition-transform"
                        />
                        <div className="min-w-0 flex-1 flex flex-col gap-0.5 text-left" dir={isRtl ? 'rtl' : 'ltr'}>
                          <p className="text-[11px] font-bold text-white truncate group-hover:text-red-400 transition-colors">
                            {title}
                          </p>
                          {rating && (
                            <span className="text-[9px] font-black text-[#F5C518]">⭐ {rating}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOTTOM FLOATING DYNAMIC ISLAND CAPSULE */}
        <div className="flex items-center justify-center h-14 sm:h-16 w-full max-w-md px-1">
          <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-neutral-950/90 border border-white/15 shadow-[0_12px_36px_rgba(0,0,0,0.85)] max-w-full overflow-hidden transform-gpu">
            
            {/* SEARCH EXPANDABLE PILL */}
            <div
              className={`relative flex items-center transition-all duration-300 rounded-full ${
                isSearching
                  ? 'w-[calc(100vw-88px)] max-w-xs sm:max-w-sm h-11 bg-neutral-900 border border-red-500/60 shadow-[0_0_18px_rgba(239,68,68,0.35)]'
                  : 'w-11 h-11 bg-neutral-900/90 border border-white/15 hover:border-red-500/40'
              }`}
            >
              <div className="flex items-center justify-between w-full px-2.5 h-full relative">
                <button
                  type="button"
                  onClick={() => {
                    if (!isSearching) setIsSearching(true);
                  }}
                  className="flex items-center justify-center shrink-0 w-6 h-6 focus:outline-none touch-manipulation cursor-pointer"
                  aria-label="Search"
                >
                  <Search
                    size={17}
                    strokeWidth={2.5}
                    className={`transition-colors ${
                      isSearching ? 'text-red-500' : 'text-zinc-300 hover:text-white'
                    }`}
                  />
                </button>

                {isSearching && (
                  <input
                    ref={inputRef}
                    placeholder={placeholder}
                    className="bg-transparent border-none outline-none w-full text-xs font-semibold mx-1.5 text-white placeholder:text-zinc-500 focus:ring-0"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                  />
                )}

                {isSearching && searchValue && (
                  <button
                    type="button"
                    onClick={() => setSearchValue('')}
                    className="text-zinc-400 hover:text-white p-1 rounded-full transition-colors shrink-0 touch-manipulation"
                  >
                    <X size={14} />
                  </button>
                )}

                {!isSearching && (
                  <button
                    type="button"
                    className="absolute inset-0 z-10 w-full h-full cursor-pointer focus:outline-none"
                    onClick={() => setIsSearching(true)}
                    aria-label="Open Search"
                  />
                )}
              </div>
            </div>

            {/* NAVIGATION CATEGORY TABS */}
            {!isSearching ? (
              <div className="flex-1 flex items-center justify-between gap-1 min-w-0">
                {categories.map((cat) => {
                  const isActive = activeTab === cat.id;
                  const activeTextColor = cat.activeTextColor || '#ef4444';

                  return (
                    <button
                      key={cat.id}
                      onClick={(e) => handleCategoryClick(cat, e)}
                      title={cat.label}
                      aria-label={cat.label}
                      className="relative py-2.5 px-3 rounded-full flex flex-col items-center justify-center transition-transform duration-150 active:scale-90 focus:outline-none touch-manipulation flex-1 min-w-0 cursor-pointer"
                      style={{
                        color: isActive ? activeTextColor : undefined,
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-island-pill"
                          className="absolute inset-0 z-0 rounded-full bg-red-600/15 border border-red-500/40 shadow-[0_0_16px_rgba(239,68,68,0.3)]"
                          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                        />
                      )}
                      <span
                        className={`relative z-10 shrink-0 transition-transform duration-200 ${
                          isActive
                            ? 'text-red-500 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {cat.icon}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => handleCloseSearch(e)}
                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 bg-neutral-900 border border-white/15 text-zinc-300 hover:text-white hover:border-red-500/50 shadow-md cursor-pointer touch-manipulation"
                aria-label="Close Search"
              >
                <X size={17} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* EXPANDABLE PREVIEW MODAL */}
      <ListMoviePreviewDrawer
        item={selectedPreviewItem}
        isOpen={!!selectedPreviewItem}
        onClose={() => setSelectedPreviewItem(null)}
      />
    </>
  );
};