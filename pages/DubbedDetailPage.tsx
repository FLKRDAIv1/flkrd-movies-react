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
    const [loading, setLoading] = useState(true);
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
        if (!source) return "https://rashaba.com/embed/mKkhrFhjQr3CKwz";

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

        // Fallback for extreme edge cases based on old rashaba logic
        return "https://rashaba.com/embed/mKkhrFhjQr3CKwz";
    };

    const embedUrl = dubbedData?.customStream ? extractEmbedSrc(dubbedData.customStream) : (dubbedData?.videoUrl ? extractEmbedSrc(dubbedData.videoUrl) : "https://rashaba.com/embed/mKkhrFhjQr3CKwz");

    const updateProgress = useCallback((time: number, duration: number) => {
        if (!dubbedData && !content) return;
        const progressData = localStorage.getItem('watchProgress');
        let progress: WatchProgress[] = progressData ? JSON.parse(progressData) : [];

        const itemId = dubbedData?.id || content?.id;
        if (!itemId) return;

        const index = progress.findIndex(i => i.id === itemId && i.type === 'dubbed');

        const item: WatchProgress = {
            id: Number(itemId.toString().replace('custom_', '')),
            type: 'dubbed',
            title: dubbedData?.kurdishTitle || dubbedData?.title || content?.title || 'Dubbed Movie',
            poster_path: dubbedData?.poster_path || dubbedData?.imageBase64 || content?.poster_path || '',
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
        const timeoutId = setTimeout(() => {
            if (isMounted) setLoading(false);
        }, 10000); // 10s absolute fallback for the spinner

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

                // 2. Fetch TMDB Enrichment ONLY if it's a real TMDB movie (not a custom Supabase upload)
                if (!idStr.startsWith('custom_')) {
                    const apiLang = 'en-US';
                    const cleanId = idStr.replace('custom_', '');

                    if (!isNaN(Number(cleanId))) {
                        const numericTMDBId = Number(cleanId);
                        const endpoint = `/movie/${numericTMDBId}?api_key=${API_KEY}&language=${apiLang}&append_to_response=credits`;
                        try {
                            let data = await fetchData(endpoint, language);
                            if (data && isMounted) setContent(data);
                        } catch (err) {
                            console.log("TMDB metadata error, using local/supabase data.");
                        }
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

    if (loading && !dubbedData) return <div className="h-screen flex items-center justify-center bg-[var(--bg-primary)]"><Spinner /></div>;

    const displayTitle = dubbedData?.kurdishTitle || content?.title || content?.name || dubbedData?.title || "Unknown Title";
    const displayOverview = dubbedData?.kurdishOverview || content?.overview || (language === 'ku' ? "هیچ زانیاریەک بەردەست نیە" : "No description available in this node.");
    const backdropUrl = content?.backdrop_path ? `${IMAGE_BASE_URL}${content.backdrop_path}` : (dubbedData?.poster_path || '');

    return (
        <div className="min-h-screen bg-transparent text-[var(--text-primary)] overflow-x-hidden pb-32 transition-colors duration-500" dir={language === 'ku' ? 'rtl' : 'ltr'}>
            <div className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000 ${theme.id?.includes('moon') ? 'opacity-10' : 'opacity-20'}`}>
                <img src={backdropUrl} className="w-full h-full object-cover blur-[120px] scale-110" alt="" />
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)] via-transparent to-[var(--bg-primary)]"></div>
            </div>

            <div className="relative z-10 pt-24 md:pt-32 px-4 md:px-12">
                <div className="max-w-7xl mx-auto mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full text-[var(--text-primary)] active:scale-90 transition-all"
                    >
                        <ArrowLeft size={18} className={language === 'ku' ? 'rotate-180' : ''} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('back')}</span>
                    </button>
                </div>

                <div className="w-full max-w-7xl mx-auto mb-8 md:mb-12">
                    <div ref={playerContainerRef} className="relative rounded-3xl md:rounded-[4rem] overflow-hidden bg-black border-4 md:border-[6px] border-white/5 shadow-2xl group aspect-video" dir="ltr">
                        <UniversalVideoPlayer
                            src={embedUrl}
                            accentColor={accentColor}
                            language={language}
                            onLoad={handlePlayerLoad}
                        />
                    </div>
                </div>

                <div className="max-w-7xl mx-auto flex flex-col items-start mb-10">
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        <div className="text-white text-[8px] md:text-[10px] font-black px-4 py-2 rounded-full flex items-center gap-1.5 shadow-xl uppercase tracking-widest" style={{ backgroundColor: accentColor }}>
                            <Mic2 size={12} />
                            {dubbedData?.isSubtitled ? (language === 'ku' ? "ژێرنوسی کوردی" : "Kurdish Subtitled") : (language === 'ku' ? "دۆبلاژکراوی کوردی" : "Kurdish Dubbed")}
                        </div>
                    </div>
                    <h1 className="text-3xl md:text-7xl font-[1000] uppercase italic tracking-tighter leading-[0.9] text-[var(--text-primary)] text-right max-w-5xl drop-shadow-2xl mb-8">
                        {displayTitle}
                    </h1>
                </div>

                <div className="max-w-7xl mx-auto mb-24">
                    <div className="bg-white/[0.02] backdrop-blur-[60px] border border-white/10 p-8 rounded-3xl md:rounded-[4rem] shadow-2xl relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-5 rounded-full" style={{ backgroundColor: accentColor }} />
                                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-[var(--text-secondary)] italic">CHRONICLE_DATA</h3>
                            </div>
                            <Zap size={16} className="animate-pulse" style={{ color: accentColor }} />
                        </div>
                        <p className="text-[var(--text-primary)] text-lg md:text-3xl leading-relaxed italic text-right font-bold py-2">
                            {displayOverview}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DubbedDetailPage;