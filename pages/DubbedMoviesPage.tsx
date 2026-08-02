
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

    const [scrollPosition, setScrollPosition] = useState(0);

    const location = useLocation();

    // Admin State - Pulled from Global UI Context
    const { accentColor, isPerformanceMode, isAdmin, setIsAdmin, loginAsAdmin, glassConfig = {
        redOpacity: 0.15,
        darkOpacity: 0.85,
        blurAmount: 20,
        saturation: 120,
        borderOpacity: 0.1,
        aberrationIntensity: 0.5
    } } = useUI();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);

    // Auto-open upload panel if url param admin=true and user is authorized
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        if (queryParams.get('admin') === 'true' && isAdmin) {
            setShowUploadModal(true);
        }
    }, [location.search, isAdmin]);
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
                        <h2 className="text-5xl md:text-8xl font-[1000] uppercase italic tracking-tighter text-main-text shimmer-text">
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
                    onClick={() => isAdmin ? setShowUploadModal(true) : setShowLoginModal(true)}
                    className="fixed bottom-24 right-6 md:right-12 z-[150] bg-brand text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(var(--brand-red-rgb),0.5)] hover:scale-110 transition-transform cursor-pointer"
                >
                    <span className="text-2xl font-bold">+</span>
                </button>

                {loading && dubbedContent.length === 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-10 px-4 md:px-12">
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


                                    <div className="flex gap-2 p-1 bg-white/5 rounded-xl mb-6 shrink-0 overflow-x-auto scrollbar-hide">
                                        <button onClick={() => setActiveAdminTab('upload')} className={`flex-shrink-0 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${activeAdminTab === 'upload' ? 'bg-brand text-white' : 'text-gray-400 hover:text-white'}`}>
                                            <PlusCircle size={16} /> Upload Movie
                                        </button>
                                        <button onClick={() => setActiveAdminTab('carousel')} className={`flex-shrink-0 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${activeAdminTab === 'carousel' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                            <Tv size={16} /> Banner Carousel
                                        </button>
                                        <button onClick={() => setActiveAdminTab('archive')} className={`flex-shrink-0 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${activeAdminTab === 'archive' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
                                            <ListVideo size={16} /> Movies List
                                        </button>
                                        <button onClick={() => setActiveAdminTab('servers')} className={`flex-shrink-0 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${activeAdminTab === 'servers' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}>
                                            <Server size={16} /> Servers
                                        </button>
                                        <button onClick={() => setActiveAdminTab('glass')} className={`flex-shrink-0 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${activeAdminTab === 'glass' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                            <Sparkles size={16} /> دیزاینی شووشە
                                        </button>
                                        <button onClick={() => setActiveAdminTab('mobilenav')} className={`flex-shrink-0 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${activeAdminTab === 'mobilenav' ? 'bg-rose-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                            <Sparkles size={16} className="text-rose-400 animate-pulse" /> مۆبایل بار
                                        </button>
                                        <button onClick={() => setActiveAdminTab('oneboard')} className={`flex-shrink-0 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${activeAdminTab === 'oneboard' ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                            <Sparkles size={16} className="text-teal-400 animate-pulse" /> گەشتی وێبسایت
                                        </button>
                                        <button onClick={() => setActiveAdminTab('player')} className={`flex-shrink-0 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${activeAdminTab === 'player' ? 'bg-yellow-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                            <Sparkles size={16} className="text-yellow-400 animate-pulse" /> شوێنی دوگمەکان
                                        </button>
                                        <button onClick={() => setActiveAdminTab('banned')} className={`flex-shrink-0 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${activeAdminTab === 'banned' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
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
                                                            {tmdbSearchResults.map((movie: any, idx: number) => {
                                                                const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
                                                                return (
                                                                    <button
                                                                        key={`${movie.id}-${idx}`}
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

                                        {activeAdminTab === 'carousel' && (() => {
                                            const PREVIEW_MOVIES = heroMovies.slice(0, 5);
                                            const ROUNDED_OPTIONS = ['1rem', '1.5rem', '2rem', '3rem', '4rem'];
                                            const INTERVAL_OPTIONS = [{ label: '5s', val: 5000 }, { label: '8s', val: 8000 }, { label: '10s', val: 10000 }, { label: '15s', val: 15000 }, { label: '20s', val: 20000 }];

                                            const updateSetting = (key: string, value: any) => {
                                                const next = { ...carouselSettings, [key]: value };
                                                setCarouselSettings(next);
                                                localStorage.setItem('carouselSettings', JSON.stringify(next));
                                                window.dispatchEvent(new Event('carousel-settings-updated'));
                                            };

                                            const resetSettings = () => {
                                                const def = { autoplayInterval: 10000, cardCount: 10, cardHeightVh: 65, deckOffset: 8, deckScale: 0.07, gradientStrength: 85, glowOpacity: 35, roundedSize: '3rem', visibleCards: 3 };
                                                setCarouselSettings(def);
                                                localStorage.setItem('carouselSettings', JSON.stringify(def));
                                                window.dispatchEvent(new Event('carousel-settings-updated'));
                                            };

                                            const previewMovie = PREVIEW_MOVIES[carouselPreviewIdx] || PREVIEW_MOVIES[0];
                                            const previewBg = (previewMovie?.backdrop_path?.startsWith('http') || previewMovie?.backdrop_path?.startsWith('data:')) ? previewMovie.backdrop_path : `https://image.tmdb.org/t/p/w780${previewMovie?.backdrop_path || ''}`;

                                            return (
                                                <div className="space-y-5 pb-4">

                                                    {/* Header */}
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h3 className="text-sm font-black uppercase text-white tracking-widest">رێکخستنی کرۆشال</h3>
                                                            <p className="text-[10px] text-gray-500 font-bold mt-0.5">دەکرێت بۆ هەموو بینەران جێبەجێ دەبێت</p>
                                                        </div>
                                                        <button
                                                            onClick={resetSettings}
                                                            className="px-4 py-2 text-[10px] font-black uppercase tracking-widest border border-white/10 text-gray-400 rounded-xl hover:border-brand hover:text-white transition-all"
                                                        >
                                                            ↺ Reset
                                                        </button>
                                                    </div>

                                                    {/* LIVE PREVIEW CARD */}
                                                    {PREVIEW_MOVIES.length > 0 && (
                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-brand">پیشاندانی زیندووی کارتی کرۆشال</span>
                                                                <div className="flex gap-1.5">
                                                                    {PREVIEW_MOVIES.slice(0, carouselSettings.cardCount || 10).map((_, i) => (
                                                                        <button
                                                                            key={i}
                                                                            onClick={() => setCarouselPreviewIdx(i % PREVIEW_MOVIES.length)}
                                                                            className={`rounded-full transition-all duration-300 ${i === carouselPreviewIdx ? 'w-5 h-2 bg-brand' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Preview card stack */}
                                                            <div
                                                                className="relative w-full overflow-hidden bg-black/30 rounded-2xl border border-white/5"
                                                                style={{ height: `${Math.round(carouselSettings.cardHeightVh * 0.45)}vh` }}
                                                            >
                                                                {/* Stacked cards behind */}
                                                                {PREVIEW_MOVIES.slice(0, carouselSettings.visibleCards || 3).map((m, di) => {
                                                                    const d = (di - carouselPreviewIdx + PREVIEW_MOVIES.length) % PREVIEW_MOVIES.length;
                                                                    if (d >= (carouselSettings.visibleCards || 3)) return null;
                                                                    const bg = (m.backdrop_path?.startsWith('http') || m.backdrop_path?.startsWith('data:')) ? m.backdrop_path : `https://image.tmdb.org/t/p/w780${m.backdrop_path || ''}`;
                                                                    return (
                                                                        <div
                                                                            key={m.id}
                                                                            onClick={() => setCarouselPreviewIdx(di)}
                                                                            className={`absolute top-0 left-0 h-full overflow-hidden border border-white/10 shadow-xl transition-all duration-500 ${d > 0 ? 'cursor-pointer' : ''}`}
                                                                            style={{
                                                                                width: '84%',
                                                                                borderRadius: carouselSettings.roundedSize,
                                                                                transform: `translateX(${d * carouselSettings.deckOffset}%) scale(${1 - d * carouselSettings.deckScale})`,
                                                                                zIndex: 30 - d * 10,
                                                                                opacity: d === 0 ? 1 : Math.max(0.15, 0.9 - d * (0.6 / (carouselSettings.visibleCards || 3))),
                                                                                transformOrigin: 'left center',
                                                                            }}
                                                                        >
                                                                            <img src={bg} alt="" className="w-full h-full object-cover absolute inset-0" />
                                                                            {d === 0 && (
                                                                                <div
                                                                                    className="absolute inset-0"
                                                                                    style={{ background: `linear-gradient(to top, rgba(0,0,0,${carouselSettings.gradientStrength / 100}) 0%, rgba(0,0,0,0.3) 40%, transparent 100%)` }}
                                                                                />
                                                                            )}
                                                                            {d === 0 && (
                                                                                <div className="absolute bottom-4 left-4 right-4 z-10 flex items-end justify-between">
                                                                                    <div>
                                                                                        <p className="text-white font-black text-sm drop-shadow-lg truncate max-w-[120px]">{m.kurdishTitle || m.title}</p>
                                                                                        <p className="text-white/50 text-[10px] font-bold mt-0.5">▶ Play Now</p>
                                                                                    </div>
                                                                                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white">
                                                                                        <svg width="10" height="10" fill="currentColor" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.656a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/></svg>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}

                                                                {/* Glow preview */}
                                                                <img
                                                                    src={previewBg}
                                                                    alt=""
                                                                    className="absolute inset-0 w-full h-full object-cover scale-125 blur-[60px] pointer-events-none -z-10"
                                                                    style={{ opacity: carouselSettings.glowOpacity / 100 }}
                                                                />

                                                                {/* Pagination dots preview */}
                                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 bg-black/45 backdrop-blur-2xl px-3 py-1.5 rounded-full border border-white/10 scale-75">
                                                                    {PREVIEW_MOVIES.slice(0, 3).map((_, i) => (
                                                                        <div
                                                                            key={i}
                                                                            className="rounded-full transition-all duration-300 h-1.5"
                                                                            style={{
                                                                                width: i === carouselPreviewIdx % 3 ? 12 : 6,
                                                                                backgroundColor: i === carouselPreviewIdx % 3 ? 'rgba(239, 68, 68, 1)' : 'rgba(255, 255, 255, 0.3)'
                                                                            }}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <p className="text-center text-[9px] text-gray-600 font-bold uppercase tracking-widest">کلیک لەسەر کارتەکانی دواوە بکە بۆ گۆڕین</p>
                                                        </div>
                                                    )}

                                                    {/* ── BANNER BAN LIST ─────────────────────────────── */}
                                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="text-xs font-black uppercase tracking-widest text-white">بانیکردنی فیلمی بانەر</p>
                                                                <p className="text-[10px] text-gray-500 mt-0.5">Ban movies from appearing in the carousel</p>
                                                            </div>
                                                            <span className="text-[9px] font-black uppercase text-brand bg-brand/10 px-2 py-1 rounded-full border border-brand/20">
                                                                {PREVIEW_MOVIES.length} فیلم
                                                            </span>
                                                        </div>
                                                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                                            {PREVIEW_MOVIES.slice(0, carouselSettings.cardCount || 10).map((m) => {
                                                                const poster = (m.backdrop_path?.startsWith('http') || m.backdrop_path?.startsWith('data:'))
                                                                    ? m.backdrop_path
                                                                    : `https://image.tmdb.org/t/p/w300${m.backdrop_path || ''}`;
                                                                const title = m.kurdishTitle || (m as any).title || (m as any).name || 'Unknown';
                                                                return (
                                                                    <div
                                                                        key={m.id}
                                                                        className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 hover:border-white/10 transition-all"
                                                                    >
                                                                        {/* Thumbnail */}
                                                                        <div className="w-14 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                                                                            <img src={poster} alt="" className="w-full h-full object-cover" />
                                                                        </div>
                                                                        {/* Title */}
                                                                        <p className="flex-1 text-[11px] font-bold text-gray-300 truncate">{title}</p>
                                                                        {/* Ban Button */}
                                                                        <button
                                                                            onClick={async () => {
                                                                                const id = String(m.id).replace('custom_', '');
                                                                                if (!window.confirm(`بانیکردنی "${title}"؟\nئەم فیلمە لە کرۆشال دەردەخرێت.`)) return;
                                                                                try {
                                                                                    const ok = await bannedService.banContent(id, (m as any).media_type || 'movie');
                                                                                    if (ok) {
                                                                                        window.dispatchEvent(new CustomEvent('banned-list-updated'));
                                                                                        addNotification({ type: 'success', title: 'بانیکرا ✓', message: `"${title}" لە کرۆشال دەردەخرێت` });
                                                                                    } else {
                                                                                        addNotification({ type: 'error', title: 'هەڵە', message: 'بانیکردن سەرکەوتوو نەبوو' });
                                                                                    }
                                                                                } catch {
                                                                                    addNotification({ type: 'error', title: 'هەڵە', message: 'کێشەی سەرڤەر' });
                                                                                }
                                                                            }}
                                                                            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                                                                        >
                                                                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                                                            بان
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                            {PREVIEW_MOVIES.length === 0 && (
                                                                <p className="text-center text-[10px] text-gray-600 py-4">فیلمی بانەر نەدۆزرایەوە</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* SETTINGS GRID */}

                                                    <div className="grid grid-cols-1 gap-4">

                                                        {/* Card Height */}
                                                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-xs font-black uppercase tracking-widest text-white">بەرزی کارت</p>
                                                                    <p className="text-[10px] text-gray-500 mt-0.5">Card Height</p>
                                                                </div>
                                                                <span className="text-brand font-black text-sm tabular-nums">{carouselSettings.cardHeightVh}vh</span>
                                                            </div>
                                                            <input
                                                                type="range" min={40} max={90} step={5}
                                                                value={carouselSettings.cardHeightVh}
                                                                onChange={(e) => updateSetting('cardHeightVh', parseInt(e.target.value))}
                                                                className="w-full accent-red-500 h-1.5 rounded-full cursor-pointer"
                                                            />
                                                            <div className="flex justify-between text-[9px] text-gray-600 font-bold uppercase">
                                                                <span>Compact 40vh</span><span>Full 90vh</span>
                                                            </div>
                                                        </div>

                                                        {/* Card Count */}
                                                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-xs font-black uppercase tracking-widest text-white">ژمارەی فیلمەکان</p>
                                                                    <p className="text-[10px] text-gray-500 mt-0.5">Number of Slides</p>
                                                                </div>
                                                                <span className="text-brand font-black text-sm tabular-nums">{carouselSettings.cardCount}</span>
                                                            </div>
                                                            <div className="flex gap-2 flex-wrap">
                                                                {[5, 8, 10, 12, 15, 20].map(n => (
                                                                    <button
                                                                        key={n}
                                                                        onClick={() => updateSetting('cardCount', n)}
                                                                        className={`flex-1 min-w-[48px] py-2 rounded-xl text-xs font-black uppercase transition-all ${carouselSettings.cardCount === n ? 'bg-brand text-white' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
                                                                    >
                                                                        {n}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Visible Stack Cards */}
                                                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-xs font-black uppercase tracking-widest text-white">کارتەکانی دواوە (Stack)</p>
                                                                    <p className="text-[10px] text-gray-500 mt-0.5">Visible Stack Cards</p>
                                                                </div>
                                                                <span className="text-brand font-black text-sm tabular-nums">{carouselSettings.visibleCards || 3}</span>
                                                            </div>
                                                            <div className="flex gap-2 flex-wrap">
                                                                {[2, 3, 4, 5].map(n => (
                                                                    <button
                                                                        key={n}
                                                                        onClick={() => updateSetting('visibleCards', n)}
                                                                        className={`flex-1 min-w-[48px] py-2 rounded-xl text-xs font-black uppercase transition-all ${(carouselSettings.visibleCards || 3) === n ? 'bg-brand text-white' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
                                                                    >
                                                                        {n}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Autoplay Speed */}
                                                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-xs font-black uppercase tracking-widest text-white">خێرایی ئۆتۆماتیکی</p>
                                                                    <p className="text-[10px] text-gray-500 mt-0.5">Autoplay Interval</p>
                                                                </div>
                                                                <span className="text-brand font-black text-sm">{carouselSettings.autoplayInterval / 1000}s</span>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {INTERVAL_OPTIONS.map(({ label, val }) => (
                                                                    <button
                                                                        key={val}
                                                                        onClick={() => updateSetting('autoplayInterval', val)}
                                                                        className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all ${carouselSettings.autoplayInterval === val ? 'bg-brand text-white' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
                                                                    >
                                                                        {label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Deck Peek Settings */}
                                                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-5">
                                                            <p className="text-xs font-black uppercase tracking-widest text-white">ڕێکخستنی دێک</p>

                                                            <div className="space-y-3">
                                                                <div className="flex items-center justify-between text-[10px]">
                                                                    <span className="text-gray-400 font-bold uppercase">پڕسازی کارتی دواوە (Peek)</span>
                                                                    <span className="text-brand font-black tabular-nums">{carouselSettings.deckOffset}%</span>
                                                                </div>
                                                                <input
                                                                    type="range" min={3} max={20} step={1}
                                                                    value={carouselSettings.deckOffset}
                                                                    onChange={(e) => updateSetting('deckOffset', parseInt(e.target.value))}
                                                                    className="w-full accent-red-500 h-1.5 rounded-full cursor-pointer"
                                                                />
                                                            </div>

                                                            <div className="space-y-3">
                                                                <div className="flex items-center justify-between text-[10px]">
                                                                    <span className="text-gray-400 font-bold uppercase">بچووکبوونەوەی کارت (Scale)</span>
                                                                    <span className="text-brand font-black tabular-nums">{Math.round(carouselSettings.deckScale * 100)}%</span>
                                                                </div>
                                                                <input
                                                                    type="range" min={2} max={15} step={1}
                                                                    value={Math.round(carouselSettings.deckScale * 100)}
                                                                    onChange={(e) => updateSetting('deckScale', parseInt(e.target.value) / 100)}
                                                                    className="w-full accent-red-500 h-1.5 rounded-full cursor-pointer"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Gradient & Glow */}
                                                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-5">
                                                            <p className="text-xs font-black uppercase tracking-widest text-white">گریدیەنت و گلۆ</p>

                                                            <div className="space-y-3">
                                                                <div className="flex items-center justify-between text-[10px]">
                                                                    <span className="text-gray-400 font-bold uppercase">تاریکی خوارەوە (Gradient)</span>
                                                                    <span className="text-brand font-black tabular-nums">{carouselSettings.gradientStrength}%</span>
                                                                </div>
                                                                <input
                                                                    type="range" min={20} max={100} step={5}
                                                                    value={carouselSettings.gradientStrength}
                                                                    onChange={(e) => updateSetting('gradientStrength', parseInt(e.target.value))}
                                                                    className="w-full accent-red-500 h-1.5 rounded-full cursor-pointer"
                                                                />
                                                                <div className="flex justify-between text-[9px] text-gray-600 font-bold uppercase">
                                                                    <span>Transparent</span><span>Full Black</span>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-3">
                                                                <div className="flex items-center justify-between text-[10px]">
                                                                    <span className="text-gray-400 font-bold uppercase">درەوشانی شوێنەکە (Glow)</span>
                                                                    <span className="text-brand font-black tabular-nums">{carouselSettings.glowOpacity}%</span>
                                                                </div>
                                                                <input
                                                                    type="range" min={0} max={80} step={5}
                                                                    value={carouselSettings.glowOpacity}
                                                                    onChange={(e) => updateSetting('glowOpacity', parseInt(e.target.value))}
                                                                    className="w-full accent-red-500 h-1.5 rounded-full cursor-pointer"
                                                                />
                                                                <div className="flex justify-between text-[9px] text-gray-600 font-bold uppercase">
                                                                    <span>Off</span><span>Intense</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Border Radius */}
                                                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                                                            <div>
                                                                <p className="text-xs font-black uppercase tracking-widest text-white">گۆشەی تەقوایی</p>
                                                                <p className="text-[10px] text-gray-500 mt-0.5">Corner Rounding</p>
                                                            </div>
                                                            <div className="flex gap-2 flex-wrap">
                                                                {ROUNDED_OPTIONS.map(r => (
                                                                    <button
                                                                        key={r}
                                                                        onClick={() => updateSetting('roundedSize', r)}
                                                                        className={`flex-1 min-w-[52px] py-3 text-xs font-black uppercase transition-all border ${carouselSettings.roundedSize === r ? 'bg-brand border-brand text-white' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:border-white/20'}`}
                                                                        style={{ borderRadius: r }}
                                                                    >
                                                                        {r.replace('rem', 'r')}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Status Banner */}
                                                        <div className="flex items-center gap-4 bg-green-500/5 border border-green-500/20 rounded-2xl px-5 py-4">
                                                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                                                            <div>
                                                                <p className="text-xs font-black uppercase text-green-400 tracking-widest">دەستکاریەکان بەکارهێنرا</p>
                                                                <p className="text-[10px] text-gray-500 font-bold mt-0.5">
                                                                    کرۆشال بە{' '}
                                                                    <span className="text-white">{carouselSettings.cardCount} فیلمی نوێ</span>
                                                                    {' '}بە{' '}
                                                                    <span className="text-white">{carouselSettings.autoplayInterval / 1000} چرکە</span>
                                                                    {' '}خۆکارانە دەگۆڕدرێت
                                                                </p>
                                                            </div>
                                                        </div>

                                                    </div>
                                                </div>
                                            );
                                        })()}




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

                                        {activeAdminTab === 'servers' && (
                                            <div className="space-y-5 pb-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className="text-sm font-black text-brand uppercase tracking-widest flex items-center gap-1.5">
                                                            <Server size={14} /> Server Priorities Configuration / ڕیزبەندی سێرڤەرەکان
                                                        </h3>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                                                            Drag servers up/down to configure global prioritization.
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveServerOrder}
                                                        disabled={isSavingServers || serversList.length === 0}
                                                        className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black font-black uppercase text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 active:scale-95 shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                                                    >
                                                        {isSavingServers ? (
                                                            <RefreshCw size={14} className="animate-spin" />
                                                        ) : (
                                                            'Save Order'
                                                        )}
                                                    </button>
                                                </div>

                                                {isLoadingServers ? (
                                                    <div className="py-20 flex justify-center"><RefreshCw className="animate-spin text-yellow-500" /></div>
                                                ) : serversList.length === 0 ? (
                                                    <div className="py-20 text-center text-gray-500 font-bold uppercase tracking-widest italic opacity-30">No Servers Registered</div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {serversList.map((server, index) => {
                                                            let friendlyName = server.server_name;
                                                            if (server.server_name === 'FLKRD SERVER') friendlyName = 'VidKing (Server 1)';
                                                            else if (server.server_name === 'FLKRD SERVER 1') friendlyName = 'Videasy (Server 2)';
                                                            else if (server.server_name === 'FLKRD SERVER 2') friendlyName = 'VidLink Pro (Server 3)';
                                                            else if (server.server_name === 'FLKRD SERVER 3') friendlyName = 'VidSrc (Server 4)';
                                                            else if (server.server_name === 'FLKRD SERVER 4') friendlyName = 'SuperEmbed (Server 5)';
                                                            else if (server.server_name === 'FLKRD SERVER 5') friendlyName = 'CinePro (Server 6)';
                                                            else if (server.server_name === 'FLKRD SERVER 6') friendlyName = 'VidSrc.pro (Server 7)';
                                                            else if (server.server_name === 'FLKRD SERVER 7') friendlyName = 'VidSrc-embed.ru (Server 8)';

                                                            return (
                                                                <div key={server.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 transition-all hover:bg-white/10">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="w-8 h-8 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center font-black text-sm">
                                                                            {index + 1}
                                                                        </span>
                                                                        <div>
                                                                            <p className="text-white font-black uppercase text-xs tracking-tighter">{friendlyName}</p>
                                                                            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Database Identifier: {server.server_name} • Priority Score: {server.priority}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            type="button"
                                                                            disabled={index === 0}
                                                                            onClick={() => moveServer(index, 'up')}
                                                                            className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all"
                                                                            aria-label="Move Up"
                                                                        >
                                                                            <ArrowUp size={16} />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            disabled={index === serversList.length - 1}
                                                                            onClick={() => moveServer(index, 'down')}
                                                                            className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all"
                                                                            aria-label="Move Down"
                                                                        >
                                                                            <ArrowDown size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
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

                                        {activeAdminTab === 'glass' && (
                                            <GlassCustomizer />
                                        )}

                                        {activeAdminTab === 'mobilenav' && (
                                            <MobileNavCustomizer />
                                        )}

                                        {activeAdminTab === 'oneboard' && (
                                            <OnboardingCustomizer />
                                        )}

                                        {activeAdminTab === 'player' && (
                                            <PlayerControlsCustomizer />
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
                                                        {tmdbSearchResults.map((movie: any, idx: number) => {
                                                            const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
                                                            return (
                                                                <button
                                                                    key={`${movie.id}-${idx}`}
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

const GlassCustomizer: React.FC = () => {
    const { glassConfig, updateGlassConfig } = useUI();
    const { addNotification } = useNotification();
    const [localConfig, setLocalConfig] = useState(glassConfig);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setLocalConfig(glassConfig);
    }, [glassConfig]);

    const handleSave = async () => {
        setIsSaving(true);
        const success = await updateGlassConfig(localConfig);
        setIsSaving(false);
        if (success) {
            addNotification({
                type: 'success',
                title: 'تۆمار کرا',
                message: 'دیزاینەکە بە سەرکەوتوویی بڵاوکرایەوە بۆ هەموو بەکارهێنەران!'
            });
        } else {
            addNotification({
                type: 'error',
                title: 'کێشەیەک ڕوویدا',
                message: 'پەیوەندی سەرنەکەوت لەگەڵ سێرڤەر.'
            });
        }
    };

    return (
        <div className="space-y-6 pb-6 text-right" dir="rtl">
            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">کۆنتڕۆڵی دیزاینی شووشە (Glassmorphism Settings)</h3>
                <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
                    لەم بەشەدا دەتوانیت لێڵی، ڕوونی، و ڕەنگی بەشە شووشەییەکانی تەواوی وێب سایتەکە بگۆڕیت. هەر گۆڕانکارییەک تۆمار بکەیت ڕاستەوخۆ بۆ هەموو بەکارهێنەرانی ئەپ و وێب سایتەکە جێبەجێ دەبێت لە هەمان چرکەدا.
                </p>
            </div>

            <div className="space-y-4">
                {/* 1. Blur Amount Slider */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                        <span>ڕادەی لێڵی پاشبنەما (Blur)</span>
                        <span className="font-mono text-brand">{localConfig.blurAmount}px</span>
                    </div>
                    <input
                        type="range"
                        min="5"
                        max="120"
                        step="1"
                        value={localConfig.blurAmount}
                        onChange={(e) => setLocalConfig({ ...localConfig, blurAmount: Number(e.target.value) })}
                        className="w-full accent-brand bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
                        <span>5px</span><span>60px</span><span>120px</span>
                    </div>
                </div>

                {/* 2. Saturation Slider */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                        <span>تێربوونی ڕەنگ (Saturation)</span>
                        <span className="font-mono text-brand">{localConfig.saturation}%</span>
                    </div>
                    <input
                        type="range"
                        min="50"
                        max="250"
                        value={localConfig.saturation}
                        onChange={(e) => setLocalConfig({ ...localConfig, saturation: Number(e.target.value) })}
                        className="w-full accent-brand bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/* 3. Red Tint Opacity */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                        <span>ڕوونی تیشکی سوور (Red Tint Opacity)</span>
                        <span className="font-mono text-brand">{Math.round(localConfig.redOpacity * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="80"
                        value={Math.round(localConfig.redOpacity * 100)}
                        onChange={(e) => setLocalConfig({ ...localConfig, redOpacity: Number(e.target.value) / 100 })}
                        className="w-full accent-brand bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/* 4. Dark Base Opacity */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                        <span>تاریکی بنەڕەتی (Dark Base Opacity)</span>
                        <span className="font-mono text-brand">{Math.round(localConfig.darkOpacity * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="10"
                        max="95"
                        value={Math.round(localConfig.darkOpacity * 100)}
                        onChange={(e) => setLocalConfig({ ...localConfig, darkOpacity: Number(e.target.value) / 100 })}
                        className="w-full accent-brand bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/* 5. Border Opacity */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                        <span>ڕوونی چوارچێوەی بەشەکان (Border Opacity)</span>
                        <span className="font-mono text-brand">{Math.round(localConfig.borderOpacity * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="90"
                        value={Math.round(localConfig.borderOpacity * 100)}
                        onChange={(e) => setLocalConfig({ ...localConfig, borderOpacity: Number(e.target.value) / 100 })}
                        className="w-full accent-brand bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/* 6. Liquid Glass Displacement Bending */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                        <span>ڕادەی چەمانەوەی شووشەیی (Displacement Scale)</span>
                        <span className="font-mono text-brand">{localConfig.displacementScale}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="120"
                        value={localConfig.displacementScale}
                        onChange={(e) => setLocalConfig({ ...localConfig, displacementScale: Number(e.target.value) })}
                        className="w-full accent-brand bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/* 7. Aberration Intensity */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                        <span>ڕادەی لادانی ڕەنگی شووشەیی (Aberration Intensity)</span>
                        <span className="font-mono text-brand">{localConfig.aberrationIntensity}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="15"
                        value={localConfig.aberrationIntensity}
                        onChange={(e) => setLocalConfig({ ...localConfig, aberrationIntensity: Number(e.target.value) })}
                        className="w-full accent-brand bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/* 8. Elasticity */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                        <span>نەرمی و جیڕی لەرینەوە (Elasticity)</span>
                        <span className="font-mono text-brand">{Math.round(localConfig.elasticity * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="10"
                        max="90"
                        value={Math.round(localConfig.elasticity * 100)}
                        onChange={(e) => setLocalConfig({ ...localConfig, elasticity: Number(e.target.value) / 100 })}
                        className="w-full accent-brand bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/* 9. Corner Radius */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                        <span>ڕادەی بازنەیی گۆشەکان (Corner Radius)</span>
                        <span className="font-mono text-brand">{localConfig.cornerRadius}px</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="50"
                        value={localConfig.cornerRadius}
                        onChange={(e) => setLocalConfig({ ...localConfig, cornerRadius: Number(e.target.value) })}
                        className="w-full accent-brand bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/* 10. Glow Intensity */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                        <span>ڕووناکی برووسکی دەوروبەر (Glow Intensity)</span>
                        <span className="font-mono text-brand">{Math.round((localConfig.glowIntensity ?? 0.4) * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={Math.round((localConfig.glowIntensity ?? 0.4) * 100)}
                        onChange={(e) => setLocalConfig({ ...localConfig, glowIntensity: Number(e.target.value) / 100 })}
                        className="w-full accent-brand bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/* 11. Shine / Highlight Brightness */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                        <span>ڕووناکی تیشکی ژوورەوە (Shine Highlight)</span>
                        <span className="font-mono text-brand">{Math.round((localConfig.shineBrightness ?? 0.12) * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="60"
                        step="1"
                        value={Math.round((localConfig.shineBrightness ?? 0.12) * 100)}
                        onChange={(e) => setLocalConfig({ ...localConfig, shineBrightness: Number(e.target.value) / 100 })}
                        className="w-full accent-brand bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/* 12. Toggle Jelly/Bounce Animation */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-[11px] font-black uppercase text-gray-400">ئەنیمەیشنی جیری (Jelly Bounce)</span>
                    <button
                        onClick={() => setLocalConfig({ ...localConfig, enableJelly: !(localConfig.enableJelly ?? true) })}
                        className={`relative w-12 h-6 rounded-full transition-all duration-300 ${(localConfig.enableJelly ?? true) ? 'bg-brand' : 'bg-white/10'
                            }`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${(localConfig.enableJelly ?? true) ? 'translate-x-6' : 'translate-x-0'
                            }`} />
                    </button>
                </div>

            </div>

            {/* Live Preview Container */}
            <div className="mt-6 p-5 bg-black/60 border border-white/5 rounded-[1.8rem] space-y-3">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">پێشبینی ڕاستەوخۆ (Live Preview)</span>

                {/* Simulated Glass Element */}
                <div
                    className="relative border overflow-hidden transition-all duration-300"
                    style={{
                        borderRadius: `${localConfig.cornerRadius}px`,
                        borderStyle: 'solid',
                        borderColor: `rgba(var(--brand-red-rgb), ${localConfig.borderOpacity})`,
                    }}
                >
                    {/* Isolated Liquid-Glass background overlay */}
                    <div
                        className="absolute inset-0 z-0 transition-all duration-300 pointer-events-none overflow-hidden"
                        style={{
                            background: `radial-gradient(circle at 50% 0%, rgba(var(--brand-red-rgb), ${localConfig.redOpacity}), transparent 80%), rgba(10, 10, 10, ${localConfig.darkOpacity})`,
                            backdropFilter: `blur(${localConfig.blurAmount}px) saturate(${localConfig.saturation}%)`,
                            WebkitBackdropFilter: `blur(${localConfig.blurAmount}px) saturate(${localConfig.saturation}%)`,
                            borderRadius: `${localConfig.cornerRadius}px`,
                            boxShadow: `
                              inset 0 1px 0 0 rgba(255, 255, 255, ${(localConfig.shineBrightness ?? 0.12) + localConfig.borderOpacity * 0.35}),
                              inset ${localConfig.aberrationIntensity * 0.15}px 0 0.5px rgba(255, 0, 80, 0.08),
                              inset -${localConfig.aberrationIntensity * 0.15}px 0 0.5px rgba(0, 200, 255, 0.08),
                              inset 0 -1px 0 0 rgba(0, 0, 0, 0.4),
                              0 20px 40px rgba(0,0,0,0.65),
                              0 0 ${Math.round((localConfig.glowIntensity ?? 0.4) * 60)}px rgba(var(--brand-red-rgb), ${(localConfig.glowIntensity ?? 0.4) * 0.4})
                            `
                        }}
                    >
                        {/* Smooth sheen overlay — NO jelly, linear pan only */}
                        {localConfig.displacementScale > 0 && (
                            <div
                                className="absolute inset-0 pointer-events-none mix-blend-overlay"
                                style={{
                                    background: `linear-gradient(105deg, transparent 30%, rgba(255,255,255,${(localConfig.shineBrightness ?? 0.12) * 0.6}) 50%, transparent 70%)`,
                                    animation: `glass-sheen-pan ${20 * (1 / Math.max(0.1, localConfig.elasticity))}s linear infinite`,
                                    opacity: (localConfig.displacementScale / 120),
                                }}
                            />
                        )}
                    </div>
                    {/* Sharp content above background overlay */}
                    <div className="relative z-10 p-6 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-xs font-black">F</div>
                        <div className="text-right">
                            <span className="text-xs font-black text-white block leading-none">FLKRD Stream Core</span>
                            <span className="text-[8px] text-gray-400 font-bold uppercase mt-1 block">Live Preview Node</span>
                        </div>
                        <div className="ml-auto text-right">
                            <span className="text-[9px] font-mono text-brand">{localConfig.blurAmount}px blur</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Action */}
            <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full mt-4 py-4 rounded-[1.5rem] bg-brand hover:bg-brand/90 text-white text-[10px] font-[1000] uppercase tracking-[0.3em] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
                {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
                تۆمارکردن و بڵاوکردنەوە بۆ هەمووان (Save & Apply)
            </button>
        </div>
    );
};

const MobileNavCustomizer: React.FC = () => {
    const { mobileNavConfig, updateMobileNavConfig } = useUI();
    const { addNotification } = useNotification();
    const [localConfig, setLocalConfig] = useState<any>(mobileNavConfig);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setLocalConfig(mobileNavConfig);
    }, [mobileNavConfig]);

    if (!localConfig) return null;

    // Hex to RGB parser
    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };

    // RGB to Hex helper
    const rgbToHex = (r: number, g: number, b: number) => {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const success = await updateMobileNavConfig(localConfig);
        setIsSaving(false);
        if (success) {
            addNotification({
                type: 'success',
                title: 'تۆمار کرا',
                message: 'ڕێکخستنی ناڤیگەیشن مۆبایل بە سەرکەوتوویی بڵاوکرایەوە بۆ هەموو بەکارهێنەران!'
            });
        } else {
            addNotification({
                type: 'error',
                title: 'کێشەیەک ڕوویدا',
                message: 'پەیوەندی سەرنەکەوت لەگەڵ سێرڤەر.'
            });
        }
    };

    const currentColorHex = rgbToHex(
        localConfig.colorR ?? 220,
        localConfig.colorG ?? 38,
        localConfig.colorB ?? 38
    );

    const handleColorChange = (hex: string) => {
        const rgb = hexToRgb(hex);
        if (rgb) {
            setLocalConfig({
                ...localConfig,
                colorR: rgb.r,
                colorG: rgb.g,
                colorB: rgb.b
            });
        }
    };

    return (
        <div className="space-y-6 pb-6 text-right animate-fadeIn" dir="rtl">
            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">ڕێکخستنی ناڤیگەیشن بار بۆ مۆبایل (Mobile Navigation Customizer)</h3>
                <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
                    لەم بەشەدا دەتوانیت دیزاین، پان و بەرینی، و جۆری دوگمەکان لەگەڵ شێوازی پاشبنەمای ناڤیگەیشن باری مۆبایل بگۆڕیت. هەر گۆڕانکارییەک بکەیت ڕاستەوخۆ بۆ هەموو بەکارهێنەران چالاک دەبێت.
                </p>
            </div>

            <div className="space-y-5">
                {/* 1. Theme Color Customizer */}
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest border-b border-white/5 pb-2">ڕەنگی تەوەرە و درەوشانەوە (Theme Color Settings)</h4>

                    {/* Theme color picker */}
                    <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-right">
                            <span className="text-[11px] font-black uppercase text-gray-400 block mb-0.5">ڕەنگی بنەڕەتی بار (Accent Color)</span>
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Hex Code: {currentColorHex} • RGB: ({localConfig.colorR}, {localConfig.colorG}, {localConfig.colorB})</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={currentColorHex}
                                onChange={(e) => handleColorChange(e.target.value)}
                                className="w-12 h-12 rounded-xl bg-transparent border-0 cursor-pointer overflow-hidden p-0"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Layout Dimensions & Padding */}
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest border-b border-white/5 pb-2">سایز، ڕەهەندەکان و شێواز (Dimensions & Sizing)</h4>

                    {/* Capsule Width */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                            <span>پانی بارەکە (Capsule Width / Span)</span>
                            <span className="font-mono text-rose-500">{localConfig.capsuleWidth}%</span>
                        </div>
                        <input
                            type="range" min="70" max="100" step="1"
                            value={localConfig.capsuleWidth}
                            onChange={(e) => setLocalConfig({ ...localConfig, capsuleWidth: Number(e.target.value) })}
                            className="w-full accent-rose-600 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Height */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                            <span>بەرزی بارەکە (Bar Height / Thickness)</span>
                            <span className="font-mono text-rose-500">{localConfig.height}px</span>
                        </div>
                        <input
                            type="range" min="40" max="65" step="1"
                            value={localConfig.height}
                            onChange={(e) => setLocalConfig({ ...localConfig, height: Number(e.target.value) })}
                            className="w-full accent-rose-600 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Icon Size */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                            <span>سایزی ئایکۆنەکان (Icon Size / Scaling)</span>
                            <span className="font-mono text-rose-500">{localConfig.iconSize}px</span>
                        </div>
                        <input
                            type="range" min="12" max="22" step="1"
                            value={localConfig.iconSize}
                            onChange={(e) => setLocalConfig({ ...localConfig, iconSize: Number(e.target.value) })}
                            className="w-full accent-rose-600 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Items Gap */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                            <span>مەودای نێوان دوگمەکان (Spacing / Gap)</span>
                            <span className="font-mono text-rose-500">{localConfig.itemsGap}px</span>
                        </div>
                        <input
                            type="range" min="0" max="16" step="1"
                            value={localConfig.itemsGap}
                            onChange={(e) => setLocalConfig({ ...localConfig, itemsGap: Number(e.target.value) })}
                            className="w-full accent-rose-600 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Bottom Offset */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                            <span>مەودا لە خوارەوەی شاشە (Bottom Margin Offset)</span>
                            <span className="font-mono text-rose-500">{localConfig.bottomOffset}px</span>
                        </div>
                        <input
                            type="range" min="5" max="50" step="1"
                            value={localConfig.bottomOffset}
                            onChange={(e) => setLocalConfig({ ...localConfig, bottomOffset: Number(e.target.value) })}
                            className="w-full accent-rose-600 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Border Radius */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                            <span>ڕادەی بازنەیی گۆشەکان (Border Radius / Roundness)</span>
                            <span className="font-mono text-rose-500">
                                {localConfig.borderRadius === 9999 ? 'Fully Rounded (Pill)' : `${localConfig.borderRadius}px`}
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <input
                                type="range" min="0" max="32" step="1"
                                disabled={localConfig.borderRadius === 9999}
                                value={localConfig.borderRadius === 9999 ? 32 : localConfig.borderRadius}
                                onChange={(e) => setLocalConfig({ ...localConfig, borderRadius: Number(e.target.value) })}
                                className="flex-1 accent-rose-600 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-40"
                            />
                            <button
                                onClick={() => setLocalConfig({
                                    ...localConfig,
                                    borderRadius: localConfig.borderRadius === 9999 ? 24 : 9999
                                })}
                                className={`px-4 py-2 text-[10px] font-[1000] uppercase tracking-widest rounded-xl border transition-all ${localConfig.borderRadius === 9999
                                        ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                                    }`}
                            >
                                Capsule Pill
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. Glassmorphism Aesthetics */}
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest border-b border-white/5 pb-2">شێوازی شووشە و پاشبنەما (Aesthetics)</h4>

                    {/* Background Type */}
                    <div className="space-y-1.5 text-right">
                        <span className="text-[11px] font-black uppercase text-gray-400 block mb-1">جۆری پاشبنەما (Background Type)</span>
                        <select
                            value={localConfig.bgType}
                            onChange={(e) => setLocalConfig({ ...localConfig, bgType: Number(e.target.value) })}
                            className="w-full bg-[#151515] border border-white/10 text-white rounded-xl py-3 px-4 text-xs font-black focus:outline-none focus:border-rose-500 transition-colors"
                        >
                            <option value={0}>شووشەی فلوید (Liquid Glass - Red Gradient overlay)</option>
                            <option value={1}>شووشەی پاک (Pure Glassmorphism - No gradient overlay)</option>
                            <option value={2}>تاریکی ڕەها (Solid Matte Black)</option>
                            <option value={3}>سووری تاریکی بۆرگندی (Burgundy Wine Glass)</option>
                        </select>
                    </div>

                    {/* Active Pill Type */}
                    <div className="space-y-1.5 text-right">
                        <span className="text-[11px] font-black uppercase text-gray-400 block mb-1">شێوازی دیاریکردنی دوگمەی چالاک (Active Tab Style)</span>
                        <select
                            value={localConfig.pillType}
                            onChange={(e) => setLocalConfig({ ...localConfig, pillType: Number(e.target.value) })}
                            className="w-full bg-[#151515] border border-white/10 text-white rounded-xl py-3 px-4 text-xs font-black focus:outline-none focus:border-rose-500 transition-colors"
                        >
                            <option value={0}>گلووی پڕی سووری نایاب (Premium Solid Red-Rose Gradient)</option>
                            <option value={1}>چوارچێوەی سووری ڕوون (Red Border Outline)</option>
                            <option value={2}>شوشەی سادەی سپی (Minimalist Ice White Glow)</option>
                        </select>
                    </div>

                    {/* Blur Amount */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                            <span>لێڵی پاشبنەما (Blur)</span>
                            <span className="font-mono text-rose-500">{localConfig.blurAmount}px</span>
                        </div>
                        <input
                            type="range" min="0" max="45" step="1"
                            value={localConfig.blurAmount}
                            onChange={(e) => setLocalConfig({ ...localConfig, blurAmount: Number(e.target.value) })}
                            className="w-full accent-rose-600 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Red Opacity */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                            <span>ڕادەی ڕووناکی سوور (Red Tint Opacity)</span>
                            <span className="font-mono text-rose-500">{localConfig.redOpacity}%</span>
                        </div>
                        <input
                            type="range" min="0" max="100" step="1"
                            value={localConfig.redOpacity}
                            onChange={(e) => setLocalConfig({ ...localConfig, redOpacity: Number(e.target.value) })}
                            className="w-full accent-rose-600 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Dark Opacity */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                            <span>ڕادەی تاریکی پاشبنەما (Dark Opacity)</span>
                            <span className="font-mono text-rose-500">{localConfig.darkOpacity}%</span>
                        </div>
                        <input
                            type="range" min="10" max="100" step="1"
                            value={localConfig.darkOpacity}
                            onChange={(e) => setLocalConfig({ ...localConfig, darkOpacity: Number(e.target.value) })}
                            className="w-full accent-rose-600 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Border Opacity */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                            <span>ڕادەی چوارچێوەی بەشەکان (Border Opacity)</span>
                            <span className="font-mono text-rose-500">{localConfig.borderOpacity}%</span>
                        </div>
                        <input
                            type="range" min="0" max="100" step="1"
                            value={localConfig.borderOpacity}
                            onChange={(e) => setLocalConfig({ ...localConfig, borderOpacity: Number(e.target.value) })}
                            className="w-full accent-rose-600 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>

                {/* 4. Items Visibilities & Buttons order */}
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-3.5">
                    <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest border-b border-white/5 pb-2">دوگمە و بەشەکان (Nav Tabs & Visibility)</h4>

                    {/* Show Sparkles */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[11px] font-black uppercase text-gray-400">دوگمەی پۆڕتاڵی بەردەوامبوون (Sparkles Portal Button)</span>
                        <button
                            onClick={() => setLocalConfig({ ...localConfig, showSparkles: localConfig.showSparkles === 1 ? 0 : 1 })}
                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${localConfig.showSparkles === 1 ? 'bg-rose-600' : 'bg-white/10'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${localConfig.showSparkles === 1 ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Show Home */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[11px] font-black uppercase text-gray-400">دوگمەی سەرەکی (Home Tab)</span>
                        <button
                            onClick={() => setLocalConfig({ ...localConfig, showHome: localConfig.showHome === 1 ? 0 : 1 })}
                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${localConfig.showHome === 1 ? 'bg-rose-600' : 'bg-white/10'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${localConfig.showHome === 1 ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Show Trending */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[11px] font-black uppercase text-gray-400">دوگمەی ترێندینگ/شۆرتس (Trending Shorts Tab)</span>
                        <button
                            onClick={() => setLocalConfig({ ...localConfig, showTrending: localConfig.showTrending === 1 ? 0 : 1 })}
                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${localConfig.showTrending === 1 ? 'bg-rose-600' : 'bg-white/10'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${localConfig.showTrending === 1 ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Show TV */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[11px] font-black uppercase text-gray-400">دوگمەی زنجیرەکان/کەلەندەر (TV Shows Tab)</span>
                        <button
                            onClick={() => setLocalConfig({ ...localConfig, showTv: localConfig.showTv === 1 ? 0 : 1 })}
                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${localConfig.showTv === 1 ? 'bg-rose-600' : 'bg-white/10'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${localConfig.showTv === 1 ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Show Dubbed */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[11px] font-black uppercase text-gray-400">دوگمەی فیلمە دۆبلاژکراوەکان (Dubbed Movies Tab)</span>
                        <button
                            onClick={() => setLocalConfig({ ...localConfig, showDubbed: localConfig.showDubbed === 1 ? 0 : 1 })}
                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${localConfig.showDubbed === 1 ? 'bg-rose-600' : 'bg-white/10'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${localConfig.showDubbed === 1 ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Show Studios */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[11px] font-black uppercase text-gray-400">دوگمەی ستۆدیۆکان (Studios Tab)</span>
                        <button
                            onClick={() => setLocalConfig({ ...localConfig, showStudios: localConfig.showStudios === 1 ? 0 : 1 })}
                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${localConfig.showStudios === 1 ? 'bg-rose-600' : 'bg-white/10'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${localConfig.showStudios === 1 ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Show Discover */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[11px] font-black uppercase text-gray-400">دوگمەی دۆزینەوە (Discover Tab)</span>
                        <button
                            onClick={() => setLocalConfig({ ...localConfig, showDiscover: localConfig.showDiscover === 1 ? 0 : 1 })}
                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${localConfig.showDiscover === 1 ? 'bg-rose-600' : 'bg-white/10'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${localConfig.showDiscover === 1 ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Show List */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[11px] font-black uppercase text-gray-400">دوگمەی لیستی من (My List Tab)</span>
                        <button
                            onClick={() => setLocalConfig({ ...localConfig, showList: localConfig.showList === 1 ? 0 : 1 })}
                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${localConfig.showList === 1 ? 'bg-rose-600' : 'bg-white/10'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${localConfig.showList === 1 ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Show Search */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[11px] font-black uppercase text-gray-400">دوگمەی گەڕان (Search Tab)</span>
                        <button
                            onClick={() => setLocalConfig({ ...localConfig, showSearch: localConfig.showSearch === 1 ? 0 : 1 })}
                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${localConfig.showSearch === 1 ? 'bg-rose-600' : 'bg-white/10'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${localConfig.showSearch === 1 ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Save Action */}
            <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full mt-4 py-4 rounded-[1.5rem] bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-[1000] uppercase tracking-[0.3em] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
                {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
                تۆمارکردن و بڵاوکردنەوەی ناو بار مۆبایل (Save & Apply Mobile Nav)
            </button>
        </div>
    );
};

const PlayerControlsCustomizer: React.FC = () => {
    const { playerConfig, updatePlayerConfig } = useUI();
    const { addNotification } = useNotification();
    const [localConfig, setLocalConfig] = useState<any>(playerConfig);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setLocalConfig(playerConfig);
    }, [playerConfig]);

    if (!localConfig) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const success = await updatePlayerConfig(localConfig);
            if (success) {
                addNotification({
                    type: 'success',
                    title: 'سەرکەوتوو بوو',
                    message: 'شوێن و دیزاینی دوگمەکانی پلەیەر بە سەرکەوتوویی بۆ هەمووان نوێکرایەوە!'
                });
            } else {
                throw new Error("Failed to save");
            }
        } catch (e) {
            addNotification({
                type: 'error',
                title: 'کێشەیەک هەیە',
                message: 'تۆمارکردنی شوێنی دوگمەکان سەرنەکەوت.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 text-right" style={{ direction: 'rtl' }}>
            <div className="flex flex-col gap-2">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Sparkles className="text-yellow-500" size={16} />
                    ڕێکخستنی شوێنی دوگمەکانی پلەیەر (Player Controls Position)
                </h3>
                <p className="text-[10px] text-gray-400">
                    لێرەوە دەتوانیت شوێنی دوگمە نێوخۆییەکانی پلەیەر (وەک CC، Episodes، Relink، Fullscreen) بگۆڕیت بۆ سەرەوە یان خوارەوەی شاشەی فیلمەکە.
                </p>
            </div>

            {/* Simulated Live Preview Box */}
            <div className="space-y-2">
                <span className="text-[11px] font-black uppercase text-gray-400 block text-right">دیمەنی تاقیکاری پلەیەر (Live Player Preview)</span>
                <div className="relative w-full h-44 bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
                    {/* Simulated video track */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(229,9,20,0.08)_0%,transparent_70%)]" />
                    
                    {/* Play Button in Center */}
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 relative z-10 shadow-lg">
                        <Play size={20} fill="currentColor" className="ml-1" />
                    </div>

                    {/* Simulated Close button Top-Left */}
                    <div className="absolute top-3 left-3 w-7 h-7 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-gray-400">
                        <X size={12} />
                    </div>

                    {/* Simulated Watermark logo */}
                    <div className="absolute top-3 left-12 w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 text-xs font-black">
                        F
                    </div>

                    {/* Action buttons (The ones we are moving) */}
                    <div 
                        className="absolute flex items-center gap-1.5 transition-all duration-300"
                        style={{
                            top: localConfig.controlsAlign === 0 ? `${localConfig.controlsOffset * 0.75}px` : 'auto',
                            bottom: localConfig.controlsAlign === 1 ? `${localConfig.controlsOffset * 0.75}px` : 'auto',
                            left: 'auto',
                            right: '0.75rem',
                        }}
                    >
                        <div className="bg-red-600 border border-red-500 text-white rounded-lg px-2 py-1 text-[8px] font-black uppercase flex items-center gap-1 shadow-md">
                            <Tv size={10} />
                            <span>EPISODES</span>
                        </div>
                        <div className="bg-white/10 border border-white/20 text-white/90 rounded-lg px-2 py-1 text-[8px] font-black uppercase flex items-center gap-1">
                            <Subtitles size={10} />
                            <span>CC</span>
                        </div>
                        <div className="bg-white/10 border border-white/20 text-white/90 rounded-lg px-2 py-1 text-[8px] font-black uppercase flex items-center gap-1">
                            <RefreshCcw size={10} />
                            <span>RELINK</span>
                        </div>
                        <div className="bg-white/10 border border-white/20 text-white/90 rounded-lg px-2 py-1 text-[8px] font-black uppercase flex items-center gap-1">
                            <Maximize size={10} />
                            <span>FULL</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Customizer controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                {/* Position Type */}
                <div className="space-y-1.5 text-right">
                    <span className="text-[11px] font-black uppercase text-gray-400 block mb-1">ئاراستەی نیشاندان (Alignment)</span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setLocalConfig({ ...localConfig, controlsAlign: 0 })}
                            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${
                                localConfig.controlsAlign === 0
                                    ? 'bg-rose-600 text-white border border-rose-500 shadow-lg shadow-rose-600/20'
                                    : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            سەرەوە (Top Controls)
                        </button>
                        <button
                            type="button"
                            onClick={() => setLocalConfig({ ...localConfig, controlsAlign: 1 })}
                            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${
                                localConfig.controlsAlign === 1
                                    ? 'bg-rose-600 text-white border border-rose-500 shadow-lg shadow-rose-600/20'
                                    : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            خوارەوە (Bottom Controls)
                        </button>
                    </div>
                </div>

                {/* Vertical Offset */}
                <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                        <span>دووری لە لێوارەکەوە (Offset Range)</span>
                        <span className="font-mono text-rose-500 font-bold">{localConfig.controlsOffset}px</span>
                    </div>
                    <input
                        type="range" min="0" max="500" step="2"
                        value={localConfig.controlsOffset}
                        onChange={(e) => setLocalConfig({ ...localConfig, controlsOffset: Number(e.target.value) })}
                        className="w-full accent-rose-600 bg-white/10 h-2 rounded-lg appearance-none cursor-pointer"
                    />
                    {/* Quick Presets */}
                    <div className="flex gap-1.5 pt-1">
                        {[
                            { label: 'خوارەوە (20px)', val: 20 },
                            { label: 'سەرەوە (120px)', val: 120 },
                            { label: 'زۆر بەرز (240px)', val: 240 },
                            { label: 'لوتکە (380px)', val: 380 }
                        ].map(p => (
                            <button
                                key={p.val}
                                type="button"
                                onClick={() => setLocalConfig({ ...localConfig, controlsOffset: p.val })}
                                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                                    localConfig.controlsOffset === p.val
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-4 rounded-[1.5rem] bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-[1000] uppercase tracking-[0.3em] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
                {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
                سەیڤکردن و کاراکردن بۆ هەمووان (Save & Apply Player Layout)
            </button>
        </div>
    );
};

const OnboardingCustomizer: React.FC = () => {
    const [steps, setSteps] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState<number | null>(null); // tracks step ID being saved
    const [isCreating, setIsCreating] = useState(false);
    const { addNotification } = useNotification();

    // New Step form states
    const [newStepKey, setNewStepKey] = useState('');
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newMedia, setNewMedia] = useState('');
    const [newSelector, setNewSelector] = useState('');
    const [newPriority, setNewPriority] = useState(10);

    const fetchSteps = async () => {
        try {
            const { data, error } = await supabase
                .from('onboarding_steps')
                .select('*')
                .order('priority', { ascending: true });
            if (error) throw error;
            if (data) setSteps(data);
        } catch (e) {
            console.error("Failed to load onboarding steps:", e);
        }
    };

    useEffect(() => {
        fetchSteps();
    }, []);

    const handleUpdateStep = async (stepId: number, updatedFields: any) => {
        setIsSaving(stepId);
        try {
            const { error } = await supabase
                .from('onboarding_steps')
                .update(updatedFields)
                .eq('id', stepId);

            if (error) throw error;
            addNotification({
                type: 'success',
                title: 'تۆمار کرا',
                message: 'هەنگاوی ڕێبەرەکە بە سەرکەوتوویی نوێکرایەوە!'
            });
            fetchSteps();
        } catch (e) {
            addNotification({
                type: 'error',
                title: 'کێشەیەک ڕوویدا',
                message: 'پەیوەندی لەگەڵ سێرڤەر سەرنەکەوت.'
            });
        } finally {
            setIsSaving(null);
        }
    };

    const handleDeleteStep = async (stepId: number) => {
        if (!confirm('ئایا دڵنیایت لە سڕینەوەی ئەم هەنگاوە؟')) return;
        try {
            const { error } = await supabase
                .from('onboarding_steps')
                .delete()
                .eq('id', stepId);

            if (error) throw error;
            addNotification({
                type: 'success',
                title: 'سڕایەوە',
                message: 'هەنگاوەکە بە سەرکەوتوویی سڕایەوە.'
            });
            fetchSteps();
        } catch (e) {
            addNotification({
                type: 'error',
                title: 'کێشەیەک ڕوویدا',
                message: 'سەرنەکەوت لە سڕینەوە.'
            });
        }
    };

    const handleCreateStep = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStepKey || !newTitle || !newDesc) {
            alert('تکایە خانە سەرەکییەکان پڕ بکەرەوە!');
            return;
        }

        setIsCreating(true);
        try {
            const { error } = await supabase
                .from('onboarding_steps')
                .insert([{
                    step_key: newStepKey,
                    title_ku: newTitle,
                    description_ku: newDesc,
                    media_url: newMedia || null,
                    selector: newSelector || null,
                    priority: Number(newPriority)
                }]);

            if (error) throw error;
            addNotification({
                type: 'success',
                title: 'زیاد کرا',
                message: 'هەنگاوی نوێ بە سەرکەوتوویی بۆ گەشتەکە زیاد کرا!'
            });

            // Reset form
            setNewStepKey('');
            setNewTitle('');
            setNewDesc('');
            setNewMedia('');
            setNewSelector('');
            setNewPriority(10);

            fetchSteps();
        } catch (e: any) {
            addNotification({
                type: 'error',
                title: 'کێشەیەک ڕوویدا',
                message: e.message || 'پەیوەندی سەرنەکەوت.'
            });
        } finally {
            setIsCreating(false);
        }
    };

    const triggerTestTour = () => {
        window.dispatchEvent(new CustomEvent('flkrd_start_onboarding_tour'));
        addNotification({
            type: 'info',
            title: 'تاقیکردنەوەی گەشت',
            message: 'ڕێبەری گەشتەکە ئێستا چالاک بوو بۆ پێداچوونەوەی ناوخۆیی!'
        });
    };

    return (
        <div className="space-y-6 pb-6 text-right animate-fadeIn" dir="rtl">

            {/* Intro */}
            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between gap-4">
                <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">ڕێبەری گەشت و فێرکاری وێبسایت (OneBoard Tour Customizer)</h3>
                    <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
                        لەم بەشەدا دەتوانیت سەرجەم هەنگاوەکانی گەشتی فێرکاری وێبسایت بۆ بەکارهێنەرانی سەرەتا بەڕێوەببەیت. دەتوانیت ناونیشان، لێکدانەوە، وێنەی جوڵاو (GIF)، و بەشی لێڵکردن (CSS Selector) بۆ هەر هەنگاوێک دیاری بکەیت.
                    </p>
                </div>
                <button
                    onClick={triggerTestTour}
                    className="flex-shrink-0 px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-[1000] uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-all shadow-md"
                >
                    <Sparkles size={14} className="animate-pulse" /> تاقیکردنەوەی گەشت
                </button>
            </div>

            {/* Steps list */}
            <div className="space-y-4">
                <h4 className="text-xs font-black text-teal-400 uppercase tracking-widest px-1">هەنگاوە تۆمارکراوەکان ({steps.length})</h4>

                {steps.map((step) => (
                    <div
                        key={step.id}
                        className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4 hover:border-teal-500/30 transition-colors"
                    >
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className="text-[10px] font-mono text-gray-500 uppercase">Key: {step.step_key}</span>
                            <button
                                onClick={() => handleDeleteStep(step.id)}
                                className="text-red-500 hover:text-red-400 text-[10px] font-black uppercase tracking-widest"
                            >
                                سڕینەوە
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Title */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400">ناونیشانی هەنگاو (Title - KU)</label>
                                <input
                                    type="text"
                                    defaultValue={step.title_ku}
                                    onBlur={(e) => handleUpdateStep(step.id, { title_ku: e.target.value })}
                                    className="w-full bg-[#151515] border border-white/10 rounded-xl py-2 px-3 text-xs font-bold text-white focus:outline-none focus:border-teal-500 transition-colors"
                                />
                            </div>

                            {/* Selector */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400">بەشی نیشانەکراو (CSS Selector)</label>
                                <input
                                    type="text"
                                    defaultValue={step.selector}
                                    onBlur={(e) => handleUpdateStep(step.id, { selector: e.target.value })}
                                    className="w-full bg-[#151515] border border-white/10 rounded-xl py-2 px-3 text-xs font-bold text-white focus:outline-none focus:border-teal-500 transition-colors"
                                    placeholder="e.g. .global-search-trigger"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400">لێکدانەوە و ڕوونکردنەوە (Description - KU)</label>
                            <textarea
                                defaultValue={step.description_ku}
                                onBlur={(e) => handleUpdateStep(step.id, { description_ku: e.target.value })}
                                rows={2}
                                className="w-full bg-[#151515] border border-white/10 rounded-xl py-2 px-3 text-xs font-bold text-white focus:outline-none focus:border-teal-500 transition-colors resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            {/* Media URL */}
                            <div className="col-span-2 space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400">لینک یان بەستەری GIF/ڤیدیۆ (Demonstration GIF URL)</label>
                                <input
                                    type="text"
                                    defaultValue={step.media_url}
                                    onBlur={(e) => handleUpdateStep(step.id, { media_url: e.target.value })}
                                    className="w-full bg-[#151515] border border-white/10 rounded-xl py-2 px-3 text-xs font-bold text-white focus:outline-none focus:border-teal-500 transition-colors"
                                    placeholder="https://media.giphy.com/..."
                                />
                            </div>

                            {/* Priority */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400">ڕیزبەندی (Priority Order)</label>
                                <input
                                    type="number"
                                    defaultValue={step.priority}
                                    onBlur={(e) => handleUpdateStep(step.id, { priority: Number(e.target.value) })}
                                    className="w-full bg-[#151515] border border-white/10 rounded-xl py-2 px-3 text-xs font-bold text-white focus:outline-none focus:border-teal-500 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Save status */}
                        {isSaving === step.id && (
                            <div className="text-[9px] text-teal-400 font-bold animate-pulse">پاشەکەوت دەکرێت لە Supabase...</div>
                        )}
                    </div>
                ))}
            </div>

            {/* Create New Step Form */}
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                <h4 className="text-xs font-black text-teal-400 uppercase tracking-widest border-b border-white/5 pb-2">زیادکردنی هەنگاوی نوێ (Add New Step)</h4>

                <form onSubmit={handleCreateStep} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400">کلیلی ناسەرەوە (Step Key - Unique)</label>
                            <input
                                type="text"
                                value={newStepKey}
                                onChange={(e) => setNewStepKey(e.target.value)}
                                className="w-full bg-[#151515] border border-white/10 rounded-xl py-2 px-3 text-xs font-bold text-white focus:outline-none focus:border-teal-500 transition-colors"
                                placeholder="e.g. my_list_guide"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400">بەشی نیشانەکراو (CSS Selector)</label>
                            <input
                                type="text"
                                value={newSelector}
                                onChange={(e) => setNewSelector(e.target.value)}
                                className="w-full bg-[#151515] border border-white/10 rounded-xl py-2 px-3 text-xs font-bold text-white focus:outline-none focus:border-teal-500 transition-colors"
                                placeholder="e.g. .my-list-button"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400">ناونیشان (Title - KU)</label>
                            <input
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className="w-full bg-[#151515] border border-white/10 rounded-xl py-2 px-3 text-xs font-bold text-white focus:outline-none focus:border-teal-500 transition-colors"
                                placeholder="بەخێربێیت بۆ لیستی من"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400">ڕیزبەندی (Order)</label>
                            <input
                                type="number"
                                value={newPriority}
                                onChange={(e) => setNewPriority(Number(e.target.value))}
                                className="w-full bg-[#151515] border border-white/10 rounded-xl py-2 px-3 text-xs font-bold text-white focus:outline-none focus:border-teal-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400">لێکدانەوە (Description - KU)</label>
                        <textarea
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                            rows={2}
                            className="w-full bg-[#151515] border border-white/10 rounded-xl py-2 px-3 text-xs font-bold text-white focus:outline-none focus:border-teal-500 transition-colors resize-none"
                            placeholder="لەم لاپەڕەیەدا دەتوانیت سەرجەم فیلمە پاشەکەوتکراوەکانت ببینی..."
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400">بەستەری GIF/وێنەی جوڵاو (Demonstration media URL)</label>
                        <input
                            type="text"
                            value={newMedia}
                            onChange={(e) => setNewMedia(e.target.value)}
                            className="w-full bg-[#151515] border border-white/10 rounded-xl py-2 px-3 text-xs font-bold text-white focus:outline-none focus:border-teal-500 transition-colors"
                            placeholder="https://media.giphy.com/..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isCreating}
                        className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-[1000] uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        {isCreating ? <RefreshCw className="animate-spin" size={14} /> : <Plus size={14} />}
                        زیادکردنی هەنگاوەکە (Add Step)
                    </button>
                </form>
            </div>

        </div>
    );
};

export default DubbedMoviesPage;
