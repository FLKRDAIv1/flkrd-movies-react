import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, X, Check, Plus, Share, Monitor, FastForward,
  Clapperboard, Layers, Info, Sparkles, User, Film,
  Star, Calendar, Tv, Zap, Clock, Activity, ListChecks,
  ChevronRight, PlayCircle, Link as LinkIcon, Send, Facebook, ArrowRight,
  ChevronDown, MapPin, UserCheck, CheckCheck, ListMinus, Shield, Award, ArrowLeft, RefreshCcw, Timer, CheckCircle, Download, ChevronLeft, VolumeX, Volume2, Cpu
} from 'lucide-react';
import { Content, CastMember, MyListItem, SeasonDetails, Episode, WatchProgress } from '../types';
import { fetchData, isForbidden, fetchExternalIds } from '../services/tmdbService';
import { API_KEY, IMAGE_BASE_URL_POSTER, IMAGE_BASE_URL, IMAGE_BASE_URL_LOGO } from '../constants';
import { SkeletonDetailPage } from '../components/Skeleton';
import { useTranslation } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { useUI } from '../contexts/UIContext';
import { getRankedSources, getSourceUrl, getSourceSandboxConfig } from '../utils/playerSourceUtils';
import UniversalVideoPlayer from '../components/UniversalVideoPlayer';
import PremiumVidLinkPlayer from '../components/PremiumVidLinkPlayer';
import Spinner from '../components/Spinner';
import { subtitleService } from '../services/subtitleService';
import { bannedService } from '../services/bannedService';
import { LiquidButton } from '../components/ui/liquid-glass-button';
import { supabase } from '../utils/supabaseClient';
import { useLocalUser } from '../hooks/useLocalUser';

