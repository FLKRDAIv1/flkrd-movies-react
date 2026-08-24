import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Star, Mic2, Share2, Zap, Activity, Calendar, Monitor, Clock, Film,
    ArrowLeft, Check, Plus, Users, Sparkles, X, Home, Play
} from 'lucide-react';
import { Content, WatchProgress } from '../types';
import { fetchData, getMediaType } from '../services/tmdbService';
import { bannedService } from '../services/bannedService';
import { API_KEY, IMAGE_BASE_URL, IMAGE_BASE_URL_POSTER, IMAGE_BASE_URL_PROFILE, CUSTOM_DUBBED_ARCHIVE } from '../constants';
import { SkeletonDetailPage } from '../components/Skeleton';
import Spinner from '../components/Spinner';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import { supabase } from '../utils/supabaseClient';
import { db } from '../utils/db';
import { useLocalUser } from '../hooks/useLocalUser';
import UniversalVideoPlayer from '../components/UniversalVideoPlayer';
import Portal from '../components/Portal';
import CommentSection from '../components/CommentSection';
import { extractEmbedSrc, getDubbedSources } from '../utils/playerSourceUtils';

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
    const [supabaseData, setSupabaseData] = useState<any>(null);

    // Fullscreen Video Player State
    const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
    const [activeSourceIndex, setActiveSourceIndex] = useState(0);

    // My List State
    const [isAdded, setIsAdded] = useState(false);

    // Cast / Actor Profile State
    const [cast, setCast] = useState<any[]>([]);
    const [selectedActorId, setSelectedActorId] = useState<number | null>(null);
    const [actorDetails, setActorDetails] = useState<any | null>(null);
    const [isActorLoading, setIsActorLoading] = useState(false);

    const isRtl = language === 'ku' || language === 'badini';

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

    useEffect(() => {
        if (selectedActorId || isPlayerModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [selectedActorId, isPlayerModalOpen]);

    const dubbedData = useMemo(() => {
        if (!id) return null;
        const cleanId = String(id).replace('custom_', '');
        const dbId = String(id).startsWith('custom_') ? String(id) : `custom_${id}`;

        // 1. Validate location.state matches current route ID
        if (location.state?.customData) {
            const locId = String(location.state.customData.id);
            if (locId === id || locId === cleanId || locId === dbId || locId.replace('custom_', '') === cleanId) {
                return location.state.customData;
            }
        }

        // 2. Validate fetched supabaseData matches current route ID
        if (supabaseData) {
            const subId = String(supabaseData.id);
            if (subId === id || subId === cleanId || subId === dbId || subId.replace('custom_', '') === cleanId) {
                return supabaseData;
            }
        }
        
        // 3. Fallback to local archive
        return CUSTOM_DUBBED_ARCHIVE.find(movie => {
            const mId = String(movie.id);
            return mId === cleanId || mId === id || mId === dbId || mId.replace('custom_', '') === cleanId;
        });
    }, [id, location.state, supabaseData]);

    const dubbedSources = useMemo(() => {
        const raw = (dubbedData?.customStream && dubbedData.customStream.trim())
            || (dubbedData?.videoUrl && dubbedData.videoUrl.trim())
            || (dubbedData?.video_url && dubbedData.video_url.trim())
            || (dubbedData?.url && dubbedData.url.trim())
            || (location.state?.customSource && location.state.customSource.trim());
        return getDubbedSources(raw || '', language);
    }, [dubbedData, location.state?.customSource, language]);

    const activeEmbedUrl = useMemo(() => {
        if (dubbedSources.length > 0) {
            const selected = dubbedSources[activeSourceIndex] || dubbedSources[0];
            return selected.url;
        }
        const raw = (dubbedData?.customStream && dubbedData.customStream.trim())
            || (dubbedData?.videoUrl && dubbedData.videoUrl.trim())
            || (dubbedData?.video_url && dubbedData.video_url.trim())
            || (dubbedData?.url && dubbedData.url.trim())
            || (location.state?.customSource && location.state.customSource.trim());
        return extractEmbedSrc(raw || '');
    }, [dubbedSources, activeSourceIndex, dubbedData, location.state?.customSource]);

    // Check My List status
    useEffect(() => {
        try {
            const myList = JSON.parse(localStorage.getItem('myList') || '[]');
            const cleanId = id?.replace('custom_', '');
            setIsAdded(myList.some((item: any) => String(item.id).replace('custom_', '') === cleanId));
        } catch (e) {}
    }, [id]);

    const handleToggleMyList = () => {
        try {
            let myList = JSON.parse(localStorage.getItem('myList') || '[]');
            const cleanId = id?.replace('custom_', '');
            const idx = myList.findIndex((item: any) => String(item.id).replace('custom_', '') === cleanId);
            if (idx > -1) {
                myList.splice(idx, 1);
                setIsAdded(false);
                addNotification({
                    type: 'info',
                    title: t('notificationsInfoTitle') || 'Removed',
                    message: t('myListRemoveSuccess') || 'Removed from My List'
                });
            } else {
                myList.push({
                    id: cleanId,
                    media_type: 'dubbed',
                    title: dubbedData?.kurdishTitle || dubbedData?.title || displayTitle,
                    poster_path: dubbedData?.poster_path || dubbedData?.imageBase64 || content?.poster_path || '',
                    vote_average: dubbedData?.vote_average || content?.vote_average || 8.5
                });
                setIsAdded(true);
                addNotification({
                    type: 'success',
                    title: t('notificationsSuccessTitle') || 'Added',
                    message: t('myListAddSuccess') || 'Saved to My List'
                });
            }
            localStorage.setItem('myList', JSON.stringify(myList));
            window.dispatchEvent(new Event('storage'));
        } catch (e) {}
    };

    const lastProgressSaveRef = useRef<number>(0);
    const updateProgress = useCallback((time: number, duration: number) => {
        if (!dubbedData && !content) return;
        const now = Date.now();
        if (now - lastProgressSaveRef.current < 5000) return;
        lastProgressSaveRef.current = now;

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
            lastWatched: now
        };

        if (index > -1) progress[index] = item;
        else progress.push(item);

        localStorage.setItem('watchProgress', JSON.stringify(progress));
        window.dispatchEvent(new Event('watchProgressUpdated'));
        window.dispatchEvent(new Event('storage'));
    }, [content, dubbedData]);

    useEffect(() => {
        const handlePlayerMessages = (event: MessageEvent) => {
            setTimeout(() => {
                try {
                    const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                    if (!payload || typeof payload !== 'object') return;

                    let time = 0;
                    let duration = 0;

                    if (payload.timestamp !== undefined) {
                        time = Number(payload.timestamp);
                        duration = payload.duration ? Number(payload.duration) : 0;
                    } else if (payload.type === 'PLAYER_EVENT' && payload.data) {
                        time = payload.data.currentTime || payload.data.time || 0;
                        duration = payload.data.duration || 0;
                    } else if (payload.type === 'MEDIA_DATA' && payload.data) {
                        time = payload.data.currentTime || 0;
                        duration = payload.data.duration || 0;
                    } else if (payload.event === 'timeupdate' || payload.type === 'timeupdate' || payload.event === 'pause') {
                        const d = payload.data || payload;
                        time = d.currentTime || d.time || d.seconds || 0;
                        duration = d.duration || 0;
                    } else if (payload.currentTime !== undefined) {
                        time = Number(payload.currentTime);
                        duration = payload.duration ? Number(payload.duration) : 0;
                    }

                    if (time > 0 && duration > 0) {
                        updateProgress(time, duration);
                    }
                } catch (e) { }
            }, 0);
        };
        window.addEventListener('message', handlePlayerMessages);
        return () => window.removeEventListener('message', handlePlayerMessages);
    }, [updateProgress]);

    useEffect(() => {
        return () => {
            // Stop and cleanup any active background media on navigation
            try {
                const elements = document.querySelectorAll('video, audio');
                elements.forEach((el: any) => {
                    try {
                        el.pause();
                        el.src = '';
                    } catch (e) {}
                });
            } catch (e) {}
        };
    }, [id]);

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
        
        setContent(null);
        setSupabaseData(null);
        setCast([]);
        setSelectedActorId(null);
        setActorDetails(null);
        
        if (location.state?.customData) {
            setLoading(false);
        }

        const timeoutId = setTimeout(() => {
            if (isMounted) setLoading(false);
        }, 10000);

        const loadContent = async () => {
            if (!id) return;

            const idStr = id.toString();
            const cleanId = idStr.replace('custom_', '');
            const dbId = idStr.startsWith('custom_') ? idStr : `custom_${idStr}`;

            let hasPreHydrated = false;

            // STEP 1: Local Pre-Hydration
            try {
                const cached = await db.getMovies();
                const localMovie = cached.find(m => String(m.id) === dbId || String(m.id).replace('custom_', '') === cleanId)
                    || CUSTOM_DUBBED_ARCHIVE.find(m => String(m.id) === cleanId || String(m.id) === idStr);
                
                if (localMovie && isMounted) {
                    setSupabaseData({
                        ...localMovie,
                        id: String(localMovie.id).startsWith('custom_') ? localMovie.id : `custom_${localMovie.id}`,
                        poster_path: localMovie.imageBase64,
                        backdrop_path: localMovie.bannerBase64 || localMovie.imageBase64,
                        customStream: localMovie.videoUrl,
                        kurdishTitle: localMovie.title,
                        kurdishOverview: localMovie.description
                    });
                    setLoading(false);
                    hasPreHydrated = true;
                }
            } catch (e) {
                console.warn("Local IndexedDB pre-hydration failed", e);
            }

            // STEP 2: Supabase + TMDB Enrichment
            try {
                if (!location.state?.customData && !hasPreHydrated) {
                    setLoading(true);
                }

                const [supabaseResult, tmdbResult] = await Promise.all([
                    (async () => {
                        const { data, error } = await supabase
                            .from('dubbed_movies')
                            .select('*')
                            .or(`id.eq.${dbId},id.eq.${cleanId}`)
                            .limit(1);
                        
                        if (data && data.length > 0) {
                            return data[0];
                        }
                        return null;
                    })(),

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
                        id: String(supabaseResult.id).startsWith('custom_') ? supabaseResult.id : `custom_${supabaseResult.id}`,
                        poster_path: supabaseResult.imageBase64,
                        backdrop_path: supabaseResult.bannerBase64 || supabaseResult.imageBase64,
                        customStream: supabaseResult.videoUrl,
                        kurdishTitle: supabaseResult.title,
                        kurdishOverview: supabaseResult.description
                    });
                }

                if (tmdbResult && isMounted) {
                    setContent(tmdbResult);
                    setCast(tmdbResult.credits?.cast?.slice(0, 15) || []);
                }

            } catch (err) {
                console.error("Critical loader crash:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadContent();
        const mainEl = document.querySelector('main');
        if (mainEl) {
          mainEl.scrollTo({ top: 0, behavior: 'instant' });
        }

        return () => { 
            isMounted = false; 
            clearTimeout(timeoutId);
        };
    }, [id, language]);

    const displayTitle = (dubbedData?.kurdishTitle || dubbedData?.title || content?.title || content?.name || "Kurdish Dubbed Movie") as string;
    const displayOverview = (dubbedData?.kurdishOverview || dubbedData?.description || content?.overview || ((language === 'ku' || language === 'badini') ? "چیرۆکی ئەم فیلمە دۆبلاژکراوە تاقانەیە بە زمانی شیرینی کوردی لە FLKRD بەردەستە." : "Exclusive Kurdish dubbed cinema experience on FLKRD.")) as string;

    const posterRaw = dubbedData?.poster_path || dubbedData?.imageBase64 || content?.poster_path || '';
    const posterUrl = posterRaw
        ? (posterRaw.startsWith('http') || posterRaw.startsWith('data:') ? posterRaw : `${IMAGE_BASE_URL_POSTER}${posterRaw}`)
        : '/flkrd-icon.webp';

    const backdropRaw = dubbedData?.bannerBase64 || dubbedData?.backdrop_path || content?.backdrop_path || posterRaw;
    const backdropUrl = backdropRaw
        ? (backdropRaw.startsWith('http') || backdropRaw.startsWith('data:') ? backdropRaw : `${IMAGE_BASE_URL}${backdropRaw}`)
        : '/default-poster.svg';

    const handleBack = useCallback(() => {
        if (window.history.length > 2) {
            navigate(-1);
        } else {
            navigate('/dubbed');
        }
    }, [navigate]);

    const handleOpenPlayer = () => {
        setIsPlayerModalOpen(true);
    };

    const handleClosePlayer = () => {
        setIsPlayerModalOpen(false);
        // Pause any video elements created inside the player
        try {
            const elements = document.querySelectorAll('video, audio');
            elements.forEach((el: any) => {
                try {
                    el.pause();
                } catch (e) {}
            });
        } catch (e) {}
    };

    const handleSourceChange = (srcName: string) => {
        const idx = dubbedSources.findIndex(s => s.name === srcName);
        if (idx !== -1) {
            setActiveSourceIndex(idx);
        }
    };

    const handleShare = async () => {
        const shareTitle = dubbedData?.kurdishTitle || dubbedData?.title || displayTitle;
        const shareUrl = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title: shareTitle, url: shareUrl });
            } catch {}
        } else {
            try {
                await navigator.clipboard.writeText(shareUrl);
                addNotification({
                    type: 'success',
                    title: isRtl ? 'بەستەر کۆپیکرا' : 'Link Copied',
                    message: shareTitle
                });
            } catch {
                addNotification({
                    type: 'error',
                    title: 'Error',
                    message: 'Failed to copy link'
                });
            }
        }
    };

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
                title: isRtl ? '🎬 تیکتی تەماشا دروست کرا!' : '🎬 WATCH TICKET CREATED!',
                message: isRtl ? 'هاوڕێکەت بانگهێشت بکە!' : 'Invite your guest to join!'
            });

            const movieState = {
                id: cleanId,
                title: dubbedData?.kurdishTitle || dubbedData?.title || displayTitle,
                poster_path: posterUrl,
                backdrop_path: backdropUrl,
                vote_average: dubbedData?.vote_average || content?.vote_average,
                release_date: dubbedData?.created_at || content?.release_date
            };

            navigate(`/watch/${data.id}`, { state: { ticket: data, movie: movieState } });
        } catch (err: any) {
            console.error('Watch party creation error:', err);
            addNotification({
                type: 'error',
                title: isRtl ? 'هەڵە' : 'Error',
                message: isRtl ? 'نەتوانرا تیکت دروست بکرێت.' : 'Failed to create watch ticket.'
            });
        } finally {
            setIsCreatingTicket(false);
        }
    };

    if (loading && !dubbedData && !content) return <SkeletonDetailPage />;

    const isReady = !!(activeEmbedUrl || dubbedData || content);
    if (!isReady) return <SkeletonDetailPage />;

    return (
        <div className="min-h-screen bg-main-bg text-[var(--text-primary)] overflow-x-hidden pb-52 md:pb-40 transition-colors duration-500" dir={isRtl ? 'rtl' : 'ltr'}>
            {/* Ambient Blurred Backdrop Background */}
            <div className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000 opacity-30 md:opacity-40`}>
                {backdropUrl && (
                    <img 
                        src={backdropUrl} 
                        className="w-full h-full object-cover blur-[100px] scale-125" 
                        alt="" 
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = '/default-poster.svg';
                        }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)]/80 via-[var(--bg-primary)]/90 to-[var(--bg-primary)]"></div>
            </div>

            {/* Top Navigation Bar */}
            <div className="relative z-20 pt-16 md:pt-20 px-4 md:px-12 max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 bg-box-bg/90 backdrop-blur-2xl border border-border-color px-4 py-2.5 rounded-2xl text-main-text hover:bg-[var(--brand-red)] hover:text-white active:scale-95 transition-all font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl"
                    >
                        <ArrowLeft size={16} className={isRtl ? 'rotate-180' : ''} />
                        {isRtl ? 'گەڕانەوە' : 'Back'}
                    </button>

                    <button
                        onClick={() => navigate('/dubbed')}
                        className="flex items-center gap-2 bg-box-bg/90 backdrop-blur-2xl border border-border-color px-4 py-2.5 rounded-2xl text-main-text hover:bg-[var(--brand-red)] hover:text-white active:scale-95 transition-all font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl"
                    >
                        <Film size={15} />
                        {isRtl ? 'فیلمی دۆبلاژکراو' : 'Dubbed Movies'}
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 bg-box-bg/90 backdrop-blur-2xl border border-border-color px-4 py-2.5 rounded-2xl text-main-text hover:bg-[var(--brand-red)] hover:text-white active:scale-95 transition-all font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl"
                    >
                        <Home size={15} />
                        {isRtl ? 'سەرەکی' : 'Home'}
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 bg-box-bg/90 backdrop-blur-2xl border border-border-color px-4 py-2.5 rounded-2xl text-main-text hover:bg-white/20 active:scale-95 transition-all font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl"
                    >
                        <Share2 size={15} />
                        {isRtl ? 'هاوبەشکردن' : 'Share'}
                    </button>
                </div>
            </div>

            {/* Main Cinematic Hero Banner */}
            <div className="relative z-10 px-4 md:px-12 max-w-7xl mx-auto mb-16">
                <div className="flex flex-col lg:flex-row items-center lg:items-end gap-8 lg:gap-14 pt-4 pb-8">
                    {/* Glowing Movie Poster */}
                    <div className="w-48 sm:w-64 lg:w-80 flex-shrink-0 aspect-[2/3] rounded-[2.5rem] overflow-hidden border-2 border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative group bg-neutral-950">
                        <img 
                            src={posterUrl} 
                            alt={displayTitle} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = '/flkrd-icon.webp';
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    </div>

                    {/* Movie Info & Primary Actions */}
                    <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-start gap-4">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                            <div 
                                className="text-white text-[10px] md:text-[11px] font-black px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg uppercase tracking-wider" 
                                style={{ backgroundColor: accentColor || 'var(--brand-red)' }}
                            >
                                <Mic2 size={13} />
                                {dubbedData?.isSubtitled ? (isRtl ? "ژێرنوسی کوردی" : "Kurdish Subtitled") : (isRtl ? "دۆبلاژکراوی کوردی" : "Kurdish Dubbed")}
                            </div>

                            <div className="bg-white/10 backdrop-blur-md border border-white/10 text-white text-[10px] md:text-[11px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                                ULTRA HD 4K
                            </div>

                            {dubbedData?.level && (
                                <div className="bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-[10px] md:text-[11px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                                    {dubbedData.level} RANK
                                </div>
                            )}

                            {content?.vote_average && (
                                <div className="bg-box-bg border border-border-color text-yellow-500 text-[10px] md:text-[11px] font-black px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                                    <Star size={13} fill="currentColor" />
                                    {content.vote_average.toFixed(1)}
                                </div>
                            )}

                            <div className="bg-box-bg border border-border-color text-sec-text text-[10px] md:text-[11px] font-black px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                                <Calendar size={13} />
                                {dubbedData?.created_at ? new Date(dubbedData.created_at).getFullYear() : (content?.release_date?.split('-')[0] || '2026')}
                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl sm:text-5xl lg:text-7xl font-[1000] tracking-tight leading-none text-main-text drop-shadow-2xl">
                            {displayTitle}
                        </h1>

                        {/* Action Buttons Row */}
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-4 w-full">
                            {/* Primary Play Button */}
                            <button
                                onClick={handleOpenPlayer}
                                className="flex-1 sm:flex-initial min-w-[200px] flex items-center justify-center gap-3 px-8 py-4 bg-[var(--brand-red)] hover:bg-red-700 text-white font-[1000] text-sm md:text-base rounded-2xl shadow-[0_10px_35px_rgba(229,9,20,0.5)] active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
                            >
                                <Play fill="currentColor" size={20} />
                                <span>{isRtl ? 'سەیرکردنی فیلم' : 'Play Movie'}</span>
                            </button>

                            {/* Co-Watch Party Button */}
                            <button
                                onClick={handleCreateWatchParty}
                                disabled={isCreatingTicket}
                                className="flex items-center justify-center gap-2 px-5 py-4 bg-orange-600/15 hover:bg-orange-600/25 border border-orange-500/40 text-orange-400 font-bold text-xs md:text-sm rounded-2xl backdrop-blur-md active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
                            >
                                {isCreatingTicket ? (
                                    <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-orange-400 animate-spin" />
                                ) : (
                                    <Sparkles size={16} className="text-orange-400 animate-pulse" />
                                )}
                                <span>{isRtl ? 'تەماشاکردنی هاوبەش' : 'CO-WATCH'}</span>
                            </button>

                            {/* My List Button */}
                            <button
                                onClick={handleToggleMyList}
                                className={`flex items-center justify-center gap-2 px-5 py-4 rounded-2xl text-xs md:text-sm font-bold border backdrop-blur-md active:scale-95 transition-all cursor-pointer ${
                                    isAdded 
                                        ? 'bg-[var(--brand-red)] text-white border-[var(--brand-red)]' 
                                        : 'bg-box-bg/80 hover:bg-box-bg border-border-color text-main-text'
                                }`}
                            >
                                {isAdded ? <Check size={16} /> : <Plus size={16} />}
                                <span>{isAdded ? (isRtl ? 'لە لیستەکەم دایە' : 'In My List') : (isRtl ? 'لیستی من' : 'My List')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Synopsis / Story Details */}
            <div className="relative z-10 px-4 md:px-12 max-w-7xl mx-auto mb-16">
                <div className="bg-box-bg/90 backdrop-blur-2xl border border-border-color p-6 md:p-10 rounded-3xl md:rounded-[3rem] shadow-2xl">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-color">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-5 rounded-full" style={{ backgroundColor: accentColor || 'var(--brand-red)' }} />
                            <h3 className="text-xs md:text-sm font-black uppercase tracking-[0.3em] text-sec-text">
                                {isRtl ? 'چیرۆکی فیلم' : 'SYNOPSIS'}
                            </h3>
                        </div>
                        <div className="flex items-center gap-4 text-sec-text text-xs font-bold">
                            <div className="flex items-center gap-1.5">
                                <Monitor size={14} style={{ color: accentColor || 'var(--brand-red)' }} />
                                <span>{dubbedSources.length > 0 ? `${dubbedSources.length} Servers Online` : 'Direct Node'}</span>
                            </div>
                        </div>
                    </div>

                    <p className="text-main-text text-base md:text-xl leading-relaxed font-bold opacity-90 text-right">
                        {displayOverview}
                    </p>
                </div>
            </div>

            {/* Actors / Cast Grid */}
            {cast.length > 0 && (
                <div className="relative z-10 px-4 md:px-12 max-w-7xl mx-auto mb-16">
                    <div className="flex items-center gap-4 mb-8">
                        <h2 className="text-2xl md:text-4xl font-[1000] uppercase tracking-tight text-main-text">
                            {isRtl ? 'ئەکتەرەکان' : 'CAST & CREW'}
                        </h2>
                        <div className="h-[1px] flex-grow bg-border-color rounded-full"></div>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-6">
                        {cast.map(person => (
                            <div 
                                key={person.id} 
                                className="group cursor-pointer flex flex-col items-center text-center" 
                                onClick={() => setSelectedActorId(person.id)}
                            >
                                <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden mb-2.5 border border-border-color shadow-lg bg-neutral-900">
                                    <img 
                                        src={person.profile_path ? `${IMAGE_BASE_URL_PROFILE}${person.profile_path}` : '/flkrd-icon.webp'} 
                                        alt={person.name} 
                                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500" 
                                        onError={(e) => { (e.target as HTMLImageElement).src = '/flkrd-icon.webp'; }}
                                        loading="lazy"
                                    />
                                </div>
                                <p className="text-[11px] md:text-xs font-black uppercase truncate w-full text-main-text">{person.name}</p>
                                <p className="text-[9px] font-bold text-sec-text truncate w-full">{person.character || ''}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Comment Section */}
            <div className="relative z-10 px-4 md:px-12 max-w-7xl mx-auto">
                <CommentSection movieId={id!} mediaType="dubbed" />
            </div>

            {/* Fullscreen Player Modal */}
            <AnimatePresence>
                {isPlayerModalOpen && (
                    <Portal id="dubbed-player-portal">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 w-screen h-dvh bg-black z-[999999] overflow-hidden flex items-center justify-center"
                            dir="ltr"
                        >
                            <UniversalVideoPlayer
                                key={`dubbed-player-modal-${id}-${activeSourceIndex}`}
                                src={activeEmbedUrl}
                                sources={dubbedSources}
                                activeSource={dubbedSources[activeSourceIndex]?.name || 'FLKRD DUBBED 1'}
                                setActiveSource={handleSourceChange}
                                accentColor={accentColor}
                                language={language}
                                startFullscreen={true}
                                onClose={handleClosePlayer}
                                onProgress={(data) => {
                                    if (data?.currentTime && data?.duration) {
                                        updateProgress(data.currentTime, data.duration);
                                    }
                                }}
                                tmdbId={(dubbedData?.tmdb_id && /^\d+$/.test(String(dubbedData.tmdb_id))) 
                                    ? String(dubbedData.tmdb_id) 
                                    : (/^\d+$/.test(String(content?.tmdb_id || content?.id || '')) ? String(content?.tmdb_id || content?.id) : undefined)}
                                imdbId={dubbedData?.imdb_id || content?.imdb_id || undefined}
                                contentType="dubbed"
                                title={dubbedData?.kurdishTitle || dubbedData?.title || displayTitle}
                            />
                        </motion.div>
                    </Portal>
                )}
            </AnimatePresence>

            {/* Actor Detail Dossier Modal */}
            <AnimatePresence>
                {selectedActorId && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="fixed inset-0 bg-black/85 backdrop-blur-xl z-[99999] flex items-center justify-center p-4 md:p-10"
                        onClick={() => setSelectedActorId(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-4xl bg-card-bg border border-border-color rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[85vh] md:max-h-[90vh] flex flex-col md:flex-row gap-6 md:gap-10 p-6 md:p-10 text-start"
                            dir={isRtl ? 'rtl' : 'ltr'}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button 
                                onClick={() => setSelectedActorId(null)}
                                className={`absolute top-6 ${isRtl ? 'left-6' : 'right-6'} p-3 bg-box-bg border border-border-color hover:bg-red-600 rounded-2xl text-main-text hover:text-white transition-all z-50`}
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
                                        <div className="w-48 md:w-full aspect-[3/4] rounded-2xl overflow-hidden border border-border-color shadow-2xl relative bg-box-bg mx-auto">
                                            <img 
                                                src={actorDetails.profile_path ? `${IMAGE_BASE_URL_PROFILE}${actorDetails.profile_path}` : '/flkrd-icon.webp'} 
                                                alt={actorDetails.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => { (e.target as HTMLImageElement).src = '/flkrd-icon.webp'; }}
                                            />
                                        </div>
                                        
                                        <div className="space-y-4 px-2 text-center md:text-start">
                                            <h3 className="text-2xl md:text-3xl font-[1000] uppercase italic tracking-tighter text-main-text leading-tight">
                                                {actorDetails.name}
                                            </h3>
                                            {actorDetails.birthday && (
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[8px] text-sec-text font-black uppercase tracking-widest">Born</span>
                                                    <span className="text-xs font-bold text-sec-text">
                                                        {actorDetails.birthday} {actorDetails.place_of_birth ? `in ${actorDetails.place_of_birth}` : ''}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Biography & Filmography */}
                                    <div className="flex-1 flex flex-col gap-6 md:gap-8 md:overflow-y-auto md:max-h-[60vh] scrollbar-hide pr-2 text-start">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-4 bg-brand rounded-full" />
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-sec-text italic">{isRtl ? 'ژیاننامە' : 'Biography'}</h4>
                                            </div>
                                            <p className="text-sec-text text-sm leading-relaxed font-bold opacity-95">
                                                {actorDetails.biography || (isRtl ? "زانیاری لەسەر ئەم ئەکتەرە بەردەست نییە." : "No biography compiled for this actor.")}
                                            </p>
                                        </div>

                                        {actorDetails.combined_credits?.cast?.length > 0 && (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1.5 h-4 bg-brand rounded-full" />
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-sec-text italic">{isRtl ? 'کارە دیارەکان' : 'Featured Works'}</h4>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" dir="ltr">
                                                    {actorDetails.combined_credits.cast
                                                        .filter((c: any) => c.poster_path)
                                                        .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
                                                        .slice(0, 6)
                                                        .map((movie: any) => (
                                                            <div 
                                                                key={movie.id} 
                                                                className="group/work cursor-pointer bg-box-bg border border-border-color p-2 rounded-2xl flex flex-col gap-1.5 hover:bg-brand/10 hover:border-brand/20 transition-all"
                                                                onClick={() => {
                                                                    setSelectedActorId(null);
                                                                    navigate(`/details/${getMediaType(movie)}/${movie.id}`);
                                                                }}
                                                            >
                                                                <div className="aspect-[2/3] rounded-xl overflow-hidden relative border border-border-color">
                                                                    <img 
                                                                        src={`${IMAGE_BASE_URL_POSTER}${movie.poster_path}`} 
                                                                        alt={movie.title || movie.name}
                                                                        className="w-full h-full object-cover group-hover/work:scale-105 transition-transform duration-500" 
                                                                        loading="lazy"
                                                                    />
                                                                </div>
                                                                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-tight truncate text-main-text block text-center mt-1">
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

export default DubbedDetailPage;