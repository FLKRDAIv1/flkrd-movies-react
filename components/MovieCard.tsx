import React, { memo, useState, forwardRef } from 'react';
import { Plus, Check, Trash2, X, Star, Share2, Mic2 } from 'lucide-react';
import { Content } from '../types';
import { IMAGE_BASE_URL_POSTER, API_KEY } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { bannedService } from '../services/bannedService';
import { fetchData, getMediaType } from '../services/tmdbService';
import { supabase } from '../utils/supabaseClient';
import { db } from '../utils/db';
import KurdishCCBadge from './KurdishCCBadge';
import ListMoviePreviewDrawer from './ListMoviePreviewDrawer';

interface MovieCardProps {
  item: Content | any;
  isMyListPage?: boolean;
  isProgressRow?: boolean;
  onRemove?: (item?: any) => void;
  className?: string;
  mediaType?: 'movie' | 'tv' | 'dubbed';
  type?: 'movie' | 'tv' | 'dubbed';
}

const IS_TOUCH_DEVICE = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

const MovieCard = memo(
  forwardRef<HTMLDivElement, MovieCardProps>(
    ({ item, isMyListPage = false, isProgressRow = false, onRemove, className, mediaType: propMediaType, type }, ref) => {
      const mediaType = propMediaType || type || 'movie';
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
          const cleanId = String(item.id).replace('custom_', '');
          const idx = list.findIndex((i: any) => String(i.id).replace('custom_', '') === cleanId);
          if (idx > -1) {
            list.splice(idx, 1);
            setIsAdded(false);
            if (onRemove) onRemove(item);
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
          const cleanItemId = String(item.id).replace('custom_', '');
          const itemType = mediaType || item.media_type || item.type;
          const filtered = progress.filter((p: any) => {
            const pCleanId = String(p.id).replace('custom_', '');
            const pType = p.type || p.media_type;
            if (pCleanId === cleanItemId) {
              if (pType && itemType) {
                return String(pType) !== String(itemType);
              }
              return false;
            }
            return true;
          });
          localStorage.setItem('watchProgress', JSON.stringify(filtered));
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('watchProgressUpdated'));
          if (onRemove) onRemove(item);
          addNotification({
            type: 'info',
            title: language === 'ku' || language === 'badini' ? 'سڕایەوە' : 'Removed',
            message: language === 'ku' || language === 'badini' ? 'لە بەردەوامی سەیرکردن سڕایەوە' : (item.title || item.name || 'Removed from continue watching'),
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

      const isOwnerOrAdmin = isAdmin || 
        (typeof window !== 'undefined' && (
          localStorage.getItem('isFlkrdAdmin') === 'true' ||
          localStorage.getItem('flkrd_admin_email')?.toLowerCase() === 'flkrdstudio@gmail.com'
        )) || 
        user?.email?.toLowerCase() === 'flkrdstudio@gmail.com';

      const handleBan = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isOwnerOrAdmin) return;
        const isKurdish = language === 'ku' || language === 'badini';
        const confirmMsg = isKurdish 
          ? `ئایا دڵنیایت لە بلۆککردن و سڕینەوەی «${item.title || item.name}» لە تەواوی سیستم؟` 
          : `Are you sure you want to ban and block "${item.title || item.name}" from the app?`;
        if (!window.confirm(confirmMsg)) return;
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

      // Extract metadata with accurate media type detection (prevents TMDB 404 errors)
      const isRtl = language === 'ku' || language === 'badini';
      const effectiveMediaType = mediaType === 'dubbed' 
        ? 'dubbed' 
        : (item?.media_type === 'tv' || item?.media_type === 'movie' 
            ? item.media_type 
            : (mediaType === 'tv' ? 'tv' : getMediaType(item)));

      const title = isRtl && item.kurdishTitle ? item.kurdishTitle : item.title || item.name || '';
      const rating = item.vote_average || 0;
      const year = (item.release_date || item.first_air_date || '').split('-')[0] || '';
      const progressPct = 'progress' in item ? Math.min(100, (item.progress / (item.duration || 3600)) * 100) : 0;
      const imageSrc = item.imageBase64 || item.poster_path || '';
      const isActiveState = isHovered || isFocused;

      const handlePrefetch = () => {
        if (effectiveMediaType === 'dubbed' || isCustom) {
          import('../pages/DubbedDetailPage');
        } else {
          import('../pages/DetailPage');
          import('../pages/TVDetailPage');

          if (item.id) {
            const isTv = effectiveMediaType === 'tv';
            const endpoint = `/${isTv ? 'tv' : 'movie'}/${item.id}?api_key=${API_KEY}&language=en-US&append_to_response=credits,similar,recommendations,images,videos&include_image_language=en,null`;
            fetchData(endpoint, language).catch(() => {});
          }
        }
      };

      return (
        <>
          <div
            ref={ref}
            onClick={(e) => {
              e.stopPropagation();
              setIsPreviewOpen(true);
            }}
            onKeyDown={handleKeyDown}
            onMouseEnter={() => {
              setIsHovered(true);
              handlePrefetch();
            }}
            onMouseLeave={() => setIsHovered(false)}
            className={`group/card relative cursor-pointer py-0.5 touch-manipulation focus:outline-none transition-transform duration-160 ease-out md:hover:scale-[1.03] active:scale-[0.97] select-none ${
              className ? className : 'w-full min-w-0'
            } overflow-hidden`}
          >
            {/* Cinematic Apple-Design Poster Card */}
            <div
              style={{ aspectRatio: '2/3' }}
              className={`relative card-poster-aspect w-full rounded-2xl md:rounded-[1.25rem] overflow-hidden apple-card-sheen transition-[border-color,box-shadow,transform] duration-200 ease-out bg-neutral-900 ${
                isActiveState
                  ? 'border-red-500/70 shadow-[0_12px_32px_rgba(229,9,20,0.35)] ring-1 ring-red-500/30'
                  : 'border-white/10 hover:border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.4)]'
              }`}
            >
              {/* Image loader placeholder */}
              {!isImgLoaded && (
                <div className="absolute inset-0 bg-neutral-900 animate-pulse flex items-center justify-center z-10">
                  <div className="w-5 h-5 border-2 border-white/10 border-t-red-500 rounded-full animate-spin" />
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
                className={`object-cover w-full h-full transition-[transform,opacity] duration-300 ease-out group-hover/card:scale-105 ${
                  isImgLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/default-poster.svg';
                  setIsImgLoaded(true);
                }}
              />

              {/* Seamless Apple Dark Gradient Overlay for legible bottom titles */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none opacity-90 group-hover/card:opacity-100 transition-opacity" />

              {/* Top Badges (Sleek Apple Glass Rating & Tags) */}
              <div className="absolute top-2 left-2 md:top-2.5 md:left-2.5 z-20 flex flex-wrap items-center gap-1.5 pointer-events-none" dir="ltr">
                {rating > 0 && (
                  <div className="flex items-center gap-1 bg-black/65 backdrop-blur-xl text-amber-400 px-2 py-0.5 rounded-full font-bold text-[8.5px] md:text-[9.5px] shadow-sm border border-white/15" dir="ltr">
                    <Star size={8.5} className="fill-amber-400 text-amber-400 shrink-0" />
                    <span dir="ltr" className="font-mono font-bold leading-none">{Number(rating).toFixed(1)}</span>
                  </div>
                )}

                {item.level === 'KING' ? (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] md:text-[8.5px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400/90 to-yellow-500/90 text-zinc-950 border border-amber-300/40 shadow-sm backdrop-blur-xl">
                    <Star size={7.5} fill="currentColor" />
                    <span>KING</span>
                  </div>
                ) : item.level && item.level !== 'NEW' ? (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] md:text-[8.5px] font-extrabold uppercase tracking-wider bg-red-600/80 text-white border border-white/20 shadow-sm backdrop-blur-xl">
                    <span>{item.level}</span>
                  </div>
                ) : effectiveMediaType === 'dubbed' ? (
                  <div className="flex items-center gap-1 bg-black/60 backdrop-blur-xl text-white px-2 py-0.5 rounded-full shadow-sm border border-white/15">
                    <Mic2 size={8} className="text-red-400" />
                    <span className="font-bold text-[7.5px] md:text-[8px] uppercase tracking-wider">{isRtl ? 'دۆبلاژ' : 'DUBBED'}</span>
                  </div>
                ) : null}
              </div>

              {/* Admin Instant Ban Action Badge - Always Visible & Operable for Admins */}
              {isOwnerOrAdmin && (
                <button
                  type="button"
                  onClick={handleBan}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute top-2 right-2 z-40 px-2 py-1 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-xl shadow-[0_4px_16px_rgba(220,38,38,0.7)] border border-red-400/80 backdrop-blur-xl transition-all cursor-pointer flex items-center gap-1 active:scale-90 pointer-events-auto"
                  title={language === 'ku' || language === 'badini' ? 'بلۆککردن و سڕینەوەی فیلم (ئەدمین)' : 'Admin: Block & Ban Movie'}
                  aria-label="Admin Ban Movie"
                >
                  <Trash2 className="w-3.5 h-3.5 text-white" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-white">
                    {language === 'ku' || language === 'badini' ? 'بلۆک' : 'Ban'}
                  </span>
                </button>
              )}

              {/* Action Buttons (List Add / Remove / Share) - Cleanly visible on progress row & list page */}
              <div
                className={`absolute ${isOwnerOrAdmin ? 'top-10 right-2' : 'top-2 right-2 md:top-3 md:right-3'} flex flex-col gap-1 z-30 transition-all duration-200 ${
                  isMyListPage || isProgressRow
                    ? 'opacity-100 pointer-events-auto'
                    : 'opacity-0 md:group-hover/card:opacity-100 pointer-events-none md:group-hover/card:pointer-events-auto'
                }`}
              >
                {isMyListPage && (
                  <button
                    onClick={handleToggleMyList}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-1.5 md:p-2 bg-red-600/90 hover:bg-red-600 active:bg-red-700 text-white rounded-lg shadow-lg border border-red-500/40 active:scale-90 transition-all cursor-pointer"
                    aria-label={t('myListRemoveSuccess') || 'Remove from my list'}
                    title="Remove from List"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {!isProgressRow && !isMyListPage && (
                  <button
                    onClick={handleToggleMyList}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`p-1.5 md:p-2 rounded-lg transition-all shadow-lg active:scale-90 cursor-pointer ${
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
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-1.5 md:p-2 bg-red-600/90 hover:bg-red-600 active:bg-red-700 text-white rounded-lg shadow-lg border border-red-500/40 active:scale-90 transition-all cursor-pointer"
                    aria-label="Remove watch progress"
                    title={language === 'ku' || language === 'badini' ? 'سڕینەوە لە بەردەوامی سەیرکردن' : 'Remove from Continue Watching'}
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={3.5} />
                  </button>
                )}

                <button
                  onClick={handleShare}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="p-1.5 md:p-2 rounded-lg bg-black/75 backdrop-blur-md text-white border border-white/20 hover:bg-black/95 shadow-lg active:scale-90 transition-all cursor-pointer"
                  aria-label="Share movie"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bottom Progress Bar for Watch Progress */}
              {isProgressRow && progressPct > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/70 z-20 overflow-hidden">
                  <div className="h-full bg-brand shadow-[0_0_8px_rgba(229,9,20,0.8)]" style={{ width: `${progressPct}%` }} />
                </div>
              )}

              {/* Clean Integrated Title & Badges Overlay at Bottom */}
              <div className="absolute bottom-0 inset-x-0 p-2 sm:p-2.5 md:p-3 z-20 flex flex-col justify-end pointer-events-none">
                {/* Kurdish CC Badge */}
                {!isCustom && (
                  <div className="mb-0.5 sm:mb-1">
                    <KurdishCCBadge tmdbId={Number(item.id)} type={effectiveMediaType === 'tv' ? 'tv' : 'movie'} />
                  </div>
                )}

                <h4
                  className={`text-[11px] sm:text-xs md:text-[13px] text-white font-bold line-clamp-1 sm:line-clamp-2 drop-shadow-sm transition-colors group-hover/card:text-red-400 ${
                    isRtl ? 'font-kurdish leading-tight font-bold text-right' : 'tracking-tight leading-tight text-left'
                  }`}
                >
                  {title}
                </h4>

                <div className="flex items-center gap-1.5 mt-0.5 text-[8.5px] sm:text-[9px] md:text-[9.5px] font-medium text-zinc-400">
                  {year && <span>{year}</span>}
                  {year && <span className="w-1 h-1 rounded-full bg-zinc-600" />}
                  {effectiveMediaType === 'tv' && (item.season || item.episode) ? (
                    <span className="bg-red-600/90 text-white px-1.5 py-0.5 rounded font-black text-[7.5px] sm:text-[8px] md:text-[9px] tracking-tight">
                      {isRtl ? `وەرزی ${item.season || 1} • ئەڵقەی ${item.episode || 1}` : `S${item.season || 1}:E${item.episode || 1}`}
                    </span>
                  ) : (
                    <span className="uppercase text-[7.5px] sm:text-[8px] md:text-[8.5px] font-bold text-zinc-500 tracking-wider">
                      {effectiveMediaType === 'dubbed' ? (isRtl ? 'دۆبلاژکراو' : 'Dubbed') : (effectiveMediaType === 'tv' ? (isRtl ? 'زنجیرە' : 'TV') : (isRtl ? 'فیلم' : 'Movie'))}
                    </span>
                  )}
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
  ),
  (prev, next) => {
    return (
      prev.item?.id === next.item?.id &&
      prev.item?.poster_path === next.item?.poster_path &&
      prev.item?.title === next.item?.title &&
      prev.item?.name === next.item?.name &&
      (prev.item as any)?.progress === (next.item as any)?.progress &&
      prev.mediaType === next.mediaType &&
      prev.type === next.type &&
      prev.isProgressRow === next.isProgressRow &&
      prev.isMyListPage === next.isMyListPage &&
      prev.className === next.className
    );
  }
);

MovieCard.displayName = 'MovieCard';

export { MovieCard };
export default MovieCard;
