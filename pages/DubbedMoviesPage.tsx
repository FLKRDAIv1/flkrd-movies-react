
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic2, Play, Zap, Share2, X, Send,
    Link as LinkIcon, ArrowLeft, Sparkles,

    Activity, Info, Star, ChevronRight, Share, Copy,
    Trash2, ListVideo, PlusCircle, Edit2, RefreshCw, TrendingUp
} from 'lucide-react';
import { Content } from '../types';
import { fetchData } from '../services/tmdbService';
import { API_KEY, IMAGE_BASE_URL_POSTER, IMAGE_BASE_URL } from '../constants';
import Spinner from '../components/Spinner';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import { supabase } from '../utils/supabaseClient';
import { redis } from '../utils/upstashClient';
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
        />
    );
};

const DecodingText: React.FC<{ text: string }> = ({ text }) => {
    const [displayText, setDisplayText] = React.useState('');
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?@#$%&";

    React.useEffect(() => {
        let iteration = 0;
        const interval = setInterval(() => {
            setDisplayText(text.split("").map((char, index) => {
                if (index < iteration) return text[index];
                return chars[Math.floor(Math.random() * chars.length)];
            }).join(""));
            
            if (iteration >= text.length) clearInterval(interval);
            iteration += 1/3;
        }, 30);
        return () => clearInterval(interval);
    }, [text]);

    return <span className="font-sans font-medium">{displayText}</span>;
};

