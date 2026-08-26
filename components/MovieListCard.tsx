import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Plus, Check, Star, Mic2, Film, Share2, Trash2, X } from 'lucide-react';
import { MyListItem } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { useUI } from '../contexts/UIContext';
import { bannedService } from '../services/bannedService';
import { supabase } from '../utils/supabaseClient';
import { db } from '../utils/db';
import KurdishCCBadge from './KurdishCCBadge';
import { BorderBeam } from './ui/border-beam';
import { ListMoviePreviewDrawer } from './ListMoviePreviewDrawer';
import { getMediaType } from '../services/tmdbService';
import { IMAGE_BASE_URL_POSTER } from '../constants';
import { isItemInMyList, toggleMyList, subscribeMyList } from '../utils/myListStorage';

interface MovieListCardProps {
  item: any;
  type?: 'movie' | 'tv' | 'dubbed';
  isProgressRow?: boolean;
  isMyListPage?: boolean;
  onRemove?: (item: any) => void;
  className?: string;
}

const IS_TOUCH_DEVICE = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export const MovieListCard: React.FC<MovieListCardProps> = React.memo(({ item, type, isProgressRow, isMyListPage, onRemove, className = '' }) => {
  const navigate = useNavigate();
  const { language, t } = useTranslation();
  const { addNotification } = useNotification();
  const { isAdmin } = useUI();

  const [isAdded, setIsAdded] = useState(() => isItemInMyList(item.id));
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isImgLoaded, setIsImgLoaded] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const isCustom = String(item.id).startsWith('custom_');
  const mediaType = isCustom ? 'dubbed' : (type || getMediaType(item));

  useEffect(() => {
    setIsAdded(isItemInMyList(item.id));
    return subscribeMyList(() => {
      setIsAdded(isItemInMyList(item.id));
    });
  }, [item.id]);

  const handleToggleMyList = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { added } = toggleMyList(item, mediaType);
    setIsAdded(added);

    if (added) {
      addNotification({ type: 'success', title: t('notificationsSuccessTitle'), message: t('myListAddSuccess') });
    } else {
      if (onRemove) onRemove(item);
      addNotification({ type: 'info', title: t('notificationsInfoTitle') || 'Removed', message: t('myListRemoveSuccess') });
    }
  };

  const handleRemoveProgress = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const progress = JSON.parse(localStorage.getItem('watchProgress') || '[]');
      const cleanItemId = String(item.id).replace('custom_', '');
      const itemType = mediaType || item.media_type || item.type;
      const filtered = progress.filter((i: any) => {
        const iCleanId = String(i.id).replace('custom_', '');
        const iType = i.type || i.media_type;
        if (iCleanId === cleanItemId) {
          if (iType && itemType) {
            return String(iType) !== String(itemType);
          }
          return false;
        }
        return true;
      });
      localStorage.setItem('watchProgress', JSON.stringify(filtered));
      if (onRemove) onRemove(item);
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('watchProgressUpdated'));
      addNotification({ 
        type: 'info', 
        title: language === 'ku' || language === 'badini' ? 'سڕایەوە' : (t('notificationsInfoTitle') || 'Removed'), 
        message: language === 'ku' || language === 'badini' ? 'لە بەردەوامی سەیرکردن سڕایەوە' : (t('removeFromProgress') || 'Removed from continue watching') 
      });
    } catch (err) {
      console.error(err);
    }
  };

  const detailPath =
    mediaType === 'dubbed' || isCustom
      ? `/dubbed-details/${String(item.id).replace('custom_', '')}`
      : `/details/${mediaType}/${item.id}`;

  const navigateToDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPreviewOpen(true);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareTitle = item.title || item.name || 'FLKRD Movie';
    const shareText = [
      shareTitle,
      item.vote_average ? `⭐ ${item.vote_average.toFixed(1)}` : '',
      (item.release_date || item.first_air_date || '').split('-')[0] || '',
      item.overview ? item.overview.slice(0, 120) + (item.overview.length > 120 ? '…' : '') : '',
    ].filter(Boolean).join(' · ');
    const shareUrl = `https://flkrd.pro/#${detailPath}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
      } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        addNotification({ type: 'success', title: 'Link Copied!', message: shareTitle });
      } catch {
        addNotification({ type: 'error', title: 'Share Failed', message: 'Cannot copy link.' });
      }
    }
  };

  const handleBan = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;
    const cleanId = String(item.id).replace('custom_', '');
    const rawId = String(item.id);
    const dbId = rawId.startsWith('custom_') ? rawId : `custom_${rawId}`;

    if (!window.confirm(`TERMINATE NODE ${cleanId}? [GLOBAL DELETE]`)) return;
    try {
      if (isCustom || mediaType === 'dubbed' || rawId.startsWith('custom_')) {
        await supabase.from('dubbed_movies').delete().or(`id.eq.${dbId},id.eq.${cleanId}`);
        try {
          await db.deleteMovie(dbId);
          await db.deleteMovie(cleanId);
        } catch {}
      }

      await bannedService.banContent(cleanId, mediaType);
      addNotification({ type: 'success', title: 'NODE PURGED', message: 'Content removed globally.' });
      window.dispatchEvent(new CustomEvent('banned-list-updated'));
      if (onRemove) onRemove();
    } catch (err) {
      console.error('Moderation failure:', err);
      addNotification({ type: 'error', title: 'SIGNAL FAILED', message: 'Deletion error.' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsPreviewOpen(true);
    }
  };

  // Metadata Extraction
  const isRtl = language === 'ku' || language === 'badini';
  const title = isRtl && item.kurdishTitle ? item.kurdishTitle : item.title || item.name || '';
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const year = (item.release_date || item.first_air_date || '').split('-')[0] || 'N/A';
  const overview = item.overview || item.description || '';
  const isDubbed = mediaType === 'dubbed' || isCustom;
  const imageSrc = item.poster_path || item.backdrop_path || item.imageBase64 || '';
  const isActiveState = isHovered || isFocused;

  return (
    <motion.div
      tabIndex={0}
      onClick={() => setIsPreviewOpen(true)}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group/listcard relative w-full rounded-2xl sm:rounded-3xl cursor-pointer overflow-visible transform-gpu will-change-transform touch-manipulation focus:outline-none ${className}`}
      whileHover={!IS_TOUCH_DEVICE ? { scale: 1.012, x: isRtl ? -3 : 3 } : undefined}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
    >
      {/* Outer Shell Card Container (Always Horizontal Flex Row) */}
      <div
        className={`relative w-full rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 bg-neutral-950/90 border transition-all duration-300 backdrop-blur-md flex flex-row items-center gap-3 sm:gap-6 overflow-hidden ${
          isActiveState
            ? 'border-brand/40 shadow-[0_15px_40px_rgba(229,9,20,0.35)]'
            : 'border-white/10 hover:border-brand/30 shadow-[0_8px_25px_rgba(0,0,0,0.6)]'
        }`}
      >
        {/* Apple / Gemini AI Glowing Border Beam on Active Hover/Focus (Desktop Only) */}
        {isActiveState && !IS_TOUCH_DEVICE && (
          <BorderBeam size={300} duration={8} borderWidth={2} colorFrom="#e50914" colorTo="#9c40ff" glow={true} />
        )}

        {/* Visual Poster Artwork Window (Sleek side thumbnail on mobile) */}
        <div className="relative w-24 min-w-[6rem] sm:w-44 md:w-52 h-36 sm:h-auto aspect-[2/3] sm:aspect-[16/10] md:aspect-[16/10] rounded-xl sm:rounded-2xl overflow-hidden bg-neutral-900 flex-shrink-0 border border-white/10 group-hover/listcard:border-brand/40">
          {!isImgLoaded && (
            <div className="absolute inset-0 bg-neutral-800 animate-pulse flex items-center justify-center z-10">
              <div className="w-5 h-5 border-2 border-white/10 border-t-brand rounded-full animate-spin" />
            </div>
          )}

          <img
            src={
              imageSrc && (imageSrc.startsWith('http') || imageSrc.startsWith('data:'))
                ? imageSrc
                : imageSrc
                ? `${IMAGE_BASE_URL_POSTER}${imageSrc}`
                : '/default-poster.svg'
            }
            alt={title}
            loading="lazy"
            decoding="async"
            onLoad={() => setIsImgLoaded(true)}
            className={`object-cover w-full h-full transition-all duration-500 transform-gpu group-hover/listcard:scale-105 ${
              isImgLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Floating Rating Badge */}
          {rating && (
            <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-20 flex items-center gap-0.5 sm:gap-1 bg-[#F5C518] text-black px-1.5 py-0.5 rounded-md shadow-md">
              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-black" />
              <span className="font-black text-[10px] sm:text-xs leading-none">{rating}</span>
            </div>
          )}

          {/* Floating Dubbed Badge */}
          {isDubbed && (
            <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 z-20 flex items-center gap-0.5 sm:gap-1 bg-brand text-white px-1.5 py-0.5 rounded-md shadow-md text-[8px] sm:text-[10px] font-black uppercase">
              <Mic2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>DUBBED</span>
            </div>
          )}
        </div>

        {/* Metadata Details Column */}
        <div className={`flex-1 min-w-0 flex flex-col gap-1 sm:gap-2 ${isRtl ? 'text-right' : 'text-left'}`}>
          {/* Micro Badges & Year Row */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-neutral-400">
            <span className="flex items-center gap-1 text-white/80">
              <Film className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-70" />
              <span>{year}</span>
            </span>

            {mediaType === 'tv' && (item.season || item.episode) && (
              <span className="bg-red-600/90 text-white px-2 py-0.5 rounded font-black text-[10px] tracking-tight">
                {isRtl ? `وەرزی ${item.season || 1} • ئەڵقەی ${item.episode || 1}` : `S${item.season || 1}:E${item.episode || 1}`}
              </span>
            )}

            {!isCustom && (
              <div className="scale-90 origin-left">
                <KurdishCCBadge tmdbId={Number(item.id)} type={mediaType === 'tv' ? 'tv' : 'movie'} />
              </div>
            )}
          </div>

          {/* Movie Title */}
          <h3
            className={`text-sm sm:text-xl md:text-2xl font-black text-white group-hover/listcard:text-brand transition-colors line-clamp-1 ${
              isRtl ? 'font-kurdish leading-snug' : 'tracking-tight'
            }`}
          >
            {title}
          </h3>

          {/* Overview Text */}
          {overview && (
            <p
              className={`text-[11px] sm:text-sm text-neutral-300 line-clamp-2 md:line-clamp-3 ${
                isRtl ? 'font-kurdish leading-relaxed' : 'leading-relaxed'
              }`}
            >
              {overview}
            </p>
          )}

          {/* Action CTAs — flex-wrap so all buttons show on mobile */}
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 pt-1 sm:pt-2">
            {/* Play */}
            <button
              onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); navigate(detailPath, { state: { customData: item } }); }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-brand hover:bg-brand/90 text-white font-bold text-[10px] sm:text-xs rounded-lg shadow-[0_4px_15px_rgba(229,9,20,0.4)] cursor-pointer transform-gpu active:scale-95 transition-transform shrink-0"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              <Play className="w-3 h-3 fill-white shrink-0" />
              <span className={`hidden sm:inline ${isRtl ? 'font-kurdish' : 'uppercase tracking-wider'}`}>
                {t('play') || 'Play'}
              </span>
            </button>

            {/* Remove from Progress */}
            {isProgressRow && (
              <button
                onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); handleRemoveProgress(e as any); }}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold border bg-red-600/80 hover:bg-red-600 text-white border-red-500/50 backdrop-blur-md transition-colors cursor-pointer active:scale-95 shrink-0"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                aria-label="Remove progress"
                title="Remove from progress"
              >
                <X className="w-3 h-3 shrink-0" />
                <span className={`hidden sm:inline ${isRtl ? 'font-kurdish' : 'uppercase tracking-wider'}`}>
                  {isRtl ? 'سڕینەوە' : 'Remove'}
                </span>
              </button>
            )}

            {/* My List / Remove */}
            {isMyListPage ? (
              <button
                onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); handleToggleMyList(e as any); }}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold border bg-red-600/80 hover:bg-red-600 text-white border-red-500/50 backdrop-blur-md transition-colors cursor-pointer active:scale-90 shrink-0 shadow-lg"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                aria-label={t('myListRemoveSuccess') || 'Remove'}
                title="Remove from List"
              >
                <Trash2 className="w-3 h-3 shrink-0" />
                <span className={`hidden sm:inline ${isRtl ? 'font-kurdish' : 'uppercase tracking-wider'}`}>
                  {isRtl ? 'سڕینەوە' : 'Remove'}
                </span>
              </button>
            ) : (
              <button
                onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); handleToggleMyList(e as any); }}
                onClick={(e) => e.stopPropagation()}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold border transition-colors cursor-pointer active:scale-95 shrink-0 ${
                  isAdded
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white/10 text-white border-white/15 backdrop-blur-md'
                }`}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                {isAdded ? <Check className="w-3 h-3 shrink-0" /> : <Plus className="w-3 h-3 shrink-0" />}
                <span className={`hidden sm:inline ${isRtl ? 'font-kurdish' : 'uppercase tracking-wider'}`}>
                  {isAdded ? (t('myListRemoveSuccess') || 'Saved') : (t('myListAddSuccess') || 'List')}
                </span>
              </button>
            )}

            {/* Share */}
            <button
              onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); handleShare(e as any); }}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold border bg-white/10 text-white border-white/15 backdrop-blur-md transition-colors cursor-pointer active:scale-95 shrink-0"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              aria-label="Share movie"
            >
              <Share2 className="w-3 h-3 shrink-0" />
              <span className={`hidden sm:inline ${isRtl ? 'font-kurdish' : 'uppercase tracking-wider'}`}>
                {isRtl ? 'هاوبەشکردن' : 'Share'}
              </span>
            </button>

            {/* Admin ban button */}
            {isAdmin && (
              <button
                onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); handleBan(e as any); }}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold border bg-red-900/60 hover:bg-red-700/80 text-red-300 hover:text-white border-red-700/50 backdrop-blur-md transition-colors cursor-pointer active:scale-95 shrink-0"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                aria-label="Ban content globally"
              >
                <Trash2 className="w-3 h-3 shrink-0" />
                <span className="hidden sm:inline uppercase tracking-wider">Ban</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Side Preview Drawer when clicked */}
      <ListMoviePreviewDrawer
        item={item}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </motion.div>
  );
});

MovieListCard.displayName = 'MovieListCard';

export default MovieListCard;
