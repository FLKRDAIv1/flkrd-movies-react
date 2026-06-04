import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Tv, Search, Bookmark, Globe, Mic2, PlayCircle } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import translations from '../translations';
import { LiquidButton } from './ui/liquid-glass-button';

interface NavItem {
  id: number;
  icon: React.ReactNode;
  labelKey: keyof typeof translations['en'];
  to: string;
}

const items: NavItem[] = [
  { id: 0, icon: <Home size={22} />, labelKey: "home", to: "/" },
  { id: 1, icon: <PlayCircle size={22} />, labelKey: "trendingToday", to: "/shorts" },
  { id: 2, icon: <Tv size={22} />, labelKey: "tvShows", to: "/tv" },
  { id: 3, icon: <Mic2 size={22} />, labelKey: "dubbedMovies", to: "/dubbed" },
  { id: 4, icon: <Globe size={22} />, labelKey: "discover", to: "/discover" },
  { id: 5, icon: <Bookmark size={22} />, labelKey: "myList", to: "/my-list" },
  { id: 6, icon: <Search size={22} />, labelKey: "search", to: "/search" },
];

const MobileNav: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="global-mobilenav fixed bottom-0 left-0 right-0 z-50 md:hidden w-full">
      <div className="flex items-center justify-between bg-white/80 dark:bg-black/80 backdrop-blur-2xl px-4 pt-2.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,16px))] shadow-[0_-10px_35px_rgba(0,0,0,0.15)] border-t border-black/[0.04] dark:border-white/[0.08] transition-all duration-500 gap-1">
        {items.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            aria-label={t(item.labelKey)}
            className="group flex-1 flex justify-center"
          >
            {({ isActive }) => (
              <LiquidButton
                asChild
                variant="default"
                size="icon"
                className={`w-[2.75rem] h-[2.75rem] rounded-[1.1rem] transition-all relative flex flex-col items-center justify-center cursor-pointer ${
                  isActive 
                    ? 'text-slate-900 dark:text-white shadow-[0_0_15px_rgba(255,255,255,0.3)] dark:shadow-[0_0_20px_rgba(255,255,255,0.75)] border border-black/10 dark:border-white/30' 
                    : 'text-slate-900/40 dark:text-white/40 hover:text-slate-900/80 hover:dark:text-white/80'
                }`}
              >
                <div>
                  <div className={`transition-all duration-300 ${
                    isActive 
                      ? 'scale-110 drop-shadow-[0_0_8px_rgba(15,23,42,0.1)] dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] opacity-100' 
                      : 'group-hover:scale-110 opacity-70 group-hover:opacity-100'
                  }`}>
                     {item.icon}
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="active-mobile-indicator"
                      className="absolute -bottom-1 h-0.5 w-5 bg-slate-900 dark:bg-white rounded-full shadow-[0_0_6px_rgba(15,23,42,0.5)] dark:shadow-[0_0_10px_rgba(255,255,255,1)]"
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    />
                  )}
                </div>
              </LiquidButton>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default MobileNav;
