
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic2, Play, Zap, Share2, X, Send,
    Link as LinkIcon, Sparkles,
    Activity, Info, Star, ChevronRight, Share, Copy,
    Trash2, ListVideo, PlusCircle, Edit2, RefreshCw, TrendingUp, Search, ShieldAlert,
    ArrowUp, ArrowDown, Server, Plus, Tv, Subtitles, Maximize, RefreshCcw
} from 'lucide-react';
import { Content } from '../types';
import { fetchData } from '../services/tmdbService';
import { API_KEY, IMAGE_BASE_URL_POSTER, IMAGE_BASE_URL, API_BASE_URL } from '../constants';
import Spinner from '../components/Spinner';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import MovieCard from '../components/MovieCard';
import { bannedService } from '../services/bannedService';
import { featuredBannerService, FeaturedBannerItem } from '../services/featuredBannerService';
import { supabase } from '../utils/supabaseClient';
import { compressImage } from '../utils/imageUtils';
import { db, initDB } from '../utils/db';
import { isTauri } from '../utils/tauriUtils';


// Removed MeshGradientBackground to allow global PremiumBackground to handle theme rendering.

const LazyBase64Image: React.FC<{ src: string, className?: string, alt?: string, placeholder?: string }> = ({ src, className, alt }) => {
    return (
        <img
            src={src}
            className={className}
            alt={alt}
            decoding="async"
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
                                    key={displayStatus || 'status-typing'}
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
    const { addNotification } = useNotification();
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

    const location = useLocation();

    // Admin State - Pulled from Global UI Context
    const { accentColor, isPerformanceMode, isAdmin, setIsAdmin, loginAsAdmin, setIsAdminModalOpen, glassConfig = {
        redOpacity: 0.15,
        darkOpacity: 0.85,
        blurAmount: 20,
        saturation: 120,
        borderOpacity: 0.1,
        aberrationIntensity: 0.5
    } } = useUI();
    const [showLoginModal, setShowLoginModal] = useState(false);

    // Auto-open upload panel if url param admin=true and user is authorized
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        if (queryParams.get('admin') === 'true' && isAdmin) {
            setIsAdminModalOpen(true);
        }
    }, [location.search, isAdmin, setIsAdminModalOpen]);
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
    const [activeAdminTab, setActiveAdminTab] = useState<'upload' | 'archive' | 'banned' | 'servers' | 'glass' | 'mobilenav' | 'oneboard' | 'player' | 'carousel'>('upload');
    const [carouselBanners, setCarouselBanners] = useState<FeaturedBannerItem[]>([]);
    const [isLoadingBanners, setIsLoadingBanners] = useState(false);
    const [isSavingBanner, setIsSavingBanner] = useState(false);
    const [bannerForm, setBannerForm] = useState<Partial<FeaturedBannerItem>>({
        content_id: '',
        media_type: 'movie',
        title: '',
        kurdish_title: '',
        overview: '',
        kurdish_overview: '',
        backdrop_path: '',
        poster_path: '',
        logo_path: '',
        video_url: '',
        rating: 7.5,
        year: '',
        sort_order: 0
    });
    const [editingBannerId, setEditingBannerId] = useState<number | null>(null);
    const DEFAULT_CAROUSEL_SETTINGS = {
        autoplayInterval: 10000, cardCount: 10, cardHeightVh: 65,
        deckOffset: 8, deckScale: 0.07, gradientStrength: 85, glowOpacity: 35, roundedSize: '3rem',
        visibleCards: 3,
    };
    const [carouselSettings, setCarouselSettings] = useState(() => {
        try {
            const stored = localStorage.getItem('carouselSettings');
            return stored ? { ...DEFAULT_CAROUSEL_SETTINGS, ...JSON.parse(stored) } : DEFAULT_CAROUSEL_SETTINGS;
        } catch { return DEFAULT_CAROUSEL_SETTINGS; }
    });
    const [carouselPreviewIdx, setCarouselPreviewIdx] = useState(0);
    const [serversList, setServersList] = useState<{ id: number; server_name: string; priority: number }[]>([]);
    const [isLoadingServers, setIsLoadingServers] = useState(false);
    const [isSavingServers, setIsSavingServers] = useState(false);
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

    const handleSelectTmdbMovie = async (movie: any, target: 'upload' | 'edit' | 'banner') => {
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
            } else if (target === 'edit') {
                setEditData(prev => ({
                    ...prev,
                    title: `فیلمی دۆبلاژکراوی کوردی ${title}`,
                    description: description,
                    imageBase64: verticalPoster,
                    bannerBase64: horizontalBanner,
                    imdb_id: imdbId,
                    tmdb_id: tmdbId
                }));
            } else if (target === 'banner') {
                setBannerForm(prev => ({
                    ...prev,
                    content_id: tmdbId,
                    media_type: 'movie',
                    title: title,
                    kurdish_title: title,
                    overview: description,
                    kurdish_overview: description,
                    backdrop_path: details.backdrop_path || '',
                    poster_path: details.poster_path || '',
                    rating: details.vote_average || 7.5,
                    year: details.release_date ? details.release_date.split('-')[0] : '',
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
    const [hasNewMovies, setHasNewMovies] = useState(false);
    const [isLive, setIsLive] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const observerTarget = useRef<HTMLDivElement>(null);
    const PAGE_SIZE = 24;


    useEffect(() => {
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

                    const dbFetchPromise = supabase
                        .from('dubbed_movies')
                        .select('id, title, description, videoUrl, imageBase64, bannerBase64, created_at, level')
                        .order('created_at', { ascending: false })
                        .range(0, PAGE_SIZE - 1);

                    let timeoutId: any;
                    const timeoutPromise = new Promise<{ data: null, error: any }>((_, reject) => {
                        timeoutId = setTimeout(() => reject(new Error("Supabase request timed out")), 30000);
                    });

                    const response = await Promise.race([
                        dbFetchPromise.then(val => {
                            clearTimeout(timeoutId);
                            return val;
                        }),
                        timeoutPromise
                    ]);

                    const { data, error } = response;

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
                            .filter((m: any) => !bannedIds.has(String(m.id).replace('custom_', '')))
                            .map((movie: any) => ({
                                ...movie,
                                id: String(movie.id).startsWith('custom_') ? movie.id : `custom_${movie.id}`,
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
                            return String(b.id).localeCompare(String(a.id));
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
                            .filter((movie: any) => !bannedIds.has(String(movie.id).replace('custom_', '')))
                            .map((movie: any) => ({
                                ...movie,
                                id: String(movie.id).startsWith('custom_') ? movie.id : `custom_${movie.id}`,
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
                        db.saveMovies(formatted).catch(() => { });
                    }
                } else if (payload.eventType === 'UPDATE') {
                    const eventId = String(payload.new.id).startsWith('custom_') ? payload.new.id : `custom_${payload.new.id}`;
                    setDubbedContent(prev => {
                        const next = prev.map(m => String(m.id) === eventId ? {
                            ...m,
                            ...payload.new,
                            poster_path: (payload.new as any).imageBase64,
                            backdrop_path: (payload.new as any).bannerBase64 || (payload.new as any).imageBase64,
                            title: (payload.new as any).title,
                            kurdishTitle: (payload.new as any).title,
                            overview: (payload.new as any).description,
                            kurdishOverview: (payload.new as any).description,
                        } : m);
                        db.saveMovies(next).catch(() => { });
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
                .select('id, title, description, videoUrl, imageBase64, bannerBase64, created_at, level')
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            if (data && data.length > 0) {
                const bannedIds = await bannedService.fetchBannedList();
                const formatted = data
                    .filter((m: any) => !bannedIds.has(String(m.id)))
                    .map((movie: any) => ({
                        ...movie,
                        id: String(movie.id).startsWith('custom_') ? movie.id : `custom_${movie.id}`,
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
                    db.saveMovies(next).catch(() => { });
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
            let timeoutId: any;
            const timeoutPromise = new Promise((_, reject) =>
                timeoutId = setTimeout(() => reject(new Error('Operation timeout (30s limit)')), 30000)
            );

            const fetchPromise = (async () => {
                // Fetch first 40 nodes on force sync for better coverage
                const { data, error } = await supabase
                    .from('dubbed_movies')
                    .select('id, title, description, videoUrl, imageBase64, bannerBase64, created_at, level')
                    .order('created_at', { ascending: false })
                    .range(0, 39);

                if (error) throw error;
                return data;
            })();

            const data = await Promise.race([
                fetchPromise.then(val => {
                    clearTimeout(timeoutId);
                    return val;
                }),
                timeoutPromise
            ]) as any[];

            if (data && data.length > 0) {
                const bannedIds = await bannedService.fetchBannedList();
                const formattedCustom = data
                    .filter((m: any) => !bannedIds.has(String(m.id)))
                    .map((movie: any) => ({
                        ...movie,
                        id: String(movie.id).startsWith('custom_') ? movie.id : `custom_${movie.id}`,
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

    const handleDragEnd = (event: any, info: any) => {
        const swipeThreshold = 50;
        const isRTL = language === 'ku' || language === 'badini';
        const swipeOffset = info.offset.x;
        
        if (isRTL) {
            if (swipeOffset > swipeThreshold) {
                setCurrentHeroIndex((prev) => (prev + 1) % heroMovies.length);
            } else if (swipeOffset < -swipeThreshold) {
                setCurrentHeroIndex((prev) => (prev - 1 + heroMovies.length) % heroMovies.length);
            }
        } else {
            if (swipeOffset < -swipeThreshold) {
                setCurrentHeroIndex((prev) => (prev + 1) % heroMovies.length);
            } else if (swipeOffset > swipeThreshold) {
                setCurrentHeroIndex((prev) => (prev - 1 + heroMovies.length) % heroMovies.length);
            }
        }
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
        } else if (activeAdminTab === 'servers') {
            fetchServersList();
        } else if (activeAdminTab === 'carousel') {
            fetchCarouselBanners();
        }
    }, [activeAdminTab]);

    const fetchCarouselBanners = async () => {
        setIsLoadingBanners(true);
        try {
            const items = await featuredBannerService.fetchFeaturedItems();
            setCarouselBanners(items);
        } catch (e) {
            console.error("Failed to fetch banners", e);
        } finally {
            setIsLoadingBanners(false);
        }
    };

    const handleSaveBanner = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bannerForm.content_id) {
            alert("TMDb ID or Custom ID is required!");
            return;
        }
        setIsSavingBanner(true);
        try {
            let success = false;
            if (editingBannerId !== null) {
                success = await featuredBannerService.updateFeaturedItem(editingBannerId, bannerForm);
            } else {
                success = await featuredBannerService.addFeaturedItem(bannerForm);
            }

            if (success) {
                setBannerForm({
                    content_id: '',
                    media_type: 'movie',
                    title: '',
                    kurdish_title: '',
                    overview: '',
                    kurdish_overview: '',
                    backdrop_path: '',
                    poster_path: '',
                    logo_path: '',
                    video_url: '',
                    rating: 7.5,
                    year: '',
                    sort_order: 0
                });
                setEditingBannerId(null);
                fetchCarouselBanners();
            } else {
                alert("Failed to save banner!");
            }
        } catch (err) {
            console.error("Save banner error:", err);
        } finally {
            setIsSavingBanner(false);
        }
    };

    const handleDeleteBanner = async (id: number) => {
        if (!window.confirm("Are you sure you want to remove this banner?")) return;
        try {
            const success = await featuredBannerService.deleteFeaturedItem(id);
            if (success) {
                fetchCarouselBanners();
            } else {
                alert("Failed to delete banner!");
            }
        } catch (e) {
            console.error("Delete banner error:", e);
        }
    };

    const handleEditBanner = (item: FeaturedBannerItem) => {
        setEditingBannerId(item.id || null);
        setBannerForm({
            content_id: item.content_id,
            media_type: item.media_type,
            title: item.title || '',
            kurdish_title: item.kurdish_title || '',
            overview: item.overview || '',
            kurdish_overview: item.kurdish_overview || '',
            backdrop_path: item.backdrop_path || '',
            poster_path: item.poster_path || '',
            logo_path: item.logo_path || '',
            video_url: item.video_url || '',
            rating: item.rating || 7.5,
            year: item.year || '',
            sort_order: item.sort_order || 0
        });
    };

    const fetchServersList = async () => {
        setIsLoadingServers(true);
        try {
            const { data, error } = await supabase
                .from('server_config')
                .select('*')
                .order('priority', { ascending: false });
            if (error) throw error;
            setServersList(data || []);
        } catch (err) {
            console.error("Failed to fetch server config:", err);
            addNotification({ type: 'error', title: 'Data Stream Failed', message: 'Could not load servers priority configuration.' });
        } finally {
            setIsLoadingServers(false);
        }
    };

    const moveServer = (index: number, direction: 'up' | 'down') => {
        const nextIndex = direction === 'up' ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= serversList.length) return;

        const updated = [...serversList];
        const temp = updated[index];
        updated[index] = updated[nextIndex];
        updated[nextIndex] = temp;
        setServersList(updated);
    };

    const handleSaveServerOrder = async () => {
        setIsSavingServers(true);
        try {
            const updates = serversList.map((server, index) => {
                const priority = 500 - index * 20;
                return {
                    id: server.id,
                    server_name: server.server_name,
                    priority: priority
                };
            });

            const { error } = await supabase
                .from('server_config')
                .upsert(updates);

            if (error) throw error;

            const scores: { [key: string]: number } = {};
            updates.forEach(upd => {
                scores[upd.server_name] = upd.priority;
            });
            localStorage.setItem('playerSourceScores', JSON.stringify(scores));
            window.dispatchEvent(new Event('player-source-scores-updated'));

            addNotification({ type: 'success', title: 'ڕیزبەندی نوێکراوە', message: 'Server priority mapping has been updated globally!' });
            fetchServersList();
        } catch (err: any) {
            console.error("Failed to save server priority config:", err);
            addNotification({ type: 'error', title: 'Database Reject', message: err.message || 'Failed to update server priorities.' });
        } finally {
            setIsSavingServers(false);
        }
    };

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
            const dbId = String(movie.id).startsWith('custom_') ? movie.id : `custom_${movie.id}`;
            await supabase.from('dubbed_movies').delete().eq('id', dbId);

            addNotification({ type: 'success', title: 'NODE PURGED', message: 'Content removed globally.' });

            // Refresh local state
            setDubbedContent(prev => prev.filter(m => m.id !== movie.id));
        } catch (err) {
            console.error("Moderation failure:", err);
            addNotification({ type: 'error', title: 'SIGNAL FAILED', message: 'Action rejected.' });
        }
    };

    const copyLink = () => {
        const routePrefix = isTauri() ? '/#/dubbed-details' : '/dubbed-details';
        const url = `${window.location.origin}${routePrefix}/${shareTarget?.id}`;
        navigator.clipboard.writeText(url);
        addNotification({ type: 'success', title: 'Link Copied', message: 'Link copied successfully.' });
        setShareTarget(null);
    };

    // --- Admin Handlers ---
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const res = loginAsAdmin(adminEmail, adminPassword);
        if (res.success && res.admin) {
            setShowLoginModal(false);
            addNotification({ 
                type: 'success', 
                title: (language === 'ku' || language === 'badini') ? 'بەخێربێیتەوە ئادمن' : 'Admin Authorized', 
                message: (language === 'ku' || language === 'badini') ? `وەک ${res.admin.username} چوویتە ژوورەوە` : `Logged in as ${res.admin.username}`
            });
        } else {
            addNotification({ 
                type: 'error', 
                title: (language === 'ku' || language === 'badini') ? 'ڕێگەپێدان نەدرا' : 'Access Denied', 
                message: res.message || 'Invalid credentials.' 
            });
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
            // Generate a unique ID (custom_<uuid>) required by public.dubbed_movies primary key constraint
            const generatedId = `custom_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substring(2, 9))}`;
            const cleanTitle = uploadData.title.trim();
            const cleanDesc = uploadData.description?.trim() || 'No description provided.';
            const cleanVideo = uploadData.videoUrl.trim();

            // 1. Insert into Supabase - Real-time will handle the UI update
            const { error } = await supabase
                .from('dubbed_movies')
                .insert([
                    {
                        id: generatedId,
                        title: cleanTitle,
                        kurdishTitle: cleanTitle,
                        description: cleanDesc,
                        overview: cleanDesc,
                        kurdishOverview: cleanDesc,
                        videoUrl: cleanVideo,
                        customStream: cleanVideo,
                        imageBase64: finalImage,
                        poster_path: finalImage,
                        bannerBase64: uploadData.bannerBase64 || null,
                        backdrop_path: uploadData.bannerBase64 || finalImage,
                        level: uploadData.level || 'NEW',
                        media_type: 'dubbed',
                        imdb_id: uploadData.imdb_id ? uploadData.imdb_id.trim() : null,
                        tmdb_id: uploadData.tmdb_id && !isNaN(Number(uploadData.tmdb_id)) ? String(uploadData.tmdb_id).trim() : null
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
                    id: String(movie.id).startsWith('custom_') ? movie.id : `custom_${movie.id}`,
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
            setIsAdminModalOpen(false);
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
            // 1. Robust ID Normalization: DB expects ID starting with 'custom_'
            const dbId = nodeToEdit.id.startsWith('custom_')
                ? nodeToEdit.id
                : `custom_${nodeToEdit.id}`;

            console.log(`[ZANA PROTOCOL] Initiating Node Modification: ${dbId}`);

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
                .eq('id', dbId);

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
            // 1. Robust ID Normalization: DB expects ID starting with 'custom_'
            const dbId = movieToDelete.startsWith('custom_')
                ? movieToDelete
                : `custom_${movieToDelete}`;

            console.log(`[ZANA PROTOCOL] Attempting high-level termination of Node: ${dbId}`);

            // 2. Database Execution (Try RPC Call first, fallback to direct DELETE if it fails)
            console.log(`[ZANA PROTOCOL] Executing deletion RPC for Node: ${dbId}`);
            let deleteSuccess = false;

            try {
                const { error: rpcError } = await supabase
                    .rpc('delete_dubbed_movie', { target_id: dbId });

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
                console.log(`[ZANA PROTOCOL] Falling back to standard direct deletion on 'dubbed_movies' table for ID: ${dbId}`);
                const { error: directError } = await supabase
                    .from('dubbed_movies')
                    .delete()
                    .eq('id', dbId);

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
            setIsAdminModalOpen(false);

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
        <div className="min-h-screen bg-transparent text-[var(--text-primary)] selection:bg-brand selection:text-white pb-40 overflow-x-hidden">
            <AnimatePresence>
                {loading && <CinematicLoader progress={loadingProgress} status={loadingStatus} performanceMode={isPerformanceMode} />}
            </AnimatePresence>

            {/* Clean Floating Header - no clutter */}
            <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none" />

            {/* iOS 26 Cinematic Hero Carousel */}
            <div className="w-full relative px-4 md:px-12 pt-24 md:pt-32 pb-4 bg-transparent">
                {/* Immersive blurred backdrop glow behind the deck */}
                {heroMovies[currentHeroIndex] && (
                    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none transition-all duration-1000">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#F8F9FA]/40 dark:to-black/40 z-10" />
                        <img
                            src={
                                heroMovies[currentHeroIndex].bannerBase64 || heroMovies[currentHeroIndex].backdrop_path
                                    ? (
                                        (heroMovies[currentHeroIndex].bannerBase64 && heroMovies[currentHeroIndex].bannerBase64.startsWith('data:'))
                                            ? heroMovies[currentHeroIndex].bannerBase64
                                            : (heroMovies[currentHeroIndex].backdrop_path?.startsWith('data:') || heroMovies[currentHeroIndex].backdrop_path?.startsWith('http')
                                                ? heroMovies[currentHeroIndex].backdrop_path
                                                : `${IMAGE_BASE_URL.replace('w1280', 'original')}${heroMovies[currentHeroIndex].backdrop_path}`)
                                    )
                                    : (heroMovies[currentHeroIndex].imageBase64 || heroMovies[currentHeroIndex].poster_path?.startsWith('data:') || heroMovies[currentHeroIndex].poster_path?.startsWith('http')
                                        ? (heroMovies[currentHeroIndex].imageBase64 || heroMovies[currentHeroIndex].poster_path)
                                        : `${IMAGE_BASE_URL.replace('w1280', 'original')}${heroMovies[currentHeroIndex].poster_path}`)
                            }
                            className="w-full h-full object-cover scale-125 opacity-35 dark:opacity-20 blur-[100px]"
                            alt=""
                        />
                    </div>
                )}

                <div className="relative w-full h-[50vh] md:h-[65vh] overflow-visible">
                    <AnimatePresence initial={false}>
                        {heroMovies.length > 0 && heroMovies.map((movie, idx) => {
                            const d = (idx - currentHeroIndex + heroMovies.length) % heroMovies.length;
                            if (d >= 3) return null; // Only render front 3 cards in the deck
                            
                            const isRTL = language === 'ku' || language === 'badini';
                            const rtlMultiplier = isRTL ? -1 : 1;
                            
                            return (
                                <motion.div
                                    key={movie.id}
                                    style={{
                                        transformOrigin: isRTL ? 'right center' : 'left center'
                                    }}
                                    initial={{
                                        x: (d + 1) * 8 * rtlMultiplier + "%",
                                        scale: 1 - (d + 1) * 0.07,
                                        zIndex: 30 - (d + 1) * 10,
                                        opacity: 0
                                    }}
                                    animate={{
                                        x: d * 8 * rtlMultiplier + "%",
                                        scale: 1 - d * 0.07,
                                        zIndex: 30 - d * 10,
                                        opacity: d === 0 ? 1 : d === 1 ? 0.9 : d === 2 ? 0.65 : 0
                                    }}
                                    exit={{
                                        x: -100 * rtlMultiplier + "%",
                                        scale: 0.9,
                                        zIndex: 0,
                                        opacity: 0
                                    }}
                                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                    drag={d === 0 ? "x" : false}
                                    dragConstraints={{ left: 0, right: 0 }}
                                    dragElastic={0.2}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => d > 0 && setCurrentHeroIndex(idx)}
                                    className={`absolute top-0 ${(language === 'ku' || language === 'badini') ? 'right-0' : 'left-0'} w-[84%] md:w-[82%] h-full rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-border-color bg-card-bg shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_40px_80px_rgba(0,0,0,0.5)] transition-all duration-500 ${d > 0 ? 'cursor-pointer select-none' : ''}`}
                                >
                                    <img
                                        src={
                                            movie.bannerBase64 || movie.backdrop_path
                                                ? (
                                                    (movie.bannerBase64 && movie.bannerBase64.startsWith('data:'))
                                                        ? movie.bannerBase64
                                                        : (movie.backdrop_path?.startsWith('data:') || movie.backdrop_path?.startsWith('http')
                                                            ? movie.backdrop_path
                                                            : `${IMAGE_BASE_URL.replace('w1280', 'original')}${movie.backdrop_path}`)
                                                )
                                                : (movie.imageBase64 || movie.poster_path?.startsWith('data:') || movie.poster_path?.startsWith('http')
                                                    ? (movie.imageBase64 || movie.poster_path)
                                                    : `${IMAGE_BASE_URL.replace('w1280', 'original')}${movie.poster_path}`)
                                        }
                                        className="w-full h-full object-cover opacity-100 absolute inset-0 z-0"
                                        alt=""
                                    />
                                    
                                    {/* Soft ground gradient only for active card */}
                                    {d === 0 && (
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent z-10 pointer-events-none" />
                                    )}

                                    {/* Card content - only visible on active card */}
                                    {d === 0 && (
                                        <>
                                            {/* Top Left Metadata Tags */}
                                            <div className={`absolute top-6 ${(language === 'ku' || language === 'badini') ? 'right-6 flex-row-reverse' : 'left-6'} z-20 flex flex-wrap gap-2`}>
                                                {movie.level === 'KING' ? (
                                                    <span className="bg-yellow-500 text-black text-[10px] md:text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                                                        KING SELECTION
                                                    </span>
                                                ) : (
                                                    <span className="bg-brand text-white text-[10px] md:text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                                                        LATEST RELEASE
                                                    </span>
                                                )}
                                                <span className="bg-white/15 backdrop-blur-md border border-white/10 text-white text-[10px] md:text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                                                    ULTRA HD 4K
                                                </span>
                                                <span className="bg-white/15 backdrop-blur-md border border-white/10 text-white text-[10px] md:text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                                                    DUBBED KURDISH
                                                </span>
                                            </div>

                                            {/* Bottom Content Row */}
                                            <div className={`absolute bottom-6 left-6 right-6 z-20 flex items-center justify-between gap-4 ${(language === 'ku' || language === 'badini') ? 'flex-row-reverse' : ''}`}>
                                                <div className={`flex items-center gap-4 ${(language === 'ku' || language === 'badini') ? 'flex-row-reverse text-right' : 'text-left'}`}>
                                                    {/* Translucent Play Circle Button */}
                                                    <div
                                                        onClick={() => handlePlay(movie)}
                                                        className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all hover:scale-105 shadow-lg cursor-pointer pointer-events-auto"
                                                    >
                                                        <Play fill="currentColor" size={20} className="ml-0.5" />
                                                    </div>
                                                    
                                                    <div className="flex flex-col">
                                                        <h2 className="text-xl md:text-3xl font-[1000] text-white tracking-tight drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                                                            {(language === 'ku' || language === 'badini') ? movie.kurdishTitle : movie.title}
                                                        </h2>
                                                        <span className="text-white/60 text-[10px] md:text-xs font-bold mt-0.5">
                                                            {t('play')}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Details / Share Button on the right */}
                                                <button
                                                    onClick={(e) => handleShare(e, movie)}
                                                    className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all hover:scale-105 shadow-lg cursor-pointer pointer-events-auto"
                                                    aria-label="Share movie"
                                                >
                                                    <Share2 size={20} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {/* Floating Pagination Dots at the top right */}
                    <div className="absolute top-4 right-4 z-40 flex items-center gap-1.5 bg-black/25 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/10">
                        {heroMovies.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentHeroIndex(idx)}
                                className={`rounded-full transition-all duration-300 ${idx === currentHeroIndex ? 'w-4 h-2 bg-white' : 'w-2 h-2 bg-white/30'}`}
                                aria-label={`Go to slide ${idx + 1}`}
                            />
                        ))}
                    </div>
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
            <div className="container mx-auto px-6 md:px-12 relative z-10 mt-12 md:mt-20">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
                    <div>
                        <h2 className="text-5xl md:text-8xl font-[1000] uppercase italic tracking-tighter text-main-text">
                            {t('dubbedMovies')}
                        </h2>
                        <div className="h-1 w-24 bg-brand mt-4 rounded-full opacity-50" />
                    </div>

                    {/* --- Standalone System Utility --- */}
                    <div className="flex items-center gap-6 mb-4 md:mb-0">
                        <div
                            className={`p-5 rounded-[2rem] border border-border-color bg-box-bg text-sec-text transition-all hover:bg-box-bg/85 hover:text-main-text cursor-pointer ${isForceSyncing ? 'animate-pulse' : ''}`}
                            onClick={forceSync}
                        >
                            <RefreshCw size={22} className={`${isForceSyncing ? 'animate-spin' : ''}`} />
                        </div>
                    </div>
                </div>

                <div className="h-[1px] w-full bg-border-color mb-20" />

                {/* --- Hidden Admin Floating Button --- */}
                <button
                    onClick={() => isAdmin ? setIsAdminModalOpen(true) : setShowLoginModal(true)}
                    className="fixed bottom-24 right-6 md:right-12 z-[150] bg-brand text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(var(--brand-red-rgb),0.5)] hover:scale-110 transition-transform cursor-pointer"
                >
                    <span className="text-2xl font-bold">+</span>
                </button>

                {loading && dubbedContent.length === 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-10 px-4 md:px-12">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                            <div key={n} className="flex flex-col gap-6 animate-pulse">
                                <div className="aspect-[2/3] rounded-[2.5rem] md:rounded-[4rem] bg-white/5 border border-white/10 relative overflow-hidden" />
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-10 px-4 md:px-12">
                        {filteredContent.filter(movie => activeFilter === 'ALL' || movie.level === activeFilter).map((movie, index) => (
                            <MovieCard
                                key={`${movie.id}-${index}`}
                                item={movie}
                                type="dubbed"
                                className="w-full"
                            />
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
                            <span className="text-[10px] text-white/50 font-black uppercase tracking-[0.5em] text-center px-4">Catalog Integrity Check Successful.<br />End of Reached Nodes.</span>
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
                                    <h3 className="text-4xl font-[1000] uppercase italic tracking-tighter mb-4">Share Movie</h3>
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
                                        onClick={() => {
                                            const routePrefix = isTauri() ? '/#/dubbed-details' : '/dubbed-details';
                                            window.open(`https://wa.me/?text=${encodeURIComponent(`${window.location.origin}${routePrefix}/${shareTarget.id}`)}`);
                                        }}
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
                                    <form onSubmit={handleLogin} className="space-y-4" toolname="admin_login" tooldescription="Authenticate as administrator using email and passcode">
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="Admin Email"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand outline-none"
                                            value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required
                                        />
                                        <input
                                            type="password"
                                            name="passcode"
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

                            </div>
        </div>
    );
};

export default DubbedMoviesPage;
