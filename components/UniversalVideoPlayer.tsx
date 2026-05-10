import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Shield, ShieldCheck, Activity, X, Search, ArrowRight, Sparkles } from 'lucide-react';
import Spinner from './Spinner';
import { useQuantumAdBlocker } from '../hooks/useQuantumAdBlocker';
import AdGuardOnboarding from './AdGuardOnboarding';
import { AnimatePresence, motion } from 'framer-motion';
import { subtitleService } from '../services/subtitleService';

interface UniversalVideoPlayerProps {
    src: string;
    onLoad?: () => void;
    accentColor?: string;
    language?: string;
    onProgress?: (data: any) => void;
    subtitleUrl?: string;
    imdbId?: string;
    contentType?: 'movie' | 'tv';
    season?: number;
    episode?: number;
}

declare global {
    interface Window {
        Hls: any;
    }
}

const getLanguageFlag = (langCode: string) => {
    const code = langCode?.toLowerCase();
    const defaultFlag = <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Flag_of_the_United_Nations.svg" alt="UN" className="w-4 h-3 object-cover rounded-[2px] shadow-sm" />;
    
    if (!code) return defaultFlag;
    if (code === 'ku' || code === 'ckb') {
        return <img src="https://upload.wikimedia.org/wikipedia/commons/3/35/Flag_of_Kurdistan.svg" alt="Kurdistan" className="w-4 h-3 object-cover rounded-[2px] shadow-sm border border-white/10" />;
    }
    
    const flagMap: Record<string, string> = {
        'en': 'us', 'eng': 'us', 'en-us': 'us', 'en-gb': 'gb',
        'ar': 'sa', 'ara': 'sa',
        'fa': 'ir', 'per': 'ir', 'fas': 'ir',
        'tr': 'tr', 'tur': 'tr',
        'fr': 'fr', 'fre': 'fr', 'fra': 'fr',
        'de': 'de', 'ger': 'de', 'deu': 'de',
        'es': 'es', 'spa': 'es',
        'it': 'it', 'ita': 'it',
        'ru': 'ru', 'rus': 'ru',
        'zh': 'cn', 'chi': 'cn', 'zho': 'cn',
        'ja': 'jp', 'jpn': 'jp',
        'ko': 'kr', 'kor': 'kr',
        'hi': 'in', 'hin': 'in',
        'nl': 'nl', 'dut': 'nl', 'nld': 'nl',
        'pt': 'pt', 'por': 'pt',
        'pl': 'pl', 'pol': 'pl',
        'sv': 'se', 'swe': 'se',
        'no': 'no', 'nor': 'no',
        'da': 'dk', 'dan': 'dk',
        'fi': 'fi', 'fin': 'fi',
        'cs': 'cz', 'cze': 'cz', 'ces': 'cz',
        'sk': 'sk', 'slo': 'sk', 'slk': 'sk',
        'hu': 'hu', 'hun': 'hu',
        'ro': 'ro', 'rum': 'ro', 'ron': 'ro',
        'bg': 'bg', 'bul': 'bg',
        'el': 'gr', 'gre': 'gr', 'ell': 'gr',
        'he': 'il', 'heb': 'il',
        'id': 'id', 'ind': 'id',
        'ms': 'my', 'may': 'my', 'msa': 'my',
        'th': 'th', 'tha': 'th',
        'vi': 'vn', 'vie': 'vn',
        'uk': 'ua', 'ukr': 'ua',
        'sr': 'rs', 'srp': 'rs',
        'hr': 'hr', 'hrv': 'hr',
        'sl': 'si', 'slv': 'si',
        'et': 'ee', 'est': 'ee',
        'lv': 'lv', 'lav': 'lv',
        'lt': 'lt', 'lit': 'lt',
        'sq': 'al', 'alb': 'al', 'sqi': 'al',
        'mk': 'mk', 'mac': 'mk', 'mkd': 'mk',
        'bs': 'ba', 'bos': 'ba',
        'is': 'is', 'ice': 'is', 'isl': 'is',
        'ka': 'ge', 'geo': 'ge', 'kat': 'ge',
        'hy': 'am', 'arm': 'am', 'hye': 'am',
        'az': 'az', 'aze': 'az',
        'kk': 'kz', 'kaz': 'kz',
        'uz': 'uz', 'uzb': 'uz',
        'ur': 'pk', 'urd': 'pk',
        'bn': 'bd', 'ben': 'bd',
        'ta': 'in', 'tam': 'in',
        'te': 'in', 'tel': 'in',
        'ml': 'in', 'mal': 'in',
        'mr': 'in', 'mar': 'in',
        'gu': 'in', 'guj': 'in',
        'kn': 'in', 'kan': 'in',
        'pa': 'in', 'pan': 'in',
        'my': 'mm', 'bur': 'mm', 'mya': 'mm',
        'km': 'kh', 'khm': 'kh',
        'lo': 'la', 'lao': 'la',
        'am': 'et', 'amh': 'et',
        'sw': 'ke', 'swa': 'ke',
        'af': 'za', 'afr': 'za',
        'zu': 'za', 'zul': 'za',
        'xh': 'za', 'xho': 'za',
        'ig': 'ng', 'ibo': 'ng',
        'yo': 'ng', 'yor': 'ng',
        'ha': 'ng', 'hau': 'ng',
        'ne': 'np', 'nep': 'np',
        'si': 'lk', 'sin': 'lk',
        'tl': 'ph', 'tgl': 'ph',
        'mn': 'mn', 'mon': 'mn'
    };
    
    const countryCode = flagMap[code];
    if (countryCode) {
        return <img src={`https://flagcdn.com/${countryCode}.svg`} alt={code} className="w-4 h-3 object-cover rounded-[2px] shadow-sm border border-white/10" />;
    }
    return defaultFlag;
};

