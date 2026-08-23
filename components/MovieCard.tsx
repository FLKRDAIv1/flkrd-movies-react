import React, { memo, useState, forwardRef } from 'react';
import { Plus, Check, Trash2, X, Star, Share2, Mic2 } from 'lucide-react';
import { Content } from '../types';
import { IMAGE_BASE_URL_POSTER, API_KEY } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { bannedService } from '../services/bannedService';
import { fetchData } from '../services/tmdbService';
import { supabase } from '../utils/supabaseClient';
import { db } from '../utils/db';
import KurdishCCBadge from './KurdishCCBadge';
import ListMoviePreviewDrawer from './ListMoviePreviewDrawer';

interface MovieCardProps {
  item: Content | any;
  isMyListPage?: boolean;
  isProgressRow?: boolean;
  onRemove?: () => void;
  className?: string;
  mediaType?: 'movie' | 'tv' | 'dubbed';
}

const IS_TOUCH_DEVICE = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

const MovieCard = memo(
  forwardRef<HTMLDivElement, MovieCardProps>(
    ({ item, isMyListPage = false, isProgressRow = false, onRemove, className, mediaType = 'movie' }, ref) => {
      const { t, language } = useTranslation();
      const { addNotification } = useNotification();
      const { isAdmin } = useUI();
      const { user } = useAuth();

      const [isImgLoaded, setIsImgLoaded] = useState(false);
      const [isPreviewOpen, setIsPreviewOpen] = useState(false);
      const [isHovered, setIsHovered] = useState(false);
      const [isFocused, setIsFocused] = useState(false);

      const isCustom = item.isCustom || 'isCustom' in item;

      // Saved state
      const [isAdded, setIsAdded] = useState(() => {
        try {
          const list = JSON.parse(localStorage.getItem('myList') || '[]');
          return list.some((i: any) => String(i.id) === String(item.id));
        } catch {
          return false;
        }
      });

      const handleToggleMyList = (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
          const list = JSON.parse(localStorage.getItem('myList') || '[]');
          const idx = list.findIndex((i: any) => String(i.id) === String(item.id));
          if (idx > -1) {
            list.splice(idx, 1);
            setIsAdded(false);
            if (onRemove) onRemove();
            addNotification({
              type: 'info',
              title: t('myListRemoveSuccess') || 'Removed from List',
              message: item.title || item.name || '',
            });
          } else {
            list.push({ ...item, media_type: mediaType });
            setIsAdded(true);
            addNotification({
              type: 'success',
              title: t('myListAddSuccess') || 'Added to List',
              message: item.title || item.name || '',
            });
          }
          localStorage.setItem('myList', JSON.stringify(list));
          window.dispatchEvent(new Event('storage'));
        } catch (err) {
          console.error(err);
        }
      };

      const handleRemoveProgress = (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
          const progress = JSON.parse(localStorage.getItem('watchProgress') || '[]');
          const filtered = progress.filter((p: any) => String(p.id) !== String(item.id));
          localStorage.setItem('watchProgress', JSON.stringify(filtered));
          window.dispatchEvent(new Event('storage'));
          if (onRemove) onRemove();
          addNotification({
            type: 'info',
            title: 'Progress Removed',
            message: item.title || item.name || '',
          });
        } catch (err) {
          console.error(err);
        }
      };

      const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsPreviewOpen(true);
        }
      };

      const handleBan = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isAdmin) return;
        const confirmBan = window.confirm(`Ban/Delete "${item.title || item.name}" from FLKRD?`);
        if (!confirmBan) return;
        try {
          const rawId = String(item.id);
          const cleanId = rawId.replace('custom_', '');
          const dbId = rawId.startsWith('custom_') ? rawId : `custom_${rawId}`;
          
          // 1. If it's a dubbed or custom movie, delete it directly from Supabase dubbed_movies
          if (mediaType === 'dubbed' || isCustom || rawId.startsWith('custom_')) {
            await supabase.from('dubbed_movies').delete().or(`id.eq.${dbId},id.eq.${cleanId}`);
            try {
              await db.deleteMovie(dbId);
              await db.deleteMovie(cleanId);
            } catch {}
          }

          // 2. Add to banned registry
          await bannedService.banContent(
            cleanId,
            mediaType === 'tv' ? 'tv' : 'movie'
          );

          addNotification({ type: 'success', title: 'Content Removed', message: `${item.title || item.name} removed successfully.` });
          window.dispatchEvent(new CustomEvent('banned-list-updated'));
          if (onRemove) onRemove();
        } catch (err) {
          console.error('[CARD DELETE ERROR]', err);
          addNotification({ type: 'error', title: 'Action Failed', message: 'Could not complete deletion.' });
        }
      };

      const detailPath =
        mediaType === 'dubbed' || isCustom
          ? `/dubbed-details/${String(item.id).replace('custom_', '')}`
          : `/details/${mediaType}/${item.id}`;

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

      const handlePrefetch = () => {
        if (mediaType === 'dubbed' || isCustom) {
          import('../pages/DubbedDetailPage');
        } else {
          import('../pages/DetailPage');
          import('../pages/TVDetailPage');

          if (item.id) {
            const isTv = mediaType === 'tv';
            const endpoint = `/${isTv ? 'tv' : 'movie'}/${item.id}?api_key=${API_KEY}&language=en-US&append_to_response=credits,similar,recommendations,images,videos&include_image_language=en,null`;
            fetchData(endpoint, language).catch(() => {});
          }
        }
      };

      // Extract metadata
      const isRtl = language === 'ku' || language === 'badini';
      const title = isRtl && item.kurdishTitle ? item.kurdishTitle : item.title || item.name || '';
      const rating = item.vote_average || 0;
      const year = (item.release_date || item.first_air_date || '').split('-')[0] || '';
      const progressPct = 'progress' in item ? Math.min(100, (item.progress / (item.duration || 3600)) * 100) : 0;
      const imageSrc = item.imageBase64 || item.poster_path || '';
      const isActiveState = isHovered || isFocused;

      return (
        <>
          <div
            ref={ref}
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setIsPreviewOpen(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onMouseEnter={() => {
              setIsHovered(true);
              handlePrefetch();
            }}
            onMouseLeave={() => setIsHovered(false)}
            onPointerDown={handlePrefetch}
            className={`group/card relative cursor-pointer py-1 touch-manipulation focus:outline-none transform-gpu transition-all duration-200 hover:scale-[1.03] active:scale-95 ${
              className || 'w-full'
            }`}
          >
            {/* Seamless Cinematic Poster Card */}
            <div
              className={`relative aspect-[2/3] w-full rounded-2xl md:rounded-[1.75rem] overflow-hidden border transition-all duration-300 bg-neutral-950 shadow-xl ${
                isActiveState
                  ? 'border-brand/70 shadow-[0_12px_32px_rgba(229,9,20,0.35)] ring-1 ring-brand/30'
                  : 'border-white/10 hover:border-white/30 shadow-[0_8px_24px_rgba(0,0,0,0.6)]'
              }`}
            >
              {/* Image loader placeholder */}
              {!isImgLoaded && (
                <div className="absolute inset-0 bg-neutral-900 animate-pulse flex items-center justify-center z-10">
                  <div className="w-6 h-6 border-2 border-white/15 border-t-brand rounded-full animate-spin" />
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
                width={342}
                height={513}
                loading="lazy"
                decoding="async"
                onLoad={() => setIsImgLoaded(true)}
                className={`object-cover w-full h-full transition-transform duration-500 transform-gpu group-hover/card:scale-105 ${
                  isImgLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/default-poster.svg';
                  setIsImgLoaded(true);
                }}
              />

              {/* Top-to-bottom subtle shadow & Deep bottom vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />

              {/* Top Badges (IMDb Rating & Custom Badges) */}
              <div className="absolute top-2 left-2 md:top-3 md:left-3 z-20 flex flex-wrap items-center gap-1 pointer-events-none max-w-[70%]">
                {rating > 0 && (
                  <div className="flex items-center gap-1 bg-[#F5C518] text-black px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-md font-black text-[8px] md:text-[9.5px] shadow-md border border-[#F5C518]/60">
                    <span className="font-[1000] text-[7px] md:text-[8px] uppercase tracking-wider">IMDb</span>
                    <span>{rating.toFixed(1)}</span>
                  </div>
                )}

                {item.level ? (
                  <div
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7px] md:text-[8.5px] font-black uppercase tracking-wider shadow-md backdrop-blur-sm ${
                      item.level === 'KING'
                        ? 'bg-amber-500 text-black border border-amber-400/50'
                        : 'bg-brand text-white border border-brand/50'
                    }`}
                  >
                    {item.level === 'KING' && <Star size={7} fill="currentColor" />}
                    <span>{item.level}</span>
                  </div>
                ) : (
                  mediaType === 'dubbed' && (
                    <div className="flex items-center gap-1 bg-brand text-white px-1.5 py-0.5 rounded-md shadow-md border border-brand/50">
                      <Mic2 size={8} className="text-white" />
                      <span className="font-black text-[7px] md:text-[8.5px] leading-none uppercase">DUBBED</span>
                    </div>
                  )
                )}
              </div>

              {/* Action Buttons (List Add / Remove / Share / Ban) */}
              <div
                className={`absolute top-2 right-2 md:top-3 md:right-3 flex flex-col gap-1 z-30 transition-all duration-200 ${
                  isMyListPage || isProgressRow || isAdded || IS_TOUCH_DEVICE
                    ? 'opacity-100'
                    : 'opacity-0 group-hover/card:opacity-100'
                }`}
              >
                {isMyListPage && (
                  <button
                    onClick={handleToggleMyList}
                    className="p-1.5 md:p-2 bg-red-600/90 hover:bg-red-600 text-white rounded-lg shadow-lg border border-red-500/40 active:scale-90 transition-all"
                    aria-label={t('myListRemoveSuccess') || 'Remove from my list'}
                    title="Remove from List"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {!isProgressRow && !isMyListPage && (
                  <button
                    onClick={handleToggleMyList}
                    className={`p-1.5 md:p-2 rounded-lg transition-all shadow-lg active:scale-90 ${
                      isAdded
                        ? 'bg-brand text-white border border-brand/60'
                        : 'bg-black/75 backdrop-blur-md text-white border border-white/20 hover:bg-black/95'
                    }`}
                    aria-label={
                      isAdded
                        ? t('myListRemoveSuccess') || 'Remove from my list'
                        : t('myListAddSuccess') || 'Add to my list'
                    }
                  >
                    {isAdded ? <Check className="w-3.5 h-3.5" strokeWidth={3.5} /> : <Plus className="w-3.5 h-3.5" strokeWidth={3.5} />}
                  </button>
                )}

                {isProgressRow && (
                  <button
                    onClick={handleRemoveProgress}
                    className="p-1.5 md:p-2 bg-red-600/90 hover:bg-red-600 text-white rounded-lg shadow-lg border border-red-500/40 active:scale-90 transition-all"
                    aria-label="Remove watch progress"
                    title="Remove from progress"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={3.5} />
                  </button>
                )}

                <button
                  onClick={handleShare}
                  className="p-1.5 md:p-2 rounded-lg bg-black/75 backdrop-blur-md text-white border border-white/20 hover:bg-black/95 shadow-lg active:scale-90 transition-all"
                  aria-label="Share movie"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>

                {isAdmin && (
                  <button
                    onClick={handleBan}
                    className="p-1.5 md:p-2 bg-red-950/80 hover:bg-red-700 text-red-300 hover:text-white rounded-lg shadow-lg border border-red-700/50 active:scale-90 transition-all"
                    aria-label="Ban content from global registry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Bottom Progress Bar for Watch Progress */}
              {isProgressRow && progressPct > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/70 z-20 overflow-hidden">
                  <div className="h-full bg-brand shadow-[0_0_8px_rgba(229,9,20,0.8)]" style={{ width: `${progressPct}%` }} />
                </div>
              )}

              {/* Clean Integrated Title & Badges Overlay at Bottom */}
              <div className="absolute bottom-0 inset-x-0 p-2.5 md:p-3.5 z-20 flex flex-col justify-end pointer-events-none">
                {/* Kurdish CC Badge */}
                {!isCustom && (
                  <div className="mb-1">
                    <KurdishCCBadge tmdbId={Number(item.id)} type={mediaType === 'tv' ? 'tv' : 'movie'} />
                  </div>
                )}

                <h4
                  className={`text-xs md:text-[13px] text-white font-extrabold line-clamp-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] transition-colors group-hover/card:text-brand ${
                    isRtl ? 'font-kurdish leading-snug font-bold' : 'tracking-tight leading-snug'
                  }`}
                >
                  {title}
                </h4>

                <div className="flex items-center justify-between mt-1 text-[8px] md:text-[9.5px] font-bold text-white/70">
                  <span className="text-brand font-[1000] tracking-wider uppercase text-[7px] md:text-[8.5px]">FLKRD</span>
                  {year && <span className="text-white/75 font-semibold text-[8px] md:text-[9.5px]">{year}</span>}
                </div>
              </div>
            </div>
          </div>

          <ListMoviePreviewDrawer
            item={item}
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
          />
        </>
      );
    }
  )
);

MovieCard.displayName = 'MovieCard';

export { MovieCard };
export default MovieCard;
