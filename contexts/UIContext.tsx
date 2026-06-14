import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabaseClient';

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
  toggleTheme: () => void;
  isConsoleMode: boolean;
  setIsConsoleMode: (isConsoleMode: boolean) => void;
  isControllerDetected: boolean;
  setIsControllerDetected: (isDetected: boolean) => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  glassConfig: GlassConfig;
  updateGlassConfig: (config: GlassConfig) => Promise<boolean>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() =>
    (localStorage.getItem('flkrd_theme') as Theme) || 'dark'
  );
  const [accentColor, setAccentColorState] = useState(() =>
    localStorage.getItem('flkrd_accent_color') || '#e50914'
  );
  const [scale, setScaleState] = useState(() =>
    Number(localStorage.getItem('flkrd_scale')) || 1
  );
  const [isPerformanceMode, setIsPerformanceModeState] = useState(() =>
    localStorage.getItem('flkrd_performance_turbo') === 'true'
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [glassConfig, setGlassConfig] = useState<GlassConfig>(() => {
    try {
      const saved = localStorage.getItem('flkrd_glass_config');
      if (saved) return JSON.parse(saved);
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

  useEffect(() => {
    try {
      localStorage.setItem('flkrd_glass_config', JSON.stringify(glassConfig));
    } catch (e) {}
  }, [glassConfig]);
  const [isAdmin, setIsAdminState] = useState(() => {
    const isAdminStored = localStorage.getItem('isFlkrdAdmin') === 'true';
    if (!isAdminStored) return false;
    
    const loginAt = localStorage.getItem('flkrd_admin_login_at');
    if (!loginAt) return true; // Legacy support
    
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const isExpired = Date.now() - parseInt(loginAt) > sevenDaysInMs;
    
    if (isExpired) {
        localStorage.removeItem('isFlkrdAdmin');
        localStorage.removeItem('flkrd_admin_login_at');
        return false;
    }
    return true;
  });

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
          data.forEach(row => {
            if (row.server_name === 'glass_blur_amount') newConfig.blurAmount = row.priority;
            if (row.server_name === 'glass_saturation') newConfig.saturation = row.priority;
            if (row.server_name === 'glass_red_opacity') newConfig.redOpacity = row.priority / 100;
            if (row.server_name === 'glass_dark_opacity') newConfig.darkOpacity = row.priority / 100;
            if (row.server_name === 'glass_border_opacity') newConfig.borderOpacity = row.priority / 100;
            if (row.server_name === 'glass_displacement_scale') newConfig.displacementScale = row.priority;
            if (row.server_name === 'glass_aberration_intensity') newConfig.aberrationIntensity = row.priority;
            if (row.server_name === 'glass_elasticity') newConfig.elasticity = row.priority / 100;
            if (row.server_name === 'glass_corner_radius') newConfig.cornerRadius = row.priority;
          });
          
          if (Object.keys(newConfig).length > 0) {
            setGlassConfig(prev => ({ ...prev, ...newConfig }));
          }
        }
      } catch (err) {
        console.error('[UI CONTEXT] Failed to sync server priorities:', err);
      }
    };

    // Initial load
    syncServerPriorities();

    // 🔴 REALTIME: Subscribe to server_config changes so ALL users update instantly
    // when admin saves a new server order — no page refresh needed
    const serverConfigChannel = supabase
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

    return () => {
      serverConfigChannel.unsubscribe();
    };
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

  return (
    <UIContext.Provider value={{ 
      theme, accentColor, scale, isPerformanceMode, isSettingsOpen, isConsoleMode, isControllerDetected, isAdmin, glassConfig,
      setTheme, setAccentColor, setScale, setIsPerformanceMode, setIsSettingsOpen, toggleTheme, setIsConsoleMode, setIsControllerDetected, setIsAdmin, updateGlassConfig
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