const ColorMixtureDivider: React.FC = () => {
  const { accentColor, theme } = useUI();
  const isMoon = theme.id?.includes('moon');

  return (
    <div className="relative w-full h-12 md:h-16 my-8 md:my-12 overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.01] backdrop-blur-xl">
      <motion.div
        animate={{
          x: [0, 100, 0],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute -left-20 top-1/2 -translate-y-1/2 w-64 h-32 rounded-full blur-[60px]"
        style={{ backgroundColor: isMoon ? '#38bdf8' : accentColor + '66' }}
      />
      <motion.div
        animate={{
          x: [0, -100, 0],
          opacity: [0.2, 0.5, 0.2]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute -right-20 top-1/2 -translate-y-1/2 w-80 h-32 bg-purple-600/30 rounded-full blur-[70px]"
      />
      <motion.div
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.1, 0.3, 0.1]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute left-1/3 top-1/2 -translate-y-1/2 w-40 h-40 bg-amber-500/20 rounded-full blur-[50px]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
    </div>
  );
};

const TVDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { theme, accentColor } = useUI();
  const { addNotification } = useNotification();
  const { localUserId, localUserName } = useLocalUser();
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  const location = useLocation();
  const [content, setContent] = useState<any>(location.state?.customData || null);
  const [loading, setLoading] = useState(!location.state?.customData);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [cast, setCast] = useState<CastMember[]>([]);
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
  const [recommendations, setRecommendations] = useState<Content[]>([]);
  const [isInMyList, setIsInMyList] = useState(false);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [seasonDetails, setSeasonDetails] = useState<SeasonDetails | null>(null);
  const [activeSource, setActiveSource] = useState(() => {
    const ranked = getRankedSources(false);
    return ranked.length > 0 ? ranked[0].name : 'FLKRD SERVER';
  });
  const [showSourceSwitcher, setShowSourceSwitcher] = useState(false);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set());
  const [initialProgress, setInitialProgress] = useState(0);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [currentPlaybackDuration, setCurrentPlaybackDuration] = useState(0);
  const lastResolvedDurationRef = useRef<number>(0);

  useEffect(() => {
    lastResolvedDurationRef.current = 0;
    setCurrentPlaybackDuration(0);
    setCurrentPlaybackTime(0);
  }, [selectedSeason, selectedEpisode]);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
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
  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);
  const [imdbId, setImdbId] = useState<string | null>(null);

  // Binge Mode Logic
  const [isBingeEnabled, setIsBingeEnabled] = useState(() => localStorage.getItem('flkrd_binge_mode') === 'true');
  const [showBingeCountdown, setShowBingeCountdown] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const countdownTimerRef = useRef<number | null>(null);

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


  // [SUBTITLE SYNC] Fetch episode-specific subtitles
  useEffect(() => {
    const fetchEpisodeSubtitles = async () => {
      if (!id || !isPlayerModalOpen) return;
      setSubtitleUrl(null); // Reset for new episode
      try {
        // Check Supabase custom_subtitles first
        let supabaseSubUrl = null;
        try {
          const { data } = await supabase
            .from('custom_subtitles')
            .select('subtitle_url')
            .eq('tmdb_id', String(id))
            .eq('media_type', 'tv')
            .eq('language', 'ku')
            .eq('season', selectedSeason)
            .eq('episode', selectedEpisode)
            .maybeSingle();
          if (data && data.subtitle_url) {
            supabaseSubUrl = data.subtitle_url;
            if (supabaseSubUrl.startsWith('//')) {
              supabaseSubUrl = `https:${supabaseSubUrl}`;
            }
          }
        } catch (dbErr) {
          console.warn("[TV-DETAIL] Supabase custom sub fetch error:", dbErr);
        }

        if (supabaseSubUrl) {
          console.log(`[SUBTITLE SYNC] S${selectedSeason}E${selectedEpisode} Custom Kurdish Track from Supabase:`, supabaseSubUrl);
          setSubtitleUrl(supabaseSubUrl);
          const ranked = getRankedSources(true);
          setSources(ranked);
        } else {
          const externalIds = await fetchExternalIds(id, 'tv');
          if (externalIds && externalIds.imdb_id) {
            setImdbId(externalIds.imdb_id);
            const results = await subtitleService.searchSubtitles(
              externalIds.imdb_id, 
              'tv', 
              selectedSeason, 
              selectedEpisode, 
              'ku'
            );
            if (results && results.length > 0) {
              // Prioritize true Kurdish (ku/ckb) or titles with "kurd"
              const bestTrack = results.find(r => 
                  r.attributes.language === 'ku' || 
                  r.attributes.language === 'ckb' || 
                  r.attributes.display_name.toLowerCase().includes('kurd')
              ) || results[0];

              const downloadLink = bestTrack.attributes.file_id !== 0 
                  ? await subtitleService.getDownloadLink(bestTrack.attributes.file_id)
                  : bestTrack.attributes.url;

              if (downloadLink) {
                console.log(`[SUBTITLE SYNC] S${selectedSeason}E${selectedEpisode} Kurdish Track:`, downloadLink);
                setSubtitleUrl(downloadLink);
                
                // [PINNING] Boost Kurdish-ready servers
                const ranked = getRankedSources(true);
                setSources(ranked);

                addNotification({ 
                  type: 'success', 
                  title: 'ژێرنووسی کوردی', 
                  message: `ژێرنووسی کوردی بۆ ئەڵقەی ${selectedEpisode} دۆزرایەوە و چالاک کرا.` 
                });
              }
            } else {
              addNotification({ 
                type: 'info', 
                title: 'ژێرنووس', 
                message: `ببورە، ژێرنووسی کوردی بۆ S${selectedSeason} E${selectedEpisode} بەردەست نییە.` 
              });
            }
          }
        }
      } catch (e) {
        console.warn("[SUBTITLE SYNC] Error fetching TV tracks:", e);
      }
    };
    fetchEpisodeSubtitles();
  }, [id, selectedSeason, selectedEpisode, isPlayerModalOpen]);

  const toggleBingeMode = () => {
    const newState = !isBingeEnabled;
    setIsBingeEnabled(newState);
    localStorage.setItem('flkrd_binge_mode', String(newState));
    addNotification({
      type: 'info',
      title: 'System Update',
      message: newState ? 'Binge Mode: Auto-Sequencing Enabled' : 'Binge Mode: Manual Selection Enabled'
    });
  };

  const playNextEpisode = useCallback(() => {
    if (!seasonDetails) return;
    const currentIdx = seasonDetails.episodes.findIndex(e => e.episode_number === selectedEpisode);
    const nextEp = seasonDetails.episodes[currentIdx + 1];

    if (nextEp) {
      // Fetch progress for the next episode before switching
      const progressData = JSON.parse(localStorage.getItem('watchProgress') || '[]');
      const saved = progressData.find((p: any) => p.id === content.id && p.season === selectedSeason && p.episode === nextEp.episode_number);
      
      setInitialProgress(saved ? saved.progress : 0);
      setSelectedEpisode(nextEp.episode_number);
      setIsPlayerLoading(true);
      setShowBingeCountdown(false);
      setCountdown(10);
    } else {
      const nextSeasonNum = selectedSeason + 1;
      if (content?.number_of_seasons >= nextSeasonNum) {
        // Fetch progress for first episode of next season
        const progressData = JSON.parse(localStorage.getItem('watchProgress') || '[]');
        const saved = progressData.find((p: any) => p.id === content.id && p.season === nextSeasonNum && p.episode === 1);
        
        setInitialProgress(saved ? saved.progress : 0);
        setSelectedSeason(nextSeasonNum);
        setSelectedEpisode(1);
        setIsPlayerLoading(true);
        setShowBingeCountdown(false);
        setCountdown(10);
        fetchSeasonDetails(nextSeasonNum);
      } else {
        setIsPlayerModalOpen(false);
        setShowBingeCountdown(false);
        addNotification({ type: 'success', title: 'Archive Complete', message: 'You have watched all available episodes.' });
      }
    }
  }, [selectedEpisode, seasonDetails, selectedSeason, content, addNotification]);

  useEffect(() => {
    if (showBingeCountdown && countdown > 0) {
      countdownTimerRef.current = window.setTimeout(() => setCountdown(prev => prev - 1), 1000);
    } else if (showBingeCountdown && countdown === 0) {
      playNextEpisode();
    }
    return () => { if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current); };
  }, [showBingeCountdown, countdown, playNextEpisode]);

  useEffect(() => {
    if (isPlayerModalOpen) {
      document.body.classList.add('movie-player-active');
    } else {
      document.body.classList.remove('movie-player-active');
    }
    return () => {
      document.body.classList.remove('movie-player-active');
    };
  }, [isPlayerModalOpen]);

  const updateProgress = useCallback((data: any) => {
    if (!content) return;
    const progressData = localStorage.getItem('watchProgress');
    let progress: WatchProgress[] = progressData ? JSON.parse(progressData) : [];

    const time = data.currentTime || data.time;
    if (data.duration && data.duration > 0) {
      lastResolvedDurationRef.current = data.duration;
    }
    const duration = lastResolvedDurationRef.current || data.duration || 2700;

    setCurrentPlaybackTime(time);
    setCurrentPlaybackDuration(duration);

    const index = progress.findIndex(i => i.id === content.id && i.type === 'tv');
    const item: WatchProgress = {
      id: content.id,
      type: 'tv',
      title: content.name,
      poster_path: content.poster_path,
      backdrop_path: content.backdrop_path,
      vote_average: content.vote_average,
      progress: time,
      duration: duration,
      lastWatched: Date.now(),
      season: selectedSeason,
      episode: selectedEpisode
    };

    if (index > -1) progress[index] = item;
    else progress.push(item);

    localStorage.setItem('watchProgress', JSON.stringify(progress));
    window.dispatchEvent(new Event('watchProgressUpdated'));

    // Mark as watched (Binge countdown trigger removed as requested - provider handles next episode)
    if (time > duration * 0.98) {
      const tvProg = JSON.parse(localStorage.getItem('tv_progress') || '{}');
      const showSet = new Set(tvProg[id!] || []);
      showSet.add(`${selectedSeason}-${selectedEpisode}`);
      tvProg[id!] = Array.from(showSet);
      localStorage.setItem('tv_progress', JSON.stringify(tvProg));
      setWatchedEpisodes(new Set(tvProg[id!]));
    }
    window.dispatchEvent(new Event('storage'));
  }, [content, selectedSeason, selectedEpisode, id, isBingeEnabled, showBingeCountdown]);

  const handlePlayerProgress = useCallback((data: any) => {
    // Accept any event with a valid currentTime — covers VidKing, Videasy, VidLink, etc.
    const time = data.currentTime || data.time || 0;
    if (time > 0) {
      updateProgress(data);
    } else if (data.event === 'pause' || data.event === 'ended') {
      updateProgress(data);
    }
  }, [updateProgress]);

  const fetchSeasonDetails = useCallback(async (seasonNum: number) => {
    setSeasonDetails(null);
    try {
      const data = await fetchData(`/tv/${id}/season/${seasonNum}?api_key=${API_KEY}&language=en-US`, language);
      if (data) setSeasonDetails(data);
    } catch (e) { console.error(e); }
  }, [id, language]);

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
    setContent(null);
    setCast([]);
    setRecommendations([]);
    setLogoPath(null);
    setTrailerKey(null);
    setSelectedActorId(null);
    setActorDetails(null);

    const fetchContentDetails = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const apiLang = 'en-US';
        const endpoint = `/tv/${id}?api_key=${API_KEY}&language=${apiLang}&append_to_response=credits,similar,recommendations,images,videos&include_image_language=en,null`;
        const data = await fetchData(endpoint, language);
        if (data) {
          setContent(data);
          
          // Update browser window title dynamically for optimal search engine crawl and index representation
          const year = data.first_air_date ? ` (${data.first_air_date.split('-')[0]})` : '';
          const showName = data.name || data.original_name || 'Series';
          document.title = (language === 'ku' || language === 'badini')
            ? `تەماشای زنجیرەی ${showName}${year} بکە | FLKRD`
            : `Watch ${showName}${year} | FLKRD`;

          // Dynamically update meta tags for optimal Google crawling and indexing
          const overviewText = data.overview || '';
          const cleanOverview = overviewText.slice(0, 150);
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) {
            metaDesc.setAttribute('content', `Watch ${showName}${year} on FLKRD. ${cleanOverview}`);
          }
          const ogDesc = document.querySelector('meta[property="og:description"]');
          if (ogDesc) {
            ogDesc.setAttribute('content', `Watch ${showName}${year} on FLKRD. ${cleanOverview}`);
          }
          const ogTitle = document.querySelector('meta[property="og:title"]');
          if (ogTitle) {
            ogTitle.setAttribute('content', `${showName}${year} | FLKRD`);
          }

          setCast(data.credits?.cast?.slice(0, 15) || []);
          let recs = [...(data.recommendations?.results || []), ...(data.similar?.results || [])];
          setRecommendations(recs.filter(r => r.id !== Number(id) && !isForbidden(r, language)));

          const logo = data.images?.logos?.find((l: any) => l.file_path && (l.iso_639_1 === 'en' || !l.iso_639_1));
          if (logo) setLogoPath(logo.file_path);

          const trailer = data.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
          if (trailer) setTrailerKey(trailer.key);

          // Load watch status
          const tvProg = JSON.parse(localStorage.getItem('tv_progress') || '{}');
          setWatchedEpisodes(new Set(tvProg[id] || []));

          const progressData = JSON.parse(localStorage.getItem('watchProgress') || '[]');
          const saved = progressData.find((p: any) => p.id === data.id && p.type === 'tv');
          if (saved) {
            setSelectedSeason(saved.season || 1);
            setSelectedEpisode(saved.episode || 1);
            setInitialProgress(saved.progress || 0);
            fetchSeasonDetails(saved.season || 1);
          } else {
            fetchSeasonDetails(1);
          }
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchContentDetails();
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [id, language, fetchSeasonDetails]);

  const handlePlayClick = (s?: number, e?: number) => {
    if (s) setSelectedSeason(s);
    if (e) setSelectedEpisode(e);

    const progressData = JSON.parse(localStorage.getItem('watchProgress') || '[]');
    const saved = progressData.find((p: any) => p.id === content.id && p.season === (s || selectedSeason) && p.episode === (e || selectedEpisode));
    setInitialProgress(saved ? saved.progress : 0);

    setIsPlayerLoading(true);
    setIsPlayerModalOpen(true);
    setShowBingeCountdown(false);
    if (s && s !== selectedSeason) fetchSeasonDetails(s);
  };

  const handleCreateWatchParty = async () => {
    if (!content || !localUserId) return;
    setIsCreatingTicket(true);
    try {
      const pin = String(Math.floor(1000 + Math.random() * 9000));
      const tvMovieId = `tv_${content.id}_s_${selectedSeason}_e_${selectedEpisode}`;
      const { data, error: insertError } = await supabase
        .from('watch_tickets')
        .insert({
          movie_id: tvMovieId,
          host_id: localUserId,
          pin_code: pin,
          status: 'waiting'
        })
        .select()
        .single();

      if (insertError || !data) throw insertError;

      addNotification({
        type: 'success',
        title: (language === 'ku' || language === 'badini') ? '🎬 تیکتی تەماشا دروست کرا!' : '🎬 WATCH TICKET CREATED!',
        message: (language === 'ku' || language === 'badini') ? 'هاوڕێکەت بانگهێشت بکە بۆ بەشداریکردن!' : 'Invite your guest to join the cinema hall!'
      });

      const movieState = {
        id: content.id,
        title: content.name,
        poster_path: content.poster_path,
        backdrop_path: content.backdrop_path,
        runtime: content.episode_run_time?.[0],
        vote_average: content.vote_average,
        release_date: content.first_air_date
      };

      navigate(`/watch/${data.id}`, { state: { ticket: data, movie: movieState } });
    } catch (err: any) {
      console.error('Watch party creation error:', err);
      addNotification({
        type: 'error',
        title: (language === 'ku' || language === 'badini') ? 'هەڵە' : 'Error',
        message: (language === 'ku' || language === 'badini') ? 'نەتوانرا تیکت دروست بکرێت.' : 'Failed to create watch ticket.'
      });
    } finally {
      setIsCreatingTicket(false);
    }
  };

  if (loading && !content) return <SkeletonDetailPage />;
  if (!content) return null;

  return (
    <div className="pb-52 md:pb-40 bg-transparent min-h-screen text-[var(--text-primary)] relative" dir={(language === 'ku' || language === 'badini') ? 'rtl' : 'ltr'}>
      <div className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000 ${theme.id?.includes('moon') ? 'opacity-10' : 'opacity-20'}`}>
        <img src={`${IMAGE_BASE_URL}${content.backdrop_path}`} className="w-full h-full object-cover blur-[120px]" alt="" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)] via-transparent to-[var(--bg-primary)]"></div>
      </div>

      <AnimatePresence>
        {isTrailerModalOpen && trailerKey && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 z-[9999] backdrop-blur-3xl flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-5xl flex justify-between items-center mb-4">
              <h2 className="text-xl font-black uppercase italic tracking-tighter">{t('playTrailer')}</h2>
              <button onClick={() => setIsTrailerModalOpen(false)} className="p-3 bg-white/10 hover:bg-red-600 rounded-2xl transition-all"><X size={24} /></button>
            </div>
            <div className="w-full max-w-5xl aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&playsinline=1&enablejsapi=1${origin ? `&origin=${origin}` : ''}`}
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
            <div className="w-full flex items-center justify-between p-3 md:p-4 bg-black/80 backdrop-blur-xl border-b border-white/5 z-[10000]">
              <button onClick={() => setIsPlayerModalOpen(false)} className="text-white bg-white/10 rounded-xl p-2 hover:bg-red-600 transition-colors"><X size={20} /></button>
              <div className="text-center px-4">
                <p className="text-red-600 font-black uppercase text-[10px] tracking-[0.2em]">{content.name}</p>
                <p className="text-xs text-white font-bold truncate">S{selectedSeason} • E{selectedEpisode}</p>
              </div>
              <button onClick={() => setShowSourceSwitcher(!showSourceSwitcher)} className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500 text-[8px] md:text-[10px] font-black hover:bg-red-600 hover:text-white transition-all">
                <RefreshCcw size={12} /> <span className="hidden sm:inline">RELINK</span>
              </button>
            </div>
            <div className="flex-1 w-full relative bg-black overflow-hidden">
              <AnimatePresence>
                {showBingeCountdown && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center text-center p-6">
                    <div className="relative mb-8">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/10" />
                        <motion.circle
                          cx="64" cy="64" r="58"
                          stroke="currentColor" strokeWidth="4"
                          fill="transparent"
                          className="text-red-600"
                          strokeDasharray="364"
                          initial={{ strokeDashoffset: 364 }}
                          animate={{ strokeDashoffset: Math.max(0, 364 - (364 * (10 - (countdown ?? 10)) / 10)) }}
                          transition={{ duration: 1, ease: "linear" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center"><span className="text-4xl font-[1000] italic text-white">{countdown}</span></div>
                    </div>
                    <h3 className="text-xl md:text-3xl font-[1000] uppercase italic tracking-tighter mb-2">Next Episode Loading</h3>
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-8">Synchronizing with Node S{selectedSeason} E{selectedEpisode + 1}</p>
                    <div className="flex gap-4">
                      <button onClick={playNextEpisode} className="bg-white text-black px-10 py-4 rounded-xl font-black uppercase italic text-xs shadow-xl active:scale-95 transition-transform">Play Now</button>
                      <button onClick={() => setShowBingeCountdown(false)} className="bg-white/10 text-white px-10 py-4 rounded-xl font-black uppercase italic text-xs border border-white/10 active:scale-95 transition-transform">Cancel</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {activeSource === 'FLKRD SERVER 2' ? (
                <PremiumVidLinkPlayer
                  tmdbId={id!}
                  type="tv"
                  season={selectedSeason}
                  episode={selectedEpisode}
                  title={content.name}
                  initialProgress={initialProgress}
                  accentColor={accentColor}
                  subtitleUrl={subtitleUrl || undefined}
                  imdbId={imdbId || undefined}
                  onProgress={handlePlayerProgress}
                  seasons={content?.seasons || []}
                  currentSeasonDetails={seasonDetails || undefined}
                  watchedEpisodes={watchedEpisodes}
                  onEpisodeChange={(s, e) => handlePlayClick(s, e)}
                  onSeasonChange={(s) => {
                    setSelectedSeason(s);
                    fetchSeasonDetails(s);
                  }}
                  startFullscreen={true}
                  onClose={() => setIsPlayerModalOpen(false)}
                  activeSource={activeSource}
                  setActiveSource={setActiveSource}
                  sources={sources}
                />
              ) : (
                <UniversalVideoPlayer
                  src={getSourceUrl(activeSource, id!, 'tv', selectedSeason, selectedEpisode, initialProgress, accentColor, subtitleUrl || undefined)}
                  accentColor={accentColor}
                  language={language}
                  onLoad={() => setIsPlayerLoading(false)}
                  onProgress={handlePlayerProgress}
                  subtitleUrl={subtitleUrl || undefined}
                  imdbId={imdbId || content?.imdb_id}
                  contentType="tv"
                  season={selectedSeason}
                  episode={selectedEpisode}
                  title={content?.name}
                  tmdbId={id}
                  seasons={content?.seasons || []}
                  currentSeasonDetails={seasonDetails || undefined}
                  watchedEpisodes={watchedEpisodes}
                  onEpisodeChange={(s, e) => handlePlayClick(s, e)}
                  onSeasonChange={(s) => {
                    setSelectedSeason(s);
                    fetchSeasonDetails(s);
                  }}
                  startFullscreen={true}
                  onClose={() => setIsPlayerModalOpen(false)}
                  activeSource={activeSource}
                  setActiveSource={setActiveSource}
                  sources={sources}
                />
              )}

              <AnimatePresence>
                {showSourceSwitcher && (
                  <motion.div 
                    initial={{ x: '100%', opacity: 0 }} 
                    animate={{ x: 0, opacity: 1 }} 
                    exit={{ x: '100%', opacity: 0 }} 
                    transition={{ type: 'spring', damping: 30, stiffness: 250 }}
                    className="absolute top-0 right-0 bottom-0 w-80 md:w-96 bg-[#070707]/90 backdrop-blur-3xl border-l border-white/10 z-[300] p-6 overflow-y-auto scrollbar-hide flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden"
                  >
                    {/* High Performance Hardware Accelerated Gradient Glow (Zero CPU Overhead) */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                      <div className="absolute -top-1/4 -right-1/4 w-80 h-80 rounded-full bg-gradient-to-br from-red-600/10 to-rose-600/5 blur-[90px] will-change-transform opacity-75" />
                      <div className="absolute -bottom-1/4 -left-1/4 w-80 h-80 rounded-full bg-gradient-to-tr from-purple-600/10 to-pink-600/5 blur-[100px] will-change-transform opacity-75" />
                    </div>

                    <div className="relative z-10 flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Activity size={12} className="text-red-500 animate-pulse" />
                          <span className="text-[9px] font-[1000] tracking-[0.2em] text-red-500 uppercase">FLKRD CORE</span>
                        </div>
                        <h3 className="text-base font-black tracking-tight text-white uppercase italic text-left">Streaming Nodes</h3>
                      </div>
                      <button 
                        onClick={() => setShowSourceSwitcher(false)}
                        className="p-2.5 bg-white/5 hover:bg-red-600/20 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-white rounded-full transition-all group"
                      >
                        <X size={16} className="group-hover:rotate-90 transition-transform" />
                      </button>
                    </div>

                    <div className="relative z-10 space-y-4 pb-12 overflow-y-auto flex-1 scrollbar-hide pr-1">
                      {sources.map((s, idx) => {
                        const iconPath = s.name === 'FLKRD SERVER' ? '/assets/icons/master_crown.png' : 
                                       s.name === 'FLKRD SERVER 1' ? '/assets/icons/diamond.png' : 
                                       s.name === 'FLKRD SERVER 2' ? '/assets/icons/bronze.png' : 
                                       s.name === 'FLKRD SERVER 3' ? '/assets/icons/diamond.png' : null;

                        const isActive = activeSource === s.name;
                        
                        // Performance statistics & status
                        let loadPct = 18;
                        let speed = '1.8 Gbps';
                        let latency = '18ms';
                        let statusText = 'Optimal';
                        let statusColor = 'text-green-400';
                        let statusBg = 'bg-green-400/10 border-green-400/20';

                        if (s.name === 'FLKRD SERVER') {
                          loadPct = 18; speed = '1.8 Gbps'; latency = '16ms'; statusText = 'Ultra Fast';
                        } else if (s.name === 'FLKRD SERVER 1') {
                          loadPct = 26; speed = '1.5 Gbps'; latency = '24ms'; statusText = 'Stable';
                        } else if (s.name === 'FLKRD SERVER 2') {
                          loadPct = 34; speed = '1.2 Gbps'; latency = '32ms'; statusText = 'Optimized';
                        } else if (s.name === 'FLKRD SERVER 3') {
                          loadPct = 48; speed = '950 Mbps'; latency = '42ms'; statusText = 'Nominal';
                        } else if (s.name === 'FLKRD SERVER 4') {
                          loadPct = 68; speed = '820 Mbps'; latency = '55ms'; statusText = 'Busy'; statusColor = 'text-yellow-400'; statusBg = 'bg-yellow-400/10 border-yellow-400/20';
                        } else if (s.name === 'FLKRD SERVER 5') {
                          loadPct = 12; speed = '1.9 Gbps'; latency = '12ms'; statusText = 'Direct';
                        } else if (s.name === 'FLKRD SERVER 6') {
                          loadPct = 54; speed = '780 Mbps'; latency = '64ms'; statusText = 'Standard';
                        } else if (s.name === 'FLKRD SERVER 7') {
                          loadPct = 76; speed = '620 Mbps'; latency = '82ms'; statusText = 'Heavy'; statusColor = 'text-orange-400'; statusBg = 'bg-orange-400/10 border-orange-400/20';
                        }

                        return (
                          <motion.button 
                            key={s.name}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.04 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => { 
                              setActiveSource(s.name); 
                              setIsPlayerLoading(true); 
                              setShowSourceSwitcher(false); 
                            }} 
                            className={`w-full p-4.5 rounded-[24px] flex flex-col gap-3 transition-all duration-300 border group relative overflow-hidden backdrop-blur-md text-left ${
                              isActive 
                                ? 'bg-white/[0.07] border-red-500/40 shadow-[0_12px_30px_rgba(239,68,68,0.12)] ring-1 ring-red-500/10' 
                                : 'bg-neutral-950/45 border-white/5 hover:border-white/15 hover:bg-neutral-900/60 hover:shadow-[0_8px_20px_rgba(255,255,255,0.01)]'
                            }`}
                          >
                            {/* Glow decoration for active */}
                            {isActive && (
                              <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-transparent pointer-events-none" />
                            )}

                            {/* Accent Line for Active State */}
                            {isActive && (
                              <motion.div 
                                layoutId="active-accent-line-tv"
                                className="absolute left-0 top-3 bottom-3 w-[3px] bg-red-600 rounded-full shadow-[0_0_12px_#ef4444]"
                              />
                            )}

                            <div className="flex items-center justify-between w-full relative z-10">
                              <div className="flex items-center gap-3">
                                {/* Server Badge/Logo Icon wrapper */}
                                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0">
                                  {s.name === 'FLKRD SERVER 4' ? (
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#1d9bf0] drop-shadow-[0_2px_6px_rgba(29,155,240,0.4)]">
                                      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.941.1-1.358.275C14.77 2.515 13.512 1.5 12 1.5s-2.77 1.015-3.372 2.285c-.417-.175-.878-.275-1.358-.275-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .941-.1.358-.275.602 1.27 1.86 2.285 3.372 2.285s2.77-1.015 3.372-2.285c.417.175.878.275 1.358.275 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.5 4L6 12.5l1.4-1.4 2.6 2.6 6.6-6.6 1.4 1.4-8 8z" />
                                    </svg>
                                  ) : iconPath ? (
                                    <img src={iconPath} className="w-7 h-7 object-contain" style={{ mixBlendMode: 'screen' }} alt="" />
                                  ) : (
                                    <Cpu size={16} className={isActive ? 'text-red-500' : 'text-gray-400'} />
                                  )}

                                  {isActive && (
                                    <motion.div 
                                      animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
                                      transition={{ duration: 3, repeat: Infinity }}
                                      className="absolute inset-0 bg-red-600/10 blur-xl rounded-full"
                                    />
                                  )}
                                </div>

                                <div className="flex flex-col items-start text-left">
                                  <span className={`text-[11px] font-black uppercase tracking-wider ${isActive ? 'text-white font-extrabold' : 'text-gray-300'}`}>
                                    {s.name}
                                  </span>
                                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">
                                    Node VK-{idx + 1}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1">
                                <div className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${statusBg} ${statusColor}`}>
                                  {statusText}
                                </div>
                              </div>
                            </div>

                            {/* Node Metrics Divider */}
                            <div className="h-[1px] w-full bg-white/5" />

                            <div className="flex flex-col gap-2 w-full mt-1">
                              <div className="flex items-center justify-between w-full text-[9px] font-bold text-gray-400 relative z-10 text-left">
                                <div className="flex items-center gap-1.5 flex-row">
                                  <Zap size={10} className={isActive ? 'text-red-500' : 'text-gray-500'} />
                                  <span>{speed}</span>
                                </div>
                                
                                <div className="flex items-center gap-1.5 flex-row">
                                  <Timer size={10} className="text-gray-500" />
                                  <span>{latency}</span>
                                </div>

                                <div className="flex items-center gap-1 flex-row">
                                  <Cpu size={10} className="text-gray-500" />
                                  <span className={loadPct > 60 ? 'text-yellow-500' : 'text-gray-400'}>{loadPct}% load</span>
                                </div>
                              </div>

                              {/* Visual Load Progress Bar */}
                              <div className="w-full bg-white/5 rounded-full h-[3px] overflow-hidden relative">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    loadPct > 60 
                                      ? 'bg-gradient-to-r from-yellow-500 to-amber-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' 
                                      : 'bg-gradient-to-r from-red-500 to-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                                  }`} 
                                  style={{ width: `${loadPct}%` }}
                                />
                              </div>
                            </div>

                            {/* Kurdish cc badge */}
                            {s.badge === 'ku' && (
                              <div className="absolute top-2 right-2 flex items-center gap-1 bg-blue-600/10 px-2 py-0.5 rounded-lg border border-blue-500/20 shadow-md scale-75">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/3/35/Flag_of_Kurdistan.svg" className="w-3 h-2 rounded-[1px] object-cover" alt="" />
                                <span className="text-[7px] font-black text-blue-500 uppercase tracking-wider">KURDISH</span>
                              </div>
                            )}
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

      <div className="relative w-full h-[70vh] md:h-[90vh] overflow-hidden z-10" dir="ltr">
        <div className="absolute inset-0">
          <img src={`${IMAGE_BASE_URL}${content.backdrop_path}`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
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
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-[2]"></div>
        </div>

        {trailerKey && (
          <div className={`absolute top-24 ${(language === 'ku' || language === 'badini') ? 'left-6 md:left-20' : 'right-6 md:right-20'} z-20`}>
            <button onClick={() => setIsMuted(!isMuted)} className="bg-black/40 backdrop-blur-xl border border-white/10 p-3 rounded-full text-white hover:bg-red-600 transition-all shadow-2xl">
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
        )}

        <div className={`absolute bottom-12 md:bottom-28 ${(language === 'ku' || language === 'badini') ? 'right-0 text-right' : 'left-0 text-left'} right-0 px-6 md:px-8 lg:px-20 z-10 flex flex-col items-start max-w-6xl`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-600/20 border border-blue-600/30 text-blue-500 px-3 py-1 rounded-full flex items-center gap-1.5 text-[8px] md:text-[10px] font-black uppercase tracking-widest shadow-xl backdrop-blur-md"><Shield size={12} /> SECURE TV VAULT</div>
            <button onClick={toggleBingeMode} className={`px-4 py-1.5 rounded-full flex items-center gap-2 text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all shadow-lg backdrop-blur-md ${isBingeEnabled ? 'bg-red-600 text-white border-red-500' : 'bg-white/10 text-gray-400 border border-white/10'}`}>
              <Zap size={10} className={isBingeEnabled ? 'fill-white' : ''} /> {isBingeEnabled ? 'Binge Mode On' : 'Binge Mode Off'}
            </button>
          </div>

          <div className="mb-8 w-full max-w-md md:max-w-xl">
            {logoPath ? (
              <motion.img
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                src={`${IMAGE_BASE_URL_LOGO}${logoPath}`} alt={content.name}
                className="max-w-full h-auto max-h-32 md:max-h-56 object-contain"
              />
            ) : (
              <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-9xl font-[1000] mb-6 uppercase italic tracking-tighter leading-[0.9] text-white drop-shadow-2xl">
                {content.name}
              </motion.h1>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-5 mb-10">
            <div className="flex items-center gap-1.5 bg-yellow-500/10 px-3 py-1.5 rounded-xl border border-yellow-500/20 shadow-lg backdrop-blur-md"><Star size={14} className="text-yellow-500 fill-current" /><span className="text-xs font-black text-yellow-500">{content.vote_average?.toFixed(1) || '0.0'}</span></div>
            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 shadow-lg backdrop-blur-md"><Calendar size={14} className="text-gray-400" /><span className="text-xs font-black text-gray-400">{content.first_air_date?.split('-')[0]}</span></div>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-10">
            <LiquidButton variant="default" onClick={() => handlePlayClick()} className="font-[1000] py-4 px-10 md:py-5 md:px-14 rounded-xl md:rounded-[1.5rem] shadow-2xl flex items-center gap-3">
              <Play size={20} fill="currentColor" />
              <span className="text-base md:text-xl uppercase italic tracking-tighter">{initialProgress > 10 ? ((language === 'ku' || language === 'badini') ? 'بەردەوامبە' : 'RESUME STREAM') : ((language === 'ku' || language === 'badini') ? 'دەستپێکردن' : 'START STREAM')}</span>
            </LiquidButton>

            {/* CO-WATCH PARTY Button */}
            <button
              onClick={handleCreateWatchParty}
              disabled={isCreatingTicket}
              className="group relative px-6 md:px-10 py-4 md:py-5 rounded-xl md:rounded-[1.5rem] font-[1000] uppercase italic tracking-tighter text-base md:text-lg flex items-center gap-3 transition-all active:scale-95 disabled:opacity-60 overflow-hidden border border-orange-500/40 hover:border-orange-500 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 hover:text-orange-300 shadow-[0_0_30px_rgba(234,88,12,0.1)] hover:shadow-[0_0_40px_rgba(234,88,12,0.3)]"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-orange-600/5 to-transparent transition-opacity duration-300" />
              {isCreatingTicket ? (
                <div className="w-5 h-5 rounded-full border-2 border-t-transparent border-orange-500 animate-spin" />
              ) : (
                <Sparkles size={20} className="text-orange-500 animate-pulse" />
              )}
              <span className="relative">{(language === 'ku' || language === 'badini') ? 'تەماشاکردنی هاوبەش' : 'CO-WATCH PARTY'}</span>
            </button>
          </div>
        </div>
        {!isPlayerModalOpen && (
          <div className={`absolute top-24 ${(language === 'ku' || language === 'badini') ? 'right-6 md:right-20' : 'left-6 md:left-20'} z-20`}>
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl transition-all shadow-2xl group active:scale-95">
              <ArrowLeft size={18} className={(language === 'ku' || language === 'badini') ? 'rotate-180 group-hover:translate-x-1 transition-transform' : 'group-hover:-translate-x-1 transition-transform'} />
              <span className="text-[9px] font-black uppercase tracking-widest">{t('back')}</span>
            </button>
          </div>
        )}
      </div>

      <div className="container mx-auto px-6 lg:px-20 py-16 md:py-24 relative z-10">
        <ColorMixtureDivider />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 md:gap-20">
          <div className="lg:col-span-2">
            <div className="mb-20">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-16 gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-red-600 rounded-2xl shadow-2xl"><Clapperboard size={24} className="text-white" /></div>
                  <h2 className="text-3xl md:text-7xl font-[1000] uppercase italic tracking-tighter text-white">{(language === 'ku' || language === 'badini') ? 'ئەڵقەکان' : 'EPISODES'}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative min-w-[180px]" dir="ltr">
                    <select value={selectedSeason} onChange={(e) => { setSelectedSeason(Number(e.target.value)); fetchSeasonDetails(Number(e.target.value)); }} className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-4 text-white font-black uppercase appearance-none focus:border-red-600 outline-none shadow-2xl backdrop-blur-md">
                      {content.seasons?.filter((s: any) => s.season_number > 0).map((s: any) => <option key={s.id} value={s.season_number} className="bg-[#111]">{(language === 'ku' || language === 'badini') ? 'وەرزی' : 'Season'} {s.season_number}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-red-600 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              {!seasonDetails ? (
                <div className="grid grid-cols-1 gap-6 animate-pulse">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 w-full bg-zinc-900/40 rounded-[2.5rem] border border-white/5" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                  {seasonDetails.episodes.map((ep) => {
                    const epKey = `${selectedSeason}-${ep.episode_number}`;
                    const isWatched = watchedEpisodes.has(epKey);
                    const isActive = selectedEpisode === ep.episode_number && isPlayerModalOpen;
                    const progressPct = isActive && currentPlaybackDuration > 0 ? (currentPlaybackTime / currentPlaybackDuration) * 100 : 0;

                    return (
                      <motion.div key={ep.id} whileHover={{ x: 8 }} onClick={() => handlePlayClick(selectedSeason, ep.episode_number)} className={`group relative bg-white/[0.02] border p-4 md:p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 cursor-pointer transition-all overflow-hidden ${isActive ? 'border-red-600 bg-red-600/[0.05]' : 'border-white/5'} ${isWatched && !isActive ? 'opacity-40 grayscale-[0.5]' : ''}`}>

                        <div className="relative w-full md:w-56 aspect-video rounded-2xl overflow-hidden flex-shrink-0 bg-black border border-white/5 shadow-xl" dir="ltr">
                          <img src={ep.still_path ? `${IMAGE_BASE_URL}${ep.still_path}` : `${IMAGE_BASE_URL_POSTER}${content.poster_path}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="" />

                          {isWatched && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-lg z-20"><Check size={12} strokeWidth={4} /></div>
                          )}

                          {isActive && (
                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center z-10">
                              <Activity size={32} className="text-red-600 animate-pulse mb-2" />
                              <span className="text-[8px] font-[1000] text-red-500 uppercase tracking-widest italic">Live Sequence</span>
                            </div>
                          )}

                          {/* Card Progress Bar for Active Episode */}
                          {isActive && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} className="h-full bg-red-600 shadow-[0_0_10px_#e50914]" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 text-center md:text-left">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                            <h4 className={`text-lg md:text-2xl font-[1000] uppercase italic tracking-tighter truncate ${isActive ? 'text-red-500' : 'text-white'}`}>
                              {ep.episode_number}. {ep.name}
                            </h4>
                            {isWatched && <span className="text-[8px] font-black text-green-500 uppercase tracking-[0.2em] border border-green-500/20 px-2 py-0.5 rounded bg-green-500/5">Archive Log Complete</span>}
                          </div>
                          <p className="text-xs md:text-sm text-gray-500 line-clamp-2 italic font-bold leading-relaxed mb-4">
                            {ep.overview || "Transmission details restricted for this module."}
                          </p>
                          <div className="flex items-center justify-center md:justify-start gap-4">
                            <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                              <Star size={10} className="text-yellow-500 fill-current" />
                              <span className="text-[10px] font-black text-gray-400">{ep.vote_average.toFixed(1)}</span>
                            </div>
                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest italic">ID: NODE_{ep.id}</span>
                          </div>
                        </div>

                        <div className={`hidden md:flex p-4 rounded-full transition-all ${isActive ? 'bg-red-600 text-white scale-110 shadow-[0_0_20px_rgba(229,9,20,0.4)]' : 'bg-white/5 text-gray-500 group-hover:bg-white/10 group-hover:text-white'}`}>
                          {isActive ? <Activity size={24} /> : <Play size={24} fill="currentColor" />}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {cast.length > 0 && (
              <div className="mb-24 mt-12">
                <div className="flex items-center gap-4 mb-12">
                  <h2 className="text-2xl md:text-6xl font-[1000] uppercase italic tracking-tighter text-white">
                    {(language === 'ku' || language === 'badini') ? 'ئەکتەرەکان' : 'ACTORS'}
                  </h2>
                  <div className="h-[2px] flex-grow bg-white/5 rounded-full"></div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-8">
                  {cast.map(person => (
                    <div key={person.id} className="group cursor-pointer" onClick={() => setSelectedActorId(person.id)}>
                      <div className="aspect-[3/4] rounded-xl md:rounded-[2rem] overflow-hidden mb-3 border border-white/5 shadow-2xl relative">
                        <img 
                          src={person.profile_path ? `${IMAGE_BASE_URL}${person.profile_path}` : '/flkrd-icon.png'} 
                          alt={person.name} 
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" 
                        />
                      </div>
                      <p className="text-[10px] md:text-xs font-black uppercase italic truncate text-white">{person.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="hidden lg:block space-y-8">
            <div className="bg-white/[0.02] border border-white/10 p-8 rounded-[3rem] shadow-2xl backdrop-blur-3xl sticky top-32">
              <div className="flex items-center gap-3 mb-8">
                <Layers size={18} className="text-red-600" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 italic">SYSTEM STATUS</h3>
              </div>
              <div className="space-y-6">
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black text-gray-600 uppercase mb-1">Total Modules</p>
                  <p className="text-lg font-black italic">{seasonDetails?.episodes.length || 0} SECTOR EPISODES</p>
                </div>
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black text-gray-600 uppercase mb-1">Archive Progress</p>
                  <p className="text-lg font-black italic">{watchedEpisodes.size} VIEWED NODES</p>
                </div>
              </div>
            </div>
          </div>
        </div>
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

export default TVDetailPage;