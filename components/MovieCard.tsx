import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Plus, Check, X, Trash2, Mic2 } from 'lucide-react';
import { MyListItem, WatchProgress } from '../types';
import { bannedService } from '../services/bannedService';
import { supabase } from '../utils/supabaseClient';
import { useTranslation } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { useUI } from '../contexts/UIContext';
import KurdishCCBadge from './KurdishCCBadge';
import { LiquidButton } from './ui/liquid-glass-button';
import { IMAGE_BASE_URL_POSTER } from '../constants';

interface MovieCardProps {
  item: any; // Can be Content, WatchProgress, or MyListItem
  type?: 'movie' | 'tv' | 'dubbed';
  isProgressRow?: boolean;
  className?: string;
}

export const MovieCard = React.forwardRef<HTMLDivElement, MovieCardProps>(
  ({ item, type, isProgressRow, className }, ref) => {
  const navigate = useNavigate();
  const { language, t } = useTranslation();
  const { addNotification } = useNotification();
  const { isAdmin, glassConfig = {
    redOpacity: 0.15,
    darkOpacity: 0.85,
    blurAmount: 20,
    saturation: 120,
    borderOpacity: 0.1,
    aberrationIntensity: 0.5
  } } = useUI();
  const [isAdded, setIsAdded] = useState(false);

  const isCustom = String(item.id).startsWith('custom_');
  const mediaType = item.media_type || (item as any).type || type || (isCustom ? 'dubbed' : 'movie');

  const updateMyListIds = useCallback(() => {
    const myList = JSON.parse(localStorage.getItem('myList') || '[]');
    setIsAdded(myList.some((i: any) => i.id === item.id));
  }, [item.id]);

  useEffect(() => {
    updateMyListIds();
    window.addEventListener('storage', updateMyListIds);
    return () => window.removeEventListener('storage', updateMyListIds);
  }, [updateMyListIds]);

  const handleToggleMyList = (e: React.MouseEvent) => {
    e.stopPropagation();
    let myList: MyListItem[] = JSON.parse(localStorage.getItem('myList') || '[]');
    const index = myList.findIndex(i => i.id === item.id);
    
    if (index > -1) {
      myList.splice(index, 1);
      setIsAdded(false);
      addNotification({ type: 'success', title: t('notificationsSuccessTitle'), message: t('myListRemoveSuccess') });
    } else {
      myList.push({ 
        id: item.id, 
        media_type: mediaType === 'dubbed' ? 'movie' : (mediaType as 'movie' | 'tv'), 
        title: item.title || item.name || '', 
        poster_path: item.poster_path 
      });
      setIsAdded(true);
      addNotification({ type: 'success', title: t('notificationsSuccessTitle'), message: t('myListAddSuccess') });
    }
    
    localStorage.setItem('myList', JSON.stringify(myList));
    window.dispatchEvent(new Event('storage'));
  };

  const handleRemoveProgress = (e: React.MouseEvent) => {
      e.stopPropagation();
      const progress = JSON.parse(localStorage.getItem('watchProgress') || '[]');
      const filtered = progress.filter((i: any) => !(i.id === item.id && String(i.type) === mediaType));
      localStorage.setItem('watchProgress', JSON.stringify(filtered));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('watchProgressUpdated'));
  };

  const handleBan = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanId = String(item.id).replace('custom_', '');

    if (!window.confirm(`TERMINATE NODE ${cleanId}? [GLOBAL BAN]`)) return;

    try {
        const banSignal = await bannedService.banContent(cleanId, mediaType);
        if (!banSignal) throw new Error("Registry reject");

        if (isCustom) {
            await supabase.rpc('delete_dubbed_movie', { target_id: String(item.id) });
        }
        
        addNotification({ type: 'success', title: 'NODE PURGED', message: 'Content removed from global registry.' });
        window.dispatchEvent(new CustomEvent('banned-list-updated'));
    } catch (err) {
        console.error("Moderation failure:", err);
        addNotification({ type: 'error', title: 'SIGNAL FAILED', message: 'Database refused termination protocol.' });
    }
  };

  const navigateToDetail = () => {
    if (mediaType === 'dubbed' || isCustom) {
      navigate(`/dubbed-details/${String(item.id).replace('custom_', '')}`, { state: { customData: item } });
    } else {
      navigate(`/details/${mediaType}/${item.id}`, { state: { customData: item } });
    }
  };

  const handlePrefetch = () => {
    if (isCustom || mediaType === 'dubbed') {
      import('../pages/DubbedDetailPage');
    } else {
      import('../pages/DetailPage');
      import('../pages/TVDetailPage');
    }
  };

  // Extract metadata
  const isRtl = language === 'ku' || language === 'badini';
  const title = (isRtl && item.kurdishTitle) ? item.kurdishTitle : (item.title || item.name || '');
  const rating = item.vote_average || 0;
  const year = (item.release_date || item.first_air_date || '').split('-')[0] || 'N/A';
  const progressPct = 'progress' in item ? Math.min(100, (item.progress / (item.duration || 3600)) * 100) : 0;
  const imageSrc = item.imageBase64 || item.poster_path || '';

  return (
    <motion.div
      ref={ref}
      onClick={navigateToDetail}
      onMouseEnter={handlePrefetch}
      className={`flex-shrink-0 group/card relative cursor-pointer py-2 overflow-visible ${className || 'w-44 md:w-72'}`}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.04, y: -6 }}
      whileTap={{ scale: 0.96 }}
      transition={{
          type: "spring",
          stiffness: 260,
          damping: 20
      }}
    >
      {/* Pokemon trading card frame */}
      <div 
        className="relative aspect-[2/3] w-full rounded-[2.2rem] md:rounded-[3.2rem] overflow-hidden border-2 border-white/5 transition-all duration-500 shadow-xl bg-neutral-950 p-2 flex flex-col hover:border-brand/40 group-hover/card:shadow-[0_20px_40px_rgba(var(--brand-red-rgb),0.15)]"
        style={{
          boxShadow: `
            0 15px 35px rgba(0, 0, 0, 0.6),
            inset 0 1px 1px rgba(255, 255, 255, 0.05)
          `
        }}
      >
        {/* Holographic shimmer sheen sweep overlay */}
        <div 
          className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none z-20 mix-blend-overlay"
          style={{
            background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.1) 60%, rgba(255,255,255,0) 70%, transparent 100%)',
            backgroundSize: '250% 250%',
            animation: 'holographic-sweep 3s linear infinite'
          }}
        />
        <style>
          {`
            @keyframes holographic-sweep {
              0% { background-position: -100% -100%; }
              100% { background-position: 200% 200%; }
            }
          `}
        </style>

        {/* Poster artwork window with inner border */}
        <div className="relative flex-1 w-full rounded-[1.6rem] md:rounded-[2.4rem] overflow-hidden border border-white/10 bg-neutral-900 group-hover/card:border-brand/20">
          <img
            src={(imageSrc && (imageSrc.startsWith('http') || imageSrc.startsWith('data:'))) ? imageSrc : (imageSrc ? `${IMAGE_BASE_URL_POSTER}${imageSrc}` : 'https://raw.githubusercontent.com/flkrd/cdn/main/default-poster.webp')}
            alt={title}
            className="object-cover w-full h-full transition-transform duration-700 group-hover/card:scale-105"
            loading="lazy"
          />

          {/* Liquid Glass Hover Overlay */}
          <div 
            className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-all duration-500 z-10 pointer-events-none border"
            style={{
              background: 'transparent',
              borderColor: 'rgba(255, 255, 255, 0.15)',
              boxShadow: `
                inset 0 1px 0 0 rgba(255, 255, 255, 0.1)
              `,
              transform: 'translate3d(0, 0, 0)'
            }}
          />

          {/* IMDb Rating Badge */}
          {rating > 0 && (
            <div className="absolute top-2 left-2 md:top-4 md:left-4 z-20 flex items-center gap-1 md:gap-1.5 bg-[#F5C518] text-black px-1.5 py-0.5 md:px-2 md:py-1 rounded-md shadow-[0_4px_10px_rgba(0,0,0,0.5)] border border-[#F5C518]/30">
              <span className="font-[1000] text-[7px] md:text-[10px] uppercase tracking-widest leading-none">IMDb</span>
              <span className="font-black text-[8px] md:text-xs leading-none">{rating.toFixed(1)}</span>
            </div>
          )}

          {/* Kurdish CC Badge (Auto-detect via queue) */}
          {!isCustom && (
            <div className="z-20 relative">
              <KurdishCCBadge tmdbId={Number(item.id)} type={mediaType === 'tv' ? 'tv' : 'movie'} />
            </div>
          )}

          {/* Level Rank Badge */}
          {item.level ? (
            <div className={`absolute top-2 left-2 md:top-4 md:left-4 z-20 flex items-center gap-1 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md text-[7px] md:text-[9px] font-black uppercase tracking-widest shadow-[0_4px_10px_rgba(0,0,0,0.5)] backdrop-blur-sm ${item.level === 'KING' ? 'bg-yellow-500 text-black border border-yellow-500/30' : 'bg-brand text-white border border-brand/30'}`}>
              {item.level === 'KING' && <Star size={8} fill="currentColor" className="md:w-2.5 md:h-2.5" />}
              <span>{item.level}</span>
            </div>
          ) : (
            /* Dubbed Label */
            mediaType === 'dubbed' && (
              <div className="absolute top-2 left-2 md:top-4 md:left-4 z-20 flex items-center gap-1 md:gap-1.5 bg-brand text-white px-1.5 py-0.5 md:px-2 md:py-1 rounded-md shadow-[0_4px_10px_rgba(0,0,0,0.5)] border border-brand/30">
                <Mic2 size={10} className="text-white" />
                <span className="font-black text-[8px] md:text-xs leading-none">DUBBED</span>
              </div>
            )
          )}

          {/* Action Buttons */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-30 opacity-0 group-hover/card:opacity-100 transition-all duration-300">
            {!isProgressRow && (
              <LiquidButton
                variant={isAdded ? "default" : "secondary"}
                onClick={handleToggleMyList}
                className={`!p-2 !h-auto !w-auto !min-h-0 !min-w-0 rounded-xl transition-all ${isAdded ? 'bg-brand text-white' : 'text-white'}`}
              >
                {isAdded ? <Check className="w-4 h-4" strokeWidth={4} /> : <Plus className="w-4 h-4" strokeWidth={4} />}
              </LiquidButton>
            )}
            
            {isProgressRow && (
              <LiquidButton
                variant="default"
                onClick={handleRemoveProgress}
                className="!p-2 !h-auto !w-auto !min-h-0 !min-w-0 bg-brand text-white rounded-xl"
              >
                <X className="w-4 h-4" strokeWidth={4} />
              </LiquidButton>
            )}

            {isAdmin && (
              <LiquidButton
                variant="destructive"
                onClick={handleBan}
                className="!p-2 !h-auto !w-auto !min-h-0 !min-w-0 rounded-xl"
              >
                <Trash2 className="w-4 h-4" />
              </LiquidButton>
            )}
          </div>

          {/* Bottom Progress Bar */}
          {isProgressRow && progressPct > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60 z-20 overflow-hidden">
              <div className="h-full bg-brand" style={{ width: `${progressPct}%` }} />
            </div>
          )}
        </div>

        {/* Pokemon trading card details footer */}
        <div 
          className="mt-2 px-1.5 py-1.5 flex flex-col gap-0.5 rounded-2xl border"
          style={{
            background: `radial-gradient(circle at 50% 0%, rgba(var(--brand-red-rgb), ${glassConfig.redOpacity * 0.7}), transparent 90%), rgba(10, 10, 10, ${glassConfig.darkOpacity * 0.9})`,
            backdropFilter: `blur(${glassConfig.blurAmount * 0.4}px)`,
            borderColor: `rgba(var(--brand-red-rgb), ${glassConfig.borderOpacity * 0.7})`,
            boxShadow: `
              inset 0 1px 0 0 rgba(255, 255, 255, ${glassConfig.borderOpacity * 0.15}),
              0 4px 10px rgba(0, 0, 0, 0.4)
            `
          }}
        >
          {/* Card Title */}
          <h4 className="text-[9px] md:text-sm font-black text-white truncate leading-tight tracking-tight text-center">
            {title}
          </h4>

          {/* Metadata Row */}
          <div className="flex items-center justify-between mt-0.5 text-[7px] md:text-[9px] font-bold text-sec-text px-0.5">
            {/* Card Subtitle/Brand */}
            <span className="text-brand font-[1000] tracking-widest text-[6px] md:text-[8px] uppercase italic shimmer-text">
              FLKRD STUDIO
            </span>

            {/* Year Badge */}
            <span className="text-white/60 font-bold uppercase tracking-tighter">
              {year}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

MovieCard.displayName = 'MovieCard';

export default MovieCard;
