import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import Spinner from './Spinner';
import { useQuantumAdBlocker } from '../hooks/useQuantumAdBlocker';

interface UniversalVideoPlayerProps {
    src: string;
    onLoad?: () => void;
    accentColor?: string;
    language?: string;
}

declare global {
    interface Window {
        Hls: any;
    }
}

const UniversalVideoPlayer: React.FC<UniversalVideoPlayerProps> = ({ src, onLoad, accentColor, language }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isHls, setIsHls] = useState(false);
    const [isIframe, setIsIframe] = useState(false);
    const [loading, setLoading] = useState(true);
    const [hlsError, setHlsError] = useState(false);

    const lastSrc = useRef<string>('');
    const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize Quantum Shielding to block VidKing pop-ups/redirects
    useQuantumAdBlocker(true);

    // Guaranteed cleanup for timer
    useEffect(() => {
        return () => {
            if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        };
    }, []);

    useEffect(() => {
        // Only reset entire player if the source actually changes
        if (src !== lastSrc.current) {
            lastSrc.current = src;
            setLoading(true);
            setHlsError(false);

            // Mode detection
            const isDirect = src.toLowerCase().endsWith('.m3u8') ||
                src.toLowerCase().endsWith('.mp4') ||
                src.toLowerCase().endsWith('.webm') ||
                src.includes('video.m3u8') ||
                src.includes('_av1.m3u8') ||
                src.includes('_h264.m3u8');

            setIsHls(isDirect);
            setIsIframe(!isDirect);

            // Set a foolproof 4-second safety timer for this specific source
            if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
            safetyTimerRef.current = setTimeout(() => {
                setLoading(false);
                console.log("Player safety timeout triggered - showing fallback UI");
            }, 4000);
        }

        if (!src) {
            setLoading(false);
            return;
        }

        // HLS Implementation
        if (isHls && !hlsError) {
            if (src.toLowerCase().includes('.m3u8') && window.Hls) {
                if (window.Hls.isSupported()) {
                    const hls = new window.Hls({
                        xhrSetup: (xhr: any) => {
                            xhr.withCredentials = false;
                        },
                        enableWorker: true
                    });

                    if (videoRef.current) {
                        hls.loadSource(src);
                        hls.attachMedia(videoRef.current);

                        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                            setLoading(false);
                            if (onLoad) onLoad();
                        });

                        hls.on(window.Hls.Events.ERROR, (event: any, data: any) => {
                            if (data.fatal) {
                                console.warn("HLS Error:", data.type);
                                setHlsError(true);
                                setIsIframe(true);
                                setIsHls(false);
                                hls.destroy();
                                // If it already errored, we might as well show the iframe now
                                setLoading(false);
                            }
                        });
                    }
                    return () => hls.destroy();
                } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
                    videoRef.current.src = src;
                    videoRef.current.onloadedmetadata = () => {
                        setLoading(false);
                        if (onLoad) onLoad();
                    };
                    videoRef.current.onerror = () => {
                        setHlsError(true);
                        setIsIframe(true);
                        setIsHls(false);
                        setLoading(false);
                    };
                }
            } else if (videoRef.current) {
                videoRef.current.src = src;
                videoRef.current.onloadeddata = () => {
                    setLoading(false);
                    if (onLoad) onLoad();
                };
                videoRef.current.onerror = () => {
                    setHlsError(true);
                    setIsIframe(true);
                    setIsHls(false);
                    setLoading(false);
                }
            }
        }
    }, [src, onLoad, hlsError, isHls]);

    const getFinalIframeSrc = (source: string) => {
        let cleanSrc = source.includes('<iframe') ? (source.match(/src=["'](.*?)["']/) || [])[1] : source;
        if (cleanSrc && cleanSrc.includes('rashaba.com/upload')) {
            const parts = cleanSrc.split('/');
            const idPart = parts.find(p => p.length > 12 && !p.includes('.') && !p.includes('-'));
            if (idPart) return `https://rashaba.com/embed/${idPart}`;
        }
        return cleanSrc || "https://rashaba.com/embed/mKkhrFhjQr3CKwz";
    };

    return (
        <div className="w-full h-full relative bg-black flex items-center justify-center">
            {loading && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#050505]">
                    <div className="relative p-8 flex flex-col items-center">
                        <Spinner />
                        <span className="mt-8 text-[9px] font-black tracking-[0.5em] animate-pulse uppercase italic" style={{ color: accentColor }}>
                            {language === 'ku' ? 'ئامادەکردنی پلەیەر...' : 'INITIALIZING SECURE NODE'}
                        </span>

                        {/* Emergency bypass button after 2 seconds */}
                        <button
                            onClick={() => setLoading(false)}
                            className="mt-12 flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full transition-all group active:scale-95"
                        >
                            <X size={12} className="text-white/40 group-hover:text-white" />
                            <span className="text-[8px] font-bold text-white/40 group-hover:text-white uppercase tracking-widest italic">
                                {language === 'ku' ? 'دایبخە' : 'FORCE DISMISS'}
                            </span>
                        </button>
                    </div>
                </div>
            )}

            {isHls && (
                <video
                    ref={videoRef}
                    className="w-full h-full object-contain z-10"
                    controls
                    autoPlay
                    playsInline
                    onPlaying={() => setLoading(false)}
                    onCanPlay={() => setLoading(false)}
                    onPlay={() => setLoading(false)}
                />
            )}

            {isIframe && (
                <iframe
                    src={getFinalIframeSrc(src)}
                    className="w-full h-full border-none pointer-events-auto z-10"
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; display-capture"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onLoad={() => {
                        setLoading(false);
                        if (onLoad) onLoad();
                    }}
                    title="Universal Video Player"
                />
            )}
        </div>
    );
};

export default UniversalVideoPlayer;
