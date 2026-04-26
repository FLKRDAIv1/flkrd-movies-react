import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Shield, ShieldCheck } from 'lucide-react';
import Spinner from './Spinner';
import { useQuantumAdBlocker } from '../hooks/useQuantumAdBlocker';
import AdGuardOnboarding from './AdGuardOnboarding';
import { AnimatePresence } from 'framer-motion';

interface UniversalVideoPlayerProps {
    src: string;
    onLoad?: () => void;
    accentColor?: string;
    language?: string;
    onProgress?: (data: any) => void;
}

declare global {
    interface Window {
        Hls: any;
    }
}

const UniversalVideoPlayer: React.FC<UniversalVideoPlayerProps> = React.memo(({ src, onLoad, accentColor, language, onProgress }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isHls, setIsHls] = useState(false);
    const [isIframe, setIsIframe] = useState(false);
    const [loading, setLoading] = useState(true);
    const [hlsError, setHlsError] = useState(false);
    const [showAdGuardOnboarding, setShowAdGuardOnboarding] = useState(false);

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
            if (!onProgressRef.current) return;

            const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            // Catch all possible player message formats (VidKing, Vidsrc, etc.)
            if (payload && (
                payload.type === 'PLAYER_EVENT' || 
                payload.event || 
                payload.type === 'timeupdate' ||
                payload.type === 'media_time'
            )) {
                const data = payload.data || payload;
                onProgressRef.current(data);
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

    // Use a ref to store the 'frozen' source that won't change during playback
    // This prevents the iframe from reloading when progress updates
    const frozenSrcRef = useRef<string | null>(null);
    const lastContentKeyRef = useRef<string>('');

    // Compute a unique key for the current content/source combination
    const currentContentKey = `${src.split('?')[0]}`;

    const iframeSrc = React.useMemo(() => {
        const cleanSrc = src.includes('<iframe')
            ? (src.match(/src=["'](.*?)["']/) || [])[1]
            : src;
        const finalSrc = cleanSrc || '';

        // If this is the same content/source, keep the frozen one
        if (frozenSrcRef.current && currentContentKey === lastContentKeyRef.current) {
            return frozenSrcRef.current;
        }

        // New content or source — update the frozen reference
        frozenSrcRef.current = finalSrc;
        lastContentKeyRef.current = currentContentKey;
        return finalSrc;
    }, [src, currentContentKey]);

    // Create a stable key that ignores the 'start=' parameter
    // This prevents the iframe from remounting if ONLY the resume time changes
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
        <div className="w-full h-full relative bg-black flex items-center justify-center">

            {/* AdGuard Onboarding Overlay */}
            <AnimatePresence>
                {showAdGuardOnboarding && (
                    <AdGuardOnboarding 
                        onComplete={handleOnboardingComplete} 
                        accentColor={accentColor}
                    />
                )}
            </AnimatePresence>

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
                    onPlaying={() => setLoading(false)}
                />
            )}

            {/* Iframe Embed — key forces full remount ONLY on URL change (excluding start time) */}
            {isIframe && iframeSrc && (
                <iframe
                    key={stableKey}
                    src={iframeSrc}
                    className="w-full h-full border-none z-10"
                    style={{ display: 'block' }}
                    referrerPolicy="no-referrer-when-downgrade"
                    // HIGH PRIORITY — ensure video loads before other non-critical assets
                    loading="eager"
                    // @ts-ignore
                    fetchpriority="high"
                    // NO sandbox — providers detect sandbox and refuse to load
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; display-capture; web-share; storage-access"
                    allowFullScreen
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
