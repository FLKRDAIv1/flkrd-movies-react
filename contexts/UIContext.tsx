import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { supabase } from '../utils/supabaseClient';
import { translateAndSavePipeline } from '../services/subtitleTranslationService';
import { initSecurityShield, verifyServerSession } from '../utils/securityGuard';

type Theme = 'light' | 'dark' | 'premium-gradient-1' | 'premium-gradient-2' | 'premium-particles-galaxy' | 'premium-particles-moon' | 'premium-particles-stardust';

export interface GlassConfig {
  blurAmount: number;
  saturation: number;
  redOpacity: number;
  darkOpacity: number;
  borderOpacity: number;
  displacementScale: number;
  aberrationIntensity: number;
  elasticity: number;
  cornerRadius: number;
  // Extended fields (optional, backward-compatible)
  glowIntensity?: number;      // 0–1: outer red glow strength
  shineBrightness?: number;    // 0–0.6: inner top-edge highlight brightness
  enableJelly?: boolean;       // toggle jelly bounce animation
}

export interface MobileNavConfig {
  bgType: number;           // 0 = liquid glass, 1 = pure glass, 2 = solid black, 3 = deep burgundy
  blurAmount: number;       // e.g. 24
  darkOpacity: number;      // 0-100, e.g. 92
  redOpacity: number;       // 0-100, e.g. 30
  borderOpacity: number;    // 0-100, e.g. 20
  pillType: number;         // 0 = solid red gradient, 1 = red border only, 2 = neon white
  height: number;           // e.g. 48
  iconSize: number;         // e.g. 16
  capsuleWidth: number;     // e.g. 94
  showSparkles: number;     // 0 or 1
  showHome: number;
  showTrending: number;
  showTv: number;
  showDubbed: number;
  showStudios: number;
  showDiscover: number;
  showList: number;
  showSearch: number;
  colorR: number;
  colorG: number;
  colorB: number;
  itemsGap: number;
  bottomOffset: number;
  borderRadius: number;
}

export interface PlayerConfig {
  controlsAlign: number; // 0 = Top, 1 = Bottom
  controlsOffset: number; // offset in pixels
}

export interface ActiveTranslationState {
  isTranslating: boolean;
  isPaused?: boolean;
  progress: number;
  statusText: string;
  translatingName: string;
  sub: any;
  tmdbId: string | number;
  mediaType: string;
  season: number;
  episode: number;
  showCelebration: boolean;
  error?: string;
  subtitleUrl?: string;
}

