import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Languages, Bell, Check, Palette, Sparkles, Moon, Sun,
  Maximize2, Minimize2, Type, Zap, Info, Monitor, Gauge,
  ChevronRight, Activity, Cpu, RefreshCw, Download,
  Smartphone, Laptop, ArrowUpRight, Apple,
  BookOpen, Layers, HelpCircle, FileText, ShieldCheck, Copy,
  Tablet, Users, Eye, Globe, TrendingUp, Search, ArrowLeft, Calendar
} from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import EnableNotificationsModal from './EnableNotificationsModal';
import Portal from './Portal';
import { LiquidButton } from './ui/liquid-glass-button';
import { updateService, UpdateCheckResult } from '../services/updateService';
import { isTauri } from '../utils/tauriUtils';
import { tauriService } from '../services/tauriService';
import { supabase } from '../utils/supabaseClient';
// @ts-ignore
import warningImage1 from './warnin g images/image.png';
// @ts-ignore
import warningImage2 from './warnin g images/image copy.png';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ─── Data Constants ───────────────────────────── */
const APP_COLORS = [
  { name: 'FLKRD Red',      value: '#e50914' },
  { name: 'Sky Blue',       value: '#007aff' },
  { name: 'Emerald',        value: '#34c759' },
  { name: 'Royal Purple',   value: '#af52de' },
  { name: 'Amber Gold',     value: '#ffcc00' },
  { name: 'Pure Pink',      value: '#ff2d55' },
  { name: 'Cyber Orange',   value: '#ff9500' },
  { name: 'Arctic White',   value: '#ffffff' },
];

const APP_THEMES = [
  { id: 'dark',                      name: 'Dark Void',   icon: '🌑', color: '#000' },
  { id: 'premium-gradient-1',        name: 'Aurora',      icon: '🌌', color: '#6c3483' },
  { id: 'premium-gradient-2',        name: 'Crimson',     icon: '🔴', color: '#c0392b' },
  { id: 'premium-particles-galaxy',  name: 'Galaxy',      icon: '✨', color: '#1a237e' },
  { id: 'premium-particles-moon',    name: 'Moonlight',   icon: '🌙', color: '#37474f' },
  { id: 'premium-particles-stardust',name: 'Stardust',    icon: '💫', color: '#4a148c' },
  { id: 'light',                     name: 'Light',       icon: '☀️', color: '#f5f5f5' },
];

/* ─── Sub-Components ────────────────────────── */

const AnimatedToggle: React.FC<{
  checked: boolean;
  onChange: () => void;
  color?: string;
  language?: string;
}> = ({ checked, onChange, color = '#e50914', language = 'en' }) => {
  const isRTL = (language === 'ku' || language === 'badini') || language === 'badini';
  return (
    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className="relative w-14 h-7 rounded-full flex-shrink-0 focus:outline-none overflow-hidden"
      style={{
        backgroundColor: checked ? color : 'rgba(255,255,255,0.08)',
      }}
      whileTap={{ scale: 0.92 }}
    >
      <motion.div
        className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg flex items-center justify-center"
        animate={{
          x: isRTL
            ? (checked ? 4 : 32)
            : (checked ? 32 : 4),
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: checked ? color : '#ccc' }} />
      </motion.div>
    </motion.button>
  );
};

const FPSCounter: React.FC<{ active: boolean }> = ({ active }) => {
  const [fps, setFps] = useState(60);
  const frameRef = useRef<number>(0);
  const lastRef = useRef<number>(performance.now());
  const countRef = useRef<number>(0);

  useEffect(() => {
    if (!active) { setFps(60); return; }
    const loop = (now: number) => {
      countRef.current++;
      if (now - lastRef.current >= 500) {
        setFps(Math.round(countRef.current * (1000 / (now - lastRef.current))));
        countRef.current = 0;
        lastRef.current = now;
      }
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [active]);

  const color = fps >= 55 ? '#34c759' : fps >= 40 ? '#ffcc00' : '#e50914';
  return (
    <div className="flex items-center gap-1.5 font-mono text-[10px] font-black tabular-nums bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
      <Activity size={10} style={{ color }} className={fps < 50 ? 'animate-pulse' : ''} />
      <span style={{ color }}>{fps} <span className="opacity-40 ml-0.5">FPS</span></span>
    </div>
  );
};

const Section: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

const SectionLabel: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-2.5 mb-4 px-1">
    <span className="text-gray-500 scale-90">{icon}</span>
    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 whitespace-nowrap">{label}</span>
    <div className="flex-1 h-[1px] bg-gradient-to-r from-main-text/5 to-transparent" />
  </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string; glow?: string }> = ({ children, className = '', glow }) => (
  <div 
    className={`relative rounded-3xl border border-main-text/5 bg-main-text/[0.02] backdrop-blur-md overflow-hidden transition-all duration-500 ${className}`}
    style={glow ? { boxShadow: `0 0 40px ${glow}11`, borderColor: `${glow}33` } : {}}
  >
    {children}
  </div>
);

/* ─── Analytics Helpers ────────────────────────── */
const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let start = displayValue;
    const end = value;
    if (start === end) return;

    const duration = 800; // ms
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const ease = progress * (2 - progress); // easeOutQuad
      const current = Math.round(start + (end - start) * ease);
      
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <>{displayValue.toLocaleString()}</>;
};

const getFlagEmoji = (countryName: string): string => {
  const codeMap: Record<string, string> = {
    'Iraq': '🇮🇶',
    'Kurdistan': '☀️',
    'United States': '🇺🇸',
    'United Kingdom': '🇬🇧',
    'Germany': '🇩🇪',
    'Sweden': '🇸🇪',
    'Netherlands': '🇳🇱',
    'Turkey': '🇹🇷',
    'Iran': '🇮🇷',
    'Syria': '🇸🇾',
    'Jordan': '🇯🇴',
    'Lebanon': '🇱🇧',
    'Egypt': '🇪🇬',
    'United Arab Emirates': '🇦🇪',
    'Saudi Arabia': '🇸🇦',
    'Kuwait': '🇰🇼',
    'Qatar': '🇶🇦',
    'Canada': '🇨🇦',
    'Australia': '🇦🇺',
    'France': '🇫🇷',
    'Local Dev': '💻',
    'Tauri App': '🚀'
  };
  return codeMap[countryName] || '🏳️';
};

const getRelativeTime = (dateStr: string, lang: string): string => {
  try {
    const elapsed = Date.now() - new Date(dateStr).getTime();
    const sec = Math.floor(elapsed / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);

    if (lang === 'ku' || lang === 'badini') {
      if (sec < 60) return 'ئێستا';
      if (min < 60) return `${min} خولەک پێش ئێستا`;
      if (hr < 24) return `${hr} کاتژمێر پێش ئێستا`;
      return `${Math.floor(hr / 24)} ڕۆژ پێش ئێستا`;
    }

    if (sec < 60) return 'Just now';
    if (min < 60) return `${min}m ago`;
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  } catch(e) {
    return '';
  }
};