const LiveGauge: React.FC<{ value: number, color?: string }> = ({ value, color = "rgba(var(--brand-red-rgb), 0.8)" }) => (
    <div className="flex gap-0.5 items-center h-1.5 w-16">
        {[...Array(10)].map((_, i) => (
            <motion.div
                key={i}
                animate={{ 
                    backgroundColor: i / 10 < value ? color : "rgba(255,255,255,0.05)",
                    opacity: i / 10 < value ? [0.4, 1, 0.4] : 1
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                className="h-full w-1 rounded-full"
            />
        ))}
    </div>
);

const ProfessionalHUD: React.FC<{ label: string, value: string, corner: 'tl' | 'tr' | 'bl' | 'br', gaugeValue?: number }> = ({ label, value, corner, gaugeValue }) => {
    const positions = {
        tl: 'top-8 left-8',
        tr: 'top-8 right-8 text-right flex-row-reverse',
        bl: 'bottom-8 left-8',
        br: 'bottom-8 right-8 text-right flex-row-reverse'
    };
    
    return (
        <div className={`absolute ${positions[corner]} flex flex-col gap-2 p-4 bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-xl min-w-[140px]`}>
            <div className="flex flex-col gap-1" dir="rtl">
                <span className="text-[9px] font-sans font-bold text-white/20 tracking-widest uppercase">{label}</span>
                <span className="text-brand font-black text-[11px] tracking-wider">{value}</span>
            </div>
            {gaugeValue !== undefined && <LiveGauge value={gaugeValue} />}
        </div>
    );
};

const AudioPulse: React.FC = () => (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        {[...Array(4)].map((_, i) => (
            <motion.div
                key={i}
                animate={{ 
                    scale: [0.8, 2.5], 
                    opacity: [0, 0.2, 0],
                    borderWidth: ["1px", "0px"]
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    delay: i * 1,
                    ease: "easeOut"
                }}
                className="absolute w-[300px] h-[300px] border-brand/20 rounded-full"
            />
        ))}
    </div>
);

const CinematicLoader: React.FC<{ progress: number, status: string }> = ({ progress, status }) => {
    const [displayStatus, setDisplayStatus] = React.useState("ئامادەکردنی سێرڤەر...");
    const [systemMetrics, setSystemMetrics] = React.useState({ throughput: 0.2, buffer: 0.1, clarity: 0.4 });
    
    React.useEffect(() => {
        const interval = setInterval(() => {
            setSystemMetrics({
                throughput: Math.random() * 0.8 + 0.2,
                buffer: Math.random() * 0.6 + 0.4,
                clarity: Math.random() * 0.5 + 0.5
            });
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    React.useEffect(() => {
        if (status.toLowerCase().includes('initial')) setDisplayStatus("ئەرشیفی فەرمی FLKRD");
        else if (status.toLowerCase().includes('sync')) setDisplayStatus("هاوکاتکردنی داتاکان...");
        else if (status.toLowerCase().includes('query') || status.toLowerCase().includes('fetch')) setDisplayStatus("گەڕان بەدوای فیلمەکاندا...");
        else if (status.toLowerCase().includes('load')) setDisplayStatus("کۆتا قۆناغی بارکردن...");
        else setDisplayStatus(status);
    }, [status]);

    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: 'blur(50px)' }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center overflow-hidden"
        >
            <AudioPulse />
            
            {/* HUD Panels - Master's Console Style */}
            <ProfessionalHUD label="بانکی زانیاری" value="ئەرشیفی سەرەکی" corner="tl" gaugeValue={systemMetrics.throughput} />
            <ProfessionalHUD label="کوالیتی پەخش" value="1080p Ultra" corner="tr" gaugeValue={systemMetrics.clarity} />
            <ProfessionalHUD label="پاراستنی داتا" value="SSL_SECURE" corner="bl" gaugeValue={systemMetrics.buffer} />
            <ProfessionalHUD label="وەشان" value="FLKRD.v2026" corner="br" />

            <div className="relative z-10 flex flex-col items-center gap-20 max-w-sm w-full px-8">
                {/* Brand Identity Focus */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative"
                >
                    <div className="w-36 h-36 bg-black border border-white/5 rounded-[3rem] flex items-center justify-center relative overflow-hidden shadow-[0_0_120px_rgba(var(--brand-red-rgb),0.1)]">
                        <motion.div 
                            animate={{ opacity: [0.2, 0.4, 0.2] }}
                            transition={{ duration: 5, repeat: Infinity }}
                            className="absolute inset-0 bg-gradient-to-tr from-brand/20 via-transparent to-brand/10"
                        />
                        <span className="text-9xl font-black italic text-brand leading-none drop-shadow-[0_0_30px_rgba(var(--brand-red-rgb),0.7)] select-none">F</span>
                    </div>

                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute -inset-8 border border-white/5 border-t-white/20 rounded-[3.5rem]"
                    />
                    
                    <motion.div
                        animate={{ opacity: [0.05, 0.15, 0.05], scale: [1, 1.1, 1] }}
                        transition={{ duration: 6, repeat: Infinity }}
                        className="absolute -inset-16 bg-brand/10 blur-[80px] rounded-full"
                    />
                </motion.div>

                <div className="w-full space-y-10 flex flex-col items-center">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="flex flex-col gap-1 items-center">
                            <span className="text-[10px] font-sans font-bold text-brand/50 tracking-[0.6em] uppercase">SYSTEM_ACTIVATED</span>
                            <p className="text-[13px] font-sans font-black text-brand tracking-[0.2em] opacity-90" dir="rtl">
                                بە کوردی کردنی چیرۆکەکانی جیهان
                            </p>
                        </div>
                        
                        <div className="h-8 flex items-center justify-center bg-white/[0.03] px-6 py-2 rounded-full border border-white/5 backdrop-blur-sm">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={displayStatus}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className="text-[15px] font-sans text-white/90"
                                    dir="rtl"
                                >
                                    <DecodingText text={displayStatus} />
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Enhanced Metadata Stream */}
                    <div className="flex gap-4 opacity-20 font-mono text-[8px] tracking-[0.3em] overflow-hidden whitespace-nowrap mask-linear-fade">
                        <motion.div
                            animate={{ x: [0, -100] }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="flex gap-8"
                        >
                            <span>CODEC: H.265_UHD</span>
                            <span>BITRATE: 8500KBPS</span>
                            <span>AUDIO: 5.1_SURROUND</span>
                            <span>ENCRYPTION: AES_256</span>
                            <span>SERVER: GLOBAL_CDN</span>
                        </motion.div>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                         <div className="w-40 h-[2px] bg-white/5 rounded-full overflow-hidden">
                             <motion.div
                                animate={{ x: ["-100%", "200%"] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 bg-brand w-1/3"
                             />
                         </div>
                         <span className="text-[9px] text-white/20 font-sans tracking-[0.4em] font-bold mt-2">FLKRD MASTER CONSOLE</span>
                    </div>
                </div>
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
    const [shareTarget, setShareTarget] = useState<any>(null);

    const [scrollPosition, setScrollPosition] = useState(0);

    // Admin State
    const [isAdmin, setIsAdmin] = useState(false);
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
        level: 'NEW'
    });
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStep, setUploadStep] = useState('');
    const [activeAdminTab, setActiveAdminTab] = useState<'upload' | 'archive'>('upload');
    const [movieToDelete, setMovieToDelete] = useState<string | null>(null);

    // Edit State Handlers
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [nodeToEdit, setNodeToEdit] = useState<any | null>(null);
    const [editData, setEditData] = useState({ title: '', description: '', videoUrl: '', imageBase64: '', bannerBase64: '', level: 'NEW' });
    const [isUpdating, setIsUpdating] = useState(false);

    const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

    // Advanced Sorting & Filtering State
    const [activeFilter, setActiveFilter] = useState('ALL');

    const navigate = useNavigate();
    const { t, language } = useTranslation();
    const { accentColor } = useUI();
    const { addNotification } = useNotification();
    const [hasNewMovies, setHasNewMovies] = useState(false);
    const [isLive, setIsLive] = useState(false);
    const [visibleCount, setVisibleCount] = useState(24);
    const observerTarget = useRef<HTMLDivElement>(null);


    useEffect(() => {
        const handleScroll = () => setScrollPosition(window.scrollY);
        window.addEventListener('scroll', handleScroll);
        const loadDubbedArchive = async () => {
            const isEstablished = sessionStorage.getItem('zana_protocol_established');
            let resolveLoader: () => void;
            const loaderPromise = new Promise<void>(res => { resolveLoader = res; });

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
                    await setDynamicStatus('PINGING REDIS UPSTASH CLUSTERS...', 400);
                    const cachedMovies = await redis.get('custom_dubbed_movies');
                    if (cachedMovies) {
                        await setDynamicStatus('REDIS HIT: FAST STREAM ACTIVATED...', 300);
                        customMovies = Array.isArray(cachedMovies) ? cachedMovies : JSON.parse(cachedMovies as string);
                    } else {
                        await setDynamicStatus('REDIS MISS: QUERYING ZANA POSTGRES...', 600);
                        const { data } = await supabase.from('dubbed_movies').select('*').order('created_at', { ascending: false });
                        if (data) {
                            customMovies = data;
                            redis.set('custom_dubbed_movies', JSON.stringify(data), { ex: 3600 }).catch(() => { });
                        }
                    }
                } catch (e) {
                    const { data } = await supabase.from('dubbed_movies').select('*').order('created_at', { ascending: false });
                    if (data) customMovies = data;
                } finally {
                    if (customMovies.length > 0) {
                        await setDynamicStatus('APPLYING TAG PRIORITY SORTING ALGORITHMS...', 500);
                        const formattedCustom = customMovies.map((movie: any) => ({
                            ...movie,
                            id: `custom_${movie.id}`,
                            poster_path: movie.imageBase64,
                            backdrop_path: movie.bannerBase64 || movie.imageBase64,
                            title: movie.title,
                            kurdishTitle: movie.title,
                            overview: movie.description,
                            kurdishOverview: movie.description,
                            customStream: movie.videoUrl,
                            media_type: 'movie',
                            level: movie.level || 'KING'
                        }));

                        // Sort NEW movies to appear first, then KING, then BEST, then SPECIAL, then Standard
                        formattedCustom.sort((a, b) => {
                            const priority: { [key: string]: number } = {
                                'NEW': 0,
                                'KING': 1,
                                'BEST': 2,
                                'SPECIAL': 3
                            };
                            const pA = priority[a.level] ?? 99;
                            const pB = priority[b.level] ?? 99;
                            return pA - pB;
                        });

                        const finalMerge = [...formattedCustom];
                        setDubbedContent(finalMerge);
                        await db.saveMovies(finalMerge);
                        await setDynamicStatus(`SYNC COMPLETE. ${finalMerge.length} TOTAL NODES ALIGNED.`, 200);
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

        loadDubbedArchive();

        // --- REAL-TIME SUBSCRIPTION ---
        // This ensures all users see new uploads INSTANTLY
        const channel = supabase
            .channel('public:dubbed_movies')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dubbed_movies' }, (payload) => {
                console.log('Real-time update:', payload);
                if (payload.eventType === 'INSERT') {
                    setHasNewMovies(true);
                    const newMovie = payload.new as any;
                    const formatted = {
                        ...newMovie,
                        id: `custom_${newMovie.id}`,
                        poster_path: newMovie.imageBase64,
                        backdrop_path: newMovie.bannerBase64 || newMovie.imageBase64,
                        kurdishTitle: newMovie.title,
                        kurdishOverview: newMovie.description,
                        customStream: newMovie.videoUrl,
                        media_type: 'movie'
                    };
                    setDubbedContent(prev => {
                        const next = [formatted, ...prev];
                        db.saveMovies(next).catch(console.error);
                        return next;
                    });
                } else if (payload.eventType === 'DELETE') {
                    setDubbedContent(prev => {
                        const next = prev.filter(m => String(m.id) !== `custom_${payload.old.id}`);
                        db.saveMovies(next).catch(console.error);
                        return next;
                    });
                } else if (payload.eventType === 'UPDATE') {
                    setDubbedContent(prev => {
                        const next = prev.map(m => String(m.id) === `custom_${payload.new.id}` ? {
                            ...m,
                            ...payload.new,
                            poster_path: (payload.new as any).imageBase64,
                            backdrop_path: (payload.new as any).bannerBase64 || (payload.new as any).imageBase64
                        } : m);
                        db.saveMovies(next).catch(console.error);
                        return next;
                    });
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') setIsLive(true);
            });

        return () => {
            window.removeEventListener('scroll', handleScroll);
            supabase.removeChannel(channel);
        };
    }, []);

    // Intersection Observer for Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && dubbedContent.length > visibleCount) {
                    setVisibleCount(prev => prev + 24);
                }
            },
            { threshold: 0.5 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [dubbedContent.length, visibleCount]);


    const [isForceSyncing, setIsForceSyncing] = useState(false);

    const forceSync = async () => {
        setIsForceSyncing(true);
        addNotification({ type: 'info', title: 'Network Call', message: 'Re-syncing catalog from Zana Servers directly...' });

        try {
            // Drop cache immediately and force Postgres fetch
            await redis.del('custom_dubbed_movies');
            const { data, error } = await supabase.from('dubbed_movies').select('*').order('created_at', { ascending: false });

            if (data && !error) {
                const formattedCustom = data.map((movie: any) => ({
                    ...movie,
                    id: `custom_${movie.id}`,
                    poster_path: movie.imageBase64,
                    backdrop_path: movie.bannerBase64 || movie.imageBase64,
                    title: movie.title,
                    kurdishTitle: movie.title,
                    overview: movie.description,
                    kurdishOverview: movie.description,
                    customStream: movie.videoUrl,
                    media_type: 'movie',
                    level: movie.level || 'KING'
                }));

                // Strict Priority Re-Sort
                formattedCustom.sort((a, b) => {
                    const priority: { [key: string]: number } = {
                        'NEW': 0, 'KING': 1, 'BEST': 2, 'SPECIAL': 3
                    };
                    const pA = priority[a.level] ?? 99;
                    const pB = priority[b.level] ?? 99;
                    return pA - pB;
                });

                setDubbedContent([...formattedCustom]);
                await db.saveMovies(formattedCustom);

                addNotification({ type: 'success', title: 'Sync Integrity Established', message: `Grid synced with ${formattedCustom.length} active nodes.` });
            } else {
                addNotification({ type: 'error', title: 'Sync Error', message: `Failed to align with Zana Servers. ${error?.message || ''}` });
            }
        } catch (e: any) {
            addNotification({ type: 'error', title: 'Network Outage', message: `Operation failed. ${e?.message || ''}` });
        } finally {
            setIsForceSyncing(false);
        }
    };

    // Auto-play the Hero Banner Carousel
    const heroMovies = dubbedContent.slice(0, 5);
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

    const handleShare = (e: React.MouseEvent, item: any) => {
        e.stopPropagation();
        setShareTarget(item);
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
                        level: uploadData.level
                    }
                ]);

            if (error) throw error;

            setUploadProgress(80);
            setUploadStep('Optimizing cache protocols...');

            // 2. Pre-warm Redis and Local Cache
            const { data: freshList } = await supabase.from('dubbed_movies').select('*').order('created_at', { ascending: false });
            if (freshList) {
                await redis.set('custom_dubbed_movies', JSON.stringify(freshList), { ex: 3600 }).catch(() => { });

                // Formulate the local cache immediately
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
                    media_type: 'movie'
                }));

                db.saveMovies(formattedCustom).catch(console.error);
            }

            setUploadProgress(100);
            addNotification({ type: 'success', title: 'Transmission Success', message: 'Movie synchronized globally.' });
            setShowUploadModal(false);
            setUploadData({ title: '', description: '', videoUrl: '', imageBase64: '', bannerBase64: '', level: 'NEW' });
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
            videoUrl: movie.customStream || '',
            imageBase64: movie.imageBase64 || movie.poster_path || '',
            bannerBase64: movie.bannerBase64 || movie.backdrop_path || '',
            level: movie.level || 'NEW'
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateMovieSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nodeToEdit) return;
        setIsUpdating(true);

        try {
            const isSupabaseMovie = typeof nodeToEdit.id === 'string' && nodeToEdit.id.startsWith('custom_');

            if (isSupabaseMovie) {
                const dbId = nodeToEdit.id.startsWith('custom_') ? nodeToEdit.id.replace('custom_', '') : nodeToEdit.id;
                // Update in Supabase
                const { error } = await supabase
                    .from('dubbed_movies')
                    .update({
                        title: editData.title,
                        description: editData.description,
                        videoUrl: editData.videoUrl,
                        imageBase64: editData.imageBase64,
                        bannerBase64: editData.bannerBase64,
                        level: editData.level
                    })
                    .eq('id', dbId);

                if (error) throw error;

                // Sync Upstash Redis Cache
                try {
                    const cacheStr = await redis.get('custom_dubbed_movies');
                    if (cacheStr) {
                        let cachedMovies = JSON.parse(cacheStr);
                        cachedMovies = cachedMovies.map((m: any) =>
                            m.id === dbId
                                ? { ...m, ...editData, customStream: editData.videoUrl, poster_path: editData.imageBase64, backdrop_path: editData.bannerBase64 }
                                : m
                        );
                        await redis.set('custom_dubbed_movies', JSON.stringify(cachedMovies));
                    }
                } catch (cacheErr) {
                    console.error("Cache sync failed:", cacheErr);
                }
            }

            // Sync Local State IMMEDIATELY
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
                            imageBase64: editData.imageBase64,
                            poster_path: editData.imageBase64,
                            bannerBase64: editData.bannerBase64,
                            backdrop_path: editData.bannerBase64,
                            level: editData.level
                        };
                    }
                    return item;
                });
                db.saveMovies(next).catch(console.error);
                return next;
            });
            addNotification({ type: 'success', title: 'Update Complete', message: 'Movie details have been updated.' });
            setIsEditModalOpen(false);
            setNodeToEdit(null);
        } catch (error: any) {
            console.error('Update error:', error);
            addNotification({ type: 'error', title: 'Update Failed', message: error.message || 'Failed to update movie.' });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteMovie = (id: string) => {
        setMovieToDelete(id);
    };

    const confirmDelete = async () => {
        if (!movieToDelete) return;
        try {
            const rawId = movieToDelete.startsWith('custom_') ? movieToDelete.replace('custom_', '') : movieToDelete;
            const { error } = await supabase.from('dubbed_movies').delete().eq('id', rawId);
            if (error) throw error;

            // 2. Pre-warm Redis and Local Cache
            const { data: freshList } = await supabase.from('dubbed_movies').select('*').order('created_at', { ascending: false });
            if (freshList) {
                await redis.set('custom_dubbed_movies', JSON.stringify(freshList), { ex: 3600 }).catch(() => { });

                // Instantly update from local UI State
                setDubbedContent(prev => {
                    const next = prev.filter(m => String(m.id) !== String(movieToDelete));
                    db.saveMovies(next).catch(console.error);
                    return next;
                });
            } else {
                await redis.del('custom_dubbed_movies');
                setDubbedContent(prev => {
                    const next = prev.filter(m => String(m.id) !== String(movieToDelete));
                    db.saveMovies(next).catch(console.error);
                    return next;
                });
            }

            // Force the Premium Hero Banner to reset to 0 so it doesn't try to load an out-of-bounds index
            setCurrentHeroIndex(0);

            addNotification({ type: 'success', title: 'Movie Deleted', message: 'Movie has been successfully deleted.' });
        } catch (err: any) {
            console.error(err);
            addNotification({ type: 'error', title: 'Termination Failed', message: err.message || 'Could not delete the movie.' });
        } finally {
            setMovieToDelete(null);
        }
    };

    const filteredContent = dubbedContent; // Removed search filtering for now to focus on stability.

    const featuredMovie = dubbedContent[0];

    return (
        <div className="min-h-screen bg-transparent text-white selection:bg-brand selection:text-white pb-40 overflow-x-hidden">
            <AnimatePresence>
                {loading && <CinematicLoader progress={loadingProgress} status={loadingStatus} />}
            </AnimatePresence>

            {/* Neural Floating Header */}
            <div className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 px-6 py-4 md:px-12 md:py-8 flex items-center justify-between pointer-events-none`}>
                <button
                    onClick={() => navigate(-1)}
                    className="pointer-events-auto bg-black/40 backdrop-blur-3xl border border-white/10 p-4 rounded-2xl text-white hover:bg-brand transition-all shadow-2xl group active:scale-95"
                >
                    {language === 'ku' ? <ArrowLeft size={20} className="rotate-180 group-hover:translate-x-1 transition-transform" /> : <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />}
                </button>
                <div className={`transition-all duration-500 flex flex-col items-center ${scrollPosition > 150 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                    <div className="bg-brand/10 backdrop-blur-2xl border border-brand/20 px-6 py-2 rounded-full flex items-center gap-2">
                        <Activity size={12} className={isLive ? "text-green-500 animate-pulse" : "text-brand animate-pulse"} />
                        <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isLive ? "text-green-500" : "text-brand"}`}>
                            {isLive ? "LIVE PROTOCOL ENABLED" : "DUBBED MOVIES"}
                        </span>
                    </div>
                </div>
                <div className="w-12 h-12" />
            </div>

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
                                    <div className="flex items-center gap-3 bg-white/5 backdrop-blur-3xl border border-white/10 px-5 py-2 rounded-full shadow-2xl">
                                        {heroMovies[currentHeroIndex]?.level === 'KING' ? (
                                            <>
                                                <Star size={14} fill="gold" className="text-yellow-500 animate-pulse" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500 italic">KING PREMIERE</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={14} className="text-brand animate-pulse" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white italic">PREMIUM SOURCE</span>
                                            </>
                                        )}
                                    </div>

                                    <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-[7.5rem] font-[1000] uppercase italic tracking-tighter leading-[0.85] drop-shadow-[0_20px_50px_rgba(0,0,0,1)] text-white max-w-5xl selection:bg-white selection:text-black">
                                        {language === 'ku' ? heroMovies[currentHeroIndex]?.kurdishTitle : heroMovies[currentHeroIndex]?.title}
                                    </h1>

                                    <div className="flex items-center gap-6 mt-2">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-brand/20 border border-brand/30 rounded-lg">
                                            <Activity size={12} className="text-brand" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-brand">ULTRA HD 4K</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
                                            <Mic2 size={12} className="text-gray-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">DUBBED KURDISH</span>
                                        </div>
                                    </div>

                                    <p className="text-gray-300 text-sm md:text-xl font-medium italic line-clamp-3 max-w-3xl drop-shadow-xl leading-relaxed mt-2 bg-black/40 p-6 rounded-[2rem] backdrop-blur-3xl border border-white/10">
                                        {language === 'ku' ? heroMovies[currentHeroIndex]?.kurdishOverview : heroMovies[currentHeroIndex]?.overview}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-5 mt-4">
                                        <motion.button
                                            whileHover={{ scale: 1.05, x: 10 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handlePlay(heroMovies[currentHeroIndex])}
                                            className="bg-white text-black font-[1000] px-16 py-7 rounded-[2.5rem] flex items-center gap-5 text-sm md:text-2xl uppercase italic tracking-tighter shadow-[0_30px_60px_rgba(255,255,255,0.1)] transition-all hover:bg-brand hover:text-white"
                                        >
                                            <Play size={28} fill="currentColor" /> {t('play')}
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.1, rotate: 5 }}
                                            onClick={(e) => handleShare(e, heroMovies[currentHeroIndex])}
                                            className="bg-white/5 backdrop-blur-3xl border border-white/10 p-7 rounded-[2.5rem] text-white transition-all hover:bg-white/10 shadow-2xl"
                                        >
                                            <Share2 size={28} />
                                        </motion.button>
                                    </div>
                                </motion.div>
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
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-brand/10 rounded-2xl border border-brand/20 shadow-[0_0_20px_rgba(var(--brand-red-rgb),0.2)]">
                                <span className="text-2xl font-black italic text-brand">F</span>
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-500 italic">ZANA SERVERS LINK</span>
                        </div>

                        <h2 className="text-5xl md:text-8xl font-[1000] uppercase italic tracking-tighter text-white shimmer-text">
                            {t('dubbedMovies')}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={forceSync}
                            disabled={isForceSyncing}
                            className={`bg-white/5 backdrop-blur-3xl border border-white/10 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-2xl transition-all ${isForceSyncing ? 'text-brand pointer-events-none' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                        >
                            <RefreshCw size={18} className={isForceSyncing ? "animate-spin fast-spin" : "animate-spin-slow"} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{isForceSyncing ? 'Syncing...' : 'Force Sync'}</span>
                        </motion.button>

                        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 px-8 py-5 rounded-[2rem] flex items-center gap-5 shadow-2xl">
                            <div className="relative">
                                <Activity size={20} className="text-brand" />
                                <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 bg-brand/50 rounded-full blur-sm" />
                            </div>
                            <span className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em]">{dubbedContent.length} UPLOADED MOVIES</span>
                        </div>
                    </div>
                </div>

                {/* --- User Manual Filtering Array --- */}
                <div className="flex overflow-x-auto gap-3 pb-4 mb-8 custom-scrollbar scroll-smooth snap-x">
                    <button
                        onClick={() => setActiveFilter('ALL')}
                        className={`shrink-0 snap-start px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 border ${activeFilter === 'ALL' ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'bg-black/50 text-gray-400 border-white/10 hover:border-white/30 hover:text-white'}`}
                    >
                        <ListVideo size={14} /> Full Hub
                    </button>
                    <button
                        onClick={() => setActiveFilter('NEW')}
                        className={`shrink-0 snap-start px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 border ${activeFilter === 'NEW' ? 'bg-brand text-white border-brand shadow-[0_0_20px_rgba(var(--brand-red-rgb),0.5)]' : 'bg-black/50 text-gray-400 border-white/10 hover:border-brand hover:text-white'}`}
                    >
                        <Sparkles size={14} /> New Arrivals
                    </button>
                    <button
                        onClick={() => setActiveFilter('KING')}
                        className={`shrink-0 snap-start px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 border ${activeFilter === 'KING' ? 'bg-yellow-500 text-black border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)]' : 'bg-black/50 text-gray-400 border-white/10 hover:border-yellow-500 hover:text-white'}`}
                    >
                        <Star size={14} fill={activeFilter === 'KING' ? 'black' : 'none'} /> King Premiere
                    </button>
                    <button
                        onClick={() => setActiveFilter('BEST')}
                        className={`shrink-0 snap-start px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 border ${activeFilter === 'BEST' ? 'bg-orange-500 text-white border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)]' : 'bg-black/50 text-gray-400 border-white/10 hover:border-orange-500 hover:text-white'}`}
                    >
                        <TrendingUp size={14} /> Top Trending
                    </button>
                    <button
                        onClick={() => setActiveFilter('SPECIAL')}
                        className={`shrink-0 snap-start px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 border ${activeFilter === 'SPECIAL' ? 'bg-purple-500 text-white border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)]' : 'bg-black/50 text-gray-400 border-white/10 hover:border-purple-500 hover:text-white'}`}
                    >
                        <Zap size={14} /> Special Event
                    </button>
                </div>

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
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8 md:gap-14 px-4 md:px-12">
                        {dubbedContent.filter(movie => activeFilter === 'ALL' || movie.level === activeFilter).slice(0, visibleCount).map((movie, index) => (

                            <motion.div
                                key={movie.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                onClick={() => navigate(`/dubbed-details/${movie.id}`)}
                                className="group cursor-pointer relative"
                            >
                                <div className="relative aspect-[2/3] rounded-[2.5rem] md:rounded-[4rem] overflow-hidden border border-white/10 shadow-2xl transition-all duration-700 group-hover:scale-[1.05] group-hover:border-brand/50 group-hover:shadow-[0_40px_80px_rgba(0,0,0,0.8)]">
                                    <LazyBase64Image
                                        src={movie.imageBase64 || (movie.poster_path?.startsWith('data:') || movie.poster_path?.startsWith('http') ? movie.poster_path : `${IMAGE_BASE_URL}${movie.poster_path}`)}
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
                                        {language === 'ku' ? movie.kurdishTitle : movie.title}
                                    </h3>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Infinite Scroll Sensor */}
                <div ref={observerTarget} className="h-20 w-full flex items-center justify-center mt-10">
                    {dubbedContent.length > visibleCount && (
                        <div className="flex flex-col items-center gap-3">
                            <RefreshCw size={24} className="text-brand animate-spin" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Hydrating More Content...</span>
                        </div>
                    )}
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
                                    </div>

                                    <div className="overflow-y-auto pr-2 custom-scrollbar">
                                        {activeAdminTab === 'upload' ? (
                                            <form onSubmit={handleUploadMovie} className="space-y-5 pb-4 pl-1">
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
                                        ) : (
                                            <div className="space-y-4 pb-4">
                                                {dubbedContent.filter(m => m.customStream && m.imageBase64).length === 0 ? (
                                                    <div className="text-center py-10 text-gray-500 text-sm font-bold uppercase tracking-widest bg-black/50 rounded-2xl border border-white/5">
                                                        No Movies Found
                                                    </div>
                                                ) : (
                                                    dubbedContent.filter(m => m.customStream && (m.imageBase64 || m.poster_path)).map((movie, idx) => (
                                                        <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-black/40 border border-white/10 p-4 rounded-2xl group hover:border-brand/30 transition-colors relative">
                                                            <img src={movie.poster_path || movie.imageBase64} alt="" className="w-full sm:w-16 h-32 sm:h-24 object-cover rounded-xl shadow-lg border border-white/5" />
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
