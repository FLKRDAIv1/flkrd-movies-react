import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Volume2, VolumeX, CheckCircle2, 
  X, Play, ShieldCheck, Heart, WifiOff, Zap, Calendar, Tag, Info, Star, Music2
} from 'lucide-react';
import { Content } from '../types';
import { fetchData } from '../services/tmdbService';
import { requests, API_KEY, IMAGE_BASE_URL, GENRES_T, IMAGE_BASE_URL_POSTER } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import Spinner from '../components/Spinner';

const STORAGE_KEY = 'flkrd_shorts_last_index';
const FOLLOWED_KEY = 'flkrd_followed_movies';

interface TrailerItemProps {
  movie: Content;
  active: boolean;
  onNavigate: () => void;
  isMutedGlobal: boolean;
  toggleMuteGlobal: () => void;
  hasInteracted: boolean;
  onAutoScrollRequest: () => void;
  isFollowed: boolean;
  onToggleFollow: () => void;
}

const TrailerItem: React.FC<TrailerItemProps> = ({ 
    movie, active, onNavigate, isMutedGlobal, toggleMuteGlobal, 
    hasInteracted, onAutoScrollRequest, isFollowed, onToggleFollow 
}) => {
  const { t } = useTranslation();
  const { theme, scale } = useUI();
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const lastTapRef = useRef<number>(0);
  
  const movieGenres = useMemo(() => {
    const ids = movie.genre_ids || [];
    return ids.slice(0, 2).map(id => {
        const found = GENRES_T.find(g => g.id === id);
        return found ? t(found.nameKey) : null;
    }).filter(Boolean);
  }, [movie.genre_ids, t]);

  useEffect(() => {
    const loadMetadata = async () => {
      const type = movie.media_type || 'movie';
      const endpoint = `/${type}/${movie.id}?api_key=${API_KEY}&append_to_response=videos,images&include_image_language=en,null`;
      try {
        const data = await fetchData(endpoint, 'en');
        if (data) {
          const videos = data.videos?.results || [];
          const trailer = videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') 
                       || videos.find((v: any) => v.site === 'YouTube') 
                       || null;
          
          if (!trailer?.key && active) onAutoScrollRequest();
          setTrailerKey(trailer?.key || null);

          const logos = data.images?.logos || [];
          const logoPath = logos.find((l: any) => l.iso_639_1 === 'en' || !l.iso_639_1)?.file_path;
          if (logoPath) setLogo(logoPath);
        } else if (active) {
          onAutoScrollRequest();
        }
      } catch (err) {
        if (active) onAutoScrollRequest();
      }
    };
    loadMetadata();
  }, [movie.id, movie.media_type, active, onAutoScrollRequest]);

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
    return `https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=${isMutedGlobal ? 1 : 0}&loop=1&playlist=${trailerKey}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&enablejsapi=1`;
  }, [trailerKey, active, hasInteracted, isMutedGlobal]);

  return (
    <div className="h-full w-full relative snap-start bg-main-bg flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden flex items-center justify-center">
        {trailerKey ? (
          <div className="w-full h-full relative pointer-events-none">
            <AnimatePresence>
                {videoUrl && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="w-full h-full scale-[2.0] md:scale-[1.2] brightness-[0.7]"
                    >
                        <iframe 
                            src={videoUrl}
                            className="w-full h-full"
                            frameBorder="0"
                            allow="autoplay; encrypted-media"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/95 z-20" />
            
            {!videoUrl && (
                <img 
                    src={`${IMAGE_BASE_URL}${movie.backdrop_path}`} 
                    className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm"
                    alt=""
                />
            )}
          </div>
        ) : (
          <div className="h-full w-full bg-[#050505] flex flex-col items-center justify-center">
             <Spinner />
          </div>
        )}
      </div>

      <div className="absolute inset-0 z-30" onClick={handleInteraction} />

      <AnimatePresence>
          {showHeartPop && (
              <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0.5, 1.6, 1.3], opacity: [0, 1, 0] }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
                  <Heart className="text-brand fill-brand drop-shadow-[0_0_80px_rgba(var(--brand-red-rgb),1)] w-48 h-48 md:w-64 md:h-64" />
              </motion.div>
          )}
      </AnimatePresence>

      {/* Side Action Bar - Right Side */}
      <div className="absolute right-3 bottom-[12%] md:right-8 md:bottom-[15%] flex flex-col items-center gap-6 md:gap-8 z-40">
        <motion.div whileTap={{ scale: 0.85 }} className="relative cursor-pointer" onClick={onNavigate}>
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-brand overflow-hidden bg-black p-0.5 shadow-2xl">
             <img src={movie.poster_path ? `${IMAGE_BASE_URL_POSTER}${movie.poster_path}` : "https://i.imgur.com/4HoT8Yf.png"} alt="" className="w-full h-full object-cover rounded-full" />
          </div>
          <button className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-brand text-white rounded-full p-1 border-2 border-black shadow-lg">
            <Plus className="w-3 h-3" />
          </button>
        </motion.div>

        <button onClick={(e) => { e.stopPropagation(); onToggleFollow(); }} className="flex flex-col items-center gap-1 group">
          <motion.div animate={isFollowed ? { scale: [1, 1.3, 1] } : {}} className={`p-4 rounded-full border transition-all ${isFollowed ? 'bg-brand border-brand shadow-[0_0_30px_rgba(var(--brand-red-rgb),0.6)]' : 'bg-black/40 border-white/10 backdrop-blur-xl'}`}>
            <Heart className={`w-6 h-6 md:w-8 md:h-8 ${isFollowed ? "fill-white text-white" : "text-white"}`} />
          </motion.div>
          <span className="text-[8px] md:text-[10px] font-black text-white/50 uppercase tracking-widest">Connect</span>
        </button>

        <button onClick={(e) => { e.stopPropagation(); toggleMuteGlobal(); }} className="p-4 rounded-full bg-brand shadow-2xl transition-all active:scale-90">
          {isMutedGlobal ? <VolumeX className="w-6 h-6 md:w-8 md:h-8 text-white" /> : <Volume2 className="w-6 h-6 md:w-8 md:h-8 text-white" />}
        </button>
      </div>

      {/* Info Panel - Bottom Left */}
      <div className="absolute bottom-10 left-4 right-20 md:left-14 md:bottom-20 md:right-32 z-40 pointer-events-none text-left" dir="ltr">
        <div className="flex flex-col items-start gap-1">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="bg-blue-500 rounded-full p-0.5 shadow-lg"><CheckCircle2 className="w-3 h-3 text-white" /></div>
            <h3 className="font-black text-xs md:text-sm text-white uppercase tracking-widest italic drop-shadow-md">Zana Faroq • Transmission</h3>
          </div>

          <div className="mb-6 max-w-[260px] md:max-w-xl">
            {logo ? (
              <img src={`${IMAGE_BASE_URL}${logo}`} className="max-h-14 md:max-h-24 object-contain drop-shadow-2xl" alt={movie.title} />
            ) : (
              <h1 className="text-2xl md:text-5xl font-[1000] text-white uppercase italic tracking-tighter leading-none drop-shadow-2xl">{movie.title || movie.name}</h1>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="flex items-center gap-1.5 bg-brand text-white px-3 py-1 rounded-lg backdrop-blur-2xl shadow-xl">
                  <Calendar className="w-3 h-3 md:w-4 md:h-4 text-white" fill="white" />
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-tighter">
                      {movie.release_date?.split('-')[0] || movie.first_air_date?.split('-')[0] || '2024'}
                  </span>
              </div>
              {movie.vote_average > 0 && (
                <div className="flex items-center gap-1.5 bg-yellow-500/20 border border-yellow-500/30 px-3 py-1 rounded-lg text-yellow-500">
                    <Star className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" />
                    <span className="text-[10px] md:text-xs font-black">{movie.vote_average.toFixed(1)}</span>
                </div>
              )}
          </div>

          <div className="flex items-center gap-4 mt-2 pointer-events-auto">
            <button onClick={onNavigate} className="bg-white text-black font-[1000] px-10 py-4 md:px-16 md:py-5 rounded-2xl flex items-center gap-3 text-[10px] md:text-sm uppercase italic tracking-widest shadow-2xl active:scale-95 transition-all">
              <Play className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" /> STREAM FULL NODE
            </button>
          </div>
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
  const { language } = useTranslation();
  const { theme, scale } = useUI();
  const navigate = useNavigate();

  const toggleMuteGlobal = () => { 
    setIsMutedGlobal(!isMutedGlobal); 
    if (!hasInteracted) setHasInteracted(true); 
  };

  const loadShorts = useCallback(async () => {
    const lang = language === 'ku' ? 'ku' : 'en-US';
    try {
      const data = await fetchData(`${requests.fetchTrendingMovies(lang)}&page=${page}`, language);
      if (data) { 
          setMovies(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              const uniqueNew = data.filter((m: any) => !existingIds.has(m.id));
              return [...prev, ...uniqueNew];
          }); 
          setPage(p => p + 1); 
      }
    } catch (e) {} finally { setLoading(false); }
  }, [language, page]);

  useEffect(() => { loadShorts(); }, [loadShorts]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const index = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
    if (index !== activeIndex) { 
        setActiveIndex(index); 
        sessionStorage.setItem(STORAGE_KEY, index.toString()); 
    }
    if (index >= displayedMovies.length - 3) loadShorts();
  };

  const handleToggleFollow = (id: number) => {
    const next = new Set(followedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFollowedIds(next);
    localStorage.setItem(FOLLOWED_KEY, JSON.stringify(Array.from(next)));
  };

  const displayedMovies = useMemo(() => {
    return viewMode === 'followers' ? movies.filter(m => followedIds.has(m.id)) : movies;
  }, [viewMode, movies, followedIds]);

  if (loading && movies.length === 0) return <div className="h-screen bg-main-bg flex items-center justify-center"><Spinner /></div>;

  return (
    <div className="fixed inset-0 z-[60] bg-main-bg">
      <AnimatePresence>
        {!hasInteracted && (
          <motion.div exit={{ opacity: 0 }} className="absolute inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-[60px] p-6 text-center">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md">
              <div className="w-24 h-24 bg-brand/10 rounded-[3rem] flex items-center justify-center mx-auto mb-10 border border-brand/20 shadow-2xl">
                <ShieldCheck className="text-brand w-12 h-12" />
              </div>
              <h2 className="text-4xl font-[1000] text-white uppercase italic tracking-tighter mb-4 text-center">Initialize Feed</h2>
              <button onClick={() => { setIsMutedGlobal(false); setHasInteracted(true); }} className="w-full bg-white text-black font-[1000] py-6 rounded-[2rem] flex items-center justify-center gap-4 uppercase italic tracking-[0.2em] shadow-2xl hover:bg-brand hover:text-white transition-all active:scale-95">
                  START STREAMING <Zap className="w-6 h-6" fill="currentColor" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-0 left-0 right-0 z-50 flex flex-col items-center pt-8 pointer-events-none">
          <div className="pointer-events-auto bg-black/40 backdrop-blur-3xl border border-white/10 rounded-2xl flex items-center p-1.5 shadow-2xl">
              <button onClick={() => setViewMode('followers')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'followers' ? 'bg-brand text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}>Followers</button>
              <button onClick={() => setViewMode('explore')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'explore' ? 'bg-white text-black shadow-xl' : 'text-gray-500 hover:text-white'}`}>Explore</button>
          </div>
      </div>

      <div ref={containerRef} onScroll={handleScroll} className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-main-bg">
        {displayedMovies.length > 0 ? displayedMovies.map((movie, index) => (
            <TrailerItem 
                key={`${movie.id}-${index}`} movie={movie} active={index === activeIndex}
                isMutedGlobal={isMutedGlobal} toggleMuteGlobal={toggleMuteGlobal}
                hasInteracted={hasInteracted} onAutoScrollRequest={() => containerRef.current?.scrollBy({top: containerRef.current.clientHeight, behavior: 'smooth'})}
                onNavigate={() => navigate(`/details/${movie.media_type || 'movie'}/${movie.id}`)}
                isFollowed={followedIds.has(movie.id)} onToggleFollow={() => handleToggleFollow(movie.id)}
            />
        )) : (
            <div className="h-full flex flex-col items-center justify-center text-sec-text font-black uppercase tracking-[0.5em] text-center px-10">
                <Spinner />
                <p className="mt-12 italic text-[11px]">Synchronizing Nodes...</p>
            </div>
        )}
      </div>

      <div className="fixed top-6 left-6 z-50">
        <button onClick={() => navigate('/')} className="bg-black/30 backdrop-blur-2xl p-4 rounded-2xl border border-white/10 text-white hover:bg-brand transition-all shadow-xl active:scale-90">
            <X className="w-6 h-6 md:w-8 md:h-8" />
        </button>
      </div>
    </div>
  );
};

export default ShortsPage;