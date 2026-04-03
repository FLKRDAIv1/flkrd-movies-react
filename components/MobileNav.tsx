
import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Tv, Search, Bookmark, Globe, Mic2, PlayCircle } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import translations from '../translations';

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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden w-[92%] max-w-lg">
      <div className="flex items-center justify-around bg-black/40 backdrop-blur-2xl rounded-[2rem] px-2 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 transition-colors duration-500 light-mode:bg-white/60 light-mode:shadow-[0_10px_30px_rgba(0,0,0,0.1)]">
        {items.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            aria-label={t(item.labelKey)}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-11 h-11 rounded-2xl transition-all relative ${
                isActive ? 'text-red-600 bg-red-600/10' : 'text-gray-500 hover:text-red-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {item.icon}
                {isActive && (
                  <motion.div
                    layoutId="active-mobile-indicator"
                    className="absolute -bottom-1 h-1 w-4 bg-red-600 rounded-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default MobileNav;
