import React, { useState, useEffect, useCallback } from 'react';
import { Play, Maximize, Shield, Loader2, Subtitles, X, Search, Activity, Sparkles, ArrowRight, Settings2, Mic2, Globe, Volume2, Tv, Download, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subtitleService } from '../services/subtitleService';
import { useTranslation } from '../contexts/LanguageContext';
import { supabase } from '../utils/supabaseClient';
import { fetchTranslations, fetchTmdbIdFromImdb } from '../services/tmdbService';
import { useUI } from '../contexts/UIContext';

import { Season, SeasonDetails } from '../types';

interface PremiumVidLinkPlayerProps {
  tmdbId: string;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  title?: string;
  imdbId?: string;
  initialProgress?: number;
  accentColor?: string;
  subtitleUrl?: string;
  onProgress?: (data: any) => void;
  peerSyncTrigger?: { currentTime: number; paused: boolean; timestamp: number } | null;
  seasons?: Season[];
  currentSeasonDetails?: SeasonDetails;
  watchedEpisodes?: Set<string>;
  onEpisodeChange?: (season: number, episode: number) => void;
  onSeasonChange?: (season: number) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: 'spring', 
      stiffness: 120, 
      damping: 14 
    } 
  }
};

export default function PremiumVidLinkPlayer({
  tmdbId,
  type,
  season,
  episode,
  title = 'Video Player',
  accentColor,
  initialProgress,
  subtitleUrl,
  imdbId,
  onProgress,
  peerSyncTrigger,
  seasons = [],
  currentSeasonDetails,
  watchedEpisodes = new Set(),
  onEpisodeChange,
  onSeasonChange
}: PremiumVidLinkPlayerProps) {
  const { language } = useTranslation();
  const { isAdmin } = useUI();
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [showSubSettings, setShowSubSettings] = useState(false);
  const [showEpisodesPortal, setShowEpisodesPortal] = useState(false);
  const [activeCues, setActiveCues] = useState<any[]>([]);
  const [vttContent, setVttContent] = useState<string | null>(null);
  const [isUploadingSub, setIsUploadingSub] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  // Ref so the VidLink postMessage handler always reads the latest vttContent
  // (avoids stale closure — the handler was only re-registered on [onProgress] change)
  const vttContentRef = React.useRef<string | null>(null);
  const [availableSubs, setAvailableSubs] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [currentSubId, setCurrentSubId] = useState<number | null>(null);
  const [resolvedTmdbId, setResolvedTmdbId] = useState<string | null>(null);
  const [isResolvingId, setIsResolvingId] = useState(true);
  // Keep ref in sync with state
  useEffect(() => { vttContentRef.current = vttContent; }, [vttContent]);

  const setAvailableSubsWithVirtual = useCallback((newSubs: any[]) => {
    if (!subtitleUrl) {
      setAvailableSubs(newSubs);
      return;
    }
    const virtualSub = {
      id: 'prop-kurdish-auto' as any,
      attributes: {
        language: 'ku',
        display_name: 'Kurdish CC (Auto Established)',
        url: subtitleUrl,
        file_id: 0
      }
    };
    const filtered = newSubs.filter(s => s.id !== 'prop-kurdish-auto' as any && s.attributes.url !== subtitleUrl);
    setAvailableSubs([virtualSub, ...filtered]);
  }, [subtitleUrl]);

  // Appearance Settings
  const [subFontSize, setSubFontSize] = useState(24);
  const [subColor, setSubColor] = useState('#ffffff');
  const [subBgOpacity, setSubBgOpacity] = useState(0.8);
  const [subBlur, setSubBlur] = useState(true);
  const [subtitleOffset, setSubtitleOffset] = useState(0);
  const [showSubBackground, setShowSubBackground] = useState(() => {
    try {
      const saved = localStorage.getItem('sub_show_bg');
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  // Load saved styles from localStorage on mount
  useEffect(() => {
    try {
      const savedSize = localStorage.getItem('sub_size');
      const savedColor = localStorage.getItem('sub_color');
      const savedOpacity = localStorage.getItem('sub_opacity');
      const savedBlur = localStorage.getItem('sub_blur');
      const savedShowBg = localStorage.getItem('sub_show_bg');

      if (savedSize) setSubFontSize(Number(savedSize));
      if (savedColor) setSubColor(savedColor);
      if (savedOpacity) setSubBgOpacity(Number(savedOpacity));
      if (savedBlur) setSubBlur(savedBlur === 'true');
      if (savedShowBg) setShowSubBackground(savedShowBg !== 'false');
    } catch (e) {
      console.warn("Failed to load sub settings from localStorage", e);
    }
  }, []);

  // Save styles when changed
  useEffect(() => {
    try {
      localStorage.setItem('sub_size', subFontSize.toString());
      localStorage.setItem('sub_color', subColor);
      localStorage.setItem('sub_opacity', subBgOpacity.toString());
      localStorage.setItem('sub_blur', subBlur.toString());
      localStorage.setItem('sub_show_bg', showSubBackground.toString());
    } catch (e) {
      console.warn("Failed to save sub settings to localStorage", e);
    }
  }, [subFontSize, subColor, subBgOpacity, subBlur, showSubBackground]);

  // Doblaj & Multi-Language Audio States
  const [overrideSrc, setOverrideSrc] = useState<string | null>(null);
  const [kurdishDub, setKurdishDub] = useState<any | null>(null);
  const [subStudioTab, setSubStudioTab] = useState<'sub' | 'dub'>('sub');
  const [activeAudioTrack, setActiveAudioTrack] = useState<string>('en');
  const [showDubInfoModal, setShowDubInfoModal] = useState<string | null>(null);
  const [translatedTitles, setTranslatedTitles] = useState<Record<string, string>>({});

  // 1. Dynamic TMDb ID resolution for IMDb IDs (tt...)
  useEffect(() => {
    let isMounted = true;
    const resolveId = async () => {
      setIsResolvingId(true);
      try {
        if (tmdbId && tmdbId.startsWith('tt')) {
          console.log("[VIP-PLAYER] tmdbId is an IMDb ID, resolving to TMDB ID:", tmdbId);
          const resolved = await fetchTmdbIdFromImdb(tmdbId, type);
          if (isMounted) {
            if (resolved) {
              console.log("[VIP-PLAYER] Successfully resolved to TMDB ID:", resolved);
              setResolvedTmdbId(String(resolved));
            } else {
              console.warn("[VIP-PLAYER] Failed to resolve IMDb ID, falling back to raw tmdbId:", tmdbId);
              setResolvedTmdbId(tmdbId);
            }
          }
        } else if (!tmdbId && imdbId && imdbId.startsWith('tt')) {
          console.log("[VIP-PLAYER] tmdbId is empty, resolving from imdbId prop:", imdbId);
          const resolved = await fetchTmdbIdFromImdb(imdbId, type);
          if (isMounted) {
            if (resolved) {
              setResolvedTmdbId(String(resolved));
            } else {
              setResolvedTmdbId(imdbId);
            }
          }
        } else {
          if (isMounted) {
            setResolvedTmdbId(tmdbId);
          }
        }
      } catch (error) {
        console.error("[VIP-PLAYER] Error in ID resolution:", error);
        if (isMounted) {
          setResolvedTmdbId(tmdbId);
        }
      } finally {
        if (isMounted) {
          setIsResolvingId(false);
        }
      }
    };
    resolveId();
    return () => {
      isMounted = false;
    };
  }, [tmdbId, imdbId, type]);

  // 2. Construct parameters based on official VidLink Docs & User Request
  const playerColor = accentColor?.replace('#', '') || 'ff0000';
  const startTimeParam = initialProgress && initialProgress > 10 ? `&startTime=${Math.floor(initialProgress)}` : '';
  const subParam = subtitleUrl ? `&subtitles=${encodeURIComponent(subtitleUrl)}&subLabel=Kurdish` : '';
  
  // Construct URLs for VidLink Pro (FLKRD SERVER 1)
  const vidLinkBase = type === 'movie' 
    ? `https://vidlink.pro/movie/${resolvedTmdbId || tmdbId}`
    : `https://vidlink.pro/tv/${resolvedTmdbId || tmdbId}/${season}/${episode}`;
  
  const videoUrl = `${vidLinkBase}?primaryColor=${playerColor}&secondaryColor=a2a2a2&iconColor=eefdec&playerIcon=default&title=true&poster=true&autoplay=false&nextbutton=true${startTimeParam}${subParam}`;

  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  // Fetch translations dynamically from TMDB
  useEffect(() => {
    const fetchAllTranslations = async () => {
      try {
        let tmdbIdNum: number | null = null;
        
        if (resolvedTmdbId && !isNaN(Number(resolvedTmdbId))) {
          tmdbIdNum = Number(resolvedTmdbId);
        } else if (tmdbId && !isNaN(Number(tmdbId))) {
          tmdbIdNum = Number(tmdbId);
        } else if (imdbId) {
          const resolvedId = await fetchTmdbIdFromImdb(imdbId, type);
          if (resolvedId) {
            tmdbIdNum = resolvedId;
          }
        }

        if (!tmdbIdNum) return;

        const response = await fetchTranslations(tmdbIdNum, type);
        if (response && response.translations) {
          const titlesMap: Record<string, string> = {};
          for (const translation of response.translations) {
            const langCode = translation.iso_639_1;
            if (translation.data?.title || translation.data?.name) {
              titlesMap[langCode] = translation.data.title || translation.data.name;
            }
          }
          console.log("[VIP TMDB TRANSLATIONS] Loaded translations:", titlesMap);
          setTranslatedTitles(titlesMap);
        }
      } catch (err) {
        console.error("[VIP TMDB TRANSLATIONS] Error fetching translations:", err);
      }
    };

    if (resolvedTmdbId || tmdbId) {
      fetchAllTranslations();
    }
  }, [resolvedTmdbId, tmdbId, imdbId, type]);

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
    let lastFileContent = '';

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

        if (type === 'tv') {
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
        const filePath = type === 'tv'
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
            media_type: type || 'movie',
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
        const isActiveEpisode = type !== 'tv' || 
          (fileSeason === (season || 0) && fileEpisode === (episode || 0));

        if (isActiveEpisode) {
          lastBlobUrl = URL.createObjectURL(blob);
          lastPublicUrl = resolvedPublicUrl;
          lastFileName = file.name;
          lastFileContent = fileContent;
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
      setVttContent(lastFileContent);
      const newCustomSub = {
        id: `custom-db-${targetId}`,
        attributes: {
          language: 'ku',
          display_name: 'Kurdish',
          url: lastPublicUrl,
          file_id: 0
        }
      };
      setAvailableSubs(prev => {
        const filtered = prev.filter(s => s.id !== `custom-db-${targetId}`);
        return [newCustomSub, ...filtered];
      });
      setCurrentSubId(`custom-db-${targetId}`);
      setShowSubtitles(true);
      setShowSubSettings(false);
    }
  };

  // Subtitle Search Logic
  const handleSearchAllSubs = useCallback(async () => {
    if (availableSubs.length > 0) return;
    setLoadingSubs(true);
    try {
      // Use IMDB ID if available, it's MUCH more reliable for OpenSubtitles
      const results = await subtitleService.searchSubtitles(imdbId || tmdbId, type);
      setAvailableSubsWithVirtual(results || []);
    } catch (e) {
      console.warn("[VIP-PLAYER] Sub Search Error:", e);
    } finally {
      setLoadingSubs(false);
    }
  }, [tmdbId, type, availableSubs.length, setAvailableSubsWithVirtual]);

  const handleSelectSub = async (sub: any) => {
    setLoadingSubs(true);
    try {
      const downloadLink = sub.attributes.file_id !== 0 
        ? await subtitleService.getDownloadLink(sub.attributes.file_id)
        : sub.attributes.url;

      if (downloadLink) {
        const result = await subtitleService.getSubtitleBlob(downloadLink);
        if (result) {
          // If it's a direct URL (proxied) or local Blob URL, fetch its text first for overlay
          if (result.startsWith('http') || result.startsWith('blob:')) {
            const res = await fetch(result);
            const text = await res.text();
            setVttContent(text);
          } else {
            // It's a Data URI
            const base64 = result.split(',')[1];
            const text = decodeURIComponent(escape(atob(base64)));
            setVttContent(text);
          }
          setCurrentSubId(sub.id);
          setShowSubtitles(true);
          setShowSubSettings(false);
        }
      }
    } catch (e) {
      console.error("[VIP-PLAYER] Sub Selection Error:", e);
    } finally {
      setLoadingSubs(false);
    }
  };

  // Flag Helper
  const getLanguageFlag = (lang: string) => {
    const map: { [key: string]: string } = {
      'ku': '☀️', 'ckb': '☀️', 'kur': '☀️', 'en': '🇺🇸', 'ar': '🇸🇦', 'fa': '🇮🇷', 'tr': '🇹🇷', 'fr': '🇫🇷', 'de': '🇩🇪', 'es': '🇪🇸'
    };
    return map[lang.toLowerCase()] || '🏳️';
  };

  // Parse VTT for overlay and sync availableSubs
  useEffect(() => {
    if (!subtitleUrl) {
      setVttContent(null);
      return;
    }

    const virtualSub = {
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

    setCurrentSubId('prop-kurdish-auto' as any);
    setShowSubtitles(true);

    const fetchVtt = async () => {
      try {
        const blobUrl = await subtitleService.getSubtitleBlob(subtitleUrl);
        if (blobUrl) {
          const response = await fetch(blobUrl);
          if (response.ok) {
            const text = await response.text();
            setVttContent(text);
          }
        }
      } catch (e) {
        console.error("[VIP-PLAYER] VTT Fetch Error:", e);
      }
    };
    fetchVtt();
  }, [subtitleUrl]);



  // 2. STEALTH SHIELD LOGIC
  // We utilize the Service Worker (sw.js) for stealthy, network-level ad blocking.
  // The UI badge indicates when the player has initialized and the network shield is actively monitoring traffic.
  useEffect(() => {
    setIsShieldActive(false); 
    const timer = setTimeout(() => {
      setIsShieldActive(true);
      console.log(`[VIP-PLAYER] Network Security Shield Synchronized. Node: VidLink.`);
    }, 7000); // 7s ensures full provider handshake
    return () => clearTimeout(timer);
  }, []);

  // Query Kurdish Dubbed movies from Supabase Cloud
  useEffect(() => {
    const checkKurdishDub = async () => {
      const activeId = imdbId || tmdbId;
      if (!activeId) return;
      try {
        const cleanId = activeId.toString();
        const isImdb = cleanId.startsWith('tt');
        
        // 1. First, search for direct match by IMDb or TMDb ID
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
          console.log("[VIP-PLAYER] Kurdish Dubbed Version established via ID:", data[0]);
          setKurdishDub(data[0]);
          return;
        }

        // 2. Fallback: Query all dubbed movies and match by title (for older records where IDs are not set)
        const { data: allMovies } = await supabase.from('dubbed_movies').select('id, title, kurdishTitle, videoUrl, media_type, imdb_id, tmdb_id');
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
            console.log("[VIP-PLAYER] Kurdish Dubbed Version established via fallback title match:", match);
            setKurdishDub(match);
          } else {
            setKurdishDub(null);
          }
        } else {
          setKurdishDub(null);
        }
      } catch (e) {
        console.warn("[VIP-PLAYER] Failed to query Kurdish Dub:", e);
      }
    };
    checkKurdishDub();
  }, [tmdbId, imdbId, title]);

  // Official VidLink Progress & Event Tracking
  useEffect(() => {
    const handleVidLinkMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://vidlink.pro') return;
      
      // 1. Handle PLAYER_EVENT (Real-time tracking from docs)
      if (event.data?.type === 'PLAYER_EVENT') {
        const { event: eventType, currentTime, duration } = event.data.data;
        
        // SYNC SUBTITLES — use ref to avoid stale closure
        if (vttContentRef.current && currentTime !== undefined) {
          const cues = parseVttCues(vttContentRef.current);
          const active = cues.filter(c => currentTime >= c.start && currentTime <= c.end);
          setActiveCues(active);
        }

        if (onProgress && currentTime !== undefined) {
          onProgress({ 
            event: eventType,
            currentTime, 
            duration 
          });
        }
      }

      // 2. Handle MEDIA_DATA (General state tracking from docs)
      if (event.data?.type === 'MEDIA_DATA') {
        const mediaData = event.data.data;
        localStorage.setItem('vidLinkProgress', JSON.stringify(mediaData));
        if (onProgress && mediaData.currentTime) {
          onProgress({ 
            event: 'timeupdate',
            currentTime: mediaData.currentTime, 
            duration: mediaData.duration 
          });
        }
      }
    };
    window.addEventListener('message', handleVidLinkMessage);
    return () => window.removeEventListener('message', handleVidLinkMessage);
  }, [onProgress]);

  // 3. SUPPRESS TAURI NATIVE DIALOGS from VidLink's built-in subtitle failure alerts
  // Tauri intercepts window.alert/confirm/prompt as native macOS dialogs — block them
  // so VidLink subtitle errors never block the UI.
  useEffect(() => {
    if (!(window as any).__TAURI_INTERNALS__) return;
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;
    const originalPrompt = window.prompt;
    // Silently swallow dialog calls so subtitle-load failures don't freeze the UI
    window.alert = () => {};
    window.confirm = () => false;
    window.prompt = () => null;
    return () => {
      window.alert = originalAlert;
      window.confirm = originalConfirm;
      window.prompt = originalPrompt;
    };
  }, []);

  useEffect(() => {
    if (!peerSyncTrigger || !iframeRef.current?.contentWindow) return;

    console.log("[PEER SYNC EFFECT] Applying peer sync update in PremiumVidLinkPlayer:", peerSyncTrigger);
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
    } catch (err) {
      console.warn("[PEER SYNC EFFECT] Error posting message to Premium iframe:", err);
    }
  }, [peerSyncTrigger]);

  return (
    <div className="w-full h-full bg-black relative flex flex-col overflow-hidden">
      {/* Top Controls */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
        {type === 'tv' && onEpisodeChange && (
          <button 
            onClick={() => {
              setShowEpisodesPortal(!showEpisodesPortal);
              setShowSubSettings(false);
            }}
            className={`transition-all duration-300 backdrop-blur-md border px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-xl ${
              showEpisodesPortal 
                ? 'bg-red-600 border-red-500 text-white' 
                : 'bg-white/10 border-white/20 text-white/50'
            }`}
          >
            <Tv size={14} />
            <span className="text-[10px] font-black uppercase">{(language === 'ku' || language === 'badini') ? 'ئەڵقەکان' : 'Episodes'}</span>
          </button>
        )}

        {/* Subtitle Toggle */}
        <button 
          onClick={() => {
            setShowSubSettings(!showSubSettings);
            if (!showSubSettings) handleSearchAllSubs();
            setShowEpisodesPortal(false);
          }}
          className={`transition-all duration-300 backdrop-blur-md border px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-xl ${
            showSubSettings 
              ? 'bg-red-600 border-red-500 text-white' 
              : 'bg-white/10 border-white/20 text-white/50'
          }`}
        >
          <Subtitles size={14} />
          <span className="text-[10px] font-black uppercase">Studio</span>
        </button>

        {/* Ad-Blocker Badge */}
        <div className={`transition-all duration-500 ${isShieldActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 scale-50'}`}>
          <div className="bg-green-600/20 backdrop-blur-md border border-green-500/30 text-green-500 text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-xl">
            <Shield size={12} fill="currentColor" />
            SHIELD ACTIVE
          </div>
        </div>
      </div>

      <div className="relative flex-1 w-full bg-black">
        {(isResolvingId || isPlayerLoading) && (
          <div className="absolute inset-0 bg-[#060606] flex flex-col items-center justify-center gap-4 z-50">
            <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
            <p className="text-white text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
              {isResolvingId ? "Resolving Stream Node..." : "Initializing Security Shield..."}
            </p>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={overrideSrc || videoUrl}
          className="w-full h-full border-0"
          // NOTE: sandbox attribute intentionally omitted — VidLink Pro detects
          // sandboxed iframes and blocks playback with "Please Disable Sandbox".
          // Tauri's WKWebView security handles isolation at the process level.
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write; gyroscope; accelerometer"
          referrerPolicy="no-referrer-when-downgrade"
          // @ts-ignore
          scrolling="no"
          // iOS Safari: prevent native AVPlayer from intercepting video
          // @ts-ignore
          webkit-playsinline="true"
          // @ts-ignore
          x-webkit-airplay="deny"
          onLoad={() => setIsPlayerLoading(false)}
        ></iframe>


        <AnimatePresence>
          {showSubtitles && activeCues.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-[15%] left-0 right-0 z-[100] pointer-events-none w-full flex justify-center px-4"
            >
              <div 
                className={`px-6 py-3 rounded-2xl text-center max-w-[90%] transition-all duration-300 ${showSubBackground ? 'shadow-2xl border border-white/10' : ''}`}
                style={{ 
                  backgroundColor: showSubBackground ? `rgba(0,0,0,${subBgOpacity})` : 'transparent',
                  backdropFilter: showSubBackground && subBlur ? 'blur(12px)' : 'none',
                  border: showSubBackground ? undefined : 'none',
                  boxShadow: showSubBackground ? undefined : 'none',
                  textShadow: showSubBackground 
                    ? '0 2px 4px rgba(0,0,0,0.8)'
                    : '0 2px 4px #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 8px rgba(0,0,0,0.8)',
                  fontSize: `${subFontSize}px`,
                  color: subColor,
                  fontWeight: 900,
                  fontFamily: "'Zain', 'Outfit', sans-serif"
                }}
              >
                {activeCues.map((cue, i) => (
                  <p key={i} className="text-center tracking-tight leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] custom-subtitle-text">
                    {cue.text}
                  </p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SUBTITLE STUDIO SIDEBAR */}
        <AnimatePresence>
          {showSubSettings && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute top-0 right-0 bottom-0 w-80 bg-black/95 backdrop-blur-3xl border-l border-white/10 z-[200] p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2 uppercase italic">
                  <Subtitles size={16} className="text-red-600" />
                  {(language === 'ku' || language === 'badini') ? 'ڕێکخستنی ژێرنووس' : 'Subtitle Studio'}
                </h3>
                <button onClick={() => setShowSubSettings(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Premium Segmented Control Tab Bar */}
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
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
                  <div className="space-y-6">
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
                            id="admin-sub-upload-input-premium"
                            multiple
                            className="hidden" 
                            onChange={handleAdminSubUpload}
                          />
                          <button
                            onClick={() => document.getElementById('admin-sub-upload-input-premium')?.click()}
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
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{(language === 'ku' || language === 'badini') ? 'قەبارەی نووسین' : 'Font Size'}</label>
                    <span className="text-[10px] font-bold text-red-500">{subFontSize}px</span>
                  </div>
                  <input type="range" min="16" max="42" value={subFontSize} onChange={(e) => setSubFontSize(Number(e.target.value))} className="w-full h-1 bg-white/10 rounded-full appearance-none accent-red-600" />
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{(language === 'ku' || language === 'badini') ? 'ڕەنگی نووسین' : 'Text Color'}</label>
                  <div className="flex gap-2">
                    {['#ffffff', '#ffff00', '#00ffff', '#00ff00', '#ff00ff', '#ff0000'].map(color => (
                      <button 
                        key={color} 
                        onClick={() => setSubColor(color)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${subColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{(language === 'ku' || language === 'badini') ? 'ڕادەی ڕوونی پشتەوە' : 'Backdrop Opacity'}</label>
                    <span className="text-[10px] font-bold text-green-500">{Math.round(subBgOpacity * 100)}%</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.1" value={subBgOpacity} onChange={(e) => setSubBgOpacity(Number(e.target.value))} className="w-full h-1 bg-white/10 rounded-full appearance-none accent-green-600" />
                  
                  <div className="flex items-center justify-between mt-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{(language === 'ku' || language === 'badini') ? 'کاریگەری شووشە' : 'Glassmorphism'}</label>
                    <button onClick={() => setSubBlur(!subBlur)} className={`w-8 h-4 rounded-full relative transition-colors ${subBlur ? 'bg-red-600' : 'bg-white/10'}`}>
                      <motion.div animate={{ x: subBlur ? 18 : 2 }} className="absolute top-1 w-2 h-2 rounded-full bg-white shadow-sm" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 border-t border-white/5 pt-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{(language === 'ku' || language === 'badini') ? 'پێشاندانی پشتەوە' : 'Show Background'}</label>
                    <button onClick={() => setShowSubBackground(!showSubBackground)} className={`w-8 h-4 rounded-full relative transition-colors ${showSubBackground ? 'bg-red-600' : 'bg-white/10'}`}>
                      <motion.div animate={{ x: showSubBackground ? 18 : 2 }} className="absolute top-1 w-2 h-2 rounded-full bg-white shadow-sm" />
                    </button>
                  </div>
                </div>

                {/* Sync Control */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{(language === 'ku' || language === 'badini') ? 'خێرایی ژێرنووس (چرکە)' : 'Sync Offset'}</label>
                    <span className="text-[10px] font-bold text-blue-500">{subtitleOffset > 0 ? '+' : ''}{subtitleOffset / 1000}s</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSubtitleOffset(prev => prev - 500)} className="flex-1 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold">-0.5s</button>
                    <button onClick={() => setSubtitleOffset(prev => prev + 500)} className="flex-1 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold">+0.5s</button>
                  </div>
                </div>
              </div>

              {/* Search Box */}
              <div className="relative mt-2">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="text"
                  placeholder={(language === 'ku' || language === 'badini') ? 'گەڕان...' : 'Search language...'}
                  value={subSearchQuery}
                  onChange={(e) => setSubSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-xs text-white focus:border-red-600/50 outline-none transition-all font-bold"
                />
              </div>

              {/* Subtitle List */}
              <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                {loadingSubs ? (
                  <div className="py-12 flex flex-col items-center gap-4 opacity-50">
                    <Activity size={24} className="text-red-600 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading Cloud Subs...</span>
                  </div>
                ) : (
                  availableSubs.length > 0 ? (
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
                        const isKurdish = sub?.attributes?.language === 'ku' || sub?.attributes?.language === 'badini' || sub?.attributes?.language === 'ckb' || sub?.attributes?.language === 'kur';
                        return (
                          <button 
                            key={sub.id}
                            onClick={() => handleSelectSub(sub)}
                            className={`w-full text-left p-4 rounded-2xl transition-all border flex items-center gap-4 relative overflow-hidden group ${
                              sub.id === currentSubId 
                              ? 'bg-red-600 border-red-500 text-white' 
                              : isKurdish
                                ? 'bg-red-600/10 border-red-600/20 text-white hover:bg-red-600/20'
                                : 'bg-white/5 border-white/5 hover:border-white/15 text-gray-400 hover:text-white'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-lg shrink-0">
                              {getLanguageFlag(sub?.attributes?.language)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{sub?.attributes?.language}</span>
                                {isKurdish && (
                                  <span className="text-[7px] bg-red-600 text-white px-1.5 py-0.5 rounded-md font-black flex items-center gap-1 uppercase">
                                    <Sparkles size={8} /> Verified
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-bold truncate pr-4">{sub?.attributes?.display_name?.replace(/\.srt|\.vtt/g, '')}</span>
                            </div>
                            <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        );
                      })
                  ) : (
                    <div className="py-12 flex flex-col items-center gap-3 bg-white/[0.02] rounded-3xl border border-dashed border-white/10 opacity-50">
                      <Search size={20} className="text-gray-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-center px-4">
                        {(language === 'ku' || language === 'badini') ? 'هیچ ژێرنووسێکی تر نەدۆزرایەوە' : 'No cloud subtitles found'}
                      </span>
                    </div>
                  )
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
                            let activeId = imdbId || tmdbId || '';
                            const isImdb = activeId.startsWith('tt');
                            const tmdbParam = isImdb ? '' : '&tmdb=1';
                            
                            // Custom Dubbed Title Suffixes
                            let baseTitle = title || '';
                            if (lang === 'fa' && translatedTitles.fa) baseTitle = translatedTitles.fa;
                            else if (lang === 'ar' && translatedTitles.ar) baseTitle = translatedTitles.ar;
                            else if (lang === 'tr' && translatedTitles.tr) baseTitle = translatedTitles.tr;

                            let dubbedTitle = baseTitle;
                            if (lang === 'fa') dubbedTitle += ' Persian';
                            else if (lang === 'ar') dubbedTitle += ' AR';
                            else if (lang === 'tr') dubbedTitle += ' Turkish';

                            let targetSrc = videoUrl;
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
                                if (type === 'tv') {
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

              <button 
                onClick={() => setShowSubSettings(false)}
                className="mt-auto py-4 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:border-red-500 transition-all"
              >
                {(language === 'ku' || language === 'badini') ? 'داخستن' : 'Close Studio'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Episodes Portal Drawer v2 (Top-Down Sliding Cinema Overlay) */}
        <AnimatePresence>
          {showEpisodesPortal && type === 'tv' && onEpisodeChange && (
            <motion.div 
              initial={{ y: '-100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 100 }}
              className="absolute top-0 left-0 right-0 h-[68%] bg-gradient-to-b from-black/98 via-black/95 to-[#080808]/92 backdrop-blur-3xl border-b border-white/10 z-[200] px-6 py-5 md:py-6 flex flex-col gap-4 select-none shadow-[0_24px_50px_rgba(0,0,0,0.9)] overflow-hidden"
              style={{ fontFamily: (language === 'ku' || language === 'badini') ? "'Zain', sans-serif" : "'Inter', sans-serif" }}
            >
              {/* Header Row */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-red-600/10 border border-red-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                    <Tv size={12} className="text-red-500 animate-pulse" />
                    <span className={`font-black text-red-500 uppercase tracking-widest leading-none ${(language === 'ku' || language === 'badini') ? 'text-[13px]' : 'text-[9px]'}`}>
                      {(language === 'ku' || language === 'badini') ? 'پۆرتاڵی ئەڵقەکان' : 'EPISODES PORTAL'}
                    </span>
                  </div>
                  <span className={`font-bold text-gray-500 tracking-wider ${(language === 'ku' || language === 'badini') ? 'text-[14px] font-black' : 'text-[10px]'}`}>
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
                        className={`relative px-5 rounded-xl font-black uppercase tracking-wider transition-all duration-300 shrink-0 cursor-pointer overflow-hidden border active:scale-95 ${
                          isCurrentSeason 
                            ? 'border-red-500/20' 
                            : 'border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.06]'
                        } ${(language === 'ku' || language === 'badini') ? 'text-[13px] py-1' : 'text-[10px] py-2.5'}`}
                      >
                        {isCurrentSeason ? (
                          <motion.div 
                            layoutId="activeSeasonPillPremium"
                            className="absolute inset-0 bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        ) : null}
                        <span className={`relative z-10 ${isCurrentSeason ? 'text-white font-black' : 'text-gray-400 hover:text-white'}`}>
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
                  {/* Edge Gradient Overlays */}
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black via-black/40 to-transparent pointer-events-none z-10 hidden md:block" />
                  <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black via-black/40 to-transparent pointer-events-none z-10 hidden md:block" />

                  <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="h-full overflow-x-auto overflow-y-hidden flex flex-row items-stretch gap-6 py-2 px-6 scrollbar-hide scroll-smooth"
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
                            className={`w-64 shrink-0 flex flex-col gap-2 rounded-3xl border p-2.5 transition-all group relative cursor-pointer ${
                              isActive
                                ? 'bg-red-600/10 border-red-600/60 shadow-[0_8px_32px_rgba(220,38,38,0.2)]'
                                : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.05]'
                            }`}
                          >
                            {/* Card Image Wrapper */}
                            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/5 shadow-md flex-shrink-0">
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

                              {/* Hover Play Button Overlay */}
                              <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10 backdrop-blur-[2px]">
                                <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                  <Play size={18} fill="currentColor" className="translate-x-[1.5px]" />
                                </div>
                              </div>

                              {/* Rating Badge */}
                              {ep.vote_average > 0 && (
                                <div className={`absolute top-2 left-2 bg-black/60 backdrop-blur-md text-[#FFAD1F] rounded-lg border border-white/5 flex items-center gap-1 z-20 ${(language === 'ku' || language === 'badini') ? 'text-[10px] py-[1px] px-1 font-black' : 'text-[7px] py-0.5 px-1.5 font-black uppercase tracking-wider'}`}>
                                  <span className="text-[8px] leading-none">★</span>
                                  <span>{ep.vote_average.toFixed(1)}</span>
                                </div>
                              )}

                              {/* Active / Current indicator */}
                              {isActive && (
                                <div className={`absolute bottom-2 left-2 bg-gradient-to-r from-red-600 to-rose-500 text-white rounded-lg flex items-center gap-1.5 z-20 shadow-[0_0_10px_rgba(220,38,38,0.5)] ${(language === 'ku' || language === 'badini') ? 'text-[9px] py-[2px] px-1.5 font-black' : 'text-[6px] py-0.5 px-2 font-black uppercase tracking-widest'}`}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                  <span>{(language === 'ku' || language === 'badini') ? 'ئێستا' : 'NOW PLAYING'}</span>
                                </div>
                              )}

                              {/* Watched status tick */}
                              {isWatched && !isActive && (
                                <div className={`absolute top-2 right-2 bg-green-500/25 backdrop-blur-md text-green-400 rounded-lg border border-green-500/30 flex items-center gap-0.5 z-20 ${(language === 'ku' || language === 'badini') ? 'text-[9px] py-[1px] px-1.5 font-black' : 'text-[7px] py-0.5 px-1.5 font-black tracking-wider'}`}>
                                  <span>✓</span>
                                  <span>{(language === 'ku' || language === 'badini') ? 'بینراوە' : 'WATCHED'}</span>
                                </div>
                              )}
                            </div>

                            {/* Card Metadata */}
                            <div className="flex flex-col px-1">
                              <span className={`uppercase tracking-widest ${isActive ? 'text-red-500 animate-pulse' : 'text-gray-500'} ${(language === 'ku' || language === 'badini') ? 'text-[12px] font-black' : 'text-[9px] font-black'}`}>
                                {(language === 'ku' || language === 'badini') 
                                  ? `ئەڵقەی ${ep.episode_number}` 
                                  : `Episode ${ep.episode_number}`}
                              </span>
                              <h4 className={`text-white font-black truncate group-hover:text-red-500 transition-colors mt-0.5 ${(language === 'ku' || language === 'badini') ? 'text-[15px]' : 'text-xs'}`} title={ep.name}>
                                {ep.name}
                              </h4>
                              <p className={`line-clamp-2 leading-relaxed mt-1 ${(language === 'ku' || language === 'badini') ? 'text-[13px] text-gray-300 font-medium' : 'text-[10px] text-gray-400 font-normal'}`} title={ep.overview}>
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
    </div>
  );
}

// VTT Parser Helper
function parseVttCues(vttText: string) {
  const cues: any[] = [];
  const blocks = vttText.split(/\r?\n\r?\n/);
  
  for (const block of blocks) {
    if (block.includes('-->')) {
      const lines = block.split(/\r?\n/);
      const timeLine = lines.find(l => l.includes('-->'));
      if (!timeLine) continue;

      const rawText = lines.slice(lines.indexOf(timeLine) + 1).join('\n');
      const text = rawText
        .replace(/<[^>]*>/g, '')
        .replace(/\{[^}]+\}/g, '')
        .trim();
      
      if (text) cues.push({ start, end, text });
    }
  }

  const hasKurdish = /[\u0600-\u06FF]/.test(vttText);
  if (hasKurdish) {
    const introCues = [
      { start: 1.0, end: 4.0, text: "ژێرنووسکراوە لەلایەن زانا فاروقەوە" },
      { start: 4.5, end: 7.5, text: "FLKRD Studio" }
    ];
    // Filter out original cues starting in the first 7.5s to prevent overlaps
    const mainCues = cues.filter(c => c.start >= 7.5);
    return [...introCues, ...mainCues];
  }

  return cues;
}

function parseTime(timeStr: string) {
  const parts = timeStr.split(':');
  let seconds = 0;
  if (parts.length === 3) {
    seconds += parseInt(parts[0]) * 3600;
    seconds += parseInt(parts[1]) * 60;
    seconds += parseFloat(parts[2]);
  } else {
    seconds += parseInt(parts[0]) * 60;
    seconds += parseFloat(parts[1]);
  }
  return seconds;
}

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
