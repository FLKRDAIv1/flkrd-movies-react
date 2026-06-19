import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Shield, ShieldCheck, Activity, X, Search, ArrowRight, Sparkles, Subtitles, Download, Mic2, Globe, Volume2, Tv, Play, Maximize, Minimize } from 'lucide-react';
import Spinner from './Spinner';
import { useQuantumAdBlocker } from '../hooks/useQuantumAdBlocker';
import AdGuardOnboarding from './AdGuardOnboarding';
import { AnimatePresence, motion } from 'framer-motion';
import { subtitleService, SubtitleResult } from '../services/subtitleService';
import { supabase } from '../utils/supabaseClient';
import { db } from '../utils/db';
import { fetchTranslations, fetchTmdbIdFromImdb, fetchData } from '../services/tmdbService';
import { API_KEY } from '../constants';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../contexts/UIContext';
import { Season, SeasonDetails } from '../types';
import {
    fetchSubtitleEdits,
    saveSubtitleLineEdit,
    deleteSubtitleLineEdit,
    subscribeSubtitleEdits,
    type SubtitleEditKey,
} from '../services/subtitleEditService';

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
    title?: string;
    peerSyncTrigger?: { currentTime: number; paused: boolean; timestamp: number } | null;
    tmdbId?: number | string;
    seasons?: Season[];
    currentSeasonDetails?: SeasonDetails;
    watchedEpisodes?: Set<string>;
    onEpisodeChange?: (season: number, episode: number) => void;
    onSeasonChange?: (season: number) => void;
    startFullscreen?: boolean;
    onClose?: () => void;
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

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.08
        }
    }
};

const cardVariants = {
    hidden: { opacity: 0, x: 35, filter: 'blur(6px)', scale: 0.95 },
    show: { 
        opacity: 1, 
        x: 0, 
        filter: 'blur(0px)',
        scale: 1,
        transition: { 
            type: 'spring', 
            stiffness: 90, 
            damping: 18,
            mass: 0.8
        } 
    }
};


