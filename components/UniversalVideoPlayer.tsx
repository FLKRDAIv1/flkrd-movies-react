import React, { useEffect, useRef, useState } from 'react';
import { X, Shield, Activity } from 'lucide-react';
import Spinner from './Spinner';
import { useQuantumAdBlocker } from '../hooks/useQuantumAdBlocker';

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

const UniversalVideoPlayer: React.FC<UniversalVideoPlayerProps> = ({ src, onLoad, accentColor, language, onProgress }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isHls, setIsHls] = useState(false);
    const [isIframe, setIsIframe] = useState(false);
    const [loading, setLoading] = useState(true);
    const [hlsError, setHlsError] = useState(false);

    const lastSrc = useRef<string>('');
    const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize Quantum Shielding to block pop-ups/redirects
    // Aggressive mode is active because we removed the iframe sandbox
    useQuantumAdBlocker(true);

    // Listen for VidKing / Player Events via PostMessage
    useEffect(() => {
        const handlePlayerMessages = (event: MessageEvent) => {
            try {
                // Ensure message is from a trusted source or contains expected structure
                const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                
                // VidKing Standard: { type: "PLAYER_EVENT", data: { event: "...", ... } }
                // Also support flattened structure if some providers send it
                if (payload && (payload.type === 'PLAYER_EVENT' || payload.event)) {
                    const data = payload.data || payload;
                    console.log(`[PLAYER-SIGNAL] Received ${data.event}:`, data);
                    
                    if (onProgress) {
                        onProgress(data);
                    }
                }
            } catch (e) {
                // Ignore non-JSON or unrelated messages
            }
        };

        window.addEventListener('message', handlePlayerMessages);
        return () => window.removeEventListener('message', handlePlayerMessages);
    }, [onProgress]);

    useEffect(() => {
        return () => {
            if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (src !== lastSrc.current) {
            lastSrc.current = src;
            setLoading(true);
            setHlsError(false);

            const isDirect = src.toLowerCase().endsWith('.m3u8') ||
                src.toLowerCase().endsWith('.mp4') ||
                src.toLowerCase().endsWith('.webm') ||
                src.includes('video.m3u8') ||
                src.includes('_av1.m3u8') ||
                src.includes('_h264.m3u8');

            setIsHls(isDirect);
            setIsIframe(!isDirect);

            if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
            safetyTimerRef.current = setTimeout(() => {
                setLoading(false);
            }, 4000);
        }

        if (!src) {
            setLoading(false);
            return;
        }

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
                                setHlsError(true);
                                setIsIframe(true);
                                setIsHls(false);
                                hls.destroy();
                                setLoading(false);
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
                }
            }
        }
    }, [src, onLoad, hlsError, isHls]);

    const getFinalIframeSrc = (source: string) => {
        let cleanSrc = source.includes('<iframe') ? (source.match(/src=["'](.*?)["']/) || [])[1] : source;
        return cleanSrc || "";
    };

    return (
        <div className="w-full h-full relative bg-black flex items-center justify-center">
            {loading && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#050505]">
                    <div className="relative p-8 flex flex-col items-center">
                        <Spinner />
                        <div className="mt-8 flex flex-col items-center gap-2">
                            <span className="text-[9px] font-black tracking-[0.5em] animate-pulse uppercase italic" style={{ color: accentColor }}>
                                {language === 'ku' ? 'ئامادەکردنی پلەیەر...' : 'INITIALIZING SECURE NODE'}
                            </span>
                            <div className="flex items-center gap-2 px-3 py-1 bg-red-600/10 border border-red-600/20 rounded-full">
                                <Shield size={10} className="text-red-500" />
                                <span className="text-[7px] font-bold text-red-500 uppercase tracking-tighter">QUANTUM SHIELD ACTIVE</span>
                            </div>
                        </div>
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
                />
            )}

            {isIframe && (
                <iframe
                    key={getFinalIframeSrc(src)}
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
                    title="FLKRD Universal Player"
                />
            )}
        </div>
    );
};

export default UniversalVideoPlayer;
