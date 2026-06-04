import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Volume2, VolumeX, CheckCircle2, 
  X, Play, ShieldCheck, Heart, WifiOff, Zap, Calendar, Tag, Info, Star, Music2, RotateCcw
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
  const { theme, accentColor } = useUI();
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
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
    if (!active) return;
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

  const videoUrl = useMemo(() => {
    if (!trailerKey || !active || !hasInteracted) return null;
    const origin = window.location.origin.startsWith('http') ? window.location.origin : '';
    // We hardcode mute=1 to guarantee 100% successful instant autoplay on Safari/iOS WebKit.
    // Toggling the global mute state is handled via postMessage API inside a useEffect hook to prevent reloading the iframe, which causes playback blocks.
    return `https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${trailerKey}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&enablejsapi=1${origin ? `&origin=${origin}` : ''}&widgetid=1&version=3`;
  }, [trailerKey, active, hasInteracted]);

  return (
    <div className="h-[calc(var(--vh,1vh)*100)] w-full relative snap-start bg-[#050505] flex flex-col items-center justify-center overflow-hidden">
      {/* Cinematic Background Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden flex items-center justify-center">
        {trailerKey ? (
          <div className="w-full h-full relative pointer-events-none">
            <AnimatePresence mode='wait'>
                {videoUrl ? (
                        <motion.div 
                            key="video"
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="w-full h-full scale-[2.2] md:scale-100 md:aspect-[9/16] md:mx-auto brightness-[0.75] md:brightness-100"
                        >
                        <iframe 
                            ref={iframeRef}
                            src={videoUrl}
                            className="w-full h-full"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            onLoad={() => setIsVideoLoading(false)}
                        />
                    </motion.div>
                ) : (
                    <motion.div key="poster" className="absolute inset-0 w-full h-full">
                        <img 
                            src={`${IMAGE_BASE_URL}${movie.backdrop_path || movie.poster_path}`} 
                            className="w-full h-full object-cover opacity-60 scale-110 blur-xl"
                            alt=""
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Spinner />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* High-End Cinematic Vignette Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90 z-20" />
            <div className="absolute inset-0 shadow-[inset_0_0_200px_rgba(0,0,0,0.9)] z-21" />
          </div>
        ) : (
          <div className="h-full w-full bg-[#050505] flex flex-col items-center justify-center">
             <Spinner />
          </div>
        )}
      </div>

      <div className="absolute inset-0 z-30" onClick={handleInteraction} />

      {/* Magnetic Heart Interaction Layer */}
      <AnimatePresence>
          {showHeartPop && (
              <motion.div 
                  initial={{ scale: 0, rotate: -20, opacity: 0 }} 
                  animate={{ scale: [0.5, 1.4, 1.2], rotate: 0, opacity: [0, 1, 0] }} 
                  exit={{ opacity: 0 }} 
                  transition={{ duration: 0.6, ease: "backOut" }}
                  className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none"
              >
                  <Heart className="text-brand fill-brand drop-shadow-[0_0_60px_rgba(var(--brand-red-rgb),0.8)] w-56 h-56" />
              </motion.div>
          )}
      </AnimatePresence>

      {/* Side Action Bar - Enhanced Interaction Nodes */}
      <div className="absolute right-2 bottom-[14%] md:right-10 md:top-1/2 md:-translate-y-1/2 flex flex-col items-center gap-4 md:gap-7 z-40">
        <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }} 
            className="relative cursor-pointer group" 
            onClick={onNavigate}
        >
          <div className="w-12 h-12 md:w-20 md:h-20 rounded-full border-2 border-brand/50 p-0.5 bg-black overflow-hidden shadow-[0_0_20px_rgba(var(--brand-red-rgb),0.3)] group-hover:border-brand transition-colors">
             <img src={movie.poster_path ? `${IMAGE_BASE_URL_POSTER}${movie.poster_path}` : "/flkrd-icon.png"} alt="" className="w-full h-full object-cover rounded-full" />
          </div>
          <button className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-brand text-white rounded-full p-1 border-2 border-black shadow-xl">
            <Plus className="w-3 h-3" strokeWidth={3} />
          </button>
        </motion.div>

        <button onClick={(e) => { e.stopPropagation(); onToggleFollow(); }} className="flex flex-col items-center gap-1.5 group">
          <motion.div 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.8 }}
            animate={isFollowed ? { scale: [1, 1.2, 1] } : {}} 
            className={`p-3.5 md:p-5 rounded-[1.4rem] md:rounded-3xl border transition-all duration-300 ${isFollowed ? 'bg-brand border-brand shadow-[0_0_40px_rgba(var(--brand-red-rgb),0.5)]' : 'bg-white/10 border-white/10 backdrop-blur-3xl hover:bg-white/20'}`}
          >
            <Heart className={`w-6 h-6 md:w-8 md:h-8 ${isFollowed ? "fill-white text-white" : "text-white opacity-80"}`} />
          </motion.div>
          <span className="text-[8px] md:text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">{isFollowed ? 'Followed' : 'Connect'}</span>
        </button>

        <button onClick={(e) => { e.stopPropagation(); toggleMuteGlobal(); }} className="p-3.5 md:p-5 rounded-full bg-white/10 border border-white/10 backdrop-blur-3xl shadow-2xl transition-all hover:bg-white/20 active:scale-90">
          {isMutedGlobal ? <VolumeX className="w-6 h-6 md:w-8 md:h-8 text-white opacity-80" /> : <Volume2 className="w-6 h-6 md:w-8 md:h-8 text-white" />}
        </button>

        <button onClick={(e) => { e.stopPropagation(); setReloadKey(k => k + 1); }} className="p-3 rounded-full bg-black/40 border border-white/5 backdrop-blur-md opacity-40 hover:opacity-100 transition-opacity">
          <RotateCcw className="w-4 h-4 text-white" />
        </button>

        {isAdmin && (
          <button 
            onClick={handleBan}
            className="p-4 md:p-6 rounded-3xl bg-red-500/20 border border-red-500/40 backdrop-blur-3xl shadow-[0_0_50px_rgba(255,0,0,0.2)] hover:bg-red-500 hover:scale-110 transition-all active:scale-90 relative z-50 group"
          >
            <Trash2 className="w-6 h-6 md:w-8 md:h-8 text-red-500 group-hover:text-white" />
          </button>
        )}
      </div>

      {/* Info Panel - Bottom Left (Official Metadata Signature) */}
      <div className="absolute bottom-12 left-4 right-[4.8rem] md:left-14 md:bottom-20 md:right-32 z-40 pointer-events-none text-left max-w-[calc(100%-6rem)] md:max-w-4xl" dir="ltr">
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-start gap-1"
        >
          <div className="flex flex-wrap items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-3xl">
            <div className="bg-blue-500 rounded-full p-0.5 shadow-lg"><CheckCircle2 className="w-2.5 h-2.5 text-white" /></div>
            <h3 className="font-black text-[8px] md:text-[11px] text-blue-400/90 uppercase tracking-[0.3em] font-mono">Official Trailer • FLKRD Cinema</h3>
          </div>

          <div className="mb-4 md:mb-8">
            {logo ? (
              <img src={`${IMAGE_BASE_URL}${logo}`} className="max-h-12 md:max-h-40 object-contain drop-shadow-[0_0_30px_rgba(0,0,0,0.8)] filter brightness-110" alt={movie.title} />
            ) : (
              <h1 className="text-2xl md:text-8xl font-[1000] text-white uppercase italic tracking-tight leading-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">{movie.title || movie.name}</h1>
            )}
          </div>

          {movie.overview && (
            <p className="hidden md:block text-gray-400 text-sm font-bold max-w-xl mb-10 leading-relaxed uppercase tracking-wider opacity-80 backdrop-blur-3xl p-6 bg-white/5 rounded-[2rem] border border-white/5">
                {movie.overview.length > 250 ? movie.overview.slice(0, 250) + '...' : movie.overview}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 mb-10 md:mb-14">
              <div className="flex items-center gap-3 bg-brand/90 text-white px-6 py-2.5 rounded-2xl backdrop-blur-3xl shadow-2xl border border-white/10">
                  <Calendar className="w-4 h-4" fill="white" />
                  <span className="text-xs md:text-sm font-black uppercase tracking-tighter">
                      {movie.release_date?.split('-')[0] || movie.first_air_date?.split('-')[0] || '2025'}
                  </span>
              </div>
              {movie.vote_average > 0 && (
                <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 px-6 py-2.5 rounded-2xl text-yellow-500 backdrop-blur-3xl">
                    <Star className="w-4 h-4" fill="currentColor" />
                    <span className="text-xs md:text-sm font-black tabular-nums">{movie.vote_average.toFixed(1)}</span>
                </div>
              )}
              {movieGenres.length > 0 && (
                 <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-2.5 rounded-2xl text-gray-300 backdrop-blur-3xl">
                    <Music2 className="w-4 h-4" />
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">{movieGenres.join(' / ')}</span>
                 </div>
              )}
          </div>

          <div className="flex items-center gap-4 mt-2 pointer-events-auto">
            <button onClick={onNavigate} className="relative group overflow-hidden bg-white text-black font-[1000] px-6 py-3.5 md:px-20 md:py-6 rounded-2xl flex items-center gap-3 text-[10px] md:text-base uppercase italic tracking-[0.2em] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] active:scale-95 transition-all">
              <div className="absolute inset-0 bg-brand/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <Play className="w-4 h-4 md:w-6 md:h-6 relative" fill="currentColor" /> 
              <span className="relative">STREAM FULL NODE</span>
            </button>
          </div>
        </motion.div>
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
  const [page, setPage] = useState(1);
  const [isMutedGlobal, setIsMutedGlobal] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [viewMode, setViewMode] = useState<'followers' | 'explore'>('explore');
  const [followedIds, setFollowedIds] = useState<Set<number>>(() => new Set(JSON.parse(localStorage.getItem(FOLLOWED_KEY) || '[]')));
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const { language } = useTranslation();
  const navigate = useNavigate();

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
    const lang = (language === 'ku' || language === 'badini') ? 'ku' : 'en-US';
    try {
      const data = await fetchData(`${requests.fetchTrendingMovies(lang)}&page=${page}`, language);
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
          setPage(p => p + 1); 
      }
    } catch (e) {
      console.error("[SHORTS ENGINE] Initialization failure:", e);
    } finally { 
      setLoading(false); 
    }
  }, [language, page]);

  useEffect(() => { loadShorts(); }, [loadShorts]);

  const displayedMovies = useMemo(() => {
    return viewMode === 'followers' ? movies.filter(m => followedIds.has(m.id)) : movies;
  }, [viewMode, movies, followedIds]);

  // ── Engine V5: Controller-Synchronized Feed (Stabilized) ──
  const { lastAction } = useGamepad();
  useEffect(() => {
    if (isScrollingRef.current) return;

    if (lastAction === 'DOWN' && activeIndex < displayedMovies.length - 1) {
        isScrollingRef.current = true;
        containerRef.current?.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
        setTimeout(() => { isScrollingRef.current = false; }, 600);
    }
    if (lastAction === 'UP' && activeIndex > 0) {
        isScrollingRef.current = true;
        containerRef.current?.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
        setTimeout(() => { isScrollingRef.current = false; }, 600);
    }
  }, [lastAction, activeIndex, displayedMovies.length]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const index = Math.round(containerRef.current.scrollTop / (window.innerHeight));
    if (index !== activeIndex) { 
        setActiveIndex(index); 
        sessionStorage.setItem(STORAGE_KEY, index.toString()); 
    }
    if (index >= displayedMovies.length - 4) loadShorts();
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
          <div className="pointer-events-auto bg-black/40 backdrop-blur-3xl border border-white/10 rounded-3xl flex items-center p-1.5 shadow-2xl overflow-hidden">
              <button onClick={() => setViewMode('followers')} className={`px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === 'followers' ? 'bg-brand text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}>Followers</button>
              <button onClick={() => setViewMode('explore')} className={`px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === 'explore' ? 'bg-white text-black shadow-xl' : 'text-gray-500 hover:text-white'}`}>Explore</button>
          </div>
      </div>

      <div 
        ref={containerRef} 
        onScroll={handleScroll} 
        className="h-full w-full overflow-y-scroll snap-y snap-proximity scrollbar-hide bg-[#050505] overscroll-none"
        style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
      >
        {displayedMovies.length > 0 ? displayedMovies.map((movie, index) => (
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
        )) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 font-black uppercase tracking-[1em] text-center px-10">
                <Spinner />
                <p className="mt-12 italic text-[11px] opacity-40">Connecting to Core...</p>
            </div>
        )}
      </div>

      <div className="fixed top-8 left-8 z-50">
        <button onClick={() => navigate('/')} className="group bg-black/40 backdrop-blur-3xl p-5 rounded-2xl border border-white/10 text-white hover:bg-brand transition-all shadow-2xl active:scale-90">
            <X className="w-7 h-7 md:w-8 md:h-8 group-hover:rotate-90 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default ShortsPage;