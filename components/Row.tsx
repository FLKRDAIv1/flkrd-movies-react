import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Check, Play, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { Content, WatchProgress, MyListItem } from '../types';
import { fetchData, clearTMDBCache } from '../services/tmdbService';
import { IMAGE_BASE_URL_POSTER } from '../constants';
import { supabase } from '../utils/supabaseClient';
import { useTranslation } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { useUI } from '../contexts/UIContext';
import { bannedService } from '../services/bannedService';
import KurdishCCBadge from './KurdishCCBadge';
import { LiquidButton } from './ui/liquid-glass-button';

interface RowProps {
  title: string;
  fetchUrl?: string;
  type?: 'movie' | 'tv';
  items?: (Content | WatchProgress | MyListItem)[];
  isProgressRow?: boolean;
  limit?: number;
}

const Row: React.FC<RowProps> = ({ title, fetchUrl, type, items, isProgressRow, limit }) => {
  const [content, setContent] = useState<(Content | WatchProgress | MyListItem)[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [myListIds, setMyListIds] = useState<Set<number>>(new Set());
  
  const navigate = useNavigate();
  const rowRef = useRef<HTMLDivElement>(null);
  const { language, t } = useTranslation();
  const { theme, isAdmin } = useUI();
  const { addNotification } = useNotification();

  const updateMyListIds = useCallback(() => {
    const myList = JSON.parse(localStorage.getItem('myList') || '[]');
    setMyListIds(new Set(myList.map((item: any) => item.id)));
  }, []);

  const getPagedUrl = (baseUrl: string, pageNum: number) => {
    const connector = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${connector}page=${pageNum}`;
  };

  const loadInitialData = async () => {
    updateMyListIds();
    setHasError(false);
    if (items) {
      const filteredItems = items.filter(item => {
          const itemId = String(item.id).replace('custom_', '');
          return !bannedService.isBanned(itemId);
      });
      setContent(filteredItems);
      setLoading(false);
      setHasMore(false);
    } else if (fetchUrl) {
      setLoading(true);
      const data = await fetchData(getPagedUrl(fetchUrl, 1), language);
      if (data && Array.isArray(data)) {
        // data coming from fetchData is already filtered by isForbidden
        setContent(limit ? data.slice(0, limit) : data);
        setPage(1);
        setHasMore(limit ? false : data.length >= 15); 
      } else if (data === null) {
        setHasError(true);
      } else {
        setContent([]);
        setHasMore(false);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    window.addEventListener('storage', updateMyListIds);
    window.addEventListener('banned-list-updated', loadInitialData);
    return () => {
        window.removeEventListener('storage', updateMyListIds);
        window.removeEventListener('banned-list-updated', loadInitialData);
    };
  }, [fetchUrl, items, language, updateMyListIds]);

  const handleToggleMyList = (e: React.MouseEvent, item: any, mediaType: 'movie' | 'tv') => {
    e.stopPropagation();
    let myList: MyListItem[] = JSON.parse(localStorage.getItem('myList') || '[]');
    const index = myList.findIndex(i => i.id === item.id);
    
    if (index > -1) {
      myList.splice(index, 1);
    } else {
      myList.push({ 
        id: item.id, 
        media_type: mediaType, 
        title: item.title || item.name || '', 
        poster_path: item.poster_path 
      });
    }
    
    localStorage.setItem('myList', JSON.stringify(myList));
    updateMyListIds();
    window.dispatchEvent(new Event('storage'));
  };

  const handleRemoveProgress = (e: React.MouseEvent, id: number, mediaType: string) => {
      e.stopPropagation();
      const progress = JSON.parse(localStorage.getItem('watchProgress') || '[]');
      const filtered = progress.filter((item: any) => !(item.id === id && String(item.type) === mediaType));
      localStorage.setItem('watchProgress', JSON.stringify(filtered));
      setContent(prev => prev.filter(item => !(item.id === id && (item as any).type === mediaType)));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('watchProgressUpdated'));
  };

  const handleBan = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    const cleanId = String(item.id).replace('custom_', '');
    const isCustom = String(item.id).startsWith('custom_');
    const mediaType = item.media_type || (item as WatchProgress).type || type || (isCustom ? 'dubbed' : 'movie');

    if (!window.confirm(`TERMINATE NODE ${cleanId}? [GLOBAL BAN]`)) return;

    try {
        // 1. Universal Ban Registry
        const banSignal = await bannedService.banContent(cleanId, mediaType);
        if (!banSignal) throw new Error("Registry reject");

        // 2. Dubbed Physical Deletion (if applicable)
        if (isCustom) {
            await supabase.rpc('delete_dubbed_movie', { target_id: parseInt(cleanId) });
        }
        
        addNotification({ type: 'success', title: 'NODE PURGED', message: 'Content removed from global registry.' });
        clearTMDBCache();
        setContent(prev => prev.filter(i => i.id !== item.id));
    } catch (err) {
        console.error("Moderation failure:", err);
        addNotification({ type: 'error', title: 'SIGNAL FAILED', message: 'Database refused termination protocol.' });
    }
  };

  const handleScroll = useCallback(async () => {
    if (rowRef.current && fetchUrl && hasMore && !loadingMore) {
        const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
        const isNearEnd = scrollWidth - scrollLeft - clientWidth < 600;

        if (isNearEnd) {
            setLoadingMore(true);
            const nextPage = page + 1;
            const data = await fetchData(getPagedUrl(fetchUrl, nextPage), language);
            if (data && Array.isArray(data) && data.length > 0) {
                setContent(prev => {
                    const existingIds = new Set(prev.map(i => i.id));
                    const uniqueNewItems = data.filter(i => !existingIds.has(i.id));
                    return [...prev, ...uniqueNewItems];
                });
                setPage(nextPage);
                if (data.length < 15) setHasMore(false);
            } else {
                setHasMore(false);
            }
            setLoadingMore(false);
        }
    }
  }, [fetchUrl, hasMore, loadingMore, page, language]);

  const navigateToDetail = (item: any) => {
    const isCustom = String(item.id).startsWith('custom_');
    const mType = item.media_type || (item as WatchProgress).type || type || (isCustom ? 'dubbed' : 'movie');
    
    if (mType === 'dubbed' || isCustom) {
      navigate(`/dubbed-details/${String(item.id).replace('custom_', '')}`, { state: { customData: item } });
    } else {
      navigate(`/details/${mType}/${item.id}`, { state: { customData: item } });
    }
  };

  if (loading) return (
    <div className="mb-12 px-8">
        <div className="h-8 w-64 bg-main-text/5 rounded-full mb-8 animate-pulse" />
        <div className="flex gap-5 overflow-hidden">
            {[1,2,3,4,5,6].map(i => <div key={i} className="flex-shrink-0 w-32 md:w-56 aspect-[2/3] bg-main-text/5 rounded-[2rem] animate-pulse" />)}
        </div>
    </div>
  );
  
  if (hasError || !content || content.length === 0) return null;

  return (
    <div className="mb-10 md:mb-20 px-4 md:px-20 relative z-20 overflow-visible">
      {title && (
        <div className="flex items-center justify-between mb-8">
            <h2 className={`text-xl md:text-4xl font-[1000] flex items-center uppercase text-main-text ${language !== 'ku' ? 'italic tracking-tighter' : ''}`}>
                <span className="w-1 md:w-2 h-8 md:h-12 bg-brand rounded-full me-4 md:me-6 shadow-[0_0_15px_brand]" />
                <span className="shimmer-text">{title}</span>
            </h2>
        </div>
      )}
      
      <div className="relative group overflow-visible">
        <div 
          ref={rowRef} 
          onScroll={handleScroll} 
          className="flex overflow-x-scroll scrollbar-hide space-x-4 md:space-x-8 py-4 px-1 scroll-smooth overflow-visible"
        >
          {content.map((item, index) => {
              const mediaType = (item as Content).media_type || (item as WatchProgress).type || type;
              if (!item.poster_path || !mediaType) return null;
              const isAdded = myListIds.has(item.id);
              const hasProgress = 'progress' in item;
              const progressPct = hasProgress ? Math.min(100, ((item as WatchProgress).progress / ((item as WatchProgress).duration || 3600)) * 100) : 0;
              
              return (
              <motion.div
                key={`${item.id}-${index}-${mediaType}`}
                onClick={() => navigateToDetail(item)}
                className="flex-shrink-0 w-36 md:w-64 group/card relative cursor-pointer"
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                <div className="relative rounded-[2rem] md:rounded-[3.5rem] overflow-hidden border-2 border-border-color transition-all duration-500 hover:border-brand shadow-xl">
                  <img
                    src={(item.poster_path.startsWith('http') || item.poster_path.startsWith('data:')) ? item.poster_path : `${IMAGE_BASE_URL_POSTER}${item.poster_path}`}
                    alt={(item as Content).title || (item as Content).name}
                    className="object-cover w-full h-full transition-transform duration-700 group-hover/card:scale-105"
                    loading="lazy"
                  />

                  {/* Liquid Glass Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-md opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-10 pointer-events-none border border-main-text/10" />

                  {/* IMDb Badge */}
                  {(item as Content).vote_average !== undefined && (item as Content).vote_average > 0 && (
                    <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-[#F5C518] text-black px-2 py-1 rounded-md shadow-[0_4px_10px_rgba(0,0,0,0.5)] border border-[#F5C518]/50">
                      <span className="font-[1000] text-[8px] md:text-[10px] uppercase tracking-widest leading-none">IMDb</span>
                      <span className="font-black text-[10px] md:text-xs leading-none">{(item as Content).vote_average.toFixed(1)}</span>
                    </div>
                  )}

                  {/* Kurdish CC Badge (Auto-detect via queue) */}
                  {!String(item.id).startsWith('custom_') && (
                    <div className="z-20 relative">
                      <KurdishCCBadge tmdbId={Number(item.id)} type={mediaType as 'movie' | 'tv'} />
                    </div>
                  )}

                  <div className="absolute top-4 right-4 flex flex-col gap-2 z-30 opacity-0 group-hover/card:opacity-100 transition-all duration-300">
                      {!isProgressRow && (
                        <LiquidButton
                          variant={isAdded ? "default" : "secondary"}
                          onClick={(e) => handleToggleMyList(e, item, mediaType as 'movie' | 'tv')}
                          className={`!p-2 !h-auto !w-auto !min-h-0 !min-w-0 rounded-xl transition-all ${isAdded ? 'bg-brand text-white' : 'text-white'}`}
                        >
                          {isAdded ? <Check className="w-4 h-4" strokeWidth={4} /> : <Plus className="w-4 h-4" strokeWidth={4} />}
                        </LiquidButton>
                      )}
                      
                      {isProgressRow && (
                          <LiquidButton
                              variant="default"
                              onClick={(e) => handleRemoveProgress(e, item.id, String(mediaType))}
                              className="!p-2 !h-auto !w-auto !min-h-0 !min-w-0 bg-brand text-white rounded-xl"
                          >
                              <X className="w-4 h-4" strokeWidth={4} />
                          </LiquidButton>
                      )}

                      {isAdmin && (
                        <LiquidButton
                          variant="destructive"
                          onClick={(e) => handleBan(e, item)}
                          className="!p-2 !h-auto !w-auto !min-h-0 !min-w-0 rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </LiquidButton>
                      )}
                  </div>

                  {hasProgress && (
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60 z-20 overflow-hidden">
                          <div className="h-full bg-brand" style={{ width: `${progressPct}%` }} />
                      </div>
                  )}
                </div>
              </motion.div>
            )}
          )}

          {hasMore && (
            <div className="flex-shrink-0 w-32 md:w-48 flex items-center justify-center p-8">
                {loadingMore ? (
                    <Loader2 className="w-8 h-8 text-brand animate-spin" />
                ) : (
                    <div className="w-1 h-12 bg-main-text/10 rounded-full" />
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Row;