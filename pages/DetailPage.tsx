import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share, Play, X, Check, Plus, Star, Sparkles, Monitor,
  Layers, Info, Clapperboard, Calendar, PlayCircle,
  Clock, Globe, ShieldCheck, Zap, User, ArrowRight,
  Download, MessageSquare, Maximize, Activity, List, LayoutGrid,
  ChevronLeft, ChevronRight, Link as LinkIcon, Send, Facebook, AlertTriangle, RefreshCcw, ArrowLeft, Shield, MapPin, Award, Timer, TrendingUp, Volume2, VolumeX, Cpu
} from 'lucide-react';
import { Content, CastMember, MyListItem, WatchProgress } from '../types';
import { fetchData, isForbidden, fetchExternalIds } from '../services/tmdbService';
import { API_KEY, IMAGE_BASE_URL_POSTER, IMAGE_BASE_URL, IMAGE_BASE_URL_LOGO } from '../constants';
import Spinner from '../components/Spinner';
import Row from '../components/Row';
import { useTranslation } from '../contexts/LanguageContext';
import Portal from '../components/Portal';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import { getRankedSources, getSourceUrl, getSourceSandboxConfig } from '../utils/playerSourceUtils';
import UniversalVideoPlayer from '../components/UniversalVideoPlayer';
import PremiumVidLinkPlayer from '../components/PremiumVidLinkPlayer';
import { subtitleService } from '../services/subtitleService';

