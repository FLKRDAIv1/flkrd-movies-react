import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Calendar, Bookmark, User, Sparkles } from 'lucide-react';
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
  { id: 1, icon: <Calendar size={19} />, labelKey: "tvShows", to: "/tv" },
  { id: 2, icon: <Bookmark size={19} />, labelKey: "myList", to: "/my-list" },
  { id: 3, icon: <User size={19} />, labelKey: "profile", to: "/profile" },
];

const MobileNav: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { glassConfig } = useUI();

  return (
    <div className="global-mobilenav fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] left-0 right-0 mx-auto z-[9999] md:hidden w-[92%] max-w-[420px] pointer-events-auto overflow-visible flex items-center justify-between gap-3">
      {/* 1. Main Navigation Capsule (Floating Red Glassmorphic Pill) */}
      <div 
        className="flex-1 rounded-full border backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.65)] flex items-center justify-between px-2.5 py-2 gap-2 transition-all duration-300 overflow-hidden relative"
        style={{
          background: `linear-gradient(135deg, rgba(30, 5, 5, 0.88) 0%, rgba(10, 5, 5, 0.94) 100%)`,
          backdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
          WebkitBackdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
          borderStyle: 'solid',
          borderColor: `rgba(220, 38, 38, ${glassConfig.borderOpacity * 1.8})`,
          boxShadow: `
            inset 0 1px 0 0 rgba(255, 255, 255, 0.08),
            inset 0 0 15px rgba(220, 38, 38, 0.15),
            0 15px 35px rgba(0,0,0,0.85)
          `
        }}
      >
        {/* Dynamic GPU-accelerated red liquid glow overlay */}
        <div 
          className="absolute inset-0 pointer-events-none mix-blend-color-dodge opacity-50 z-0"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(220, 38, 38, 0.3) 0%, transparent 60%)',
          }}
        />

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
                whileHover={{ scale: 1.12, y: -1 }}
                whileTap={{ scale: 0.9 }}
                className={`w-[2.5rem] h-[2.5rem] rounded-full flex items-center justify-center transition-colors duration-300 relative ${
                  isActive 
                    ? 'text-white font-black' 
                    : 'text-red-200/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-active-bg"
                    className="absolute inset-0 rounded-full z-0 shadow-[0_4px_16px_rgba(220,38,38,0.45)] border border-red-500/30"
                    style={{
                      background: 'linear-gradient(135deg, #dc2626 0%, #be123c 100%)',
                    }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 380 * (glassConfig.elasticity / 0.35), 
                      damping: 30 * (0.35 / glassConfig.elasticity) 
                    }}
                  />
                )}
                <span className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-105 text-white font-black' : 'text-red-300/60'}`}>
                  {item.icon}
                </span>
              </motion.div>
            </NavLink>
          );
        })}
      </div>

      {/* 2. Recommendation/Discover Floating Sparkles Button (AI Portal) */}
      <NavLink
        to="/discover"
        aria-label="Discover Movies"
        className="focus:outline-none"
      >
        <motion.div
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.92 }}
          className="w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 relative shadow-[0_8px_32px_rgba(220,38,38,0.45)] cursor-pointer group"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.4) 0%, transparent 60%), linear-gradient(135deg, rgba(220, 38, 38, 0.8) 0%, rgba(136, 19, 55, 0.95) 100%)',
            borderColor: 'rgba(239, 68, 68, 0.45)',
            boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.35), 0 0 20px rgba(220, 38, 38, 0.35)'
          }}
        >
          {/* Pulsing Glow Ring */}
          <div className="absolute inset-0 rounded-full border border-red-500 animate-ping opacity-15 pointer-events-none" />
          
          {/* Liquid Glass Shine Reflection Overlay */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-0" />
          
          <Sparkles size={20} className="text-white relative z-10 transition-transform duration-500 group-hover:rotate-12 animate-pulse" />
        </motion.div>
      </NavLink>
    </div>
  );
};

export default MobileNav;
