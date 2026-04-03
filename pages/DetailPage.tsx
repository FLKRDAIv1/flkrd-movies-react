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
import { fetchData, isForbidden } from '../services/tmdbService';
import { API_KEY, IMAGE_BASE_URL_POSTER, IMAGE_BASE_URL, IMAGE_BASE_URL_LOGO } from '../constants';
import Spinner from '../components/Spinner';
import Row from '../components/Row';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import { getRankedSources, getSourceUrl, getSourceSandboxConfig } from '../utils/playerSourceUtils';

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
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [recommendations, setRecommendations] = useState<Content[]>([]);
  const [isInMyList, setIsInMyList] = useState(false);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [activeSource, setActiveSource] = useState('FLKRD SERVER 1');
  const [showSourceSwitcher, setShowSourceSwitcher] = useState(false);
  const [selectedActorId, setSelectedActorId] = useState<number | null>(null);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const [bingeMode, setBingeMode] = useState(() => {
    try { return localStorage.getItem('flkrd_binge_mode') === 'true'; } catch (e) { return false; }
  });
  const [showBingePrompt, setShowBingePrompt] = useState(false);

  const sources = getRankedSources();

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
        progress: time,
        duration: duration || content.runtime * 60 || 7200,
        lastWatched: Date.now()
      };

      if (index > -1) progress[index] = item;
      else progress.push(item);

      localStorage.setItem('watchProgress', JSON.stringify(progress));
      window.dispatchEvent(new Event('watchProgressUpdated'));

      if (time > (duration || 7200) * 0.98 && bingeMode && !showBingePrompt && recommendations.length > 0) {
        setShowBingePrompt(true);
      }
      window.dispatchEvent(new Event('storage'));
    } catch (e) { }
  }, [content, bingeMode, showBingePrompt, recommendations]);

  useEffect(() => {
    const handlePlayerMessages = (event: MessageEvent) => {
      try {
        const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (payload && (payload.type === 'PLAYER_EVENT' || payload.event)) {
          const data = payload.data || payload;
          if (data.event === 'timeupdate' || data.event === 'pause') {
            updateProgress(data.time || data.currentTime || 0, data.duration || 0);
          }
        }
      } catch (e) { }
    };
    window.addEventListener('message', handlePlayerMessages);
    return () => window.removeEventListener('message', handlePlayerMessages);
  }, [updateProgress]);

  useEffect(() => {
    try {
      const myList = JSON.parse(localStorage.getItem('myList') || '[]');
      setIsInMyList(myList.some((item: any) => item.id === Number(id)));
    } catch (e) { }
  }, [id]);

  useEffect(() => {
    const fetchContentDetails = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const apiLang = 'en-US';
        const endpoint = `/movie/${id}?api_key=${API_KEY}&language=${apiLang}&append_to_response=credits,similar,recommendations,images,videos&include_image_language=en,null`;
        const data = await fetchData(endpoint, language);
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
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchContentDetails();
    window.scrollTo(0, 0);
  }, [id, language]);

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]"><Spinner /></div>;
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-[200] flex flex-col items-center justify-center backdrop-blur-3xl" dir="ltr">
            <div className="w-full max-w-7xl flex items-center justify-between p-4 md:p-6 bg-black/40 backdrop-blur-xl border-b border-white/5 z-[300]">
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

            <div className="w-full max-w-7xl aspect-video relative bg-black shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden">
              {isPlayerLoading && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10"><Spinner /><span className="mt-6 text-[10px] font-black tracking-[0.5em] text-red-600 animate-pulse uppercase">Syncing Stream...</span></div>}
              <iframe
                src={getSourceUrl(activeSource, id!, 'movie', undefined, undefined, initialProgress)}
                sandbox={getSourceSandboxConfig(activeSource)}
                allowFullScreen
                className="w-full h-full border-none pointer-events-auto"
                onLoad={() => setIsPlayerLoading(false)}
              ></iframe>

              <AnimatePresence>
                {showSourceSwitcher && (
                  <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="absolute top-0 right-0 bottom-0 w-72 bg-black/95 backdrop-blur-3xl border-l border-white/10 z-[300] p-6 overflow-y-auto scrollbar-hide">
                    <div className="flex items-center justify-between mb-8"><h3 className="text-base font-black uppercase italic tracking-tighter text-white">Nodes</h3><button onClick={() => setShowSourceSwitcher(false)} className="text-white hover:text-red-500"><X size={20} /></button></div>
                    <div className="space-y-3 pb-10">
                      {sources.map(s => (
                        <button key={s.name} onClick={() => { setActiveSource(s.name); setIsPlayerLoading(true); setShowSourceSwitcher(false); }} className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all border ${activeSource === s.name ? 'bg-red-600 border-red-500 text-white' : 'bg-white/5 border-white/5 hover:border-white/20 text-gray-400'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${activeSource === s.name ? 'bg-white animate-pulse' : 'bg-gray-500'}`} />
                            <span className="text-xs font-black uppercase tracking-widest">{s.name}</span>
                          </div>
                          {activeSource === s.name && <Check size={14} />}
                        </button>
                      ))}
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

        <div className={`absolute top-24 ${language === 'ku' ? 'right-6 md:right-20' : 'left-6 md:left-20'} z-20`}>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-[var(--brand-red)] text-white px-4 py-2.5 rounded-xl transition-all shadow-2xl group active:scale-95">
            <ArrowLeft size={18} className={`${language === 'ku' ? 'rotate-180' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">{t('back')}</span>
          </button>
        </div>

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
              <span className="text-xs font-black text-yellow-500">{content.vote_average.toFixed(1)}</span>
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
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handlePlayClick} className="flex items-center gap-3 bg-[var(--text-primary)] text-[var(--bg-primary)] font-[1000] py-4 px-10 md:py-5 md:px-16 rounded-xl md:rounded-[1.5rem] shadow-2xl transition-all"><Play size={20} fill="currentColor" /><span className="text-sm md:text-xl uppercase italic tracking-tighter">{initialProgress > 10 ? (language === 'ku' ? 'بەردەوامبە' : 'RESUME STREAM') : (language === 'ku' ? 'دەستپێکردن' : 'START STREAM')}</span></motion.button>
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