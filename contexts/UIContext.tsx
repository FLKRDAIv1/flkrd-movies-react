import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
    const clamped = Math.min(1.5, Math.max(0.5, scale));
    localStorage.setItem('flkrd_scale', clamped.toString());
    const baseSize = 16 * clamped;
    // Smooth transition when resizing
    document.documentElement.style.transition = 'font-size 0.25s ease';
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

  const toggleTheme = () => setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  const setTheme = (t: Theme) => setThemeState(t);
  const setAccentColor = (c: string) => setAccentColorState(c);
  const setScale = (s: number) => setScaleState(s);
  const setIsPerformanceMode = (p: boolean) => setIsPerformanceModeState(p);

  return (
    <UIContext.Provider value={{ 
      theme, accentColor, scale, isPerformanceMode, isSettingsOpen,
      setTheme, setAccentColor, setScale, setIsPerformanceMode, setIsSettingsOpen, toggleTheme 
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