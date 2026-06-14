import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Volume2, VolumeX, CheckCircle2, 
  X, Play, ShieldCheck, Heart, WifiOff, Zap, Calendar, Tag, Info, Star, Music2, RotateCcw,
  ArrowDown, ArrowUp
} from 'lucide-react';
import { Content } from '../types';
import { fetchData } from '../services/tmdbService';
import { requests, API_KEY, IMAGE_BASE_URL, GENRES_T, IMAGE_BASE_URL_POSTER } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import { useGamepad } from '../contexts/GamepadContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import { supabase } from '../utils/supabaseClient';
import { bannedService } from '../services/bannedService';
import Spinner from '../components/Spinner';
import { SkeletonShorts } from '../components/Skeleton';
import { Trash2 } from 'lucide-react';

const STORAGE_KEY = 'flkrd_shorts_last_index';
const FOLLOWED_KEY = 'flkrd_followed_movies';

interface TrailerItemProps {
  movie: Content;
  active: boolean;
  index: number;
  activeIndex: number;
  isMutedGlobal: boolean;
  toggleMuteGlobal: () => void;
  hasInteracted: boolean;
  onNavigate: () => void;
  isFollowed: boolean;
  onToggleFollow: () => void;
}

const TrailerItem: React.FC<TrailerItemProps> = ({ 
  movie, active, index, activeIndex, isMutedGlobal, toggleMuteGlobal, hasInteracted, onNavigate, isFollowed, onToggleFollow 
}) => {
  const { t } = useTranslation();
  const { theme, accentColor, glassConfig = {
    redOpacity: 0.15,
    darkOpacity: 0.85,
    blurAmount: 20,
    saturation: 120,
    borderOpacity: 0.1,
    aberrationIntensity: 0.5
  } } = useUI();
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [shouldRenderVideo, setShouldRenderVideo] = useState(false);

  useEffect(() => {
    if (!active) {
      setShouldRenderVideo(false);
      return;
    }
    const timer = setTimeout(() => {
      setShouldRenderVideo(true);
    }, 400);
    return () => clearTimeout(timer);
  }, [active]);
  const lastTapRef = useRef<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { isAdmin } = useUI();
  const { addNotification } = useNotification();

  const handleBan = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanId = String(movie.id).replace('custom_', '');
    const isCustom = String(movie.id).startsWith('custom_');
    const mediaType = movie.media_type || (isCustom ? 'dubbed' : 'movie');

    if (!window.confirm("BAN THIS NODE? [SYSTEM TERMINATION]")) return;

    try {
      // 1. Universal Ban Registry
      const banSignal = await bannedService.banContent(cleanId, mediaType);
      if (!banSignal) throw new Error("Registry reject");

      // 2. Dubbed Physical Deletion (if applicable)
      if (isCustom) {
          await supabase.rpc('delete_dubbed_movie', { target_id: parseInt(cleanId) });
      }
      
      addNotification({ 
        type: 'success', 
        title: 'NODE TERMINATED', 
        message: 'Content has been blocked globally.' 
      });
      window.location.reload(); 
    } catch (err) {
      console.error("Ban failure:", err);
      addNotification({ type: 'error', title: 'TERMINATION FAILED', message: 'Database refused signal.' });
    }
  };
  
  const movieGenres = useMemo(() => {
    const ids = movie.genre_ids || [];
    return ids.slice(0, 2).map(id => {
        const found = GENRES_T.find(g => g.id === id);
        return found ? t(found.nameKey) : null;
    }).filter(Boolean);
  }, [movie.genre_ids, t]);

  useEffect(() => {
    // PREFETCH LOGIC: Only load if active or within next 2 nodes
    const shouldLoad = index >= activeIndex && index <= activeIndex + 2;
    if (!shouldLoad) return;

    const loadMetadata = async () => {
      const type = movie.media_type || 'movie';
      const endpoint = `/${type}/${movie.id}?api_key=${API_KEY}&append_to_response=videos,images&include_image_language=en,null`;
      try {
        const data = await fetchData(endpoint, 'en');
        if (data && !bannedService.isBanned(String(movie.id))) {
          const videos = data.videos?.results || [];
          const trailer = videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') 
                       || videos.find((v: any) => v.site === 'YouTube') 
                       || null;
          
          if (!trailer?.key && active) {
            console.warn("[SHORTS] Signal missing for node:", movie.id);
          }
          setTrailerKey(trailer?.key || null);

          const logos = data.images?.logos || [];
          const logoPath = logos.find((l: any) => l.iso_639_1 === 'en' || !l.iso_639_1)?.file_path;
          if (logoPath) setLogo(logoPath);
        } else if (active) {
            console.warn("[SHORTS] Content node missing metadata or banned:", movie.id);
        }
      } catch (err) {
        console.error("[SHORTS] Transmission failure:", err);
      }
    };
    loadMetadata();
  }, [movie.id, movie.media_type, active, index, activeIndex]);

  useEffect(() => {
    if (!active) {
      setIsVideoLoading(true);
      return;
    }
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      const command = isMutedGlobal ? 'mute' : 'unmute';
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: command,
          args: []
        }),
        '*'
      );
    }
  }, [isMutedGlobal, active, isVideoLoading]);

  const handleInteraction = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!isFollowed) onToggleFollow();
      setShowHeartPop(true);
      setTimeout(() => setShowHeartPop(false), 800);
    }
    lastTapRef.current = now;
  };

  return (
    <div className="h-[calc(var(--vh,1vh)*100)] w-full relative snap-start snap-always bg-[#050505] flex items-center justify-center overflow-hidden">
      {/* Full-Screen Ambient Blurred Backdrop for PC */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none hidden md:block">
        <img 
          src={`${IMAGE_BASE_URL_POSTER}${movie.poster_path || movie.backdrop_path}`} 
          className="w-full h-full object-cover opacity-20 scale-105 blur-3xl filter brightness-50"
          alt=""
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* GPU-accelerated layout wrapper containing Player Card and Controls */}
      <div 
        className="relative w-full h-full flex items-center justify-center z-10 pointer-events-none px-4"
        style={{ transform: 'translate3d(0, 0, 0)' }}
      >
        {/* Centered Video Card */}
        <div 
          className="w-full h-full md:w-[440px] md:h-[86vh] md:rounded-[3rem] md:border md:border-white/10 md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden relative pointer-events-auto bg-black flex flex-col justify-end"
          style={{
            borderColor: `rgba(var(--brand-red-rgb), ${glassConfig.borderOpacity * 1.5})`,
            transform: 'translate3d(0, 0, 0)',
            willChange: 'transform'
          }}
        >
          {/* Click interaction layer overlay inside card */}
          <div className="absolute inset-0 z-30 cursor-pointer" onClick={handleInteraction} />

          {/* Video elements inside card */}
          <div className="absolute inset-0 z-10 overflow-hidden flex items-center justify-center">
            {/* Backdrop poster image behind the video */}
            <div className="absolute inset-0 w-full h-full">
              <img 
                src={`${IMAGE_BASE_URL_POSTER}${movie.poster_path || movie.backdrop_path}`} 
                className="w-full h-full object-cover opacity-60 scale-110 blur-xl"
                alt=""
              />
            </div>

            {trailerKey && active && hasInteracted && shouldRenderVideo && (
              <div className="w-full h-full relative pointer-events-none z-[1]">
                <div className="w-full h-full scale-[2.2] md:scale-100 brightness-[0.75] md:brightness-100">
                  <iframe 
                    ref={iframeRef}
                    src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${trailerKey}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&enablejsapi=1`}
                    className={`w-full h-full transition-opacity duration-1000 ${isVideoLoading ? 'opacity-0' : 'opacity-100'}`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    onLoad={() => setIsVideoLoading(false)}
                  />
                </div>
              </div>
            )}

            {/* Clear Poster Artwork Layer while video is loading/idle */}
            <AnimatePresence>
              {(isVideoLoading || !shouldRenderVideo) && (
                <motion.div 
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 z-20 w-full h-full"
                >
                  <img 
                    src={`${IMAGE_BASE_URL_POSTER}${movie.poster_path || movie.backdrop_path}`} 
                    className="w-full h-full object-cover"
                    alt={movie.title}
                  />
                  {isVideoLoading && shouldRenderVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                      <Spinner />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cinematic Vignette Overlay inside the card */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90 z-21 pointer-events-none" />
            <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.85)] z-22 pointer-events-none" />
          </div>

          {/* Magnetic Heart Interaction Layer inside the card */}
          <AnimatePresence>
            {showHeartPop && (
              <motion.div 
                initial={{ scale: 0, rotate: -20, opacity: 0 }} 
                animate={{ scale: [0.5, 1.4, 1.2], rotate: 0, opacity: [0, 1, 0] }} 
                exit={{ opacity: 0 }} 
                transition={{ duration: 0.6, ease: "backOut" }}
                className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none"
              >
                <Heart className="text-brand fill-brand drop-shadow-[0_0_60px_rgba(var(--brand-red-rgb),0.8)] w-40 h-40" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info Panel - Sitting inside the bottom portion of the card */}
          <div className="absolute bottom-6 left-6 right-6 z-40 pointer-events-none text-left max-w-[calc(100%-1rem)] flex flex-col items-start gap-1">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-start gap-1 w-full"
            >
              <div className="flex flex-wrap items-center gap-2 mb-3 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-3xl">
                <div className="bg-blue-500 rounded-full p-0.5 shadow-lg"><CheckCircle2 className="w-2 h-2 text-white" /></div>
                <h3 className="font-black text-[8px] md:text-[9px] text-blue-400/90 uppercase tracking-[0.3em] font-mono">Official Trailer • FLKRD Cinema</h3>
              </div>

              <div className="mb-3">
                {logo ? (
                  <img src={`${IMAGE_BASE_URL}${logo}`} className="max-h-12 md:max-h-20 object-contain drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] filter brightness-110" alt={movie.title} />
                ) : (
                  <h1 className="text-xl md:text-3xl font-[1000] text-white uppercase italic tracking-tight leading-none drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]">{movie.title || movie.name}</h1>
                )}
              </div>

              {movie.overview && (
                <p className="hidden md:block text-gray-400 text-xs font-bold w-full mb-4 leading-relaxed uppercase tracking-wider opacity-90 p-4 rounded-2xl border backdrop-blur-2xl transition-all duration-300"
                   style={{
                     background: `radial-gradient(circle at 50% 0%, rgba(var(--brand-red-rgb), ${glassConfig.redOpacity}), transparent 80%), rgba(10, 10, 10, ${glassConfig.darkOpacity * 0.9})`,
                     backdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
                     WebkitBackdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
                     borderColor: `rgba(var(--brand-red-rgb), ${glassConfig.borderOpacity})`,
                     boxShadow: `
                       inset 0 1px 0 0 rgba(255, 255, 255, ${0.1 + glassConfig.borderOpacity * 0.25}),
                       inset ${glassConfig.aberrationIntensity * 0.1}px 0 0.5px rgba(255, 0, 80, 0.03),
                       inset -${glassConfig.aberrationIntensity * 0.1}px 0 0.5px rgba(0, 200, 255, 0.03)
                     `,
                     transform: 'translate3d(0,0,0)'
                   }}
                >
                    {movie.overview.length > 150 ? movie.overview.slice(0, 150) + '...' : movie.overview}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 mb-5">
                <div className="flex items-center gap-2 bg-brand/90 text-white px-3 py-1.5 rounded-xl backdrop-blur-3xl shadow-xl border border-white/10">
                  <Calendar className="w-3 h-3" fill="white" />
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-tighter">
                    {movie.release_date?.split('-')[0] || movie.first_air_date?.split('-')[0] || '2025'}
                  </span>
                </div>
                {movie.vote_average > 0 && (
                  <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1.5 rounded-xl text-yellow-500 backdrop-blur-3xl">
                    <Star className="w-3 h-3" fill="currentColor" />
                    <span className="text-[10px] md:text-xs font-black tabular-nums">{movie.vote_average.toFixed(1)}</span>
                  </div>
                )}
                {movieGenres.length > 0 && (
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-gray-300 backdrop-blur-3xl">
                    <Music2 className="w-3 h-3" />
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">{movieGenres.join(' / ')}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 pointer-events-auto">
                <button onClick={onNavigate} className="relative group overflow-hidden bg-white text-black font-[1000] px-5 py-3 md:px-8 md:py-4 rounded-xl flex items-center gap-2 text-[9px] md:text-xs uppercase italic tracking-[0.2em] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] active:scale-95 transition-all">
                  <div className="absolute inset-0 bg-brand/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  <Play className="w-3.5 h-3.5 relative" fill="currentColor" /> 
                  <span className="relative">STREAM FULL NODE</span>
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Side Action Bar - Floats right of the centered video card on PC, and bottom right on Mobile */}
        <div className="absolute right-4 bottom-[14%] md:relative md:bottom-auto md:right-auto md:left-6 flex flex-col items-center gap-4 md:gap-7 z-40 pointer-events-auto">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }} 
            className="relative cursor-pointer group" 
            onClick={onNavigate}
          >
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-brand/50 p-0.5 bg-black overflow-hidden shadow-[0_0_20px_rgba(var(--brand-red-rgb),0.3)] group-hover:border-brand transition-colors">
              <img src={movie.poster_path ? `${IMAGE_BASE_URL_POSTER}${movie.poster_path}` : "/flkrd-icon.png"} alt="" className="w-full h-full object-cover rounded-full" />
            </div>
            <button className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-brand text-white rounded-full p-1 border-2 border-black shadow-xl">
              <Plus className="w-2.5 h-2.5" strokeWidth={3} />
            </button>
          </motion.div>

          <button onClick={(e) => { e.stopPropagation(); onToggleFollow(); }} className="flex flex-col items-center gap-1.5 group">
            <motion.div 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.8 }}
              animate={isFollowed ? { scale: [1, 1.2, 1] } : {}} 
              className={`p-3 md:p-4 rounded-[1.2rem] md:rounded-2xl border transition-all duration-300 ${isFollowed ? 'bg-brand border-brand shadow-[0_0_40px_rgba(var(--brand-red-rgb),0.5)]' : 'bg-white/10 border-white/10 backdrop-blur-3xl hover:bg-white/20'}`}
            >
              <Heart className={`w-5 h-5 md:w-6 md:h-6 ${isFollowed ? "fill-white text-white" : "text-white opacity-80"}`} />
            </motion.div>
            <span className="text-[7px] md:text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">{isFollowed ? 'Followed' : 'Connect'}</span>
          </button>

          <button onClick={(e) => { e.stopPropagation(); toggleMuteGlobal(); }} className="p-3 md:p-4 rounded-full bg-white/10 border border-white/10 backdrop-blur-3xl shadow-2xl transition-all hover:bg-white/20 active:scale-90">
            {isMutedGlobal ? <VolumeX className="w-5 h-5 md:w-6 md:h-6 text-white opacity-80" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6 text-white" />}
          </button>

          <button onClick={(e) => { e.stopPropagation(); setReloadKey(k => k + 1); }} className="p-2.5 rounded-full bg-black/40 border border-white/5 backdrop-blur-md opacity-40 hover:opacity-100 transition-opacity">
            <RotateCcw className="w-3.5 h-3.5 text-white" />
          </button>

          {isAdmin && (
            <button 
              onClick={handleBan}
              className="p-3 md:p-4 rounded-2xl bg-red-500/20 border border-red-500/40 backdrop-blur-3xl shadow-[0_0_50px_rgba(255,0,0,0.2)] hover:bg-red-500 hover:scale-110 transition-all active:scale-90 relative z-50 group"
            >
              <Trash2 className="w-5 h-5 md:w-6 md:h-6 text-red-500 group-hover:text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Sync Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 z-50">
        <div className="h-full bg-white/5 w-full">
          <motion.div 
            className="h-full bg-brand shadow-[0_0_10px_brand]"
            initial={{ width: 0 }}
            animate={active ? { width: '100%' } : { width: 0 }}
            transition={{ duration: 30, ease: "linear" }}
          />
        </div>
      </div>
    </div>
  );
};

const ShortsPage: React.FC = () => {
  const [movies, setMovies] = useState<Content[]>([]);
  const [activeIndex, setActiveIndex] = useState(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [loading, setLoading] = useState(true);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const [isMutedGlobal, setIsMutedGlobal] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [viewMode, setViewMode] = useState<'followers' | 'explore'>('explore');
  const [followedIds, setFollowedIds] = useState<Set<number>>(() => new Set(JSON.parse(localStorage.getItem(FOLLOWED_KEY) || '[]')));
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const { language } = useTranslation();
  const navigate = useNavigate();
  const { glassConfig = {
    redOpacity: 0.15,
    darkOpacity: 0.85,
    blurAmount: 20,
    saturation: 120,
    borderOpacity: 0.1,
    aberrationIntensity: 0.5
  } } = useUI();

  // Mobile Viewport Height Sync
  useEffect(() => {
    const handleResize = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMuteGlobal = () => { 
    setIsMutedGlobal(!isMutedGlobal); 
    if (!hasInteracted) setHasInteracted(true); 
  };

  const loadShorts = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const lang = (language === 'ku' || language === 'badini') ? 'ku' : 'en-US';
    try {
      const pageToFetch = pageRef.current;
      const data = await fetchData(`${requests.fetchTrendingMovies(lang)}&page=${pageToFetch}`, language);
      if (data && Array.isArray(data)) { 
          setMovies(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              const uniqueNew = data.filter((m: any) => {
                  if (!m || !m.id) return false;
                  const idStr = String(m.id);
                  return !existingIds.has(m.id) && !bannedService.isBanned(idStr);
              });
              return [...prev, ...uniqueNew];
          }); 
          pageRef.current = pageToFetch + 1; 
      }
    } catch (e) {
      console.error("[SHORTS ENGINE] Initialization failure:", e);
    } finally { 
      setLoading(false); 
      loadingRef.current = false;
    }
  }, [language]);

  useEffect(() => { loadShorts(); }, [loadShorts]);

  const displayedMovies = useMemo(() => {
    return viewMode === 'followers' ? movies.filter(m => followedIds.has(m.id)) : movies;
  }, [viewMode, movies, followedIds]);

  // Safety Clamp: Reset activeIndex to 0 if bounds mismatch (e.g. switching views or stale session)
  useEffect(() => {
    if (displayedMovies.length > 0 && activeIndex >= displayedMovies.length) {
      setActiveIndex(0);
      sessionStorage.setItem(STORAGE_KEY, '0');
    }
  }, [displayedMovies.length, activeIndex]);

  const scrollTimeoutRef = useRef<number | null>(null);

  // Clean up any remaining animation frame timers
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        cancelAnimationFrame(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard navigation for PC ( TikTok-like Snap Scroll )
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;
      
      const containerHeight = containerRef.current.clientHeight || window.innerHeight;

      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        if (isScrollingRef.current) return;
        if (activeIndex < displayedMovies.length - 1) {
          isScrollingRef.current = true;
          const nextIndex = activeIndex + 1;
          containerRef.current.scrollTo({
            top: nextIndex * containerHeight,
            behavior: 'smooth'
          });
          setTimeout(() => { isScrollingRef.current = false; }, 450);
        }
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        if (isScrollingRef.current) return;
        if (activeIndex > 0) {
          isScrollingRef.current = true;
          const prevIndex = activeIndex - 1;
          containerRef.current.scrollTo({
            top: prevIndex * containerHeight,
            behavior: 'smooth'
          });
          setTimeout(() => { isScrollingRef.current = false; }, 450);
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        if (isScrollingRef.current) return;
        if (e.shiftKey) {
          if (activeIndex > 0) {
            isScrollingRef.current = true;
            const prevIndex = activeIndex - 1;
            containerRef.current.scrollTo({
              top: prevIndex * containerHeight,
              behavior: 'smooth'
            });
            setTimeout(() => { isScrollingRef.current = false; }, 450);
          }
        } else {
          if (activeIndex < displayedMovies.length - 1) {
            isScrollingRef.current = true;
            const nextIndex = activeIndex + 1;
            containerRef.current.scrollTo({
              top: nextIndex * containerHeight,
              behavior: 'smooth'
            });
            setTimeout(() => { isScrollingRef.current = false; }, 450);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, displayedMovies.length]);

  // ── Engine V5: Controller-Synchronized Feed (Stabilized) ──
  const { lastAction } = useGamepad();
  useEffect(() => {
    if (isScrollingRef.current || !containerRef.current) return;

    const containerHeight = containerRef.current.clientHeight || window.innerHeight;

    if (lastAction === 'DOWN' && activeIndex < displayedMovies.length - 1) {
        isScrollingRef.current = true;
        const nextIndex = activeIndex + 1;
        containerRef.current.scrollTo({ top: nextIndex * containerHeight, behavior: 'smooth' });
        setTimeout(() => { isScrollingRef.current = false; }, 450);
    }
    if (lastAction === 'UP' && activeIndex > 0) {
        isScrollingRef.current = true;
        const prevIndex = activeIndex - 1;
        containerRef.current.scrollTo({ top: prevIndex * containerHeight, behavior: 'smooth' });
        setTimeout(() => { isScrollingRef.current = false; }, 450);
    }
  }, [lastAction, activeIndex, displayedMovies.length]);

  const handleScroll = () => {
    if (scrollTimeoutRef.current) {
      cancelAnimationFrame(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const containerHeight = containerRef.current.clientHeight || window.innerHeight;
      const index = Math.round(scrollTop / containerHeight);
      
      if (index !== activeIndex && index >= 0 && index < displayedMovies.length) {
        setActiveIndex(index);
        sessionStorage.setItem(STORAGE_KEY, index.toString());
      }
      
      if (index >= displayedMovies.length - 4) {
        loadShorts();
      }
    });
  };

  const handleToggleFollow = (id: number) => {
    const next = new Set(followedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFollowedIds(next);
    localStorage.setItem(FOLLOWED_KEY, JSON.stringify(Array.from(next)));
  };


  if (loading && movies.length === 0) return <div className="h-[calc(var(--vh,1vh)*100)] bg-[#050505] flex items-center justify-center font-black tracking-tighter text-white/10 uppercase italic text-2xl animate-pulse italic">Initializing Neural Feed...</div>;

  return (
    <div className="fixed inset-0 z-[60] bg-[#050505] overflow-hidden">
      <AnimatePresence>
        {!hasInteracted && (
          <motion.div exit={{ opacity: 0 }} className="absolute inset-0 z-[100] flex items-center justify-center bg-black/98 backdrop-blur-[100px] p-8 text-center">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md w-full">
              <div className="w-28 h-28 bg-brand/10 rounded-[3rem] flex items-center justify-center mx-auto mb-12 border border-brand/20 shadow-[0_0_100px_rgba(var(--brand-red-rgb),0.2)]">
                <ShieldCheck className="text-brand w-14 h-14" strokeWidth={2.5} />
              </div>
              <h2 className="text-4xl md:text-5xl font-[1000] text-white uppercase italic tracking-tighter mb-6 text-center leading-none">Initialize<br/>Neural Fluid</h2>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-12">Synchronizing transmission protocols...</p>
              <button 
                onClick={() => { setIsMutedGlobal(false); setHasInteracted(true); }} 
                className="w-full bg-white text-black font-[1000] py-7 rounded-[2rem] flex items-center justify-center gap-4 uppercase italic tracking-[0.2em] shadow-2xl hover:bg-brand hover:text-white transition-all active:scale-95 group"
              >
                  START TRANSMISSION <Zap className="w-7 h-7 group-hover:animate-pulse" fill="currentColor" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-0 left-0 right-0 z-50 flex flex-col items-center pt-10 pointer-events-none">
          <div className="pointer-events-auto border rounded-3xl flex items-center p-1.5 shadow-2xl overflow-hidden transition-all duration-300"
               style={{
                 background: `radial-gradient(circle at 50% 0%, rgba(var(--brand-red-rgb), ${glassConfig.redOpacity}), transparent 80%), rgba(10, 10, 10, ${glassConfig.darkOpacity})`,
                 backdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
                 WebkitBackdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
                 borderColor: `rgba(var(--brand-red-rgb), ${glassConfig.borderOpacity})`,
                 boxShadow: `inset 0 1px 0 0 rgba(255, 255, 255, ${0.1 + glassConfig.borderOpacity * 0.25})`
               }}
          >
              <button onClick={() => setViewMode('followers')} className={`px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === 'followers' ? 'bg-brand text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}>Followers</button>
              <button onClick={() => setViewMode('explore')} className={`px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === 'explore' ? 'bg-white text-black shadow-xl' : 'text-gray-500 hover:text-white'}`}>Explore</button>
          </div>
      </div>

      <div 
        ref={containerRef} 
        onScroll={handleScroll} 
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-[#050505] overscroll-none"
        style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
      >
        {displayedMovies.length > 0 ? displayedMovies.map((movie, index) => {
          const isNear = index >= activeIndex - 1 && index <= activeIndex + 1;
          if (!isNear) {
            return (
              <div 
                key={`${movie.id}-${index}`} 
                className="w-full snap-start snap-always bg-[#050505] flex-shrink-0" 
                style={{ height: 'calc(var(--vh, 1vh) * 100)' }} 
              />
            );
          }
          return (
            <TrailerItem 
                key={`${movie.id}-${index}`} 
                movie={movie} 
                index={index}
                activeIndex={activeIndex}
                active={index === activeIndex}
                isMutedGlobal={isMutedGlobal} toggleMuteGlobal={toggleMuteGlobal}
                hasInteracted={hasInteracted}
                onNavigate={() => navigate(`/details/${movie.media_type || 'movie'}/${movie.id}`, { state: { customData: movie } })}
                isFollowed={followedIds.has(movie.id)} onToggleFollow={() => handleToggleFollow(movie.id)}
            />
          );
        }) : (
            <SkeletonShorts />
        )}
      </div>

      {/* Floating Scroll Navigation Controls on PC */}
      <div className="hidden md:flex flex-col gap-3 fixed right-8 bottom-28 z-50 pointer-events-auto">
        {activeIndex > 0 && (
          <button 
            onClick={() => {
              if (isScrollingRef.current || !containerRef.current) return;
              isScrollingRef.current = true;
              const containerHeight = containerRef.current.clientHeight || window.innerHeight;
              containerRef.current.scrollTo({
                top: (activeIndex - 1) * containerHeight,
                behavior: 'smooth'
              });
              setTimeout(() => { isScrollingRef.current = false; }, 450);
            }}
            className="p-4 rounded-full bg-white/5 border border-white/10 text-white backdrop-blur-xl hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all shadow-2xl"
            title="Scroll Up"
          >
            <ArrowUp className="w-6 h-6" />
          </button>
        )}
        {activeIndex < displayedMovies.length - 1 && (
          <button 
            onClick={() => {
              if (isScrollingRef.current || !containerRef.current) return;
              isScrollingRef.current = true;
              const containerHeight = containerRef.current.clientHeight || window.innerHeight;
              containerRef.current.scrollTo({
                top: (activeIndex + 1) * containerHeight,
                behavior: 'smooth'
              });
              setTimeout(() => { isScrollingRef.current = false; }, 450);
            }}
            className="p-4 rounded-full bg-white/5 border border-white/10 text-white backdrop-blur-xl hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all shadow-2xl"
            title="Scroll Down"
          >
            <ArrowDown className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="fixed top-8 left-8 z-50">
        <button onClick={() => navigate('/')} className="group p-5 rounded-2xl border text-white hover:bg-brand transition-all shadow-2xl active:scale-90"
             style={{
               background: `rgba(10, 10, 10, ${glassConfig.darkOpacity})`,
               backdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
               WebkitBackdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
               borderColor: `rgba(var(--brand-red-rgb), ${glassConfig.borderOpacity})`,
               boxShadow: `inset 0 1px 0 0 rgba(255, 255, 255, ${0.1 + glassConfig.borderOpacity * 0.25})`
             }}
        >
            <X className="w-7 h-7 md:w-8 md:h-8 group-hover:rotate-90 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default ShortsPage;