/* ─── Main Component ────────────────────────── */

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t, language } = useTranslation();
  const handleDownloadClick = async (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    if (isTauri()) {
      e.preventDefault();
      await tauriService.openExternal(url);
    }
  };
  const { 
    theme, setTheme, 
    accentColor, setAccentColor, 
    scale, setScale, 
    isPerformanceMode, setIsPerformanceMode,
    glassConfig,
    isAdmin
  } = useUI();
  const { addNotification } = useNotification();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEnableNotificationsModalOpen, setIsEnableNotificationsModalOpen] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);

  // Visitor Analytics Dashboard States
  interface AnalyticsData {
    total_visits: number;
    live_users: number;
    device_stats: Record<string, number>;
    country_stats: Array<{ country: string; cnt: number }>;
    daily_traffic: Array<{ date: string; count: number }>;
    recent_visits: Array<{
      id: string;
      created_at: string;
      page_path: string;
      country: string;
      device_type: string;
      referrer: string;
    }>;
  }

  interface RawVisitLog {
    id: string;
    created_at: string;
    session_id: string;
    country: string;
    device_type: string;
    page_path: string;
    referrer: string;
    user_agent: string;
    fcp: number | null;
    lcp: number | null;
    inp: number | null;
    cls: number | null;
  }

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [detailedVisits, setDetailedVisits] = useState<RawVisitLog[]>([]);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);

  // Web Performance state for Vercel-style insights
  const [performanceScore, setPerformanceScore] = useState(94);
  const [fcp, setFcp] = useState(1.15);
  const [lcp, setLcp] = useState(2.08);
  const [inp, setInp] = useState(55);
  const [cls, setCls] = useState(0.03);

  const parseUserAgent = (ua: string) => {
    if (!ua) return { browser: 'Unknown', os: 'Unknown' };
    let browser = 'Other';
    let os = 'Other';

    // Parse OS
    if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh') || ua.includes('Mac OS X')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';

    // Parse Browser
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('SamsungBrowser')) browser = 'Samsung Browser';
    else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
    else if (ua.includes('Edge') || ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';

    return { browser, os };
  };

  useEffect(() => {
    if (!isOpen) return;
    try {
      // Fetch actual FCP if supported by browser APIs
      const paint = performance.getEntriesByType('paint');
      const fcpEntry = paint.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        const val = Number((fcpEntry.startTime / 1000).toFixed(2));
        setFcp(val);
        // Estimate LCP as roughly 1.8x FCP
        setLcp(Number((val * 1.8).toFixed(2)));
        // Compute score
        const score = Math.max(35, Math.min(100, Math.round(100 - (val - 0.4) * 15)));
        setPerformanceScore(score);
      }
      // Estimate CLS and INP slightly based on memory/runtime speed
      const mem: any = (performance as any).memory;
      if (mem) {
        setInp(Math.max(25, Math.min(120, Math.round(mem.usedJSHeapSize / 1024 / 1024 / 2))));
      }
    } catch(e) {}
  }, [isOpen]);

  const fetchAnalytics = async () => {
    try {
      // 1. Fetch summary stats via RPC
      const { data, error } = await supabase.rpc('get_site_analytics_summary');
      if (error) throw error;
      if (data) {
        setAnalytics(data);
        if (data.performance_score !== undefined) setPerformanceScore(data.performance_score);
        if (data.fcp_avg !== undefined) setFcp(data.fcp_avg);
        if (data.lcp_avg !== undefined) setLcp(data.lcp_avg);
        if (data.inp_avg !== undefined) setInp(data.inp_avg);
        if (data.cls_avg !== undefined) setCls(data.cls_avg);
      }

      // 2. Fetch raw detailed logs (last 100 rows)
      const { data: rawData, error: rawError } = await supabase
        .from('site_analytics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (rawError) throw rawError;
      if (rawData) {
        setDetailedVisits(rawData as RawVisitLog[]);
      }
    } catch (e) {
      console.warn('[ANALYTICS] Failed to fetch site analytics:', e);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setLoadingAnalytics(true);
    fetchAnalytics().finally(() => setLoadingAnalytics(false));

    // Real-time visitor sync channel (listens to INSERTS and UPDATES)
    const channel = supabase
      .channel('realtime_analytics_dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_analytics' },
        () => {
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  // System update checking states
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Dynamic Platform Detection State
  type Platform = 'ios' | 'android' | 'macos' | 'windows' | 'web';
  const [detectedPlatform, setDetectedPlatform] = useState<Platform>('web');
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);

  // Dynamic Download URLs from Supabase Registry
  const [macDownloadUrl, setMacDownloadUrl] = useState('https://github.com/FLKRDAIv1/flkrd-movies-react/releases/download/v5.5.1.25/FLKRD_MOVIES_Mac_v5.5.1.25.dmg');
  const [androidDownloadUrl, setAndroidDownloadUrl] = useState('https://github.com/FLKRDAIv1/flkrd-movies-react/releases/download/v5.5.1.25/FLKRD_Movies_v5.5.1.25_Universal.apk');

  // macOS Installation Guide States
  const [isMacTutorialOpen, setIsMacTutorialOpen] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [macTutorialStep, setMacTutorialStep] = useState(1);

  useEffect(() => {
    const fetchDownloadUrls = async () => {
      try {
        const { data, error } = await supabase
          .from('app_updates')
          .select('platform, download_url');
        
        if (error) throw error;
        
        if (data) {
          const mac = data.find(item => item.platform === 'macos');
          const android = data.find(item => item.platform === 'android');
          if (mac?.download_url) setMacDownloadUrl(mac.download_url);
          if (android?.download_url) setAndroidDownloadUrl(android.download_url);
        }
      } catch (e) {
        console.warn('[SETTINGS MODAL] Failed to fetch download URLs from Supabase:', e);
      }
    };

    if (isOpen) {
      fetchDownloadUrls();
    }
  }, [isOpen]);

  useEffect(() => {
    const getDevicePlatform = (): Platform => {
      if (typeof window === 'undefined') return 'web';
      const ua = navigator.userAgent;
      if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
      if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 0) return 'ios';
      if (/Android/i.test(ua)) return 'android';
      if (/Macintosh/i.test(ua)) return 'macos';
      if (/Windows/i.test(ua)) return 'windows';
      return 'web';
    };
    setDetectedPlatform(getDevicePlatform());
  }, []);

  // Performance monitoring logic
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setSessionTime(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCheckForUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateError(null);
    try {
      const result = await updateService.checkForUpdates();
      setUpdateResult(result);
      if (result.updateAvailable) {
        addNotification({
          type: 'info',
          title: (language === 'ku' || language === 'badini') ? 'نوێکاری بەردەستە' : 'Update Available',
          message: (language === 'ku' || language === 'badini') ? `وەشانی ${result.latestVersion} ئامادەیە بۆ دابەزاندن` : `Version ${result.latestVersion} is ready for installation.`
        });
      } else {
        addNotification({
          type: 'success',
          title: (language === 'ku' || language === 'badini') ? 'سیستم نوێیە' : 'System Up-to-Date',
          message: (language === 'ku' || language === 'badini') ? 'تۆ دوایین وەشانی سیستم بەکاردێنیت' : 'You are running the latest version.'
        });
      }
    } catch (err) {
      console.error('[UPDATE UI] Error checking for updates:', err);
      setUpdateError((language === 'ku' || language === 'badini') ? 'پەیوەندی سەرنەکەوت' : 'Failed to reach update servers.');
      addNotification({
        type: 'error',
        title: (language === 'ku' || language === 'badini') ? 'هەڵە لە پشکنین' : 'Update Check Failed',
        message: (language === 'ku' || language === 'badini') ? 'تکایە هێڵی ئینتەرنێتەکەت بپشکنە' : 'Please check your internet connection.'
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleExecuteUpdate = async () => {
    if (!updateResult) return;
    try {
      await updateService.executeUpdate(updateResult);
      addNotification({
        type: 'info',
        title: (language === 'ku' || language === 'badini') ? 'دەستپێکردنی نوێکاری' : 'Initiating Update',
        message: (language === 'ku' || language === 'badini') ? 'پرۆسەی نوێکردنەوە دەستی پێکرد' : 'Updating protocol initiated.'
      });
    } catch (err) {
      console.error('[UPDATE UI] Error executing update:', err);
      addNotification({
        type: 'error',
        title: (language === 'ku' || language === 'badini') ? 'نوێکاری سەرنەکەوت' : 'Update Execution Failed',
        message: (language === 'ku' || language === 'badini') ? 'کێشەیەک ڕوویدا لە کاتی جێبەجێکردندا' : 'An error occurred while launching update.'
      });
    }
  };

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission);
  }, [isOpen]);

  const handleColorChange = (color: string) => {
    setAccentColor(color);
    addNotification({ 
      type: 'success', 
      title: '🎨 Color Updated', 
      message: 'Interface color synchronized.' 
    });
  };

  const handleThemeChange = (id: string) => {
    setTheme(id as any);
    addNotification({ 
      type: 'success', 
      title: '🖼 Theme Applied', 
      message: 'Environment configured.' 
    });
  };

  const togglePerformance = () => {
    const next = !isPerformanceMode;
    setIsPerformanceMode(next);
    addNotification({
      type: next ? 'success' : 'info',
      title: next ? '⚡ 60 FPS Turbo ON' : '🎨 High Quality ON',
      message: next 
        ? ((language === 'ku' || language === 'badini') ? 'دۆخی خێرا چالاک کرا' : 'Visual suppression active for maximum performance.')
        : ((language === 'ku' || language === 'badini') ? 'دۆخی ئاسایی گەڕێندرایەوە' : 'Full visual fidelity restored.')
    });
  };

  const scalePercent = Math.round((scale || 1) * 100);

  return (
    <Portal id="settings-portal">
      <div className={`fixed inset-0 z-[1000] pointer-events-none ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <AnimatePresence>
        {isOpen && (
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-auto">
          {/* Backdrop with motion-graphics blur */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-[12px]"
            style={{ pointerEvents: 'auto' }}
          />

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-lg shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden z-10"
            style={{ borderRadius: `${glassConfig.cornerRadius}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Isolated Liquid-Glass background overlay */}
            <div 
              className="absolute inset-0 z-0 pointer-events-none transition-all duration-300 overflow-hidden"
              style={{
                background: `radial-gradient(circle at 50% 0%, rgba(var(--brand-red-rgb), ${glassConfig.redOpacity}), transparent 80%), rgba(10, 10, 10, ${glassConfig.darkOpacity})`,
                backdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
                WebkitBackdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
                borderRadius: `${glassConfig.cornerRadius}px`,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: `rgba(var(--brand-red-rgb), ${glassConfig.borderOpacity})`,
                boxShadow: `
                  inset 0 1px 0 0 rgba(255, 255, 255, ${0.12 + glassConfig.borderOpacity * 0.45}),
                  inset ${glassConfig.aberrationIntensity * 0.15}px 0 0.5px rgba(255, 0, 80, 0.08),
                  inset -${glassConfig.aberrationIntensity * 0.15}px 0 0.5px rgba(0, 200, 255, 0.08),
                  inset 0 -1px 0 0 rgba(0, 0, 0, 0.4),
                  0 25px 50px -12px rgba(0, 0, 0, 0.5)
                `
              }}
            >
              {/* Dynamic GPU-accelerated water sheen overlay */}
              <div 
                className="absolute inset-[-100%] pointer-events-none mix-blend-overlay animate-[ios-glass-shine_25s_linear_infinite]"
                style={{
                  background: `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, ${0.05 + (glassConfig.displacementScale / 120) * 0.15}) 0%, rgba(255, 255, 255, 0.01) 40%, transparent 70%)`,
                  opacity: (glassConfig.displacementScale / 120) * 0.9,
                  animationDuration: `${30 * (0.35 / Math.max(0.1, glassConfig.elasticity))}s`
                }}
              />
            </div>

            {/* Glass Highlight Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/[0.03] to-transparent z-[1]" style={{ borderRadius: `${glassConfig.cornerRadius}px` }} />

            {/* Sharp content container above background overlay */}
            <div className="relative z-10 w-full h-full flex flex-col">
            
            {/* Header */}
            <div className="relative px-8 pt-8 pb-6 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg"
                  style={{ backgroundColor: `${accentColor}15` }}
                >
                  <Sparkles size={20} style={{ color: accentColor }} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-[1000] text-main-text uppercase italic tracking-tighter leading-none">
                    {t('designSettings')}
                  </h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">FLKRD CORE v5.5.1.25</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FPSCounter active={true} />
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-main-text/5 hover:bg-main-text/10 border border-main-text/10 flex items-center justify-center text-gray-400 hover:text-main-text transition-all active:scale-90"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[60vh] px-8 py-8 space-y-8 scroll-smooth scrollbar-hide">
              
              {/* Performance Diagnostics */}
              <Section delay={0.1}>
                <SectionLabel icon={<Cpu size={14} />} label="System Integrity" />
                <div className="grid grid-cols-2 gap-4">
                   <Card className="p-5 flex flex-col gap-1">
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Runtime</span>
                      <span className="text-base font-black text-white font-mono">
                        {Math.floor(sessionTime / 60)}m {sessionTime % 60}s
                      </span>
                   </Card>
                   <Card className="p-5 flex flex-col gap-1" glow={isPerformanceMode ? '#34c759' : undefined}>
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Engine Status</span>
                      <span className={`text-base font-[1000] uppercase italic ${isPerformanceMode ? 'text-green-500' : 'text-blue-400'}`}>
                        {isPerformanceMode ? 'Turbo Mode' : 'Standard'}
                      </span>
                   </Card>
                </div>
                
                <Card className="p-5 mt-4 flex items-center justify-between border-red-500/20 bg-red-500/5">
                    <div>
                        <span className="text-[8px] font-black text-red-400 uppercase tracking-widest block mb-1">System Memory</span>
                        <span className="text-sm font-[1000] text-white uppercase tracking-wider">Cache Purge</span>
                    </div>
                    <button 
                        onClick={() => {
                            if(window.confirm('Are you sure you want to clear system cache? This will reset local data.')) {
                                localStorage.clear();
                                sessionStorage.clear();
                                window.location.reload();
                            }
                        }}
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/30"
                    >
                        Execute
                    </button>
                </Card>
              </Section>

              {/* Real-time Visitor Analytics Launcher Card (Admin Only) */}
              {isAdmin && (
                <Section delay={0.15}>
                  <SectionLabel icon={<TrendingUp size={14} />} label={t('visitorAnalytics') + " • ADMIN"} />
                  <Card 
                    className="p-6 cursor-pointer border-white/10 hover:border-white/20 hover:bg-white/[0.04] transition-all duration-300 group" 
                    glow={accentColor}
                  >
                    <div 
                      onClick={() => setShowAnalyticsPanel(true)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-300 group-hover:scale-105"
                          style={{ 
                            backgroundColor: `${accentColor}15`, 
                            borderColor: `${accentColor}30`,
                            color: accentColor 
                          }}
                        >
                          <TrendingUp size={22} className="animate-pulse" />
                        </div>
                        <div>
                          <h3 className="text-[11px] font-black text-white uppercase tracking-widest">
                            {t('visitorAnalytics')}
                          </h3>
                          <p className="text-[9px] text-gray-500 font-bold uppercase mt-1">
                            {t('openDashboard')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {analytics && analytics.live_users > 0 && (
                          <span className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-500 text-[8px] font-black uppercase px-2.5 py-1 rounded-full">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                            </span>
                            {analytics.live_users} Live
                          </span>
                        )}
                        <ChevronRight size={16} className="text-gray-500 group-hover:text-white transition-colors transform group-hover:translate-x-1 duration-300" />
                      </div>
                    </div>
                  </Card>
                </Section>
              )}

              {/* Theme Selection */}
              <Section delay={0.25}>
                <SectionLabel icon={<Moon size={14} />} label={t('theme')} />
                <div className="grid grid-cols-4 gap-3">
                   {APP_THEMES.map((th, i) => {
                     const active = theme === th.id;
                     return (
                       <button
                         key={th.id}
                         onClick={() => handleThemeChange(th.id)}
                         className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-300 ${
                           active ? 'bg-main-text/10' : 'bg-main-text/5 hover:bg-main-text/[0.08]'
                         }`}
                         style={{ borderColor: active ? accentColor : 'transparent' }}
                       >
                         <div 
                           className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-main-text/10"
                           style={{ backgroundColor: th.color }}
                         >
                           {th.icon}
                         </div>
                         <span className="text-[8px] font-black uppercase text-gray-400 group-hover:text-white transition-colors">
                           {th.name.split(' ')[0]}
                         </span>
                         {active && (
                           <motion.div layoutId="themeHighlight" className="absolute -inset-1 border-2 rounded-[2rem]" style={{ borderColor: accentColor }} />
                         )}
                       </button>
                     );
                   })}
                </div>
              </Section>

              {/* Performance / 60 FPS */}
              <Section delay={0.3}>
                <SectionLabel icon={<Zap size={14} />} label="Hardware Acceleration" />
                <Card className="p-6" glow={isPerformanceMode ? '#34c759' : undefined}>
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isPerformanceMode ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-gray-500'}`}>
                           <Zap size={22} fill={isPerformanceMode ? 'currentColor' : 'none'} />
                        </div>
                        <div>
                          <h3 className="text-[11px] font-black text-white uppercase tracking-widest">{(language === 'ku' || language === 'badini') ? 'مۆدی ٦٠ FPS' : '60 FPS Turbo Mode'}</h3>
                          <p className="text-[9px] text-gray-500 font-bold uppercase mt-1">Suppress Blurs & Effects</p>
                        </div>
                      </div>
                      <AnimatedToggle 
                        checked={isPerformanceMode} 
                        onChange={togglePerformance} 
                        color="#34c759"
                        language={language}
                      />
                   </div>
                   {isPerformanceMode && (
                     <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-3"
                     >
                        {['Blurs Disabled', 'Shadows Removed', 'Particles Limited', 'GPU Optimized'].map(feat => (
                          <div key={feat} className="flex items-center gap-2">
                             <div className="w-1 h-1 rounded-full bg-green-500" />
                             <span className="text-[8px] font-bold text-gray-500 uppercase">{feat}</span>
                          </div>
                        ))}
                     </motion.div>
                   )}
                </Card>
              </Section>

              {/* System Updates Section */}
              <Section delay={0.35}>
                <SectionLabel icon={<RefreshCw size={14} className={checkingUpdate ? 'animate-spin' : ''} />} label={t('systemUpdate')} />
                <Card className="p-6" glow={updateResult?.updateAvailable ? accentColor : undefined}>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div 
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                            updateResult?.updateAvailable 
                              ? 'animate-pulse' 
                              : 'bg-white/5 text-gray-500'
                          }`}
                          style={updateResult?.updateAvailable ? { color: accentColor, backgroundColor: `${accentColor}20` } : {}}
                        >
                          <RefreshCw size={22} className={checkingUpdate ? 'animate-spin' : ''} />
                        </div>
                        <div>
                          <h3 className="text-[11px] font-black text-white uppercase tracking-widest">
                            {t('systemUpdate')}
                          </h3>
                          <p className="text-[9px] text-gray-500 font-bold uppercase mt-1">
                            {checkingUpdate 
                              ? t('checkingUpdates') 
                              : updateResult 
                              ? (updateResult.updateAvailable ? t('updateAvailable') : t('upToDate'))
                              : ((language === 'ku' || language === 'badini') ? 'پشکنین بکە بۆ نوێترین وەشان' : 'Check for the latest version')}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleCheckForUpdates}
                        disabled={checkingUpdate}
                        className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black text-white uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                      >
                        {checkingUpdate && <RefreshCw size={10} className="animate-spin" />}
                        {t('checkUpdates')}
                      </button>
                    </div>

                    {/* Show results if checked */}
                    {updateResult && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="border-t border-white/5 pt-4 mt-2 space-y-4"
                      >
                        {updateResult.updateAvailable ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Version Status</span>
                                <div className="flex items-center gap-1.5 font-mono text-xs font-black">
                                  <span className="text-gray-400">{updateResult.currentVersion}</span>
                                  <span className="text-gray-600">→</span>
                                  <span style={{ color: accentColor }}>{updateResult.latestVersion}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Platform</span>
                                <span className="text-[9px] font-extrabold text-white uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-md">
                                  {updateResult.platform}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                {(language === 'ku' || language === 'badini') ? 'چی نوێیە لەم وەشانەدا:' : "What's new in this version:"}
                              </span>
                              <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl max-h-[120px] overflow-y-auto space-y-1.5 scrollbar-hide">
                                {updateResult.changelog.length > 0 ? (
                                  updateResult.changelog.map((log, index) => (
                                    <div key={index} className="flex items-start gap-2 text-[10px] text-gray-400 font-medium">
                                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: accentColor }} />
                                      <p className="leading-relaxed">{log}</p>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">
                                    {(language === 'ku' || language === 'badini') ? 'زانیاری نوێکاری بەردەست نییە' : 'No changelog provided.'}
                                  </p>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={handleExecuteUpdate}
                              className="w-full py-4 rounded-[1.8rem] text-[10px] font-[1000] text-white uppercase tracking-[0.3em] flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
                              style={{ backgroundColor: accentColor }}
                            >
                              <Download size={14} className="stroke-[2.5]" />
                              {t('updateNow')}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 p-4 rounded-2xl text-green-500">
                            <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                              <Check size={16} strokeWidth={3} />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-black uppercase tracking-wider">{t('upToDate')}</span>
                              <span className="text-[9px] font-bold text-green-500/70 uppercase">Version {updateResult.currentVersion} • Verified Secure</span>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {updateError && (
                      <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-500">
                        <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                          <Activity size={16} className="stroke-[2.5]" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-black uppercase tracking-wider">Update Failed</span>
                          <span className="text-[9px] font-bold text-red-500/70 uppercase">{updateError}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </Section>

              {/* Global Display Scaling */}
              <Section delay={0.4}>
                <SectionLabel icon={<Maximize2 size={14} />} label="Interface Intensity & Scale" />
                <Card className="p-6 bg-gradient-to-br from-white/[0.03] to-transparent border-white/10 shadow-2xl">
                   {/* Ergonomic Mobile Header */}
                   <div className="flex flex-col gap-6 mb-10">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-[1.8rem] bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shadow-[0_0_30px_rgba(229,9,20,0.15)]">
                               <Monitor size={26} strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col">
                               <span className="text-4xl font-[1000] text-white tracking-[calc(-0.06em)] italic font-mono leading-none">{scalePercent}%</span>
                               <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] mt-2">DENSITY_RATIO</span>
                            </div>
                         </div>
                         <button 
                            onClick={() => setScale(1)}
                            className="h-10 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black text-white uppercase tracking-[0.2em] transition-all active:scale-95"
                         >
                            Reset
                         </button>
                      </div>

                      {/* Large Precision Buttons for Mobile */}
                      <div className="grid grid-cols-2 gap-3">
                         <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setScale(Math.max(0.4, (scale || 1) - 0.05))}
                            className="flex items-center justify-center gap-3 py-5 rounded-[1.5rem] bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all font-black uppercase tracking-widest text-[10px]"
                         >
                            <Minimize2 size={18} /> COLDERING
                         </motion.button>
                         <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setScale(Math.min(1.5, (scale || 1) + 0.05))}
                            className="flex items-center justify-center gap-3 py-5 rounded-[1.5rem] bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all font-black uppercase tracking-widest text-[10px]"
                         >
                            <Maximize2 size={18} /> EXPANDING
                         </motion.button>
                      </div>
                   </div>

                   <div className="px-1">
                      <div className="relative h-12 flex items-center group">
                        {/* Background Track */}
                        <div className="absolute inset-0 bg-white/5 h-2 top-1/2 -translate-y-1/2 rounded-full overflow-hidden">
                           <motion.div 
                             initial={false}
                             animate={{ width: `${((scale - 0.4) / (1.5 - 0.4)) * 100}%` }}
                             className="h-full shadow-[0_0_20px_brand]"
                             style={{ backgroundColor: accentColor }}
                           />
                        </div>
                        {/* Interactive Slider */}
                        <input 
                          type="range"
                          min="40" max="150" step="1"
                          value={scalePercent}
                          onChange={(e) => setScale(Number(e.target.value) / 100)}
                          className="absolute w-full appearance-none bg-transparent cursor-pointer z-10 h-full"
                          style={{ 
                            WebkitAppearance: 'none',
                          }}
                        />
                      </div>
                      <style>{`
                        input[type=range]::-webkit-slider-thumb {
                          -webkit-appearance: none;
                          height: 32px;
                          width: 32px;
                          border-radius: 50%;
                          background: #fff;
                          cursor: pointer;
                          border: 6px solid ${accentColor};
                          box-shadow: 0 10px 30px rgba(0,0,0,0.8);
                          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                        }
                        input[type=range]::-webkit-slider-thumb:hover {
                          transform: scale(1.1);
                        }
                        input[type=range]::-webkit-slider-thumb:active {
                          transform: scale(1.2);
                          box-shadow: 0 0 50px ${accentColor}88;
                        }
                      `}</style>
                      <div className="flex justify-between mt-6 px-1">
                        <div className="flex flex-col items-start gap-1.5 opacity-40">
                           <span className="text-[9px] font-black text-main-text uppercase tracking-[0.2em]">Minimalist</span>
                           <div className="w-8 h-1 bg-main-text/10 rounded-full" />
                        </div>
                        <div className="flex flex-col items-end gap-1.5 opacity-40">
                           <span className="text-[9px] font-black text-main-text uppercase tracking-[0.2em]">Cinematic</span>
                           <div className="w-8 h-1 bg-main-text/10 rounded-full" />
                        </div>
                      </div>
                   </div>
                </Card>
              </Section>

              {/* FLKRD Native Ecosystem Downloads Section */}
              <Section delay={0.45}>
                <SectionLabel 
                  icon={
                    detectedPlatform === 'ios' ? <Apple size={14} /> :
                    detectedPlatform === 'android' ? <Smartphone size={14} /> :
                    detectedPlatform === 'macos' ? <Laptop size={14} /> :
                    detectedPlatform === 'windows' ? <Monitor size={14} /> :
                    <Download size={14} />
                  } 
                  label={(language === 'ku' || language === 'badini') ? 'پاکێجەکانی فڵکرد' : 'FLKRD Native Ecosystem'} 
                />
                <Card className="p-6">
                  <div className="flex flex-col gap-5">
                    {/* Platform Grid */}
                    <div className="grid grid-cols-1 gap-5">
                      {/* iOS WebClip Card */}
                      {((detectedPlatform === 'ios' && !showAllPlatforms) || detectedPlatform === 'web' || showAllPlatforms) && (
                        <div className="flex flex-col gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10" style={{ boxShadow: detectedPlatform === 'ios' ? `0 0 15px ${accentColor}33` : 'none' }}>
                                <Apple size={20} className="text-white" />
                              </div>
                              <div>
                                <h4 className="text-[10px] font-black text-white uppercase tracking-wider">FLKRD Movies .webclip</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded bg-white/10 text-white tracking-wide uppercase">v5.5.1.25</span>
                                  <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 tracking-wide uppercase">iOS 15 - 26+</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-[7.5px] font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">WebClip</span>
                          </div>
                          <p className="text-[9.5px] text-gray-400 font-medium leading-relaxed">
                            Installs a verified premium WebClip profile config. Unlocks full standalone experience, locked 60+ FPS playback speed, and persistent real-time notifications.
                          </p>
                          <a
                            href="/webclip.mobileconfig"
                            className="w-full py-3.5 rounded-xl text-[9px] font-black text-white uppercase tracking-widest text-center transition-all hover:scale-[1.02] active:scale-95 shadow-md flex items-center justify-center gap-2"
                            style={{ backgroundColor: accentColor }}
                          >
                            <Download size={12} strokeWidth={2.5} />
                            Install FLKRD Movies WebClip
                          </a>
                        </div>
                      )}

                      {/* Android APK Card */}
                      {((detectedPlatform === 'android' && !showAllPlatforms) || detectedPlatform === 'web' || showAllPlatforms) && (
                        <div className="flex flex-col gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all relative overflow-hidden">
                          {/* NEW Badge */}
                          <div className="absolute top-3 right-3 z-10">
                            <span className="text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest" style={{ backgroundColor: accentColor, color: '#fff', boxShadow: `0 0 12px ${accentColor}66` }}>NEW</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10" style={{ boxShadow: detectedPlatform === 'android' ? `0 0 15px ${accentColor}33` : 'none' }}>
                                <Smartphone size={20} className="text-white" />
                              </div>
                              <div>
                                <h4 className="text-[10px] font-black text-white uppercase tracking-wider">Android Universal Package</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded bg-white/10 text-white tracking-wide uppercase">v5.5.1.25</span>
                                  <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 tracking-wide uppercase">Universal APK</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-[7.5px] font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">Verified</span>
                          </div>
                          <p className="text-[9.5px] text-gray-400 font-medium leading-relaxed">
                            Universal Android build signed and production ready. Built-in high-performance rendering pipelines and native video player support.
                          </p>
                          <a
                            href={androidDownloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => handleDownloadClick(e, androidDownloadUrl)}
                            className="w-full py-3.5 rounded-xl text-[9px] font-black text-white uppercase tracking-widest text-center transition-all hover:scale-[1.02] active:scale-95 shadow-md flex items-center justify-center gap-2"
                            style={{ backgroundColor: accentColor }}
                          >
                            <Download size={12} strokeWidth={2.5} />
                            Download Android APK
                          </a>
                        </div>
                      )}

                      {/* macOS DMG Card */}
                      {((detectedPlatform === 'macos' && !showAllPlatforms) || detectedPlatform === 'web' || showAllPlatforms) && (
                        <div className="flex flex-col gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all relative overflow-hidden">
                          {/* NEW Badge */}
                          <div className="absolute top-3 right-3 z-10">
                            <span className="text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest" style={{ backgroundColor: accentColor, color: '#fff', boxShadow: `0 0 12px ${accentColor}66` }}>NEW</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10" style={{ boxShadow: detectedPlatform === 'macos' ? `0 0 15px ${accentColor}33` : 'none' }}>
                                <Laptop size={20} className="text-white" />
                              </div>
                              <div>
                                <h4 className="text-[10px] font-black text-white uppercase tracking-wider">macOS Native App</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded bg-white/10 text-white tracking-wide uppercase">v5.5.1.25</span>
                                  <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 tracking-wide uppercase">Apple Silicon & Intel</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-[7.5px] font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">DMG Bundle</span>
                          </div>
                          <p className="text-[9.5px] text-gray-400 font-medium leading-relaxed">
                            Native macOS package powered by Tauri. Premium hardware-accelerated video, glassmorphic UI, and native macOS window controls.
                          </p>
                          <a
                            href={macDownloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.preventDefault();
                              setIsMacTutorialOpen(true);
                              setMacTutorialStep(1);

                              // Programmatically trigger immediate download in the background
                              if (isTauri()) {
                                tauriService.openExternal(macDownloadUrl);
                              } else {
                                const link = document.createElement('a');
                                link.href = macDownloadUrl;
                                link.target = '_blank';
                                link.rel = 'noopener noreferrer';
                                link.click();
                              }

                              // Premium bilingual toast feedback to announce the background download action
                              addNotification({
                                type: 'success',
                                title: (language === 'ku' || language === 'badini') ? 'دابەزاندنی خۆکار دەستیپێکرد' : 'Automatic Download Started',
                                message: (language === 'ku' || language === 'badini')
                                  ? 'فایلی ئەپی مەک بە شێوەیەکی خۆکارانە لە باکگراونددا دەستی بە دابەزاندن کرد. ئێستا دەتوانیت بینەری ڕێنماییەکان بیت بۆ چۆنیەتی دامەزراندن و چارەسەرکردنی کێشە ئەمنییەکانی مەک.'
                                  : 'The macOS app DMG has started downloading automatically in the background. You can now read the instructions to install and bypass macOS gatekeeper warnings.'
                              });
                            }}
                            className="w-full py-3.5 rounded-xl text-[9px] font-black text-white uppercase tracking-widest text-center transition-all hover:scale-[1.02] active:scale-95 shadow-md flex items-center justify-center gap-2"
                            style={{ backgroundColor: accentColor }}
                          >
                            <Download size={12} strokeWidth={2.5} />
                            Download macOS DMG
                          </a>
                        </div>
                      )}

                      {/* Windows Coming Soon Card */}
                      {((detectedPlatform === 'windows' && !showAllPlatforms) || detectedPlatform === 'web' || showAllPlatforms) && (
                        <div className="flex flex-col gap-4 p-5 rounded-2xl bg-white/[0.01] border border-white/5 opacity-70 select-none">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                <Monitor size={20} className="text-white opacity-40" />
                              </div>
                              <div>
                                <h4 className="text-[10px] font-black text-white/50 uppercase tracking-wider">Windows Desktop</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded bg-white/10 text-white/30 tracking-wide uppercase">v5.5.1.25</span>
                                  <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500/70 tracking-wide uppercase">Coming Soon</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-[7.5px] font-bold text-gray-600 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">Teaser</span>
                          </div>
                          <p className="text-[9.5px] text-gray-500 font-medium leading-relaxed">
                            Windows native app package optimized with custom DirectX rendering support. Undergoing final performance benchmarking.
                          </p>
                          <button
                            disabled
                            className="w-full py-3.5 rounded-xl text-[9px] font-black text-white/30 bg-white/5 uppercase tracking-widest text-center cursor-not-allowed border border-white/5 flex items-center justify-center gap-2"
                          >
                            Coming Soon
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Escape Hatch Button */}
                    {detectedPlatform !== 'web' && (
                      <div className="flex justify-center border-t border-white/5 pt-4">
                        <button
                          onClick={() => setShowAllPlatforms(!showAllPlatforms)}
                          className="text-[9px] font-black uppercase text-gray-500 hover:text-white transition-all flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/5"
                        >
                          {showAllPlatforms 
                            ? ((language === 'ku' || language === 'badini') ? 'پیشاندانی تەنها وەشانی من' : 'Show only my platform') 
                            : ((language === 'ku' || language === 'badini') ? 'پیشاندانی هەموو وەشانەکان' : 'Looking for another device? Show all platforms')}
                          <ArrowUpRight size={10} className="stroke-[2.5]" />
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              </Section>

              {/* Accent Color */}
              <Section delay={0.5}>
                <SectionLabel icon={<Palette size={14} />} label="Neural Theme Core" />
                <div className="grid grid-cols-4 gap-3">
                   {APP_COLORS.map(c => {
                     const active = accentColor === c.value;
                     return (
                       <button
                         key={c.value}
                         onClick={() => handleColorChange(c.value)}
                         className={`group relative flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                           active ? 'bg-main-text/10 border-main-text/20' : 'bg-main-text/5 border-transparent hover:bg-main-text/10'
                         }`}
                       >
                         <div 
                           className="w-8 h-8 rounded-xl shadow-lg flex items-center justify-center"
                           style={{ backgroundColor: c.value, boxShadow: active ? `0 0 20px ${c.value}44` : 'none' }}
                         >
                            {active && <Check size={14} color={c.value === '#ffffff' ? '#000' : '#fff'} strokeWidth={4} />}
                         </div>
                         <span className="text-[8px] font-black uppercase text-gray-500 group-hover:text-gray-300 truncate w-full px-1">
                           {c.name.split(' ')[0]}
                         </span>
                       </button>
                     );
                   })}
                </div>
              </Section>

              {/* Resources & Legal Hub Section */}
              <Section delay={0.55}>
                <SectionLabel icon={<BookOpen size={14} />} label={language === 'ku' || language === 'badini' ? 'سەرچاوەکان و بەشە یاساییەکان' : 'Resources & Documentation'} />
                <Card className="p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <a 
                      href="/#/doc?tab=flow" 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Layers size={14} style={{ color: accentColor }} />
                        <span className="text-[9px] font-black uppercase text-white tracking-wider">
                          {language === 'ku' ? 'نەخشەی ڕێڕەو' : language === 'badini' ? 'نەخشێ ڕێڕەوی' : 'System Flow Map'}
                        </span>
                      </div>
                      <ArrowUpRight size={10} className="text-gray-500" />
                    </a>

                    <a 
                      href="/#/doc?tab=tutorials" 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <HelpCircle size={14} style={{ color: accentColor }} />
                        <span className="text-[9px] font-black uppercase text-white tracking-wider">
                          {language === 'ku' ? 'فێرکارییەکان' : language === 'badini' ? 'فێرکاریێن تەکنیکی' : 'System Tutorials'}
                        </span>
                      </div>
                      <ArrowUpRight size={10} className="text-gray-500" />
                    </a>

                    <a 
                      href="/#/doc?tab=terms" 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText size={14} style={{ color: accentColor }} />
                        <span className="text-[9px] font-black uppercase text-white tracking-wider">
                          {language === 'ku' ? 'مەرجەکان' : language === 'badini' ? 'مەرجێن بکارئینانێ' : 'Terms of Service'}
                        </span>
                      </div>
                      <ArrowUpRight size={10} className="text-gray-500" />
                    </a>

                    <a 
                      href="/#/doc?tab=license" 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck size={14} style={{ color: accentColor }} />
                        <span className="text-[9px] font-black uppercase text-white tracking-wider">
                          {language === 'ku' ? 'مۆڵەت و DMCA' : language === 'badini' ? 'مۆڵەت و DMCA' : 'Licenses & DMCA'}
                        </span>
                      </div>
                      <ArrowUpRight size={10} className="text-gray-500" />
                    </a>
                  </div>
                </Card>
              </Section>

            </div>

            {/* Footer */}
            <div className="p-8 bg-white/[0.02] border-t border-white/[0.08]">
              <LiquidButton
                variant="default"
                onClick={onClose}
                className="w-full py-5 rounded-[2rem] text-[10px] font-black text-white uppercase tracking-[0.4em] shadow-xl flex items-center justify-center gap-3"
                style={{ backgroundColor: accentColor }}
              >
                <Activity size={14} className="stroke-[3]" />
                Synchronize Changes
              </LiquidButton>
              <p className="text-[8px] text-center text-gray-600 font-extrabold uppercase tracking-[0.1em] mt-5">
                FLKRD Cinematic Engine © 2026 • Verified v5.5.1.25
              </p>
              <div className="flex items-center justify-center gap-3 mt-4 text-[7.5px] font-black uppercase tracking-[0.2em] text-gray-500">
                <a href="/#/doc?tab=terms" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Terms</a>
                <span>•</span>
                <a href="/#/doc?tab=privacy" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Privacy</a>
                <span>•</span>
                <a href="/#/doc?tab=license" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">DMCA</a>
                <span>•</span>
                <a href="/#/doc?tab=flow" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Ecosystem Map</a>
              </div>
            </div>

            </div> {/* End of sharp content container */}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    
    {/* macOS Installation Guide Tutorial Modal */}
    <AnimatePresence>
      {isMacTutorialOpen && (
        <Portal id="macos-tutorial-portal">
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop with premium glassmorphism blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMacTutorialOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-[16px] z-0"
              style={{ pointerEvents: 'auto' }}
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl bg-[#080808]/95 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden z-10 p-6 md:p-8 flex flex-col gap-5"
              style={{ pointerEvents: 'auto' }}
            >
              {/* Top premium breathing gradient glow bar */}
              <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: accentColor, boxShadow: `0 0 20px ${accentColor}` }} />

              {/* Title Header with Close */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Laptop className="text-white animate-pulse" size={20} />
                  </div>
                  <div>
                    <h3 className="text-[11px] md:text-xs font-black text-white uppercase tracking-wider">
                      {(language === 'ku' || language === 'badini') ? 'ڕێنمایی دامەزراندنی فەرمی مەکینتۆش' : 'macOS Safe Installation Guide'}
                    </h3>
                    <p className="text-[8px] text-gray-500 font-extrabold uppercase tracking-widest mt-0.5">
                      Bypass macOS Gatekeeper Warning Safely
                    </p>
                  </div>
                </div>
                
                {/* Step Indicators */}
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-3.5 py-1.5 rounded-full scale-90 md:scale-100">
                  {[1, 2, 3, 4].map(s => (
                    <div 
                      key={s} 
                      className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                      style={{ 
                        backgroundColor: macTutorialStep === s ? accentColor : 'rgba(255,255,255,0.15)',
                        boxShadow: macTutorialStep === s ? `0 0 8px ${accentColor}` : 'none',
                        transform: macTutorialStep === s ? 'scale(1.25)' : 'scale(1)'
                      }}
                    />
                  ))}
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider ml-1.5">
                    Step {macTutorialStep} of 4
                  </span>
                </div>
              </div>

              {/* Content rendering based on step */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={macTutorialStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-4"
                >
                  {macTutorialStep === 1 && (
                    <div className="flex flex-col gap-4">
                      {/* Screenshot 1 */}
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/60 flex items-center justify-center">
                        <img 
                          src={warningImage1} 
                          alt="macOS Gatekeeper Warning" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-2.5 text-right" dir="rtl">
                        <h4 className="text-[10px] md:text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                          کێشەی یەکەم: هۆشداری تێکچوونی فایل (Damaged App)
                        </h4>
                        <p className="text-[9.5px] text-gray-400 font-semibold leading-relaxed">
                          کاتێک فایلی ئەپەکە لە وێبگەڕەکەتەوە دادەبەزێنیت، سیستمی مەک خۆکارانە نیشانەیەکی ئەمنی دەخاتە سەر فایلەکە بە ناوی <strong className="text-white">Quarantine (کەرەنتینە)</strong>. لەبەر ئەوەی ئەپەکە مۆڵەتی فەرمی ساڵانەی ئەپڵی (٩٩ دۆلار) لەسەر نییە، مەکینتۆش پەیامێکی ترسناک نیشان دەدات کە دەڵێت ئەپەکە تێکچووە (Damaged). بەڵام لە ڕاستیدا ئەپەکە ١٠٠٪ سەلامەت و کارایە!
                        </p>
                      </div>
                    </div>
                  )}

                  {macTutorialStep === 2 && (
                    <div className="flex flex-col gap-4">
                      {/* Step 2 terminal execution helper */}
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
                        <h5 className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
                          چارەسەری خێرا لە ڕێگەی فەرمانی تێرمیناڵ (Terminal)
                        </h5>
                        <ol className="text-[9.5px] text-gray-400 font-semibold space-y-2 text-right" dir="rtl">
                          <li className="flex items-start gap-2 justify-start">
                            <span>1. سەرەتا ئەپەکە لە ناو DMGـەکە ڕابکێشە بۆ ناو فۆڵدەری <strong>Applications</strong> (بەرنامەکان) لەسەر مەکەکەت.</span>
                          </li>
                          <li className="flex items-start gap-2 justify-start">
                            <span>2. ئەپی <strong>Terminal</strong> لەسەر مەکەکەت بکەرەوە (لە Spotlight لێبدە Terminal).</span>
                          </li>
                          <li className="flex items-start gap-2 justify-start">
                            <span>3. ئەم فەرمانەی خوارەوە بە تەواوی کۆپی بکە و پاشان لەناو Terminal دایبنێ (Paste) و کلیلی Enter لێبدە:</span>
                          </li>
                        </ol>
                      </div>

                      {/* Copyable Terminal Command Widget */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[8px] font-black uppercase text-gray-500 tracking-wider">
                          Bypass Command (Terminal):
                        </span>
                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-2xl p-4 gap-3 relative group hover:border-white/10 transition-all">
                          <code className="text-[10px] font-mono text-gray-300 select-all tracking-tight break-all">
                            xattr -cr /Applications/flkrd-movies.app
                          </code>
                          <button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText('xattr -cr /Applications/flkrd-movies.app');
                                setCopiedCommand(true);
                                setTimeout(() => setCopiedCommand(false), 2000);
                                addNotification({
                                  type: 'success',
                                  title: 'Command Copied',
                                  message: 'Terminal bypass command successfully copied to clipboard.'
                                });
                              } catch (e) {
                                console.error('Clipboard copy failed:', e);
                              }
                            }}
                            className="flex-shrink-0 px-4 py-2 rounded-xl text-[9px] font-black text-white uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-md active:scale-95"
                            style={{ backgroundColor: copiedCommand ? '#34c759' : accentColor }}
                          >
                            {copiedCommand ? <Check size={10} className="stroke-[3]" /> : <Copy size={10} className="stroke-[3]" />}
                            {copiedCommand ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {macTutorialStep === 3 && (
                    <div className="flex flex-col gap-4">
                      {/* Screenshot 2 */}
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/60 flex items-center justify-center">
                        <img 
                          src={warningImage2} 
                          alt="macOS DMG Eject Warning" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-2.5 text-right" dir="rtl">
                        <h4 className="text-[10px] md:text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                          کێشەی دووەم: کێشەی نەتوانینی eject-کردنی دیسک (DMG)
                        </h4>
                        <p className="text-[9.5px] text-gray-400 font-semibold leading-relaxed">
                          ئەگەر لە کاتی بەستن یان سڕینەوەی فایلی دابەزێنراو پەیامی "could not be ejected" هات، بەو هۆیەوەیە کە ئەپی فیلمەکە لەناو باکگراونددا کراوەتەوە و ڕاستەوخۆ لە ناو دیسکەکەوە (DMG) کار دەکات. چارەسەرەکەی سادەیە: ئەپەکە بە تەواوی دابخە (کلیلەکانی <span className="text-white font-black">Cmd + Q</span> دابگرە لەناو ئەپەکە)، پاشان Eject بکە و فایلەکە بسڕەوە!
                        </p>
                      </div>
                    </div>
                  )}

                  {macTutorialStep === 4 && (
                    <div className="flex flex-col gap-4">
                      {/* Embedded Vimeo Player */}
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                        <iframe 
                          src="https://player.vimeo.com/video/1195564555?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479&amp;autoplay=1&amp;loop=1" 
                          frameBorder="0" 
                          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" 
                          referrerPolicy="strict-origin-when-cross-origin" 
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                          title="toturials for install fkurd movies on mac safe ly"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-2.5 text-right" dir="rtl">
                        <h4 className="text-[10px] md:text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                          بینینی فێرکاری تەواو بە ڤیدیۆی کوالیتی بەرز
                        </h4>
                        <p className="text-[9.5px] text-gray-400 font-semibold leading-relaxed">
                          دەتوانیت بینەری ئەم ڤیدیۆ فێرکارییە بیت بۆ بینینی هەنگاوەکان بە شێوازی پراکتیکی لەسەر شاشەی مەکینتۆش. دوای سەیرکردن، دەتوانیت لە خوارەوە ڕاستەوخۆ کرتە لەسەر دوگمەی دابەزاندن بکەیت بۆ بەدەستهێنانی نوێترین وەشانی ئەپەکە!
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                <button
                  onClick={() => {
                    if (macTutorialStep > 1) {
                      setMacTutorialStep(macTutorialStep - 1);
                    } else {
                      setIsMacTutorialOpen(false);
                    }
                  }}
                  className="px-6 py-3 rounded-xl text-[9px] font-black text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 uppercase tracking-widest transition-all active:scale-95"
                >
                  {macTutorialStep === 1 ? 'Cancel' : 'Back'}
                </button>
                
                {macTutorialStep < 4 ? (
                  <button
                    onClick={() => setMacTutorialStep(macTutorialStep + 1)}
                    className="px-8 py-3 rounded-xl text-[9px] font-black text-white uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-md"
                    style={{ backgroundColor: accentColor }}
                  >
                    Next Step
                  </button>
                ) : (
                  <a
                    href={macDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      setIsMacTutorialOpen(false);
                      handleDownloadClick(e, macDownloadUrl);
                    }}
                    className="px-8 py-3 rounded-xl text-[9px] font-black text-white uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg flex items-center justify-center gap-2"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Download size={12} strokeWidth={2.5} />
                    Download DMG
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        </Portal>
      )}
    </AnimatePresence>

    {/* Real-time Visitor Analytics Full Dashboard Modal Overlay */}
    <AnimatePresence>
      {showAnalyticsPanel && (
        <Portal id="visitor-analytics-portal">
          <div className={`fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto transition-all duration-300 ${isFullscreen ? 'p-0' : 'p-4 md:p-6'}`}>
            {/* Backdrop with premium glassmorphism blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAnalyticsPanel(false)}
              className="fixed inset-0 bg-black/85 backdrop-blur-[16px] z-0"
              style={{ pointerEvents: 'auto' }}
            />

            {/* Dashboard Container - Vercel Dark Liquid styling */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`relative shadow-[0_50px_100px_rgba(0,0,0,0.8)] z-10 flex flex-col overflow-hidden transition-all duration-300 ${
                isFullscreen 
                  ? 'w-screen h-screen max-w-full max-h-screen my-0 rounded-none' 
                  : 'w-full max-w-4xl my-8 max-h-[90vh]'
              }`}
              style={{ 
                pointerEvents: 'auto',
                borderRadius: isFullscreen ? '0px' : `${glassConfig.cornerRadius}px`
              }}
            >
              {/* Isolated Liquid-Glass background overlay */}
              <div 
                className="absolute inset-0 z-0 pointer-events-none transition-all duration-300 overflow-hidden"
                style={{
                  background: `radial-gradient(circle at 50% 0%, rgba(var(--brand-red-rgb), ${glassConfig.redOpacity}), transparent 80%), rgba(10, 10, 10, ${glassConfig.darkOpacity})`,
                  backdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
                  WebkitBackdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
                  borderRadius: `${glassConfig.cornerRadius}px`,
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: `rgba(var(--brand-red-rgb), ${glassConfig.borderOpacity})`,
                  boxShadow: `
                    inset 0 1px 0 0 rgba(255, 255, 255, ${0.12 + glassConfig.borderOpacity * 0.45}),
                    inset ${glassConfig.aberrationIntensity * 0.15}px 0 0.5px rgba(255, 0, 80, 0.08),
                    inset -${glassConfig.aberrationIntensity * 0.15}px 0 0.5px rgba(0, 200, 255, 0.08),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.4),
                    0 25px 50px -12px rgba(0, 0, 0, 0.5)
                  `
                }}
              >
                {/* Dynamic GPU-accelerated water sheen overlay */}
                <div 
                  className="absolute inset-[-100%] pointer-events-none mix-blend-overlay animate-[ios-glass-shine_25s_linear_infinite]"
                  style={{
                    background: `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, ${0.05 + (glassConfig.displacementScale / 120) * 0.15}) 0%, rgba(255, 255, 255, 0.01) 40%, transparent 70%)`,
                    opacity: (glassConfig.displacementScale / 120) * 0.9,
                    animationDuration: `${30 * (0.35 / Math.max(0.1, glassConfig.elasticity))}s`
                  }}
                />
              </div>

              {/* Glass Highlight Overlay */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/[0.03] to-transparent z-[1]" style={{ borderRadius: `${glassConfig.cornerRadius}px` }} />

              {/* Top premium breathing gradient glow bar */}
              <div className="absolute top-0 left-0 w-full h-1.5 z-20" style={{ backgroundColor: accentColor, boxShadow: `0 0 20px ${accentColor}` }} />

              {/* Sharp content container above background overlay */}
              <div className={`relative z-10 w-full h-full flex flex-col overflow-hidden ${isFullscreen ? 'max-h-screen' : 'max-h-[90vh]'}`}>
                {/* Header */}
              <div className="relative px-6 py-6 md:px-8 md:py-6 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg"
                    style={{ backgroundColor: `${accentColor}15` }}
                  >
                    <TrendingUp size={22} style={{ color: accentColor }} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-[1000] text-white uppercase italic tracking-tighter leading-none">
                      {t('visitorAnalytics') + " • ADMIN"}
                    </h3>
                    <p className="text-[8px] text-gray-500 font-extrabold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                      </span>
                      {analytics?.live_users || 0} {t('liveActiveUsers')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-90"
                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                  >
                    {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                  <button 
                    onClick={() => {
                      setLoadingAnalytics(true);
                      fetchAnalytics().finally(() => setLoadingAnalytics(false));
                    }}
                    disabled={loadingAnalytics}
                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all disabled:opacity-50 active:scale-90"
                  >
                    <RefreshCw size={14} className={loadingAnalytics ? 'animate-spin' : ''} />
                  </button>
                  <button 
                    onClick={() => setShowAnalyticsPanel(false)}
                    className="h-10 px-6 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black text-gray-400 hover:text-white uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95"
                  >
                    {t('backToSettings')}
                  </button>
                </div>
              </div>

              {/* Scrollable Dashboard Body */}
              <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-8 space-y-6 scrollbar-hide">
                {loadingAnalytics && !analytics ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="animate-spin text-gray-500" size={32} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Retrieving Vercel Engine Stats...</span>
                  </div>
                ) : analytics ? (
                  <div className="space-y-6">
                    {/* Main stats layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Score Gauge card */}
                      <Card className="lg:col-span-5 p-6 flex flex-col items-center border-white/5 bg-white/[0.01]">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest self-start mb-6">Real Experience Score</span>
                        
                        {/* Circular Score Gauge */}
                        <div className="relative w-36 h-36 flex items-center justify-center mb-6">
                          {(() => {
                            const radius = 50;
                            const strokeWidth = 10;
                            const circ = 2 * Math.PI * radius;
                            const offset = circ - (performanceScore / 100) * circ;
                            const color = performanceScore >= 90 ? '#34c759' : performanceScore >= 50 ? '#ff9500' : '#e50914';
                            
                            return (
                              <>
                                <svg className="w-full h-full transform -rotate-90">
                                  <circle
                                    cx="72" cy="72" r={radius}
                                    stroke="rgba(255,255,255,0.05)"
                                    strokeWidth={strokeWidth}
                                    fill="transparent"
                                  />
                                  <motion.circle
                                    cx="72" cy="72" r={radius}
                                    stroke={color}
                                    strokeWidth={strokeWidth}
                                    fill="transparent"
                                    strokeDasharray={circ}
                                    initial={{ strokeDashoffset: circ }}
                                    animate={{ strokeDashoffset: offset }}
                                    transition={{ type: "spring", stiffness: 60, damping: 15 }}
                                  />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <span className="text-4xl font-[1000] italic font-mono text-white leading-none">
                                    {performanceScore}
                                  </span>
                                  <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">
                                    RES
                                  </span>
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        <div className="text-center mb-6">
                          <span 
                            className="text-sm font-[1000] uppercase italic tracking-wider"
                            style={{ color: performanceScore >= 90 ? '#34c759' : performanceScore >= 50 ? '#ff9500' : '#e50914' }}
                          >
                            {performanceScore >= 90 ? 'Great' : performanceScore >= 50 ? 'Needs Improvement' : 'Poor'}
                          </span>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide leading-relaxed mt-2 px-4">
                            {language === 'ku' || language === 'badini'
                              ? `پێوانەی کارایی گشتی. ${performanceScore}٪ی سەردانەکان بەبێ هیچ دواکەوتنێک کاردەکەن.`
                              : `Measures site response. ${performanceScore}% of loads experienced high-speed rendering.`}
                          </p>
                        </div>

                        {/* Core Web Vitals Status Bars */}
                        <div className="w-full space-y-4 border-t border-white/5 pt-6">
                          {/* FCP */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[9px] font-bold">
                              <span className="text-gray-400">First Contentful Paint</span>
                              <span className="font-mono text-white">{fcp}s</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden flex">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.max(10, Math.min(100, (1.8 / fcp) * 100))}%` }} />
                            </div>
                          </div>

                          {/* LCP */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[9px] font-bold">
                              <span className="text-gray-400">Largest Contentful Paint</span>
                              <span className="font-mono text-white">{lcp}s</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.max(10, Math.min(100, (2.5 / lcp) * 100))}%` }} />
                            </div>
                          </div>

                          {/* INP */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[9px] font-bold">
                              <span className="text-gray-400">Interaction to Next Paint</span>
                              <span className="font-mono text-white">{inp}ms</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.max(10, Math.min(100, (200 / inp) * 100))}%` }} />
                            </div>
                          </div>

                          {/* CLS */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[9px] font-bold">
                              <span className="text-gray-400">Cumulative Layout Shift</span>
                              <span className="font-mono text-white">{cls}</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.max(10, Math.min(100, (0.1 / cls) * 100))}%` }} />
                            </div>
                          </div>
                        </div>
                      </Card>

                      {/* Right Column: Live Counters & Chart */}
                      <div className="lg:col-span-7 flex flex-col gap-6">
                        {/* Live counters */}
                        <div className="grid grid-cols-2 gap-4">
                          <Card className="p-5 flex flex-col gap-1 border-green-500/20 bg-green-500/[0.01]" glow="#22c55e">
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{t('liveActiveUsers')}</span>
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                              </span>
                            </div>
                            <span className="text-3xl font-[1000] text-green-500 font-mono italic tracking-tighter leading-none mt-1">
                              <AnimatedNumber value={analytics.live_users} />
                            </span>
                          </Card>

                          <Card className="p-5 flex flex-col gap-1 border-white/5 bg-white/[0.01]">
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{t('totalVisits')}</span>
                            <span className="text-3xl font-[1000] text-white font-mono italic tracking-tighter leading-none mt-1">
                              <AnimatedNumber value={analytics.total_visits} />
                            </span>
                          </Card>
                        </div>

                        {/* Chart */}
                        <Card className="p-6 flex-1 flex flex-col justify-between bg-white/[0.01] border-white/5">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                              <TrendingUp size={12} style={{ color: accentColor }} />
                              {selectedDateFilter ? (
                                <span className="flex items-center gap-1.5 text-green-400">
                                  <Calendar size={10} />
                                  {language === 'ku' || language === 'badini' ? `ڕۆژی ${selectedDateFilter}` : `Date: ${selectedDateFilter}`}
                                </span>
                              ) : (
                                t('last7DaysTraffic')
                              )}
                            </span>
                            {selectedDateFilter ? (
                              <button 
                                onClick={() => setSelectedDateFilter(null)}
                                className="text-[8px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20 active:scale-95 transition-all"
                              >
                                {language === 'ku' || language === 'badini' ? 'سڕینەوەی فلتەر' : 'Clear Filter'}
                              </button>
                            ) : (
                              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">
                                Live Trend line
                              </span>
                            )}
                          </div>

                          {/* Custom SVG Line Chart */}
                          <div className="w-full h-36 relative">
                            {(() => {
                              const daily = analytics.daily_traffic || [];
                              const maxCount = Math.max(...daily.map(d => d.count), 1);
                              const width = 500;
                              const height = 140;
                              const paddingLeft = 15;
                              const paddingRight = 15;
                              const paddingTop = 15;
                              const paddingBottom = 15;

                              const pts = daily.map((day, idx) => {
                                const x = paddingLeft + (idx / Math.max(1, daily.length - 1)) * (width - paddingLeft - paddingRight);
                                const y = height - paddingBottom - (day.count / maxCount) * (height - paddingTop - paddingBottom);
                                return { x, y, count: day.count, date: day.date };
                              });

                              // Calculate smooth Bezier Curve points
                              const pathD = pts.reduce((acc, p, idx, arr) => {
                                if (idx === 0) return `M ${p.x} ${p.y}`;
                                const prev = arr[idx - 1];
                                const cpX1 = prev.x + (p.x - prev.x) / 3;
                                const cpY1 = prev.y;
                                const cpX2 = prev.x + 2 * (p.x - prev.x) / 3;
                                const cpY2 = p.y;
                                return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
                              }, '');

                              const areaD = pts.length > 0 
                                ? `${pathD} L ${pts[pts.length - 1].x} ${height - paddingBottom} L ${pts[0].x} ${height - paddingBottom} Z`
                                : '';

                              return (
                                <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                                  <defs>
                                    <linearGradient id="overlay-chart-gradient" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor={accentColor} stopOpacity="0.25" />
                                      <stop offset="100%" stopColor={accentColor} stopOpacity="0.0" />
                                    </linearGradient>
                                    {/* High fidelity glow filter */}
                                    <filter id="chart-glow" x="-20%" y="-20%" width="140%" height="140%">
                                      <feGaussianBlur stdDeviation="3.5" result="blur" />
                                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>
                                  </defs>
                                  
                                  {/* Gridlines */}
                                  <line x1={0} y1={paddingTop} x2={width} y2={paddingTop} stroke="rgba(255,255,255,0.02)" strokeWidth="1" style={{ pointerEvents: 'none' }} />
                                  <line x1={0} y1={(height - paddingBottom + paddingTop) / 2} x2={width} y2={(height - paddingBottom + paddingTop) / 2} stroke="rgba(255,255,255,0.02)" strokeWidth="1" style={{ pointerEvents: 'none' }} />
                                  <line x1={0} y1={height - paddingBottom} x2={width} y2={height - paddingBottom} stroke="rgba(255,255,255,0.08)" strokeWidth="1" style={{ pointerEvents: 'none' }} />
                                  
                                  {pts.length > 0 && (
                                    <>
                                      {/* Area Fill */}
                                      <path d={areaD} fill="url(#overlay-chart-gradient)" style={{ pointerEvents: 'none' }} />
                                      {/* Outer Glow Path */}
                                      <path d={pathD} fill="none" stroke={accentColor} strokeWidth="5.5" opacity="0.3" filter="url(#chart-glow)" style={{ pointerEvents: 'none' }} />
                                      {/* Sharp Core Path */}
                                      <path d={pathD} fill="none" stroke={accentColor} strokeWidth="2.2" style={{ pointerEvents: 'none' }} />
                                    </>
                                  )}
                                  
                                  {/* Interactive Nodes containing Guidelines, visible dots, tooltips, and big hit areas */}
                                  {pts.map((p, idx) => {
                                    const isSelected = selectedDateFilter === p.date;
                                    return (
                                      <g 
                                        key={`interactive-node-${idx}`} 
                                        className="group/node cursor-pointer"
                                        onClick={() => setSelectedDateFilter(isSelected ? null : p.date)}
                                      >
                                        {/* Guideline line */}
                                        <line 
                                          x1={p.x} 
                                          y1={paddingTop} 
                                          x2={p.x} 
                                          y2={height - paddingBottom} 
                                          stroke={isSelected ? accentColor : "rgba(255,255,255,0.15)"} 
                                          strokeWidth="1.2" 
                                          strokeDasharray={isSelected ? "none" : "2 3"} 
                                          className={`transition-opacity duration-300 pointer-events-none ${isSelected ? 'opacity-70' : 'opacity-0 group-hover/node:opacity-30'}`} 
                                        />

                                        {/* Floating text count tooltip */}
                                        <g className={`transition-all duration-300 pointer-events-none ${isSelected ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1.5 group-hover/node:opacity-100 group-hover/node:translate-y-0'}`}>
                                          <rect 
                                            x={p.x - 22} 
                                            y={Math.max(2, p.y - 23)} 
                                            width="44" 
                                            height="13" 
                                            rx="6.5" 
                                            fill="#080808" 
                                            stroke={isSelected ? accentColor : "rgba(255,255,255,0.2)"} 
                                            strokeWidth="1" 
                                          />
                                          <text 
                                            x={p.x} 
                                            y={Math.max(11, p.y - 14)} 
                                            fill="#fff" 
                                            fontSize="8" 
                                            fontWeight="900" 
                                            textAnchor="middle" 
                                            fontFamily="monospace"
                                          >
                                            {p.count}
                                          </text>
                                        </g>

                                        {/* Pulsing ring for active selection */}
                                        {isSelected && (
                                          <circle cx={p.x} cy={p.y} r="8" fill="none" stroke={accentColor} strokeWidth="1" className="animate-ping pointer-events-none" />
                                        )}

                                        {/* Outer soft halo on hover */}
                                        <circle cx={p.x} cy={p.y} r="10" fill={accentColor} opacity="0" className="group-hover/node:opacity-15 transition-opacity pointer-events-none" />

                                        {/* Visible point circle */}
                                        <circle 
                                          cx={p.x} 
                                          cy={p.y} 
                                          r={isSelected ? "5.5" : "3.5"} 
                                          fill={isSelected ? accentColor : "#fff"} 
                                          stroke={isSelected ? "#fff" : accentColor} 
                                          strokeWidth="2" 
                                          className="transition-all duration-300 group-hover/node:scale-125 pointer-events-none" 
                                        />

                                        {/* Giant transparent touch hit target (18px radius / 36px diameter) */}
                                        <circle 
                                          cx={p.x} 
                                          cy={p.y} 
                                          r="18" 
                                          fill="transparent" 
                                          style={{ pointerEvents: 'all' }}
                                        />
                                      </g>
                                    );
                                  })}
                                </svg>
                              );
                            })()}
                          </div>

                          {/* Weekday labels */}
                          <div className="flex justify-between px-1 mt-2 text-[8px] font-black text-gray-500 font-mono">
                            {analytics.daily_traffic.map((day) => {
                              const isSelected = selectedDateFilter === day.date;
                              return (
                                <span 
                                  key={day.date}
                                  onClick={() => setSelectedDateFilter(isSelected ? null : day.date)}
                                  className={`cursor-pointer transition-all ${isSelected ? 'text-white font-extrabold scale-110' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                  {new Date(day.date).toLocaleDateString(language === 'ku' || language === 'badini' ? 'ku-IQ' : 'en-US', { weekday: 'short' })}
                                </span>
                              );
                            })}
                          </div>

                          {/* Click Details Panel - Shows detailed breakdown for the clicked trend point */}
                          {selectedDateFilter ? (() => {
                            const dayData = analytics.daily_traffic.find(d => d.date === selectedDateFilter);
                            const dayVisits = detailedVisits.filter(v => {
                              const dStr = new Date(v.created_at).toISOString().split('T')[0];
                              return dStr === selectedDateFilter;
                            });

                            const totalCount = dayData ? dayData.count : dayVisits.length;
                            
                            // Country Stats for selected day
                            const countryCounts: Record<string, number> = {};
                            dayVisits.forEach(v => {
                              const c = v.country || 'Unknown';
                              countryCounts[c] = (countryCounts[c] || 0) + 1;
                            });
                            const sortedCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]);
                            const topCountry = sortedCountries[0]?.[0] || (analytics.country_stats[0]?.country || 'N/A');

                            // Vitals Averages for selected day
                            const fcps = dayVisits.map(v => v.fcp).filter((val): val is number => val !== null);
                            const avgFcp = fcps.length > 0 
                              ? (fcps.reduce((a, b) => a + b, 0) / fcps.length).toFixed(2) + 's' 
                              : fcp.toFixed(2) + 's (Avg)';

                            // Unique paths visited
                            const pathsSet = new Set(dayVisits.map(v => v.page_path));
                            const uniquePages = pathsSet.size > 0 ? pathsSet.size : 'N/A';

                            const formattedDate = new Date(selectedDateFilter).toLocaleDateString(
                              language === 'ku' || language === 'badini' ? 'ku-IQ' : 'en-US',
                              { weekday: 'long', month: 'short', day: 'numeric' }
                            );

                            return (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-5 pt-5 border-t border-white/5"
                              >
                                <div className="text-[8.5px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                                  <span>{language === 'ku' || language === 'badini' ? `ئاماری ڕۆژی ${formattedDate}` : `Details for ${formattedDate}`}</span>
                                  <span className="text-[7.5px] text-green-400 font-bold uppercase">{language === 'ku' || language === 'badini' ? 'ئەکتیڤە' : 'Selected'}</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                                  <div className="bg-[#0b0b0b]/60 border border-white/5 rounded-2xl p-3 flex flex-col justify-between">
                                    <span className="text-[7px] text-gray-500 font-black uppercase tracking-widest">{language === 'ku' || language === 'badini' ? 'کۆی هاتووچۆ' : 'Total Traffic'}</span>
                                    <span className="text-base font-black text-white mt-1">{totalCount} <span className="text-[8px] font-bold text-gray-400">visits</span></span>
                                  </div>
                                  
                                  <div className="bg-[#0b0b0b]/60 border border-white/5 rounded-2xl p-3 flex flex-col justify-between">
                                    <span className="text-[7px] text-gray-500 font-black uppercase tracking-widest">{language === 'ku' || language === 'badini' ? 'وڵاتی سەرەکی' : 'Top Country'}</span>
                                    <span className="text-xs font-black text-white mt-1 truncate flex items-center gap-1.5">
                                      {topCountry !== 'N/A' && <span className="text-sm">{getFlagEmoji(topCountry)}</span>}
                                      {topCountry}
                                    </span>
                                  </div>

                                  <div className="bg-[#0b0b0b]/60 border border-white/5 rounded-2xl p-3 flex flex-col justify-between">
                                    <span className="text-[7px] text-gray-500 font-black uppercase tracking-widest">{language === 'ku' || language === 'badini' ? 'تێکڕای خێرایی' : 'Avg Speed (FCP)'}</span>
                                    <span className="text-xs font-mono font-bold text-green-400 mt-1">{avgFcp}</span>
                                  </div>

                                  <div className="bg-[#0b0b0b]/60 border border-white/5 rounded-2xl p-3 flex flex-col justify-between">
                                    <span className="text-[7px] text-gray-500 font-black uppercase tracking-widest">{language === 'ku' || language === 'badini' ? 'لاپەڕە جیاوازەکان' : 'Unique Pages'}</span>
                                    <span className="text-xs font-black text-white mt-1">{uniquePages} <span className="text-[8px] font-bold text-gray-400">URLs</span></span>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })() : (
                            <div className="mt-5 pt-4 border-t border-white/5 text-center text-gray-500 text-[8px] font-black uppercase tracking-wider">
                              {language === 'ku' || language === 'badini' 
                                ? 'سەرنج: کلیک لەسەر هەر خاڵێکی سەر هێڵەکە بکە بۆ بینینی وردەکاری و خێرایی ئەو ڕۆژە' 
                                : 'Tip: Click any data node in the trend line above to inspect speed and country logs for that date'}
                            </div>
                          )}
                        </Card>
                      </div>
                    </div>

                    {/* Top Countries & Devices */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Top Countries */}
                      <Card className="p-5 flex flex-col gap-4 bg-white/[0.01] border-white/5">
                        <span className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
                          <Globe size={12} style={{ color: accentColor }} />
                          {t('topCountries')}
                        </span>
                        <div className="space-y-3">
                          {analytics.country_stats.length > 0 ? (
                            analytics.country_stats.map((c) => {
                              const total = analytics.total_visits || 1;
                              const pct = Math.round((c.cnt / total) * 100);
                              return (
                                <div key={c.country} className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-300">
                                    <span className="flex items-center gap-1.5 truncate">
                                      <span>{getFlagEmoji(c.country)}</span>
                                      <span className="truncate max-w-[120px]">{c.country}</span>
                                    </span>
                                    <span className="font-mono text-[9px] opacity-60">{c.cnt} ({pct}%)</span>
                                  </div>
                                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pct}%` }}
                                      className="h-full rounded-full"
                                      style={{ backgroundColor: accentColor }}
                                    />
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">No geo logs</span>
                          )}
                        </div>
                      </Card>

                      {/* Device Breakdown */}
                      <Card className="p-5 flex flex-col gap-4 bg-white/[0.01] border-white/5">
                        <span className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
                          <Laptop size={12} style={{ color: accentColor }} />
                          {t('deviceShare')}
                        </span>
                        <div className="space-y-3">
                          {Object.keys(analytics.device_stats).length > 0 ? (
                            Object.entries(analytics.device_stats).map(([device, count]) => {
                              const total = analytics.total_visits || 1;
                              const pct = Math.round((count / total) * 100);
                              return (
                                <div key={device} className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-300">
                                    <span className="flex items-center gap-1.5 truncate">
                                      {device === 'Mobile' ? <Smartphone size={10} /> :
                                       device === 'Tablet' ? <Tablet size={10} /> :
                                       device === 'Tauri Desktop' ? <Laptop size={10} /> :
                                       <Laptop size={10} />}
                                      <span className="truncate max-w-[120px]">{device}</span>
                                    </span>
                                    <span className="font-mono text-[9px] opacity-60">{count} ({pct}%)</span>
                                  </div>
                                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pct}%` }}
                                      className="h-full rounded-full"
                                      style={{ backgroundColor: accentColor }}
                                    />
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">No device logs</span>
                          )}
                        </div>
                      </Card>
                    </div>

                    {/* Detailed Visitor Activity Logs */}
                    <Card className="p-5 flex flex-col gap-4 bg-white/[0.01] border-white/5">
                      {/* Card Header with search and toggle controls */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                        <div className="flex items-center gap-2.5">
                          <Layers size={14} style={{ color: accentColor }} />
                          <span className="text-[10px] font-black text-white uppercase tracking-wider">
                            {viewingSessionId ? (
                              <span className="flex items-center gap-1.5 text-green-400">
                                {language === 'ku' || language === 'badini' 
                                  ? `ڕێڕەوی سەردان: ${viewingSessionId.substring(0, 8)}...` 
                                  : `Session Journey: ${viewingSessionId.substring(0, 8)}...`}
                              </span>
                            ) : selectedDateFilter ? (
                              <span className="text-gray-300">
                                {language === 'ku' || language === 'badini' 
                                  ? `سەردانەکانی ڕۆژی ${selectedDateFilter}` 
                                  : `Visits for ${selectedDateFilter}`}
                              </span>
                            ) : (
                              language === 'ku' || language === 'badini' 
                                ? 'وردەکاری سەردانەکان' 
                                : 'Real-time Detailed Visit Logs'
                            )}
                          </span>
                        </div>

                        {/* Controls: Search, Session Reset */}
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          {viewingSessionId && (
                            <button
                              onClick={() => setViewingSessionId(null)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black text-gray-400 hover:text-white transition-all active:scale-95"
                            >
                              <ArrowLeft size={10} />
                              {language === 'ku' || language === 'badini' ? 'هەموو سەردانەکان' : 'Show All Visits'}
                            </button>
                          )}
                          
                          {!viewingSessionId && (
                            <div className="relative min-w-[200px]">
                              <input
                                type="text"
                                placeholder={language === 'ku' || language === 'badini' ? 'بگەڕێ بۆ لاپەڕە، وڵات، ڕێڕەو...' : 'Search path, country, referrer...'}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-full py-1.5 pl-8 pr-4 text-[10px] text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-all font-semibold"
                              />
                              <Search size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                              {searchQuery && (
                                <button 
                                  onClick={() => setSearchQuery('')}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-gray-500 hover:text-white"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Log List Rendering */}
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
                        {(() => {
                          // Filter the detailedVisits array
                          let filtered = detailedVisits;

                          // 1. Date filter
                          if (selectedDateFilter) {
                            filtered = filtered.filter(visit => {
                              const dateStr = new Date(visit.created_at).toISOString().split('T')[0];
                              return dateStr === selectedDateFilter;
                            });
                          }

                          // 2. Session ID filter
                          if (viewingSessionId) {
                            filtered = filtered.filter(visit => visit.session_id === viewingSessionId);
                            // Sort chronologically for timeline journey
                            filtered = [...filtered].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                          }

                          // 3. Search query filter
                          if (searchQuery && !viewingSessionId) {
                            const q = searchQuery.toLowerCase();
                            filtered = filtered.filter(visit => 
                              (visit.page_path || '').toLowerCase().includes(q) ||
                              (visit.country || '').toLowerCase().includes(q) ||
                              (visit.referrer || '').toLowerCase().includes(q) ||
                              (visit.device_type || '').toLowerCase().includes(q) ||
                              (visit.user_agent || '').toLowerCase().includes(q)
                            );
                          }

                          if (filtered.length === 0) {
                            return (
                              <div className="text-center py-12 text-gray-500 text-[10px] uppercase tracking-widest font-black flex flex-col items-center gap-2">
                                <span>No visits matching criteria</span>
                                <button 
                                  onClick={() => {
                                    setSelectedDateFilter(null);
                                    setSearchQuery('');
                                    setViewingSessionId(null);
                                  }}
                                  className="text-[9px] text-green-500 hover:underline mt-1 font-bold lowercase tracking-normal"
                                >
                                  Reset all filters
                                </button>
                              </div>
                            );
                          }

                          // Timeline Flow for Session Journey
                          if (viewingSessionId) {
                            return (
                              <div className="relative border-l border-white/5 ml-4 pl-6 py-2 space-y-6">
                                {filtered.map((visit, idx) => {
                                  const isFirst = idx === 0;
                                  const isLast = idx === filtered.length - 1;
                                  
                                  return (
                                    <div key={visit.id} className="relative group">
                                      {/* Circle Node on Timeline */}
                                      <div 
                                        className="absolute -left-[31px] top-1.5 w-[11px] h-[11px] rounded-full border-2 border-[#121212] transition-all group-hover:scale-125 z-10"
                                        style={{ 
                                          backgroundColor: isLast ? '#34c759' : isFirst ? accentColor : '#888',
                                          boxShadow: isLast ? '0 0 8px rgba(52,199,89,0.5)' : ''
                                        }}
                                      />

                                      <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between gap-4">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-400 font-mono">Step {idx + 1}</span>
                                            <span className="text-[11px] font-mono font-bold text-white hover:text-green-400 transition-colors" dir="ltr">
                                              {visit.page_path}
                                            </span>
                                          </div>
                                          <span className="text-[9px] font-mono text-gray-500">
                                            {new Date(visit.created_at).toLocaleTimeString(language === 'ku' || language === 'badini' ? 'ku-IQ' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                          </span>
                                        </div>

                                        {/* Performance metrics indicators in timeline step */}
                                        <div className="flex items-center gap-3 text-[8px] font-mono text-gray-400 font-bold uppercase tracking-wider">
                                          {visit.referrer && visit.referrer !== 'Direct' && (
                                            <span>via: <strong className="text-gray-300 font-bold uppercase">{visit.referrer}</strong></span>
                                          )}
                                          {visit.fcp && <span>FCP: <strong className={visit.fcp < 1.8 ? 'text-green-500' : visit.fcp < 3.0 ? 'text-orange-500' : 'text-red-500'}>{visit.fcp}s</strong></span>}
                                          {visit.lcp && <span>LCP: <strong className={visit.lcp < 2.5 ? 'text-green-500' : visit.lcp < 4.0 ? 'text-orange-500' : 'text-red-500'}>{visit.lcp}s</strong></span>}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          }

                          // Default list items
                          return filtered.map((visit) => {
                            const isExpanded = expandedVisitId === visit.id;
                            const { browser, os } = parseUserAgent(visit.user_agent);

                            // Get rating colors helper
                            const getVitalsColor = (val: number | null, type: 'fcp' | 'lcp' | 'inp' | 'cls') => {
                              if (val === null) return { text: 'text-gray-500', border: 'border-white/5', bg: 'bg-white/[0.01]' };
                              let good = true;
                              let warning = false;

                              if (type === 'fcp') {
                                good = val <= 1.8;
                                warning = val > 1.8 && val <= 3.0;
                              } else if (type === 'lcp') {
                                good = val <= 2.5;
                                warning = val > 2.5 && val <= 4.0;
                              } else if (type === 'inp') {
                                good = val <= 200;
                                warning = val > 200 && val <= 500;
                              } else if (type === 'cls') {
                                good = val <= 0.1;
                                warning = val > 0.1 && val <= 0.25;
                              }

                              if (good) return { text: 'text-green-500', border: 'border-green-500/20', bg: 'bg-green-500/5' };
                              if (warning) return { text: 'text-amber-500', border: 'border-amber-500/20', bg: 'bg-amber-500/5' };
                              return { text: 'text-red-500', border: 'border-red-500/20', bg: 'bg-red-500/5' };
                            };

                            const fcpStyle = getVitalsColor(visit.fcp, 'fcp');
                            const lcpStyle = getVitalsColor(visit.lcp, 'lcp');
                            const inpStyle = getVitalsColor(visit.inp, 'inp');
                            const clsStyle = getVitalsColor(visit.cls, 'cls');

                            return (
                              <div 
                                key={visit.id} 
                                className={`flex flex-col p-4 rounded-2xl bg-[#0b0b0b]/60 border transition-all cursor-pointer ${isExpanded ? 'border-white/20 shadow-lg' : 'border-white/5 hover:border-white/10'}`}
                                onClick={() => setExpandedVisitId(isExpanded ? null : visit.id)}
                              >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-sm flex-shrink-0" title={visit.country}>{getFlagEmoji(visit.country)}</span>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-[10px] font-mono text-gray-300 truncate max-w-[280px]" dir="ltr">
                                        {visit.page_path}
                                      </span>
                                      <span className="text-[7.5px] text-gray-500 font-black uppercase tracking-widest mt-0.5" dir="ltr">
                                        Referrer: {visit.referrer || 'Direct'} • {visit.device_type} • {browser} ({os})
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 flex-shrink-0 justify-between md:justify-end">
                                    {/* Inline Vitals Indicators */}
                                    <div className="flex items-center gap-1.5">
                                      {visit.fcp && (
                                        <span className={`text-[7px] font-mono px-1.5 py-0.5 rounded border ${fcpStyle.text} ${fcpStyle.border} ${fcpStyle.bg}`}>
                                          FCP: {visit.fcp}s
                                        </span>
                                      )}
                                      {visit.lcp && (
                                        <span className={`text-[7px] font-mono px-1.5 py-0.5 rounded border ${lcpStyle.text} ${lcpStyle.border} ${lcpStyle.bg}`}>
                                          LCP: {visit.lcp}s
                                        </span>
                                      )}
                                    </div>

                                    <span className="text-[9px] font-mono font-bold text-gray-400 font-bold">
                                      {getRelativeTime(visit.created_at, language)}
                                    </span>
                                  </div>
                                </div>

                                {/* Expandable Details Frame */}
                                {isExpanded && (
                                  <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-4 text-left"
                                    dir="ltr"
                                    onClick={(e) => e.stopPropagation()} // Prevent collapse on click inside
                                  >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      {/* Visitor Meta details */}
                                      <div className="bg-black/30 border border-white/5 rounded-xl p-3 space-y-1.5">
                                        <h4 className="text-[8px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-1">Visitor Info</h4>
                                        <div className="text-[9px] font-semibold text-gray-400 space-y-1">
                                          <p>OS / Browser: <span className="text-white font-bold">{os} / {browser}</span></p>
                                          <p>User Agent: <span className="text-gray-300 font-mono break-all text-[8px]">{visit.user_agent}</span></p>
                                          <p className="flex items-center gap-1.5">
                                            Session ID: 
                                            <span className="text-gray-300 font-mono select-all bg-white/5 px-1.5 py-0.5 rounded">{visit.session_id}</span>
                                          </p>
                                          <p>Exact Time: <span className="text-white">{new Date(visit.created_at).toLocaleString()}</span></p>
                                        </div>
                                      </div>

                                      {/* Vitals breakdown */}
                                      <div className="bg-black/30 border border-white/5 rounded-xl p-3 space-y-1.5">
                                        <h4 className="text-[8px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-1">Vitals Metrics</h4>
                                        <div className="grid grid-cols-2 gap-2 text-center">
                                          <div className={`p-2 rounded border ${fcpStyle.bg} ${fcpStyle.border}`}>
                                            <span className="text-[8px] text-gray-400 block font-bold">FCP</span>
                                            <span className={`text-[10px] font-mono font-bold ${fcpStyle.text}`}>{visit.fcp ? `${visit.fcp}s` : 'N/A'}</span>
                                          </div>
                                          <div className={`p-2 rounded border ${lcpStyle.bg} ${lcpStyle.border}`}>
                                            <span className="text-[8px] text-gray-400 block font-bold">LCP</span>
                                            <span className={`text-[10px] font-mono font-bold ${lcpStyle.text}`}>{visit.lcp ? `${visit.lcp}s` : 'N/A'}</span>
                                          </div>
                                          <div className={`p-2 rounded border ${inpStyle.bg} ${inpStyle.border}`}>
                                            <span className="text-[8px] text-gray-400 block font-bold">INP</span>
                                            <span className={`text-[10px] font-mono font-bold ${inpStyle.text}`}>{visit.inp ? `${visit.inp}ms` : 'N/A'}</span>
                                          </div>
                                          <div className={`p-2 rounded border ${clsStyle.bg} ${clsStyle.border}`}>
                                            <span className="text-[8px] text-gray-400 block font-bold">CLS</span>
                                            <span className={`text-[10px] font-mono font-bold ${clsStyle.text}`}>{visit.cls !== null ? visit.cls : 'N/A'}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Actions Bar */}
                                    <div className="flex justify-end gap-2 border-t border-white/5 pt-3 mt-1">
                                      <button
                                        onClick={() => setViewingSessionId(visit.session_id)}
                                        className="px-3.5 py-1.5 rounded-full bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-[8px] font-black text-green-500 uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5"
                                      >
                                        <Layers size={10} />
                                        {language === 'ku' || language === 'badini' ? 'بینینی گەشتی سەردانکەر' : 'Show Session Journey'}
                                      </button>
                                      <button
                                        onClick={async () => {
                                          try {
                                            await navigator.clipboard.writeText(visit.session_id);
                                            addNotification({
                                              type: 'success',
                                              title: 'Session ID Copied',
                                              message: 'The session identifier has been copied to clipboard.'
                                            });
                                          } catch(e) {}
                                        }}
                                        className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[8px] font-black text-gray-400 hover:text-white uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5"
                                      >
                                        <Copy size={10} />
                                        Copy ID
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </Card>
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Failed to aggregate statistics</span>
                  </div>
                )}
              </div>
              </div>
            </motion.div>
          </div>
        </Portal>
      )}
    </AnimatePresence>

    <EnableNotificationsModal 
      isOpen={isEnableNotificationsModalOpen} 
      onClose={() => setIsEnableNotificationsModalOpen(false)} 
    />
    </div>
    </Portal>
  );
};

export default SettingsModal;