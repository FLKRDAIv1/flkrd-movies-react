import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Star, Mic2, Info, Share, Zap, Activity, MessageSquare, Calendar, Monitor, Clock, Globe, User, Film, Layers, ShieldCheck, Maximize, ArrowLeft, Check, Layers as LayersIcon, ExternalLink, Link as LinkIcon, Send, Facebook, ArrowRight, Shield, PlayCircle, Sparkles
} from 'lucide-react';
import { Content, WatchProgress } from '../types';
import { fetchData } from '../services/tmdbService';
import { bannedService } from '../services/bannedService';
import { API_KEY, IMAGE_BASE_URL, IMAGE_BASE_URL_POSTER, CUSTOM_DUBBED_ARCHIVE } from '../constants';
import { SkeletonDetailPage } from '../components/Skeleton';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import { supabase } from '../utils/supabaseClient';
import { db } from '../utils/db';
import { useLocalUser } from '../hooks/useLocalUser';
import UniversalVideoPlayer from '../components/UniversalVideoPlayer';
import Portal from '../components/Portal';

const DubbedDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const { t, language } = useTranslation();
    const { theme, accentColor } = useUI();
    const { addNotification } = useNotification();
    const { localUserId } = useLocalUser();
    const [isCreatingTicket, setIsCreatingTicket] = useState(false);

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

        let finalUrl = "";

        // 1. Extract from iframe if needed
        if (source.includes('<iframe')) {
            const match = source.match(/src=["'](.*?)["']/);
            if (match && match[1]) {
                finalUrl = match[1];
            }
        } else if (source.startsWith('http')) {
            finalUrl = source;
        }

        if (!finalUrl) return "";

        // 2. Professional Injection: Automatically fix VidKing and others
        try {
            if (finalUrl.includes('vidking.net')) {
                const url = new URL(finalUrl);
                if (!url.searchParams.has('sub')) url.searchParams.append('sub', '1');
                if (!url.searchParams.has('subtitles')) url.searchParams.append('subtitles', '1');
                if (!url.searchParams.has('autoplay')) url.searchParams.append('autoplay', '1');
                if (!url.searchParams.has('color')) url.searchParams.append('color', accentColor?.replace('#', '') || 'e50914');
                finalUrl = url.toString();
            }
        } catch (e) {
            // Fallback for malformed URLs
            if (finalUrl.includes('vidking.net') && !finalUrl.includes('sub=')) {
                finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'sub=1&subtitles=1&autoplay=1';
            }
        }

        return finalUrl;
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
                if (!payload || typeof payload !== 'object') return;

                let time = 0;
                let duration = 0;

                // 1. Videasy format: { timestamp: number, duration: number, progress: number }
                if (payload.timestamp !== undefined && payload.duration !== undefined) {
                    time = Number(payload.timestamp);
                    duration = Number(payload.duration);
                }
                // 2. VidLink Pro format: { type: 'PLAYER_EVENT', data: { currentTime, duration } }
                else if (payload.type === 'PLAYER_EVENT' && payload.data) {
                    time = payload.data.currentTime || payload.data.time || 0;
                    duration = payload.data.duration || 0;
                }
                // 3. VidLink MEDIA_DATA format
                else if (payload.type === 'MEDIA_DATA' && payload.data) {
                    time = payload.data.currentTime || 0;
                    duration = payload.data.duration || 0;
                }
                // 4. Standard timeupdate events (VidKing, others)
                else if (payload.event === 'timeupdate' || payload.type === 'timeupdate' || payload.event === 'pause') {
                    const d = payload.data || payload;
                    time = d.currentTime || d.time || d.seconds || 0;
                    duration = d.duration || 0;
                }
                // 5. Generic currentTime fallback
                else if (payload.currentTime !== undefined) {
                    time = Number(payload.currentTime);
                    duration = payload.duration ? Number(payload.duration) : 0;
                }

                if (time > 0 && duration > 0) {
                    updateProgress(time, duration);
                }
            } catch (e) { }
        };
        window.addEventListener('message', handlePlayerMessages);
        return () => window.removeEventListener('message', handlePlayerMessages);
    }, [updateProgress]);


    useEffect(() => {
        const handleBanUpdate = () => {
            const cleanId = id?.replace('custom_', '');
            if (cleanId && bannedService.isBanned(cleanId)) {
                addNotification({ type: 'error', title: 'NODE OFFLINE', message: 'This content has been removed globally.' });
                navigate('/');
            }
        };
        window.addEventListener('banned-list-updated', handleBanUpdate);
        return () => window.removeEventListener('banned-list-updated', handleBanUpdate);
    }, [id, navigate, addNotification]);

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
            const idStr = id.toString();
            const cleanId = idStr.replace('custom_', '');
            const numericId = !isNaN(Number(cleanId)) ? Number(cleanId) : cleanId;

            // 1. Parallel Enrichment: Supabase/Local + TMDB
            const [supabaseResult, tmdbResult] = await Promise.all([
                // Fetch basic data from Supabase or IndexedDB
                (async () => {
                    if (idStr.startsWith('custom_')) {
                        const { data, error } = await supabase
                            .from('dubbed_movies')
                            .select('*')
                            .eq('id', numericId)
                            .single();
                        
                        if (data && !error) return data;
                        
                        // Fallback to IndexedDB
                        const cached = await db.getMovies();
                        return cached.find(m => String(m.id) === idStr || String(m.id).includes(String(numericId)));
                    }
                    return null;
                })(),

                // Fetch TMDB Metadata in parallel
                (async () => {
                    const numId = Number(cleanId);
                    if (!isNaN(numId) && numId > 200) {
                        try {
                            return await fetchData(`/movie/${numId}?api_key=${API_KEY}&language=en-US&append_to_response=credits`, language);
                        } catch (e) { return null; }
                    }
                    return null;
                })()
            ]);

            if (supabaseResult && isMounted) {
                const titleStr = supabaseResult.title || 'Kurdish Dubbed Movie';
                document.title = (language === 'ku' || language === 'badini')
                  ? `سەیرکردنی فیلمی دۆبلاژکراوی کوردی ${titleStr} | FLKRD`
                  : `Watch ${titleStr} Kurdish Dubbed Movie | FLKRD`;

                setSupabaseData({
                    ...supabaseResult,
                    id: `custom_${supabaseResult.id}`,
                    poster_path: supabaseResult.imageBase64,
                    backdrop_path: supabaseResult.bannerBase64 || supabaseResult.imageBase64,
                    customStream: supabaseResult.videoUrl,
                    kurdishTitle: supabaseResult.title,
                    kurdishOverview: supabaseResult.description
                });
            }

            if (tmdbResult && isMounted) {
                setContent(tmdbResult);
            }

        } catch (err) {
            console.error("Critical loader crash:", err);
            addNotification({ type: 'error', title: 'Connection Issue', message: 'Could not sync with Zana Servers. Loading locally...' });
        } finally {
            if (isMounted) setLoading(false);
        }
    };

    loadContent();
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'instant' });
    }

    return () => { isMounted = false; };
}, [id, language]);

