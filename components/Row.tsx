import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Check, Play, Loader2, Sparkles } from 'lucide-react';
import { Content, WatchProgress, MyListItem } from '../types';
import { fetchData } from '../services/tmdbService';
import { IMAGE_BASE_URL_POSTER } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { useUI } from '../contexts/UIContext';

interface RowProps {
  title: string;
  fetchUrl?: string;
  type?: 'movie' | 'tv';
  items?: (Content | WatchProgress | MyListItem)[];
  isProgressRow?: boolean;
}

const Row: React.FC<RowProps> = ({ title, fetchUrl, type, items, isProgressRow }) => {
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
  const { theme } = useUI();
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
      setContent(items);
      setLoading(false);
      setHasMore(false);
    } else if (fetchUrl) {
      setLoading(true);
      const data = await fetchData(getPagedUrl(fetchUrl, 1), language);
      if (data && Array.isArray(data) && data.length > 0) {
        setContent(data);
        setPage(1);
        setHasMore(data.length >= 15); 
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
    return () => window.removeEventListener('storage', updateMyListIds);
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
    const mType = item.media_type || (item as WatchProgress).type || type;
    if (mType === 'dubbed') {
      navigate(`/dubbed-details/${item.id}`, { state: { customData: item } });
    } else {
      navigate(`/details/${mType}/${item.id}`);
    }
  };

  if (loading) return (
    <div className="mb-12 px-8">
        <div className="h-8 w-64 bg-white/5 rounded-full mb-8 animate-pulse" />
        <div className="flex gap-5 overflow-hidden">
            {[1,2,3,4,5,6].map(i => <div key={i} className="flex-shrink-0 w-32 md:w-56 aspect-[2/3] bg-white/5 rounded-[2rem] animate-pulse" />)}
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
                <div className="relative rounded-[2rem] md:rounded-[3.5rem] overflow-hidden border-2 border-border-color transition-all duration-500 hover:border-brand bg-card-bg shadow-xl">
                  <img
                    src={item.poster_path.startsWith('http') ? item.poster_path : `${IMAGE_BASE_URL_POSTER}${item.poster_path}`}
                    alt={(item as Content).title || (item as Content).name}
                    className="object-cover w-full h-full transition-transform duration-700 group-hover/card:scale-105"
                    loading="lazy"
                  />

                  <div className="absolute top-4 right-4 flex flex-col gap-2 z-30 opacity-0 group-hover/card:opacity-100 transition-all duration-300">
                      {!isProgressRow && (
                        <button
                          onClick={(e) => handleToggleMyList(e, item, mediaType as 'movie' | 'tv')}
                          className={`p-2 rounded-xl backdrop-blur-3xl border transition-all ${isAdded ? 'bg-brand text-white border-brand' : 'bg-black/60 text-white border-white/10'}`}
                        >
                          {isAdded ? <Check className="w-4 h-4" strokeWidth={4} /> : <Plus className="w-4 h-4" strokeWidth={4} />}
                        </button>
                      )}
                      
                      {isProgressRow && (
                          <button
                              onClick={(e) => handleRemoveProgress(e, item.id, String(mediaType))}
                              className="p-2 bg-brand border border-brand rounded-xl text-white"
                          >
                              <X className="w-4 h-4" strokeWidth={4} />
                          </button>
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
                    <div className="w-1 h-12 bg-white/10 rounded-full" />
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Row;