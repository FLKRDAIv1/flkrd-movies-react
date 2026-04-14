
import React, { useState } from 'react';
import { NavLink, useLocation, Location } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Tv, Film, Bookmark, Search, Globe, Mic2, PlayCircle } from 'lucide-react';
import { STUDIOS } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';

const sidebarVariants = {
  open: { width: "16rem" },
  closed: { width: "3.5rem" },
};

const textVariants = {
  open: { opacity: 1, x: 0, display: 'inline' },
  closed: { opacity: 0, x: -10, display: 'none' },
};

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  text: string;
  location: Location;
}

const NavItem = ({ to, icon, text, location }: NavItemProps) => {
  const isActive = location.pathname === to || (to === '/discover' && location.pathname.startsWith('/discover'));
  return (
    <NavLink to={to} className={`flex items-center h-12 px-3 rounded-xl transition-all ${isActive ? 'bg-red-600/20 text-red-600 shadow-[inset_0_0_10px_rgba(229,9,20,0.1)] font-black' : 'hover:bg-red-600/5 text-gray-500'}`}>
      <div className="flex-shrink-0">{icon}</div>
      <motion.span variants={textVariants} className="ml-4 font-bold uppercase tracking-widest text-[10px] whitespace-nowrap">{text}</motion.span>
    </NavLink>
  );
};

interface StudioItemProps {
  to: string;
  icon: React.ReactNode;
  text: string;
  location: Location;
}

const StudioItem: React.FC<StudioItemProps> = ({ to, icon, text, location }) => {
  const isActive = location.pathname.startsWith(to.split('/').slice(0, 3).join('/'));
  return (
    <NavLink to={to} className={`flex items-center h-10 px-3 rounded-lg transition-all ${isActive ? 'bg-red-600/10 text-red-600 font-bold' : 'hover:bg-red-600/5 text-gray-500'}`}>
      <div className="flex-shrink-0 w-5 flex items-center justify-center">{icon}</div>
      <motion.span variants={textVariants} className="ml-4 font-bold text-[9px] uppercase tracking-widest whitespace-nowrap">{text}</motion.span>
    </NavLink>
  );
};

const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <>
      {/* Background Blur Overlay when sidebar is open */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[45] bg-black/20 backdrop-blur-sm hidden md:block"
          />
        )}
      </AnimatePresence>

      <motion.div
        className="hidden md:flex flex-col flex-shrink-0 h-screen sticky top-0 bg-black border-r border-white/5 text-gray-400 p-2 z-50 shadow-2xl overflow-hidden transition-colors duration-500"
        variants={sidebarVariants}
        initial="closed"
        animate={isCollapsed ? "closed" : "open"}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
      >
        <div className="flex items-center justify-center h-28 flex-shrink-0 group">
          <div className="relative">
             <img src="/flkrd-icon.png" alt="L" className={`w-12 h-12 object-contain transition-transform duration-700 ${isCollapsed ? '' : 'scale-110'}`} />
             <div className="absolute -inset-2 bg-brand/30 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
          </div>
        </div>

        <nav className="flex-grow flex flex-col space-y-2 mt-6 overflow-y-auto scrollbar-hide px-1">
          <NavItem to="/" icon={<Home size={22} />} text={t('home')} location={location} />
          <NavItem to="/shorts" icon={<PlayCircle size={22} />} text={t('trendingToday')} location={location} />
          <NavItem to="/tv" icon={<Tv size={22} />} text={t('tvShows')} location={location} />
          <NavItem to="/dubbed" icon={<Mic2 size={22} />} text={t('dubbedMovies')} location={location} />
          <NavItem to="/discover" icon={<Globe size={22} />} text={t('discover')} location={location} />
          <NavItem to="/search" icon={<Search size={22} />} text={t('search')} location={location} />
          <NavItem to="/my-list" icon={<Bookmark size={22} />} text={t('myList')} location={location} />

          <div className="pt-8 border-t border-white/5 mt-4">
            <motion.h3
              variants={textVariants}
              className="px-3 text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4"
            >
              {t('studios')}
            </motion.h3>
            <div className="space-y-1">
              {STUDIOS.map(studio => (
                <StudioItem
                  key={studio.id}
                  to={`/studio/${studio.id}/${encodeURIComponent(studio.name)}`}
                  icon={<Film size={18} />}
                  text={studio.name}
                  location={location}
                />
              ))}
            </div>
          </div>
        </nav>
      </motion.div>
    </>
  );
};

export default Sidebar;
