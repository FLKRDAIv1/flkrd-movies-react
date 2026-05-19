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
    <div className="global-mobilenav fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 md:hidden w-[94%] max-w-md">
      <div className="flex items-center justify-around bg-white/75 dark:bg-black/75 backdrop-blur-2xl rounded-[2.5rem] px-2 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-black/[0.03] dark:border-white/[0.05] transition-all duration-500">
        {items.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            aria-label={t(item.labelKey)}
            className="group"
          >
            {({ isActive }) => (
              <LiquidButton
                asChild
                variant="default"
                size="icon"
                className={`w-[3rem] h-[3rem] rounded-[1.25rem] transition-all relative flex flex-col items-center justify-center cursor-pointer ${
                  isActive 
                    ? 'text-slate-900 dark:text-white shadow-[0_0_20px_rgba(255,255,255,0.4)] dark:shadow-[0_0_25px_rgba(255,255,255,0.85)] border border-black/10 dark:border-white/40' 
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
                      className="absolute -bottom-1 h-1 w-6 bg-slate-900 dark:bg-white rounded-full shadow-[0_0_10px_rgba(15,23,42,0.5)] dark:shadow-[0_0_15px_rgba(255,255,255,1)]"
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
