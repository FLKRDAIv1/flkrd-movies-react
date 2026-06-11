import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Tv, Search, Bookmark, Globe, Mic2, PlayCircle } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import translations from '../translations';

interface NavItem {
  id: number;
  icon: React.ReactNode;
  labelKey: keyof typeof translations['en'];
  to: string;
}

const items: NavItem[] = [
  { id: 0, icon: <Home size={19} />, labelKey: "home", to: "/" },
  { id: 1, icon: <PlayCircle size={19} />, labelKey: "trendingToday", to: "/shorts" },
  { id: 2, icon: <Tv size={19} />, labelKey: "tvShows", to: "/tv" },
  { id: 3, icon: <Mic2 size={19} />, labelKey: "dubbedMovies", to: "/dubbed" },
  { id: 4, icon: <Globe size={19} />, labelKey: "discover", to: "/discover" },
  { id: 5, icon: <Bookmark size={19} />, labelKey: "myList", to: "/my-list" },
  { id: 6, icon: <Search size={19} />, labelKey: "search", to: "/search" },
];

const MobileNav: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { glassConfig } = useUI();

  return (
    <div className="global-mobilenav fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] left-0 right-0 mx-auto z-50 md:hidden w-[92%] max-w-[420px] pointer-events-auto overflow-visible">
      <div 
        className="w-full rounded-full border backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.65)] flex items-center justify-between px-2 py-1.5 gap-1.5 transition-all duration-300"
        style={{
          background: `linear-gradient(135deg, rgba(229, 9, 20, ${glassConfig.redOpacity * 1.5}) 0%, rgba(15, 23, 42, ${glassConfig.darkOpacity * 1.15}) 100%)`,
          backdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
          WebkitBackdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
          borderColor: `rgba(239, 68, 68, ${glassConfig.borderOpacity})`,
          filter: 'url(#container-glass)',
        }}
      >
        {items.map((item) => {
          const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));

          return (
            <NavLink
              key={item.id}
              to={item.to}
              aria-label={t(item.labelKey)}
              className="flex-1 flex justify-center focus:outline-none"
            >
              <motion.div
                whileHover={{ scale: 1.15, y: -2 }}
                whileTap={{ scale: 0.88 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 450 * (glassConfig.elasticity / 0.35), 
                  damping: 18 * (0.35 / glassConfig.elasticity) 
                }}
                className={`w-[2.4rem] h-[2.4rem] rounded-full flex items-center justify-center transition-colors duration-300 relative ${
                  isActive 
                    ? 'text-red-950 font-black' 
                    : 'text-red-200/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-active-bg"
                    className="absolute inset-0 bg-white rounded-full z-0 shadow-[0_4px_12px_rgba(255,255,255,0.3)] border border-white"
                    transition={{ 
                      type: "spring", 
                      stiffness: 380 * (glassConfig.elasticity / 0.35), 
                      damping: 30 * (0.35 / glassConfig.elasticity) 
                    }}
                  />
                )}
                <span className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110 text-red-950 font-black' : 'text-red-300/70'}`}>
                  {item.icon}
                </span>
              </motion.div>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNav;