const UniversalVideoPlayer: React.FC<UniversalVideoPlayerProps> = React.memo(({
    src,
    onLoad,
    accentColor,
    language,
    onProgress,
    subtitleUrl,
    imdbId,
    contentType,
    season,
    episode,
    title,
    peerSyncTrigger,
    tmdbId,
    seasons = [],
    currentSeasonDetails,
    watchedEpisodes = new Set(),
    onEpisodeChange,
    onSeasonChange,
    startFullscreen,
    onClose
}) => {
    const { isAdmin } = useUI();
    const navigate = useNavigate();
    const [movieRecommendations, setMovieRecommendations] = useState<any[]>([]);

    useEffect(() => {
        if (contentType === 'movie' && tmdbId) {
            const fetchRecs = async () => {
                try {
                    const cleanId = String(tmdbId).replace('custom_', '');
                    const endpoint = `/movie/${cleanId}/recommendations?api_key=${API_KEY}`;
                    const data = await fetchData(endpoint, (language === 'ku' || language === 'badini') ? 'ku' : 'en');
                    if (data && Array.isArray(data)) {
                        setMovieRecommendations(data.slice(0, 15));
                    }
                } catch (e) {
                    console.error("Failed to fetch player movie recommendations:", e);
                }
            };
            fetchRecs();
        }
    }, [tmdbId, contentType, language]);
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isHls, setIsHls] = useState(false);
    const [isIframe, setIsIframe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [hlsError, setHlsError] = useState(false);
    const [showAdGuardOnboarding, setShowAdGuardOnboarding] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSimulatedFullscreen, setIsSimulatedFullscreen] = useState(false);
    const [subtitleSize, setSubtitleSize] = useState(24);
    const [subtitleColor, setSubtitleColor] = useState('#ffffff');
    const [subtitleOffset, setSubtitleOffset] = useState(0);
    const [showSubSettings, setShowSubSettings] = useState(false);
    const [showEpisodesPortal, setShowEpisodesPortal] = useState(false);
    const [availableSubs, setAvailableSubs] = useState<SubtitleResult[]>([]);
    const [isSearchingSubs, setIsSearchingSubs] = useState(false);
    const [localSubtitleUrl, setLocalSubtitleUrl] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const currentTimeRef = useRef(0);
    useEffect(() => {
        currentTimeRef.current = currentTime;
    }, [currentTime]);
    const [isPlaying, setIsPlaying] = useState(false);
    const lastMessageTimeRef = useRef<number>(performance.now());
    const lastReceivedTimeRef = useRef<number>(0);
    const [subtitleCues, setSubtitleCues] = useState<{start: number, end: number, text: string}[]>([]);
    const [subSearchQuery, setSubSearchQuery] = useState('');
    const [subBgOpacity, setSubBgOpacity] = useState(0.4);
    const [subBlur, setSubBlur] = useState(true);
    const [showSubBackground, setShowSubBackground] = useState(() => {
        try {
            const saved = localStorage.getItem('sub_show_bg');
            return saved !== 'false';
        } catch (e) {
            return true;
        }
    });
    const [kurdishSub, setKurdishSub] = useState<SubtitleResult | null>(null);
    const [isDownloadingKu, setIsDownloadingKu] = useState(false);
    const [kuCCNotificationVisible, setKuCCNotificationVisible] = useState(true);
    const [isUploadingSub, setIsUploadingSub] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // --- Subtitle Line Edit State ---
    // Map of cue_index → edited_text loaded from Supabase
    const [subEditMap, setSubEditMap] = useState<Map<number, string>>(new Map());
    // Which cue the admin is currently editing (null = modal closed)
    const [editingCue, setEditingCue] = useState<{ index: number; original: string; current: string } | null>(null);
    const [subEditSaving, setSubEditSaving] = useState(false);

    const setAvailableSubsWithVirtual = useCallback((newSubs: SubtitleResult[]) => {
        const safeSubs = Array.isArray(newSubs) ? newSubs : [];
        if (!subtitleUrl) {
            setAvailableSubs(safeSubs);
            return;
        }
        const virtualSub: SubtitleResult = {
            id: 'prop-kurdish-auto' as any,
            attributes: {
                language: 'ku',
                display_name: 'Kurdish CC (Auto Established)',
                url: subtitleUrl,
                file_id: 0
            }
        };
        const filtered = safeSubs.filter(s => s && s.id !== 'prop-kurdish-auto' as any && s.attributes && s.attributes.url !== subtitleUrl);
        setAvailableSubs([virtualSub, ...filtered]);
    }, [subtitleUrl]);

    const handleAdminSubUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploadingSub(true);
        setUploadStatus(null);

        const targetId = tmdbId || imdbId;
        if (!targetId) {
            setUploadStatus({
                type: 'error',
                message: "Missing content identifier (TMDb or IMDb ID)"
            });
            setIsUploadingSub(false);
            return;
        }

        let successCount = 0;
        let errors: string[] = [];
        let lastBlobUrl = '';
        let lastPublicUrl = '';
        let lastFileName = '';

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const extension = file.name.split('.').pop()?.toLowerCase();
            if (extension !== 'srt' && extension !== 'vtt') {
                errors.push(`${file.name}: ONLY VTT OR SRT ALLOWED`);
                continue;
            }

            try {
                // Read content
                let fileContent = await file.text();
                
                // If it's SRT, convert to VTT format
                if (extension === 'srt') {
                    fileContent = 'WEBVTT\n\n' + fileContent
                        .replace(/(\d+:\d+:\d+),(\d+)/g, '$1.$2')
                        .replace(/^\d+$/gm, '');
                }

                // Determine season and episode if content is TV
                let fileSeason = 0;
                let fileEpisode = 0;

                if (contentType === 'tv') {
                    // Try to parse from filename
                    const parsed = parseSeasonEpisodeFromFilename(file.name, season);
                    if (parsed) {
                        fileSeason = parsed.season;
                        fileEpisode = parsed.episode;
                    } else {
                        // Fallback to active episode if only 1 file is uploaded
                        if (files.length === 1) {
                            fileSeason = season !== undefined ? season : 0;
                            fileEpisode = episode !== undefined ? episode : 0;
                        } else {
                            throw new Error(`Could not determine episode from filename "${file.name}"`);
                        }
                    }
                }

                // Create Blob and upload to Supabase Storage subtitles bucket
                const blob = new Blob([fileContent], { type: 'text/vtt' });
                const timeStamp = Date.now();
                const filePath = contentType === 'tv'
                    ? `custom/${targetId}_s${fileSeason}_e${fileEpisode}_${timeStamp}.vtt`
                    : `custom/${targetId}_${timeStamp}.vtt`;
                
                const { data: uploadData, error: uploadErr } = await supabase.storage
                    .from('subtitles')
                    .upload(filePath, blob, {
                        contentType: 'text/vtt',
                        upsert: true
                    });

                if (uploadErr) throw uploadErr;

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('subtitles')
                    .getPublicUrl(filePath);

                let resolvedPublicUrl = publicUrl;
                if (resolvedPublicUrl.startsWith('//')) {
                    resolvedPublicUrl = `https:${resolvedPublicUrl}`;
                }

                // Save reference in custom_subtitles database table
                const { error: dbErr } = await supabase
                    .from('custom_subtitles')
                    .upsert({
                        tmdb_id: String(targetId),
                        media_type: contentType || 'movie',
                        language: 'ku',
                        subtitle_url: resolvedPublicUrl,
                        file_name: file.name,
                        season: fileSeason,
                        episode: fileEpisode
                    }, {
                        onConflict: 'tmdb_id,media_type,language,season,episode'
                    });

                if (dbErr) throw dbErr;

                successCount++;
                
                // If it matches currently active season/episode (or is a movie), update local player state
                const isActiveEpisode = contentType !== 'tv' || 
                    (fileSeason === (season || 0) && fileEpisode === (episode || 0));

                if (isActiveEpisode) {
                    lastBlobUrl = URL.createObjectURL(blob);
                    lastPublicUrl = resolvedPublicUrl;
                    lastFileName = file.name;
                }
            } catch (err: any) {
                console.error(`[SUBTITLE UPLOAD] Error uploading ${file.name}:`, err);
                errors.push(`${file.name}: ${err.message || err}`);
            }

            // Update status in real-time for batch uploads
            if (files.length > 1) {
                setUploadStatus({
                    type: 'success',
                    message: (language === 'ku' || language === 'badini')
                        ? `بارکردنی ${i + 1}/${files.length} ژێرنووس...`
                        : `Uploading ${i + 1}/${files.length} subtitles...`
                });
            }
        }

        setIsUploadingSub(false);

        if (errors.length > 0) {
            setUploadStatus({
                type: 'error',
                message: (language === 'ku' || language === 'badini')
                    ? `بارکردنی ${successCount} ژێرنووس سەرکەوتوو بوو. کێشە: ${errors.slice(0, 2).join(', ')}`
                    : `Uploaded ${successCount} successfully. Errors: ${errors.slice(0, 2).join(', ')}`
            });
        } else {
            setUploadStatus({
                type: 'success',
                message: (language === 'ku' || language === 'badini')
                    ? `هەموو ${successCount} ژێرنووسەکە بە سەرکەوتوویی بارکران!`
                    : `ALL ${successCount} SUBTITLES UPLOADED SUCCESSFULLY!`
            });
        }

        // If currently playing episode was updated, hot-swap it
        if (lastBlobUrl) {
            setLocalSubtitleUrl(lastBlobUrl);
            const newCustomSub: SubtitleResult = {
                id: `custom-db-${targetId}`,
                attributes: {
                    language: 'ku',
                    display_name: 'Kurdish',
                    url: lastPublicUrl,
                    file_id: 0
                }
            };
            setKurdishSub(newCustomSub);
            setAvailableSubs(prev => [newCustomSub, ...prev.filter(s => s && s.id !== newCustomSub.id)]);
        }

        // Clear input
        e.target.value = '';
    };

    // Doblaj & Multi-Language Audio States
    const [overrideSrc, setOverrideSrc] = useState<string | null>(null);
    const [isScraping, setIsScraping] = useState(false);
    const [scrapingError, setScrapingError] = useState<string | null>(null);
    const [kurdishDub, setKurdishDub] = useState<any | null>(null);
    const [subStudioTab, setSubStudioTab] = useState<'sub' | 'dub'>('sub');
    const [activeAudioTrack, setActiveAudioTrack] = useState<string>('en');
    const [showDubInfoModal, setShowDubInfoModal] = useState<string | null>(null);
    const [translatedTitles, setTranslatedTitles] = useState<Record<string, string>>({});

    // Fetch translations dynamically from TMDB
    useEffect(() => {
        const fetchAllTranslations = async () => {
            try {
                let tmdbIdNum: number | null = null;
                
                // 1. Try to extract TMDB ID from source URL
                const match = src.match(/\/(movie|tv)\/([^/?#]+)/);
                if (match) {
                    const idStr = match[2];
                    if (!isNaN(Number(idStr))) {
                        tmdbIdNum = Number(idStr);
                    }
                }
                
                // 2. If it's a multiembed URL or has video_id query parameter
                if (!tmdbIdNum) {
                    try {
                        const urlObj = new URL(src);
                        const videoIdParam = urlObj.searchParams.get('video_id');
                        if (videoIdParam && !isNaN(Number(videoIdParam))) {
                            tmdbIdNum = Number(videoIdParam);
                        }
                    } catch (e) {}
                }

                // 3. Fallback to IMDb ID if we don't have TMDB ID yet
                if (!tmdbIdNum && imdbId) {
                    const resolvedId = await fetchTmdbIdFromImdb(imdbId, contentType || 'movie');
                    if (resolvedId) {
                        tmdbIdNum = resolvedId;
                    }
                }

                if (!tmdbIdNum) return;

                const response = await fetchTranslations(tmdbIdNum, contentType || 'movie');
                if (response && response.translations) {
                    const titlesMap: Record<string, string> = {};
                    for (const translation of response.translations) {
                        const langCode = translation.iso_639_1;
                        if (translation.data?.title || translation.data?.name) {
                            titlesMap[langCode] = translation.data.title || translation.data.name;
                        }
                    }
                    console.log("[TMDB TRANSLATIONS] Loaded translations:", titlesMap);
                    setTranslatedTitles(titlesMap);
                }
            } catch (err) {
                console.error("[TMDB TRANSLATIONS] Error fetching translations:", err);
            }
        };

        fetchAllTranslations();
    }, [src, imdbId, contentType]);

    // Sync local subtitle with prop or selected
    useEffect(() => {
        if (!subtitleUrl) {
            setLocalSubtitleUrl(null);
            return;
        }

        const virtualSub: SubtitleResult = {
            id: 'prop-kurdish-auto' as any,
            attributes: {
                language: 'ku',
                display_name: 'Kurdish CC (Auto Established)',
                url: subtitleUrl,
                file_id: 0
            }
        };

        // Inject into available subs list
        setAvailableSubs(prev => {
            if (prev.some(s => s.id === 'prop-kurdish-auto' as any || s.attributes.url === subtitleUrl)) {
                return prev;
            }
            return [virtualSub, ...prev];
        });
        
        setKurdishSub(virtualSub);

        // Auto download, convert to Blob and apply as active subtitle
        const autoDownloadAndApply = async () => {
            try {
                console.log("[UNIVERSAL-PLAYER] Auto-downloading and applying prop subtitleUrl:", subtitleUrl);
                const blobUrl = await subtitleService.getSubtitleBlob(subtitleUrl);
                if (blobUrl) {
                    setLocalSubtitleUrl(blobUrl);
                    setKuCCNotificationVisible(false);
                }
            } catch (e) {
                console.error("[UNIVERSAL-PLAYER] Failed to auto-download prop subtitleUrl:", e);
            }
        };

        autoDownloadAndApply();
        
        // Load saved styles
        const savedSize = localStorage.getItem('sub_size');
        const savedColor = localStorage.getItem('sub_color');
        const savedOpacity = localStorage.getItem('sub_opacity');
        const savedBlur = localStorage.getItem('sub_blur');
        const savedShowBg = localStorage.getItem('sub_show_bg');

        if (savedSize) setSubtitleSize(Number(savedSize));
        if (savedColor) setSubtitleColor(savedColor);
        if (savedOpacity) setSubBgOpacity(Number(savedOpacity));
        if (savedBlur) setSubBlur(savedBlur === 'true');
        if (savedShowBg) setShowSubBackground(savedShowBg !== 'false');
    }, [subtitleUrl]);

    // Save styles when changed
    useEffect(() => {
        localStorage.setItem('sub_size', subtitleSize.toString());
        localStorage.setItem('sub_color', subtitleColor);
        localStorage.setItem('sub_opacity', subBgOpacity.toString());
        localStorage.setItem('sub_blur', subBlur.toString());
        localStorage.setItem('sub_show_bg', showSubBackground.toString());
    }, [subtitleSize, subtitleColor, subBgOpacity, subBlur, showSubBackground]);

    // Fetch and parse VTT whenever localSubtitleUrl changes
    useEffect(() => {
        if (!localSubtitleUrl) {
            setSubtitleCues([]);
            return;
        }

        let active = true;

        const fetchAndParseVtt = async () => {
            try {
                let text = '';
                if (localSubtitleUrl.startsWith('blob:')) {
                    const res = await fetch(localSubtitleUrl);
                    if (res.ok) text = await res.text();
                } else {
                    const blobUrl = await subtitleService.getSubtitleBlob(localSubtitleUrl);
                    if (blobUrl) {
                        const res = await fetch(blobUrl);
                        if (res.ok) text = await res.text();
                    }
                }

                if (text && active) {
                    let processedText = text;
                    if (!processedText.startsWith('WEBVTT')) {
                        processedText = 'WEBVTT\n\n' + processedText.replace(/(\d+:\d+:\d+),(\d+)/g, '$1.$2').replace(/^\d+$/gm, '');
                    }
                    const cues = subtitleService.parseVtt(processedText);
                    const hasKurdish = /[\u0600-\u06FF]/.test(processedText);
                    if (hasKurdish) {
                        const introCues = [
                            { start: 1.0, end: 4.0, text: "ژێرنووسکراوە لەلایەن زانا فاروقەوە" },
                            { start: 4.5, end: 7.5, text: "FLKRD Studio" }
                        ];
                        // Filter out original cues starting in the first 7.5s to prevent overlaps
                        const mainCues = cues.filter(c => c.start >= 7.5);
                        setSubtitleCues([...introCues, ...mainCues]);
                    } else {
                        setSubtitleCues(cues);
                    }
                }
            } catch (e) {
                console.error("[UNIVERSAL-PLAYER] Error fetching/parsing subtitle URL:", e);
            }
        };

        fetchAndParseVtt();

        return () => {
            active = false;
        };
    }, [localSubtitleUrl]);

    const handleIframeLoad = () => {
        setLoading(false);
        if (onLoad) onLoad();

        // Subscribe to PlayerJS and JW Player events
        try {
            if (iframeRef.current && iframeRef.current.contentWindow) {
                const win = iframeRef.current.contentWindow;
                // Standard player.js event subscription
                win.postMessage(JSON.stringify({ event: 'addEventListener', value: 'timeupdate' }), '*');
                win.postMessage(JSON.stringify({ event: 'addEventListener', value: 'time' }), '*');
                win.postMessage(JSON.stringify({ context: 'player.js', method: 'addEventListener', value: 'timeupdate' }), '*');
                win.postMessage(JSON.stringify({ context: 'player.js', method: 'addEventListener', value: 'time' }), '*');

                // JWPlayer standard postMessage api subscription
                win.postMessage(JSON.stringify({ method: 'registerListener', value: 'time' }), '*');
            }
        } catch (e) {
            console.warn("[UNIVERSAL-PLAYER] Failed to post init message to iframe:", e);
        }
    };

    const handleSearchAllSubs = async () => {
        if (!imdbId || !contentType) return;
        setIsSearchingSubs(true);
        try {
            const results = await subtitleService.searchSubtitles(imdbId, contentType, season, episode, 'ku', true);
            setAvailableSubsWithVirtual(results);
        } catch (e) {
            console.error("Manual search error:", e);
        } finally {
            setIsSearchingSubs(false);
        }
    };

    // Resolve subtitleUrl prop (passed from DetailPage) to a local WebVTT Blob URL automatically on mount or change
    useEffect(() => {
        if (!subtitleUrl) {
            setLocalSubtitleUrl(null);
            return;
        }

        let active = true;

        const resolvePropSubtitle = async () => {
            try {
                console.log("[UNIVERSAL-PLAYER] Auto-resolving subtitleUrl prop:", subtitleUrl);
                const blobUrl = await subtitleService.getSubtitleBlob(subtitleUrl);
                if (blobUrl && active) {
                    setLocalSubtitleUrl(blobUrl);
                }
            } catch (err) {
                console.error("[UNIVERSAL-PLAYER] Failed to auto-resolve subtitleUrl prop:", err);
            }
        };

        resolvePropSubtitle();

        return () => {
            active = false;
        };
    }, [subtitleUrl]);

    // Background discovery of Kurdish Subtitles on load or when parameters change
    useEffect(() => {
        const discoverKurdishCC = async () => {
            if (!contentType) return;
            const idToQuery = tmdbId || imdbId;
            if (!idToQuery) return;
            try {
                // 1. Fetch available subs from OpenSubtitles if imdbId is present
                let safeResults: SubtitleResult[] = [];
                if (imdbId) {
                    try {
                        const results = await subtitleService.searchSubtitles(imdbId, contentType, season, episode, 'ku', true);
                        safeResults = Array.isArray(results) ? results : [];
                    } catch (openSubErr) {
                        console.warn("[UNIVERSAL-PLAYER] OpenSubtitles search failed:", openSubErr);
                    }
                }

                // 2. Fetch custom subtitle from Supabase custom_subtitles table
                let customSub: SubtitleResult | null = null;
                let query = supabase
                    .from('custom_subtitles')
                    .select('*')
                    .eq('tmdb_id', String(idToQuery))
                    .eq('media_type', contentType || 'movie')
                    .eq('language', 'ku')
                    .eq('season', contentType === 'tv' ? (season ?? 0) : 0)
                    .eq('episode', contentType === 'tv' ? (episode ?? 0) : 0);

                const { data } = await query.maybeSingle();
                        
                    if (data && data.subtitle_url) {
                        let subUrl = data.subtitle_url;
                        if (subUrl.startsWith('//')) {
                            subUrl = `https:${subUrl}`;
                        }
                        customSub = {
                            id: `custom-db-${data.id}`,
                            attributes: {
                                language: data.language || 'ku',
                                display_name: 'Kurdish',
                                url: subUrl,
                                file_id: 0
                            }
                        };
                    }

                let finalSubs = safeResults;
                if (customSub) {
                    // Filter out any other Kurdish subtitles to show only the official admin-uploaded one
                    const nonKurdishSubs = safeResults.filter(s => {
                        if (!s || !s.attributes) return false;
                        const lang = (s.attributes.language || '').toLowerCase();
                        return lang !== 'ku' && lang !== 'ckb' && lang !== 'kur' && lang !== 'badini';
                    });
                    finalSubs = [customSub, ...nonKurdishSubs];
                    
                    // Auto-select and auto-apply the custom subtitle by default
                    if (!subtitleUrl && !localSubtitleUrl) {
                        console.log("[UNIVERSAL-PLAYER] Automatically applying custom uploaded subtitle:", customSub.attributes.url);
                        try {
                            const text = await subtitleService.downloadSubtitle(customSub);
                            if (text) {
                                let processedText = text;
                                if (!processedText.startsWith('WEBVTT')) {
                                    processedText = 'WEBVTT\n\n' + processedText.replace(/(\d+:\d+:\d+),(\d+)/g, '$1.$2').replace(/^\d+$/gm, '');
                                }
                                const blob = new Blob([processedText], { type: 'text/vtt' });
                                setLocalSubtitleUrl(URL.createObjectURL(blob));
                                setKurdishSub(customSub);
                                setKuCCNotificationVisible(false);
                            }
                        } catch (err) {
                            console.warn("Failed to auto-apply custom subtitle:", err);
                        }
                    } else if (kurdishSub === null) {
                        setKurdishSub(customSub);
                    }
                } else if (safeResults.length > 0) {
                    const foundKu = safeResults.find(sub => {
                        const lang = (sub?.attributes?.language || '').toLowerCase();
                        return lang === 'ku' || lang === 'ckb' || lang === 'kur';
                    });
                    if (foundKu) {
                        setKurdishSub(foundKu);
                        
                        // [AUTO APPLY] Automatically download and apply the background-discovered Kurdish subtitle if not already loaded!
                        if (!subtitleUrl && !localSubtitleUrl) {
                            console.log("[UNIVERSAL-PLAYER] Automatically downloading background-discovered Kurdish CC...");
                            try {
                                const text = await subtitleService.downloadSubtitle(foundKu);
                                if (text) {
                                    let processedText = text;
                                    if (!processedText.startsWith('WEBVTT')) {
                                        processedText = 'WEBVTT\n\n' + processedText.replace(/(\d+:\d+:\d+),(\d+)/g, '$1.$2').replace(/^\d+$/gm, '');
                                    }
                                    const blob = new Blob([processedText], { type: 'text/vtt' });
                                    setLocalSubtitleUrl(URL.createObjectURL(blob));
                                    setKuCCNotificationVisible(false); // Applied automatically, so no need for prompt banner
                                } else {
                                    setKuCCNotificationVisible(true);
                                }
                            } catch (err: any) {
                                console.warn("[UNIVERSAL-PLAYER] Background CC auto-apply failed:", err?.message || err);
                                setKuCCNotificationVisible(true);
                            }
                        } else {
                            // If a subtitle is already loaded, still show banner in case they want the official one
                            setKuCCNotificationVisible(true);
                        }
                    }
                }
                setAvailableSubsWithVirtual(finalSubs);
            } catch (e: any) {
                console.warn("[UNIVERSAL-PLAYER] Background Kurdish CC search failed gracefully:", e?.message || e);
                setAvailableSubsWithVirtual([]);
            }
        };

        discoverKurdishCC();
    }, [imdbId, contentType, season, episode, tmdbId]);

    // --- Load subtitle edits from Supabase and subscribe to Realtime changes ---
    useEffect(() => {
        const targetId = tmdbId || imdbId;
        if (!targetId || !localSubtitleUrl) return;

        const key: SubtitleEditKey = {
            tmdbId: String(targetId),
            mediaType: contentType || 'movie',
            season: season ?? 0,
            episode: episode ?? 0,
            language: 'ku',
        };

        // Initial fetch
        fetchSubtitleEdits(key).then(map => setSubEditMap(map));

        // Real-time subscription — updates map whenever admin saves an edit
        const channel = subscribeSubtitleEdits(key, (updatedMap) => {
            setSubEditMap(new Map(updatedMap));
        });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tmdbId, imdbId, contentType, season, episode, localSubtitleUrl]);

    // Background discovery of Kurdish Dubbed movies from Supabase Cloud
    useEffect(() => {
        const checkKurdishDub = async () => {
            if (!imdbId) return;
            try {
                const cleanId = imdbId.toString();
                const isImdb = cleanId.startsWith('tt');
                
                // Try IndexedDB first
                const allMovies = await db.getMovies();
                if (allMovies && allMovies.length > 0) {
                    const cleanString = (str: string) => {
                        if (!str) return '';
                        return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
                    };
                    const targetTitleClean = title ? cleanString(title) : '';
                    
                    const match = allMovies.find((m: any) => {
                        if (isImdb && m.imdb_id === cleanId) return true;
                        if (!isImdb && m.tmdb_id === parseInt(cleanId)) return true;

                        if (targetTitleClean) {
                            const dbTitleClean = cleanString(m.title);
                            const dbKurdishClean = cleanString(m.kurdishTitle);
                            
                            if (dbTitleClean && (dbTitleClean.includes(targetTitleClean) || targetTitleClean.includes(dbTitleClean))) return true;
                            if (dbKurdishClean && (dbKurdishClean.includes(targetTitleClean) || targetTitleClean.includes(dbKurdishClean))) return true;
                        }
                        return false;
                    });
                    
                    if (match) {
                        console.log("[UNIVERSAL-PLAYER] Kurdish Dubbed Version established via IndexedDB:", match);
                        setKurdishDub(match);
                        return;
                    }
                }

                // If not found in IndexedDB, fallback to direct Supabase query
                let query = supabase.from('dubbed_movies').select('id, title, kurdishTitle, videoUrl, media_type, imdb_id, tmdb_id');
                if (isImdb) {
                    query = query.eq('imdb_id', cleanId);
                } else {
                    const numId = parseInt(cleanId);
                    if (!isNaN(numId)) {
                        query = query.eq('tmdb_id', numId);
                    }
                }
                
                const { data, error } = await query;
                if (data && data.length > 0) {
                    console.log("[UNIVERSAL-PLAYER] Kurdish Dubbed Version established via ID query:", data[0]);
                    setKurdishDub(data[0]);
                    return;
                }

                // Fallback: Query all dubbed movies from Supabase and match by title
                const { data: allSupabaseMovies } = await supabase.from('dubbed_movies').select('id, title, kurdishTitle, videoUrl, media_type, imdb_id, tmdb_id');
                if (allSupabaseMovies && allSupabaseMovies.length > 0) {
                    const cleanString = (str: string) => {
                        if (!str) return '';
                        return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
                    };

                    const targetTitleClean = title ? cleanString(title) : '';
                    
                    const match = allSupabaseMovies.find((m: any) => {
                        if (isImdb && m.imdb_id === cleanId) return true;
                        if (!isImdb && m.tmdb_id === parseInt(cleanId)) return true;

                        if (targetTitleClean) {
                            const dbTitleClean = cleanString(m.title);
                            const dbKurdishClean = cleanString(m.kurdishTitle);
                            
                            if (dbTitleClean && (dbTitleClean.includes(targetTitleClean) || targetTitleClean.includes(dbTitleClean))) return true;
                            if (dbKurdishClean && (dbKurdishClean.includes(targetTitleClean) || targetTitleClean.includes(dbKurdishClean))) return true;
                        }
                        return false;
                    });

                    if (match) {
                        console.log("[UNIVERSAL-PLAYER] Kurdish Dubbed Version established via fallback title match:", match);
                        setKurdishDub(match);
                    } else {
                        setKurdishDub(null);
                    }
                } else {
                    setKurdishDub(null);
                }
            } catch (e) {
                console.warn("[UNIVERSAL-PLAYER] Failed to query Kurdish Dub:", e);
            }
        };
        checkKurdishDub();
    }, [imdbId, title]);

    const handleDownloadAndApplyKurdishCC = async () => {
        if (!kurdishSub) return;
        setIsDownloadingKu(true);
        try {
            const text = await subtitleService.downloadSubtitle(kurdishSub);
            if (text) {
                let processedText = text;
                if (!processedText.startsWith('WEBVTT')) {
                    processedText = 'WEBVTT\n\n' + processedText.replace(/(\d+:\d+:\d+),(\d+)/g, '$1.$2').replace(/^\d+$/gm, '');
                }
                const blob = new Blob([processedText], { type: 'text/vtt' });
                const blobUrl = URL.createObjectURL(blob);
                setLocalSubtitleUrl(blobUrl);
                setKuCCNotificationVisible(false);
            }
        } catch (e: any) {
            console.warn("[UNIVERSAL-PLAYER] Auto Kurdish CC download failed gracefully:", e?.message || e);
        } finally {
            setIsDownloadingKu(false);
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

            const hasNativeFullscreen = !!containerRef.current.requestFullscreen || 
                                        !!(containerRef.current as any).webkitRequestFullscreen ||
                                        !!(containerRef.current as any).mozRequestFullScreen ||
                                        !!(containerRef.current as any).msRequestFullscreen;

            if (!hasNativeFullscreen) {
                setIsSimulatedFullscreen(prev => !prev);
                setIsFullscreen(prev => !prev);
                return;
            }

            // Handle Browser Fullscreen
            if (!document.fullscreenElement) {
                containerRef.current?.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                    setIsSimulatedFullscreen(true);
                    setIsFullscreen(true);
                });
            } else {
                document.exitFullscreen();
            }
        });
    };

    useEffect(() => {
        if (startFullscreen && !document.fullscreenElement && !isSimulatedFullscreen) {
            toggleFullscreen();
        }
    }, [startFullscreen]);

    const handleSelectSub = async (sub: SubtitleResult) => {
        setIsSearchingSubs(true);
        try {
            const text = await subtitleService.downloadSubtitle(sub);
            
            if (text) {
                // Just create blob for native track fallback (HLS) and set localSubtitleUrl.
                // The new unified useEffect will automatically fetch/parse/shift cues from this URL.
                let processedText = text;
                if (!processedText.startsWith('WEBVTT')) {
                    processedText = 'WEBVTT\n\n' + processedText.replace(/(\d+:\d+:\d+),(\d+)/g, '$1.$2').replace(/^\d+$/gm, '');
                }
                const blob = new Blob([processedText], { type: 'text/vtt' });
                setLocalSubtitleUrl(URL.createObjectURL(blob));
                setShowSubSettings(false);
            }
        } catch (e) {
            console.error("Subtitle selection error:", e);
            alert((language === 'ku' || language === 'badini') ? 'ناتوانرێت ئەم ژێرنووسە لۆد بکرێت. تکایە دانەیەکی تر تاقی بکەرەوە.' : 'Failed to load this subtitle. Please try another track.');
        } finally {
            setIsSearchingSubs(false);
        }
    };

    // --- Admin: Save subtitle line edit to Supabase (visible to all users via Realtime) ---
    const handleSaveSubtitleEdit = async () => {
        if (!editingCue) return;
        const targetId = tmdbId || imdbId;
        if (!targetId) return;

        const key: SubtitleEditKey = {
            tmdbId: String(targetId),
            mediaType: contentType || 'movie',
            season: season ?? 0,
            episode: episode ?? 0,
            language: 'ku',
        };

        setSubEditSaving(true);
        const ok = await saveSubtitleLineEdit(
            key,
            editingCue.index,
            editingCue.original,
            editingCue.current.trim()
        );
        setSubEditSaving(false);

        if (ok) {
            // Optimistically update local map for instant display (Realtime will confirm)
            setSubEditMap(prev => {
                const next = new Map(prev);
                next.set(editingCue.index, editingCue.current.trim());
                return next;
            });
            setEditingCue(null);
            // Resume video playback after saving
            if (videoRef.current && videoRef.current.paused) {
                videoRef.current.play().catch(() => {});
            }
        }
    };

    // --- Admin: Restore subtitle line to original (deletes edit from Supabase) ---
    const handleRestoreSubtitleEdit = async () => {
        if (!editingCue) return;
        const targetId = tmdbId || imdbId;
        if (!targetId) return;

        const key: SubtitleEditKey = {
            tmdbId: String(targetId),
            mediaType: contentType || 'movie',
            season: season ?? 0,
            episode: episode ?? 0,
            language: 'ku',
        };

        setSubEditSaving(true);
        const ok = await deleteSubtitleLineEdit(key, editingCue.index);
        setSubEditSaving(false);

        if (ok) {
            setSubEditMap(prev => {
                const next = new Map(prev);
                next.delete(editingCue.index);
                return next;
            });
            setEditingCue(null);
            // Resume video playback after restoring
            if (videoRef.current && videoRef.current.paused) {
                videoRef.current.play().catch(() => {});
            }
        }
    };

    useEffect(() => {
        // Disabled onboarding prompt automatically on play as requested by the user
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
            let paused = undefined;
            let eventName = undefined;

            // Parse playback state / event type
            const msgEvent = (payload.event || payload.type || payload.method || '').toLowerCase();
            
            if (msgEvent === 'play' || msgEvent === 'playing' || msgEvent === 'vjs-play') {
                paused = false;
                eventName = 'play';
            } 
            else if (msgEvent === 'pause' || msgEvent === 'paused' || msgEvent === 'vjs-pause') {
                paused = true;
                eventName = 'pause';
            } 
            else if (msgEvent === 'seek' || msgEvent === 'seeking' || msgEvent === 'seeked' || msgEvent === 'vjs-seek') {
                eventName = 'seek';
            }

            if (paused === true) {
                setIsPlaying(false);
            } else if (paused === false) {
                setIsPlaying(true);
            }

            // Comprehensive postMessage event parser for all embed sources
            if (payload.type === 'timeupdate' || payload.type === 'vjs-timeupdate') {
                newTime = payload.data?.currentTime || payload.currentTime || payload.seconds;
            } 
            else if (payload.event === 'timeupdate' || payload.event === 'media_time' || payload.event === 'time' || payload.event === 'progress') {
                newTime = payload.text || payload.data?.currentTime || payload.data?.seconds || payload.data?.time || payload.data || payload.time || payload.value || payload.seconds;
            }
            else if (payload.type === 'PLAYER_EVENT' || payload.type === 'MEDIA_DATA') {
                newTime = payload.data?.currentTime || payload.data?.seconds || payload.data?.time || payload.currentTime || payload.seconds;
            }
            else if (payload.currentTime !== undefined) {
                newTime = payload.currentTime;
            }
            else if (payload.data?.currentTime !== undefined) {
                newTime = payload.data.currentTime;
            }
            else if (payload.seconds !== undefined) {
                newTime = payload.seconds;
            }
            else if (payload.time !== undefined) {
                newTime = payload.time;
            }
            else if (payload.value !== undefined) {
                newTime = payload.value;
            }
            else if (payload.position !== undefined) {
                newTime = payload.position;
            }
            else if (payload.data?.position !== undefined) {
                newTime = payload.data.position;
            }
            else if (payload.timestamp !== undefined) {
                newTime = payload.timestamp;
            }

            const timeAsNum = newTime !== undefined ? Number(newTime) : undefined;

            if (timeAsNum !== undefined && !isNaN(timeAsNum)) {
                // Prevent Unix timestamp overflow (we only accept actual playhead time < 13.8 hours)
                if (timeAsNum < 50000) {
                    setCurrentTime(timeAsNum);
                    lastReceivedTimeRef.current = timeAsNum;
                    lastMessageTimeRef.current = performance.now();
                    setIsPlaying(true);

                    if (onProgressRef.current) {
                        onProgressRef.current({
                            currentTime: timeAsNum,
                            paused: paused,
                            event: eventName || 'timeupdate',
                            duration: payload.duration !== undefined ? Number(payload.duration) : undefined
                        });
                    }
                }
            } else if (eventName !== undefined) {
                if (eventName === 'seek') {
                    lastMessageTimeRef.current = performance.now();
                }
                if (onProgressRef.current) {
                    onProgressRef.current({
                        currentTime: currentTimeRef.current,
                        paused: paused,
                        event: eventName
                    });
                }
            }
        } catch (e) { }
    }, []); // Listener is now absolutely stable

    useEffect(() => {
        window.addEventListener('message', handlePlayerMessages);
        return () => window.removeEventListener('message', handlePlayerMessages);
    }, [handlePlayerMessages]);

    // Fullscreen change listener to sync state and redirect iframe fullscreen to container
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFull = !!document.fullscreenElement;
            setIsFullscreen(isFull);

            // Intercept iframe fullscreen and redirect to container
            if (document.fullscreenElement === iframeRef.current && containerRef.current) {
                console.log("[PLAYER] Intercepted iframe fullscreen. Redirecting to container...");
                document.exitFullscreen().then(() => {
                    containerRef.current?.requestFullscreen().catch(err => {
                        console.error("[PLAYER] Failed to redirect fullscreen:", err);
                    });
                });
                return;
            }

            // If user exited native fullscreen, trigger onClose after a tiny delay (to avoid transition race conditions)
            if (!isFull && startFullscreen && onClose) {
                setTimeout(() => {
                    if (!document.fullscreenElement) {
                        console.log("[PLAYER] Exited native fullscreen. Closing player...");
                        onClose();
                    }
                }, 250);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, [startFullscreen, onClose]);

    useEffect(() => {
        if (!isSimulatedFullscreen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsSimulatedFullscreen(false);
                setIsFullscreen(false);
                if (onClose) onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSimulatedFullscreen, onClose]);

    useEffect(() => {
        return () => {
            if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        };
    }, []);

    // Screen Wake Lock API integration to prevent display sleep mode
    useEffect(() => {
        let wakeLock: any = null;

        const requestLock = async () => {
            if ('wakeLock' in navigator && isPlaying) {
                try {
                    wakeLock = await navigator.wakeLock.request('screen');
                    console.log('[WAKE LOCK] Screen Wake Lock acquired successfully');
                } catch (err) {
                    console.warn('[WAKE LOCK] Failed to acquire Screen Wake Lock:', err);
                }
            }
        };

        const releaseLock = async () => {
            if (wakeLock) {
                try {
                    await wakeLock.release();
                    console.log('[WAKE LOCK] Screen Wake Lock released');
                    wakeLock = null;
                } catch (err) {
                    console.warn('[WAKE LOCK] Failed to release Screen Wake Lock:', err);
                }
            }
        };

        if (isPlaying) {
            requestLock();
        } else {
            releaseLock();
        }

        // Re-acquire wake lock when tab becomes visible again
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isPlaying) {
                requestLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            releaseLock();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isPlaying]);

    useEffect(() => {
        if (!peerSyncTrigger) return;

        console.log("[PEER SYNC EFFECT] Applying peer sync update in UniversalVideoPlayer:", peerSyncTrigger);

        if (videoRef.current) {
            const timeDiff = Math.abs(videoRef.current.currentTime - peerSyncTrigger.currentTime);
            if (timeDiff > 2) {
                videoRef.current.currentTime = peerSyncTrigger.currentTime;
            }
            if (peerSyncTrigger.paused && !videoRef.current.paused) {
                videoRef.current.pause();
            } else if (!peerSyncTrigger.paused && videoRef.current.paused) {
                videoRef.current.play().catch((err) => {
                    console.warn("[PEER SYNC EFFECT] Failed to play video on sync:", err);
                });
            }
        } else if (isIframe && iframeRef.current?.contentWindow) {
            const win = iframeRef.current.contentWindow;
            const targetTime = peerSyncTrigger.currentTime;
            const targetPaused = peerSyncTrigger.paused;

            try {
                // Post standard Player.js / JWPlayer / Video.js postMessage commands to control seek & play/pause
                win.postMessage(JSON.stringify({ event: 'setCurrentTime', value: targetTime }), '*');
                win.postMessage(JSON.stringify({ context: 'player.js', method: 'setCurrentTime', value: targetTime }), '*');
                win.postMessage(JSON.stringify({ method: 'seek', value: targetTime }), '*');
                win.postMessage(JSON.stringify({ method: 'setCurrentTime', value: targetTime }), '*');

                // Comprehensive seek command suites for iframe compatibility (Vimeo/PlayerJS)
                win.postMessage(JSON.stringify({ context: 'player.js', event: 'command', command: 'seek', value: targetTime }), '*');
                win.postMessage(JSON.stringify({ context: 'player.js', version: '1.4.0', event: 'command', command: 'seek', value: targetTime }), '*');
                win.postMessage(JSON.stringify({ event: 'command', command: 'seek', value: targetTime }), '*');
                win.postMessage(JSON.stringify({ command: 'seek', value: targetTime }), '*');

                win.postMessage(JSON.stringify({ event: targetPaused ? 'pause' : 'play' }), '*');
                win.postMessage(JSON.stringify({ context: 'player.js', method: targetPaused ? 'pause' : 'play' }), '*');
                win.postMessage(JSON.stringify({ method: targetPaused ? 'pause' : 'play' }), '*');

                // Play/Pause command suites
                win.postMessage(JSON.stringify({ context: 'player.js', event: 'command', command: targetPaused ? 'pause' : 'play', value: null }), '*');
                win.postMessage(JSON.stringify({ event: 'command', command: targetPaused ? 'pause' : 'play', value: null }), '*');

                // Update iframe src directly if it supports progress/start query parameters (for Videasy, VidKing, etc.)
                const currentIframeSrc = iframeRef.current.src;
                if (currentIframeSrc) {
                    const url = new URL(currentIframeSrc);
                    let urlChanged = false;

                    if (url.searchParams.has('progress')) {
                        const newProg = Math.floor(targetTime).toString();
                        if (url.searchParams.get('progress') !== newProg) {
                            url.searchParams.set('progress', newProg);
                            urlChanged = true;
                        }
                    }
                    if (url.searchParams.has('start')) {
                        const newStart = Math.floor(targetTime).toString();
                        if (url.searchParams.get('start') !== newStart) {
                            url.searchParams.set('start', newStart);
                            urlChanged = true;
                        }
                    }
                    if (url.searchParams.has('startTime')) {
                        const newStart = Math.floor(targetTime).toString();
                        if (url.searchParams.get('startTime') !== newStart) {
                            url.searchParams.set('startTime', newStart);
                            urlChanged = true;
                        }
                    }

                    if (urlChanged) {
                        console.log("[PEER SYNC EFFECT] Reloading iframe to sync progress:", url.toString());
                        iframeRef.current.src = url.toString();
                    }
                }
            } catch (err) {
                console.warn("[PEER SYNC EFFECT] Error posting message or updating iframe src:", err);
            }
        }
    }, [peerSyncTrigger, isHls, isIframe]);

    // ----------------------------------------------------
    // TAURI BYPASS SCRAPER FOR LOCAL CINEPRO (FLKRD SERVER 4)
    // ----------------------------------------------------
    useEffect(() => {
        const activeSrc = src;
        if (!activeSrc) return;

        const isCinePro = activeSrc.includes('localhost:') || activeSrc.includes('127.0.0.1:') || activeSrc.includes('cinepro');
        const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;

        if (isCinePro && isTauri) {
            let isMounted = true;
            setLoading(true);
            setIsScraping(true);
            setScrapingError(null);

            const scrapeStream = async () => {
                try {
                    const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
                    console.log("[TAURI SCRAPER] Initiating Tauri HTTP bypass fetch for:", activeSrc);
                    
                    const response = await tauriFetch(activeSrc, {
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Referer': 'https://vidlink.pro',
                            'Accept': 'application/json, text/html, */*'
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`Server returned HTTP ${response.status}`);
                    }

                    const contentType = response.headers.get('content-type') || '';
                    let directUrl = '';

                    if (contentType.includes('application/json')) {
                        const data = await response.json();
                        directUrl = data.streamUrl || data.url || data.stream || (data.sources && data.sources[0]?.url);
                    } else {
                        const text = await response.text();
                        
                        // Parse config JSON if embedded in html script
                        const jsonMatch = text.match(/const\s+config\s*=\s*({.*?});/s) || text.match(/window\.config\s*=\s*({.*?});/s);
                        if (jsonMatch) {
                            try {
                                const config = JSON.parse(jsonMatch[1]);
                                directUrl = config.streamUrl || config.url || config.stream;
                            } catch (e) {}
                        }

                        if (!directUrl) {
                            // Find standard .m3u8 HLS URLs
                            const hlsMatch = text.match(/(https?:\/\/[^\s"'`]+\.m3u8[^\s"'`]*)/i);
                            if (hlsMatch) {
                                directUrl = hlsMatch[1];
                            } else {
                                // Find relative m3u8 path
                                const relativeHls = text.match(/["'](\/[^\s"'`]+\.m3u8[^\s"'`]*)["']/i);
                                if (relativeHls) {
                                    directUrl = relativeHls[1];
                                } else {
                                    // Find standard mp4 links
                                    const mp4Match = text.match(/(https?:\/\/[^\s"'`]+\.mp4[^\s"'`]*)/i);
                                    if (mp4Match) {
                                        directUrl = mp4Match[1];
                                    }
                                }
                            }
                        }
                    }

                    if (directUrl && isMounted) {
                        console.log("[TAURI SCRAPER] Successfully resolved direct stream URL:", directUrl);
                        let cleanUrl = directUrl.replace(/\\/g, '');
                        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
                            try {
                                const origin = new URL(activeSrc).origin;
                                cleanUrl = origin + (cleanUrl.startsWith('/') ? '' : '/') + cleanUrl;
                            } catch (e) {}
                        }
                        setOverrideSrc(cleanUrl);
                    } else if (isMounted) {
                        throw new Error("No direct streaming source could be extracted from CinePro response.");
                    }
                } catch (err: any) {
                    console.error("[TAURI SCRAPER] Scraping failed:", err);
                    if (isMounted) {
                        setScrapingError(err.message || 'Scraping failed');
                    }
                } finally {
                    if (isMounted) {
                        setIsScraping(false);
                        setLoading(false);
                    }
                }
            };

            scrapeStream();
            return () => {
                isMounted = false;
            };
        } else {
            // Reset overrideSrc if switching to a non-CinePro source
            setOverrideSrc(null);
        }
    }, [src]);

    useEffect(() => {
        const activeSrc = overrideSrc || src;
        if (!activeSrc) {
            setLoading(false);
            return;
        }

        if (activeSrc !== lastSrc.current) {
            lastSrc.current = activeSrc;
            setLoading(false);
            setHlsError(false);

            const isDirect =
                activeSrc.toLowerCase().endsWith('.m3u8') ||
                activeSrc.toLowerCase().endsWith('.mp4') ||
                activeSrc.toLowerCase().endsWith('.webm') ||
                activeSrc.includes('video.m3u8') ||
                activeSrc.includes('_av1.m3u8') ||
                activeSrc.includes('_h264.m3u8');

            const isCinePro = activeSrc.includes('localhost:') || activeSrc.includes('127.0.0.1:') || activeSrc.includes('cinepro');
            const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;

            setIsHls(isDirect);

            // If we are on Tauri and loading CinePro, don't show standard iframe yet
            if (isCinePro && isTauri && !isDirect) {
                setIsIframe(false);
                setLoading(true);
            } else {
                setIsIframe(!isDirect);
            }

            // Safety timeout — hide loader after 6s regardless
            if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
            safetyTimerRef.current = setTimeout(() => {
                setLoading(false);
            }, 6000);
        }

        if (isHls && !hlsError) {
            if (activeSrc.toLowerCase().includes('.m3u8') && window.Hls) {
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
                        hls.loadSource(activeSrc);
                        hls.attachMedia(videoRef.current);
                        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                            if (videoRef.current) videoRef.current.volume = 0.5;
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
                videoRef.current.src = activeSrc;
                videoRef.current.onloadeddata = () => {
                    if (videoRef.current) videoRef.current.volume = 0.5;
                    setLoading(false);
                };
                videoRef.current.onerror = () => {
                    setHlsError(true);
                    setIsIframe(true);
                    setIsHls(false);
                    setLoading(false);
                };
            }
        }
    }, [src, overrideSrc, onLoad, hlsError, isHls]);

    const frozenSrcRef = useRef<string | null>(null);
    const lastContentKeyRef = useRef<string>('');
    const activeSrcForIframe = overrideSrc || src;
    
    const currentContentKey = React.useMemo(() => {
        try {
            const url = new URL(activeSrcForIframe);
            url.searchParams.delete('start');
            url.searchParams.delete('startAt');
            return url.toString();
        } catch (e) {
            return activeSrcForIframe.replace(/[?&]start=\d+/, '').replace(/[?&]startAt=\d+/, '');
        }
    }, [activeSrcForIframe]);

    const iframeSrc = React.useMemo(() => {
        const cleanSrc = activeSrcForIframe.includes('<iframe')
            ? (activeSrcForIframe.match(/src=["'](.*?)["']/) || [])[1]
            : activeSrcForIframe;
        let finalSrc = cleanSrc || '';

        // Detect iOS Safari (including Capacitor/Tauri on iOS WebView)
        const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

        // Force inline playback for iOS on external embed providers
        // This prevents the native AVPlayer from hijacking the video element
        if (finalSrc && !finalSrc.includes('playsinline=')) {
            finalSrc += (finalSrc.includes('?') ? '&' : '?') + 'playsinline=1';
        }
        if (isIOS && finalSrc && !finalSrc.includes('webkit-playsinline=')) {
            finalSrc += '&webkit-playsinline=1';
        }
        if (isIOS && finalSrc && !finalSrc.includes('muted=')) {
            // Some iOS WebViews require muted for inline autoplay
            // Do NOT force muted — Videasy handles this internally
        }

        if (frozenSrcRef.current && currentContentKey === lastContentKeyRef.current) {
            return frozenSrcRef.current;
        }

        frozenSrcRef.current = finalSrc;
        lastContentKeyRef.current = currentContentKey;
        return finalSrc;
    }, [src, overrideSrc, currentContentKey]);

    const stableKey = React.useMemo(() => {
        if (!iframeSrc) return '';
        try {
            const url = new URL(iframeSrc);
            url.searchParams.delete('start');
            url.searchParams.delete('progress');
            return url.toString();
        } catch (e) {
            return iframeSrc.split('&start=')[0].split('&progress=')[0];
        }
    }, [iframeSrc]);

    return (
        <div 
            ref={containerRef} 
            className={`bg-black flex items-center justify-center overflow-hidden transition-all duration-300 ${
                isSimulatedFullscreen 
                    ? 'fixed inset-0 w-screen h-screen z-[9999]' 
                    : 'w-full h-full relative'
            }`}
        >

            {/* AdGuardOnboarding disabled on play as requested by the user */}

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
                    <div className="absolute top-4 right-4 z-40 flex flex-row items-center gap-2">
                        {((contentType === 'tv' && onEpisodeChange) || (contentType === 'movie' && movieRecommendations.length > 0)) && (
                            <button 
                                onClick={() => {
                                    setShowEpisodesPortal(!showEpisodesPortal);
                                    setShowSubSettings(false);
                                }}
                                className="p-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-white transition-all shadow-2xl hover:bg-white/20 hover:scale-105 active:scale-95"
                                title={(language === 'ku' || language === 'badini') 
                                    ? (contentType === 'tv' ? 'ئەڵقەکان' : 'فیلمەکان') 
                                    : (contentType === 'tv' ? 'Episodes' : 'More Movies')}
                            >
                                <Tv size={18} className={showEpisodesPortal ? 'text-red-500 scale-110' : ''} />
                            </button>
                        )}
                        <button 
                            onClick={() => {
                                if (availableSubs.length === 0) return;
                                setShowSubSettings(!showSubSettings);
                                if (!showSubSettings) handleSearchAllSubs();
                                setShowEpisodesPortal(false);
                            }}
                            disabled={availableSubs.length === 0}
                            className={`p-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-white transition-all shadow-2xl ${
                                availableSubs.length === 0 
                                ? 'opacity-40 cursor-not-allowed text-gray-500' 
                                : 'hover:bg-white/20 hover:scale-105 active:scale-95'
                            }`}
                            title={availableSubs.length === 0 ? ((language === 'ku' || language === 'badini') ? 'ژێرنووس بەردەست نییە' : 'No Subtitles Available') : ((language === 'ku' || language === 'badini') ? 'ژێرنووس' : 'Subtitles')}
                        >
                            <Subtitles size={18} className={showSubSettings ? 'rotate-90 text-red-500' : ''} />
                        </button>

                        <button 
                            onClick={toggleFullscreen}
                            className="p-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-white transition-all shadow-2xl hover:bg-white/20 hover:scale-105 active:scale-95"
                            title={isFullscreen 
                                ? ((language === 'ku' || language === 'badini') ? 'دەرچوون لە شاشەی تەواو' : 'Exit Fullscreen') 
                                : ((language === 'ku' || language === 'badini') ? 'شاشەی تەواو' : 'Fullscreen')
                            }
                        >
                            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
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
                                            <Subtitles size={14} className="text-red-600" />
                                            {(language === 'ku' || language === 'badini') ? 'ڕێکخستنی ژێرنووس' : 'Subtitle Studio'}
                                        </h3>
                                        <button onClick={() => setShowSubSettings(false)} className="text-gray-500 hover:text-white transition-colors">
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Premium Segmented Control Tab Bar */}
                                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                                            <button 
                                                onClick={() => setSubStudioTab('sub')}
                                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${subStudioTab === 'sub' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                            >
                                                {(language === 'ku' || language === 'badini') ? 'ژێرنووس' : 'Subtitles'}
                                            </button>
                                            <button 
                                                onClick={() => setSubStudioTab('dub')}
                                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${subStudioTab === 'dub' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                            >
                                                {(language === 'ku' || language === 'badini') ? 'دۆبلاژ' : 'Doblaj & Audio'}
                                            </button>
                                        </div>

                                        {subStudioTab === 'sub' ? (
                                            <>
                                                <div className="flex flex-col gap-4">
                                                    {isAdmin && (
                                                        <div className="bg-red-950/20 border border-red-500/20 p-4 rounded-2xl flex flex-col gap-3">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[9px] font-black text-red-500 tracking-wider flex items-center gap-1.5 uppercase">
                                                                    <ShieldCheck size={12} /> ADMIN SYSTEM
                                                                </span>
                                                                <span className="text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-widest animate-pulse">CC Manager</span>
                                                            </div>
                                                            
                                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide leading-relaxed">
                                                                {(language === 'ku' || language === 'badini') 
                                                                    ? 'فایلی ژێرنووسی تایبەت (.vtt یان .srt) ئاپلۆد بکە بۆ ئەم بابەتە' 
                                                                    : 'Upload a custom subtitle file (.vtt or .srt) for this movie/show.'}
                                                            </p>

                                                            <div className="flex flex-col gap-2">
                                                                <input 
                                                                    type="file" 
                                                                    accept=".vtt,.srt" 
                                                                    id="admin-sub-upload-input"
                                                                    multiple
                                                                    className="hidden" 
                                                                    onChange={handleAdminSubUpload}
                                                                />
                                                                <button
                                                                    onClick={() => document.getElementById('admin-sub-upload-input')?.click()}
                                                                    disabled={isUploadingSub}
                                                                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[9px] active:scale-95 transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)] disabled:opacity-50"
                                                                >
                                                                    <Download size={12} className="rotate-180" />
                                                                    {isUploadingSub 
                                                                        ? ((language === 'ku' || language === 'badini') ? 'ئاپلۆد دەکرێت...' : 'UPLOADING...') 
                                                                        : ((language === 'ku' || language === 'badini') ? 'هەڵبژاردنی ژێرنووس' : 'UPLOAD CC FILE')}
                                                                </button>
                                                                
                                                                {uploadStatus && (
                                                                    <span className={`text-[8px] font-black uppercase tracking-widest text-center mt-1 ${
                                                                        uploadStatus.type === 'success' ? 'text-green-500' : 'text-red-500'
                                                                    }`}>
                                                                        {uploadStatus.message}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                        {(language === 'ku' || language === 'badini') ? 'قەبارەی نوسین' : 'Font Size'}
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
                                                    {(language === 'ku' || language === 'badini') ? 'ڕەنگی نوسین' : 'Typography Color'}
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
                                                        {(language === 'ku' || language === 'badini') ? 'ڕادەی ڕوونی پشتەوە' : 'Backdrop Opacity'}
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
                                                    {(language === 'ku' || language === 'badini') ? 'کاریگەری شووشە' : 'Glassmorphism'}
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
                                            <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    {(language === 'ku' || language === 'badini') ? 'پێشاندانی پشتەوە' : 'Show Background'}
                                                </label>
                                                <button 
                                                    onClick={() => setShowSubBackground(!showSubBackground)}
                                                    className={`w-10 h-5 rounded-full transition-all relative ${showSubBackground ? 'bg-red-600' : 'bg-white/10'}`}
                                                >
                                                    <motion.div 
                                                        animate={{ x: showSubBackground ? 22 : 4 }}
                                                        className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm"
                                                    />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-4">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                        {(language === 'ku' || language === 'badini') ? 'خێرایی ژێرنووس (چرکە)' : 'Subtitle Sync (Sec)'}
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
                                                    {(language === 'ku' || language === 'badini') ? 'گەڕان بۆ ژێرنووس' : 'Subtitle Discovery'}
                                                </label>
                                                <div className="relative group">
                                                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors" />
                                                    <input 
                                                        type="text"
                                                        placeholder={(language === 'ku' || language === 'badini') ? 'گەڕان بۆ زمان...' : 'Find a language...'}
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
                                                        {(language === 'ku' || language === 'badini') ? 'لۆدکردنی زمانەکان...' : 'FETCHING CLOUD SUBS...'}
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
                                                                const aLang = (a?.attributes?.language || '').toLowerCase();
                                                                const bLang = (b?.attributes?.language || '').toLowerCase();
                                                                const aIsKu = aLang === 'ku' || aLang === 'ckb' || aLang === 'kur';
                                                                const bIsKu = bLang === 'ku' || bLang === 'ckb' || bLang === 'kur';
                                                                if (aIsKu && !bIsKu) return -1;
                                                                if (!aIsKu && bIsKu) return 1;
                                                                return 0;
                                                            })
                                                            .map(sub => {
                                                                const sLang = (sub?.attributes?.language || '').toLowerCase();
                                                                const isKurdishSub = sLang === 'ku' || sLang === 'ckb' || sLang === 'kur' || sLang === 'badini';
                                                                return (
                                                                    <button 
                                                                        key={sub.id}
                                                                        onClick={() => handleSelectSub(sub)}
                                                                        className={`w-full text-left p-3.5 rounded-[20px] transition-all duration-300 border flex items-center gap-4 group relative overflow-hidden ${
                                                                            isKurdishSub 
                                                                            ? 'bg-gradient-to-r from-red-600/10 to-transparent border-red-600/30 hover:border-red-500/60 shadow-[0_4px_20px_rgba(229,9,20,0.1)]' 
                                                                            : 'bg-gradient-to-r from-white/[0.03] to-transparent border-white/5 hover:border-white/15 hover:bg-white/[0.06]'
                                                                        }`}
                                                                    >
                                                                        {/* Prominent Flag Container */}
                                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-inner ${
                                                                            isKurdishSub
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
                                                                                    isKurdishSub ? 'text-red-500' : 'text-gray-400 group-hover:text-gray-300'
                                                                                } transition-colors`}>
                                                                                    {sub?.attributes?.language || 'UNKNOWN'}
                                                                                </span>
                                                                                {isKurdishSub && String(sub.id).startsWith('custom-db-') && (
                                                                                    <span className="text-[7px] bg-blue-600 text-white px-1.5 py-0.5 rounded-md font-black shadow-[0_0_10px_rgba(29,155,240,0.5)] uppercase tracking-tighter flex items-center gap-1 shrink-0">
                                                                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-white shrink-0">
                                                                                          <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.941.1-1.358.275C14.77 2.515 13.512 1.5 12 1.5s-2.77 1.015-3.372 2.285c-.417-.175-.878-.275-1.358-.275-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .941-.1 1.358-.275.602 1.27 1.86 2.285 3.372 2.285s2.77-1.015 3.372-2.285c.417.175.878.275 1.358.275 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.5 4L6 12.5l1.4-1.4 2.6 2.6 6.6-6.6 1.4 1.4-8 8z" />
                                                                                        </svg>
                                                                                        Verified
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <span className="text-gray-200 font-bold text-[11px] group-hover:text-white transition-colors truncate w-full">
                                                                                {sub?.attributes?.display_name?.replace(/\.srt|\.vtt/g, '') || 'Standard Track'}
                                                                            </span>
                                                                        </div>
                                                                        
                                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                                                            isKurdishSub
                                                                            ? 'bg-red-600/20 text-red-500 group-hover:bg-red-600 group-hover:text-white'
                                                                            : 'bg-white/5 text-gray-500 group-hover:bg-white/10 group-hover:text-white'
                                                                        }`}>
                                                                            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                                                        </div>
                                                                    
                                                                        {isKurdishSub && (
                                                                            <div className="absolute top-1/2 -translate-y-1/2 right-0 w-24 h-24 bg-red-600/20 blur-[30px] rounded-full pointer-events-none" />
                                                                        )}
                                                                    </button>
                                                                );
                                                            })
                                                    ) : (
                                                    <div className="py-6 flex flex-col items-center gap-3 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                                                        <span className="text-[9px] font-bold text-gray-500 text-center px-4">
                                                            {(language === 'ku' || language === 'badini') ? 'هیچ ژێرنووسێکی تر نەدۆزرایەوە' : 'NO OTHER SUBTITLES FOUND'}
                                                        </span>
                                                        <button 
                                                            onClick={handleSearchAllSubs}
                                                            className="px-4 py-2 bg-white/5 rounded-full text-[8px] font-black uppercase hover:bg-white/10 transition-all"
                                                        >
                                                            {(language === 'ku' || language === 'badini') ? 'دوبارە گەڕان' : 'RETRY SEARCH'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                            </>
                                    ) : (
                                        <div className="flex flex-col gap-4">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                {(language === 'ku' || language === 'badini') ? 'لیستی دۆبلاژەکان' : 'Dubbing & Audio Feeds'}
                                            </label>
                                            
                                            <div className="flex flex-col gap-3 max-h-[48vh] overflow-y-auto pr-2 custom-scrollbar">
                                                {/* 1. Kurdish Dubbed Feed */}
                                                <div className={`p-4 rounded-[20px] border flex flex-col gap-3 transition-all relative overflow-hidden ${
                                                    kurdishDub 
                                                        ? 'bg-gradient-to-r from-yellow-500/10 to-red-500/5 border-yellow-500/30 shadow-[0_4px_24px_rgba(234,179,8,0.15)]'
                                                        : 'bg-white/[0.02] border-white/5 opacity-60'
                                                }`}>
                                                    <div className="flex items-center gap-3 relative z-10">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                                                            kurdishDub ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-white/5 border-white/10'
                                                        }`}>
                                                            {getLanguageFlag('ku')}
                                                        </div>
                                                        <div className="flex flex-col flex-1 min-w-0 text-left">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <span className={`font-[1000] text-[9px] uppercase tracking-[0.2em] ${kurdishDub ? 'text-yellow-500' : 'text-gray-400'}`}>
                                                                    {(language === 'ku' || language === 'badini') ? 'کوردی' : 'KURDISH'}
                                                                </span>
                                                                {kurdishDub && (
                                                                    <span className="text-[7px] bg-yellow-500 text-black px-1.5 py-0.5 rounded-md font-black shadow-[0_0_10px_rgba(234,179,8,0.4)] uppercase tracking-tighter flex items-center gap-0.5">
                                                                        <Sparkles size={8} /> Premium Dub
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-white font-bold text-[11px] truncate">
                                                                {(language === 'ku' || language === 'badini') ? 'دۆبلاژکراوی کوردی' : 'Kurdish Dubbed Feed'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {kurdishDub ? (
                                                        <button 
                                                            onClick={() => {
                                                                const getRashabaId = (url: string) => {
                                                                    if (!url) return "mKkhrFhjQr3CKwz"; 
                                                                    const matches = url.match(/\/([a-zA-Z0-9]{12,20})\//);
                                                                    if (matches) return matches[1];
                                                                    const parts = url.split('/');
                                                                    return parts[parts.length - 2] || "mKkhrFhjQr3CKwz";
                                                                };
                                                                let newSrc = kurdishDub.videoUrl || '';
                                                                if (newSrc.includes('rashaba.com')) {
                                                                    const rid = getRashabaId(newSrc);
                                                                    newSrc = `https://rashaba.com/embed/${rid}`;
                                                                }
                                                                // Append dynamic dubbed title suffix
                                                                const baseTitle = translatedTitles.ku || translatedTitles.ckb || title || '';
                                                                const suffixTitle = baseTitle + ' Kurdish';
                                                                const connector = newSrc.includes('?') ? '&' : '?';
                                                                newSrc = `${newSrc}${connector}title=${encodeURIComponent(suffixTitle)}`;
                                                                
                                                                setOverrideSrc(newSrc);
                                                                setActiveAudioTrack('ku');
                                                            }}
                                                            className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                                                activeAudioTrack === 'ku'
                                                                    ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                                                                    : 'bg-white/10 hover:bg-white/20 text-white'
                                                            }`}
                                                        >
                                                            <Mic2 size={12} />
                                                            {activeAudioTrack === 'ku' 
                                                                ? ((language === 'ku' || language === 'badini') ? 'چالاکە' : 'ACTIVE AUDIO FEED')
                                                                : ((language === 'ku' || language === 'badini') ? 'گۆڕین بۆ دەنگی کوردی' : 'SWITCH TO KURDISH AUDIO')}
                                                        </button>
                                                    ) : (
                                                        <div className="w-full py-2 border border-dashed border-white/10 rounded-xl text-center text-[9px] font-bold text-gray-500">
                                                            {(language === 'ku' || language === 'badini') ? 'دۆبلاژی کوردی بەردەست نییە' : 'KURDISH DUB NOT AVAILABLE YET'}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 2. Original English Feed */}
                                                <button 
                                                    onClick={() => {
                                                        setOverrideSrc(null);
                                                        setActiveAudioTrack('en');
                                                    }}
                                                    className={`w-full p-4 rounded-[20px] border flex items-center gap-3 transition-all ${
                                                        activeAudioTrack === 'en'
                                                            ? 'bg-red-600/10 border-red-500/30 text-white shadow-[0_4px_20px_rgba(229,9,20,0.1)]'
                                                            : 'bg-white/[0.02] border-white/5 hover:border-white/10 text-gray-400 hover:text-white'
                                                    }`}
                                                >
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                                                        activeAudioTrack === 'en' ? 'bg-red-600/20 border-red-500/30' : 'bg-white/5 border-white/10'
                                                    }`}>
                                                        {getLanguageFlag('en')}
                                                    </div>
                                                    <div className="flex flex-col text-left flex-1 min-w-0">
                                                        <span className="font-[1000] text-[9px] uppercase tracking-[0.2em] text-red-500">
                                                            {(language === 'ku' || language === 'badini') ? 'ئینگلیزی' : 'ENGLISH'}
                                                        </span>
                                                        <span className="text-white font-bold text-[11px] truncate">
                                                            {(language === 'ku' || language === 'badini') ? 'دەنگی بنەڕەتی' : 'Original Theatrical Audio'}
                                                        </span>
                                                    </div>
                                                    {activeAudioTrack === 'en' && <Tv size={14} className="text-red-500 shrink-0" />}
                                                </button>

                                                {/* Other Multi-Language Dubbed Options */}
                                                {['ar', 'fa', 'tr'].map(lang => {
                                                    const langLabelMap: Record<string, { label: string, desc: string, full: string }> = {
                                                        ar: { label: 'ARABIC', desc: 'عەرەبی - دۆبلاژ', full: 'Arabic' },
                                                        fa: { label: 'PERSIAN', desc: 'فارسی - دۆبلاژ', full: 'Persian' },
                                                        tr: { label: 'TURKISH', desc: 'تورکی - دۆبلاژ', full: 'Turkish' },
                                                    };
                                                    const meta = langLabelMap[lang];
                                                    
                                                    return (
                                                        <button 
                                                            key={lang}
                                                            onClick={() => {
                                                                let activeId = imdbId || '';
                                                                if (!activeId) {
                                                                    const match = src.match(/\/(movie|tv)\/([^/?#]+)/);
                                                                    if (match) activeId = match[2];
                                                                }
                                                                
                                                                // Custom Dubbed Title Suffixes
                                                                let baseTitle = title || '';
                                                                if (lang === 'fa' && translatedTitles.fa) baseTitle = translatedTitles.fa;
                                                                else if (lang === 'ar' && translatedTitles.ar) baseTitle = translatedTitles.ar;
                                                                else if (lang === 'tr' && translatedTitles.tr) baseTitle = translatedTitles.tr;

                                                                let dubbedTitle = baseTitle;
                                                                if (lang === 'fa') dubbedTitle += ' Persian';
                                                                else if (lang === 'ar') dubbedTitle += ' AR';
                                                                else if (lang === 'tr') dubbedTitle += ' Turkish';

                                                                let targetSrc = src;
                                                                try {
                                                                    const cleanSrc = targetSrc.includes('<iframe')
                                                                        ? (targetSrc.match(/src=["'](.*?)["']/) || [])[1]
                                                                        : targetSrc;
                                                                    
                                                                    const urlObj = new URL(cleanSrc);
                                                                    urlObj.searchParams.set('title', dubbedTitle);
                                                                    urlObj.searchParams.set('dub', '1');
                                                                    
                                                                    if (cleanSrc.includes('multiembed.mov') && activeId) {
                                                                        const isImdb = activeId.startsWith('tt');
                                                                        if (!isImdb) urlObj.searchParams.set('tmdb', '1');
                                                                        if (contentType === 'tv') {
                                                                            urlObj.searchParams.set('s', String(season || 1));
                                                                            urlObj.searchParams.set('e', String(episode || 1));
                                                                        }
                                                                    }
                                                                    
                                                                    targetSrc = urlObj.toString();
                                                                } catch (e) {
                                                                    const connector = targetSrc.includes('?') ? '&' : '?';
                                                                    if (targetSrc.includes('title=')) {
                                                                        targetSrc = targetSrc.replace(/title=[^&]*/, `title=${encodeURIComponent(dubbedTitle)}`);
                                                                    } else {
                                                                        targetSrc = `${targetSrc}${connector}title=${encodeURIComponent(dubbedTitle)}`;
                                                                    }
                                                                    if (!targetSrc.includes('dub=')) {
                                                                        targetSrc = `${targetSrc}&dub=1`;
                                                                    }
                                                                }
                                                                
                                                                setOverrideSrc(targetSrc);
                                                                setActiveAudioTrack(lang);
                                                                setShowDubInfoModal(meta.full);
                                                            }}
                                                            className={`w-full p-4 rounded-[20px] border flex items-center gap-3 transition-all ${
                                                                activeAudioTrack === lang
                                                                    ? 'bg-red-600/10 border-red-500/30 text-white shadow-[0_4px_20px_rgba(229,9,20,0.1)]'
                                                                    : 'bg-white/[0.02] border-white/5 hover:border-white/10 text-gray-400 hover:text-white'
                                                            }`}
                                                        >
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                                                                activeAudioTrack === lang ? 'bg-red-600/20 border-red-500/30' : 'bg-white/5 border-white/10'
                                                            }`}>
                                                                {getLanguageFlag(lang)}
                                                            </div>
                                                            <div className="flex flex-col text-left flex-1 min-w-0">
                                                                <span className="font-[1000] text-[9px] uppercase tracking-[0.2em] text-red-500">
                                                                    {meta.label}
                                                                </span>
                                                                <span className="text-white font-bold text-[11px] truncate">
                                                                    {meta.desc}
                                                                </span>
                                                            </div>
                                                            <Globe size={14} className="text-gray-500 shrink-0" />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button 
                                    onClick={() => setShowSubSettings(false)}
                                    className="mt-6 py-4 bg-red-600/10 border border-red-600/20 rounded-[20px] text-[11px] font-black uppercase text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-lg hover:shadow-red-600/20"
                                >
                                    {(language === 'ku' || language === 'badini') ? 'داخستن' : 'Dismiss Studio'}
                                </button>
                            </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Elegant Floating Kurdish CC Banner removed as requested by the user */}
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
                                {(language === 'ku' || language === 'badini') ? 'ئامادەکردنی پەیوەندی پارێزراو...' : 'INITIALIZING SECURE NODE'}
                            </span>
                            <div className="flex flex-col items-center gap-3">
                                {/* AdGuard guide button disabled on play as requested by the user */}
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
                    id="vidking-player"
                    ref={videoRef}
                    className="w-full h-full object-contain z-10 pointer-events-none"
                    style={{ WebkitPlaysInline: 'inline' } as any}
                    controls={false}
                    muted
                    autoPlay
                    playsInline
                    preload="auto"
                    crossOrigin="anonymous"
                    onTimeUpdate={(e) => {
                        const time = e.currentTarget.currentTime;
                        setCurrentTime(time);
                        onProgressRef.current?.({ 
                            currentTime: time, 
                            paused: e.currentTarget.paused,
                            duration: e.currentTarget.duration
                        });
                    }}
                    onPlaying={() => setLoading(false)}
                    onPlay={(e) => onProgressRef.current?.({ 
                        currentTime: e.currentTarget.currentTime, 
                        paused: false, 
                        event: 'play',
                        duration: e.currentTarget.duration
                    })}
                    onPause={(e) => onProgressRef.current?.({ 
                        currentTime: e.currentTarget.currentTime, 
                        paused: true, 
                        event: 'pause',
                        duration: e.currentTarget.duration
                    })}
                    onSeeking={(e) => onProgressRef.current?.({ 
                        currentTime: e.currentTarget.currentTime, 
                        paused: e.currentTarget.paused, 
                        event: 'seek',
                        duration: e.currentTarget.duration
                    })}
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
                        className="absolute bottom-[10%] md:bottom-[15%] left-0 right-0 z-50 flex justify-center px-4 md:px-6 w-full"
                        style={{
                            fontSize: `clamp(14px, ${subtitleSize}px, 6.5vw)`,
                            color: subtitleColor,
                            fontFamily: "'Zain', 'Outfit', sans-serif",
                            // Only block pointer events when not admin so video controls still work
                            pointerEvents: isAdmin ? 'auto' : 'none',
                        }}
                    >
                        {(() => {
                            const offsetSec = subtitleOffset / 1000;
                            // Find the active cue index (not just the cue object) so we can use it as edit key
                            const activeCueIndex = subtitleCues.findIndex(cue =>
                                currentTime >= (cue.start + offsetSec - 0.1) && currentTime <= (cue.end + offsetSec + 0.1)
                            );
                            if (activeCueIndex === -1) return null;

                            const activeCue = subtitleCues[activeCueIndex];
                            // Apply admin edit if one exists for this cue
                            const displayText = subEditMap.has(activeCueIndex)
                                ? subEditMap.get(activeCueIndex)!
                                : activeCue.text;

                            const isRtl = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(displayText);
                            const isEdited = subEditMap.has(activeCueIndex);

                            return (
                                <div className="relative flex flex-col items-center select-none">
                                    {/* Admin edit badge */}
                                    {isAdmin && (
                                        <div
                                            className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                                            style={{ pointerEvents: 'auto' }}
                                        >
                                            <span className="text-[9px] font-black uppercase tracking-widest bg-black/70 text-white/60 px-2 py-0.5 rounded-full border border-white/10">
                                                {language === 'ku' || language === 'badini' ? 'دەسکاری' : 'Edit line'}
                                            </span>
                                        </div>
                                    )}

                                    <div
                                        onClick={() => {
                                            if (!isAdmin) return;
                                            // Pause video when opening the edit modal
                                            if (videoRef.current && !videoRef.current.paused) {
                                                videoRef.current.pause();
                                            }
                                            setEditingCue({
                                                index: activeCueIndex,
                                                original: activeCue.text,
                                                current: displayText,
                                            });
                                        }}
                                        className={`px-4 sm:px-6 md:px-8 py-2 md:py-3 rounded-[16px] md:rounded-[24px] text-center font-black tracking-tight transition-all duration-200 max-w-[95vw] sm:max-w-[85vw] ${
                                            showSubBackground ? 'shadow-[0_32px_64px_rgba(0,0,0,0.8)] border border-white/10' : ''
                                        } ${isAdmin ? 'cursor-pointer hover:ring-2 hover:ring-white/30 active:scale-[0.99]' : ''} ${isEdited ? 'ring-1 ring-yellow-400/40' : ''}`}
                                        style={{
                                            direction: isRtl ? 'rtl' : 'ltr',
                                            unicodeBidi: isRtl ? 'plaintext' : 'normal',
                                            textAlign: 'center',
                                            backgroundColor: showSubBackground ? `rgba(0, 0, 0, ${subBgOpacity})` : 'transparent',
                                            backdropFilter: showSubBackground && subBlur && subBgOpacity > 0 ? 'blur(20px)' : 'none',
                                            WebkitBackdropFilter: showSubBackground && subBlur && subBgOpacity > 0 ? 'blur(20px)' : 'none',
                                            border: isEdited ? '1px solid rgba(250,204,21,0.3)' : showSubBackground ? undefined : 'none',
                                            boxShadow: showSubBackground ? undefined : 'none',
                                            textShadow: showSubBackground
                                                ? '0 2px 4px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.4)'
                                                : '0 2px 4px #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 8px rgba(0,0,0,0.8)',
                                            textWrap: 'balance',
                                            wordBreak: 'break-word',
                                            lineHeight: isRtl ? '1.5' : '1.4',
                                        }}
                                    >
                                        {displayText.split('\n').map((line, idx) => (
                                            <div key={`${line}-${idx}`} className="text-center drop-shadow-2xl">
                                                {line}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Edited indicator for admins */}
                                    {isAdmin && isEdited && (
                                        <div className="mt-1 text-[8px] font-black uppercase tracking-widest text-yellow-400/70">
                                            {language === 'ku' || language === 'badini' ? '✎ دەسکارییەک کراوە' : '✎ Edited'}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════════════════
                 Admin Subtitle Line Edit Modal
                 Only visible to admins; backdrop prevents video interactions
            ═══════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {isAdmin && editingCue !== null && (
                    <motion.div
                        key="sub-edit-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[200] flex items-end justify-center pb-16 px-4"
                        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setEditingCue(null);
                                // Resume video when dismissing by backdrop click
                                if (videoRef.current && videoRef.current.paused) {
                                    videoRef.current.play().catch(() => {});
                                }
                            }
                        }}
                    >
                        <motion.div
                            initial={{ y: 40, opacity: 0, scale: 0.97 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 40, opacity: 0, scale: 0.97 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                            className="w-full max-w-xl bg-[#0e0e0e] border border-white/10 rounded-3xl p-5 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400">✎</span>
                                    <span className="text-[11px] font-black uppercase tracking-widest text-white">
                                        {language === 'ku' || language === 'badini' ? 'دەسکاری ریزی ژێرنووس' : 'Edit Subtitle Line'}
                                    </span>
                                    <span className="text-[9px] font-bold text-white/30 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                                        #{editingCue.index + 1}
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingCue(null);
                                        if (videoRef.current) videoRef.current.play().catch(() => {});
                                    }}
                                    className="text-white/40 hover:text-white transition-colors text-lg leading-none"
                                >✕</button>
                            </div>

                            {/* Original text */}
                            <div className="mb-3 px-3 py-2 bg-white/[0.03] border border-white/5 rounded-2xl">
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">
                                    {language === 'ku' || language === 'badini' ? 'دەق ئەسڵی' : 'Original'}
                                </p>
                                <p className="text-sm text-white/50 leading-relaxed" dir="auto">{editingCue.original}</p>
                            </div>

                            {/* Editable textarea */}
                            <div className="mb-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-2">
                                    {language === 'ku' || language === 'badini' ? 'دەقی تازە' : 'New Text'}
                                </p>
                                {/* RTL-aware textarea: detect Kurdish Unicode range */}
                                {(() => {
                                    const isKurdishText = /[\u0600-\u06FF]/.test(editingCue.current || editingCue.original);
                                    return (
                                        <textarea
                                            autoFocus
                                            value={editingCue.current}
                                            onChange={(e) => setEditingCue(prev => prev ? { ...prev, current: e.target.value } : null)}
                                            rows={3}
                                            dir={isKurdishText ? 'rtl' : 'ltr'}
                                            lang={isKurdishText ? 'ckb' : 'en'}
                                            className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-medium resize-none outline-none focus:border-yellow-400/40 focus:ring-1 focus:ring-yellow-400/20 transition-all placeholder:text-white/20"
                                            style={{
                                                fontFamily: isKurdishText ? "'Zain', 'Rabar_041', sans-serif" : "'Outfit', sans-serif",
                                                textAlign: isKurdishText ? 'right' : 'left',
                                                lineHeight: isKurdishText ? '1.8' : '1.5',
                                                fontSize: isKurdishText ? '15px' : '14px',
                                            }}
                                            placeholder={language === 'ku' || language === 'badini' ? 'ریزەکە لێرە بنووسە...' : 'Type the corrected line here...'}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape') {
                                                    setEditingCue(null);
                                                    if (videoRef.current && videoRef.current.paused) videoRef.current.play().catch(() => {});
                                                }
                                                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSaveSubtitleEdit();
                                            }}
                                        />
                                    );
                                })()}
                                <p className="text-[8px] text-white/20 mt-1">
                                    {language === 'ku' || language === 'badini' ? 'Ctrl+Enter بۆ پاشەکەوتکردن • Esc بۆ داخستن' : 'Ctrl+Enter to save • Esc to close'}
                                </p>
                            </div>


                            {/* Action buttons */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleSaveSubtitleEdit}
                                    disabled={subEditSaving || !editingCue.current.trim()}
                                    className="flex-1 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-yellow-400 text-black hover:bg-yellow-300 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-yellow-400/20"
                                >
                                    {subEditSaving ? '...' : (language === 'ku' || language === 'badini' ? 'پاشەکەوتکردن' : 'Save for All')}
                                </button>

                                {subEditMap.has(editingCue.index) && (
                                    <button
                                        onClick={handleRestoreSubtitleEdit}
                                        disabled={subEditSaving}
                                        className="px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-red-500/20 text-red-400 hover:bg-red-500/30 active:scale-95 transition-all border border-red-500/20 disabled:opacity-40"
                                    >
                                        {language === 'ku' || language === 'badini' ? 'گێڕانەوە' : 'Restore'}
                                    </button>
                                )}

                                <button
                                    onClick={() => {
                                        setEditingCue(null);
                                        // Resume video on cancel
                                        if (videoRef.current && videoRef.current.paused) {
                                            videoRef.current.play().catch(() => {});
                                        }
                                    }}
                                    className="px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-white/5 text-white/50 hover:bg-white/10 active:scale-95 transition-all border border-white/10"
                                >
                                    {language === 'ku' || language === 'badini' ? 'هەڵوەشاندنەوە' : 'Cancel'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Iframe Embed — key forces full remount ONLY on URL change (excluding start time) */}
            {isIframe && iframeSrc && (
                <iframe
                    ref={iframeRef}
                    key={stableKey}
                    src={iframeSrc}
                    className="w-full h-full border-none z-10"
                    style={{ display: 'block' }}
                    // NO sandbox — providers detect sandbox and refuse to load
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; display-capture; web-share; storage-access; camera; microphone"
                    referrerPolicy="strict-origin-when-cross-origin"
                    // @ts-ignore
                    scrolling="no"
                    // iOS Safari: prevent native video player takeover
                    // @ts-ignore
                    webkit-playsinline="true"
                    // @ts-ignore
                    x-webkit-airplay="deny"
                    onLoad={handleIframeLoad}
                    title="FLKRD Universal Player"
                />
            )}

            {/* Elegant Glassmorphic Multi-Audio Helper Modal */}
            <AnimatePresence>
                {showDubInfoModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/85 backdrop-blur-2xl z-[300] flex items-center justify-center p-4 md:p-6"
                    >
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-[#0c0c0c] border border-white/10 rounded-[32px] p-6 max-w-sm w-full text-center flex flex-col gap-6 shadow-[0_32px_64px_rgba(0,0,0,0.8)] relative overflow-hidden"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                            {/* Curved Flag Background Glow */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-600/10 blur-[40px] rounded-full pointer-events-none" />

                            <div className="mx-auto w-16 h-16 rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 text-3xl animate-bounce">
                                <Volume2 size={32} />
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-white font-black text-lg tracking-tight uppercase">
                                    {(language === 'ku' || language === 'badini') ? 'دەنگی دۆبلاژ ئامادەیە!' : 'Dubbed Audio Active!'}
                                </h4>
                                <p className="text-gray-400 text-xs leading-relaxed text-left">
                                    {(language === 'ku' || language === 'badini') 
                                        ? `دۆبلاژی [${showDubInfoModal}] چالاک کرا! لەناو لیستی سێرڤەرەکان یان دوگمەی دەنگ (Audio) لە خوارەوەی ڕاستی ڤیدیۆکە، دەتوانیت زمانەکە یان سێرڤەری دۆبلاژ هەڵبژێریت.`
                                        : `The [${showDubInfoModal}] dubbed version is now active! Inside the player, you can select the Dubbed version from the server list or toggle the language track using the Audio settings button.`}
                                </p>
                            </div>

                            <button 
                                onClick={() => setShowDubInfoModal(null)}
                                className="py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-red-600/20"
                            >
                                {(language === 'ku' || language === 'badini') ? 'باشە، تێگەیشتم' : 'Got it, let\'s play'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Media Portal Drawer (Top-Down Sliding Cinema Overlay) */}
            <AnimatePresence>
                {showEpisodesPortal && (
                    <motion.div 
                        initial={{ y: '-100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '-100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 100 }}
                        className="absolute top-0 left-0 right-0 h-[68%] border-b border-white/10 z-[200] px-6 py-5 md:py-6 flex flex-col gap-4 select-none shadow-[0_24px_50px_rgba(0,0,0,0.9)] overflow-hidden"
                        style={{ 
                            fontFamily: (language === 'ku' || language === 'badini') ? "'Zain', sans-serif" : "'Inter', sans-serif",
                            background: 'radial-gradient(circle at 50% -20%, rgba(220, 38, 38, 0.28), transparent 72%), linear-gradient(to bottom, rgba(8, 8, 12, 0.45) 0%, rgba(3, 3, 5, 0.6) 100%)',
                            backdropFilter: 'blur(35px) saturate(210%)',
                            WebkitBackdropFilter: 'blur(35px) saturate(210%)',
                            boxShadow: '0 20px 80px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                        }}
                    >
                        {/* Header Row */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-3 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="bg-red-600/10 border border-red-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                                    <Tv size={12} className="text-red-500 animate-pulse" />
                                    <span className={`font-black text-red-500 uppercase tracking-widest leading-none ${(language === 'ku' || language === 'badini') ? 'text-[13px]' : 'text-[9px]'}`}>
                                        {contentType === 'tv' 
                                            ? ((language === 'ku' || language === 'badini') ? 'پۆرتاڵی ئەڵقەکان' : 'EPISODES PORTAL')
                                            : ((language === 'ku' || language === 'badini') ? 'فیلمە هاوشێوەکان' : 'SIMILAR FILMS')}
                                    </span>
                                </div>
                                <span className={`font-bold text-white/90 tracking-wider ${(language === 'ku' || language === 'badini') ? 'text-[14px] font-black' : 'text-[10px]'}`}>
                                    {title}
                                </span>
                            </div>
                            <button 
                                onClick={() => setShowEpisodesPortal(false)} 
                                className="p-2 hover:bg-white/10 rounded-full transition-all text-gray-400 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {contentType === 'tv' && onEpisodeChange ? (
                            <>
                                {/* Season Buttons Horizontal Row */}
                                <div className="flex flex-col gap-1.5 shrink-0 text-left">
                                    <span className={`font-black text-gray-500 uppercase tracking-widest ${(language === 'ku' || language === 'badini') ? 'text-[12px]' : 'text-[8px]'}`}>
                                        {(language === 'ku' || language === 'badini') ? 'سیزنەکان' : 'SEASONS'}
                                    </span>
                                    <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-hide">
                                        {seasons.map((s) => {
                                            const isCurrentSeason = season === s.season_number;
                                            return (
                                                <button
                                                    key={s.id}
                                                    onClick={() => {
                                                        if (onSeasonChange) onSeasonChange(s.season_number);
                                                    }}
                                                    className={`relative px-5 py-2 rounded-xl font-black uppercase tracking-wider transition-all duration-300 shrink-0 cursor-pointer overflow-hidden border active:scale-95 ${
                                                        isCurrentSeason 
                                                            ? 'border-red-500/30 bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_0_20px_rgba(220,38,38,0.5)] text-white' 
                                                            : 'border-white/5 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/[0.08]'
                                                    } ${(language === 'ku' || language === 'badini') ? 'text-[13px]' : 'text-[10px]'}`}
                                                >
                                                    <span className="relative z-10 font-black">
                                                        {(language === 'ku' || language === 'badini') 
                                                            ? `سیزنی ${s.season_number}`
                                                            : `Season ${s.season_number}`}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Episodes Horizontal Swiper Container */}
                                <div className="flex-1 flex flex-col gap-1.5 overflow-hidden text-left relative">
                                    <span className={`font-black text-gray-500 uppercase tracking-widest shrink-0 ${(language === 'ku' || language === 'badini') ? 'text-[12px]' : 'text-[8px]'}`}>
                                        {(language === 'ku' || language === 'badini') 
                                            ? `ئەڵقەکانی سیزنی ${season}`
                                            : `SEASON ${season} EPISODES`}
                                    </span>
                                    
                                    <div className="relative flex-1 overflow-hidden mt-1">
                                        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black via-black/40 to-transparent pointer-events-none z-10 hidden md:block" />
                                        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black via-black/40 to-transparent pointer-events-none z-10 hidden md:block" />

                                        <motion.div 
                                            variants={containerVariants}
                                            initial="hidden"
                                            animate="show"
                                            className="h-full overflow-x-auto overflow-y-hidden flex flex-row items-stretch gap-5 py-2 px-6 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-white/[0.01] [&::-webkit-scrollbar-thumb]:bg-white/[0.08] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-red-600/50 scroll-smooth"
                                        >
                                            {!currentSeasonDetails ? (
                                                <div className="flex items-center gap-3 px-8 py-12 opacity-50 justify-center w-full">
                                                    <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                                    <span className={`font-black uppercase tracking-widest text-gray-400 ${(language === 'ku' || language === 'badini') ? 'text-[13px]' : 'text-[9px]'}`}>
                                                        {(language === 'ku' || language === 'badini') ? 'داگرتنی داتا...' : 'SYNCHRONIZING EPISODES...'}
                                                    </span>
                                                </div>
                                            ) : (
                                                currentSeasonDetails.episodes.map((ep) => {
                                                    const epKey = `${currentSeasonDetails.season_number}-${ep.episode_number}`;
                                                    const isWatched = watchedEpisodes.has(epKey);
                                                    const isActive = episode === ep.episode_number && season === currentSeasonDetails.season_number;
                                                    const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300';
                                                    
                                                    return (
                                                        <motion.div
                                                            key={ep.id}
                                                            variants={cardVariants}
                                                            whileHover={{ y: -6, scale: 1.02, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
                                                            whileTap={{ scale: 0.98 }}
                                                            onClick={() => {
                                                                if (onEpisodeChange) onEpisodeChange(currentSeasonDetails.season_number, ep.episode_number);
                                                                setShowEpisodesPortal(false);
                                                            }}
                                                            className={`w-56 shrink-0 flex flex-col gap-2 rounded-2xl border p-2 transition-all group relative cursor-pointer overflow-hidden ${
                                                                isActive
                                                                    ? 'bg-gradient-to-br from-red-600/[0.08] to-rose-500/[0.02] border-red-500/50 shadow-[0_8px_32px_rgba(220,38,38,0.25)]'
                                                                    : 'bg-white/[0.02] border-white/[0.04] hover:border-white/12 hover:bg-white/[0.06] hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]'
                                                            }`}
                                                        >
                                                            {/* Sheen sweep animation */}
                                                            <div className="absolute inset-0 w-[200%] -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent transition-transform duration-1000 ease-out pointer-events-none" />

                                                            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/5 shadow-md flex-shrink-0">
                                                                {ep.still_path ? (
                                                                    <img 
                                                                        src={`${IMAGE_BASE_URL}${ep.still_path}`} 
                                                                        alt="" 
                                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                                                        loading="lazy"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-[10px] font-bold text-gray-600">No Image</div>
                                                                )}

                                                                <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10 backdrop-blur-[2px]">
                                                                    <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                                                        <Play size={16} fill="currentColor" className="translate-x-[1.5px]" />
                                                                    </div>
                                                                </div>

                                                                {ep.vote_average > 0 && (
                                                                    <div className={`absolute top-2 left-2 bg-black/60 backdrop-blur-md text-[#FFAD1F] rounded-lg border border-white/5 flex items-center gap-1 z-20 ${(language === 'ku' || language === 'badini') ? 'text-[10px] py-[1px] px-1 font-black' : 'text-[7px] py-0.5 px-1.5 font-black uppercase tracking-wider'}`}>
                                                                        <span className="text-[8px] leading-none">★</span>
                                                                        <span>{ep.vote_average.toFixed(1)}</span>
                                                                    </div>
                                                                )}

                                                                {isActive && (
                                                                    <div className={`absolute bottom-2 left-2 bg-gradient-to-r from-red-600 to-rose-500 text-white rounded-lg flex items-center gap-1.5 z-20 shadow-[0_0_10px_rgba(220,38,38,0.5)] ${(language === 'ku' || language === 'badini') ? 'text-[9px] py-[2px] px-1.5 font-black' : 'text-[6px] py-0.5 px-2 font-black uppercase tracking-widest'}`}>
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                                                        <span>{(language === 'ku' || language === 'badini') ? 'ئێستا' : 'NOW PLAYING'}</span>
                                                                    </div>
                                                                )}

                                                                {isWatched && !isActive && (
                                                                    <div className={`absolute top-2 right-2 bg-green-500/25 backdrop-blur-md text-green-400 rounded-lg border border-green-500/30 flex items-center gap-0.5 z-20 ${(language === 'ku' || language === 'badini') ? 'text-[9px] py-[1px] px-1.5 font-black' : 'text-[7px] py-0.5 px-1.5 font-black tracking-wider'}`}>
                                                                        <span>✓</span>
                                                                        <span>{(language === 'ku' || language === 'badini') ? 'بینراوە' : 'WATCHED'}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex flex-col px-1">
                                                                <span className={`uppercase tracking-widest ${isActive ? 'text-red-400 font-bold' : 'text-gray-500'} ${(language === 'ku' || language === 'badini') ? 'text-[12px] font-black' : 'text-[9px] font-black'}`}>
                                                                    {(language === 'ku' || language === 'badini') 
                                                                        ? `ئەڵقەی ${ep.episode_number}` 
                                                                        : `Episode ${ep.episode_number}`}
                                                                </span>
                                                                <h4 className={`text-white font-black truncate group-hover:text-red-400 transition-colors mt-0.5 ${(language === 'ku' || language === 'badini') ? 'text-[15px]' : 'text-xs'}`} title={ep.name}>
                                                                    {ep.name}
                                                                </h4>
                                                                <p className={`line-clamp-2 leading-relaxed mt-1 text-white/50 group-hover:text-white/70 transition-colors duration-300 ${(language === 'ku' || language === 'badini') ? 'text-[13px] font-medium' : 'text-[10px] font-normal'}`} title={ep.overview}>
                                                                    {ep.overview || ((language === 'ku' || language === 'badini') ? 'بیۆگرافی ئەم ئەڵقەیە بەردەست نییە' : 'No description available for this episode.')}
                                                                </p>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })
                                            )}
                                        </motion.div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Movie Swiper Container */
                            <div className="flex-1 flex flex-col gap-1.5 overflow-hidden text-left relative">
                                <span className={`font-black text-gray-500 uppercase tracking-widest shrink-0 ${(language === 'ku' || language === 'badini') ? 'text-[12px]' : 'text-[8px]'}`}>
                                    {(language === 'ku' || language === 'badini') ? 'فیلمە پێشنیارکراوەکان' : 'RECOMMENDED MOVIES'}
                                </span>
                                
                                <div className="relative flex-1 overflow-hidden mt-1">
                                    <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black via-black/40 to-transparent pointer-events-none z-10 hidden md:block" />
                                    <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black via-black/40 to-transparent pointer-events-none z-10 hidden md:block" />

                                    <motion.div 
                                        variants={containerVariants}
                                        initial="hidden"
                                        animate="show"
                                        className="h-full overflow-x-auto overflow-y-hidden flex flex-row items-stretch gap-5 py-2 px-6 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-white/[0.01] [&::-webkit-scrollbar-thumb]:bg-white/[0.08] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-red-600/50 scroll-smooth"
                                    >
                                        {movieRecommendations.length === 0 ? (
                                            <div className="flex items-center gap-3 px-8 py-12 opacity-50 justify-center w-full">
                                                <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                                <span className={`font-black uppercase tracking-widest text-gray-400 ${(language === 'ku' || language === 'badini') ? 'text-[13px]' : 'text-[9px]'}`}>
                                                    {(language === 'ku' || language === 'badini') ? 'داگرتنی داتا...' : 'SYNCHRONIZING MOVIES...'}
                                                </span>
                                            </div>
                                        ) : (
                                            movieRecommendations.map((movie) => {
                                                const isActive = String(movie.id) === String(tmdbId);
                                                
                                                return (
                                                    <motion.div
                                                        key={movie.id}
                                                        variants={cardVariants}
                                                        whileHover={{ y: -6, scale: 1.02, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => {
                                                            navigate(`/details/movie/${movie.id}`);
                                                            setShowEpisodesPortal(false);
                                                        }}
                                                        className={`w-56 shrink-0 flex flex-col gap-2 rounded-2xl border p-2 transition-all group relative cursor-pointer overflow-hidden ${
                                                            isActive
                                                                ? 'bg-gradient-to-br from-red-600/[0.08] to-rose-500/[0.02] border-red-500/50 shadow-[0_8px_32px_rgba(220,38,38,0.25)]'
                                                                : 'bg-white/[0.02] border-white/[0.04] hover:border-white/12 hover:bg-white/[0.06] hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]'
                                                        }`}
                                                    >
                                                        {/* Sheen sweep animation */}
                                                        <div className="absolute inset-0 w-[200%] -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent transition-transform duration-1000 ease-out pointer-events-none" />

                                                        <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/5 shadow-md flex-shrink-0">
                                                            {movie.backdrop_path ? (
                                                                <img 
                                                                    src={`https://image.tmdb.org/t/p/w300${movie.backdrop_path}`} 
                                                                    alt="" 
                                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                                                    loading="lazy"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-[10px] font-bold text-gray-600">No Image</div>
                                                            )}

                                                            <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10 backdrop-blur-[2px]">
                                                                <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                                                    <Play size={16} fill="currentColor" className="translate-x-[1.5px]" />
                                                                </div>
                                                            </div>

                                                            {movie.vote_average > 0 && (
                                                                <div className={`absolute top-2 left-2 bg-black/60 backdrop-blur-md text-[#FFAD1F] rounded-lg border border-white/5 flex items-center gap-1 z-20 ${(language === 'ku' || language === 'badini') ? 'text-[10px] py-[1px] px-1 font-black' : 'text-[7px] py-0.5 px-1.5 font-black uppercase tracking-wider'}`}>
                                                                    <span className="text-[8px] leading-none">★</span>
                                                                    <span>{movie.vote_average.toFixed(1)}</span>
                                                                </div>
                                                            )}

                                                            {isActive && (
                                                                <div className={`absolute bottom-2 left-2 bg-gradient-to-r from-red-600 to-rose-500 text-white rounded-lg flex items-center gap-1.5 z-20 shadow-[0_0_10px_rgba(220,38,38,0.5)] ${(language === 'ku' || language === 'badini') ? 'text-[9px] py-[2px] px-1.5 font-black' : 'text-[6px] py-0.5 px-2 font-black uppercase tracking-widest'}`}>
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                                                    <span>{(language === 'ku' || language === 'badini') ? 'ئێستا' : 'NOW PLAYING'}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-col px-1 text-left">
                                                            <h4 className={`text-white font-black truncate group-hover:text-red-400 transition-colors mt-0.5 ${(language === 'ku' || language === 'badini') ? 'text-[15px]' : 'text-xs'}`} title={movie.title || movie.name}>
                                                                {movie.title || movie.name}
                                                            </h4>
                                                            <p className={`line-clamp-2 leading-relaxed mt-1 text-white/50 group-hover:text-white/70 transition-colors duration-300 ${(language === 'ku' || language === 'badini') ? 'text-[13px] font-medium' : 'text-[10px] font-normal'}`} title={movie.overview}>
                                                                {movie.overview || ((language === 'ku' || language === 'badini') ? 'کورتەی ئەم فیلمە بەردەست نییە' : 'No description available for this movie.')}
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })
                                        )}
                                    </motion.div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

// Filename Episode Parser Helper
function parseSeasonEpisodeFromFilename(filename: string, defaultSeason?: number): { season: number, episode: number } | null {
    const cleanName = filename.toLowerCase();
    
    // Pattern 1: s01e02 or s1e2 or s01.e02 or s1_e2
    const sExMatch = cleanName.match(/s(\d+)\s*[_.-]?\s*e(\d+)/);
    if (sExMatch) {
        return { season: parseInt(sExMatch[1], 10), episode: parseInt(sExMatch[2], 10) };
    }

    // Pattern 2: s1 ep4 or s01 ep04
    const sEpMatch = cleanName.match(/s(\d+)\s*ep\s*(\d+)/);
    if (sEpMatch) {
        return { season: parseInt(sEpMatch[1], 10), episode: parseInt(sEpMatch[2], 10) };
    }

    // Pattern 3: season 1 episode 4
    const seasonEpisodeMatch = cleanName.match(/season\s*(\d+)\s*episode\s*(\d+)/);
    if (seasonEpisodeMatch) {
        return { season: parseInt(seasonEpisodeMatch[1], 10), episode: parseInt(seasonEpisodeMatch[2], 10) };
    }

    // Pattern 4: season 1 ep 4
    const seasonEpMatch = cleanName.match(/season\s*(\d+)\s*ep\s*(\d+)/);
    if (seasonEpMatch) {
        return { season: parseInt(seasonEpMatch[1], 10), episode: parseInt(seasonEpMatch[2], 10) };
    }

    // Pattern 5: s1 episode 4
    const sEpisodeMatch = cleanName.match(/s(\d+)\s*episode\s*(\d+)/);
    if (sEpisodeMatch) {
        return { season: parseInt(sEpisodeMatch[1], 10), episode: parseInt(sEpisodeMatch[2], 10) };
    }
    
    // Pattern 6: 1x02 or 01x02
    const xMatch = cleanName.match(/(\d+)\s*x\s*(\d+)/);
    if (xMatch) {
        return { season: parseInt(xMatch[1], 10), episode: parseInt(xMatch[2], 10) };
    }

    // Pattern 7: ep02 or ep.02 or ep_02 or episode02 or episode_02 or episode.2
    const epMatch = cleanName.match(/(?:ep|episode)\s*[_.-]?\s*(\d+)/);
    if (epMatch) {
        return { season: defaultSeason || 1, episode: parseInt(epMatch[1], 10) };
    }

    // Pattern 8: E02 or E2
    const eOnlyMatch = cleanName.match(/[_.-]e(\d+)(?:\b|[_.-])/);
    if (eOnlyMatch) {
        return { season: defaultSeason || 1, episode: parseInt(eOnlyMatch[1], 10) };
    }

    // Pattern 9: Just a number at the end or surrounded by separators, e.g. "Game of Thrones - 03.srt" or "Game of Thrones 03"
    const numMatch = cleanName.match(/(?:\b|[_.-])(\d{1,3})(?:\b|[_.-])(?=[^0-9]*\.[a-z0-9]+$)/);
    if (numMatch) {
        return { season: defaultSeason || 1, episode: parseInt(numMatch[1], 10) };
    }

    return null;
}

export default UniversalVideoPlayer;
