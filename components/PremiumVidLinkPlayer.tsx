import React, { useState, useEffect, useCallback } from 'react';
import { Play, Maximize, Minimize, Shield, Loader2, Subtitles, X, Search, Activity, Sparkles, ArrowRight, Settings2, Mic2, Globe, Volume2, Tv, Download, ShieldCheck, RefreshCcw, Cpu, Zap, Timer, Infinity as InfinityIcon, Sun, Sliders, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subtitleService } from '../services/subtitleService';
import { translateAndSavePipeline } from '../services/subtitleTranslationService';
import SubtitleManagerPanel from './SubtitleManagerPanel';
import { useTranslation } from '../contexts/LanguageContext';
import { supabase } from '../utils/supabaseClient';
import { db } from '../utils/db';
import { fetchTranslations, fetchTmdbIdFromImdb } from '../services/tmdbService';
import { useUI } from '../contexts/UIContext';
import { usePlayer } from '../contexts/PlayerContext';
import { fetchSubtitleEdits, saveSubtitleLineEdit, deleteSubtitleLineEdit, subscribeSubtitleEdits, type SubtitleEditKey } from '../services/subtitleEditService';

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
  startFullscreen?: boolean;
  onClose?: () => void;
  isFullscreen?: boolean;
  toggleFullscreen?: () => void;
  onLoad?: () => void;
  activeSource?: string;
  setActiveSource?: (source: string) => void;
  sources?: any[];
  key?: React.Key;
  isPip?: boolean;
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
  onSeasonChange,
  startFullscreen,
  onClose,
  isFullscreen: isFullscreenProp,
  toggleFullscreen: toggleFullscreenProp,
  onLoad: onLoadProp,
  activeSource,
  setActiveSource,
  sources = [],
  isPip = false
}: PremiumVidLinkPlayerProps) {
  const { language } = useTranslation();
  const isIOSDevice = typeof window !== 'undefined' && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
  );
  const { isAdmin, refreshTranslatedMovieIds, activeTranslation, startGlobalTranslation, dismissCelebration } = useUI();
  const { isPaused } = usePlayer();
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [showSubSettings, setShowSubSettings] = useState(false);
  const [showEpisodesPortal, setShowEpisodesPortal] = useState(false);
  const [showSourceSwitcher, setShowSourceSwitcher] = useState(false);

  // --- Subtitle Line Edit State ---
  const [subEditMap, setSubEditMap] = useState<Map<number, string>>(new Map());
  const [editingCue, setEditingCue] = useState<{ index: number; original: string; current: string } | null>(null);
  const [subEditSaving, setSubEditSaving] = useState(false);
  const [activeCues, setActiveCues] = useState<any[]>([]);
  const [vttContent, setVttContent] = useState<string | null>(null);
  const [isUploadingSub, setIsUploadingSub] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // --- Lighting & Filter State ---
  const [brightness, setBrightness] = useState(() => {
    try {
      return Number(localStorage.getItem('flkrd_player_brightness') || '1');
    } catch (e) {
      return 1;
    }
  });
  const [contrast, setContrast] = useState(() => {
    try {
      return Number(localStorage.getItem('flkrd_player_contrast') || '1');
    } catch (e) {
      return 1;
    }
  });
  const [saturation, setSaturation] = useState(() => {
    try {
      return Number(localStorage.getItem('flkrd_player_saturation') || '1');
    } catch (e) {
      return 1;
    }
  });

  // Debounce localStorage writes to prevent blocking I/O lag during slider dragging
  const saveTimeoutRef = React.useRef<{ [key: string]: NodeJS.Timeout }>({});

  const saveToLocalStorageDebounced = (key: string, value: string) => {
    if (saveTimeoutRef.current[key]) {
      clearTimeout(saveTimeoutRef.current[key]);
    }
    saveTimeoutRef.current[key] = setTimeout(() => {
      try {
        localStorage.setItem(key, value);
      } catch (e) {}
    }, 250); // 250ms debounce window
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.values(saveTimeoutRef.current).forEach(clearTimeout);
    };
  }, []);

  const handleBrightnessChange = (val: number) => {
    setBrightness(val);
    saveToLocalStorageDebounced('flkrd_player_brightness', val.toString());
  };
  const handleContrastChange = (val: number) => {
    setContrast(val);
    saveToLocalStorageDebounced('flkrd_player_contrast', val.toString());
  };
  const handleSaturationChange = (val: number) => {
    setSaturation(val);
    saveToLocalStorageDebounced('flkrd_player_saturation', val.toString());
  };
  const handleResetFilters = () => {
    setBrightness(1);
    setContrast(1);
    setSaturation(1);
    Object.values(saveTimeoutRef.current).forEach(clearTimeout);
    saveTimeoutRef.current = {};
    try {
      localStorage.setItem('flkrd_player_brightness', '1');
      localStorage.setItem('flkrd_player_contrast', '1');
      localStorage.setItem('flkrd_player_saturation', '1');
    } catch (e) {}
  };
  // Ref so the VidLink postMessage handler always reads the latest vttContent
  // (avoids stale closure — the handler was only re-registered on [onProgress] change)
  const vttContentRef = React.useRef<string | null>(null);
  const [parsedCues, setParsedCues] = useState<any[]>([]);
  const parsedCuesRef = React.useRef<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const lastMessageTimeRef = React.useRef<number>(performance.now());
  const lastReceivedTimeRef = React.useRef<number>(0);
  const [resolvedSubUrl, setResolvedSubUrl] = useState<string | null>(null);
  const [resolvedSubDisplayName, setResolvedSubDisplayName] = useState<string>('Kurdish (Verified)');
  const [localIsFullscreen, setLocalIsFullscreen] = useState(false);
  const isFullscreen = isFullscreenProp !== undefined ? isFullscreenProp : localIsFullscreen;
  const setIsFullscreen = isFullscreenProp !== undefined ? () => {} : setLocalIsFullscreen;
  const [isSimulatedFullscreen, setIsSimulatedFullscreen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [availableSubs, setAvailableSubs] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [currentSubId, setCurrentSubId] = useState<number | null>(null);
  const [hasSearchedCloud, setHasSearchedCloud] = useState(false);

  useEffect(() => {
    setHasSearchedCloud(false);
    setAvailableSubs([]);
  }, [imdbId, tmdbId, season, episode]);

  const [resolvedTmdbId, setResolvedTmdbId] = useState<string | null>(null);
  const [isResolvingId, setIsResolvingId] = useState(true);
  // Keep ref in sync with state
  useEffect(() => { vttContentRef.current = vttContent; }, [vttContent]);

  // Pre-parse and cache VTT cues once when content changes
  useEffect(() => {
    if (vttContent) {
      const cues = parseVttCues(vttContent);
      setParsedCues(cues);
      parsedCuesRef.current = cues;
    } else {
      setParsedCues([]);
      parsedCuesRef.current = [];
    }
  }, [vttContent]);

  const setAvailableSubsWithVirtual = useCallback((newSubs: any[]) => {
    setAvailableSubs(newSubs);
  }, []);

  // Appearance Settings
  const [subFontSize, setSubFontSize] = useState(24);
  const [subColor, setSubColor] = useState('#ffffff');
  const [subBgOpacity, setSubBgOpacity] = useState(0.8);
  const [subBlur, setSubBlur] = useState(true);
  const [subtitleOffset, setSubtitleOffset] = useState(0);
  const subtitleOffsetRef = React.useRef(subtitleOffset);
  useEffect(() => { subtitleOffsetRef.current = subtitleOffset; }, [subtitleOffset]);
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
  const [subStudioTab, setSubStudioTab] = useState<'sub' | 'dub' | 'lighting' | 'shortcuts'>('sub');
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

  // Resume subtitle translation on reload if interrupted
  useEffect(() => {
    const cacheStr = localStorage.getItem('flkrd_translating_sub_cache');
    if (!cacheStr) return;

    try {
      const cache = JSON.parse(cacheStr);
      const targetId = resolvedTmdbId || tmdbId || imdbId;
      
      if (
        cache &&
        String(cache.targetId) === String(targetId) &&
        Number(cache.season) === Number(season || 0) &&
        Number(cache.episode) === Number(episode || 0)
      ) {
        // Clear immediately to prevent infinite loop on failure
        localStorage.removeItem('flkrd_translating_sub_cache');
        
        // Wait a small delay for state and network to stabilize
        const timer = setTimeout(() => {
          console.log("[VIP-PLAYER] Resuming translation for:", cache.sub.attributes?.display_name);
          handleStartTranslation(cache.sub);
        }, 1500);
        
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.error("[VIP-PLAYER] Resuming translation error:", e);
    }
  }, [resolvedTmdbId, tmdbId, imdbId, season, episode]);

  // Sync Play/Pause in PiP mode
  useEffect(() => {
    if (isPip && iframeRef.current && iframeRef.current.contentWindow) {
      const target = iframeRef.current.contentWindow;
      if (isPaused) {
        target.postMessage({ event: 'pause' }, '*');
        target.postMessage(JSON.stringify({ event: 'pause' }), '*');
      } else {
        target.postMessage({ event: 'play' }, '*');
        target.postMessage(JSON.stringify({ event: 'play' }), '*');
      }
    }
  }, [isPaused, isPip]);

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
            .replace(/^\d+\r?$/gm, '');
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

        // Save reference in custom_subtitles database table (Failsafe delete-then-insert)
        try {
          await supabase
            .from('custom_subtitles')
            .delete()
            .eq('tmdb_id', String(targetId))
            .eq('media_type', type || 'movie')
            .eq('language', 'ku')
            .eq('season', fileSeason)
            .eq('episode', fileEpisode);
        } catch (delErr) {
          console.warn("[VIP-PLAYER] Failsafe delete failed:", delErr);
        }

        const { error: dbErr } = await supabase
          .from('custom_subtitles')
          .insert({
            tmdb_id: String(targetId),
            media_type: type || 'movie',
            language: 'ku',
            subtitle_url: resolvedPublicUrl,
            file_name: file.name,
            season: fileSeason,
            episode: fileEpisode
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

  const pauseVideo = () => {
    if (!iframeRef.current?.contentWindow) return;
    const win = iframeRef.current.contentWindow;
    try {
      win.postMessage(JSON.stringify({ event: 'pause' }), '*');
      win.postMessage(JSON.stringify({ context: 'player.js', method: 'pause' }), '*');
      win.postMessage(JSON.stringify({ method: 'pause' }), '*');
      win.postMessage(JSON.stringify({ context: 'player.js', event: 'command', command: 'pause', value: null }), '*');
      win.postMessage(JSON.stringify({ event: 'command', command: 'pause', value: null }), '*');
      setIsPlaying(false);
    } catch (err) {
      console.warn("Error pausing iframe player:", err);
    }
  };

  const playVideo = () => {
    if (!iframeRef.current?.contentWindow) return;
    const win = iframeRef.current.contentWindow;
    try {
      win.postMessage(JSON.stringify({ event: 'play' }), '*');
      win.postMessage(JSON.stringify({ context: 'player.js', method: 'play' }), '*');
      win.postMessage(JSON.stringify({ method: 'play' }), '*');
      win.postMessage(JSON.stringify({ context: 'player.js', event: 'command', command: 'play', value: null }), '*');
      win.postMessage(JSON.stringify({ event: 'command', command: 'play', value: null }), '*');
      setIsPlaying(true);
    } catch (err) {
      console.warn("Error playing iframe player:", err);
    }
  };

  // --- Admin: Save subtitle line edit to Supabase (visible to all users via Realtime) ---
  const handleSaveSubtitleEdit = async () => {
    if (!editingCue) return;
    const targetId = tmdbId || imdbId;
    if (!targetId) return;

    const key: SubtitleEditKey = {
      tmdbId: String(targetId),
      mediaType: type || 'movie',
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
      // Play again after saving
      playVideo();
    }
  };

  // --- Admin: Restore subtitle line to original (deletes edit from Supabase) ---
  const handleRestoreSubtitleEdit = async () => {
    if (!editingCue) return;
    const targetId = tmdbId || imdbId;
    if (!targetId) return;

    const key: SubtitleEditKey = {
      tmdbId: String(targetId),
      mediaType: type || 'movie',
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
      // Play again after restoring
      playVideo();
    }
  };

  // Subtitle Search Logic
  const handleSearchAllSubs = useCallback(async (force = false) => {
    if (hasSearchedCloud && !force) return;
    setLoadingSubs(true);
    try {
      let resolvedImdbId = imdbId;
      if (!resolvedImdbId && tmdbId) {
        try {
          const { fetchExternalIds } = await import('../services/tmdbService');
          const extIds = await fetchExternalIds(tmdbId, type || 'movie');
          if (extIds && extIds.imdb_id) {
            resolvedImdbId = extIds.imdb_id;
          }
        } catch (err) {
          console.warn("[VIP-PLAYER] Failed to auto-resolve IMDB ID in player:", err);
        }
      }
      
      const openSubResults = await subtitleService.searchSubtitles(resolvedImdbId || tmdbId, type, season, episode, 'all', true);
      const safeResults = openSubResults || [];

      let activeId = resolvedImdbId || tmdbId;
      if (activeId && activeId.startsWith('tt')) {
        try {
          const resolved = await fetchTmdbIdFromImdb(activeId, type);
          if (resolved) activeId = String(resolved);
        } catch (e) {}
      }

      const customSubsList: any[] = [];
      if (activeId) {
        try {
          const { data: dbSubs } = await supabase
            .from('custom_subtitles')
            .select('*')
            .eq('tmdb_id', String(activeId))
            .eq('media_type', type || 'movie')
            .eq('season', type === 'tv' ? (season ?? 0) : 0)
            .eq('episode', type === 'tv' ? (episode ?? 0) : 0);

          if (dbSubs && dbSubs.length > 0) {
            dbSubs.forEach(dbSub => {
              let subUrl = dbSub.subtitle_url;
              if (subUrl.startsWith('//')) {
                subUrl = `https:${subUrl}`;
              }
              const isBadini = dbSub.language === 'badini';
              const isSorani = dbSub.language === 'ku' || dbSub.language === 'ckb';
              const labelSuffix = isBadini ? 'Badini' : (isSorani ? 'Sorani' : dbSub.language?.toUpperCase());
              
              customSubsList.push({
                id: `custom-db-${dbSub.id}`,
                attributes: {
                  language: dbSub.language || 'ku',
                  display_name: dbSub.file_name 
                    ? dbSub.file_name.replace(/(_ku\.srt|\.srt)/gi, '') 
                    : `Kurdish ${labelSuffix} (Verified)`,
                  url: subUrl,
                  file_id: 0
                }
              });
            });
          }
        } catch (dbErr) {
          console.warn("[VIP-PLAYER] Failed to query custom subtitles on search:", dbErr);
        }
      }

      setAvailableSubsWithVirtual([...customSubsList, ...safeResults]);
      setHasSearchedCloud(true);
    } catch (e) {
      console.warn("[VIP-PLAYER] Sub Search Error:", e);
    } finally {
      setLoadingSubs(false);
    }
  }, [tmdbId, imdbId, type, season, episode, hasSearchedCloud, setAvailableSubsWithVirtual]);

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
            setVttContent(result);
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

  const handleStartTranslation = async (sub: any, targetLang: 'ku' | 'badini' = 'ku') => {
    const targetId = resolvedTmdbId || tmdbId || imdbId;
    if (!targetId) return;
    startGlobalTranslation(sub, targetId, type || 'movie', season || 0, episode || 0, targetLang);
  };

  // Sync with global background subtitle translator
  useEffect(() => {
    const targetId = resolvedTmdbId || tmdbId || imdbId;
    if (!targetId) return;

    if (activeTranslation.showCelebration && String(activeTranslation.tmdbId) === String(targetId)) {
      const subUrl = activeTranslation.subtitleUrl;
      if (subUrl && resolvedSubUrl !== subUrl) {
        setResolvedSubUrl(subUrl);

        // Convert the newly uploaded .srt file to a local VTT blob for instant rendering
        subtitleService.getSubtitleBlob(subUrl).then(blobUrl => {
          if (blobUrl) {
            fetch(blobUrl).then(res => res.text()).then(text => setVttContent(text));
          } else {
            fetch(subUrl).then(res => res.text()).then(text => setVttContent(text));
          }
        }).catch(err => {
          fetch(subUrl).then(res => res.text()).then(text => setVttContent(text));
        });

        // Add the new Kurdish track to the list if not present
        const trackId = `custom-db-${activeTranslation.tmdbId}`;
        setAvailableSubs(prev => {
          if (prev.some(s => s.id === trackId)) return prev;

          const newTrack = {
            id: trackId,
            attributes: {
              language: 'ku',
              display_name: `Kurdish Translation [${activeTranslation.sub?.attributes?.language?.toUpperCase() || 'EN'}]`,
              url: subUrl,
              file_id: 0
            }
          };
          return [newTrack, ...prev];
        });
        
        setCurrentSubId(trackId as any);
        setShowSubtitles(true);
      }
    }
  }, [activeTranslation, tmdbId, imdbId, resolvedTmdbId, resolvedSubUrl]);

  // Flag Helper
  const getLanguageFlag = (langCode: string) => {
    const code = langCode?.toLowerCase();
    const defaultFlag = <span className="text-zinc-500">🏳️</span>;

    if (!code) return defaultFlag;
    if (code === 'ku' || code === 'ckb' || code === 'badini' || code === 'kur') {
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
    };

    const countryCode = flagMap[code];
    if (countryCode) {
      return <img src={`https://flagcdn.com/w40/${countryCode}.png`} alt={code} className="w-4 h-3 object-cover rounded-[2px] shadow-sm border border-white/10" />;
    }

    return defaultFlag;
  };

  // Resolve subtitleUrl prop or auto-discover subtitle from DB automatically on mount or change
  useEffect(() => {
    let isMounted = true;
    const discoverSub = async () => {
      let activeId = resolvedTmdbId || tmdbId || imdbId;
      if (!activeId) {
        if (subtitleUrl && isMounted) {
          setResolvedSubUrl(subtitleUrl);
        }
        return;
      }

      // Resolve IMDb ID to TMDb ID if needed
      if (activeId.startsWith('tt')) {
        const resolved = await fetchTmdbIdFromImdb(activeId, type);
        if (resolved) {
          activeId = String(resolved);
        }
      }

      try {
        const { data: dbSubs } = await supabase
          .from('custom_subtitles')
          .select('*')
          .eq('tmdb_id', String(activeId))
          .eq('media_type', type || 'movie')
          .eq('season', type === 'tv' ? (season ?? 0) : 0)
          .eq('episode', type === 'tv' ? (episode ?? 0) : 0);

        if (dbSubs && dbSubs.length > 0 && isMounted) {
          const activeLanguageCode = (language === 'badini') ? 'badini' : 'ku';
          const sortedDbSubs = [...dbSubs].sort((a, b) => {
            const score = (lang: string) => {
              if (lang === activeLanguageCode) return 10;
              if (lang === 'ku') return 5;
              if (lang === 'badini') return 3;
              if (lang === 'ckb') return 2;
              return 1;
            };
            return score(b.language) - score(a.language);
          });
          const bestSub = sortedDbSubs[0];
          let url = bestSub.subtitle_url;
          if (url.startsWith('//')) {
            url = `https:${url}`;
          }
          console.log("[VIP-PLAYER] Automatically applying Kurdish subtitle from database:", url);
          setResolvedSubDisplayName(bestSub.file_name ? bestSub.file_name.replace(/(_ku\.srt|\.srt)/gi, '') : 'Kurdish (Verified)');
          setResolvedSubUrl(url);
        } else if (subtitleUrl && isMounted) {
          setResolvedSubDisplayName('Kurdish (Verified)');
          setResolvedSubUrl(subtitleUrl);
        }
      } catch (err) {
        console.warn("[VIP-PLAYER] Auto-discovery query error:", err);
        if (subtitleUrl && isMounted) {
          setResolvedSubDisplayName('Kurdish (Verified)');
          setResolvedSubUrl(subtitleUrl);
        }
      }
    };
    discoverSub();
    return () => { isMounted = false; };
  }, [subtitleUrl, tmdbId, imdbId, resolvedTmdbId, type, season, episode]);

  // Parse VTT for overlay and sync availableSubs based on resolvedSubUrl
  useEffect(() => {
    if (!resolvedSubUrl) {
      setVttContent(null);
      return;
    }

    const virtualSub = {
      id: 'prop-kurdish-auto' as any,
      attributes: {
        language: 'ku',
        display_name: resolvedSubDisplayName,
        url: resolvedSubUrl,
        file_id: 0
      }
    };

    // Inject into available subs list
    setAvailableSubs(prev => {
      if (prev.some(s => s.id === 'prop-kurdish-auto' as any || s.attributes.url === resolvedSubUrl)) {
        return prev;
      }
      return [virtualSub, ...prev];
    });

    setCurrentSubId('prop-kurdish-auto' as any);
    setShowSubtitles(true);

    const fetchVtt = async () => {
      try {
        const blobUrl = await subtitleService.getSubtitleBlob(resolvedSubUrl);
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
  }, [resolvedSubUrl]);

  // --- Load subtitle edits from Supabase and subscribe to Realtime changes ---
  useEffect(() => {
    const targetId = tmdbId || imdbId;
    if (!targetId || !resolvedSubUrl) return;

    const key: SubtitleEditKey = {
      tmdbId: String(targetId),
      mediaType: type || 'movie',
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
  }, [tmdbId, imdbId, type, season, episode, resolvedSubUrl]);



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

            if (targetTitleClean && targetTitleClean.length > 0) {
              const dbTitleClean = cleanString(m.title);
              const dbKurdishClean = cleanString(m.kurdishTitle);
              
              if (dbTitleClean && dbTitleClean.length > 0 && (dbTitleClean.includes(targetTitleClean) || targetTitleClean.includes(dbTitleClean))) return true;
              if (dbKurdishClean && dbKurdishClean.length > 0 && (dbKurdishClean.includes(targetTitleClean) || targetTitleClean.includes(dbKurdishClean))) return true;
            }
            return false;
          });
          
          if (match) {
            console.log("[VIP-PLAYER] Kurdish Dubbed Version established via IndexedDB:", match);
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
          console.log("[VIP-PLAYER] Kurdish Dubbed Version established via ID query:", data[0]);
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

            if (targetTitleClean && targetTitleClean.length > 0) {
              const dbTitleClean = cleanString(m.title);
              const dbKurdishClean = cleanString(m.kurdishTitle);
              
              if (dbTitleClean && dbTitleClean.length > 0 && (dbTitleClean.includes(targetTitleClean) || targetTitleClean.includes(dbTitleClean))) return true;
              if (dbKurdishClean && dbKurdishClean.length > 0 && (dbKurdishClean.includes(targetTitleClean) || targetTitleClean.includes(dbKurdishClean))) return true;
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
        
        // SYNC SUBTITLES — use cached cues array ref instead of parsing every frame
        if (currentTime !== undefined && !isNaN(currentTime) && currentTime < 50000) {
          lastMessageTimeRef.current = performance.now();
          lastReceivedTimeRef.current = currentTime;
          
          if (eventType === 'pause' || eventType === 'paused') {
            setIsPlaying(false);
          } else {
            setIsPlaying(true);
          }

          const offsetSec = subtitleOffsetRef.current / 1000;
          if (parsedCuesRef.current.length > 0) {
            const active = parsedCuesRef.current.filter(c => currentTime >= (c.start + offsetSec) && currentTime <= (c.end + offsetSec));
            setActiveCues(active);
          }
        }

        if (onProgress && currentTime !== undefined && !isNaN(currentTime) && currentTime < 50000) {
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
        const currentTime = mediaData.currentTime;
        if (currentTime !== undefined && !isNaN(currentTime) && currentTime < 50000) {
          lastMessageTimeRef.current = performance.now();
          lastReceivedTimeRef.current = currentTime;
          setIsPlaying(true);

          const offsetSec = subtitleOffsetRef.current / 1000;
          if (parsedCuesRef.current.length > 0) {
            const active = parsedCuesRef.current.filter(c => currentTime >= (c.start + offsetSec) && currentTime <= (c.end + offsetSec));
            setActiveCues(active);
          }

          if (onProgress) {
            onProgress({ 
              event: 'timeupdate',
              currentTime, 
              duration: mediaData.duration 
            });
          }
        }
      }
    };
    window.addEventListener('message', handleVidLinkMessage);
    return () => window.removeEventListener('message', handleVidLinkMessage);
  }, [onProgress]);

  // Fullscreen change listener to sync state and redirect iframe fullscreen to container
  useEffect(() => {
    let active = true;
    const handleFullscreenChange = () => {
      if (!active) return;
      const isFull = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFull);

      // Intercept iframe fullscreen and redirect to container
      const activeFullscreenElement = 
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement;

      if (activeFullscreenElement === iframeRef.current && containerRef.current) {
        console.log("[PLAYER] Intercepted iframe fullscreen. Redirecting to container...");
        
        const exit = document.exitFullscreen ||
                     (document as any).webkitExitFullscreen ||
                     (document as any).mozCancelFullScreen ||
                     (document as any).msExitFullscreen;
                     
        const req = containerRef.current.requestFullscreen ||
                    (containerRef.current as any).webkitRequestFullscreen ||
                    (containerRef.current as any).mozRequestFullScreen ||
                    (containerRef.current as any).msRequestFullscreen;

        exit.call(document).then(() => {
          req.call(containerRef.current).catch(err => {
            console.error("[PLAYER] Failed to redirect fullscreen:", err);
          });
        });
        return;
      }

      // If user exited native fullscreen, trigger onClose after a tiny delay (to avoid transition race conditions)
      if (!isFull && startFullscreen && onClose) {
        setTimeout(() => {
          const checkExit = !(
            document.fullscreenElement ||
            (document as any).webkitFullscreenElement ||
            (document as any).mozFullScreenElement ||
            (document as any).msFullscreenElement
          );
          if (checkExit && active) {
            console.log("[PLAYER] Exited native fullscreen. Closing player...");
            onClose();
          }
        }, 250);
      }
    };

    const timer = setTimeout(() => {
      if (!active) return;
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.addEventListener('mozfullscreenchange', handleFullscreenChange);
      document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    }, 1000);

    return () => {
      active = false;
      clearTimeout(timer);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [startFullscreen, onClose]);



  // Re-filter cues whenever subtitleOffset changes
  useEffect(() => {
    if (parsedCuesRef.current.length > 0) {
      const offsetSec = subtitleOffset / 1000;
      const active = parsedCuesRef.current.filter(
        c => lastReceivedTimeRef.current >= (c.start + offsetSec) && lastReceivedTimeRef.current <= (c.end + offsetSec)
      );
      setActiveCues(active);
    }
  }, [subtitleOffset]);

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

    const toggleFullscreen = () => {
    if (toggleFullscreenProp) {
      toggleFullscreenProp();
      return;
    }
    if (!containerRef.current) return;
    
    import('../utils/tauriUtils').then(({ isTauri }) => {
      if (isTauri()) {
        import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
          const win = getCurrentWindow();
          win.isFullscreen().then(f => {
            win.setFullscreen(!f);
            setIsFullscreen(!f);
          });
        });
        return;
      }

      const hasNativeFullscreen = !!(
        containerRef.current.requestFullscreen ||
        (containerRef.current as any).webkitRequestFullscreen ||
        (containerRef.current as any).mozRequestFullScreen ||
        (containerRef.current as any).msRequestFullscreen
      );

      if (!hasNativeFullscreen) {
        setIsSimulatedFullscreen(prev => !prev);
        setIsFullscreen(prev => !prev);
        return;
      }

      const isFull = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (!isFull) {
        const req = containerRef.current.requestFullscreen ||
                    (containerRef.current as any).webkitRequestFullscreen ||
                    (containerRef.current as any).mozRequestFullScreen ||
                    (containerRef.current as any).msRequestFullscreen;
        
        req.call(containerRef.current).catch((err: any) => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
          setIsSimulatedFullscreen(true);
          setIsFullscreen(true);
        });
      } else {
        const exit = document.exitFullscreen ||
                     (document as any).webkitExitFullscreen ||
                     (document as any).mozCancelFullScreen ||
                     (document as any).msExitFullscreen;
        exit.call(document);
      }
    });
  };

  useEffect(() => {
    const handlePlaybackKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.getAttribute('contenteditable') === 'true')) {
        return;
      }

      const key = e.key.toLowerCase();
      
      // Escape -> Exit simulated fullscreen or close settings
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showSubSettings) {
          setShowSubSettings(false);
        } else if (isSimulatedFullscreen) {
          setIsSimulatedFullscreen(false);
          setIsFullscreen(false);
          if (onClose) onClose();
        }
      }

      // Space / K -> Play/Pause
      else if (e.key === ' ' || key === 'k') {
        e.preventDefault();
        if (isPlaying) {
          pauseVideo();
        } else {
          playVideo();
        }
      }
      
      // ArrowLeft / J -> Seek backward 10s
      else if (e.key === 'ArrowLeft' || key === 'j') {
        e.preventDefault();
        const targetTime = Math.max(0, lastReceivedTimeRef.current - 10);
        if (iframeRef.current?.contentWindow) {
          const win = iframeRef.current.contentWindow;
          win.postMessage(JSON.stringify({ event: 'setCurrentTime', value: targetTime }), '*');
          win.postMessage(JSON.stringify({ context: 'player.js', method: 'setCurrentTime', value: targetTime }), '*');
          win.postMessage(JSON.stringify({ method: 'seek', value: targetTime }), '*');
          win.postMessage(JSON.stringify({ method: 'setCurrentTime', value: targetTime }), '*');
          win.postMessage(JSON.stringify({ context: 'player.js', event: 'command', command: 'seek', value: targetTime }), '*');
          win.postMessage(JSON.stringify({ context: 'player.js', version: '1.4.0', event: 'command', command: 'seek', value: targetTime }), '*');
          win.postMessage(JSON.stringify({ event: 'command', command: 'seek', value: targetTime }), '*');
          win.postMessage(JSON.stringify({ command: 'seek', value: targetTime }), '*');
        }
        lastReceivedTimeRef.current = targetTime;
      }
      
      // ArrowRight / L -> Seek forward 10s
      else if (e.key === 'ArrowRight' || key === 'l') {
        e.preventDefault();
        const targetTime = lastReceivedTimeRef.current + 10;
        if (iframeRef.current?.contentWindow) {
          const win = iframeRef.current.contentWindow;
          win.postMessage(JSON.stringify({ event: 'setCurrentTime', value: targetTime }), '*');
          win.postMessage(JSON.stringify({ context: 'player.js', method: 'setCurrentTime', value: targetTime }), '*');
          win.postMessage(JSON.stringify({ method: 'seek', value: targetTime }), '*');
          win.postMessage(JSON.stringify({ method: 'setCurrentTime', value: targetTime }), '*');
          win.postMessage(JSON.stringify({ context: 'player.js', event: 'command', command: 'seek', value: targetTime }), '*');
          win.postMessage(JSON.stringify({ context: 'player.js', version: '1.4.0', event: 'command', command: 'seek', value: targetTime }), '*');
          win.postMessage(JSON.stringify({ event: 'command', command: 'seek', value: targetTime }), '*');
          win.postMessage(JSON.stringify({ command: 'seek', value: targetTime }), '*');
        }
        lastReceivedTimeRef.current = targetTime;
      }

      // F -> Toggle Fullscreen
      else if (key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }

      // C -> Toggle Subtitles Overlay
      else if (key === 'c') {
        e.preventDefault();
        setShowSubtitles(prev => !prev);
      }

      // S -> Toggle Settings Panel/Sidebar
      else if (key === 's') {
        e.preventDefault();
        setShowSubSettings(prev => !prev);
      }

      // ? (Shift+/) -> Open Hotkeys guide directly (Mac & Windows)
      else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setSubStudioTab('shortcuts');
        setShowSubSettings(true);
      }

      // Shift+ArrowLeft -> Seek backward 5s
      else if (e.shiftKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        const targetTime = Math.max(0, lastReceivedTimeRef.current - 5);
        if (iframeRef.current?.contentWindow) {
          const win = iframeRef.current.contentWindow;
          win.postMessage(JSON.stringify({ method: 'setCurrentTime', value: targetTime }), '*');
          win.postMessage(JSON.stringify({ context: 'player.js', method: 'setCurrentTime', value: targetTime }), '*');
          win.postMessage(JSON.stringify({ method: 'seek', value: targetTime }), '*');
          win.postMessage(JSON.stringify({ context: 'player.js', event: 'command', command: 'seek', value: targetTime }), '*');
        }
        lastReceivedTimeRef.current = targetTime;
      }

      // Shift+ArrowRight -> Seek forward 5s
      else if (e.shiftKey && e.key === 'ArrowRight') {
        e.preventDefault();
        const targetTime = lastReceivedTimeRef.current + 5;
        if (iframeRef.current?.contentWindow) {
          const win = iframeRef.current.contentWindow;
          win.postMessage(JSON.stringify({ method: 'setCurrentTime', value: targetTime }), '*');
          win.postMessage(JSON.stringify({ context: 'player.js', method: 'setCurrentTime', value: targetTime }), '*');
          win.postMessage(JSON.stringify({ method: 'seek', value: targetTime }), '*');
          win.postMessage(JSON.stringify({ context: 'player.js', event: 'command', command: 'seek', value: targetTime }), '*');
        }
        lastReceivedTimeRef.current = targetTime;
      }

      // Home -> Go to beginning
      else if (e.key === 'Home') {
        e.preventDefault();
        if (iframeRef.current?.contentWindow) {
          const win = iframeRef.current.contentWindow;
          win.postMessage(JSON.stringify({ method: 'setCurrentTime', value: 0 }), '*');
          win.postMessage(JSON.stringify({ method: 'seek', value: 0 }), '*');
          win.postMessage(JSON.stringify({ context: 'player.js', method: 'setCurrentTime', value: 0 }), '*');
        }
        lastReceivedTimeRef.current = 0;
      }
    };

    window.addEventListener('keydown', handlePlaybackKeyDown);
    return () => window.removeEventListener('keydown', handlePlaybackKeyDown);
  }, [isPlaying, showSubSettings, isSimulatedFullscreen, onClose, toggleFullscreen]);

  // Auto-fullscreen on mount is disabled to prevent browser blocking and layout overlay glitches.
  useEffect(() => {
    if (isSimulatedFullscreen) {
      document.body.classList.add('movie-player-active');
      document.documentElement.classList.add('movie-player-active');
    } else {
      if (!onClose) {
        document.body.classList.remove('movie-player-active');
        document.documentElement.classList.remove('movie-player-active');
      }
    }
    return () => {
      if (!onClose) {
        document.body.classList.remove('movie-player-active');
        document.documentElement.classList.remove('movie-player-active');
      }
    };
  }, [isSimulatedFullscreen, onClose]);

  useEffect(() => {
    const preventTouch = (e: TouchEvent) => {
      if (isSimulatedFullscreen) {
        e.preventDefault();
      }
    };
    if (isSimulatedFullscreen) {
      window.addEventListener('touchmove', preventTouch, { passive: false });
    }
    return () => {
      window.removeEventListener('touchmove', preventTouch);
    };
  }, [isSimulatedFullscreen]);

  if (isPip) {
    return (
      <div className="w-full h-full relative bg-black select-none overflow-hidden">
        <iframe
          ref={iframeRef}
          src={overrideSrc || videoUrl}
          className="absolute inset-0 w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          scrolling="no"
        />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`bg-transparent relative flex flex-col overflow-hidden transition-all duration-300 ${
        isSimulatedFullscreen 
          ? 'fixed inset-0 w-screen h-dvh z-[9999] overflow-hidden' 
          : 'w-full h-full'
      }`}
    >


      <div className="relative flex-1 w-full bg-transparent">
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
          style={{ 
            filter: (!isIOSDevice && (brightness !== 1 || contrast !== 1 || saturation !== 1)) 
              ? `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})` 
              : undefined
          }}
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
          onLoad={() => {
            setIsPlayerLoading(false);
            if (onLoadProp) onLoadProp();
          }}
        ></iframe>


        <AnimatePresence>
          {showSubtitles && activeCues.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-[15%] left-0 right-0 z-[100] pointer-events-none w-full flex justify-center px-4"
            >
              {(() => {
                // Determine text direction by checking active cues with their potential override texts
                const resolvedCues = activeCues.map(cue => ({
                  ...cue,
                  displayText: subEditMap.has(cue.index) ? subEditMap.get(cue.index)! : cue.text
                }));
                const hasRtl = resolvedCues.some(cue => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(cue.displayText || ''));

                return (
                  <div 
                    className={`px-6 py-3 rounded-2xl text-center max-w-[90%] transition-all duration-300 pointer-events-auto ${showSubBackground ? 'shadow-2xl border border-white/10' : ''}`}
                    style={{ 
                      direction: hasRtl ? 'rtl' : 'ltr',
                      unicodeBidi: hasRtl ? 'plaintext' : 'normal',
                      textAlign: 'center',
                      backgroundColor: showSubBackground ? `rgba(0,0,0,${subBgOpacity})` : 'transparent',
                      backdropFilter: showSubBackground && subBlur ? 'blur(12px)' : 'none',
                      border: showSubBackground ? undefined : 'none',
                      boxShadow: showSubBackground ? undefined : 'none',
                      textShadow: showSubBackground 
                        ? '0 2px 4px rgba(0,0,0,0.8)'
                        : '0 2px 4px #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 8px rgba(0,0,0,0.8)',
                      fontSize: `${subFontSize}px`,
                      color: subColor,
                      fontWeight: 800, // Optimized weight for Zain font
                      fontFamily: "'Zain', 'Outfit', sans-serif",
                      lineHeight: hasRtl ? '1.5' : '1.4'
                    }}
                  >
                    {resolvedCues.map((cue, i) => {
                      const isEdited = subEditMap.has(cue.index);
                      const isEditable = cue.index >= 0;

                      return (
                        <div key={i} className="relative flex flex-col items-center select-none group pointer-events-auto">
                          {isAdmin && isEditable && (
                            <div
                              className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 cursor-pointer z-30 pointer-events-auto"
                              onClick={(e) => {
                                e.stopPropagation();
                                pauseVideo();
                                setEditingCue({
                                  index: cue.index,
                                  original: cue.text,
                                  current: cue.displayText
                                });
                              }}
                            >
                              <div className="bg-red-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-red-600/20 active:scale-95 border border-red-500/20">
                                <span>✎</span>
                                <span>{(language === 'ku' || language === 'badini') ? 'دەستکاری' : 'EDIT'}</span>
                              </div>
                            </div>
                          )}
                          <p 
                            className="text-center tracking-tight leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] custom-subtitle-text"
                            style={{
                              color: isEdited ? '#fbbf24' : subColor,
                            }}
                          >
                            {cue.displayText}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* SUBTITLE STUDIO SIDEBAR */}
        <AnimatePresence>
          {showSubSettings && (
            <SubtitleManagerPanel
              isOpen={showSubSettings}
              onClose={() => setShowSubSettings(false)}
              activeTab={subStudioTab}
              setActiveTab={setSubStudioTab}
              isAdmin={isAdmin}
              isUploadingSub={isUploadingSub}
              uploadStatus={uploadStatus}
              onFileChange={handleAdminSubUpload}
              subtitleSize={subFontSize}
              setSubtitleSize={setSubFontSize}
              subtitleColor={subColor}
              setSubtitleColor={setSubColor}
              subBgOpacity={subBgOpacity}
              setSubBgOpacity={setSubBgOpacity}
              subBlur={subBlur}
              setSubBlur={setSubBlur}
              showSubBackground={showSubBackground}
              setShowSubBackground={setShowSubBackground}
              brightness={brightness}
              setBrightness={handleBrightnessChange}
              contrast={contrast}
              setContrast={handleContrastChange}
              saturation={saturation}
              setSaturation={handleSaturationChange}
              onResetFilters={handleResetFilters}
              subtitleOffset={subtitleOffset}
              setSubtitleOffset={setSubtitleOffset}
              subSearchQuery={subSearchQuery}
              setSubSearchQuery={setSubSearchQuery}
              availableSubs={availableSubs}
              currentSubId={currentSubId}
              isSearchingSubs={loadingSubs}
              onSelectSub={handleSelectSub}
              onStartTranslation={handleStartTranslation}
              onRetrySearch={handleSearchAllSubs}
              getLanguageFlag={getLanguageFlag}
              isTranslating={activeTranslation.isTranslating && String(activeTranslation.tmdbId) === String(resolvedTmdbId || tmdbId || imdbId)}
              translationProgress={activeTranslation.progress}
              translationStatus={activeTranslation.statusText}
              translatingName={activeTranslation.translatingName}
              showCelebration={activeTranslation.showCelebration && String(activeTranslation.tmdbId) === String(resolvedTmdbId || tmdbId || imdbId)}
              onCloseCelebration={() => {
                dismissCelebration();
                setShowSubSettings(false);
              }}
              language={language}
              dubContent={
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
                          type="button"
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
                      type="button"
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
                          type="button"
                          onClick={() => {
                            let activeId = imdbId || tmdbId || '';
                            
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
              }
            />
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
              className="absolute top-0 left-0 right-0 h-[68%] bg-gradient-to-b from-black/98 via-black/95 to-[#080808]/92 backdrop-blur-3xl border-b border-white/10 z-[200] flex flex-col gap-4 select-none shadow-[0_24px_50px_rgba(0,0,0,0.9)] overflow-hidden"
              style={{ 
                fontFamily: (language === 'ku' || language === 'badini') ? "'Zain', sans-serif" : "'Inter', sans-serif",
                paddingTop: 'calc(1.25rem + env(safe-area-inset-top, 0px))',
                paddingLeft: 'calc(1.5rem + env(safe-area-inset-left, 0px))',
                paddingRight: 'calc(1.5rem + env(safe-area-inset-right, 0px))',
                paddingBottom: '1.25rem'
              }}
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

      {/* Subtitle Edit Overlay Modal */}
      <AnimatePresence>
        {editingCue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-xl z-[400] flex items-center justify-center p-4"
            onClick={() => {
              setEditingCue(null);
              playVideo();
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-gradient-to-b from-[#141417]/95 to-[#0b0b0c]/98 border border-white/[0.08] backdrop-blur-3xl rounded-3xl p-5 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] relative shadow-red-500/5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-500">✎</span>
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
                    playVideo();
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
                      className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-medium resize-none outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 transition-all placeholder:text-white/20"
                      style={{
                        fontFamily: isKurdishText ? "'Zain', sans-serif" : "'Outfit', sans-serif",
                        textAlign: isKurdishText ? 'right' : 'left',
                        lineHeight: isKurdishText ? '1.8' : '1.5',
                        fontSize: isKurdishText ? '15px' : '14px',
                      }}
                      placeholder={language === 'ku' || language === 'badini' ? 'ریزەکە لێرە بنووسە...' : 'Type the corrected line here...'}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setEditingCue(null);
                          playVideo();
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
                  className="flex-1 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-red-600 text-white hover:bg-red-500 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-red-600/20"
                >
                  {subEditSaving ? '...' : (language === 'ku' || language === 'badini' ? 'پاشەکەوتکردن' : 'Save for All')}
                </button>

                {subEditMap.has(editingCue.index) && (
                  <button
                    onClick={handleRestoreSubtitleEdit}
                    disabled={subEditSaving}
                    className="px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-white/5 text-white hover:bg-white/10 active:scale-95 transition-all border border-white/10"
                  >
                    {language === 'ku' || language === 'badini' ? 'گێڕانەوە' : 'Restore'}
                  </button>
                )}

                <button
                  onClick={() => {
                    setEditingCue(null);
                    playVideo();
                  }}
                  className="px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-white/5 text-white/50 hover:bg-white/10 active:scale-95 transition-all border border-white/10"
                >
                  {language === 'ku' || language === 'badini' ? 'پاشەکشە' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Source Switcher Drawer for Fullscreen Mode */}
      <AnimatePresence>
        {showSourceSwitcher && sources && sources.length > 0 && (
          <motion.div 
            initial={{ x: '100%', opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            exit={{ x: '100%', opacity: 0 }} 
            transition={{ type: 'spring', damping: 30, stiffness: 250 }}
            className="absolute top-0 right-0 bottom-0 w-80 md:w-96 bg-[#070707]/90 backdrop-blur-3xl border-l border-white/10 z-[300] overflow-y-auto scrollbar-hide flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden"
            style={{
              paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 0px))',
              paddingRight: 'calc(1.5rem + env(safe-area-inset-right, 0px))',
              paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
              paddingLeft: 'calc(1.5rem + env(safe-area-inset-left, 0px))'
            }}
          >
            {/* High Performance Hardware Accelerated Gradient Glow (Zero CPU Overhead) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              <div className="absolute -top-1/4 -right-1/4 w-80 h-80 rounded-full bg-gradient-to-br from-red-600/10 to-rose-600/5 blur-[90px] will-change-transform opacity-75" />
              <div className="absolute -bottom-1/4 -left-1/4 w-80 h-80 rounded-full bg-gradient-to-tr from-purple-600/10 to-pink-600/5 blur-[100px] will-change-transform opacity-75" />
            </div>

            <div className="relative z-10 flex items-center justify-between mb-8 pb-4 border-b border-white/5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Activity size={12} className="text-red-500 animate-pulse" />
                  <span className="text-[9px] font-[1000] tracking-[0.2em] text-red-500 uppercase">FLKRD CORE</span>
                </div>
                <h3 className="text-base font-black tracking-tight text-white uppercase italic text-left">Streaming Nodes</h3>
              </div>
              <button 
                onClick={() => setShowSourceSwitcher(false)}
                className="p-2.5 bg-white/5 hover:bg-red-600/20 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-white rounded-full transition-all group"
              >
                <X size={16} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <div className="relative z-10 space-y-4 pb-12 overflow-y-auto flex-1 scrollbar-hide pr-1" dir={(language === 'ku' || language === 'badini') ? 'rtl' : 'ltr'}>
              {sources.map((s, idx) => {
                const iconPath = s.name === 'FLKRD SERVER' ? '/assets/icons/master_crown.png' : 
                               s.name === 'FLKRD SERVER 1' ? '/assets/icons/diamond.png' : 
                               s.name === 'FLKRD SERVER 2' ? '/assets/icons/bronze.png' : 
                               s.name === 'FLKRD SERVER 3' ? '/assets/icons/diamond.png' : null;

                const isActive = activeSource === s.name;
                
                let loadPct = 18;
                let speed = '1.8 Gbps';
                let latency = '18ms';
                let statusText = 'Optimal';
                let statusColor = 'text-green-400';
                let statusBg = 'bg-green-400/10 border-green-400/20';

                if (s.name === 'FLKRD SERVER') {
                  loadPct = 18; speed = '1.8 Gbps'; latency = '16ms'; statusText = 'Ultra Fast';
                } else if (s.name === 'FLKRD SERVER 1') {
                  loadPct = 26; speed = '1.5 Gbps'; latency = '24ms'; statusText = 'Stable';
                } else if (s.name === 'FLKRD SERVER 2') {
                  loadPct = 34; speed = '1.2 Gbps'; latency = '32ms'; statusText = 'Optimized';
                }                return (
                  <button 
                    key={s.name}
                    onClick={() => { 
                      if (isActive) return;
                      if (setActiveSource) {
                        setActiveSource(s.name); 
                      }
                      setIsPlayerLoading(true);
                      setTimeout(() => {
                        setShowSourceSwitcher(false);
                      }, 800);
                    }} 
                    className={`w-full p-4.5 rounded-[24px] flex flex-col gap-3 transition-all duration-300 border group relative overflow-hidden backdrop-blur-md text-left ${
                      isActive 
                        ? 'border-red-500/40 shadow-[0_12px_30px_rgba(239,68,68,0.12)] ring-1 ring-red-500/10' 
                        : 'bg-neutral-950/45 border-white/5 hover:border-white/15 hover:bg-neutral-900/60 hover:shadow-[0_8px_20px_rgba(255,255,255,0.01)]'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-[24px]">
                        <div 
                          className="absolute top-1/2 left-1/2 w-[250%] h-[250%] origin-center"
                          style={{
                            background: 'conic-gradient(from 0deg, transparent 30%, #ef4444, #f43f5e, transparent 70%)',
                            animation: 'neon-border-spin 3s linear infinite',
                          }}
                        />
                        <div 
                          className="absolute inset-[1.5px] rounded-[22.5px] z-1 pointer-events-none"
                          style={{
                            background: `radial-gradient(circle at 50% 0%, rgba(var(--brand-red-rgb), 0.15), transparent 85%), rgba(10, 10, 10, 0.9)`,
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                          }}
                        />
                      </div>
                    )}

                    {isActive && (
                      <motion.div 
                        layoutId="active-accent-line-prem-fs"
                        className="absolute left-0 top-3 bottom-3 w-[3px] bg-red-600 rounded-full shadow-[0_0_12px_#ef4444] z-10"
                      />
                    )}

                    <div className="flex items-center justify-between w-full relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0">
                          {isActive && isPlayerLoading ? (
                            <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                          ) : s.name === 'FLKRD SERVER 4' ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#1d9bf0] drop-shadow-[0_2px_6px_rgba(29,155,240,0.4)]">
                              <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.941.1-1.358.275C14.77 2.515 13.512 1.5 12 1.5s-2.77 1.015-3.372 2.285c-.417-.175-.878-.275-1.358-.275-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .941-.1.358-.275.602 1.27 1.86 2.285 3.372 2.285s2.77-1.015 3.372-2.285c.417.175.878.275 1.358.275 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.5 4L6 12.5l1.4-1.4 2.6 2.6 6.6-6.6 1.4 1.4-8 8z" />
                            </svg>
                          ) : iconPath ? (
                            <img src={iconPath} className="w-7 h-7 object-contain" style={{ mixBlendMode: 'screen' }} alt="" />
                          ) : (
                            <Cpu size={16} className={isActive ? 'text-red-500' : 'text-gray-400'} />
                          )}

                          {isActive && !isPlayerLoading && (
                            <motion.div 
                              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
                              transition={{ duration: 3, repeat: Infinity }}
                              className="absolute inset-0 bg-red-600/10 blur-xl rounded-full"
                            />
                          )}
                        </div>

                        <div className="flex flex-col items-start text-left">
                          <span className={`text-[11px] font-black uppercase tracking-wider ${isActive ? 'text-white font-extrabold' : 'text-gray-300'}`}>
                            {s.name}
                          </span>
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">
                            Node VK-{idx + 1}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <div className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                          isActive 
                            ? isPlayerLoading 
                              ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' 
                              : 'bg-green-500/10 border-green-500/20 text-green-500'
                            : statusBg
                        } ${isActive ? '' : statusColor}`}>
                          {isActive 
                            ? isPlayerLoading 
                              ? ((language === 'ku' || language === 'badini') ? 'پەیوەندی دەبەسترێت...' : 'Connecting...') 
                              : ((language === 'ku' || language === 'badini') ? 'پەیوەستە' : 'Connected')
                            : statusText}
                        </div>
                      </div>
                    </div>

                    <div className="h-[1px] w-full bg-white/5 relative z-10" />

                    <div className="flex flex-col gap-2 w-full mt-1 relative z-10">
                      <div className="flex items-center justify-between w-full text-[9px] font-bold text-gray-400 relative z-10 text-left">
                        <div className="flex items-center gap-1.5 flex-row">
                          <Zap size={10} className={isActive ? 'text-red-500' : 'text-gray-500'} />
                          <span>{speed}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 flex-row">
                          <Timer size={10} className="text-gray-500" />
                          <span>{latency}</span>
                        </div>

                        <div className="flex items-center gap-1 flex-row">
                          <Cpu size={10} className="text-gray-500" />
                          <span className={loadPct > 60 ? 'text-yellow-500' : 'text-gray-400'}>{loadPct}% load</span>
                        </div>
                      </div>

                      {/* Visual Load Progress Bar */}
                      <div className="w-full bg-white/5 rounded-full h-[3px] overflow-hidden relative">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            loadPct > 60 
                              ? 'bg-gradient-to-r from-yellow-500 to-amber-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' 
                              : 'bg-gradient-to-r from-red-500 to-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                          }`} 
                          style={{ width: `${loadPct}%` }}
                        />
                      </div>
                    </div>

                    {s.badge === 'ku' && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-blue-600/10 px-2 py-0.5 rounded-lg border border-blue-500/20 shadow-md scale-75 z-10">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/3/35/Flag_of_Kurdistan.svg" className="w-3 h-2 rounded-[1px] object-cover" alt="" />
                        <span className="text-[7px] font-black text-blue-500 uppercase tracking-wider">KURDISH</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-Left: Close Button and Watermark */}
      <div 
        className="absolute z-[100] flex items-center gap-3 pointer-events-auto"
        style={{
          top: '1rem',
          left: '1rem',
          transform: 'translate3d(0, 0, 0)',
          WebkitTransform: 'translate3d(0, 0, 0)'
        }}
      >
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 bg-black/40 hover:bg-red-600/30 border border-white/10 hover:border-red-500/20 text-gray-400 hover:text-white rounded-xl transition-all group active:scale-95 flex items-center justify-center shadow-2xl"
            title="Close"
          >
            <X size={16} className="group-hover:rotate-90 transition-transform" />
          </button>
        )}

        <div className="w-8 h-8 flex items-center justify-center bg-white/5 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative overflow-hidden opacity-40 hover:opacity-100 transition-opacity duration-500">
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-xl" />
          <span className="text-lg font-[1000] italic bg-gradient-to-br from-white via-white/80 to-white/20 bg-clip-text text-transparent drop-shadow-2xl relative z-10">F</span>
        </div>
      </div>

      {/* Top Controls — always visible and interactive, rendered after video element to sit on top of the iframe */}
      <div 
        className="absolute z-[100] flex items-center gap-2 md:gap-3 pointer-events-auto"
        style={{
          top: '1rem',
          right: '1rem',
          transform: 'translate3d(0, 0, 0)',
          WebkitTransform: 'translate3d(0, 0, 0)'
        }}
      >
        {type === 'tv' && onEpisodeChange && (
          <button 
            onClick={() => {
              setShowEpisodesPortal(!showEpisodesPortal);
              setShowSubSettings(false);
              setShowSourceSwitcher(false);
            }}
            className={`player-episodes-trigger transition-all duration-300 backdrop-blur-md border px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-2xl active:scale-95 ${
              showEpisodesPortal 
                ? 'bg-red-600 border-red-500 text-white shadow-red-600/40' 
                : 'bg-black/70 border-white/20 text-white/95 hover:bg-white/20'
            }`}
          >
            <Tv size={16} />
            <span className="text-[11px] font-black uppercase">{(language === 'ku' || language === 'badini') ? 'ئەڵقەکان' : 'Episodes'}</span>
          </button>
        )}

        {/* Subtitle Toggle */}
        <button 
          onClick={() => {
            setShowSubSettings(!showSubSettings);
            if (!showSubSettings) handleSearchAllSubs();
            setShowEpisodesPortal(false);
            setShowSourceSwitcher(false);
          }}
          className={`player-cc-trigger transition-all duration-300 backdrop-blur-md border px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-2xl active:scale-95 ${
            showSubSettings 
              ? 'bg-red-600 border-red-500 text-white shadow-red-600/40' 
              : 'bg-black/70 border-white/20 text-white/95 hover:bg-white/20'
          }`}
        >
          <Subtitles size={16} />
          <span className="text-[11px] font-black uppercase">{(language === 'ku' || language === 'badini') ? 'ژێرنووس' : 'CC'}</span>
        </button>

        {/* Relink Button */}
        {sources && sources.length > 0 && (
          <button 
            onClick={() => {
              setShowSourceSwitcher(!showSourceSwitcher);
              setShowSubSettings(false);
              setShowEpisodesPortal(false);
            }}
            className={`player-relink-trigger transition-all duration-300 backdrop-blur-md border px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-2xl active:scale-95 ${
              showSourceSwitcher
                ? 'bg-red-600 border-red-500 text-white shadow-red-600/40 animate-pulse'
                : 'bg-black/70 border-white/20 text-white/95 hover:bg-white/20'
            }`}
            title="Relink"
          >
            <RefreshCcw size={16} className={showSourceSwitcher ? 'text-white rotate-180 transition-transform duration-500' : ''} />
            <span className="text-[11px] font-black uppercase">{(language === 'ku' || language === 'badini') ? 'سێرڤەر' : 'Relink'}</span>
          </button>
        )}

        {/* Fullscreen Button */}
        <button 
          onClick={toggleFullscreen}
          className="transition-all duration-300 backdrop-blur-md border px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-2xl bg-black/70 border-white/20 text-white/95 hover:bg-white/20 active:scale-95"
          title={isFullscreen 
            ? ((language === 'ku' || language === 'badini') ? 'دەرچوون لە شاشەی تەواو' : 'Exit Fullscreen') 
            : ((language === 'ku' || language === 'badini') ? 'شاشەی تەواو' : 'Fullscreen')}
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          <span className="text-[11px] font-black uppercase">
            {isFullscreen 
              ? ((language === 'ku' || language === 'badini') ? 'بچووککردن' : 'Exit') 
              : ((language === 'ku' || language === 'badini') ? 'شاشە' : 'Full')}
          </span>
        </button>
        {/* Ad-Blocker Badge */}
        <div className={`transition-all duration-500 ${isShieldActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 scale-50'}`}>
          <div className="bg-green-600/20 backdrop-blur-md border border-green-500/30 text-green-500 text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-xl">
            <Shield size={12} fill="currentColor" />
            SHIELD ACTIVE
          </div>
        </div>
      </div>
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

      const [startStr, endStr] = timeLine.split('-->').map(s => s.trim());
      const start = parseTime(startStr);
      const end = parseTime(endStr);
      const rawTextLines = lines.slice(lines.indexOf(timeLine) + 1);
      const filteredLines = rawTextLines.filter(line => !/^\s*\d+\s*$/.test(line) && !line.includes('-->'));
      const text = filteredLines.join('\n')
        .replace(/<[^>]*>/g, '')
        .replace(/\{[^}]+\}/g, '')
        .trim();
      
      if (text) cues.push({ start, end, text });
    }
  }

  const withIndices = cues.map((c, i) => ({ ...c, index: i }));
  const hasKurdish = /[\u0600-\u06FF]/.test(vttText);
  if (hasKurdish) {
    const introCues = [
      { start: 1.0, end: 4.0, text: "ژێرنووسکراوە لەلایەن زانا فاروقەوە", index: -1 },
      { start: 4.5, end: 7.5, text: "FLKRD Studio", index: -2 }
    ];
    // Filter out original cues starting in the first 7.5s to prevent overlaps
    const mainCues = withIndices.filter(c => c.start >= 7.5);
    return [...introCues, ...mainCues];
  }

  return withIndices;
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