const ColorMixtureDivider: React.FC = () => {
  const { accentColor, theme } = useUI();
  const isMoon = theme.id?.includes('moon');

  return (
    <div className="relative w-full h-12 md:h-20 my-12 md:my-20 overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.02] backdrop-blur-2xl shadow-2xl">
      <motion.div
        animate={{
          x: [0, 150, 0],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute -left-20 top-1/2 -translate-y-1/2 w-80 h-40 rounded-full blur-[80px]"
        style={{ backgroundColor: isMoon ? '#38bdf8' : accentColor + '44' }}
      />
      <motion.div
        animate={{
          x: [0, -150, 0],
          opacity: [0.1, 0.3, 0.1]
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        className="absolute -right-20 top-1/2 -translate-y-1/2 w-96 h-48 bg-indigo-600/20 rounded-full blur-[100px]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
    </div>
  );
};

const DetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { theme, accentColor } = useUI();
  const { addNotification } = useNotification();
  const location = useLocation();
  const [content, setContent] = useState<any>(location.state?.customData || null);
  const [loading, setLoading] = useState(!location.state?.customData);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [recommendations, setRecommendations] = useState<Content[]>([]);
  const [isInMyList, setIsInMyList] = useState(false);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [activeSource, setActiveSource] = useState('FLKRD SERVER');
  const [showSourceSwitcher, setShowSourceSwitcher] = useState(false);
  const [selectedActorId, setSelectedActorId] = useState<number | null>(null);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);
  const [imdbId, setImdbId] = useState<string | null>(null);

  const [bingeMode, setBingeMode] = useState(() => {
    try { return localStorage.getItem('flkrd_binge_mode') === 'true'; } catch (e) { return false; }
  });
  const [showBingePrompt, setShowBingePrompt] = useState(false);

  const [sources, setSources] = useState(() => getRankedSources(false));

  const toggleBingeMode = () => {
    const newVal = !bingeMode;
    setBingeMode(newVal);
    try { localStorage.setItem('flkrd_binge_mode', String(newVal)); } catch (e) { }
  };

  const [initialProgress, setInitialProgress] = useState(0);

  const updateProgress = useCallback((time: number, duration: number) => {
    if (!content || !content.id) return;
    try {
      const progressData = localStorage.getItem('watchProgress');
      let progress: WatchProgress[] = progressData ? JSON.parse(progressData) : [];

      const index = progress.findIndex(i => i.id === content.id && i.type === 'movie');
      const item: WatchProgress = {
        id: content.id,
        type: 'movie',
        title: content.title,
        poster_path: content.poster_path,
        backdrop_path: content.backdrop_path,
        vote_average: content.vote_average,
        progress: time,
        duration: duration || content.runtime * 60 || 7200,
        lastWatched: Date.now()
      };

      if (index > -1) progress[index] = item;
      else progress.push(item);

      localStorage.setItem('watchProgress', JSON.stringify(progress));
      window.dispatchEvent(new Event('watchProgressUpdated'));

      // Binge prompt removed as requested
      window.dispatchEvent(new Event('storage'));
    } catch (e) { }
  }, [content, bingeMode, showBingePrompt, recommendations]);

  const handlePlayerProgress = useCallback((data: any) => {
    if (data.event === 'timeupdate' || data.event === 'pause' || data.event === 'ended') {
      const time = data.currentTime || data.time || 0;
      const duration = data.duration || 0;
      updateProgress(time, duration);
    }
  }, [updateProgress]);

  useEffect(() => {
    try {
      const myList = JSON.parse(localStorage.getItem('myList') || '[]');
      setIsInMyList(myList.some((item: any) => item.id === Number(id)));
    } catch (e) { }
  }, [id]);

  useEffect(() => {
    const handleBanUpdate = () => {
      if (id && bannedService.isBanned(id.replace('custom_', ''))) {
        addNotification({ type: 'error', title: 'NODE OFFLINE', message: 'This content has been removed globally.' });
        navigate('/');
      }
    };
    window.addEventListener('banned-list-updated', handleBanUpdate);
    return () => window.removeEventListener('banned-list-updated', handleBanUpdate);
  }, [id, navigate, addNotification]);

  useEffect(() => {
    const fetchContentDetails = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const apiLang = 'en-US';
        const movieEndpoint = `/movie/${id}?api_key=${API_KEY}&language=${apiLang}&append_to_response=credits,similar,recommendations,images,videos&include_image_language=en,null`;
        
        // Initial sync attempt
        let data = await fetchData(movieEndpoint, language);
        
        // Quantum Recovery: If movie signal is lost, attempt TV node sync
        if (!data) {
            console.warn("[DETAIL RECOVERY] Movie signal lost. Attempting TV relay...");
            const tvEndpoint = `/tv/${id}?api_key=${API_KEY}&language=${apiLang}&append_to_response=credits,similar,recommendations,images,videos&include_image_language=en,null`;
            data = await fetchData(tvEndpoint, language);
            
            if (data) {
                console.log("[DETAIL RECOVERY] TV relay established. Redirecting route...");
                navigate(`/details/tv/${id}`, { replace: true, state: { customData: data } });
                return;
            }
        }

        if (data) {
          setContent(data);
          setCast(data.credits?.cast?.slice(0, 10) || []);
          let recs = [...(data.recommendations?.results || []), ...(data.similar?.results || [])];
          setRecommendations(recs.filter(r => r.id !== Number(id) && !isForbidden(r, language)));

          const logo = data.images?.logos?.find((l: any) => l.file_path && (l.iso_639_1 === 'en' || !l.iso_639_1));
          if (logo) setLogoPath(logo.file_path);

          const trailer = data.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
          if (trailer) setTrailerKey(trailer.key);

          const progressData = JSON.parse(localStorage.getItem('watchProgress') || '[]');
          const saved = progressData.find((p: any) => p.id === data.id && p.type === 'movie');
          if (saved) {
            setInitialProgress(saved.progress || 0);
          }

          // [SUBTITLE SYNC] Search for Kurdish subtitles using OpenSubtitles
          try {
            const externalIds = await fetchExternalIds(id, 'movie');
            if (externalIds && externalIds.imdb_id) {
                setImdbId(externalIds.imdb_id);
                const results = await subtitleService.searchSubtitles(externalIds.imdb_id, 'movie', undefined, undefined, 'ku');
                if (results && results.length > 0) {
                    // Filter for the best Kurdish track
                    const bestTrack = results.find(r => 
                        r.attributes.language === 'ku' || 
                        r.attributes.language === 'ckb' || 
                        r.attributes.display_name.toLowerCase().includes('kurd')
                    ) || results[0];

                    const downloadLink = bestTrack.attributes.file_id !== 0 
                        ? await subtitleService.getDownloadLink(bestTrack.attributes.file_id)
                        : bestTrack.attributes.url;

                    if (downloadLink) {
                        const blobUrl = await subtitleService.getSubtitleBlob(downloadLink);
                        if (blobUrl) {
                            console.log("[SUBTITLE SYNC] Kurdish Track Established:", blobUrl);
                            setSubtitleUrl(blobUrl);
                            
                            // [PINNING] Boost Kurdish-ready servers
                            const ranked = getRankedSources(true);
                            setSources(ranked);

                            addNotification({ 
                              type: 'success', 
                              title: 'ژێرنووسی کوردی', 
                              message: 'ژێرنووسی کوردی دۆزرایەوە و بە ئۆتۆماتیکی چالاک کرا.' 
                            });
                        }
                    }
                } else {
                    addNotification({ 
                      type: 'info', 
                      title: 'ژێرنووس', 
                      message: 'ببورە، ژێرنووسی کوردی بۆ ئەم بەرهەمە لە OpenSubtitles نەدۆزرایەوە.' 
                    });
                }
            }
          } catch (e) {
              console.warn("[SUBTITLE SYNC] Error fetching automated tracks:", e);
          }
        } else {
            addNotification({ type: 'error', title: 'SIGNAL LOST', message: 'The requested node is unavailable in the global archive.' });
            navigate(-1);
        }
      } catch (error) { 
          console.error("[CRITICAL SIGNAL ERROR]:", error); 
          addNotification({ type: 'error', title: 'CORE FAILURE', message: 'System communication error.' });
      } finally { 
          setLoading(false); 
      }
    };
    fetchContentDetails();
    window.scrollTo(0, 0);
  }, [id, language]);

  const playButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isPlayerModalOpen && playButtonRef.current) {
      // Small delay to ensure modal transition finishes
      setTimeout(() => playButtonRef.current?.focus(), 300);
    }
  }, [isPlayerModalOpen]);

  const handlePlayClick = () => {
    const progressData = JSON.parse(localStorage.getItem('watchProgress') || '[]');
    const saved = progressData.find((p: any) => p.id === content?.id && p.type === 'movie');
    setInitialProgress(saved ? saved.progress : 0);

    setIsPlayerLoading(true);
    setIsPlayerModalOpen(true);
  };

  const handleToggleMyList = () => {
    if (!content) return;
    try {
      let myList: MyListItem[] = JSON.parse(localStorage.getItem('myList') || '[]');
      const index = myList.findIndex(item => item.id === content.id);
      if (index > -1) {
        myList.splice(index, 1);
        setIsInMyList(false);
      } else {
        myList.push({ id: content.id, media_type: 'movie', title: content.title || '', poster_path: content.poster_path });
        setIsInMyList(true);
      }
      localStorage.setItem('myList', JSON.stringify(myList));
      window.dispatchEvent(new Event('storage'));
    } catch (e) { }
  };

  if (loading && !content) return <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]"><Spinner /></div>;
  if (!content) return null;

  return (
    <div className="pb-40 bg-transparent min-h-screen text-[var(--text-primary)] relative overflow-x-hidden transition-colors duration-500" dir={language === 'ku' ? 'rtl' : 'ltr'}>
      <div className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000 ${theme.id?.includes('moon') ? 'opacity-10' : 'opacity-20'}`}>
        <img src={`${IMAGE_BASE_URL}${content.backdrop_path}`} className="w-full h-full object-cover blur-[140px] scale-150" alt="" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)] via-transparent to-[var(--bg-primary)]"></div>
      </div>

      <AnimatePresence>
        {isTrailerModalOpen && trailerKey && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 z-[300] backdrop-blur-3xl flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-5xl flex justify-between items-center mb-4 text-white">
              <h2 className="text-xl font-black uppercase italic tracking-tighter">{t('playTrailer')}</h2>
              <button onClick={() => setIsTrailerModalOpen(false)} className="p-3 bg-white/10 hover:bg-red-600 rounded-2xl transition-all"><X size={24} /></button>
            </div>
            <div className="w-full max-w-5xl aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPlayerModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-[9999] flex flex-col" dir="ltr">
            <div className="w-full flex items-center justify-between p-4 md:p-6 bg-black/80 backdrop-blur-xl border-b border-white/5 z-[10000]">
              <button onClick={() => setIsPlayerModalOpen(false)} className="text-white bg-white/5 p-2.5 md:p-3 rounded-xl md:rounded-2xl hover:bg-red-600 transition-all shadow-xl group">
                <X size={20} className="md:w-6 md:h-6 group-hover:rotate-90 transition-transform" />
              </button>
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center gap-2 mb-1 bg-blue-600/20 px-3 py-1 rounded-full border border-blue-600/30">
                  <Shield size={12} className="text-blue-500" />
                  <p className="text-[8px] md:text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">{language === 'ku' ? 'پەیوەندی پارێزراوە' : 'SECURE NODE ACTIVE'}</p>
                </div>
                <h2 className="text-xs md:sm font-bold uppercase tracking-tight italic line-clamp-1 text-white">{content.title}</h2>
              </div>
              <button onClick={() => setShowSourceSwitcher(!showSourceSwitcher)} className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500 text-[8px] md:text-[10px] font-black hover:bg-red-600 hover:text-white transition-all">
                <RefreshCcw size={12} /> <span className="hidden sm:inline">RELINK</span>
              </button>
            </div>

            <div className="flex-1 w-full relative bg-black overflow-hidden">
              
              {activeSource === 'FLKRD SERVER 1' ? (
                <PremiumVidLinkPlayer
                  tmdbId={id!}
                  type="movie"
                  title={content.title}
                  initialProgress={initialProgress}
                  accentColor={accentColor}
                  subtitleUrl={subtitleUrl || undefined}
                  imdbId={imdbId || undefined}
                  onProgress={handlePlayerProgress}
                />
              ) : (
                <UniversalVideoPlayer
                  src={getSourceUrl(activeSource, id!, 'movie', undefined, undefined, initialProgress, accentColor, subtitleUrl || undefined)}
                  accentColor={accentColor}
                  language={language}
                  onLoad={() => setIsPlayerLoading(false)}
                  onProgress={handlePlayerProgress}
                  subtitleUrl={subtitleUrl || undefined}
                  imdbId={imdbId || content?.imdb_id}
                  contentType="movie"
                />
              )}

              <AnimatePresence>
                {showSourceSwitcher && (
                  <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="absolute top-0 right-0 bottom-0 w-72 bg-black/95 backdrop-blur-3xl border-l border-white/10 z-[300] p-6 overflow-y-auto scrollbar-hide">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_#e50914]" />
                        <h3 className="text-sm font-black uppercase italic tracking-tighter text-white">Streaming Nodes</h3>
                      </div>
                      <button 
                        onClick={() => setShowSourceSwitcher(false)}
                        className="p-2 hover:bg-white/10 rounded-full transition-all group"
                      >
                        <X size={20} className="text-gray-400 group-hover:rotate-90 transition-transform" />
                      </button>
                    </div>

                    <div className="space-y-4 pb-12">
                      {sources.map((s, idx) => {
                        const iconPath = s.name === 'FLKRD SERVER' ? '/assets/icons/master_crown.png' : 
                                       s.name === 'FLKRD SERVER 1' ? '/assets/icons/diamond.png' : 
                                       s.name === 'FLKRD SERVER 2' ? '/assets/icons/bronze.png' : 
                                       s.name === 'FLKRD SERVER 3' ? '/assets/icons/diamond.png' : null;

                        const isActive = activeSource === s.name;
                        
                        // Simulated data for "Special" feel
                        const speed = s.name === 'FLKRD SERVER' ? '1.4 GB/s' : s.name === 'FLKRD SERVER 1' ? '1.2 GB/s' : '980 MB/s';
                        const latency = s.name === 'FLKRD SERVER' ? '24ms' : '45ms';

                        return (
                          <motion.button 
                            key={s.name}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            whileHover={{ scale: 1.02, x: -4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => { 
                              setActiveSource(s.name); 
                              setIsPlayerLoading(true); 
                              setShowSourceSwitcher(false); 
                            }} 
                            className={`w-full p-5 rounded-[2rem] flex flex-col gap-3 transition-all border group relative overflow-hidden ${
                              isActive 
                                ? 'bg-red-600/10 border-red-600/40 shadow-[0_0_30px_rgba(229,9,20,0.1)]' 
                                : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.08]'
                            }`}
                          >
                            {isActive && (
                              <motion.div 
                                layoutId="active-node-glow"
                                className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-transparent"
                              />
                            )}

                            <div className="flex items-center justify-between relative z-10">
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  {iconPath ? (
                                    <img src={iconPath} className="w-8 h-8 object-contain" style={{ mixBlendMode: 'screen' }} alt="" />
                                  ) : (
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 font-black text-[10px] ${isActive ? 'text-red-500' : 'text-gray-500'}`}>
                                      {idx + 1}
                                    </div>
                                  )}
                                  {isActive && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-black" />}
                                </div>
                                <div className="flex flex-col items-start">
                                  <span className={`text-xs font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-gray-400'}`}>
                                    {s.name}
                                  </span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${isActive ? 'bg-white/20 text-white' : 'bg-black/20 text-gray-500'}`}>
                                      {speed}
                                    </span>
                                    {s.badge === 'ku' && (
                                      <div className="flex items-center gap-1">
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/3/35/Flag_of_Kurdistan.svg" className="w-3 h-2 rounded-[2px]" alt="" />
                                        <span className="text-[7px] font-black text-green-500 uppercase">KU CC</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`text-[8px] font-black italic ${isActive ? 'text-white/60' : 'text-gray-600'}`}>{latency}</span>
                                {isActive && <div className="w-1.5 h-1.5 bg-red-600 rounded-full shadow-[0_0_8px_#e50914]" />}
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative w-full h-[75vh] md:h-[95vh] overflow-hidden z-10 group" dir="ltr">
        <div className="absolute inset-0 overflow-hidden">
          {trailerKey ? (
            <div className="absolute inset-0 scale-[1.5] pointer-events-none">
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${trailerKey}&controls=0&modestbranding=1&rel=0&showinfo=0&enablejsapi=1`}
                className="w-full h-full opacity-60"
                frameBorder="0"
                allow="autoplay"
              />
            </div>
          ) : (
            <motion.img initial={{ scale: 1.2 }} animate={{ scale: 1 }} transition={{ duration: 20, repeat: Infinity, repeatType: "reverse", ease: "linear" }} src={`${IMAGE_BASE_URL}${content.backdrop_path}`} alt="" className="w-full h-full object-cover opacity-70" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/20 to-transparent dark-gradient-mask"></div>
        </div>

        <Portal id="detail-nav-portal">
          <div className={`fixed top-24 ${language === 'ku' ? 'right-6 md:right-20' : 'left-6 md:left-20'} z-[110]`}>
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 bg-black/60 backdrop-blur-2xl border border-white/20 hover:bg-[var(--brand-red)] text-white px-5 py-3 rounded-2xl transition-all shadow-2xl group active:scale-95">
              <ArrowLeft size={20} className={`${language === 'ku' ? 'rotate-180' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">{t('back')}</span>
            </button>
          </div>
        </Portal>

        <div className={`absolute bottom-8 md:bottom-24 ${language === 'ku' ? 'right-0 text-right px-6 md:px-8 lg:px-20' : 'left-0 text-left px-6 md:px-8 lg:px-20'} z-10 flex flex-col max-w-6xl items-start`}>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="bg-blue-600/20 text-blue-500 px-3 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] border border-blue-600/30 flex items-center gap-1.5"><Shield size={12} /> SECURE MODULE</div>
            {content.status === 'Released' && <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] border border-green-500/30">Available</div>}
          </div>

          <div className="mb-8 w-full max-w-md md:max-w-xl">
            {logoPath ? (
              <motion.img
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                src={`${IMAGE_BASE_URL_LOGO}${logoPath}`}
                alt={content.title}
                className="max-w-full h-auto max-h-32 md:max-h-56 object-contain"
              />
            ) : (
              <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-9xl font-[1000] uppercase tracking-tighter italic leading-[0.9] text-[var(--text-primary)] drop-shadow-2xl">
                {content.title}
              </motion.h1>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-5 mb-8">
            <div className="flex items-center gap-1.5 bg-yellow-500/10 px-3 py-1.5 rounded-xl border border-yellow-500/20 shadow-lg backdrop-blur-xl">
              <Star size={14} className="text-yellow-500 fill-current" />
              <span className="text-xs font-black text-yellow-500">{content.vote_average?.toFixed(1) || '0.0'}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 shadow-lg backdrop-blur-xl">
              <Timer size={14} className="text-[var(--text-secondary)]" />
              <span className="text-xs font-black text-[var(--text-secondary)]">{content.runtime}m</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 shadow-lg backdrop-blur-xl">
              <Calendar size={14} className="text-[var(--text-secondary)]" />
              <span className="text-xs font-black text-[var(--text-secondary)]">{content.release_date?.split('-')[0]}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-5">
            <motion.button ref={playButtonRef} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handlePlayClick} className="flex items-center gap-3 bg-[var(--text-primary)] text-[var(--bg-primary)] font-[1000] py-4 px-10 md:py-5 md:px-16 rounded-xl md:rounded-[1.5rem] shadow-2xl transition-all"><Play size={20} fill="currentColor" /><span className="text-sm md:text-xl uppercase italic tracking-tighter">{initialProgress > 10 ? (language === 'ku' ? 'بەردەوامبە' : 'RESUME STREAM') : (language === 'ku' ? 'دەستپێکردن' : 'START STREAM')}</span></motion.button>
            {trailerKey && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsTrailerModalOpen(true)} className="flex items-center gap-3 bg-white/10 backdrop-blur-3xl border border-white/10 text-[var(--text-primary)] font-[1000] py-4 px-10 md:py-5 md:px-16 rounded-xl md:rounded-[1.5rem] shadow-2xl transition-all"><PlayCircle size={20} /><span className="text-sm md:text-xl uppercase italic tracking-tighter">{t('playTrailer')}</span></motion.button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 lg:px-20 py-16 md:py-24 relative z-10">
        <ColorMixtureDivider />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 md:gap-20">
          <div className="lg:col-span-2">
            <div className="mb-20">
              <div className="flex items-center gap-4 mb-10"><div className="w-1.5 h-10 bg-[var(--brand-red)] rounded-full shadow-[0_0_20px_var(--brand-red)]"></div><h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-secondary)] italic">{language === 'ku' ? 'کورتەی فیلم' : 'OVERVIEW'}</h3></div>
              <p className="text-[var(--text-primary)] text-lg md:text-2xl leading-relaxed italic font-bold">{content.overview}</p>
            </div>

            {cast.length > 0 && (
              <div className="mb-24">
                <div className="flex items-center gap-4 mb-12"><h2 className="text-2xl md:text-6xl font-[1000] uppercase italic tracking-tighter text-[var(--text-primary)]">{language === 'ku' ? 'ئەکتەرەکان' : 'ACTORS'}</h2><div className="h-[2px] flex-grow bg-white/5 rounded-full"></div></div>
                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-8">
                  {cast.map(person => (
                    <div key={person.id} className="group cursor-pointer" onClick={() => setSelectedActorId(person.id)}>
                      <div className="aspect-[3/4] rounded-xl md:rounded-[2rem] overflow-hidden mb-3 border border-[var(--border-color)] shadow-2xl relative">
                        <img src={person.profile_path ? `${IMAGE_BASE_URL}${person.profile_path}` : 'https://i.imgur.com/4HoT8Yf.png'} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" />
                      </div>
                      <p className="text-[10px] md:text-xs font-black uppercase italic truncate text-[var(--text-primary)]">{person.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {recommendations.length > 0 && (
          <div className="mt-20">
            <Row title={language === 'ku' ? 'زیاتر لەم جۆرە' : 'MORE LIKE THIS'} items={recommendations} type="movie" />
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailPage;