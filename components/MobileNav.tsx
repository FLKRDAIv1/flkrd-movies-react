
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden w-[94%] max-w-md">
      <div className="flex items-center justify-around bg-black/40 backdrop-blur-3xl rounded-[2.5rem] px-3 py-3 shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/10 transition-all duration-500 ring-1 ring-white/5">
        {items.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            aria-label={t(item.labelKey)}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all relative group ${
                isActive ? 'text-white' : 'text-gray-500 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`transition-all duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110 opacity-70 group-hover:opacity-100'}`}>
                   {item.icon}
                </div>
                {isActive && (
                  <motion.div
                    layoutId="active-mobile-indicator"
                    className="absolute -bottom-1.5 h-1.5 w-6 bg-brand rounded-full shadow-[0_0_15px_rgba(229,9,20,0.6)]"
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
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