interface UIContextType {
  theme: Theme;
  accentColor: string;
  scale: number;
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: string) => void;
  setScale: (scale: number) => void;
  isPerformanceMode: boolean;
  setIsPerformanceMode: (isPerformanceMode: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (isOpen: boolean) => void;
  isAdminModalOpen: boolean;
  setIsAdminModalOpen: (isOpen: boolean) => void;
  toggleTheme: () => void;
  isConsoleMode: boolean;
  setIsConsoleMode: (isConsoleMode: boolean) => void;
  isControllerDetected: boolean;
  setIsControllerDetected: (isDetected: boolean) => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  glassConfig: GlassConfig;
  updateGlassConfig: (config: GlassConfig) => Promise<boolean>;
  mobileNavConfig: MobileNavConfig;
  updateMobileNavConfig: (config: MobileNavConfig) => Promise<boolean>;
  translatedMovieIds: Set<string>;
  refreshTranslatedMovieIds: () => Promise<void>;
  
  // Background Subtitle Translation System
  activeTranslation: ActiveTranslationState;
  startGlobalTranslation: (sub: any, tmdbId: string | number, mediaType: string, season?: number, episode?: number, targetLang?: string) => Promise<void>;
  pauseGlobalTranslation: () => void;
  resumeGlobalTranslation: () => void;
  cancelGlobalTranslation: () => void;
  dismissCelebration: () => void;

  playerConfig: PlayerConfig;
  updatePlayerConfig: (config: PlayerConfig) => Promise<boolean>;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  hasPermission: (permKey: string) => boolean;
  currentAdminEmail: string;
  loginAsAdmin: (email: string, pass: string) => Promise<{ success: boolean; admin?: any; message?: string }>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('flkrd_theme') as Theme;
    // Always default to dark mode for cinematic streaming experience.
    // If legacy auto-detected 'light' is stored, override to 'dark' unless user explicitly set it.
    if (saved && saved !== 'light') return saved;
    return 'dark';
  });
  const [accentColor, setAccentColorState] = useState(() =>
    localStorage.getItem('flkrd_accent_color') || '#e50914'
  );
  const [scale, setScaleState] = useState(() =>
    Number(localStorage.getItem('flkrd_scale')) || 1
  );
  const [isPerformanceMode, setIsPerformanceModeState] = useState<boolean>(() => {
    // Only use explicitly saved user preference — never auto-enable
    try {
      const saved = localStorage.getItem('flkrd_performance_turbo');
      if (saved !== null) return saved === 'true';
    } catch (e) {}
    // Default OFF — user must opt-in from Settings
    return false;
  });
  const [viewMode, setViewModeState] = useState<'grid' | 'list'>(() => {
    try {
      const saved = localStorage.getItem('flkrd_view_mode');
      if (saved === 'grid' || saved === 'list') {
        return saved;
      }
    } catch (e) {}

    // Default design is GRID for everyone across all devices
    return 'grid';
  });

  const setViewMode = useCallback((mode: 'grid' | 'list') => {
    setViewModeState(mode);
    try {
      localStorage.setItem('flkrd_view_mode', mode);
    } catch (e) {}
  }, []);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [glassConfig, setGlassConfig] = useState<GlassConfig>(() => {
    try {
      const saved = localStorage.getItem('flkrd_glass_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          parsed.elasticity = parsed.elasticity ?? 0.35;
          return parsed;
        }
      }
    } catch (e) {}
    return {
      blurAmount: 20,
      saturation: 130,
      redOpacity: 0.18,
      darkOpacity: 0.65,
      borderOpacity: 0.20,
      displacementScale: 30,
      aberrationIntensity: 2,
      elasticity: 0.35,
      cornerRadius: 28,
    };
  });

  const defaultMobileNavConfig: MobileNavConfig = {
    bgType: 0,
    blurAmount: 24,
    darkOpacity: 92,
    redOpacity: 30,
    borderOpacity: 20,
    pillType: 0,
    height: 48,
    iconSize: 16,
    capsuleWidth: 94,
    showSparkles: 1,
    showHome: 1,
    showTrending: 1,
    showTv: 1,
    showDubbed: 1,
    showStudios: 1,
    showDiscover: 1,
    showList: 1,
    showSearch: 1,
    colorR: 220,
    colorG: 38,
    colorB: 38,
    itemsGap: 4,
    bottomOffset: 20,
    borderRadius: 9999,
  };

  const [mobileNavConfig, setMobileNavConfig] = useState<MobileNavConfig>(() => {
    try {
      const saved = localStorage.getItem('flkrd_mobilenav_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return defaultMobileNavConfig;
  });

  useEffect(() => {
    try {
      localStorage.setItem('flkrd_mobilenav_config', JSON.stringify(mobileNavConfig));
    } catch (e) {}
  }, [mobileNavConfig]);

  const defaultPlayerConfig: PlayerConfig = {
    controlsAlign: 0,
    controlsOffset: 16,
  };

  const [playerConfig, setPlayerConfig] = useState<PlayerConfig>(() => {
    try {
      const saved = localStorage.getItem('flkrd_player_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          parsed.controlsAlign = parsed.controlsAlign ?? 0;
          parsed.controlsOffset = parsed.controlsOffset ?? 16;
          return parsed;
        }
      }
    } catch (e) {}
    return defaultPlayerConfig;
  });

  useEffect(() => {
    try {
      localStorage.setItem('flkrd_player_config', JSON.stringify(playerConfig));
    } catch (e) {}
  }, [playerConfig]);

  useEffect(() => {
    try {
      localStorage.setItem('flkrd_glass_config', JSON.stringify(glassConfig));
    } catch (e) {}
  }, [glassConfig]);

  // 1. Initialize Security Shield (Production DevTools Hook Neutralizer & Console Protection)
  useEffect(() => {
    initSecurityShield();
  }, []);

  // 2. Cryptographically protected Admin state
  const [isAdmin, setIsAdminState] = useState(() => {
    const isAdminStored = localStorage.getItem('isFlkrdAdmin') === 'true';
    const token = localStorage.getItem('flkrd_admin_session_token');
    
    // Strict requirement: Admin privileges CANNOT exist without a signed server token
    if (!isAdminStored || !token) return false;
    
    const loginAt = localStorage.getItem('flkrd_admin_login_at');
    if (!loginAt) return false;
    
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const isExpired = Date.now() - parseInt(loginAt) > oneDayInMs;
    
    if (isExpired) {
        localStorage.removeItem('isFlkrdAdmin');
        localStorage.removeItem('flkrd_admin_session_token');
        localStorage.removeItem('flkrd_admin_login_at');
        return false;
    }
    return true;
  });

  // 3. Cryptographic Server-Side Heartbeat Validation (Prevents DevTools LocalStorage Tampering)
  useEffect(() => {
    const validateAdminSession = async () => {
      const token = localStorage.getItem('flkrd_admin_session_token');
      if (isAdmin && token) {
        const isValid = await verifyServerSession(token);
        if (!isValid) {
          console.warn('[SECURITY] Admin session token verification failed. Revoking admin privileges...');
          setIsAdminState(false);
          localStorage.removeItem('isFlkrdAdmin');
          localStorage.removeItem('flkrd_admin_session_token');
          localStorage.removeItem('flkrd_admin_login_at');
          localStorage.removeItem('flkrd_admin_email');
        }
      } else if (isAdmin && !token) {
        // Tampered localStorage detected!
        console.warn('[SECURITY] Unsigned admin state detected in storage. Purging forged credentials...');
        setIsAdminState(false);
        localStorage.removeItem('isFlkrdAdmin');
        localStorage.removeItem('flkrd_admin_login_at');
        localStorage.removeItem('flkrd_admin_email');
      }
    };

    validateAdminSession();
    const interval = setInterval(validateAdminSession, 5 * 60 * 1000); // Heartbeat check every 5 minutes
    return () => clearInterval(interval);
  }, [isAdmin]);

  useEffect(() => {
    const syncServerPriorities = async () => {
      try {
        const { data, error } = await supabase
          .from('server_config')
          .select('id, server_name, priority');
        if (error) throw error;
        if (data && data.length > 0) {
          // Sync server priorities
          const scores: { [key: string]: number } = {};
          data.forEach(row => {
            scores[row.server_name] = row.priority;
          });
          localStorage.setItem('playerSourceScores', JSON.stringify(scores));
          window.dispatchEvent(new Event('player-source-scores-updated'));

           // Sync glass customizer configurations
          const newConfig: Partial<GlassConfig> = {};
          const newMobileNav: Partial<MobileNavConfig> = {};
          const newPlayerConfig: Partial<PlayerConfig> = {};
          data.forEach(row => {
            if (row.server_name === 'glass_blur_amount') newConfig.blurAmount = row.priority;
            if (row.server_name === 'glass_saturation') newConfig.saturation = row.priority;
            if (row.server_name === 'glass_red_opacity') newConfig.redOpacity = row.priority / 100;
            if (row.server_name === 'glass_dark_opacity') newConfig.darkOpacity = row.priority / 100;
            if (row.server_name === 'glass_border_opacity') newConfig.borderOpacity = row.priority / 100;
            if (row.server_name === 'glass_displacement_scale') newConfig.displacementScale = row.priority;
            if (row.server_name === 'glass_aberration_intensity') newConfig.aberrationIntensity = row.priority;
            if (row.server_name === 'glass_elasticity') newConfig.elasticity = (row.priority / 100) || 0.35;
            if (row.server_name === 'glass_corner_radius') newConfig.cornerRadius = row.priority;

            // Mobile Nav Customizer config keys
            if (row.server_name === 'mobilenav_bg_type') newMobileNav.bgType = row.priority;
            if (row.server_name === 'mobilenav_blur_amount') newMobileNav.blurAmount = row.priority;
            if (row.server_name === 'mobilenav_dark_opacity') newMobileNav.darkOpacity = row.priority;
            if (row.server_name === 'mobilenav_red_opacity') newMobileNav.redOpacity = row.priority;
            if (row.server_name === 'mobilenav_border_opacity') newMobileNav.borderOpacity = row.priority;
            if (row.server_name === 'mobilenav_pill_type') newMobileNav.pillType = row.priority;
            if (row.server_name === 'mobilenav_height') newMobileNav.height = row.priority;
            if (row.server_name === 'mobilenav_icon_size') newMobileNav.iconSize = row.priority;
            if (row.server_name === 'mobilenav_capsule_width') newMobileNav.capsuleWidth = row.priority;
            if (row.server_name === 'mobilenav_show_sparkles') newMobileNav.showSparkles = row.priority;
            if (row.server_name === 'mobilenav_show_home') newMobileNav.showHome = row.priority;
            if (row.server_name === 'mobilenav_show_trending') newMobileNav.showTrending = row.priority;
            if (row.server_name === 'mobilenav_show_tv') newMobileNav.showTv = row.priority;
            if (row.server_name === 'mobilenav_show_dubbed') newMobileNav.showDubbed = row.priority;
            if (row.server_name === 'mobilenav_show_studios') newMobileNav.showStudios = row.priority;
            if (row.server_name === 'mobilenav_show_discover') newMobileNav.showDiscover = row.priority;
            if (row.server_name === 'mobilenav_show_list') newMobileNav.showList = row.priority;
            if (row.server_name === 'mobilenav_show_search') newMobileNav.showSearch = row.priority;
            if (row.server_name === 'mobilenav_color_r') newMobileNav.colorR = row.priority;
            if (row.server_name === 'mobilenav_color_g') newMobileNav.colorG = row.priority;
            if (row.server_name === 'mobilenav_color_b') newMobileNav.colorB = row.priority;
            if (row.server_name === 'mobilenav_items_gap') newMobileNav.itemsGap = row.priority;
            if (row.server_name === 'mobilenav_bottom_offset') newMobileNav.bottomOffset = row.priority;
            if (row.server_name === 'mobilenav_border_radius') newMobileNav.borderRadius = row.priority;

            // Player controls config keys
            if (row.server_name === 'player_controls_align') newPlayerConfig.controlsAlign = row.priority;
            if (row.server_name === 'player_controls_offset') newPlayerConfig.controlsOffset = row.priority;
          });

          // Sync remote sub-admins from server_config
          const remoteSubAdmins: any[] = [];
          data.forEach(row => {
            if (row.server_name && row.server_name.startsWith('subadmin:')) {
              try {
                const jsonStr = row.server_name.replace(/^subadmin:/, '');
                const parsed = JSON.parse(jsonStr);
                if (parsed && parsed.email) {
                  parsed.isActive = row.priority > 0;
                  remoteSubAdmins.push(parsed);
                }
              } catch (e) {}
            }
          });

          if (remoteSubAdmins.length > 0) {
            localStorage.setItem('flkrd_sub_admins', JSON.stringify(remoteSubAdmins));
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('flkrd-subadmins-updated'));
            }
          }
          
          if (Object.keys(newConfig).length > 0) {
            setGlassConfig(prev => ({ ...prev, ...newConfig }));
          }
          if (Object.keys(newMobileNav).length > 0) {
            setMobileNavConfig(prev => ({ ...prev, ...newMobileNav }));
          }
          if (Object.keys(newPlayerConfig).length > 0) {
            setPlayerConfig(prev => ({ ...prev, ...newPlayerConfig }));
          }
        }
      } catch (err: any) {
        if (!err?.message?.includes('exceed_egress_quota') && !err?.message?.includes('Payment Required')) {
          console.warn('[UI CONTEXT] Failed to sync server priorities:', err);
        }
      }
    };

    // Initial load
    syncServerPriorities();

    // 🔴 REALTIME: Subscribe to server_config changes — only if Supabase is not quota-blocked
    let serverConfigChannel: any = null;
    (async () => {
      try {
        const { error: probe } = await supabase.from('server_config').select('id').limit(1);
        if (probe) return; // 402 quota or error — skip realtime
        serverConfigChannel = supabase
          .channel('server_config_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'server_config' },
            () => {
              console.log('[UI CONTEXT] Server priority updated by admin — re-syncing...');
              syncServerPriorities();
            }
          )
          .subscribe();
      } catch (e) {
        // Skip realtime on network error
      }
    })();

    return () => {
      if (serverConfigChannel) serverConfigChannel.unsubscribe();
    };
  }, []);

  // 🔴 AUTO-ADMIN AUTHORIZATION: Automatically detect if logged-in user is CEO or active Sub-Admin
  useEffect(() => {
    const checkAndAuthorizeAdmin = (emailStr?: string | null) => {
      if (!emailStr) {
        setIsAdmin(false);
        setCurrentAdminEmail(null);
        return;
      }
      const cleanEmail = emailStr.trim().toLowerCase();

      // 1. CEO Master Check
      if (cleanEmail === 'flkrdstudio@gmail.com') {
        setIsAdmin(true);
        setCurrentAdminEmail('flkrdstudio@gmail.com');
        return;
      }

      // 2. Sub-Admin Check
      try {
        const stored = localStorage.getItem('flkrd_sub_admins');
        if (stored) {
          const subAdmins = JSON.parse(stored);
          const match = subAdmins.find((a: any) => a.email && a.email.toLowerCase() === cleanEmail);
          if (match && match.isActive) {
            setIsAdmin(true);
            setCurrentAdminEmail(match.email);
            return;
          }
        }
      } catch (e) {}

      // Default: clear admin state if not matching
      setIsAdmin(false);
      setCurrentAdminEmail(null);
    };

    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAndAuthorizeAdmin(session?.user?.email);
    });

    // Listen to real-time auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkAndAuthorizeAdmin(session?.user?.email);
    });

    // Listen for custom sub-admin list updates from AdminManagementModal or Supabase sync
    const handleSubAdminsUpdated = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        checkAndAuthorizeAdmin(session?.user?.email);
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('flkrd-subadmins-updated', handleSubAdminsUpdated);
    }

    return () => {
      subscription.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('flkrd-subadmins-updated', handleSubAdminsUpdated);
      }
    };
  }, []);


  // Cinematic Experience Guard: Do NOT automatically switch to light mode on mobile emulation / system preference.
  // The app remains in dark mode by default unless explicitly toggled by user in settings.
  useEffect(() => {
    // Keep theme set to dark if legacy 'light' was stored automatically
    if (localStorage.getItem('flkrd_theme') === 'light') {
      localStorage.setItem('flkrd_theme', 'dark');
      setThemeState('dark');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('flkrd_theme', theme);
    const root = document.documentElement;

    // Remove old classes
    const classesToRemove = Array.from(root.classList).filter(c => c === 'light-mode' || c.startsWith('theme-'));
    classesToRemove.forEach(c => root.classList.remove(c));

    // Add new class
    if (theme === 'light') {
      root.classList.add('light-mode');
    } else {
      root.classList.add(`theme-${theme}`);
      if (theme.includes('premium')) {
        root.classList.add('premium-theme-active');
      }
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('flkrd_accent_color', accentColor);
    document.documentElement.style.setProperty('--brand-red', accentColor);

    const r = parseInt(accentColor.slice(1, 3), 16);
    const g = parseInt(accentColor.slice(3, 5), 16);
    const b = parseInt(accentColor.slice(5, 7), 16);
    document.documentElement.style.setProperty('--brand-red-rgb', `${r}, ${g}, ${b}`);
  }, [accentColor]);

  useEffect(() => {
    const clamped = Math.min(1.5, Math.max(0.4, scale));
    localStorage.setItem('flkrd_scale', clamped.toString());
    const baseSize = 16 * clamped;
    // Smooth transition when resizing
    document.documentElement.style.fontSize = `${baseSize}px`;
    document.documentElement.style.setProperty('--global-scale', clamped.toString());
  }, [scale]);

  useEffect(() => {
    localStorage.setItem('flkrd_performance_turbo', isPerformanceMode.toString());
    if (isPerformanceMode) {
      document.documentElement.classList.add('performance-mode');
    } else {
      document.documentElement.classList.remove('performance-mode');
    }
  }, [isPerformanceMode]);

  const [isConsoleMode, setIsConsoleMode] = useState(false);
  const [isControllerDetected, setIsControllerDetected] = useState(false);

  useEffect(() => {
    if (isConsoleMode) {
      document.documentElement.classList.add('console-mode-active');
    } else {
      document.documentElement.classList.remove('console-mode-active');
    }
  }, [isConsoleMode]);

  const updateGlassConfig = async (config: GlassConfig): Promise<boolean> => {
    try {
      const { data: currentRows, error: fetchError } = await supabase
        .from('server_config')
        .select('id, server_name');
      
      if (fetchError) throw fetchError;

      const rowMap = new Map<string, number>();
      let maxId = 0;
      if (currentRows) {
        currentRows.forEach(row => {
          rowMap.set(row.server_name, row.id);
          if (row.id > maxId) {
            maxId = row.id;
          }
        });
      }

      const keys = [
        { key: 'glass_blur_amount', val: config.blurAmount },
        { key: 'glass_saturation', val: config.saturation },
        { key: 'glass_red_opacity', val: Math.round(config.redOpacity * 100) },
        { key: 'glass_dark_opacity', val: Math.round(config.darkOpacity * 100) },
        { key: 'glass_border_opacity', val: Math.round(config.borderOpacity * 100) },
        { key: 'glass_displacement_scale', val: config.displacementScale },
        { key: 'glass_aberration_intensity', val: config.aberrationIntensity },
        { key: 'glass_elasticity', val: Math.round(config.elasticity * 100) },
        { key: 'glass_corner_radius', val: config.cornerRadius },
      ];

      let nextId = maxId + 1;
      const upserts = keys.map(item => {
        const dbId = rowMap.get(item.key);
        if (dbId) {
          return { id: dbId, server_name: item.key, priority: item.val };
        } else {
          const assignedId = nextId;
          nextId++;
          return { id: assignedId, server_name: item.key, priority: item.val };
        }
      });

      const { error: upsertError } = await supabase
        .from('server_config')
        .upsert(upserts);

      if (upsertError) throw upsertError;

      setGlassConfig(config);
      return true;
    } catch (e) {
      console.error('[UI CONTEXT] Failed to update glass config:', e);
      return false;
    }
  };

  const updateMobileNavConfig = async (config: MobileNavConfig): Promise<boolean> => {
    try {
      const { data: currentRows, error: fetchError } = await supabase
        .from('server_config')
        .select('id, server_name');
      
      if (fetchError) throw fetchError;

      const rowMap = new Map<string, number>();
      let maxId = 0;
      if (currentRows) {
        currentRows.forEach(row => {
          rowMap.set(row.server_name, row.id);
          if (row.id > maxId) {
            maxId = row.id;
          }
        });
      }

      const keys = [
        { key: 'mobilenav_bg_type', val: config.bgType ?? 0 },
        { key: 'mobilenav_blur_amount', val: config.blurAmount ?? 24 },
        { key: 'mobilenav_dark_opacity', val: config.darkOpacity ?? 92 },
        { key: 'mobilenav_red_opacity', val: config.redOpacity ?? 30 },
        { key: 'mobilenav_border_opacity', val: config.borderOpacity ?? 20 },
        { key: 'mobilenav_pill_type', val: config.pillType ?? 0 },
        { key: 'mobilenav_height', val: config.height ?? 48 },
        { key: 'mobilenav_icon_size', val: config.iconSize ?? 16 },
        { key: 'mobilenav_capsule_width', val: config.capsuleWidth ?? 94 },
        { key: 'mobilenav_show_sparkles', val: config.showSparkles ?? 1 },
        { key: 'mobilenav_show_home', val: config.showHome ?? 1 },
        { key: 'mobilenav_show_trending', val: config.showTrending ?? 1 },
        { key: 'mobilenav_show_tv', val: config.showTv ?? 1 },
        { key: 'mobilenav_show_dubbed', val: config.showDubbed ?? 1 },
        { key: 'mobilenav_show_studios', val: config.showStudios ?? 1 },
        { key: 'mobilenav_show_discover', val: config.showDiscover ?? 1 },
        { key: 'mobilenav_show_list', val: config.showList ?? 1 },
        { key: 'mobilenav_show_search', val: config.showSearch ?? 1 },
        { key: 'mobilenav_color_r', val: config.colorR ?? 220 },
        { key: 'mobilenav_color_g', val: config.colorG ?? 38 },
        { key: 'mobilenav_color_b', val: config.colorB ?? 38 },
        { key: 'mobilenav_items_gap', val: config.itemsGap ?? 4 },
        { key: 'mobilenav_bottom_offset', val: config.bottomOffset ?? 20 },
        { key: 'mobilenav_border_radius', val: config.borderRadius ?? 9999 },
      ];

      let nextId = maxId + 1;
      const upserts = keys.map(item => {
        const dbId = rowMap.get(item.key);
        if (dbId) {
          return { id: dbId, server_name: item.key, priority: item.val };
        } else {
          const assignedId = nextId;
          nextId++;
          return { id: assignedId, server_name: item.key, priority: item.val };
        }
      });

      const { error: upsertError } = await supabase
        .from('server_config')
        .upsert(upserts);

      if (upsertError) throw upsertError;

      setMobileNavConfig(config);
      return true;
    } catch (e) {
      console.error('[UI CONTEXT] Failed to update mobile nav config:', e);
      return false;
    }
  };

  const updatePlayerConfig = async (config: PlayerConfig): Promise<boolean> => {
    try {
      const { data: currentRows, error: fetchError } = await supabase
        .from('server_config')
        .select('id, server_name');
      
      if (fetchError) throw fetchError;

      const rowMap = new Map<string, number>();
      let maxId = 0;
      if (currentRows) {
        currentRows.forEach(row => {
          rowMap.set(row.server_name, row.id);
          if (row.id > maxId) {
            maxId = row.id;
          }
        });
      }

      const keys = [
        { key: 'player_controls_align', val: config.controlsAlign ?? 0 },
        { key: 'player_controls_offset', val: config.controlsOffset ?? 16 },
      ];

      let nextId = maxId + 1;
      const upserts = keys.map(item => {
        const dbId = rowMap.get(item.key);
        if (dbId) {
          return { id: dbId, server_name: item.key, priority: item.val };
        } else {
          const assignedId = nextId;
          nextId++;
          return { id: assignedId, server_name: item.key, priority: item.val };
        }
      });

      const { error: upsertError } = await supabase
        .from('server_config')
        .upsert(upserts);

      if (upsertError) throw upsertError;

      setPlayerConfig(config);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('flkrd-player-config-updated', { detail: config }));
      }
      return true;
    } catch (err) {
      console.error('[UI CONTEXT] Failed to update player config:', err);
      return false;
    }
  };

  const [translatedMovieIds, setTranslatedMovieIds] = useState<Set<string>>(new Set());

  const refreshTranslatedMovieIds = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_subtitles')
        .select('tmdb_id');
      
      if (error) throw error;
      
      if (data) {
        const ids = data.map((d: any) => String(d.tmdb_id));
        setTranslatedMovieIds(new Set(ids));
      }
    } catch (e: any) {
      if (!e?.message?.includes('exceed_egress_quota') && !e?.message?.includes('Payment Required')) {
        console.warn('[UI CONTEXT] Failed to load translated movie IDs:', e);
      }
    }
  };

  useEffect(() => {
    refreshTranslatedMovieIds();
  }, []);

  const [activeTranslation, setActiveTranslation] = useState<ActiveTranslationState>(() => {
    try {
      const cached = localStorage.getItem('flkrd_translating_sub_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          isTranslating: false, // Start idle so user can click "Resume"
          progress: parsed.progress || 0,
          statusText: parsed.statusText || 'Idle',
          translatingName: parsed.sub?.attributes?.display_name || 'Selected Track',
          sub: parsed.sub,
          tmdbId: parsed.targetId || parsed.tmdbId,
          mediaType: parsed.mediaType || 'movie',
          season: parsed.season || 0,
          episode: parsed.episode || 0,
          showCelebration: false
        };
      }
    } catch (e) {}
    return {
      isTranslating: false,
      progress: 0,
      statusText: '',
      translatingName: '',
      sub: null,
      tmdbId: '',
      mediaType: 'movie',
      season: 0,
      episode: 0,
      showCelebration: false
    };
  });

  const translationControllerRef = useRef<AbortController | null>(null);
  const pauseStateRef = useRef<{ isPaused: boolean }>({ isPaused: false });
  // Ref-based lock: prevents race where React state hasn't updated yet on a 2nd startGlobalTranslation call
  const activeTranslationKeyRef = useRef<string>('');

  const startGlobalTranslation = async (
    sub: any,
    tmdbId: string | number,
    mediaType: string,
    season: number = 0,
    episode: number = 0,
    targetLang: string = 'ku'
  ) => {
    // If translation for the EXACT SAME subtitle track is ALREADY running, ignore duplicate start call!
    if (
      activeTranslation.isTranslating &&
      String(activeTranslation.tmdbId) === String(tmdbId) &&
      activeTranslation.mediaType === mediaType &&
      activeTranslation.season === season &&
      activeTranslation.episode === episode &&
      (activeTranslation.sub?.id === sub?.id || activeTranslation.sub?.attributes?.url === sub?.attributes?.url)
    ) {
      console.log("[UI CONTEXT] Translation already actively running for this track — reusing pipeline.");
      return;
    }

    // Build a unique fingerprint for this translation request
    const requestKey = `${String(tmdbId)}|${mediaType}|${season}|${episode}|${sub?.id || sub?.attributes?.url || ''}|${targetLang}`;

    // REF-BASED dedup guard (avoids React async state lag on rapid double calls)
    if (activeTranslationKeyRef.current === requestKey && translationControllerRef.current && !translationControllerRef.current.signal.aborted) {
      console.log("[UI CONTEXT] Translation already actively running for this exact track (ref guard) — ignoring duplicate call.");
      return;
    }

    // Abort previous translation ONLY if it's a genuinely DIFFERENT content/track
    if (translationControllerRef.current && activeTranslationKeyRef.current !== requestKey) {
      console.log("[UI CONTEXT] Aborting previous translation (different track):", activeTranslationKeyRef.current, '→', requestKey);
      translationControllerRef.current.abort();
    }

    activeTranslationKeyRef.current = requestKey;
    translationControllerRef.current = new AbortController();
    pauseStateRef.current = { isPaused: false };

    const subName = sub.attributes?.display_name || 'Selected Track';
    setActiveTranslation({
      isTranslating: true,
      isPaused: false,
      progress: 0,
      statusText: 'Starting translation...',
      translatingName: subName,
      sub,
      tmdbId,
      mediaType,
      season,
      episode,
      showCelebration: false
    });

    // Save initial state to localStorage cache
    try {
      localStorage.setItem('flkrd_translating_sub_cache', JSON.stringify({
        sub,
        targetId: tmdbId,
        mediaType,
        season,
        episode,
        targetLang,
        progress: 0,
        statusText: 'Starting...'
      }));
    } catch (e) {}

    try {
      const result = await translateAndSavePipeline(
        sub,
        tmdbId,
        mediaType,
        season,
        episode,
        targetLang,
        (progress, status, partialSubtitleUrl) => {
          setActiveTranslation(prev => {
            const next = {
              ...prev,
              progress,
              statusText: status,
              subtitleUrl: partialSubtitleUrl || prev.subtitleUrl
            };
            try {
              localStorage.setItem('flkrd_translating_sub_cache', JSON.stringify({
                sub: prev.sub,
                targetId: prev.tmdbId,
                mediaType: prev.mediaType,
                season: prev.season,
                episode: prev.episode,
                targetLang,
                progress,
                statusText: status,
                subtitleUrl: partialSubtitleUrl || prev.subtitleUrl
              }));
            } catch (e) {}
            return next;
          });

          // LIVE UPDATE: Dispatch custom event so active video player updates live
          if (partialSubtitleUrl && typeof window !== 'undefined') {
            console.log(`[UI CONTEXT] Live progressive subtitle update (${progress}%):`, partialSubtitleUrl.substring(0, 50));
            window.dispatchEvent(new CustomEvent('flkrd-subtitle-translated', {
              detail: { subtitleUrl: partialSubtitleUrl, tmdbId, progress, isFinal: false }
            }));
          }
        },
        translationControllerRef.current.signal,
        pauseStateRef.current
      );

      if (result.success && result.subtitleUrl) {
        activeTranslationKeyRef.current = ''; // clear ref lock on success
        setActiveTranslation(prev => ({
          ...prev,
          isTranslating: false,
          isPaused: false,
          progress: 100,
          statusText: 'Completed successfully!',
          showCelebration: true,
          subtitleUrl: result.subtitleUrl
        }));

        // Final event already dispatched by translateAndSavePipeline with isFinal:true + srtContent
        // — no need for a redundant duplicate dispatch here.
        // Update global subtitle coverage Set
        await refreshTranslatedMovieIds();
      } else {
        throw new Error(result.error || 'Translation pipeline failed');
      }

    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('cancelled')) {
        console.log("[UI CONTEXT] Translation cancelled by user.");
        activeTranslationKeyRef.current = ''; // clear lock so next attempt can start fresh
        setActiveTranslation(prev => ({
          ...prev,
          isTranslating: false,
          isPaused: false,
          statusText: 'Translation cancelled.',
        }));
      } else {
        console.error("[UI CONTEXT] Subtitle translation pipeline exception:", err);
        activeTranslationKeyRef.current = ''; // clear lock on failure
        setActiveTranslation(prev => ({
          ...prev,
          isTranslating: false,
          isPaused: false,
          statusText: `Failed: ${err.message || 'Unknown error'}`,
          error: err.message || 'Unknown error'
        }));
      }
    }
  };

  const pauseGlobalTranslation = () => {
    pauseStateRef.current.isPaused = true;
    setActiveTranslation(prev => ({
      ...prev,
      isPaused: true,
      statusText: 'وەرگێڕان ڕاوەستێنراوە (Paused)...'
    }));
  };

  const resumeGlobalTranslation = () => {
    pauseStateRef.current.isPaused = false;
    setActiveTranslation(prev => ({
      ...prev,
      isPaused: false,
      statusText: 'بەردەوامبوونی وەرگێڕان...'
    }));
  };

  const cancelGlobalTranslation = () => {
    if (translationControllerRef.current) {
      translationControllerRef.current.abort();
      translationControllerRef.current = null;
    }
    activeTranslationKeyRef.current = ''; // clear ref lock on cancel
    pauseStateRef.current.isPaused = false;

    setActiveTranslation({
      isTranslating: false,
      isPaused: false,
      progress: 0,
      statusText: '',
      translatingName: '',
      sub: null,
      tmdbId: '',
      mediaType: 'movie',
      season: 0,
      episode: 0,
      showCelebration: false
    });
    try {
      localStorage.removeItem('flkrd_translating_sub_cache');
    } catch (e) {}
  };

  const dismissCelebration = () => {
    setActiveTranslation(prev => ({
      ...prev,
      showCelebration: false
    }));
    try {
      localStorage.removeItem('flkrd_translating_sub_cache');
    } catch (e) {}
  };

  const toggleTheme = () => setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  const setTheme = (t: Theme) => setThemeState(t);
  const setAccentColor = (c: string) => setAccentColorState(c);
  const setScale = (s: number) => setScaleState(s);
  const setIsPerformanceMode = (p: boolean) => setIsPerformanceModeState(p);
  const setIsAdmin = (a: boolean) => {
    setIsAdminState(a);
    localStorage.setItem('isFlkrdAdmin', a.toString());
    if (a) {
        localStorage.setItem('flkrd_admin_login_at', Date.now().toString());
    } else {
        localStorage.removeItem('flkrd_admin_login_at');
    }
  };

  const hasPermission = useCallback((permKey: string): boolean => {
    if (!isAdmin) return false;
    const email = localStorage.getItem('flkrd_admin_email') || 'flkrdstudio@gmail.com';
    if (email.toLowerCase() === 'flkrdstudio@gmail.com') return true;
    
    try {
      const stored = localStorage.getItem('flkrd_sub_admins');
      if (stored) {
        const subAdmins = JSON.parse(stored);
        const current = subAdmins.find((a: any) => a.email.toLowerCase() === email.toLowerCase());
        if (current && current.permissions) {
          return !!current.permissions[permKey];
        }
      }
    } catch (e) {}
    
    return true;
  }, [isAdmin]);

  const [currentAdminEmail, setCurrentAdminEmail] = useState(() => {
    return localStorage.getItem('flkrd_admin_email') || 'flkrdstudio@gmail.com';
  });

  const loginAsAdmin = useCallback(async (email: string, pass: string): Promise<{ success: boolean; admin?: any; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    
    try {
      const response = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: pass
        })
      });

      const data = await response.json();

      if (response.ok && data.success && data.token) {
        localStorage.setItem('flkrd_admin_session_token', data.token);
        localStorage.setItem('flkrd_admin_email', cleanEmail);
        localStorage.setItem('flkrd_admin_login_at', Date.now().toString());
        localStorage.setItem('isFlkrdAdmin', 'true');
        setCurrentAdminEmail(cleanEmail);
        setIsAdminState(true);
        return {
          success: true,
          admin: data.admin
        };
      } else {
        return {
          success: false,
          message: data.message || 'پاسپۆردەکەت هەڵەیە یان ڕێگەپێدراو نیت!'
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: 'کێشە لە پەیوەستبوون بە سێرڤەری ئاسایش هەیە!'
      };
    }
  }, []);

  return (
    <UIContext.Provider value={{ 
      theme, accentColor, scale, isPerformanceMode, isSettingsOpen, isAdminModalOpen, isConsoleMode, isControllerDetected, isAdmin, glassConfig, translatedMovieIds, refreshTranslatedMovieIds,
      activeTranslation, startGlobalTranslation, pauseGlobalTranslation, resumeGlobalTranslation, cancelGlobalTranslation, dismissCelebration,
      setTheme, setAccentColor, setScale, setIsPerformanceMode, setIsSettingsOpen, setIsAdminModalOpen, toggleTheme, setIsConsoleMode, setIsControllerDetected, setIsAdmin, updateGlassConfig,
      mobileNavConfig, updateMobileNavConfig,
      playerConfig, updatePlayerConfig,
      viewMode, setViewMode,
      hasPermission, currentAdminEmail, loginAsAdmin
    }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within UIProvider');
  return context;
};