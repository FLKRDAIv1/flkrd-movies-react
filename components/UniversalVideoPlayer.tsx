import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Shield, ShieldCheck, Activity, X, Search, ArrowRight } from 'lucide-react';
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
        const finalSrc = cleanSrc || '';

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
                    {/* Fullscreen button removed as the player now auto-fills the screen (Pseudo-Fullscreen) */}

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
                                                    {['#ffffff', '#facc15', '#22d3ee', '#4ade80'].map(c => (
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
                                                                    className={`text-left p-4 rounded-2xl text-[11px] transition-all border flex items-center justify-between group relative overflow-hidden ${
                                                                        (sub?.attributes?.language === 'ku' || sub?.attributes?.language === 'ckb') 
                                                                        ? 'bg-red-600/10 border-red-600/30 hover:bg-red-600/20 shadow-[0_4px_20px_rgba(229,9,20,0.1)]' 
                                                                        : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.08] hover:border-white/10'
                                                                    }`}
                                                                >
                                                                    <div className="flex flex-col gap-1 relative z-10">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-black text-red-500 text-[9px] uppercase tracking-wider">{sub?.attributes?.language || 'UN'}</span>
                                                                            {(sub?.attributes?.language === 'ku' || sub?.attributes?.language === 'ckb') && (
                                                                                <span className="text-[7px] bg-red-600 text-white px-1.5 py-0.5 rounded-md font-black shadow-lg uppercase tracking-tighter">Verified</span>
                                                                            )}
                                                                        </div>
                                                                        <span className="text-gray-200 font-bold group-hover:text-white transition-colors truncate max-w-[180px]">
                                                                            {sub?.attributes?.display_name || 'Standard Subtitle'}
                                                                        </span>
                                                                    </div>
                                                                    <ArrowRight size={14} className="text-gray-600 group-hover:text-red-500 group-hover:translate-x-1 transition-all relative z-10" />
                                                                    {(sub?.attributes?.language === 'ku' || sub?.attributes?.language === 'ckb') && (
                                                                        <div className="absolute top-0 right-0 w-16 h-16 bg-red-600/10 blur-2xl rounded-full -mr-8 -mt-8" />
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
                            // Find active cue with a tiny buffer for smoother transitions
                            const activeCue = subtitleCues.find(cue => 
                                currentTime >= (cue.start - 0.1) && currentTime <= (cue.end + 0.1)
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
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; display-capture; web-share; storage-access"

                    // @ts-ignore
                    mozallowfullscreen="true"
                    // @ts-ignore
                    allowtransparency="true"
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