const UniversalVideoPlayer: React.FC<UniversalVideoPlayerProps> = React.memo(({ src, onLoad, accentColor, language, onProgress, subtitleUrl, imdbId, contentType, season, episode }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isHls, setIsHls] = useState(false);
    const [isIframe, setIsIframe] = useState(false);
    const [loading, setLoading] = useState(true);
    const [hlsError, setHlsError] = useState(false);
    const [showAdGuardOnboarding, setShowAdGuardOnboarding] = useState(false);
    const [subtitleSize, setSubtitleSize] = useState(24);
    const [subtitleColor, setSubtitleColor] = useState('#ffffff');
    const [subtitleOffset, setSubtitleOffset] = useState(0);
    const [showSubSettings, setShowSubSettings] = useState(false);
    const [availableSubs, setAvailableSubs] = useState<SubtitleResult[]>([]);
    const [isSearchingSubs, setIsSearchingSubs] = useState(false);
    const [localSubtitleUrl, setLocalSubtitleUrl] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [subtitleCues, setSubtitleCues] = useState<{start: number, end: number, text: string}[]>([]);
    const [subSearchQuery, setSubSearchQuery] = useState('');
    const [subBgOpacity, setSubBgOpacity] = useState(0.4);
    const [subBlur, setSubBlur] = useState(true);

    // Sync local subtitle with prop or selected
    useEffect(() => {
        if (subtitleUrl) setLocalSubtitleUrl(subtitleUrl);
        
        // Load saved styles
        const savedSize = localStorage.getItem('sub_size');
        const savedColor = localStorage.getItem('sub_color');
        const savedOpacity = localStorage.getItem('sub_opacity');
        const savedBlur = localStorage.getItem('sub_blur');

        if (savedSize) setSubtitleSize(Number(savedSize));
        if (savedColor) setSubtitleColor(savedColor);
        if (savedOpacity) setSubBgOpacity(Number(savedOpacity));
        if (savedBlur) setSubBlur(savedBlur === 'true');
    }, [subtitleUrl]);

    // Save styles when changed
    useEffect(() => {
        localStorage.setItem('sub_size', subtitleSize.toString());
        localStorage.setItem('sub_color', subtitleColor);
        localStorage.setItem('sub_opacity', subBgOpacity.toString());
        localStorage.setItem('sub_blur', subBlur.toString());
    }, [subtitleSize, subtitleColor, subBgOpacity, subBlur]);

    const handleSearchAllSubs = async () => {
        if (!imdbId || !contentType) return;
        setIsSearchingSubs(true);
        try {
            const results = await subtitleService.searchSubtitles(imdbId, contentType, season, episode, 'ku', true);
            setAvailableSubs(results);
        } catch (e) {
            console.error("Manual search error:", e);
        } finally {
            setIsSearchingSubs(false);
        }
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        
        // Handle Tauri Fullscreen
        import('../utils/tauriUtils').then(({ isTauri }) => {
            if (isTauri()) {
                import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
                    const win = getCurrentWindow();
                    win.isFullscreen().then(f => win.setFullscreen(!f));
                });
                return;
            }

            // Handle Browser Fullscreen
            if (!document.fullscreenElement) {
                containerRef.current?.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        });
    };

    const handleSelectSub = async (sub: SubtitleResult) => {
        setIsSearchingSubs(true);
        try {
            const text = await subtitleService.downloadSubtitle(sub);
            
            if (text) {
                // Process VTT (SRT-to-VTT + Offset)
                let processedText = text;
                if (!processedText.startsWith('WEBVTT')) {
                    processedText = 'WEBVTT\n\n' + processedText.replace(/(\d+:\d+:\d+),(\d+)/g, '$1.$2').replace(/^\d+$/gm, '');
                }
                
                if (subtitleOffset !== 0) {
                    processedText = subtitleService.shiftVtt(processedText, subtitleOffset);
                }

                // Store cues for overlay
                const cues = subtitleService.parseVtt(processedText);
                setSubtitleCues(cues);

                // Create blob for native track fallback (HLS)
                const blob = new Blob([processedText], { type: 'text/vtt' });
                setLocalSubtitleUrl(URL.createObjectURL(blob));
                setShowSubSettings(false);
            }
        } catch (e) {
            console.error("Subtitle selection error:", e);
            alert(language === 'ku' ? 'ناتوانرێت ئەم ژێرنووسە لۆد بکرێت. تکایە دانەیەکی تر تاقی بکەرەوە.' : 'Failed to load this subtitle. Please try another track.');
        } finally {
            setIsSearchingSubs(false);
        }
    };

    useEffect(() => {
        const hasSeenOnboarding = localStorage.getItem('flkrd_adguard_guide_shown');
        if (!hasSeenOnboarding) {
            setShowAdGuardOnboarding(true);
        }
    }, []);

    const handleOnboardingComplete = () => {
        setShowAdGuardOnboarding(false);
        localStorage.setItem('flkrd_adguard_guide_shown', 'true');
    };

    const triggerAdGuardGuide = () => {
        setShowAdGuardOnboarding(true);
    };

    const lastSrc = useRef<string>('');
    const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Quantum Ad Shield — blocks pop-ups and overlays injected by embed providers
    useQuantumAdBlocker(true);

    // Stabilize onProgress callback to prevent listener flapping
    const onProgressRef = useRef(onProgress);
    useEffect(() => {
        onProgressRef.current = onProgress;
    }, [onProgress]);

    // Listen for postMessage events from VidKing & other providers
    const handlePlayerMessages = useCallback((event: MessageEvent) => {
        try {
            // Security check: only allow trusted origins if possible, but for universal player we allow all
            const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            
            if (!payload) return;

            // Log time updates for debugging if needed
            // console.log("[PLAYER MESSAGE]", payload);

            let newTime = undefined;

            // VidKing / Vjs format
            if (payload.type === 'timeupdate' || payload.type === 'vjs-timeupdate') {
                newTime = payload.data?.currentTime || payload.currentTime || payload.seconds;
            } 
            // SuperEmbed / Generic format
            else if (payload.event === 'timeupdate' || payload.event === 'media_time') {
                newTime = payload.text || payload.data || payload.time;
            }
            // Other common formats
            else if (payload.currentTime !== undefined) {
                newTime = payload.currentTime;
            } else if (payload.data?.currentTime !== undefined) {
                newTime = payload.data.currentTime;
            }

            if (newTime !== undefined) {
                const timeAsNum = Number(newTime);
                if (!isNaN(timeAsNum)) {
                    setCurrentTime(timeAsNum);
                    if (onProgressRef.current) {
                        onProgressRef.current({ currentTime: timeAsNum });
                    }
                }
            }
        } catch (e) { }
    }, []); // Listener is now absolutely stable

    useEffect(() => {
        window.addEventListener('message', handlePlayerMessages);
        return () => window.removeEventListener('message', handlePlayerMessages);
    }, [handlePlayerMessages]);

    useEffect(() => {
        return () => {
            if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (!src) {
            setLoading(false);
            return;
        }

        if (src !== lastSrc.current) {
            lastSrc.current = src;
            setLoading(true);
            setHlsError(false);

            const isDirect =
                src.toLowerCase().endsWith('.m3u8') ||
                src.toLowerCase().endsWith('.mp4') ||
                src.toLowerCase().endsWith('.webm') ||
                src.includes('video.m3u8') ||
                src.includes('_av1.m3u8') ||
                src.includes('_h264.m3u8');

            setIsHls(isDirect);
            setIsIframe(!isDirect);

            // Safety timeout — hide loader after 6s regardless
            if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
            safetyTimerRef.current = setTimeout(() => {
                setLoading(false);
            }, 6000);
        }

        if (isHls && !hlsError) {
            if (src.toLowerCase().includes('.m3u8') && window.Hls) {
                if (window.Hls.isSupported()) {
                    const hls = new window.Hls({
                        xhrSetup: (xhr: any) => { xhr.withCredentials = false; },
                        enableWorker: true,
                        autoStartLoad: true,
                        startLevel: -1,
                        capLevelToPlayerSize: true,
                        debug: false,
                        maxBufferLength: 30,
                        maxMaxBufferLength: 60,
                        maxBufferSize: 60 * 1024 * 1024,
                        backBufferLength: 60,
                        manifestLoadingMaxRetry: 10,
                        manifestLoadingRetryDelay: 1000,
                        levelLoadingMaxRetry: 10,
                        levelLoadingRetryDelay: 1000,
                        fragLoadingMaxRetry: 10,
                        fragLoadingRetryDelay: 1000,
                        lowLatencyMode: true,
                        enableAdaptiveMaxBufferLength: true,
                        abrEwmaDefaultEstimate: 500000,
                    });
                    if (videoRef.current) {
                        hls.loadSource(src);
                        hls.attachMedia(videoRef.current);
                        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                            setLoading(false);
                            if (onLoad) onLoad();
                        });
                        hls.on(window.Hls.Events.ERROR, (_: any, data: any) => {
                            if (data.fatal) {
                                switch (data.type) {
                                    case window.Hls.ErrorTypes.NETWORK_ERROR:
                                        hls.startLoad();
                                        break;
                                    case window.Hls.ErrorTypes.MEDIA_ERROR:
                                        hls.recoverMediaError();
                                        break;
                                    default:
                                        setHlsError(true);
                                        setIsIframe(true);
                                        setIsHls(false);
                                        hls.destroy();
                                        setLoading(false);
                                        break;
                                }
                            }
                        });
                    }
                    return () => hls.destroy();
                }
            } else if (videoRef.current) {
                videoRef.current.src = src;
                videoRef.current.onloadeddata = () => setLoading(false);
                videoRef.current.onerror = () => {
                    setHlsError(true);
                    setIsIframe(true);
                    setIsHls(false);
                    setLoading(false);
                };
            }
        }
    }, [src, onLoad, hlsError, isHls]);

    const frozenSrcRef = useRef<string | null>(null);
    const lastContentKeyRef = useRef<string>('');
    const currentContentKey = `${src.split('?')[0]}`;

    const iframeSrc = React.useMemo(() => {
        const cleanSrc = src.includes('<iframe')
            ? (src.match(/src=["'](.*?)["']/) || [])[1]
            : src;
        let finalSrc = cleanSrc || '';

        // Force inline playback for iOS on external embed providers
        if (finalSrc && !finalSrc.includes('playsinline=')) {
            finalSrc += (finalSrc.includes('?') ? '&' : '?') + 'playsinline=1';
        }

        if (frozenSrcRef.current && currentContentKey === lastContentKeyRef.current) {
            return frozenSrcRef.current;
        }

        frozenSrcRef.current = finalSrc;
        lastContentKeyRef.current = currentContentKey;
        return finalSrc;
    }, [src, currentContentKey]);

    const stableKey = React.useMemo(() => {
        if (!iframeSrc) return '';
        try {
            const url = new URL(iframeSrc);
            url.searchParams.delete('start');
            return url.toString();
        } catch (e) {
            return iframeSrc.split('&start=')[0];
        }
    }, [iframeSrc]);

    return (
        <div ref={containerRef} className="w-full h-full relative bg-black flex items-center justify-center overflow-hidden">

            <AnimatePresence>
                {showAdGuardOnboarding && (
                    <AdGuardOnboarding 
                        onComplete={handleOnboardingComplete} 
                        accentColor={accentColor}
                    />
                )}
            </AnimatePresence>

            {/* Force Style & Hide Native Tracks */}
            <style>{`
                video::cue {
                    visibility: ${subtitleCues.length > 0 ? 'hidden' : 'visible'} !important;
                    background: ${subtitleCues.length > 0 ? 'transparent' : 'rgba(0,0,0,0.7)'} !important;
                }
                /* Hide native track container when custom overlay is active */
                ${subtitleCues.length > 0 ? `
                video::-webkit-media-text-track-container { display: none !important; }
                video::-webkit-media-text-track-display { display: none !important; }
                ` : ''}
                
                .custom-subtitle-text {
                    text-shadow: 0 4px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5) !important;
                }
            `}</style>
            {!loading && (
                <>
                    {/* Top-Left: Brand Watermark */}
                    <div className="absolute top-4 left-4 md:top-6 md:left-6 z-40 pointer-events-none opacity-40 hover:opacity-100 transition-opacity duration-500">
                        <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-white/5 backdrop-blur-2xl border border-white/10 rounded-xl md:rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative overflow-hidden">
                            {/* Glossy reflection */}
                            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-xl md:rounded-t-2xl" />
                            <span className="text-lg md:text-xl font-[1000] italic bg-gradient-to-br from-white via-white/80 to-white/20 bg-clip-text text-transparent drop-shadow-2xl relative z-10">
                                F
                            </span>
                        </div>
                    </div>

                    {/* Top-Right: Settings Menu */}
                    <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-2">
                        <button 
                            onClick={() => {
                                setShowSubSettings(!showSubSettings);
                                if (!showSubSettings && availableSubs.length === 0) handleSearchAllSubs();
                            }}
                            className="p-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-white/20 transition-all shadow-2xl"
                        >
                            <Activity size={18} className={showSubSettings ? 'rotate-90 text-red-500' : ''} />
                        </button>

                        <AnimatePresence>
                            {showSubSettings && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    className="bg-[#0a0a0a]/95 backdrop-blur-3xl border border-white/10 p-5 md:p-6 rounded-[24px] md:rounded-[32px] shadow-[0_32px_64px_rgba(0,0,0,0.8)] w-[90vw] sm:w-80 max-h-[85vh] overflow-y-auto flex flex-col gap-5 md:gap-6 custom-scrollbar"
                                    style={{ fontFamily: "'Inter', sans-serif" }}
                                >
                                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                        <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2 uppercase">
                                            <Activity size={14} className="text-red-600" />
                                            {language === 'ku' ? 'ڕێکخستنی ژێرنووس' : 'Subtitle Studio'}
                                        </h3>
                                        <button onClick={() => setShowSubSettings(false)} className="text-gray-500 hover:text-white transition-colors">
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                        {language === 'ku' ? 'قەبارەی نوسین' : 'Font Size'}
                                                    </label>
                                                    <span className="text-[10px] font-bold text-red-500">{subtitleSize}px</span>
                                                </div>
                                                <input 
                                                    type="range" min="12" max="52" step="2"
                                                    value={subtitleSize}
                                                    onChange={(e) => setSubtitleSize(Number(e.target.value))}
                                                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-red-600"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    {language === 'ku' ? 'ڕەنگی نوسین' : 'Typography Color'}
                                                </label>
                                                <div className="flex gap-3">
                                                    {['#ffffff', '#facc15', '#22d3ee', '#4ade80', '#ef4444'].map(c => (
                                                        <button 
                                                            key={c}
                                                            onClick={() => setSubtitleColor(c)}
                                                            className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 shadow-lg ${subtitleColor === c ? 'border-red-600 ring-4 ring-red-600/20' : 'border-white/10'}`}
                                                            style={{ backgroundColor: c }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                        {language === 'ku' ? 'ڕادەی ڕوونی پشتەوە' : 'Backdrop Opacity'}
                                                    </label>
                                                    <span className="text-[10px] font-bold text-green-500">{Math.round(subBgOpacity * 100)}%</span>
                                                </div>
                                                <input 
                                                    type="range" min="0" max="1" step="0.1"
                                                    value={subBgOpacity}
                                                    onChange={(e) => setSubBgOpacity(Number(e.target.value))}
                                                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-green-600"
                                                />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    {language === 'ku' ? 'کاریگەری شووشە' : 'Glassmorphism'}
                                                </label>
                                                <button 
                                                    onClick={() => setSubBlur(!subBlur)}
                                                    className={`w-10 h-5 rounded-full transition-all relative ${subBlur ? 'bg-red-600' : 'bg-white/10'}`}
                                                >
                                                    <motion.div 
                                                        animate={{ x: subBlur ? 22 : 4 }}
                                                        className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm"
                                                    />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-4">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                        {language === 'ku' ? 'خێرایی ژێرنووس (چرکە)' : 'Subtitle Sync (Sec)'}
                                                    </label>
                                                    <span className="text-[10px] font-bold text-blue-500">{subtitleOffset > 0 ? '+' : ''}{subtitleOffset / 1000}s</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => setSubtitleOffset(prev => prev - 500)} className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-white font-bold text-xs">-0.5s</button>
                                                    <input 
                                                        type="range" min="-5000" max="5000" step="500"
                                                        value={subtitleOffset}
                                                        onChange={(e) => setSubtitleOffset(Number(e.target.value))}
                                                        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-600"
                                                    />
                                                    <button onClick={() => setSubtitleOffset(prev => prev + 500)} className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-white font-bold text-xs">+0.5s</button>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    {language === 'ku' ? 'گەڕان بۆ ژێرنووس' : 'Subtitle Discovery'}
                                                </label>
                                                <div className="relative group">
                                                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors" />
                                                    <input 
                                                        type="text"
                                                        placeholder={language === 'ku' ? 'گەڕان بۆ زمان...' : 'Find a language...'}
                                                        value={subSearchQuery}
                                                        onChange={(e) => setSubSearchQuery(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-[11px] focus:border-red-600/50 focus:bg-white/[0.08] outline-none transition-all placeholder:text-gray-600"
                                                    />
                                                </div>
                                            </div>

                                            {isSearchingSubs ? (
                                                <div className="py-12 flex flex-col items-center gap-4 bg-white/[0.01] rounded-[24px] border border-dashed border-white/5">
                                                    <div className="relative">
                                                        <div className="w-10 h-10 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin" />
                                                        <Activity size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-600 animate-pulse" />
                                                    </div>
                                                    <span className="text-[10px] font-black text-gray-400 animate-pulse uppercase tracking-[0.3em]">
                                                        {language === 'ku' ? 'لۆدکردنی زمانەکان...' : 'FETCHING CLOUD SUBS...'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar scroll-smooth">
                                                    {availableSubs.length > 0 ? (
                                                        availableSubs
                                                            .filter(sub => 
                                                                (sub?.attributes?.display_name || '').toLowerCase().includes(subSearchQuery.toLowerCase()) ||
                                                                (sub?.attributes?.language || '').toLowerCase().includes(subSearchQuery.toLowerCase())
                                                            )
                                                            .sort((a, b) => {
                                                                const aIsKu = a?.attributes?.language === 'ku' || a?.attributes?.language === 'ckb';
                                                                const bIsKu = b?.attributes?.language === 'ku' || b?.attributes?.language === 'ckb';
                                                                if (aIsKu && !bIsKu) return -1;
                                                                if (!aIsKu && bIsKu) return 1;
                                                                return 0;
                                                            })
                                                            .map(sub => (
                                                                <button 
                                                                    key={sub.id}
                                                                    onClick={() => handleSelectSub(sub)}
                                                                    className={`w-full text-left p-3.5 rounded-[20px] transition-all duration-300 border flex items-center gap-4 group relative overflow-hidden ${
                                                                        (sub?.attributes?.language === 'ku' || sub?.attributes?.language === 'ckb') 
                                                                        ? 'bg-gradient-to-r from-red-600/10 to-transparent border-red-600/30 hover:border-red-500/60 shadow-[0_4px_20px_rgba(229,9,20,0.1)]' 
                                                                        : 'bg-gradient-to-r from-white/[0.03] to-transparent border-white/5 hover:border-white/15 hover:bg-white/[0.06]'
                                                                    }`}
                                                                >
                                                                    {/* Prominent Flag Container */}
                                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-inner ${
                                                                        (sub?.attributes?.language === 'ku' || sub?.attributes?.language === 'ckb')
                                                                        ? 'bg-red-600/20 border-red-500/30'
                                                                        : 'bg-white/5 border-white/10 group-hover:bg-white/10'
                                                                    } transition-colors`}>
                                                                        <div className="scale-[1.2]">
                                                                            {getLanguageFlag(sub?.attributes?.language || '')}
                                                                        </div>
                                                                    </div>
                                                                
                                                                    <div className="flex flex-col flex-1 min-w-0 relative z-10">
                                                                        <div className="flex items-center gap-2 mb-0.5">
                                                                            <span className={`font-[1000] text-[10px] uppercase tracking-[0.2em] ${
                                                                                (sub?.attributes?.language === 'ku' || sub?.attributes?.language === 'ckb') ? 'text-red-500' : 'text-gray-400 group-hover:text-gray-300'
                                                                            } transition-colors`}>
                                                                                {sub?.attributes?.language || 'UNKNOWN'}
                                                                            </span>
                                                                            {(sub?.attributes?.language === 'ku' || sub?.attributes?.language === 'ckb') && (
                                                                                <span className="text-[7px] bg-red-600 text-white px-1.5 py-0.5 rounded-md font-black shadow-[0_0_10px_rgba(229,9,20,0.5)] uppercase tracking-tighter flex items-center gap-1">
                                                                                    <Sparkles size={8} /> Verified
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <span className="text-gray-200 font-bold text-[11px] group-hover:text-white transition-colors truncate w-full">
                                                                            {sub?.attributes?.display_name?.replace(/\.srt|\.vtt/g, '') || 'Standard Track'}
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                                                        (sub?.attributes?.language === 'ku' || sub?.attributes?.language === 'ckb')
                                                                        ? 'bg-red-600/20 text-red-500 group-hover:bg-red-600 group-hover:text-white'
                                                                        : 'bg-white/5 text-gray-500 group-hover:bg-white/10 group-hover:text-white'
                                                                    }`}>
                                                                        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                                                    </div>
                                                                
                                                                    {(sub?.attributes?.language === 'ku' || sub?.attributes?.language === 'ckb') && (
                                                                        <div className="absolute top-1/2 -translate-y-1/2 right-0 w-24 h-24 bg-red-600/20 blur-[30px] rounded-full pointer-events-none" />
                                                                    )}
                                                                </button>
                                                            ))
                                                    ) : (
                                                    <div className="py-6 flex flex-col items-center gap-3 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                                                        <span className="text-[9px] font-bold text-gray-500 text-center px-4">
                                                            {language === 'ku' ? 'هیچ ژێرنووسێکی تر نەدۆزرایەوە' : 'NO OTHER SUBTITLES FOUND'}
                                                        </span>
                                                        <button 
                                                            onClick={handleSearchAllSubs}
                                                            className="px-4 py-2 bg-white/5 rounded-full text-[8px] font-black uppercase hover:bg-white/10 transition-all"
                                                        >
                                                            {language === 'ku' ? 'دوبارە گەڕان' : 'RETRY SEARCH'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button 
                                    onClick={() => setShowSubSettings(false)}
                                    className="mt-6 py-4 bg-red-600/10 border border-red-600/20 rounded-[20px] text-[11px] font-black uppercase text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-lg hover:shadow-red-600/20"
                                >
                                    {language === 'ku' ? 'داخستن' : 'Dismiss Studio'}
                                </button>
                            </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </>
            )}

            {/* Loading Overlay */}
            {loading && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#050505]">
                    <div className="relative p-8 flex flex-col items-center">
                        <Spinner />
                        <div className="mt-8 flex flex-col items-center gap-2">
                            <span
                                className="text-[9px] font-black tracking-[0.5em] animate-pulse uppercase italic"
                                style={{ color: accentColor || '#e50914' }}
                            >
                                {language === 'ku' ? 'ئامادەکردنی پەیوەندی پارێزراو...' : 'INITIALIZING SECURE NODE'}
                            </span>
                            <div className="flex flex-col items-center gap-3">
                                <button 
                                    onClick={triggerAdGuardGuide}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-600/30 rounded-full hover:bg-blue-600/40 transition-all group"
                                >
                                    <ShieldCheck size={14} className="text-blue-500 group-hover:scale-110 transition-transform" />
                                    <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">
                                        {language === 'ku' ? 'ڕێبەری نوێکردنەوەی AdGuard' : 'ADGUARD UPDATE GUIDE'}
                                    </span>
                                </button>
                                <div className="flex items-center gap-2 px-3 py-1 bg-red-600/10 border border-red-600/20 rounded-full">
                                    <Shield size={10} className="text-red-500" />
                                    <span className="text-[7px] font-bold text-red-500 uppercase tracking-tighter">
                                        QUANTUM SHIELD ACTIVE
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HLS / Direct Video */}
            {isHls && (
                <video
                    ref={videoRef}
                    className="w-full h-full object-contain z-10"
                    controls
                    autoPlay
                    playsInline
                    webkit-playsinline="true"
                    preload="auto"
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    onPlaying={() => setLoading(false)}
                    onDoubleClick={() => {
                        import('../utils/tauriUtils').then(({ isTauri }) => {
                            if (isTauri()) {
                                import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
                                    const win = getCurrentWindow();
                                    win.isFullscreen().then(f => win.setFullscreen(!f));
                                });
                            }
                        });
                    }}
                >
                    {(localSubtitleUrl || subtitleUrl) && (
                        <track 
                            key={localSubtitleUrl || subtitleUrl}
                            src={localSubtitleUrl || subtitleUrl} 
                            kind="subtitles" 
                            srcLang="ku" 
                            label="Kurdish" 
                            default 
                        />
                    )}
                </video>
            )}

            {/* Custom Subtitle Overlay */}
            <AnimatePresence mode="wait">
                {subtitleCues.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute bottom-[10%] md:bottom-[15%] left-0 right-0 z-50 flex justify-center pointer-events-none px-4 md:px-6 w-full"
                        style={{ 
                            fontSize: `clamp(14px, ${subtitleSize}px, 6.5vw)`, 
                            color: subtitleColor,
                            fontFamily: "'Outfit', sans-serif" 
                        }}
                    >
                        {(() => {
                            // Apply offset dynamically (subtitleOffset is in milliseconds)
                            const offsetSec = subtitleOffset / 1000;
                            // Find active cue with a tiny buffer for smoother transitions
                            const activeCue = subtitleCues.find(cue => 
                                currentTime >= (cue.start + offsetSec - 0.1) && currentTime <= (cue.end + offsetSec + 0.1)
                            );
                            
                            if (!activeCue) return null;

                            return (
                                <div 
                                    className="px-4 sm:px-6 md:px-8 py-2 md:py-3 rounded-[16px] md:rounded-[24px] text-center font-black tracking-tight shadow-[0_32px_64px_rgba(0,0,0,0.8)] transition-all duration-300 leading-relaxed border border-white/10 max-w-[95vw] sm:max-w-[85vw]"
                                    style={{ 
                                        backgroundColor: `rgba(0, 0, 0, ${subBgOpacity})`,
                                        backdropFilter: subBlur && subBgOpacity > 0 ? 'blur(20px)' : 'none',
                                        WebkitBackdropFilter: subBlur && subBgOpacity > 0 ? 'blur(20px)' : 'none',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.4)',
                                        textWrap: 'balance',
                                        wordBreak: 'break-word',
                                        lineHeight: '1.4'
                                    }}
                                >
                                    {activeCue.text.split('\n').map((line, idx) => (
                                        <div key={`${line}-${idx}`} className="drop-shadow-2xl">
                                            {line}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Iframe Embed — key forces full remount ONLY on URL change (excluding start time) */}
            {isIframe && iframeSrc && (
                <iframe
                    key={stableKey}
                    src={iframeSrc}
                    className="w-full h-full border-none z-10"
                    style={{ display: 'block' }}
                    // @ts-ignore
                    fetchPriority="high"
                    // NO sandbox — providers detect sandbox and refuse to load
                    allow="autoplay; fullscreen; playsinline; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; display-capture; web-share; storage-access"

                    // @ts-ignore
                    mozallowfullscreen="true"
                    // @ts-ignore
                    allowtransparency="true"
                    // @ts-ignore
                    webkitallowfullscreen="true"
                    onLoad={() => {
                        setLoading(false);
                        if (onLoad) onLoad();
                    }}
                    title="FLKRD Universal Player"
                />
            )}
        </div>
    );
});

export default UniversalVideoPlayer;
