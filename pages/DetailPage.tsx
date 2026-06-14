import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share, Play, X, Check, Plus, Star, Sparkles, Monitor, Tv,
  Layers, Info, Clapperboard, Calendar, PlayCircle,
  Clock, Globe, ShieldCheck, Zap, User, ArrowRight,
  Download, MessageSquare, Maximize, Activity, List, LayoutGrid,
  ChevronLeft, ChevronRight, Link as LinkIcon, Send, Facebook, AlertTriangle, RefreshCcw, ArrowLeft, Shield, MapPin, Award, Timer, TrendingUp, Volume2, VolumeX, Cpu
} from 'lucide-react';
import { Content, CastMember, MyListItem, WatchProgress } from '../types';
import { fetchData, isForbidden, fetchExternalIds } from '../services/tmdbService';
import { API_KEY, IMAGE_BASE_URL_POSTER, IMAGE_BASE_URL, IMAGE_BASE_URL_LOGO } from '../constants';
import { SkeletonDetailPage } from '../components/Skeleton';
import Row from '../components/Row';
import Spinner from '../components/Spinner';
import { useTranslation } from '../contexts/LanguageContext';
import Portal from '../components/Portal';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import { getRankedSources, getSourceUrl, getSourceSandboxConfig } from '../utils/playerSourceUtils';
import UniversalVideoPlayer from '../components/UniversalVideoPlayer';
import PremiumVidLinkPlayer from '../components/PremiumVidLinkPlayer';
import { subtitleService } from '../services/subtitleService';
import { LiquidButton } from '../components/ui/liquid-glass-button';
import { useLocalUser } from '../hooks/useLocalUser';
import { generateUUID } from '../utils/uuidUtils';
import { supabase } from '../utils/supabaseClient';
import { bannedService } from '../services/bannedService';

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
  const [activeSource, setActiveSource] = useState(() => {
    const ranked = getRankedSources(false);
    return ranked.length > 0 ? ranked[0].name : 'FLKRD SERVER';
  });
  const [showSourceSwitcher, setShowSourceSwitcher] = useState(false);
  const [selectedActorId, setSelectedActorId] = useState<number | null>(null);
  const [actorDetails, setActorDetails] = useState<any | null>(null);
  const [isActorLoading, setIsActorLoading] = useState(false);

  useEffect(() => {
    if (!selectedActorId) {
      setActorDetails(null);
      return;
    }
    const fetchActorInfo = async () => {
      setIsActorLoading(true);
      try {
        const data = await fetchData(`/person/${selectedActorId}?api_key=${API_KEY}&language=en-US&append_to_response=combined_credits`, language);
        if (data) {
          setActorDetails(data);
        }
      } catch (err) {
        console.error("Failed to fetch actor details:", err);
      } finally {
        setIsActorLoading(false);
      }
    };
    fetchActorInfo();
  }, [selectedActorId, language]);
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

  useEffect(() => {
    const handleScoresUpdate = () => {
      const ranked = getRankedSources(!!subtitleUrl);
      setSources(ranked);
      // Auto-switch to the new top server if user hasn't manually chosen one
      if (ranked.length > 0) {
        setActiveSource(ranked[0].name);
      }
    };
    window.addEventListener('player-source-scores-updated', handleScoresUpdate);
    return () => {
      window.removeEventListener('player-source-scores-updated', handleScoresUpdate);
    };
  }, [subtitleUrl]);


  const toggleBingeMode = () => {
    const newVal = !bingeMode;
    setBingeMode(newVal);
    try { localStorage.setItem('flkrd_binge_mode', String(newVal)); } catch (e) { }
  };

  const [initialProgress, setInitialProgress] = useState(0);
  const lastResolvedDurationRef = useRef<number>(0);

  useEffect(() => {
    lastResolvedDurationRef.current = 0;
  }, [id]);

  const backdropIframeRef = useRef<HTMLIFrameElement>(null);
  const origin = window.location.origin.startsWith('http') ? window.location.origin : '';

  useEffect(() => {
    const iframe = backdropIframeRef.current;
    if (iframe && iframe.contentWindow) {
      const command = isMuted ? 'mute' : 'unMute';
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: command,
          args: []
        }),
        '*'
      );
    }
  }, [isMuted]);

  const { localUserId } = useLocalUser();
  const [isCreatingParty, setIsCreatingParty] = useState(false);

  const handleCreateWatchParty = async () => {
    if (!content || isCreatingParty) return;
    setIsCreatingParty(true);
    try {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      const ticketId = generateUUID();

      const { error } = await supabase.from('watch_tickets').insert({
        id: ticketId,
        movie_id: String(content.id),
        host_id: localUserId,
        pin_code: pin,
        status: 'waiting'
      });

      if (error) throw error;

      addNotification({
        type: 'success',
        title: (language === 'ku' || language === 'badini') ? 'ئاهەنگی تەماشا دروستکرا' : 'Watch Party Created',
        message: (language === 'ku' || language === 'badini') 
          ? 'بلیتەکە بە سەرکەوتوویی دروستکرا. بەستەرەکە هاوبەش بکە لەگەڵ هاوڕێیەکەت!'
          : 'Ticket generated successfully. Share the link with a friend!',
      });

      // Redirect host directly to the watch room page
      navigate(`/watch/${ticketId}`);
    } catch (e: any) {
      console.error('Failed to create watch party:', e);
      addNotification({
        type: 'error',
        title: (language === 'ku' || language === 'badini') ? 'هەڵەیەک ڕوویدا' : 'Creation Failed',
        message: e.message || 'Could not connect to ticketing service.',
      });
    } finally {
      setIsCreatingParty(false);
    }
  };

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
    // Accept any event with a valid currentTime — covers VidKing, Videasy ({timestamp}), VidLink, etc.
    const time = data.currentTime || data.time || 0;
    if (data.duration && data.duration > 0) {
      lastResolvedDurationRef.current = data.duration;
    }
    const duration = lastResolvedDurationRef.current || data.duration || (content?.runtime ? content.runtime * 60 : 0) || 7200;

    if (time > 0) {
      updateProgress(time, duration);
    } else if (data.event === 'pause' || data.event === 'ended') {
      // Force save on pause/end even without duration
      const t = data.currentTime || data.time || 0;
      if (t > 0) updateProgress(t, duration);
    }
  }, [updateProgress, content]);

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
      if (!content) setLoading(true);
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
          
          // Update browser window title dynamically for optimal search engine crawl and index representation
          const year = data.release_date ? ` (${data.release_date.split('-')[0]})` : '';
          const movieName = data.title || data.original_title || 'Movie';
          document.title = (language === 'ku' || language === 'badini')
            ? `تەماشای فیلمی ${movieName}${year} بکە | FLKRD`
            : `Watch ${movieName}${year} | FLKRD`;

          // Dynamically update meta tags for optimal Google crawling and indexing
          const overviewText = data.overview || '';
          const cleanOverview = overviewText.slice(0, 150);
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) {
            metaDesc.setAttribute('content', `Watch ${movieName}${year} on FLKRD. ${cleanOverview}`);
          }
          const ogDesc = document.querySelector('meta[property="og:description"]');
          if (ogDesc) {
            ogDesc.setAttribute('content', `Watch ${movieName}${year} on FLKRD. ${cleanOverview}`);
          }
          const ogTitle = document.querySelector('meta[property="og:title"]');
          if (ogTitle) {
            ogTitle.setAttribute('content', `${movieName}${year} | FLKRD`);
          }

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

          // [SUBTITLE SYNC] Search for Kurdish subtitles using Supabase/OpenSubtitles
          try {
            // Check Supabase custom_subtitles first
            let supabaseSubUrl = null;
            try {
              const { data } = await supabase
                .from('custom_subtitles')
                .select('subtitle_url')
                .eq('tmdb_id', String(id))
                .eq('media_type', 'movie')
                .eq('language', 'ku')
                .eq('season', 0)
                .eq('episode', 0)
                .maybeSingle();
              if (data && data.subtitle_url) {
                supabaseSubUrl = data.subtitle_url;
                if (supabaseSubUrl.startsWith('//')) {
                  supabaseSubUrl = `https:${supabaseSubUrl}`;
                }
              }
            } catch (dbErr) {
              console.warn("[DETAIL] Supabase custom sub fetch error:", dbErr);
            }

            if (supabaseSubUrl) {
              console.log("[SUBTITLE SYNC] Kurdish Custom Track Established from Supabase:", supabaseSubUrl);
              setSubtitleUrl(supabaseSubUrl);
              const ranked = getRankedSources(true);
              setSources(ranked);
            } else {
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
                          console.log("[SUBTITLE SYNC] Kurdish Track Established:", downloadLink);
                          setSubtitleUrl(downloadLink);
                          
                          // [PINNING] Boost Kurdish-ready servers
                          const ranked = getRankedSources(true);
                          setSources(ranked);

                          addNotification({ 
                            type: 'success', 
                            title: 'ژێرنووسی کوردی', 
                            message: 'ژێرنووسی کوردی دۆزرایەوە و بە ئۆتۆماتیکی چالاک کرا.' 
                          });
                      }
                  } else {
                      addNotification({ 
                        type: 'info', 
                        title: 'ژێرنووس', 
                        message: 'ببورە، ژێرنووسی کوردی بۆ ئەم بەرهەمە لە OpenSubtitles نەدۆزرایەوە.' 
                      });
                  }
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
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [id, language]);

  const playButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isPlayerModalOpen) {
      document.body.classList.add('movie-player-active');
      if (playButtonRef.current) {
        // Small delay to ensure modal transition finishes
        setTimeout(() => playButtonRef.current?.focus(), 300);
      }
    } else {
      document.body.classList.remove('movie-player-active');
    }
    return () => {
      document.body.classList.remove('movie-player-active');
    };
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

  if (loading && !content) return <SkeletonDetailPage />;
  if (!content) return null;

  return (
    <div className="pb-52 md:pb-40 bg-transparent min-h-screen text-[var(--text-primary)] relative overflow-x-hidden transition-colors duration-500" dir={(language === 'ku' || language === 'badini') ? 'rtl' : 'ltr'}>
      <div className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000 ${theme.id?.includes('moon') ? 'opacity-10' : 'opacity-20'}`}>
        <img src={`${IMAGE_BASE_URL}${content.backdrop_path}`} className="w-full h-full object-cover blur-[140px] scale-150" alt="" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)] via-transparent to-[var(--bg-primary)]"></div>
      </div>

      <AnimatePresence>
        {isTrailerModalOpen && trailerKey && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 z-[9999] backdrop-blur-3xl flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-5xl flex justify-between items-center mb-4 text-white">
              <h2 className="text-xl font-black uppercase italic tracking-tighter">{t('playTrailer')}</h2>
              <button onClick={() => setIsTrailerModalOpen(false)} className="p-3 bg-white/10 hover:bg-red-600 rounded-2xl transition-all"><X size={24} /></button>
            </div>
            <div className="w-full max-w-5xl aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&playsinline=1&enablejsapi=1${origin ? `&origin=${origin}` : ''}&rel=0`}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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
                  <p className="text-[8px] md:text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">{(language === 'ku' || language === 'badini') ? 'پەیوەندی پارێزراوە' : 'SECURE NODE ACTIVE'}</p>
                </div>
                <h2 className="text-xs md:sm font-bold uppercase tracking-tight italic line-clamp-1 text-white">{content.title}</h2>
              </div>
              <button onClick={() => setShowSourceSwitcher(!showSourceSwitcher)} className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500 text-[8px] md:text-[10px] font-black hover:bg-red-600 hover:text-white transition-all">
                <RefreshCcw size={12} /> <span className="hidden sm:inline">RELINK</span>
              </button>
            </div>

            <div className="flex-1 w-full relative bg-black overflow-hidden">
              
              {activeSource === 'FLKRD SERVER 2' ? (
                <PremiumVidLinkPlayer
                  tmdbId={id!}
                  type="movie"
                  title={content.title}
                  initialProgress={initialProgress}
                  accentColor={accentColor}
                  subtitleUrl={subtitleUrl || undefined}
                  imdbId={imdbId || undefined}
                  onProgress={handlePlayerProgress}
                  startFullscreen={true}
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
                  title={content?.title}
                  tmdbId={id}
                  startFullscreen={true}
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

                    <div className="space-y-3 pb-12">
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
                            className={`w-full p-5 rounded-[1.5rem] flex flex-col gap-3 transition-all border group relative overflow-hidden ${
                              isActive 
                                ? 'bg-white/[0.03] border-red-600/30 shadow-[0_20px_40px_rgba(0,0,0,0.4)]' 
                                : 'bg-transparent border-transparent hover:border-white/10 hover:bg-white/[0.02]'
                            }`}
                          >
                            {/* Accent Line for Active State */}
                            {isActive && (
                              <motion.div 
                                layoutId="active-accent-line"
                                className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-red-600 rounded-full shadow-[0_0_15px_#e50914]"
                              />
                            )}

                            <div className="flex items-center justify-between relative z-10">
                              <div className="flex items-center gap-4">
                                <div className="relative flex items-center justify-center w-10 h-10">
                                  {s.name === 'FLKRD SERVER 4' ? (
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-[#1d9bf0] drop-shadow-[0_2px_8px_rgba(29,155,240,0.4)]">
                                      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.941.1-1.358.275C14.77 2.515 13.512 1.5 12 1.5s-2.77 1.015-3.372 2.285c-.417-.175-.878-.275-1.358-.275-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .941-.1 1.358-.275.602 1.27 1.86 2.285 3.372 2.285s2.77-1.015 3.372-2.285c.417.175.878.275 1.358.275 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.5 4L6 12.5l1.4-1.4 2.6 2.6 6.6-6.6 1.4 1.4-8 8z" />
                                    </svg>
                                  ) : iconPath ? (
                                    <img src={iconPath} className="w-full h-full object-contain" style={{ mixBlendMode: 'screen' }} alt="" />
                                  ) : (
                                    <span className={`text-lg font-black italic ${isActive ? 'text-red-500' : 'text-gray-700'}`}>
                                      {idx + 1}
                                    </span>
                                  )}
                                  {isActive && (
                                    <motion.div 
                                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                      className="absolute inset-0 bg-red-600/10 blur-xl rounded-full"
                                    />
                                  )}
                                </div>
                                <div className="flex flex-col items-start">
                                  <span className={`text-xs font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                    {s.name}
                                  </span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-[8px] font-bold ${isActive ? 'text-red-500' : 'text-gray-600'}`}>
                                      {speed}
                                    </span>
                                    {s.badge === 'ku' && (
                                      <div className="flex items-center gap-1 bg-blue-600/10 px-2 py-0.5 rounded-lg border border-blue-500/20 shadow-[0_4px_12px_rgba(29,155,240,0.15)] shrink-0 scale-90">
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/3/35/Flag_of_Kurdistan.svg" className="w-3 h-2 rounded-[1px] object-cover" alt="" />
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-[#1d9bf0] shrink-0">
                                          <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.941.1-1.358.275C14.77 2.515 13.512 1.5 12 1.5s-2.77 1.015-3.372 2.285c-.417-.175-.878-.275-1.358-.275-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .941-.1 1.358-.275.602 1.27 1.86 2.285 3.372 2.285s2.77-1.015 3.372-2.285c.417.175.878.275 1.358.275 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.5 4L6 12.5l1.4-1.4 2.6 2.6 6.6-6.6 1.4 1.4-8 8z" />
                                        </svg>
                                        <span className="text-[7px] font-black text-blue-500 uppercase tracking-wider">VERIFIED</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`text-[8px] font-black italic tracking-tighter ${isActive ? 'text-white/40' : 'text-gray-700'}`}>{latency}</span>
                                {isActive && <div className="w-1 h-1 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_#e50914]" />}
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
          <motion.img 
            initial={{ scale: 1.2 }} 
            animate={{ scale: 1 }} 
            transition={{ duration: 20, repeat: Infinity, repeatType: "reverse", ease: "linear" }} 
            src={`${IMAGE_BASE_URL}${content.backdrop_path}`} 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover opacity-70" 
          />
          {trailerKey && (
            <div className="absolute inset-0 scale-[1.5] pointer-events-none z-[1]">
              <iframe
                ref={backdropIframeRef}
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${trailerKey}&controls=0&modestbranding=1&rel=0&showinfo=0&enablejsapi=1${origin ? `&origin=${origin}` : ''}`}
                className="w-full h-full opacity-60"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/20 to-transparent dark-gradient-mask z-[2]"></div>
        </div>

        {trailerKey && (
          <div className={`absolute top-24 ${(language === 'ku' || language === 'badini') ? 'left-6 md:left-20' : 'right-6 md:right-20'} z-20`}>
            <button onClick={() => setIsMuted(!isMuted)} className="bg-black/40 backdrop-blur-xl border border-white/10 p-3 rounded-full text-white hover:bg-[var(--brand-red)] transition-all shadow-2xl">
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
        )}

        {!isPlayerModalOpen && (
          <Portal id="detail-nav-portal">
            <div className={`fixed top-24 ${(language === 'ku' || language === 'badini') ? 'right-6 md:right-20' : 'left-6 md:left-20'} z-[110]`}>
              <button onClick={() => navigate(-1)} className="flex items-center gap-2 bg-black/60 backdrop-blur-2xl border border-white/20 hover:bg-[var(--brand-red)] text-white px-5 py-3 rounded-2xl transition-all shadow-2xl group active:scale-95">
                <ArrowLeft size={20} className={`${(language === 'ku' || language === 'badini') ? 'rotate-180' : ''}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">{t('back')}</span>
              </button>
            </div>
          </Portal>
        )}

        <div className={`absolute bottom-8 md:bottom-24 ${(language === 'ku' || language === 'badini') ? 'right-0 text-right px-6 md:px-8 lg:px-20' : 'left-0 text-left px-6 md:px-8 lg:px-20'} z-10 flex flex-col max-w-6xl items-start`}>
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
            <LiquidButton ref={playButtonRef} variant="default" onClick={handlePlayClick} className="font-[1000] py-4 px-10 md:py-5 md:px-16 rounded-xl md:rounded-[1.5rem] shadow-2xl flex items-center gap-3"><Play size={20} fill="currentColor" /><span className="text-sm md:text-xl uppercase italic tracking-tighter">{initialProgress > 10 ? ((language === 'ku' || language === 'badini') ? 'بەردەوامبە' : 'RESUME STREAM') : ((language === 'ku' || language === 'badini') ? 'دەستپێکردن' : 'START STREAM')}</span></LiquidButton>
            {trailerKey && (
              <LiquidButton variant="default" onClick={() => setIsTrailerModalOpen(true)} className="flex items-center gap-3 font-[1000] py-4 px-10 md:py-5 md:px-16 rounded-xl md:rounded-[1.5rem] shadow-2xl"><PlayCircle size={20} /><span className="text-sm md:text-xl uppercase italic tracking-tighter">{t('playTrailer')}</span></LiquidButton>
            )}
            <LiquidButton
              variant="default"
              onClick={handleCreateWatchParty}
              disabled={isCreatingParty}
              className="flex items-center gap-3 font-[1000] py-4 px-10 md:py-5 md:px-16 rounded-xl md:rounded-[1.5rem] shadow-2xl border border-orange-500/20 hover:border-orange-500/40 text-orange-500 hover:text-white"
            >
              <Tv size={20} />
              <span className="text-sm md:text-xl uppercase italic tracking-tighter">
                {isCreatingParty 
                  ? ((language === 'ku' || language === 'badini') ? 'دروست دەکرێت...' : 'CREATING...') 
                  : ((language === 'ku' || language === 'badini') ? 'ئاهەنگی تەماشا' : 'CO-WATCH')}
              </span>
            </LiquidButton>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 lg:px-20 py-16 md:py-24 relative z-10">
        <ColorMixtureDivider />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 md:gap-20">
          <div className="lg:col-span-2">
            <div className="mb-20">
              <div className="flex items-center gap-4 mb-10"><div className="w-1.5 h-10 bg-[var(--brand-red)] rounded-full shadow-[0_0_20px_var(--brand-red)]"></div><h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-secondary)] italic">{(language === 'ku' || language === 'badini') ? 'کورتەی فیلم' : 'OVERVIEW'}</h3></div>
              <p className="text-[var(--text-primary)] text-lg md:text-2xl leading-relaxed italic font-bold">{content.overview}</p>
            </div>

            {cast.length > 0 && (
              <div className="mb-24">
                <div className="flex items-center gap-4 mb-12"><h2 className="text-2xl md:text-6xl font-[1000] uppercase italic tracking-tighter text-[var(--text-primary)]">{(language === 'ku' || language === 'badini') ? 'ئەکتەرەکان' : 'ACTORS'}</h2><div className="h-[2px] flex-grow bg-white/5 rounded-full"></div></div>
                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-8">
                  {cast.map(person => (
                    <div key={person.id} className="group cursor-pointer" onClick={() => setSelectedActorId(person.id)}>
                      <div className="aspect-[3/4] rounded-xl md:rounded-[2rem] overflow-hidden mb-3 border border-[var(--border-color)] shadow-2xl relative">
                        <img src={person.profile_path ? `${IMAGE_BASE_URL}${person.profile_path}` : '/flkrd-icon.png'} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" />
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
            <Row title={(language === 'ku' || language === 'badini') ? 'زیاتر لەم جۆرە' : 'MORE LIKE THIS'} items={recommendations} type="movie" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedActorId && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[99999] flex items-center justify-center p-4 md:p-10"
            onClick={() => setSelectedActorId(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-4xl bg-[#0a0a0a]/90 border border-white/10 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl overflow-y-auto max-h-[85vh] md:max-h-[90vh] flex flex-col md:flex-row gap-6 md:gap-10 p-6 md:p-10 text-start"
              dir={(language === 'ku' || language === 'badini') ? 'rtl' : 'ltr'}
              style={{
                background: `radial-gradient(circle at 50% 0%, rgba(var(--brand-red-rgb), 0.15), transparent 85%), rgba(10, 10, 10, 0.85)`,
                backdropFilter: 'blur(30px) saturate(130%)',
                WebkitBackdropFilter: 'blur(30px) saturate(130%)',
                boxShadow: '0 50px 100px rgba(0, 0, 0, 0.8), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => setSelectedActorId(null)}
                className={`absolute top-6 ${language === 'ku' || language === 'badini' ? 'left-6' : 'right-6'} p-3 bg-white/5 hover:bg-red-600 rounded-2xl text-white transition-all z-50 group hover:rotate-90`}
              >
                <X size={20} />
              </button>

              {isActorLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20">
                  <Spinner />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mt-4">Retrieving Actor Dossier...</p>
                </div>
              ) : actorDetails ? (
                <>
                  {/* Left Column: Image */}
                  <div className="w-full md:w-80 shrink-0 flex flex-col gap-6 text-center md:text-start">
                    <div className="w-48 md:w-full aspect-[3/4] rounded-2xl md:rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl relative bg-neutral-900 mx-auto">
                      <img 
                        src={actorDetails.profile_path ? `${IMAGE_BASE_URL}${actorDetails.profile_path}` : '/flkrd-icon.png'} 
                        alt={actorDetails.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="space-y-4 px-2 text-center md:text-start">
                      <h3 className="text-2xl md:text-3xl font-[1000] uppercase italic tracking-tighter text-white leading-tight">
                        {actorDetails.name}
                      </h3>
                      {actorDetails.birthday && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] text-white/30 font-black uppercase tracking-widest">Born</span>
                          <span className="text-xs font-bold text-gray-400">
                            {actorDetails.birthday} {actorDetails.place_of_birth ? `in ${actorDetails.place_of_birth}` : ''}
                          </span>
                        </div>
                      )}
                      {actorDetails.known_for_department && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] text-white/30 font-black uppercase tracking-widest">Department</span>
                          <span className="text-xs font-bold text-brand uppercase tracking-wider">
                            {actorDetails.known_for_department}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Biography & Filmography */}
                  <div className="flex-1 flex flex-col gap-6 md:gap-8 md:overflow-y-auto md:max-h-[60vh] scrollbar-hide pr-2 text-start">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-4 bg-brand rounded-full shadow-[0_0_10px_rgba(229,9,20,0.5)]" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 italic">{(language === 'ku' || language === 'badini') ? 'ژیاننامە' : 'Biography'}</h4>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed font-bold italic opacity-95">
                        {actorDetails.biography || ((language === 'ku' || language === 'badini') ? "زانیاری لەسەر ئەم ئەکتەرە بەردەست نییە." : "No biography compiled for this subject node.")}
                      </p>
                    </div>

                    {actorDetails.combined_credits?.cast?.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-4 bg-brand rounded-full shadow-[0_0_10px_rgba(229,9,20,0.5)]" />
                          <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 italic">{(language === 'ku' || language === 'badini') ? 'کارە دیارەکان' : 'Featured Works'}</h4>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4" dir="ltr">
                          {actorDetails.combined_credits.cast
                            .filter((c: any) => c.poster_path)
                            .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
                            .slice(0, 6)
                            .map((movie: any) => (
                              <div 
                                key={movie.id} 
                                className="group/work cursor-pointer bg-white/[0.02] border border-white/5 p-2 rounded-2xl flex flex-col gap-2 hover:bg-white/[0.05] hover:border-white/10 transition-all"
                                onClick={() => {
                                  setSelectedActorId(null);
                                  navigate(`/details/${movie.media_type || 'movie'}/${movie.id}`);
                                }}
                              >
                                <div className="aspect-[2/3] rounded-xl overflow-hidden relative border border-white/5">
                                  <img 
                                    src={`${IMAGE_BASE_URL_POSTER}${movie.poster_path}`} 
                                    alt={movie.title || movie.name}
                                    className="w-full h-full object-cover group-hover/work:scale-105 transition-transform duration-500"
                                    loading="lazy"
                                  />
                                </div>
                                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-tight truncate text-white block text-center mt-1">
                                  {movie.title || movie.name}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 text-center py-20 text-gray-500">
                  Failed to load actor profile.
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DetailPage;