const handlePlayerLoad = useCallback(() => {
    setIsPlayerLoading(false);
}, []);

const handleCreateWatchParty = async () => {
    if (!localUserId) return;
    setIsCreatingTicket(true);
    try {
        const pin = String(Math.floor(1000 + Math.random() * 9000));
        const cleanId = id?.replace('custom_', '') || '';
        const ticketMovieId = `custom_${cleanId}`;

        const { data, error: insertError } = await supabase
            .from('watch_tickets')
            .insert({
                movie_id: ticketMovieId,
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
            message: (language === 'ku' || language === 'badini') ? 'هاوڕێکەت بانگهێشت بکە!' : 'Invite your guest to join!'
        });

        const movieState = {
            id: cleanId,
            title: dubbedData?.kurdishTitle || dubbedData?.title || displayTitle,
            poster_path: dubbedData?.poster_path || dubbedData?.imageBase64 || content?.poster_path || '',
            backdrop_path: dubbedData?.bannerBase64 || dubbedData?.backdrop_path || content?.backdrop_path || '',
            vote_average: dubbedData?.vote_average || content?.vote_average,
            release_date: dubbedData?.created_at || content?.release_date
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

if (loading && !dubbedData && !content) return <SkeletonDetailPage />;

// Strict Data Boundary Logic to prevent Black Screen / Crash
const displayTitle = (dubbedData?.kurdishTitle || dubbedData?.title || content?.title || content?.name || "Loading...") as string;
const displayOverview = (dubbedData?.kurdishOverview || dubbedData?.description || content?.overview || ((language === 'ku' || language === 'badini') ? "داتاکان لە بارکردندان..." : "Neural node synchronizing...")) as string;

const backdropUrl = dubbedData?.bannerBase64 || (content?.backdrop_path ? `${IMAGE_BASE_URL}${content.backdrop_path}` : (dubbedData?.poster_path || ''));
const isReady = !!(embedUrl || dubbedData || content);

if (!isReady) return <SkeletonDetailPage />;

return (
    <div className="min-h-screen bg-transparent text-[var(--text-primary)] overflow-x-hidden pb-52 md:pb-40 transition-colors duration-500" dir={(language === 'ku' || language === 'badini') ? 'rtl' : 'ltr'}>

            <div className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000 ${theme.id?.includes('moon') ? 'opacity-10' : 'opacity-20'}`}>
                {backdropUrl && <img src={backdropUrl} className="w-full h-full object-cover blur-[120px] scale-110" alt="" />}
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)] via-transparent to-[var(--bg-primary)]"></div>
            </div>

            <div className="relative z-10 pt-24 md:pt-32 px-4 md:px-12">
            <Portal id="dubbed-nav-portal">
                <div className={`fixed top-24 ${(language === 'ku' || language === 'badini') ? 'right-6 md:right-12' : 'left-6 md:left-12'} z-[110]`}>
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 bg-black/60 backdrop-blur-2xl border border-white/20 px-5 py-2.5 rounded-2xl text-[var(--text-primary)] hover:bg-[var(--brand-red)] hover:text-white active:scale-90 transition-all font-black uppercase tracking-widest text-[10px] shadow-2xl"
                    >
                        <ArrowLeft size={18} className={(language === 'ku' || language === 'badini') ? 'rotate-180' : ''} />
                        {t('back')}
                    </button>
                </div>
            </Portal>

                <div className="w-full max-w-7xl mx-auto mb-8 md:mb-12">
                    <div ref={playerContainerRef} className="relative rounded-3xl md:rounded-[4rem] overflow-hidden bg-black border-4 md:border-[6px] border-white/5 shadow-2xl group aspect-video" dir="ltr">
                        {embedUrl ? (
                            <UniversalVideoPlayer
                                src={embedUrl}
                                accentColor={accentColor}
                                language={language}
                                onLoad={handlePlayerLoad}
                                tmdbId={dubbedData?.tmdb_id || content?.id}
                                imdbId={dubbedData?.imdb_id || content?.imdb_id}
                                contentType={dubbedData?.media_type || "movie"}
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
                            {dubbedData?.isSubtitled ? ((language === 'ku' || language === 'badini') ? "ژێرنوسی کوردی" : "Kurdish Subtitled") : ((language === 'ku' || language === 'badini') ? "دۆبلاژکراوی کوردی" : "Kurdish Dubbed")}
                        </div>
                        {dubbedData?.level && (
                            <div className="bg-white/5 border border-white/10 text-white/60 text-[8px] md:text-[9px] font-black px-4 py-2.5 rounded-full uppercase tracking-widest">
                                {dubbedData.level} RANK
                            </div>
                        )}

                        {/* CO-WATCH PARTY Button */}
                        <button
                            onClick={handleCreateWatchParty}
                            disabled={isCreatingTicket}
                            className="group relative px-5 py-2.5 rounded-full font-black text-[9px] md:text-[11px] flex items-center gap-2 uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-60 border border-orange-500/50 hover:border-orange-400 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 hover:text-orange-300 shadow-[0_0_20px_rgba(234,88,12,0.1)] hover:shadow-[0_0_30px_rgba(234,88,12,0.25)]"
                        >
                            {isCreatingTicket ? (
                                <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent border-orange-500 animate-spin" />
                            ) : (
                                <Sparkles size={14} className="text-orange-500 animate-pulse" />
                            )}
                            {(language === 'ku' || language === 'badini') ? 'تەماشاکردنی هاوبەش' : 'CO-WATCH PARTY'}
                        </button>
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