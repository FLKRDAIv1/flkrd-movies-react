import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabaseClient';

type Theme = 'light' | 'dark' | 'premium-gradient-1' | 'premium-gradient-2' | 'premium-particles-galaxy' | 'premium-particles-moon' | 'premium-particles-stardust';

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
          .select('server_name, priority');
        if (error) throw error;
        if (data && data.length > 0) {
          const scores: { [key: string]: number } = {};
          data.forEach(row => {
            scores[row.server_name] = row.priority;
          });
          localStorage.setItem('playerSourceScores', JSON.stringify(scores));
          window.dispatchEvent(new Event('player-source-scores-updated'));
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
      theme, accentColor, scale, isPerformanceMode, isSettingsOpen, isConsoleMode, isControllerDetected, isAdmin,
      setTheme, setAccentColor, setScale, setIsPerformanceMode, setIsSettingsOpen, toggleTheme, setIsConsoleMode, setIsControllerDetected, setIsAdmin
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