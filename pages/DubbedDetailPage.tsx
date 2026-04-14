import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Star, Mic2, Info, Share, Zap, Activity, MessageSquare, Calendar, Monitor, Clock, Globe, User, Film, Layers, ShieldCheck, Maximize, ArrowLeft, Check, Layers as LayersIcon, ExternalLink, Link as LinkIcon, Send, Facebook, ArrowRight, Shield, PlayCircle
} from 'lucide-react';
import { Content, WatchProgress } from '../types';
import { fetchData } from '../services/tmdbService';
import { API_KEY, IMAGE_BASE_URL, IMAGE_BASE_URL_POSTER, CUSTOM_DUBBED_ARCHIVE } from '../constants';
import Spinner from '../components/Spinner';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import { supabase } from '../utils/supabaseClient';
import { db } from '../utils/db';
import UniversalVideoPlayer from '../components/UniversalVideoPlayer';

const DubbedDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const { t, language } = useTranslation();
    const { theme, accentColor } = useUI();
    const { addNotification } = useNotification();

    const [content, setContent] = useState<Content | null>(null);
    const [loading, setLoading] = useState(!location.state?.customData);
    const [isPlayerLoading, setIsPlayerLoading] = useState(true);
    const [supabaseData, setSupabaseData] = useState<any>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);

    const dubbedData = useMemo(() => {
        if (location.state?.customData) return location.state.customData;
        if (supabaseData) return supabaseData;
        
        // Normalize searching in the local archive by stripping 'custom_' prefix if needed
        const cleanId = id?.replace('custom_', '');
        return CUSTOM_DUBBED_ARCHIVE.find(movie => String(movie.id) === String(cleanId) || String(movie.id) === String(id));
    }, [id, location.state, supabaseData]);

    // Smart iFrame Parser Engine
    const extractEmbedSrc = (source: string) => {
        if (!source) return "";

        // If the admin pasted a raw <iframe src="..."> string
        if (source.includes('<iframe')) {
            const match = source.match(/src=["'](.*?)["']/);
            if (match && match[1]) {
                return match[1];
            }
        }

        // If it's already a clean URL, just return it
        if (source.startsWith('http')) {
            return source;
        }

        // Clean removal of the 'wrong movie' fallback (mKkhrFhjQr3CKwz)
        return "";
    };

    const embedUrl = useMemo(() => {
        const source = dubbedData?.customStream || dubbedData?.videoUrl;
        return extractEmbedSrc(source);
    }, [dubbedData]);

    const updateProgress = useCallback((time: number, duration: number) => {
        if (!dubbedData && !content) return;
        const progressData = localStorage.getItem('watchProgress');
        let progress: WatchProgress[] = progressData ? JSON.parse(progressData) : [];

        const itemId = dubbedData?.id || content?.id;
        if (!itemId) return;

        const index = progress.findIndex(i => String(i.id) === String(itemId) && i.type === 'dubbed');

        const item: WatchProgress = {
            id: itemId,
            type: 'dubbed',
            title: dubbedData?.kurdishTitle || dubbedData?.title || content?.title || 'Dubbed Movie',
            poster_path: dubbedData?.poster_path || dubbedData?.imageBase64 || content?.poster_path || '',
            backdrop_path: dubbedData?.bannerBase64 || dubbedData?.backdrop_path || content?.backdrop_path,
            vote_average: dubbedData?.vote_average || content?.vote_average,
            progress: time,
            duration: duration || 7200,
            lastWatched: Date.now()
        };

        if (index > -1) progress[index] = item;
        else progress.push(item);

        localStorage.setItem('watchProgress', JSON.stringify(progress));
        window.dispatchEvent(new Event('watchProgressUpdated'));
        window.dispatchEvent(new Event('storage'));
    }, [content, dubbedData]);

    useEffect(() => {
        const handlePlayerMessages = (event: MessageEvent) => {
            try {
                const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                if (payload && (payload.type === 'PLAYER_EVENT' || payload.event || payload.type === 'timeupdate')) {
                    const data = payload.data || payload;
                    if (data.event === 'timeupdate' || data.event === 'pause' || data.type === 'timeupdate') {
                        const time = data.time || data.currentTime;
                        const duration = data.duration;
                        if (time && duration) {
                            updateProgress(time, duration);
                        }
                    }
                }
            } catch (e) { }
        };
        window.addEventListener('message', handlePlayerMessages);
        return () => window.removeEventListener('message', handlePlayerMessages);
    }, [updateProgress]);

    useEffect(() => {
        let isMounted = true;
        
        // Instant Hydration Protocol: Skip the 10s delay if we already have data from the state
        if (location.state?.customData) {
            setLoading(false);
        }

        const timeoutId = setTimeout(() => {
            if (isMounted) setLoading(false);
        }, 10000); // 10s absolute maximum fallback

        const loadContent = async () => {
            if (!id) return;
            setLoading(true);

            try {
                // 1. Check if it's a Supabase movie
                const idStr = id.toString();
                if (idStr.startsWith('custom_')) {
                    const dbId = idStr.replace('custom_', '');
                    try {
                        const numericId = !isNaN(Number(dbId)) ? Number(dbId) : dbId;
                        const { data, error } = await supabase.from('dubbed_movies').select('*').eq('id', numericId).single();
                        if (data && !error) {
                            setSupabaseData({
                                ...data,
                                id: `custom_${data.id}`,
                                poster_path: data.imageBase64,
                                backdrop_path: data.bannerBase64 || data.imageBase64,
                                customStream: data.videoUrl,
                                kurdishTitle: data.title,
                                kurdishOverview: data.description
                            });
                        } else {
                            // FALLBACK to IndexedDB
                            const cached = await db.getMovies();
                            const match = cached.find(m => m.id === idStr || m.id === numericId || `custom_${m.id}` === idStr);
                            if (match) setSupabaseData(match);
                        }
                    } catch (e) {
                        const cached = await db.getMovies();
                        const match = cached.find(m => m.id === idStr || `custom_${m.id}` === idStr);
                        if (match) setSupabaseData(match);
                    }
                }

                // 2. Fetch TMDB Enrichment ONLY if the ID is a valid TMDB format (usually >= 500)
                // Small IDs (1, 2, 3, etc.) are likely your Supabase sequence IDs and should NOT be checked in TMDB.
                const apiLang = 'en-US';
                const cleanId = idStr.replace('custom_', '');
                const numericId = Number(cleanId);

                if (!isNaN(numericId) && numericId > 200) {
                    const endpoint = `/movie/${numericId}?api_key=${API_KEY}&language=${apiLang}&append_to_response=credits`;
                    try {
                        let data = await fetchData(endpoint, language);
                        if (data && isMounted) setContent(data);
                    } catch (err) {
                        console.log("TMDB metadata error, using local/supabase data.");
                    }
                }
            } catch (err) {
                console.error("Critical loader crash:", err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                    clearTimeout(timeoutId);
                }
            }
        };

        loadContent();
        window.scrollTo(0, 0);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [id, language]);

    const handlePlayerLoad = useCallback(() => {
        setIsPlayerLoading(false);
    }, []);

    if (loading && !dubbedData && !content) return <div className="h-screen flex items-center justify-center bg-[var(--bg-primary)]"><Spinner /></div>;

    // Strict Data Boundary Logic to prevent Black Screen / Crash
    const displayTitle = (dubbedData?.kurdishTitle || dubbedData?.title || content?.title || content?.name || "Initializing Source...") as string;
    const displayOverview = (dubbedData?.kurdishOverview || dubbedData?.description || content?.overview || (language === 'ku' ? "داتاکان لە بارکردندان..." : "Neural node synchronizing...")) as string;
    
    const backdropUrl = dubbedData?.bannerBase64 || (content?.backdrop_path ? `${IMAGE_BASE_URL}${content.backdrop_path}` : (dubbedData?.poster_path || ''));
    const isReady = !!(embedUrl || dubbedData || content);

    return (
        <div className="min-h-screen bg-transparent text-[var(--text-primary)] overflow-x-hidden pb-32 transition-colors duration-500" dir={language === 'ku' ? 'rtl' : 'ltr'}>
            <AnimatePresence mode="wait">
                {!isReady && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
                    >
                        <Spinner />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000 ${theme.id?.includes('moon') ? 'opacity-10' : 'opacity-20'}`}>
                {backdropUrl && <img src={backdropUrl} className="w-full h-full object-cover blur-[120px] scale-110" alt="" />}
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)] via-transparent to-[var(--bg-primary)]"></div>
            </div>

            <div className="relative z-10 pt-24 md:pt-32 px-4 md:px-12">
                <div className="max-w-7xl mx-auto mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full text-[var(--text-primary)] active:scale-90 transition-all font-black uppercase tracking-widest text-[9px]"
                    >
                        <ArrowLeft size={16} className={language === 'ku' ? 'rotate-180' : ''} />
                        {t('back')}
                    </button>
                </div>

                <div className="w-full max-w-7xl mx-auto mb-8 md:mb-12">
                    <div ref={playerContainerRef} className="relative rounded-3xl md:rounded-[4rem] overflow-hidden bg-black border-4 md:border-[6px] border-white/5 shadow-2xl group aspect-video" dir="ltr">
                        {embedUrl ? (
                            <UniversalVideoPlayer
                                src={embedUrl}
                                accentColor={accentColor}
                                language={language}
                                onLoad={handlePlayerLoad}
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-2xl">
                                <Zap className="w-12 h-12 mb-4 animate-[pulse_1.5s_infinite]" style={{ color: accentColor }} />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Synchronizing Stream...</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="max-w-7xl mx-auto flex flex-col items-start mb-10">
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        <div className="text-white text-[9px] md:text-[11px] font-black px-5 py-2.5 rounded-full flex items-center gap-2 shadow-xl uppercase tracking-[0.2em]" style={{ backgroundColor: accentColor }}>
                            <Mic2 size={14} />
                            {dubbedData?.isSubtitled ? (language === 'ku' ? "ژێرنوسی کوردی" : "Kurdish Subtitled") : (language === 'ku' ? "دۆبلاژکراوی کوردی" : "Kurdish Dubbed")}
                        </div>
                        {dubbedData?.level && (
                            <div className="bg-white/5 border border-white/10 text-white/60 text-[8px] md:text-[9px] font-black px-4 py-2.5 rounded-full uppercase tracking-widest">
                                {dubbedData.level} RANK
                            </div>
                        )}
                    </div>
                    <h1 className="text-4xl md:text-8xl font-[1000] uppercase italic tracking-[calc(-0.04em)] leading-[0.85] text-[var(--text-primary)] text-right max-w-5xl drop-shadow-2xl mb-10">
                        {displayTitle}
                    </h1>
                </div>

                <div className="max-w-7xl mx-auto mb-24">
                    <div className="bg-white/[0.02] backdrop-blur-[60px] border border-white/10 p-10 rounded-3xl md:rounded-[4rem] shadow-2xl relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-1.5 h-6 rounded-full shadow-[0_0_15px_currentColor]" style={{ backgroundColor: accentColor, color: accentColor }} />
                                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.5em] text-[var(--text-secondary)] italic opacity-60">CHRONICLE_SOURCE</h3>
                            </div>
                            <div className="flex items-center gap-6">
                                {content?.vote_average && (
                                    <div className="flex items-center gap-2 text-yellow-500 font-mono font-black text-lg">
                                        <Star size={18} fill="currentColor" />
                                        {content.vote_average.toFixed(1)}
                                    </div>
                                )}
                                <Zap size={18} className="animate-pulse" style={{ color: accentColor }} />
                            </div>
                        </div>
                        <p className="text-[var(--text-primary)] text-xl md:text-4xl leading-[1.6] italic text-right font-black py-4 opacity-90 tracking-tight">
                            {displayOverview}
                        </p>

                        {/* Aesthetic Data Layer */}
                        <div className="mt-12 flex flex-wrap gap-8 items-center border-t border-white/5 pt-10">
                             <div className="flex flex-col gap-1.5">
                                 <span className="text-[8px] text-white/30 font-black uppercase tracking-widest">Release Cycle</span>
                                 <div className="flex items-center gap-2 text-white font-black text-xs">
                                     <Calendar size={14} className="text-brand" />
                                     {dubbedData?.created_at ? new Date(dubbedData.created_at).getFullYear() : (content?.release_date?.split('-')[0] || '2025')}
                                 </div>
                             </div>
                             <div className="flex flex-col gap-1.5">
                                 <span className="text-[8px] text-white/30 font-black uppercase tracking-widest">Source Protocol</span>
                                 <div className="flex items-center gap-2 text-[var(--text-secondary)] font-black text-[10px] uppercase tracking-tighter">
                                     <Monitor size={14} style={{ color: accentColor }} />
                                     {dubbedData?.customStream ? "Private Node" : "Standard API"}
                                 </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DubbedDetailPage;