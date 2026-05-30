import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, X, Check, Plus, Share, Monitor, FastForward,
  Clapperboard, Layers, Info, Sparkles, User, Film,
  Star, Calendar, Tv, Zap, Clock, Activity, ListChecks,
  ChevronRight, PlayCircle, Link as LinkIcon, Send, Facebook, ArrowRight,
  ChevronDown, MapPin, UserCheck, CheckCheck, ListMinus, Shield, Award, ArrowLeft, RefreshCcw, Timer, CheckCircle, Download, ChevronLeft, VolumeX, Volume2
} from 'lucide-react';
import { Content, CastMember, MyListItem, SeasonDetails, Episode, WatchProgress } from '../types';
import { fetchData, isForbidden, fetchExternalIds } from '../services/tmdbService';
import { API_KEY, IMAGE_BASE_URL_POSTER, IMAGE_BASE_URL, IMAGE_BASE_URL_LOGO } from '../constants';
import Spinner from '../components/Spinner';
import { useTranslation } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { useUI } from '../contexts/UIContext';
import { getRankedSources, getSourceUrl, getSourceSandboxConfig } from '../utils/playerSourceUtils';
import UniversalVideoPlayer from '../components/UniversalVideoPlayer';
import PremiumVidLinkPlayer from '../components/PremiumVidLinkPlayer';
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

  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [recommendations, setRecommendations] = useState<Content[]>([]);
  const [isInMyList, setIsInMyList] = useState(false);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [seasonDetails, setSeasonDetails] = useState<SeasonDetails | null>(null);
  const [activeSource, setActiveSource] = useState('FLKRD SERVER');
  const [showSourceSwitcher, setShowSourceSwitcher] = useState(false);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set());
  const [initialProgress, setInitialProgress] = useState(0);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [currentPlaybackDuration, setCurrentPlaybackDuration] = useState(0);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);
  const [imdbId, setImdbId] = useState<string | null>(null);

  // Binge Mode Logic
  const [isBingeEnabled, setIsBingeEnabled] = useState(() => localStorage.getItem('flkrd_binge_mode') === 'true');
  const [showBingeCountdown, setShowBingeCountdown] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const countdownTimerRef = useRef<number | null>(null);

  const [sources, setSources] = useState(() => getRankedSources(false));

  // [SUBTITLE SYNC] Fetch episode-specific subtitles
  useEffect(() => {
    const fetchEpisodeSubtitles = async () => {
      if (!id || !isPlayerModalOpen) return;
      setSubtitleUrl(null); // Reset for new episode
      try {
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
    const duration = data.duration;

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
      duration: duration || 2700,
      lastWatched: Date.now(),
      season: selectedSeason,
      episode: selectedEpisode
    };

    if (index > -1) progress[index] = item;
    else progress.push(item);

    localStorage.setItem('watchProgress', JSON.stringify(progress));
    window.dispatchEvent(new Event('watchProgressUpdated'));

    // Mark as watched (Binge countdown trigger removed as requested - provider handles next episode)
    if (time > (duration || 2700) * 0.98) {
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
    if (data.event === 'timeupdate' || data.event === 'pause' || data.event === 'ended') {
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
          document.title = language === 'ku'
            ? `سەیرکردنی زنجیرەی ${showName}${year} بە ژێرنووسی کوردی | FLKRD`
            : `Watch ${showName}${year} with Kurdish Subtitles | FLKRD`;

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
        title: language === 'ku' ? '🎬 تیکتی تەماشا دروست کرا!' : '🎬 WATCH TICKET CREATED!',
        message: language === 'ku' ? 'هاوڕێکەت بانگهێشت بکە بۆ بەشداریکردن!' : 'Invite your guest to join the cinema hall!'
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
        title: language === 'ku' ? 'هەڵە' : 'Error',
        message: language === 'ku' ? 'نەتوانرا تیکت دروست بکرێت.' : 'Failed to create watch ticket.'
      });
    } finally {
      setIsCreatingTicket(false);
    }
  };

  if (loading && !content) return <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]"><Spinner /></div>;
  if (!content) return null;

  return (
    <div className="pb-52 md:pb-40 bg-transparent min-h-screen text-[var(--text-primary)] relative" dir={language === 'ku' ? 'rtl' : 'ltr'}>
      <div className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000 ${theme.id?.includes('moon') ? 'opacity-10' : 'opacity-20'}`}>
        <img src={`${IMAGE_BASE_URL}${content.backdrop_path}`} className="w-full h-full object-cover blur-[120px]" alt="" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)] via-transparent to-[var(--bg-primary)]"></div>
      </div>

      <AnimatePresence>
        {isTrailerModalOpen && trailerKey && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 z-[300] backdrop-blur-3xl flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-5xl flex justify-between items-center mb-4">
              <h2 className="text-xl font-black uppercase italic tracking-tighter">{t('playTrailer')}</h2>
              <button onClick={() => setIsTrailerModalOpen(false)} className="p-3 bg-white/10 hover:bg-red-600 rounded-2xl transition-all"><X size={24} /></button>
            </div>
            <div className="w-full max-w-5xl aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
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
              {activeSource === 'FLKRD SERVER 1' ? (
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
                                layoutId="active-accent-line-tv"
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
                                          <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.941.1-1.358.275C14.77 2.515 13.512 1.5 12 1.5s-2.77 1.015-3.372 2.285c-.417-.175-.878-.275-1.358-.275-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .941-.1 1.358-.275.602 1.27 1.86 2.285 3.372 2.285s2.77-1.015 3.372-2.285c.417.175.878.275 1.358.275 2.108 0 3.818-1.78-3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.5 4L6 12.5l1.4-1.4 2.6 2.6 6.6-6.6 1.4 1.4-8 8z" />
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

      <div className="relative w-full h-[70vh] md:h-[90vh] overflow-hidden z-10" dir="ltr">
        <div className="absolute inset-0">
          {trailerKey ? (
            <div className="absolute inset-0 scale-[1.5] pointer-events-none">
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${trailerKey}&controls=0&modestbranding=1&rel=0&showinfo=0`}
                className="w-full h-full opacity-60"
                frameBorder="0"
                allow="autoplay"
              />
            </div>
          ) : (
            <img src={`${IMAGE_BASE_URL}${content.backdrop_path}`} alt="" className="w-full h-full object-cover opacity-60" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
        </div>

        {trailerKey && (
          <div className={`absolute top-24 ${language === 'ku' ? 'left-6 md:left-20' : 'right-6 md:right-20'} z-20`}>
            <button onClick={() => setIsMuted(!isMuted)} className="bg-black/40 backdrop-blur-xl border border-white/10 p-3 rounded-full text-white hover:bg-red-600 transition-all shadow-2xl">
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
        )}

        <div className={`absolute bottom-12 md:bottom-28 ${language === 'ku' ? 'right-0 text-right' : 'left-0 text-left'} right-0 px-6 md:px-8 lg:px-20 z-10 flex flex-col items-start max-w-6xl`}>
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
              <span className="text-base md:text-xl uppercase italic tracking-tighter">{initialProgress > 10 ? (language === 'ku' ? 'بەردەوامبە' : 'RESUME STREAM') : (language === 'ku' ? 'دەستپێکردن' : 'START STREAM')}</span>
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
              <span className="relative">{language === 'ku' ? 'تەماشاکردنی هاوبەش' : 'CO-WATCH PARTY'}</span>
            </button>
          </div>
        </div>
        {!isPlayerModalOpen && (
          <div className={`absolute top-24 ${language === 'ku' ? 'right-6 md:right-20' : 'left-6 md:left-20'} z-20`}>
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl transition-all shadow-2xl group active:scale-95">
              <ArrowLeft size={18} className={language === 'ku' ? 'rotate-180 group-hover:translate-x-1 transition-transform' : 'group-hover:-translate-x-1 transition-transform'} />
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
                  <h2 className="text-3xl md:text-7xl font-[1000] uppercase italic tracking-tighter text-white">{language === 'ku' ? 'ئەڵقەکان' : 'EPISODES'}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative min-w-[180px]" dir="ltr">
                    <select value={selectedSeason} onChange={(e) => { setSelectedSeason(Number(e.target.value)); fetchSeasonDetails(Number(e.target.value)); }} className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-4 text-white font-black uppercase appearance-none focus:border-red-600 outline-none shadow-2xl backdrop-blur-md">
                      {content.seasons?.filter((s: any) => s.season_number > 0).map((s: any) => <option key={s.id} value={s.season_number} className="bg-[#111]">{language === 'ku' ? 'وەرزی' : 'Season'} {s.season_number}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-red-600 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              {!seasonDetails ? <div className="flex justify-center py-20"><Spinner /></div> : (
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
    </div>
  );
};

export default TVDetailPage;