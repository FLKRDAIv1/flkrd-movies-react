
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic2, Play, Zap, Share2, X, Send,
    Link as LinkIcon, Sparkles,
    Activity, Info, Star, ChevronRight, Share, Copy,
    Trash2, ListVideo, PlusCircle, Edit2, RefreshCw, TrendingUp, Search, ShieldAlert
} from 'lucide-react';
import { Content } from '../types';
import { fetchData } from '../services/tmdbService';
import { API_KEY, IMAGE_BASE_URL_POSTER, IMAGE_BASE_URL, API_BASE_URL } from '../constants';
import Spinner from '../components/Spinner';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import { bannedService } from '../services/bannedService';
import { supabase } from '../utils/supabaseClient';
import { compressImage } from '../utils/imageUtils';
import { db, initDB } from '../utils/db';


// Removed MeshGradientBackground to allow global PremiumBackground to handle theme rendering.

const LazyBase64Image: React.FC<{ src: string, className?: string, alt?: string, placeholder?: string }> = ({ src, className, alt, placeholder }) => {
    const [currentSrc, setCurrentSrc] = useState(placeholder || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
    const [isLoaded, setIsLoaded] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setCurrentSrc(src);
                observer.disconnect();
            }
        }, { threshold: 0.1 });

        if (imgRef.current) observer.observe(imgRef.current);
        return () => observer.disconnect();
    }, [src]);

    return (
        <img
            ref={imgRef}
            src={currentSrc}
            className={`${className} transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            alt={alt}
            onLoad={() => setIsLoaded(true)}
            onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/flkrd/cdn/main/default-poster.webp';
            }}
        />
    );
};

const AtmosphereParticles: React.FC<{ active?: boolean }> = ({ active = true }) => {
    if (!active) return null;
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ 
                        x: Math.random() * 100 + "%", 
                        y: Math.random() * 100 + "%",
                        opacity: 0 
                    }}
                    animate={{ 
                        y: [null, Math.random() * 100 + "%"],
                        opacity: [0, 0.4, 0]
                    }}
                    transition={{
                        duration: Math.random() * 20 + 20,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute w-1 h-1 bg-white/20 rounded-full blur-[1px]"
                />
            ))}
        </div>
    );
};

const BreathingLogo: React.FC = () => (
    <div className="relative">
        <motion.div
            animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.8, 1, 0.8]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="w-40 h-40 bg-black/40 backdrop-blur-2xl border border-white/5 rounded-[3.5rem] flex items-center justify-center relative overflow-hidden shadow-[0_0_150px_rgba(var(--brand-red-rgb),0.1)]"
        >
            <motion.div 
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 8, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-tr from-brand/20 via-transparent to-brand/10"
            />
            <span className="text-[10rem] font-black italic text-brand leading-none drop-shadow-[0_0_40px_rgba(var(--brand-red-rgb),0.8)] select-none">F</span>
        </motion.div>

        {/* Cinematic Aura Glows */}
        <motion.div
            animate={{ opacity: [0.05, 0.15, 0.05], scale: [1, 1.2, 1] }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute -inset-24 bg-brand/10 blur-[100px] rounded-full -z-10"
        />
        <motion.div
            animate={{ opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -inset-4 border border-white/5 rounded-[4rem]"
        />
    </div>
);

const CinematicLoader: React.FC<{ progress: number, status: string, performanceMode?: boolean }> = ({ progress, status, performanceMode }) => {
    const [displayStatus, setDisplayStatus] = React.useState("ئامادەکردنی باشترین کوالیتی...");
    
    React.useEffect(() => {
        if (status.toLowerCase().includes('initial')) setDisplayStatus("بەخێربێن بۆ جیهانی FLKRD");
        else if (status.toLowerCase().includes('sync')) setDisplayStatus("هاوکاتکردنی چیرۆکەکان...");
        else if (status.toLowerCase().includes('query') || status.toLowerCase().includes('fetch')) setDisplayStatus("گەڕان بەدوای فیلمە دڵخوازەکانتدا...");
        else if (status.toLowerCase().includes('load')) setDisplayStatus("ئامادەکاری کۆتایی...");
        else setDisplayStatus(status);
    }, [status]);

    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02, filter: performanceMode ? 'none' : 'blur(60px)' }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[1000] bg-[#030303] flex flex-col items-center justify-center overflow-hidden"
        >
            <AtmosphereParticles active={!performanceMode} />
            
            {/* Soft Ambient Glows */}
            <div className="absolute top-0 inset-x-0 h-full bg-gradient-to-b from-brand/[0.03] to-transparent pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center gap-24 max-w-md w-full px-12">
                <BreathingLogo />

                <div className="w-full flex flex-col items-center gap-12">
                    <div className="flex flex-col items-center text-center gap-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 2 }}
                            className="flex flex-col gap-2 items-center"
                        >
                            <span className="text-[10px] font-sans font-black text-brand/40 tracking-[0.8em] uppercase select-none">
                                PREMIERE EXPERIENCE
                            </span>
                            <p className="text-sm font-sans font-black text-white/90 tracking-[0.1em] opacity-80" dir="rtl">
                                بە کوردی کردنی چیرۆکەکانی جیهان
                            </p>
                        </motion.div>
                        
                        <div className="h-10 flex items-center justify-center">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={displayStatus}
                                    initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
                                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
                                    transition={{ duration: 1.2, ease: "easeOut" }}
                                    className="text-lg font-sans text-white/60 font-medium"
                                    dir="rtl"
                                >
                                    {displayStatus}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* The Silk Line - Elegant Progress */}
                    <div className="flex flex-col items-center gap-4 w-full">
                        <div className="w-48 h-[1px] bg-white/[0.03] relative overflow-hidden rounded-full">
                            <motion.div
                                transition={{ 
                                    duration: 4, 
                                    repeat: Infinity, 
                                    ease: "easeInOut" 
                                }}
                                className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-brand/40 to-transparent shadow-[0_0_15px_rgba(var(--brand-red-rgb),0.3)]"
                            />
                        </div>
                        <motion.span 
                            animate={{ opacity: [0.1, 0.3, 0.1] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="text-[9px] text-white/20 font-sans tracking-[0.5em] font-black uppercase select-none"
                        >
                            FLKRD CINEMATIC
                        </motion.span>
                    </div>
                </div>
            </div>
            
            {/* Minimalist Studio Credit */}
            <div className="absolute bottom-12 flex flex-col items-center opacity-10">
                <span className="text-[8px] font-sans font-black tracking-[1em] text-white uppercase mb-2">PRODUCED BY</span>
                <span className="text-[10px] font-sans font-black tracking-[0.3em] text-white uppercase">ZANA BARZANI</span>
            </div>
        </motion.div>
    );
};







const DubbedMoviesPage: React.FC = () => {
    const [dubbedContent, setDubbedContent] = useState<any[]>([]);

    // Quantum Initial Hydration
    useEffect(() => {
        const hydrate = async () => {
            try {
                const cached = await db.getMovies();
                if (cached && cached.length > 0) {
                    setDubbedContent(cached);
                }
            } catch (e) {
                console.warn("Async hydration failed", e);
            }
        };
        hydrate();
    }, []);
    const [loading, setLoading] = useState(!sessionStorage.getItem('zana_protocol_established'));
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingStatus, setLoadingStatus] = useState('Initializing Source');
    const [searchQuery, setSearchQuery] = useState('');
    const [shareTarget, setShareTarget] = useState<any>(null);

    const [scrollPosition, setScrollPosition] = useState(0);

    // Admin State - Pulled from Global UI Context
    const { accentColor, isPerformanceMode, isAdmin, setIsAdmin } = useUI();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');

    // Upload Form State
    const [uploadData, setUploadData] = useState({
        title: '',
        description: '',
        videoUrl: '',
        imageBase64: '',
        bannerBase64: '',
        level: 'NEW',
        imdb_id: '',
        tmdb_id: ''
    });
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStep, setUploadStep] = useState('');
    const [activeAdminTab, setActiveAdminTab] = useState<'upload' | 'archive' | 'banned'>('upload');
    const [adminSearchQuery, setAdminSearchQuery] = useState('');
    const [movieToDelete, setMovieToDelete] = useState<string | null>(null);

    // TMDB Autocomplete Engine States and Handlers
    const [tmdbSearchQuery, setTmdbSearchQuery] = useState('');
    const [tmdbSearchResults, setTmdbSearchResults] = useState<any[]>([]);
    const [isTmdbSearching, setIsTmdbSearching] = useState(false);

    const fetchFromTmdb = async (endpoint: string) => {
        const primaryUrl = API_BASE_URL.startsWith('http') 
            ? `${API_BASE_URL}${endpoint}` 
            : `${window.location.origin}${API_BASE_URL}${endpoint}`;
        
        try {
            const res = await fetch(primaryUrl);
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn("Primary TMDB fetch failed, trying direct endpoint:", e);
        }
        
        const fallbackUrl = `https://api.themoviedb.org/3${endpoint}`;
        const res = await fetch(fallbackUrl);
        if (!res.ok) throw new Error(`TMDB call failed: ${res.statusText}`);
        return await res.json();
    };

    const searchTmdbMovies = async (query: string) => {
        if (!query.trim()) return;
        setIsTmdbSearching(true);
        try {
            const data = await fetchFromTmdb(`/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US`);
            setTmdbSearchResults(data.results || []);
        } catch (err: any) {
            console.error("TMDB search failed:", err);
            addNotification({ type: 'error', title: 'TMDB Search Failed', message: err.message || 'Could not connect to TMDB services.' });
        } finally {
            setIsTmdbSearching(false);
        }
    };

    const handleSelectTmdbMovie = async (movie: any, target: 'upload' | 'edit') => {
        try {
            addNotification({ type: 'info', title: 'Fetching Data', message: 'Pulling details and IDs from TMDB...' });
            
            const [details, extIds] = await Promise.all([
                fetchFromTmdb(`/movie/${movie.id}?api_key=${API_KEY}&language=en-US`),
                fetchFromTmdb(`/movie/${movie.id}/external_ids?api_key=${API_KEY}`)
            ]);

            const title = details.title || '';
            const description = details.overview || '';
            const verticalPoster = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : '';
            const horizontalBanner = details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : '';
            const imdbId = extIds.imdb_id || '';
            const tmdbId = String(details.id) || '';

            if (target === 'upload') {
                setUploadData(prev => ({
                    ...prev,
                    title: `فیلمی دۆبلاژکراوی کوردی ${title}`,
                    description: description,
                    imageBase64: verticalPoster,
                    bannerBase64: horizontalBanner,
                    imdb_id: imdbId,
                    tmdb_id: tmdbId
                }));
            } else {
                setEditData(prev => ({
                    ...prev,
                    title: `فیلمی دۆبلاژکراوی کوردی ${title}`,
                    description: description,
                    imageBase64: verticalPoster,
                    bannerBase64: horizontalBanner,
                    imdb_id: imdbId,
                    tmdb_id: tmdbId
                }));
            }

            setTmdbSearchQuery('');
            setTmdbSearchResults([]);
            addNotification({ type: 'success', title: 'Fields Populated', message: `Imported "${title}" successfully!` });
        } catch (err: any) {
            console.error("Failed to populate TMDB fields:", err);
            addNotification({ type: 'error', title: 'Import Failed', message: err.message || 'Could not fetch detailed metadata.' });
        }
    };

    // Edit State Handlers
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [nodeToEdit, setNodeToEdit] = useState<any | null>(null);
    const [editData, setEditData] = useState({ title: '', description: '', videoUrl: '', imageBase64: '', bannerBase64: '', level: 'NEW', imdb_id: '', tmdb_id: '' });
    const [isUpdating, setIsUpdating] = useState(false);
    const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

    // Advanced Sorting & Filtering State
    const [activeFilter, setActiveFilter] = useState('ALL');

    const navigate = useNavigate();
    const { t, language } = useTranslation();
    const { addNotification } = useNotification();
    const [hasNewMovies, setHasNewMovies] = useState(false);
    const [isLive, setIsLive] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const observerTarget = useRef<HTMLDivElement>(null);
    const PAGE_SIZE = 24;


    useEffect(() => {
        const handleScroll = () => setScrollPosition(window.scrollY);
        window.addEventListener('scroll', handleScroll);
        const loadDubbedArchive = async () => {
            const isEstablished = sessionStorage.getItem('zana_protocol_established');
            let resolveLoader: () => void;
            const loaderPromise = new Promise<void>(res => { 
                resolveLoader = res;
                // Guarded Timeout (Zana Protocol Integrity)
                setTimeout(() => {
                    setLoadingStatus('PROTOCOL TIMEOUT: RECOVERING LOCAL NODES...');
                    res();
                }, 6000);
            });

            // Ensure loader statuses are dynamic
            const setDynamicStatus = async (msg: string, delay: number) => {
                if (!isEstablished) {
                    setLoadingStatus(msg);
                    await new Promise(r => setTimeout(r, delay));
                }
            };

            await setDynamicStatus('HANDSHAKING WITH ZANA ENGINE...', 400);

            // 1. Quantum Cache Recovery (Async)
            const recoverCache = async () => {
                try {
                    await setDynamicStatus('CHECKING LOCAL INDEXED DB LAKES...', 300);
                    const cachedMovies = await db.getMovies();
                    if (cachedMovies && cachedMovies.length > 0) {
                        setDubbedContent(cachedMovies);
                        await setDynamicStatus(`RECOVERED ${cachedMovies.length} NODES FROM CACHE...`, 200);
                    }
                } catch (e) {
                    console.warn("Quantum cache recovery failed", e);
                }
            };

            await recoverCache(); // Try to get cache first to prevent empty blink

            const backgroundSync = async () => {
                let customMovies = [];
                try {
                    await setDynamicStatus('QUERYING ZANA POSTGRES...', 400);
                    
                    const { data, error } = await supabase
                        .from('dubbed_movies')
                        .select('*')
                        .order('created_at', { ascending: false })
                        .range(0, PAGE_SIZE - 1);

                    if (error) throw error;
                    
                    if (data) {
                        await setDynamicStatus('DATA STREAM ALIGNED...', 300);
                        customMovies = data;
                        setHasMore(data.length === PAGE_SIZE);
                    }
                } catch (e) {
                    console.error("NETWORK SIGNAL INTERRUPTED:", e);
                    const cached = await db.getMovies();
                    if (cached && cached.length > 0) {
                        setDubbedContent(cached);
                        setHasMore(false);
                        await setDynamicStatus('OFFLINE ARCHIVE RECOVERED. SIGNAL TUNING...', 400);
                        return;
                    }
                } finally {
                    if (customMovies.length > 0) {
                        await setDynamicStatus('APPLYING TAG PRIORITY SORTING ALGORITHMS...', 500);
                        const bannedIds = await bannedService.fetchBannedList();
                        const formattedCustom = customMovies
                            .filter((m: any) => !bannedIds.has(String(m.id)))
                            .map((movie: any) => ({
                            ...movie,
                            id: `custom_${movie.id}`,
                            poster_path: movie.imageBase64,
                            backdrop_path: movie.bannerBase64 || movie.imageBase64,
                            title: movie.title,
                            kurdishTitle: movie.title,
                            overview: movie.description,
                            kurdishOverview: movie.description,
                            customStream: movie.videoUrl,
                            media_type: 'dubbed',
                            level: movie.level || 'KING'
                        }));

                        formattedCustom.sort((a, b) => {
                            const dateA = new Date(a.created_at || 0).getTime();
                            const dateB = new Date(b.created_at || 0).getTime();
                            if (dateA !== dateB) return dateB - dateA;
                            const numIdA = Number(String(a.id).replace('custom_', ''));
                            const numIdB = Number(String(b.id).replace('custom_', ''));
                            return numIdB - numIdA;
                        });

                        setDubbedContent(formattedCustom);
                        await db.saveMovies(formattedCustom);
                        await setDynamicStatus(`SYNC COMPLETE. ${formattedCustom.length} NODES INITIALIZED.`, 200);
                    }
                    if (resolveLoader) resolveLoader();
                }
            };

            backgroundSync();

            if (!isEstablished) {
                // Wait for the actual sync to finish (real data driven loader)
                await loaderPromise;

                setLoadingStatus('DATA TRANSFER SUCCESSFUL. INITIALIZING HUB...');
                setTimeout(() => {
                    setLoading(false);
                    sessionStorage.setItem('zana_protocol_established', 'true');
                }, 400);
            } else {
                setLoading(false);
            }
        };

        const mainTimeoutId = setTimeout(() => {
            setLoading(false);
            setLoadingStatus('PROTOCOL READY (FALLBACK)');
        }, 15000); // 15s absolute fallback

        loadDubbedArchive();

        // --- REAL-TIME SUBSCRIPTION ---
        const channel = supabase
            .channel('public:dubbed_movies')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dubbed_movies' }, async (payload) => {
                console.log('Zana Engine Real-time Signal:', payload.eventType);
                
                // For heavy changes, trigger a silent re-sync to ensure total grid integrity
                if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
                    setHasNewMovies(true);
                    // Silently refresh the local list without showing a loader
                    const { data } = await supabase.from('dubbed_movies').select('*').order('created_at', { ascending: false });
                    if (data) {
                        const bannedIds = await bannedService.fetchBannedList();
                        const formatted = data
                            .filter((movie: any) => !bannedIds.has(String(movie.id)))
                            .map((movie: any) => ({
                            ...movie,
                            id: `custom_${movie.id}`,
                            poster_path: movie.imageBase64,
                            backdrop_path: movie.bannerBase64 || movie.imageBase64,
                            title: movie.title,
                            kurdishTitle: movie.title,
                            overview: movie.description,
                            kurdishOverview: movie.description,
                            customStream: movie.videoUrl,
                            media_type: 'dubbed',
                            level: movie.level || 'KING'
                        }));

                        // ✅ Neural Date Alignment: Newest First
                        formatted.sort((a, b) => {
                            const dateA = new Date(a.created_at || 0).getTime();
                            const dateB = new Date(b.created_at || 0).getTime();
                            return dateB - dateA;
                        });

                        setDubbedContent([...formatted]);
                        db.saveMovies(formatted).catch(() => {});
                    }
                } else if (payload.eventType === 'UPDATE') {
                    setDubbedContent(prev => {
                        const next = prev.map(m => String(m.id) === `custom_${payload.new.id}` ? {
                            ...m,
                            ...payload.new,
                            poster_path: (payload.new as any).imageBase64,
                            backdrop_path: (payload.new as any).bannerBase64 || (payload.new as any).imageBase64,
                            title: (payload.new as any).title,
                            kurdishTitle: (payload.new as any).title,
                            overview: (payload.new as any).description,
                            kurdishOverview: (payload.new as any).description,
                        } : m);
                        db.saveMovies(next).catch(() => {});
                        return next;
                    });
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setIsLive(true);
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    setIsLive(false);
                    // Attempt to re-sync if connection is lost
                    setTimeout(() => channel.subscribe(), 5000);
                }
            });

        // --- BAN LIST LISTENER ---
        const handleBanUpdate = async () => {
            const bannedIds = await bannedService.fetchBannedList();
            setDubbedContent(prev => prev.filter(m => !bannedIds.has(String(m.id).replace('custom_', ''))));
        };
        window.addEventListener('banned-list-updated', handleBanUpdate);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('banned-list-updated', handleBanUpdate);
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchMoreMovies = async () => {
        if (isFetchingMore || !hasMore) return;

        setIsFetchingMore(true);
        const nextPage = page + 1;
        const from = nextPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        try {
            const { data, error } = await supabase
                .from('dubbed_movies')
                .select('*')
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            if (data && data.length > 0) {
                const bannedIds = await bannedService.fetchBannedList();
                const formatted = data
                    .filter((m: any) => !bannedIds.has(String(m.id)))
                    .map((movie: any) => ({
                    ...movie,
                    id: `custom_${movie.id}`,
                    poster_path: movie.imageBase64,
                    backdrop_path: movie.bannerBase64 || movie.imageBase64,
                    title: movie.title,
                    kurdishTitle: movie.title,
                    overview: movie.description,
                    kurdishOverview: movie.description,
                    customStream: movie.videoUrl,
                    media_type: 'dubbed',
                    level: movie.level || 'KING'
                }));

                setDubbedContent(prev => {
                    const next = [...prev, ...formatted];
                    db.saveMovies(next).catch(() => {});
                    return next;
                });
                setPage(nextPage);
                setHasMore(data.length === PAGE_SIZE);
            } else {
                setHasMore(false);
            }
        } catch (e) {
            console.error("Pagination error:", e);
            setHasMore(false);
        } finally {
            setIsFetchingMore(false);
        }
    };

    // Intersection Observer for Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isFetchingMore) {
                    fetchMoreMovies();
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore, isFetchingMore, page]);


    const [isForceSyncing, setIsForceSyncing] = useState(false);
    const [bannedItems, setBannedItems] = useState<any[]>([]);
    const [isLoadingBanned, setIsLoadingBanned] = useState(false);

    const forceSync = async () => {
        setIsForceSyncing(true);
        addNotification({ type: 'info', title: 'Network Call', message: 'Re-syncing catalog from Zana Servers directly...' });

        try {
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Operation timeout (12s limit)')), 12000)
            );

            const fetchPromise = (async () => {
                // Fetch first 40 nodes on force sync for better coverage
                const { data, error } = await supabase
                    .from('dubbed_movies')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .range(0, 39);

                if (error) throw error;
                return data;
            })();

            const data = await Promise.race([fetchPromise, timeoutPromise]) as any[];

            if (data && data.length > 0) {
                const bannedIds = await bannedService.fetchBannedList();
                const formattedCustom = data
                    .filter((m: any) => !bannedIds.has(String(m.id)))
                    .map((movie: any) => ({
                    ...movie,
                    id: `custom_${movie.id}`,
                    poster_path: movie.imageBase64,
                    backdrop_path: movie.bannerBase64 || movie.imageBase64,
                    title: movie.title,
                    kurdishTitle: movie.title,
                    overview: movie.description,
                    kurdishOverview: movie.description,
                    customStream: movie.videoUrl,
                    media_type: 'dubbed',
                    level: movie.level || 'KING'
                }));

                formattedCustom.sort((a, b) => {
                    const dateA = new Date(a.created_at || 0).getTime();
                    const dateB = new Date(b.created_at || 0).getTime();
                    return dateB - dateA;
                });

                setDubbedContent([...formattedCustom]);
                await db.saveMovies(formattedCustom);
                
                // RESET PAGINATION ON FORCE SYNC
                setPage(0);
                setHasMore(data.length === 40); // Since forceSync fetches 40
                
                addNotification({ 
                    type: 'success', 
                    title: 'Sync Integrity Established', 
                    message: `Grid synced with ${formattedCustom.length} active nodes.` 
                });
            } else if (data && data.length === 0) {
                throw new Error('Server returned empty set');
            }
        } catch (e: any) {
            console.error("Force sync failed", e);
            // Check if we have cached data before showing a hard error
            const cached = await db.getMovies();
            if (cached && cached.length > 0) {
                setDubbedContent([...cached]);
                addNotification({
                    type: 'info',
                    title: 'Offline Archive Loaded',
                    message: 'Main connection delayed. Viewing local archive.'
                });
            } else {
                addNotification({ 
                    type: 'error', 
                    title: 'Sync Interrupted', 
                    message: 'Could not reach Zana Servers. Please check your connection.' 
                });
            }
        } finally {
            setIsForceSyncing(false);
        }
    };

    // Latest Movie Banner Carousel Logic - Truly Newer First (Top 10)
    const heroMovies = dubbedContent.slice(0, 10);
    
    const handleNextHero = () => {
        setCurrentHeroIndex((prev) => (prev + 1) % heroMovies.length);
    };

    const handlePrevHero = () => {
        setCurrentHeroIndex((prev) => (prev - 1 + heroMovies.length) % heroMovies.length);
    };
    useEffect(() => {
        if (heroMovies.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentHeroIndex((prev) => (prev + 1) % heroMovies.length);
        }, 8000); // 8-second rotation
        return () => clearInterval(timer);
    }, [heroMovies.length]);
    const handlePlay = (item: any) => {
        navigate(`/dubbed-details/${item.id}`, {
            state: {
                customSource: item.customStream,
                isDubbedMode: true,
                customData: item
            }
        });
    };

    useEffect(() => {
        if (activeAdminTab === 'banned') {
            fetchBannedItems();
        }
    }, [activeAdminTab]);

    const fetchBannedItems = async () => {
        setIsLoadingBanned(true);
        try {
            const list = await bannedService.getBannedRegistry();
            setBannedItems(list || []);
        } catch (err) {
            console.error("Failed to fetch banned registry:", err);
        } finally {
            setIsLoadingBanned(false);
        }
    };

    const handleUnban = async (id: string) => {
        if (!window.confirm("RESTORE NODE? [RECOVERY SIGNAL]")) return;
        try {
            const success = await bannedService.unbanContent(id);
            if (success) {
                addNotification({ type: 'success', title: 'NODE RESTORED', message: 'Content is now visible again.' });
                setBannedItems(prev => prev.filter(item => String(item.tmdb_id || item.id) !== String(id)));
            }
        } catch (err) {
            console.error("Unban failed:", err);
        }
    };

    const handleShare = (e: React.MouseEvent, item: any) => {
        e.stopPropagation();
        setShareTarget(item);
    };

    const handleBan = async (e: React.MouseEvent, movie: any) => {
        e.stopPropagation();
        const cleanId = String(movie.id).replace('custom_', '');
        const mediaType = 'dubbed';

        if (!window.confirm(`TERMINATE NODE ${cleanId}? [GLOBAL BAN]`)) return;

        try {
            // 1. Universal Ban Registry
            const banSignal = await bannedService.banContent(cleanId, mediaType);
            if (!banSignal) throw new Error("Registry reject");

            // 2. Dubbed Physical Deletion
            await supabase.from('dubbed_movies').delete().eq('id', movie.id.replace('custom_', ''));
            
            addNotification({ type: 'success', title: 'NODE PURGED', message: 'Content removed globally.' });
            
            // Refresh local state
            setDubbedContent(prev => prev.filter(m => m.id !== movie.id));
        } catch (err) {
            console.error("Moderation failure:", err);
            addNotification({ type: 'error', title: 'SIGNAL FAILED', message: 'Action rejected.' });
        }
    };

    const copyLink = () => {
        const url = `${window.location.origin}/#/dubbed-details/${shareTarget?.id}`;
        navigator.clipboard.writeText(url);
        addNotification({ type: 'success', title: 'Link Copied', message: 'Link copied successfully.' });
        setShareTarget(null);
    };

    // --- Admin Handlers ---
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (adminEmail === 'flkrdstudio@gmail.com' && adminPassword === 'Zanabarzani1919@') {
            setIsAdmin(true);
            setShowLoginModal(false);
            addNotification({ type: 'success', title: 'Admin Authorized', message: 'Welcome to the Admin Dashboard.' });
        } else {
            addNotification({ type: 'error', title: 'Access Denied', message: 'Invalid credentials.' });
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const compressed = await compressImage(reader.result as string, 800, 1200, 0.7);
                setUploadData({ ...uploadData, imageBase64: compressed });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const compressed = await compressImage(reader.result as string, 1280, 720, 0.7);
                setUploadData({ ...uploadData, bannerBase64: compressed });
            };
            reader.readAsDataURL(file);
        }
    };


    const handleUploadMovie = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadData.title || !uploadData.videoUrl) {
            addNotification({ type: 'error', title: 'Missing Data', message: 'Title and Video Link are required.' });
            return;
        }

        setIsUploading(true);
        setUploadProgress(20);
        setUploadStep('Broadcasting to global node...');

        const finalImage = uploadData.imageBase64 || 'https://raw.githubusercontent.com/flkrd/cdn/main/default-poster.webp';

        try {
            // 1. Insert into Supabase - Real-time will handle the UI update
            const { error } = await supabase
                .from('dubbed_movies')
                .insert([
                    {
                        title: uploadData.title,
                        description: uploadData.description || 'No description provided.',
                        videoUrl: uploadData.videoUrl,
                        imageBase64: finalImage,
                        bannerBase64: uploadData.bannerBase64 || null,
                        level: uploadData.level,
                        imdb_id: uploadData.imdb_id ? uploadData.imdb_id.trim() : null,
                        tmdb_id: uploadData.tmdb_id && !isNaN(Number(uploadData.tmdb_id)) ? parseInt(uploadData.tmdb_id, 10) : null
                    }
                ]);

            if (error) throw error;

            setUploadProgress(80);
            setUploadStep('Syncing to all devices...');

            // 2. Fetch fresh sorted list — newest first
            const { data: freshList } = await supabase
                .from('dubbed_movies')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(40);

            if (freshList) {
                const formattedCustom = freshList.map((movie: any) => ({
                    ...movie,
                    id: `custom_${movie.id}`,
                    poster_path: movie.imageBase64,
                    backdrop_path: movie.bannerBase64 || movie.imageBase64,
                    title: movie.title,
                    kurdishTitle: movie.title,
                    overview: movie.description,
                    kurdishOverview: movie.description,
                    customStream: movie.videoUrl,
                    media_type: 'dubbed',
                    created_at: movie.created_at,
                }));

                // ✅ Instantly update UI — new movie appears at TOP
                setDubbedContent(formattedCustom);

                // ✅ Persist to IndexedDB
                db.saveMovies(formattedCustom).catch(console.error);
            }

            setUploadProgress(100);
            addNotification({ type: 'success', title: '🎬 Movie Added!', message: 'New movie is now live at the top of the list.' });
            setShowUploadModal(false);
            setUploadData({ title: '', description: '', videoUrl: '', imageBase64: '', bannerBase64: '', level: 'NEW', imdb_id: '', tmdb_id: '' });
        } catch (err: any) {
            console.error(err);
            addNotification({ type: 'error', title: 'Sync Error', message: err.message || 'Failed to sync the movie.' });
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleEditMovieClick = (movie: any) => {
        setNodeToEdit(movie);
        setEditData({
            title: movie.title || movie.kurdishTitle || '',
            description: movie.description || movie.kurdishOverview || '',
            videoUrl: movie.customStream || movie.videoUrl || '',
            imageBase64: movie.imageBase64 || movie.poster_path || '',
            bannerBase64: movie.bannerBase64 || movie.backdrop_path || '',
            level: movie.level || 'NEW',
            imdb_id: movie.imdb_id || '',
            tmdb_id: movie.tmdb_id ? String(movie.tmdb_id) : ''
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateMovieSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nodeToEdit) return;
        setIsUpdating(true);

        try {
            // 1. Robust ID Extraction Logic
            const rawIdString = nodeToEdit.id.startsWith('custom_') 
                ? nodeToEdit.id.replace('custom_', '') 
                : nodeToEdit.id;

            // Ensure numeric integrity for Supabase BigInts
            const numericId = !isNaN(Number(rawIdString)) ? Number(rawIdString) : rawIdString;

            console.log(`[ZANA PROTOCOL] Initiating Node Modification: ${numericId}`);

            // 2. Perform Supabase Update
            const { error } = await supabase
                .from('dubbed_movies')
                .update({
                    title: editData.title,
                    description: editData.description,
                    videoUrl: editData.videoUrl,
                    imageBase64: editData.imageBase64,
                    bannerBase64: editData.bannerBase64,
                    level: editData.level,
                    imdb_id: editData.imdb_id ? editData.imdb_id.trim() : null,
                    tmdb_id: editData.tmdb_id && !isNaN(Number(editData.tmdb_id)) ? parseInt(editData.tmdb_id, 10) : null
                })
                .eq('id', numericId);

            if (error) {
                console.error('[DATABASE UPDATE ERROR]', error);
                throw error;
            }

            // 3. Synchronization Protocols 
            // Local persistence handled in the next step to ensure atomic UI updates.

            // 4. Sync Local UI State and IndexedDB Persistence
            setDubbedContent((prev) => {
                const next = prev.map(item => {
                    if (item.id === nodeToEdit.id) {
                        return {
                            ...item,
                            title: editData.title,
                            kurdishTitle: editData.title,
                            overview: editData.description,
                            kurdishOverview: editData.description,
                            customStream: editData.videoUrl,
                            videoUrl: editData.videoUrl,
                            imageBase64: editData.imageBase64,
                            poster_path: editData.imageBase64,
                            bannerBase64: editData.bannerBase64,
                            backdrop_path: editData.bannerBase64,
                            level: editData.level,
                            imdb_id: editData.imdb_id ? editData.imdb_id.trim() : null,
                            tmdb_id: editData.tmdb_id ? parseInt(editData.tmdb_id) : null
                        };
                    }
                    return item;
                });
                db.saveMovies(next).catch(err => console.error('[DB PERSISTENCE FAIL]', err));
                return next;
            });

            addNotification({ 
                type: 'success', 
                title: 'Data Stream Updated', 
                message: 'Movie records have been successfully synchronized.' 
            });

            setIsEditModalOpen(false);
            setNodeToEdit(null);

        } catch (error: any) {
            console.error('[CRITICAL MODIFICATION FAILURE]', error);
            addNotification({ 
                type: 'error', 
                title: 'Operation Failed', 
                message: error.message || 'The data stream refused to update.' 
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteMovie = (id: string) => {
        setMovieToDelete(id);
    };

    const confirmDelete = async () => {
        if (!movieToDelete) return;
        setIsUpdating(true);
        try {
            // 1. Robust ID Extraction
            const rawIdString = movieToDelete.startsWith('custom_') 
                ? movieToDelete.replace('custom_', '') 
                : movieToDelete;

            // Handle potential type mismatch (Supabase BIGINT expects number or string of number)
            const numericId = !isNaN(Number(rawIdString)) ? Number(rawIdString) : rawIdString;

            console.log(`[ZANA PROTOCOL] Attempting high-level termination of Node: ${numericId}`);

            // 2. Database Execution (Try RPC Call first, fallback to direct DELETE if it fails)
            console.log(`[ZANA PROTOCOL] Executing deletion RPC for Node: ${numericId}`);
            let deleteSuccess = false;
            
            try {
                const { error: rpcError } = await supabase
                    .rpc('delete_dubbed_movie', { target_id: numericId });
                
                if (!rpcError) {
                    deleteSuccess = true;
                    console.log('[ZANA PROTOCOL] RPC deletion completed successfully.');
                } else {
                    console.warn('[ZANA PROTOCOL] RPC deletion failed, attempting standard table delete fallback:', rpcError);
                }
            } catch (rpcErr) {
                console.warn('[ZANA PROTOCOL] RPC call threw exception, trying direct table delete:', rpcErr);
            }

            if (!deleteSuccess) {
                console.log(`[ZANA PROTOCOL] Falling back to standard direct deletion on 'dubbed_movies' table for ID: ${numericId}`);
                const { error: directError } = await supabase
                    .from('dubbed_movies')
                    .delete()
                    .eq('id', numericId);
                
                if (directError) {
                    console.error('[SUPABASE DIRECT DELETE ERROR]', directError);
                    throw new Error(`Direct deletion failed: ${directError.message}`);
                }
                console.log('[ZANA PROTOCOL] Direct table deletion completed successfully.');
            }

            // --- Synchronization Protocols ---
            
            try {
                // Redis is decommissioned, syncing via direct Supabase alignment
            } catch (cacheErr) {
                console.warn('[SYNC WARN] State alignment heartbeat failed, but DB delete succeeded.', cacheErr);
            }

            // 4. Update Local UI State and IndexedDB
            setDubbedContent(prev => {
                const next = prev.filter(m => String(m.id) !== String(movieToDelete));
                db.saveMovies(next).catch(err => console.error('[DB RECOVERY ERROR]', err));
                return next;
            });

            // Reset Hero Index and Cleanup Modals
            setCurrentHeroIndex(0);
            setMovieToDelete(null);
            setShowUploadModal(false);

            addNotification({ 
                type: 'success', 
                title: 'Node Terminated', 
                message: 'Target movie has been permanently removed from the Zana Database.' 
            });

        } catch (e: any) {
            console.error('[UI ACTION ERROR]', e);
            addNotification({ 
                type: 'error', 
                title: 'Operation Failed', 
                message: `Failed to remove record. ${e?.message || 'Database connection error.'}` 
            });
        } finally {
            setIsUpdating(false);
        }
    };
    const searchQueryLower = searchQuery.toLowerCase().trim();
    const filteredContent = dubbedContent.filter(movie => {
        if (!searchQueryLower) return true;
        const title = (movie.title || movie.kurdishTitle || '').toLowerCase();
        const overview = (movie.overview || movie.kurdishOverview || '').toLowerCase();
        return title.includes(searchQueryLower) || overview.includes(searchQueryLower);
    });

    const adminSearchQueryLower = adminSearchQuery.toLowerCase().trim();
    const adminFilteredContent = dubbedContent.filter(movie => {
        if (!adminSearchQueryLower) return true;
        const title = (movie.title || movie.kurdishTitle || '').toLowerCase();
        const overview = (movie.overview || movie.kurdishOverview || '').toLowerCase();
        return title.includes(adminSearchQueryLower) || overview.includes(adminSearchQueryLower);
    });

    const featuredMovie = dubbedContent[0];

    return (
        <div className="min-h-screen bg-transparent text-white selection:bg-brand selection:text-white pb-40 overflow-x-hidden">
            <AnimatePresence>
                {loading && <CinematicLoader progress={loadingProgress} status={loadingStatus} performanceMode={isPerformanceMode} />}
            </AnimatePresence>

            {/* Clean Floating Header - no clutter */}
            <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none" />

            {/* iOS 26 Cinematic Hero Carousel */}
            <div className="relative h-[85vh] md:h-[95vh] w-full overflow-hidden">
                <AnimatePresence mode="wait">
                    {heroMovies.length > 0 && (
                        <motion.div
                            key={heroMovies[currentHeroIndex]?.id || currentHeroIndex}
                            initial={{ opacity: 0, scale: 1.05, filter: 'blur(20px)' }}
                            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, scale: 0.95, filter: 'blur(20px)' }}
                            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute inset-0"
                        >
                            <motion.img
                                style={{ y: scrollPosition * 0.4 }}
                                src={
                                    heroMovies[currentHeroIndex]?.bannerBase64 || heroMovies[currentHeroIndex]?.backdrop_path
                                        ? (
                                            (heroMovies[currentHeroIndex]?.bannerBase64 && heroMovies[currentHeroIndex]?.bannerBase64.startsWith('data:'))
                                                ? heroMovies[currentHeroIndex]?.bannerBase64
                                                : (heroMovies[currentHeroIndex]?.backdrop_path?.startsWith('data:') || heroMovies[currentHeroIndex]?.backdrop_path?.startsWith('http')
                                                    ? heroMovies[currentHeroIndex]?.backdrop_path
                                                    : `${IMAGE_BASE_URL}${heroMovies[currentHeroIndex]?.backdrop_path}`)
                                        )
                                        : (heroMovies[currentHeroIndex]?.imageBase64 || heroMovies[currentHeroIndex]?.poster_path?.startsWith('data:') || heroMovies[currentHeroIndex]?.poster_path?.startsWith('http')
                                            ? (heroMovies[currentHeroIndex]?.imageBase64 || heroMovies[currentHeroIndex]?.poster_path)
                                            : `${IMAGE_BASE_URL}${heroMovies[currentHeroIndex]?.poster_path}`)
                                }
                                className="w-full h-[120%] object-cover opacity-60"
                                alt=""
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent hidden lg:block" />

                            {/* The Asymmetric Spatial Mask - Professional PC Version */}
                            <div className="absolute bottom-0 left-0 w-full h-32 md:h-64 bg-transparent" style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 0 100%)', background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.8))' }} />

                            <div className={`absolute bottom-0 left-0 right-0 px-8 md:px-24 pb-24 md:pb-32 w-full flex flex-col items-start z-10`}>
                                <motion.div
                                    initial={{ y: 50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                    className="flex flex-col items-start gap-8 max-w-5xl"
                                >
                                    <div className="flex items-center gap-3">
                                        {heroMovies[currentHeroIndex]?.level === 'KING' ? (
                                            <div className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500 rounded-full text-[10px] font-black uppercase tracking-widest text-black shadow-[0_10px_40px_rgba(234,179,8,0.5)] border border-yellow-400/50">
                                                <Star size={14} fill="currentColor" /> KING SELECTION
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 px-5 py-2.5 bg-brand rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-[0_10px_40px_rgba(var(--brand-red-rgb),0.5)] border border-brand/50">
                                                <Zap size={14} fill="currentColor" /> LATEST RELEASE
                                            </div>
                                        )}
                                        <div className="px-5 py-2.5 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white/60">
                                            PREMIUM SOURCE
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {(language === 'ku' || language === 'badini') && heroMovies[currentHeroIndex]?.title && (
                                            <motion.span
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.6, duration: 0.8 }}
                                                className="text-brand font-black text-xs md:text-sm tracking-[0.4em] uppercase italic opacity-80"
                                            >
                                                {heroMovies[currentHeroIndex]?.title}
                                            </motion.span>
                                        )}
                                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[5rem] font-[1000] uppercase italic tracking-tighter leading-[0.9] drop-shadow-[0_15px_40px_rgba(0,0,0,0.8)] text-white max-w-4xl selection:bg-white selection:text-black">
                                            {(language === 'ku' || language === 'badini') ? heroMovies[currentHeroIndex]?.kurdishTitle : heroMovies[currentHeroIndex]?.title}
                                        </h1>
                                    </div>

                                    <div className="flex items-center gap-6 mt-1">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg backdrop-blur-xl">
                                            <Activity size={12} className="text-brand" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-brand">ULTRA HD 4K</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg backdrop-blur-xl">
                                            <Mic2 size={12} className="text-gray-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">DUBBED KURDISH</span>
                                        </div>
                                        {heroMovies[currentHeroIndex]?.rating && (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg backdrop-blur-xl">
                                                <Star size={12} fill="gold" className="text-yellow-500" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{heroMovies[currentHeroIndex]?.rating}</span>
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-gray-300 text-sm md:text-lg font-medium italic line-clamp-3 max-w-2xl drop-shadow-xl leading-relaxed mt-1 bg-black/40 p-6 rounded-3xl backdrop-blur-[30px] border border-white/10 shadow-2xl">
                                        {(language === 'ku' || language === 'badini') ? heroMovies[currentHeroIndex]?.kurdishOverview : heroMovies[currentHeroIndex]?.overview}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-4 mt-2 pb-20">
                                        <motion.button
                                            whileHover={{ scale: 1.05, x: 10 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handlePlay(heroMovies[currentHeroIndex])}
                                            className="bg-white text-black font-[1000] px-10 py-5 rounded-2xl flex items-center gap-4 text-xs md:text-xl uppercase italic tracking-tighter shadow-[0_20px_40px_rgba(255,255,255,0.15)] transition-all hover:bg-brand hover:text-white"
                                        >
                                            <Play size={24} fill="currentColor" /> {t('play')}
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.1, rotate: 5 }}
                                            onClick={(e) => handleShare(e, heroMovies[currentHeroIndex])}
                                            className="bg-white/5 backdrop-blur-3xl border border-white/10 p-5 rounded-2xl text-white transition-all hover:bg-white/10 shadow-2xl group"
                                        >
                                            <Share2 size={24} className="group-hover:text-brand transition-colors" />
                                        </motion.button>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Manual Controls - Carousel Interaction */}
                            <div className="absolute inset-y-0 left-0 right-0 z-50 flex items-center justify-between px-6 pointer-events-none mb-20 lg:mb-32">
                                <motion.button
                                    whileHover={{ scale: 1.1, x: -10, filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.4))' }}
                                    whileTap={{ scale: 0.8 }}
                                    onClick={handlePrevHero}
                                    className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-black/30 backdrop-blur-3xl border border-white/20 flex items-center justify-center text-white pointer-events-auto hover:bg-white/10 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                                >
                                    <ChevronRight size={36} className="rotate-180 opacity-60" />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.1, x: 10, filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.4))' }}
                                    whileTap={{ scale: 0.8 }}
                                    onClick={handleNextHero}
                                    className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-black/30 backdrop-blur-3xl border border-white/20 flex items-center justify-center text-white pointer-events-auto hover:bg-white/10 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                                >
                                    <ChevronRight size={36} className="opacity-60" />
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Hero Pagination Indicators */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 z-50">
                    {heroMovies.map((_, index) => (
                        <div
                            key={index}
                            className={`h-[4px] rounded-full transition-all duration-700 ease-in-out ${index === currentHeroIndex ? 'w-12 bg-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'w-3 bg-white/20'}`}
                        />
                    ))}
                </div>
            </div>

            {/* Real-time New Movie Notification */}
            <AnimatePresence>
                {hasNewMovies && (
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-6"
                    >
                        <div className="bg-brand border border-white/20 p-4 rounded-3xl shadow-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <Sparkles size={18} className="text-white animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-white/60 tracking-widest uppercase">Direct Transmission</p>
                                    <p className="text-sm font-black text-white italic uppercase tracking-tighter">New Selection Synchronized</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setHasNewMovies(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <RefreshCw size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content Sector Grid */}
            <div className="container mx-auto px-6 md:px-12 relative z-10 -mt-20">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
                    <div>
                        <h2 className="text-5xl md:text-8xl font-[1000] uppercase italic tracking-tighter text-white shimmer-text">
                            {t('dubbedMovies')}
                        </h2>
                        <div className="h-1 w-24 bg-brand mt-4 rounded-full opacity-50" />
                    </div>

                    {/* --- Standalone System Utility --- */}
                    <div className="flex items-center gap-6 mb-4 md:mb-0">
                        <div 
                            className={`p-5 rounded-[2rem] border border-white/10 bg-white/5 text-gray-500 transition-all hover:bg-white/10 hover:text-white cursor-pointer ${isForceSyncing ? 'animate-pulse' : ''}`}
                            onClick={forceSync}
                        >
                            <RefreshCw size={22} className={`${isForceSyncing ? 'animate-spin' : ''}`} />
                        </div>
                    </div>
                </div>

                <div className="h-[1px] w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent mb-20" />

                {/* --- Hidden Admin Floating Button --- */}
                <button
                    onClick={() => isAdmin ? setShowUploadModal(true) : setShowLoginModal(true)}
                    className="fixed bottom-24 right-6 md:right-12 z-[150] bg-brand text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(var(--brand-red-rgb),0.5)] hover:scale-110 transition-transform cursor-pointer"
                >
                    <span className="text-2xl font-bold">+</span>
                </button>

                {loading && dubbedContent.length === 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8 md:gap-14 px-4 md:px-12">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                            <div key={n} className="flex flex-col gap-6 animate-pulse">
                                <div className="aspect-[2/3] rounded-[2.5rem] md:rounded-[4rem] bg-white/5 border border-white/10 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
                                </div>
                                <div className="space-y-4 px-4">
                                    <div className="h-3 w-24 bg-white/5 rounded-full" />
                                    <div className="h-6 w-full bg-white/10 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredContent.filter(movie => activeFilter === 'ALL' || movie.level === activeFilter).length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-40 gap-8 w-full"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-brand/20 blur-[100px]" />
                            <div className="relative text-5xl md:text-[10rem] font-[1000] uppercase italic tracking-tighter text-white/5 select-none text-center">NO NODES DETECTED</div>
                        </div>
                        
                        <div className="flex flex-col items-center gap-6">
                            <p className="text-gray-500 font-black uppercase tracking-[0.4em] text-[10px] max-w-xs text-center border-t border-white/5 pt-6">Archive Transmission Interrupted. The Zana Engine is waiting for a manual handshake.</p>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={forceSync}
                                className="bg-white text-black px-12 py-5 rounded-[2rem] font-black uppercase italic tracking-widest text-xs flex items-center gap-3 shadow-2xl hover:bg-brand hover:text-white transition-all group"
                            >
                                <RefreshCw size={16} className={isForceSyncing ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-700"} />
                                <span>RE-ESTABLISH CONNECTION</span>
                            </motion.button>
                        </div>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8 md:gap-14 px-4 md:px-12">
                        {filteredContent.filter(movie => activeFilter === 'ALL' || movie.level === activeFilter).map((movie, index) => (

                            <motion.div
                                key={movie.id}
                                initial={isPerformanceMode ? { opacity: 0 } : { opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ 
                                    delay: isPerformanceMode ? 0 : index * 0.05, 
                                    duration: isPerformanceMode ? 0.3 : 0.8, 
                                    ease: "easeOut" 
                                }}
                                onClick={() => navigate(`/dubbed-details/${movie.id}`)}
                                className="group cursor-pointer relative"
                            >
                                <div className="relative aspect-[2/3] rounded-[2.5rem] md:rounded-[4rem] overflow-hidden border border-white/10 shadow-2xl transition-all duration-700 group-hover:scale-[1.05] group-hover:border-brand/50 group-hover:shadow-[0_40px_80px_rgba(0,0,0,0.8)]">
                                    <LazyBase64Image
                                        src={movie.imageBase64 || (movie.poster_path?.startsWith('data:') || movie.poster_path?.startsWith('http') ? movie.poster_path : (movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : 'https://raw.githubusercontent.com/flkrd/cdn/main/default-poster.webp'))}
                                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                        alt={movie.title}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />


                                    <div className="absolute top-4 right-4 md:top-8 md:right-8 opacity-0 group-hover:opacity-100 transition-all duration-500 scale-75 group-hover:scale-100 flex flex-col gap-3">
                                        <div className="bg-brand p-4 rounded-full shadow-2xl">
                                            <Play size={24} fill="white" className="text-white" />
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleShare(e, movie); }}
                                            className="bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-full text-white hover:bg-white/20 transition-all"
                                        >
                                            <Share size={18} />
                                        </button>

                                        {isAdmin && (
                                            <button
                                                onClick={(e) => handleBan(e, movie)}
                                                className="bg-red-600/80 backdrop-blur-xl border border-red-500 p-4 rounded-full text-white hover:bg-red-600 hover:scale-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,0,0,0.4)]"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>

                                    {movie.level && (
                                        <div className={`absolute top-4 left-4 md:top-8 md:left-8 px-4 py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xl backdrop-blur-sm ${movie.level === 'KING' ? 'bg-yellow-500 text-black' : 'bg-brand text-white'}`}>
                                            {movie.level === 'KING' && <Star size={10} fill="currentColor" />}
                                            {movie.level}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 md:mt-8 space-y-2 px-2 md:px-4">
                                    <div className="flex items-center gap-2 text-[8px] md:text-[10px] font-black text-brand uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">
                                        <Activity size={10} />
                                        {movie.release_date?.split('-')[0] || '2025'} • {t('dubbedMovies')}
                                    </div>
                                    <h3 className="text-sm md:text-2xl font-[1000] text-gray-200 group-hover:text-white transition-colors duration-300 line-clamp-1 uppercase tracking-tighter italic">
                                        {(language === 'ku' || language === 'badini') ? movie.kurdishTitle : movie.title}
                                    </h3>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Infinite Scroll Sensor */}
                <div ref={observerTarget} className="h-40 w-full flex flex-col items-center justify-center mt-10 gap-4 mb-20">
                    {isFetchingMore ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
                            <span className="text-[10px] text-brand font-black uppercase tracking-[0.5em] animate-pulse">Syncing Next Node...</span>
                        </div>
                    ) : !hasMore && dubbedContent.length > 0 ? (
                        <div className="flex flex-col items-center gap-2 opacity-30">
                            <div className="h-[1px] w-20 bg-brand/20" />
                            <span className="text-[10px] text-white/50 font-black uppercase tracking-[0.5em] text-center px-4">Catalog Integrity Check Successful.<br/>End of Reached Nodes.</span>
                        </div>
                    ) : null}
                </div>

                {/* Protocol Sharing Modal */}
                <AnimatePresence>
                    {shareTarget && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShareTarget(null)}
                            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-6"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 30 }}
                                animate={{ scale: 1, y: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-[#0c0c0c] border border-white/10 rounded-[3rem] w-full max-w-lg p-10 md:p-14 relative shadow-[0_50px_100px_rgba(0,0,0,1)]"
                            >
                                <div className="absolute top-0 left-0 w-full h-1.5 bg-brand" />
                                <button onClick={() => setShareTarget(null)} className="absolute top-8 right-8 text-gray-600 hover:text-white transition-colors">
                                    <X size={32} />
                                </button>

                                <div className="flex flex-col items-center text-center mb-12">
                                    <div className="w-24 h-24 bg-brand/10 rounded-[2.5rem] flex items-center justify-center mb-6 border border-brand/20 shadow-2xl">
                                        <Share2 size={40} className="text-brand" />
                                    </div>
                                    <h3 className="text-4xl font-[1000] uppercase italic tracking-tighter mb-4 shimmer-text">Share Movie</h3>
                                    <p className="text-gray-500 font-bold text-sm max-w-[280px]">Share this cinematic masterpiece across your neural networks.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <motion.button
                                        whileHover={{ scale: 1.05, y: -5 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={copyLink}
                                        className="flex flex-col items-center gap-4 p-10 rounded-[2.5rem] bg-white/5 border border-white/10 hover:bg-brand transition-all group"
                                    >
                                        <Copy size={28} className="text-brand group-hover:text-white" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-white">Copy Link</span>
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05, y: -5 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${window.location.origin}/#/dubbed-details/${shareTarget.id}`)}`)}
                                        className="flex flex-col items-center gap-4 p-10 rounded-[2.5rem] bg-white/5 border border-white/10 hover:bg-green-600 transition-all group"
                                    >
                                        <Send size={28} className="text-green-500 group-hover:text-white" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-white">WhatsApp</span>
                                    </motion.button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Admin Login Modal */}
                <AnimatePresence>
                    {
                        showLoginModal && (
                            <motion.div key="login-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
                                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#111] border border-white/10 p-8 rounded-3xl w-full max-w-sm relative">
                                    <button onClick={() => setShowLoginModal(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white"><X size={20} /></button>
                                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-6">Admin Login</h2>
                                    <form onSubmit={handleLogin} className="space-y-4">
                                        <input
                                            type="email"
                                            placeholder="Admin Email"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand outline-none"
                                            value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required
                                        />
                                        <input
                                            type="password"
                                            placeholder="Passcode"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand outline-none"
                                            value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required
                                        />
                                        <button type="submit" className="w-full bg-brand text-white font-black uppercase text-sm py-3 rounded-xl mt-2 hover:bg-red-600 transition-colors">
                                            Authenticate
                                        </button>
                                    </form>
                                </motion.div>
                            </motion.div>
                        )
                    }
                </AnimatePresence >

                {/* Admin Upload Modal */}
                <AnimatePresence>
                    {
                        showUploadModal && (
                            <motion.div key="upload-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
                                <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-[#111] border border-brand/30 p-8 rounded-[2rem] w-full max-w-2xl relative shadow-[0_0_50px_rgba(var(--brand-red-rgb),0.2)] max-h-[90vh] overflow-hidden flex flex-col">
                                    <button onClick={() => setShowUploadModal(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white z-10"><X size={24} /></button>

                                    <div className="flex items-center gap-3 mb-6 shrink-0">
                                        <div className="p-3 bg-brand/20 rounded-xl"><span className="text-2xl font-black italic text-brand">F</span></div>
                                        <div>
                                            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">Administration</h2>
                                            <span className="text-[10px] text-brand font-bold uppercase tracking-widest">Authorized Transmission</span>
                                        </div>
                                    </div>


                                    {/* Tabs */}
                                    <div className="flex gap-2 p-1 bg-white/5 rounded-xl mb-6 shrink-0">
                                        <button onClick={() => setActiveAdminTab('upload')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${activeAdminTab === 'upload' ? 'bg-brand text-white' : 'text-gray-400 hover:text-white'}`}>
                                            <PlusCircle size={16} /> Upload Movie
                                        </button>
                                        <button onClick={() => setActiveAdminTab('archive')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${activeAdminTab === 'archive' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
                                            <ListVideo size={16} /> Movies List
                                        </button>
                                        <button onClick={() => setActiveAdminTab('banned')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${activeAdminTab === 'banned' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                            <ShieldAlert size={16} /> Banned
                                        </button>
                                    </div>

                                    <div className="overflow-y-auto pr-2 custom-scrollbar">
                                        {activeAdminTab === 'upload' && (
                                            <form onSubmit={handleUploadMovie} className="space-y-5 pb-4 pl-1">
                                                {/* TMDB Autocomplete Search Engine */}
                                                <div className="space-y-2 relative">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-brand flex items-center gap-1.5">
                                                        <Sparkles size={12} className="text-brand animate-pulse" />
                                                        TMDb Search Autocomplete / گەڕانی خێرا لە TMDb
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <div className="relative flex-1">
                                                            <input
                                                                type="text"
                                                                value={tmdbSearchQuery}
                                                                onChange={(e) => setTmdbSearchQuery(e.target.value)}
                                                                placeholder="Search TMDB for metadata & assets... e.g. Gladiator"
                                                                className="w-full bg-black/60 border border-brand/20 rounded-xl px-4 py-3 text-white focus:border-brand outline-none transition-all placeholder:text-gray-600 text-sm"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        searchTmdbMovies(tmdbSearchQuery);
                                                                    }
                                                                }}
                                                            />
                                                            {tmdbSearchQuery && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setTmdbSearchQuery('');
                                                                        setTmdbSearchResults([]);
                                                                    }}
                                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white hover:scale-110 transition-transform"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => searchTmdbMovies(tmdbSearchQuery)}
                                                            disabled={isTmdbSearching}
                                                            className="px-6 bg-brand hover:bg-red-600 text-white font-black uppercase text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 active:scale-95 disabled:opacity-50 shadow-[0_0_15px_rgba(var(--brand-red-rgb),0.3)]"
                                                        >
                                                            {isTmdbSearching ? (
                                                                <RefreshCw size={14} className="animate-spin" />
                                                            ) : (
                                                                <Search size={14} />
                                                            )}
                                                            Search
                                                        </button>
                                                    </div>

                                                    {/* TMDB Search Dropdown Results */}
                                                    {tmdbSearchResults.length > 0 && (
                                                        <div className="absolute z-50 left-0 right-0 mt-2 bg-[#161616] border border-white/10 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-1 backdrop-blur-xl">
                                                            {tmdbSearchResults.map((movie: any) => {
                                                                const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
                                                                return (
                                                                    <button
                                                                        key={movie.id}
                                                                        type="button"
                                                                        onClick={() => handleSelectTmdbMovie(movie, 'upload')}
                                                                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 text-left transition-colors group"
                                                                    >
                                                                        <div className="w-10 h-14 rounded-lg bg-white/5 overflow-hidden shrink-0 border border-white/5">
                                                                            {movie.poster_path ? (
                                                                                <img
                                                                                    src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                                                                                    alt=""
                                                                                    className="w-full h-full object-cover"
                                                                                />
                                                                            ) : (
                                                                                <div className="w-full h-full flex items-center justify-center text-gray-600 text-[10px] font-bold">NO IMG</div>
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <h4 className="text-white font-bold text-sm truncate group-hover:text-brand transition-colors">{movie.title}</h4>
                                                                            <p className="text-xs text-gray-500 font-medium mt-0.5">{year} • ⭐ {movie.vote_average?.toFixed(1) || '0.0'}</p>
                                                                        </div>
                                                                        <ChevronRight size={16} className="text-gray-600 group-hover:text-white transition-colors mr-2 shrink-0" />
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Movie Title / فیلمی دۆبلاژکراو</label>
                                                    <input type="text" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand outline-none"
                                                        value={uploadData.title} onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })} required
                                                        placeholder="e.g., فیلمی دۆبلاژکراوی کوردی جیهانی گەورە" />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Video Embed URL (m3u8 or Player Link)</label>
                                                    <input type="text" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand outline-none"
                                                        value={uploadData.videoUrl} onChange={(e) => setUploadData({ ...uploadData, videoUrl: e.target.value })} required
                                                        placeholder="https://...m3u8 OR <iframe src=...>" />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Custom Description</label>
                                                    <textarea className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand outline-none min-h-[100px]"
                                                        value={uploadData.description} onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })} required
                                                        placeholder="گەنجێکی تووشبوو بە ئیفلیجی مێشک..." />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Grid Poster (Vertical)</label>
                                                        <div className="relative border-2 border-dashed border-white/20 hover:border-brand/50 bg-black rounded-xl p-4 transition-colors flex flex-col items-center justify-center overflow-hidden h-32">
                                                            <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                            {uploadData.imageBase64 ? (
                                                                <img src={uploadData.imageBase64} className="h-full object-cover rounded-lg shadow-xl" alt="Preview" />
                                                            ) : (
                                                                <div className="text-center text-gray-500 pointer-events-none">
                                                                    <Sparkles size={16} className="mx-auto mb-1 opacity-50" />
                                                                    <p className="text-[10px] font-bold uppercase tracking-wider leading-tight">Drop Vertical<br />Poster</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Hero Banner (Horizontal)</label>
                                                        <div className="relative border-2 border-dashed border-white/20 hover:border-brand/50 bg-black rounded-xl p-4 transition-colors flex flex-col items-center justify-center overflow-hidden h-32">
                                                            <input type="file" accept="image/*" onChange={handleBannerUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                            {uploadData.bannerBase64 ? (
                                                                <img src={uploadData.bannerBase64} className="h-full w-full object-cover rounded-lg shadow-xl" alt="Banner Preview" />
                                                            ) : (
                                                                <div className="text-center text-gray-500 pointer-events-none">
                                                                    <Sparkles size={16} className="mx-auto mb-1 opacity-50 text-yellow-500" />
                                                                    <p className="text-[10px] font-bold uppercase tracking-wider leading-tight">Drop Horizontal<br />Banner</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Classification Level</label>
                                                    <select
                                                        value={uploadData.level}
                                                        onChange={(e) => setUploadData({ ...uploadData, level: e.target.value })}
                                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand outline-none appearance-none"
                                                    >
                                                        <option value="NEW">🆕 NEW (Standard)</option>
                                                        <option value="BEST">🔥 BEST (Trending)</option>
                                                        <option value="KING">👑 KING (Premium Masterpiece)</option>
                                                        <option value="SPECIAL">✨ SPECIAL (Event/Exclusive)</option>
                                                    </select>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">IMDb ID (Optional)</label>
                                                        <input
                                                            type="text"
                                                            value={uploadData.imdb_id}
                                                            onChange={(e) => setUploadData({ ...uploadData, imdb_id: e.target.value })}
                                                            placeholder="e.g. tt36042156"
                                                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand outline-none"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">TMDb ID (Optional)</label>
                                                        <input
                                                            type="text"
                                                            value={uploadData.tmdb_id}
                                                            onChange={(e) => setUploadData({ ...uploadData, tmdb_id: e.target.value })}
                                                            placeholder="e.g. 1439930"
                                                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand outline-none"
                                                        />
                                                    </div>
                                                </div>

                                                {isUploading ? (
                                                    <div className="bg-[#0a0a0a] border border-brand/20 rounded-xl p-5 mt-4">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-[10px] text-brand font-black uppercase tracking-widest flex items-center gap-2">
                                                                <Activity size={12} className="animate-pulse" />
                                                                {uploadStep}
                                                            </span>
                                                            <span className="text-xs font-bold text-gray-500">{uploadProgress}%</span>
                                                        </div>
                                                        <div className="w-full bg-black rounded-full h-1.5 overflow-hidden">
                                                            <motion.div
                                                                className="h-full bg-brand"
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${uploadProgress}%` }}
                                                                transition={{ duration: 0.3 }}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button type="submit" className="w-full bg-brand text-white font-black uppercase py-4 rounded-xl mt-4 hover:bg-red-600 transition-colors flex justify-center items-center gap-2 relative overflow-hidden group">
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer-special_1.5s_infinite]" />
                                                        Upload Movie
                                                    </button>
                                                )}
                                            </form>
                                        )}

                                        {activeAdminTab === 'archive' && (
                                            <div className="space-y-4 pb-4">
                                                {/* Admin Search Bar */}
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-brand transition-colors">
                                                        <Search size={18} />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Sᴇᴀʀᴄʜ Aʀᴄʜɪᴠᴇ Nᴏᴅᴇs..."
                                                        value={adminSearchQuery}
                                                        onChange={(e) => setAdminSearchQuery(e.target.value)}
                                                        className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-brand outline-none transition-all placeholder:text-gray-600 font-bold uppercase tracking-widest text-xs"
                                                    />
                                                </div>

                                                {adminFilteredContent.length === 0 ? (
                                                    <div className="text-center py-10 text-gray-500 text-sm font-bold uppercase tracking-widest bg-black/50 rounded-2xl border border-white/5">
                                                        No Match Found
                                                    </div>
                                                ) : (
                                                    adminFilteredContent.map((movie, idx) => (
                                                        <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-black/40 border border-white/10 p-4 rounded-2xl group hover:border-brand/30 transition-colors relative">
                                                            <div className="w-full sm:w-16 h-32 sm:h-24 rounded-xl shadow-lg border border-white/5 overflow-hidden bg-white/5 flex items-center justify-center">
                                                                <img
                                                                    src={movie.poster_path || movie.imageBase64 || 'https://raw.githubusercontent.com/flkrd/cdn/main/default-poster.webp'}
                                                                    alt=""
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=500';
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0 pr-10 sm:pr-0">
                                                                <h3 className="text-white font-bold truncate">{movie.title || movie.kurdishTitle}</h3>
                                                                <p className="text-xs text-gray-400 line-clamp-2 mt-1">{movie.overview || movie.kurdishOverview}</p>
                                                            </div>
                                                            <div className="flex w-full sm:w-auto mt-4 sm:mt-0 gap-2 shrink-0 justify-end">
                                                                <button onClick={() => handleEditMovieClick(movie)} className="p-3 sm:p-4 bg-yellow-500/10 text-yellow-500 rounded-xl hover:bg-yellow-500 hover:text-white transition-all flex-1 sm:flex-none flex justify-center items-center gap-2">
                                                                    <Edit2 size={18} /> <span className="sm:hidden font-bold uppercase text-xs">Edit</span>
                                                                </button>
                                                                <button onClick={() => handleDeleteMovie(movie.id)} className="p-3 sm:p-4 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all flex-1 sm:flex-none flex justify-center items-center gap-2">
                                                                    <Trash2 size={18} /> <span className="sm:hidden font-bold uppercase text-xs">Drop</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {activeAdminTab === 'banned' && (
                                            <div className="space-y-4 pb-4">
                                                {isLoadingBanned ? (
                                                    <div className="py-20 flex justify-center"><RefreshCw className="animate-spin text-red-500" /></div>
                                                ) : bannedItems.length === 0 ? (
                                                    <div className="py-20 text-center text-gray-500 font-bold uppercase tracking-widest italic opacity-30">Registry Clean</div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {bannedItems.map((item) => (
                                                            <div key={item.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-red-500/10 transition-all hover:bg-white/10">
                                                                <div>
                                                                    <p className="text-white font-black uppercase text-xs tracking-tighter line-clamp-1">NODE: {item.tmdb_id || item.id}</p>
                                                                    <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Type: {item.media_type} • Since {new Date(item.created_at).toLocaleDateString()}</p>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleUnban(String(item.tmdb_id || item.id))}
                                                                    className="px-4 py-2 bg-green-600/20 text-green-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-lg active:scale-95"
                                                                >
                                                                    Recover
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </motion.div>
                        )
                    }
                </AnimatePresence >

                {/* Admin Edit Modal */}
                <AnimatePresence>
                    {
                        isEditModalOpen && (
                            <motion.div key="edit-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
                                <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-[#111] border border-yellow-500/30 p-8 rounded-[2rem] w-full max-w-2xl relative shadow-[0_0_50px_rgba(234,179,8,0.2)] max-h-[90vh] overflow-hidden flex flex-col">
                                    <button onClick={() => setIsEditModalOpen(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white z-10"><X size={24} /></button>

                                    <div className="flex items-center gap-3 mb-6 shrink-0">
                                        <div className="p-3 bg-yellow-500/20 rounded-xl"><RefreshCw size={24} className="text-yellow-500" /></div>
                                        <div>
                                            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">Edit Movie Details</h2>
                                            <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest">Update Information</span>
                                        </div>
                                    </div>

                                    <div className="overflow-y-auto pr-2 custom-scrollbar">
                                        <form onSubmit={handleUpdateMovieSubmit} className="space-y-5 pb-4 pl-1">
                                            {/* TMDB Autocomplete Search Engine */}
                                            <div className="space-y-2 relative">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-yellow-500 flex items-center gap-1.5">
                                                    <Sparkles size={12} className="text-yellow-500 animate-pulse" />
                                                    TMDb Search Autocomplete / گەڕانی خێرا لە TMDb
                                                </label>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <input
                                                            type="text"
                                                            value={tmdbSearchQuery}
                                                            onChange={(e) => setTmdbSearchQuery(e.target.value)}
                                                            placeholder="Search TMDB for metadata & assets... e.g. Gladiator"
                                                            className="w-full bg-black/60 border border-yellow-500/20 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none transition-all placeholder:text-gray-600 text-sm"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    searchTmdbMovies(tmdbSearchQuery);
                                                                }
                                                            }}
                                                        />
                                                        {tmdbSearchQuery && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setTmdbSearchQuery('');
                                                                    setTmdbSearchResults([]);
                                                                }}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white hover:scale-110 transition-transform"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => searchTmdbMovies(tmdbSearchQuery)}
                                                        disabled={isTmdbSearching}
                                                        className="px-6 bg-yellow-600 hover:bg-yellow-500 text-white font-black uppercase text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 active:scale-95 disabled:opacity-50 shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                                                    >
                                                        {isTmdbSearching ? (
                                                            <RefreshCw size={14} className="animate-spin" />
                                                        ) : (
                                                            <Search size={14} />
                                                        )}
                                                        Search
                                                    </button>
                                                </div>

                                                {/* TMDB Search Dropdown Results */}
                                                {tmdbSearchResults.length > 0 && (
                                                    <div className="absolute z-50 left-0 right-0 mt-2 bg-[#161616] border border-white/10 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-1 backdrop-blur-xl">
                                                        {tmdbSearchResults.map((movie: any) => {
                                                            const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
                                                            return (
                                                                <button
                                                                    key={movie.id}
                                                                    type="button"
                                                                    onClick={() => handleSelectTmdbMovie(movie, 'edit')}
                                                                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 text-left transition-colors group"
                                                                >
                                                                    <div className="w-10 h-14 rounded-lg bg-white/5 overflow-hidden shrink-0 border border-white/5">
                                                                        {movie.poster_path ? (
                                                                            <img
                                                                                src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                                                                                alt=""
                                                                                className="w-full h-full object-cover"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-gray-600 text-[10px] font-bold">NO IMG</div>
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <h4 className="text-white font-bold text-sm truncate group-hover:text-yellow-500 transition-colors">{movie.title}</h4>
                                                                        <p className="text-xs text-gray-500 font-medium mt-0.5">{year} • ⭐ {movie.vote_average?.toFixed(1) || '0.0'}</p>
                                                                    </div>
                                                                    <ChevronRight size={16} className="text-gray-600 group-hover:text-white transition-colors mr-2 shrink-0" />
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Movie Title / فیلمی دۆبلاژکراو</label>
                                                <input type="text" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none"
                                                    value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} required
                                                    placeholder="e.g., فیلمی دۆبلاژکراوی کوردی جیهانی گەورە" />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Video Embed URL (m3u8 or Player Link)</label>
                                                <input type="text" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none"
                                                    value={editData.videoUrl} onChange={(e) => setEditData({ ...editData, videoUrl: e.target.value })} required
                                                    placeholder="https://...m3u8 OR <iframe src=...>" />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Custom Description</label>
                                                <textarea className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none min-h-[100px]"
                                                    value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} required
                                                    placeholder="گەنجێکی تووشبوو بە ئیفلیجی مێشک..." />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Grid Poster (Vertical)</label>
                                                    <div className="relative border-2 border-dashed border-white/20 hover:border-yellow-500/50 bg-black rounded-xl p-4 transition-colors flex flex-col items-center justify-center overflow-hidden h-32">
                                                        <input type="file" accept="image/*" onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                const r = new FileReader();
                                                                r.onloadend = async () => {
                                                                    const c = await compressImage(r.result as string, 800, 1200, 0.7);
                                                                    setEditData({ ...editData, imageBase64: c });
                                                                };
                                                                r.readAsDataURL(file);
                                                            }
                                                        }} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                        {editData.imageBase64 ? (
                                                            <img src={editData.imageBase64} className="h-full object-cover rounded-lg shadow-xl" alt="Preview" />
                                                        ) : (
                                                            <div className="text-center text-gray-500 pointer-events-none">
                                                                <Sparkles size={16} className="mx-auto mb-1 opacity-50" />
                                                                <p className="text-[10px] font-bold uppercase tracking-wider leading-tight">Drop Vertical<br />Poster</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Hero Banner (Horizontal)</label>
                                                    <div className="relative border-2 border-dashed border-white/20 hover:border-yellow-500/50 bg-black rounded-xl p-4 transition-colors flex flex-col items-center justify-center overflow-hidden h-32">
                                                        <input type="file" accept="image/*" onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                const r = new FileReader();
                                                                r.onloadend = async () => {
                                                                    const c = await compressImage(r.result as string, 1280, 720, 0.7);
                                                                    setEditData({ ...editData, bannerBase64: c });
                                                                };
                                                                r.readAsDataURL(file);
                                                            }
                                                        }} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                        {editData.bannerBase64 ? (
                                                            <img src={editData.bannerBase64} className="h-full w-full object-cover rounded-lg shadow-xl" alt="Banner Preview" />
                                                        ) : (
                                                            <div className="text-center text-gray-500 pointer-events-none">
                                                                <Sparkles size={16} className="mx-auto mb-1 opacity-50 text-yellow-500" />
                                                                <p className="text-[10px] font-bold uppercase tracking-wider leading-tight">Drop Horizontal<br />Banner</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Classification Level</label>
                                                <select
                                                    value={editData.level}
                                                    onChange={(e) => setEditData({ ...editData, level: e.target.value })}
                                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none appearance-none"
                                                >
                                                    <option value="NEW">🆕 NEW (Standard)</option>
                                                    <option value="BEST">🔥 BEST (Trending)</option>
                                                    <option value="KING">👑 KING (Premium Masterpiece)</option>
                                                    <option value="SPECIAL">✨ SPECIAL (Event/Exclusive)</option>
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">IMDb ID (Optional)</label>
                                                    <input
                                                        type="text"
                                                        value={editData.imdb_id}
                                                        onChange={(e) => setEditData({ ...editData, imdb_id: e.target.value })}
                                                        placeholder="e.g. tt36042156"
                                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">TMDb ID (Optional)</label>
                                                    <input
                                                        type="text"
                                                        value={editData.tmdb_id}
                                                        onChange={(e) => setEditData({ ...editData, tmdb_id: e.target.value })}
                                                        placeholder="e.g. 1439930"
                                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <button type="submit" disabled={isUpdating} className={`w-full bg-yellow-600 text-white font-black uppercase py-4 rounded-xl mt-4 hover:bg-yellow-500 transition-colors flex justify-center items-center gap-2 relative overflow-hidden group ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer-special_1.5s_infinite]" />
                                                {isUpdating ? 'Saving Details...' : 'Save Changes'}
                                            </button>
                                        </form>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )
                    }
                </AnimatePresence >

                {/* Custom Deletion Confirmation Modal */}
                <AnimatePresence>
                    {
                        movieToDelete && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
                                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#111] border border-red-500/30 p-8 rounded-3xl w-full max-w-sm relative text-center shadow-[0_0_50px_rgba(255,0,0,0.1)]">
                                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                                        <Trash2 size={24} className="text-red-500" />
                                    </div>
                                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">Delete Movie?</h2>
                                    <p className="text-sm text-gray-400 mb-8 font-bold">This action cannot be undone. The movie will be permanently deleted.</p>

                                    <div className="flex gap-3">
                                        <button onClick={() => setMovieToDelete(null)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs py-4 rounded-xl transition-colors">
                                            Cancel
                                        </button>
                                        <button onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs py-4 rounded-xl transition-colors shadow-[0_0_20px_rgba(255,0,0,0.3)]">
                                            Delete
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )
                    }
                </AnimatePresence>

            </div>
        </div >
    );
};

export default DubbedMoviesPage;
