import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Content } from '../types';
import { IMAGE_BASE_URL_POSTER, GENRES_T } from '../constants';
import { SkeletonGrid } from '../components/Skeleton';
import Portal from '../components/Portal';
import { useTranslation } from '../contexts/LanguageContext';
import { useSearchEngine } from '../hooks/useSearchEngine';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import { clearTMDBCache } from '../services/tmdbService';
import { bannedService } from '../services/bannedService';
import KurdishCCBadge from '../components/KurdishCCBadge';
import { LiquidButton } from '../components/ui/liquid-glass-button';
import { Search as SearchIcon, X, Star, TrendingUp, AlertCircle, Cpu, ShieldAlert, ShieldCheck, Ghost, Sparkles, Film, Tv, Mic2, Calendar, Play, Trash2 } from 'lucide-react';

const SearchVisualEffect = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-72 h-72 md:w-[400px] md:h-[400px] mx-auto relative z-0 flex flex-col items-center justify-center pointer-events-none"
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 90, 180, 270, 360]
          }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          className="absolute inset-0 border border-brand/10 rounded-full"
        />
        <motion.div
          animate={{
            scale: [1.1, 1, 1.1],
            rotate: [360, 270, 180, 90, 0]
          }}
          transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
          className="absolute inset-10 border border-brand/20 rounded-full border-dashed"
        />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-20 h-20 mb-2 relative">
            <div className="absolute inset-0 bg-brand/30 blur-xl animate-pulse rounded-full" />
            <div className="relative z-10 w-full h-full border border-white/20 hover:border-brand/40 bg-black/50 backdrop-blur-sm rounded-3xl flex items-center justify-center transition-colors">
              <span className="text-3xl font-black italic text-brand/80 drop-shadow-[0_0_15px_rgba(var(--brand-red-rgb),0.5)] flex items-center gap-1">
                <span className="text-5xl">F</span>
              </span>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-sec-text italic">System Scan Active</span>
        </div>
      </div>
    </motion.div>
  );
};

const NoResultsSuggestions = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { glassConfig } = useUI();

  const quickLinks = [
    { label: t('movies'), icon: <Film size={14} />, path: '/discover' },
    { label: t('tvShows'), icon: <Tv size={14} />, path: '/tv' },
    { label: t('dubbedMovies'), icon: <Mic2 size={14} />, path: '/dubbed' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto mt-12 p-8 border"
      style={{
        borderRadius: '32px',
        borderStyle: 'solid',
        borderColor: `rgba(var(--brand-red-rgb), ${glassConfig.borderOpacity})`,
        background: `radial-gradient(circle at 50% 0%, rgba(var(--brand-red-rgb), ${glassConfig.redOpacity}), transparent 85%), rgba(10, 10, 10, ${glassConfig.darkOpacity})`,
        backdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
        WebkitBackdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
        boxShadow: `
          inset 0 1px 0 0 rgba(255, 255, 255, ${0.1 + glassConfig.borderOpacity * 0.35}),
          inset 0 -1px 0 0 rgba(0, 0, 0, 0.4),
          0 20px 40px rgba(0,0,0,0.4)
        `
      }}
    >
      <div className="flex items-center gap-3 mb-6 justify-center">
        <Sparkles size={18} className="text-yellow-500 animate-pulse" />
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-sec-text">{t('securitySystemSuggestions')}</h3>
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {quickLinks.map((link, idx) => (
          <LiquidButton
            key={idx}
            variant="secondary"
            onClick={() => navigate(link.path)}
            className="!px-5 !py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
          >
            {link.icon}
            {link.label}
          </LiquidButton>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {GENRES_T.slice(0, 6).map((genre) => (
          <LiquidButton
            key={genre.id}
            variant="secondary"
            onClick={() => navigate(`/discover`)}
            className="!p-4 rounded-2xl text-[10px] font-black uppercase tracking-tighter italic"
          >
            {t(genre.nameKey)}
          </LiquidButton>
        ))}
      </div>
    </motion.div>
  );
};

const SearchPage: React.FC = () => {
  const [searchParams, searchParamsSetter] = useSearchParams();
  const queryParam = searchParams.get('query') || '';
  const [inputValue, setInputValue] = useState(queryParam);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);

  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { isAdmin, glassConfig } = useUI();
  const { addNotification } = useNotification();
  const { results, loading, isBlockedQuery, isProcessing, executeSearch, setResults, setIsProcessing } = useSearchEngine(language);

  useEffect(() => {
    const handleBannedUpdate = () => {
      executeSearch(inputValue);
    };
    window.addEventListener('banned-list-updated', handleBannedUpdate);
    return () => window.removeEventListener('banned-list-updated', handleBannedUpdate);
  }, [inputValue, executeSearch]);

  useEffect(() => {
    if (inputValue === queryParam && results.length > 0) {
      return;
    }
    if (inputValue.trim().length > 0) {
      setIsProcessing(true);
    }
    const timeout = setTimeout(() => {
      if (inputValue.trim() !== queryParam) {
        searchParamsSetter({ query: inputValue }, { replace: true });
      }
      executeSearch(inputValue);
    }, 600);
    return () => clearTimeout(timeout);
  }, [inputValue, executeSearch, searchParamsSetter, queryParam]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsSuggestionsVisible(e.target.value.trim().length > 1);
  };

  const handleClearInput = () => {
    setInputValue('');
    searchParamsSetter({});
    setResults([]);
    setIsProcessing(false);
  };

  const suggestions = results.slice(0, 6);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  return (
    <div className="min-h-screen pt-24 container mx-auto px-4 sm:px-6 lg:px-8 relative overflow-hidden pb-20 bg-main-bg">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand/5 filter blur-[150px] -z-10 animate-pulse"></div>

      <div className="relative mb-12 max-w-3xl mx-auto z-[60]">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-brand to-red-900 rounded-3xl blur opacity-10 group-hover:opacity-25 transition duration-1000"></div>
          <div 
            className="relative flex items-center overflow-hidden border transition-all duration-300"
            style={{
              borderRadius: '24px',
              borderStyle: 'solid',
              borderColor: `rgba(var(--brand-red-rgb), ${glassConfig.borderOpacity})`,
              background: `radial-gradient(circle at 50% 0%, rgba(var(--brand-red-rgb), ${glassConfig.redOpacity}), transparent 85%), rgba(10, 10, 10, ${glassConfig.darkOpacity})`,
              backdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
              WebkitBackdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
              boxShadow: `
                inset 0 1px 0 0 rgba(255, 255, 255, ${0.12 + glassConfig.borderOpacity * 0.45}),
                inset ${glassConfig.aberrationIntensity * 0.15}px 0 0.5px rgba(255, 0, 80, 0.08),
                inset -${glassConfig.aberrationIntensity * 0.15}px 0 0.5px rgba(0, 200, 255, 0.08),
                inset 0 -1px 0 0 rgba(0, 0, 0, 0.4),
                0 20px 40px rgba(0,0,0,0.5)
              `
            }}
          >
            {/* Dynamic GPU-accelerated water sheen overlay */}
            <div 
              className="absolute inset-[-100%] pointer-events-none mix-blend-overlay animate-[ios-glass-shine_25s_linear_infinite]"
              style={{
                background: `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, ${0.05 + (glassConfig.displacementScale / 120) * 0.15}) 0%, rgba(255, 255, 255, 0.01) 40%, transparent 70%)`,
                opacity: (glassConfig.displacementScale / 120) * 0.9,
                animationDuration: `${30 * (0.35 / Math.max(0.1, glassConfig.elasticity))}s`
              }}
            />

            <SearchIcon className={`absolute left-6 z-10 transition-all duration-500 ${isProcessing ? 'text-brand scale-110' : 'text-sec-text'}`} size={24} />
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => inputValue.trim().length > 1 && setIsSuggestionsVisible(true)}
              onBlur={() => setTimeout(() => setIsSuggestionsVisible(false), 250)}
              placeholder={t('searchPlaceholder')}
              className="w-full bg-transparent focus:ring-0 text-main-text rounded-2xl py-5 pr-14 pl-16 text-xl transition-all outline-none font-medium z-10"
            />

            <AnimatePresence>
              {isProcessing && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute right-20 hidden md:flex items-center gap-2 bg-brand/20 px-3 py-1.5 rounded-full border border-brand/30">
                  <Cpu size={14} className="text-brand animate-spin" />
                  <span className="text-[10px] font-black uppercase text-brand tracking-[0.2em] italic">Scanning</span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {inputValue && (
                <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="absolute right-6">
                  <LiquidButton variant="secondary" onClick={handleClearInput} className="!p-2 !h-auto !w-auto !min-h-0 !min-w-0 rounded-xl">
                    <X size={20} />
                  </LiquidButton>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Enhanced Auto-Suggestions */}
        <AnimatePresence>
          {isSuggestionsVisible && !isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className="absolute top-full mt-4 w-full border z-[100] overflow-hidden"
              style={{
                borderRadius: '32px',
                borderStyle: 'solid',
                borderColor: `rgba(var(--brand-red-rgb), ${glassConfig.borderOpacity})`,
                background: `radial-gradient(circle at 50% 0%, rgba(var(--brand-red-rgb), ${glassConfig.redOpacity}), transparent 85%), rgba(10, 10, 10, ${glassConfig.darkOpacity * 1.15})`,
                backdropFilter: `blur(${glassConfig.blurAmount * 1.2}px) saturate(${glassConfig.saturation}%)`,
                WebkitBackdropFilter: `blur(${glassConfig.blurAmount * 1.2}px) saturate(${glassConfig.saturation}%)`,
                boxShadow: `
                  inset 0 1px 0 0 rgba(255, 255, 255, ${0.12 + glassConfig.borderOpacity * 0.45}),
                  inset ${glassConfig.aberrationIntensity * 0.15}px 0 0.5px rgba(255, 0, 80, 0.08),
                  inset -${glassConfig.aberrationIntensity * 0.15}px 0 0.5px rgba(0, 200, 255, 0.08),
                  inset 0 -1px 0 0 rgba(0, 0, 0, 0.4),
                  0 50px 100px rgba(0, 0, 0, 0.8)
                `
              }}
            >
              {/* Dynamic GPU-accelerated water sheen overlay */}
              <div 
                className="absolute inset-[-100%] pointer-events-none mix-blend-overlay animate-[ios-glass-shine_25s_linear_infinite]"
                style={{
                  background: `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, ${0.05 + (glassConfig.displacementScale / 120) * 0.15}) 0%, rgba(255, 255, 255, 0.01) 40%, transparent 70%)`,
                  opacity: (glassConfig.displacementScale / 120) * 0.9,
                  animationDuration: `${30 * (0.35 / Math.max(0.1, glassConfig.elasticity))}s`
                }}
              />
              {suggestions.length > 0 ? (
                <>
                  <div className="px-6 py-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
                    <span className="text-[10px] font-black text-sec-text uppercase tracking-[0.3em] flex items-center gap-2">
                      <TrendingUp size={12} className="text-brand" /> Matches Found
                    </span>
                    <span className="text-[8px] font-bold text-sec-text uppercase tracking-widest">Select to Launch</span>
                  </div>
                  <ul className="max-h-[450px] overflow-y-auto scrollbar-hide divide-y divide-white/5">
                    {suggestions.map((item) => (
                      <li key={item.id}>
                        <button
                          onMouseDown={() => {
                            setInputValue(item.title || item.name || '');
                            setIsSuggestionsVisible(false);
                            if (item.media_type === 'dubbed') {
                              navigate(`/dubbed-details/${item.id}`, { state: { customData: item } });
                            } else {
                              navigate(`/details/${item.media_type}/${item.id}`);
                            }
                          }}
                          className="w-full text-left flex items-center gap-5 p-5 hover:bg-brand/10 transition-all group"
                        >
                          <div className="relative overflow-hidden rounded-xl shadow-xl border border-white/5 w-14 h-20 flex-shrink-0 bg-white/5">
                            <img 
                              src={item.poster_path?.startsWith('data:') ? item.poster_path : `${IMAGE_BASE_URL_POSTER}${item.poster_path}`} 
                              alt="" 
                              className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" 
                            />
                            {item.media_type === 'dubbed' && (
                              <div className="absolute top-1 right-1 bg-brand p-1 rounded-md shadow-lg">
                                <Mic2 size={8} className="text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-lg text-main-text group-hover:text-brand transition-colors truncate italic tracking-tighter">
                              {item.title || item.name}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                                <Calendar size={10} className="text-sec-text" />
                                <span className="text-[10px] font-bold text-sec-text uppercase tracking-tighter">
                                  {item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0] || 'N/A'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-0.5 rounded-lg border border-yellow-500/20">
                                <Star size={10} className="text-yellow-500 fill-current" />
                                <span className="text-[10px] font-black text-yellow-500">
                                  {item.vote_average?.toFixed(1) || '0.0'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-brand p-2 rounded-xl">
                            <Play size={16} fill="white" className="text-white" />
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="p-10 text-center">
                  <div className="mb-6 relative inline-block">
                    <AlertCircle size={40} className="text-brand/40" />
                  </div>
                  <h4 className="text-main-text text-lg font-black uppercase italic tracking-tighter mb-2">{t('noResultsFor')}</h4>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <SkeletonGrid count={6} />
        ) : isBlockedQuery ? (
          <motion.div key="blocked" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 px-6">
            <div className="max-w-3xl mx-auto bg-card-bg/40 backdrop-blur-3xl border-2 border-brand/30 rounded-[3rem] p-12 md:p-20 shadow-2xl overflow-hidden relative">
              <ShieldAlert size={100} className="text-brand mx-auto mb-10" />
              <h2 className="text-3xl md:text-5xl font-[1000] text-brand mb-6 uppercase italic">{t('securitySystemTitle')}</h2>
              <p className="text-xl md:text-2xl font-black text-main-text mb-12">{t('securitySystemMessage')}</p>
            </div>
          </motion.div>
        ) : inputValue && results.length > 0 ? (
          <motion.div key="results" variants={containerVariants} initial="hidden" animate="show" className="w-full">
            <div 
              className="flex items-center justify-between mb-12 p-8 border"
              style={{
                borderRadius: '32px',
                borderStyle: 'solid',
                borderColor: `rgba(var(--brand-red-rgb), ${glassConfig.borderOpacity})`,
                background: `radial-gradient(circle at 50% 0%, rgba(var(--brand-red-rgb), ${glassConfig.redOpacity}), transparent 85%), rgba(10, 10, 10, ${glassConfig.darkOpacity})`,
                backdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
                WebkitBackdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
                boxShadow: `
                  inset 0 1px 0 0 rgba(255, 255, 255, ${0.1 + glassConfig.borderOpacity * 0.35}),
                  inset 0 -1px 0 0 rgba(0, 0, 0, 0.4),
                  0 20px 40px rgba(0,0,0,0.4)
                `
              }}
            >
              <div className="flex items-center gap-6">
                <div className="bg-green-500/20 p-4 rounded-[1.5rem] border border-green-500/30">
                  <ShieldCheck className="text-green-500" size={32} />
                </div>
                <div>
                  <h2 className="text-3xl md:text-4xl font-[1000] tracking-tighter uppercase italic text-main-text">
                    {t('resultsFor')} <span className="text-brand">"{inputValue}"</span>
                  </h2>
                  <p className="text-[10px] font-black text-sec-text uppercase tracking-[0.3em] mt-1">{results.length} Nodes Identified</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
              {results.map((item) => (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  onClick={() => {
                    if (item.media_type === 'dubbed') {
                      navigate(`/dubbed-details/${item.id}`, { state: { customData: item } });
                    } else {
                      navigate(`/details/${item.media_type}/${item.id}`, { state: { customData: item } });
                    }
                  }}
                  className="cursor-pointer group relative bg-card-bg transition-all duration-500 rounded-[2.5rem] overflow-hidden border border-border-color hover:border-brand/50 shadow-2xl"
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ y: -10 }}
                >
                   <div className="aspect-[2/3] relative overflow-hidden bg-white/5">
                    <img 
                      src={item.poster_path?.startsWith('data:') ? item.poster_path : `${IMAGE_BASE_URL_POSTER}${item.poster_path}`} 
                      alt={item.title || item.name} 
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-80 group-hover:opacity-100" 
                      loading="lazy"
                    />

                    {/* Liquid Glass Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none border border-white/10 overflow-hidden">
                      <div 
                        className="absolute inset-[-100%] pointer-events-none mix-blend-overlay animate-[ios-glass-shine_25s_linear_infinite]"
                        style={{
                          background: `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, ${0.05 + (glassConfig.displacementScale / 120) * 0.15}) 0%, rgba(255, 255, 255, 0.01) 40%, transparent 70%)`,
                          opacity: (glassConfig.displacementScale / 120) * 0.9,
                          animationDuration: `${30 * (0.35 / Math.max(0.1, glassConfig.elasticity))}s`
                        }}
                      />
                    </div>

                    {/* IMDb Badge */}
                    {item.vote_average !== undefined && item.vote_average > 0 && (
                      <div className="absolute top-2 left-2 md:top-4 md:left-4 z-20 flex items-center gap-1 md:gap-1.5 bg-[#F5C518] text-black px-1.5 py-0.5 md:px-2 md:py-1 rounded-md shadow-[0_4px_10px_rgba(0,0,0,0.5)] border border-[#F5C518]/30">
                        <span className="font-[1000] text-[7px] md:text-[10px] uppercase tracking-widest leading-none">IMDb</span>
                        <span className="font-black text-[8px] md:text-xs leading-none">{item.vote_average.toFixed(1)}</span>
                      </div>
                    )}

                    {/* Kurdish CC Badge (Auto-detect via queue) */}
                    {!String(item.id).startsWith('custom_') && (
                      <div className="z-20 relative">
                        <KurdishCCBadge tmdbId={Number(item.id)} type={(item.media_type as 'movie' | 'tv') || 'movie'} />
                      </div>
                    )}
                    
                    <div className="absolute top-4 right-4 z-30 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        {item.media_type === 'dubbed' && (
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="flex items-center gap-2 px-3 py-1 bg-brand rounded-full shadow-[0_0_20px_rgba(var(--brand-red-rgb),0.5)] border border-white/20"
                          >
                            <Mic2 size={12} className="text-white" />
                            <span className="text-[10px] font-black uppercase text-white tracking-widest">DUBBED</span>
                          </motion.div>
                        )}

                        {isAdmin && (
                          <LiquidButton
                            variant="destructive"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const cleanId = String(item.id).replace('custom_', '');
                              const mediaType = item.media_type || (String(item.id).startsWith('custom_') ? 'dubbed' : 'movie');
                              if (window.confirm(`TERMINATE NODE ${cleanId}? [GLOBAL BAN]`)) {
                                try {
                                  const success = await bannedService.banContent(cleanId, mediaType);
                                  if (success) {
                                    addNotification({ type: 'success', title: 'NODE PURGED', message: 'Content removed globally.' });
                                    clearTMDBCache();
                                    setResults(prev => prev.filter(r => r.id !== item.id));
                                  }
                                } catch (err) {
                                  console.error("Ban failed:", err);
                                }
                              }
                            }}
                            className="!p-2 !h-auto !w-auto !min-h-0 !min-w-0 rounded-xl"
                          >
                            <Trash2 className="w-4 h-4" />
                          </LiquidButton>
                        )}
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-100 flex flex-col justify-end p-6">
                      <Portal id="notification-portal">
                        <div className="fixed top-24 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-10 sm:top-28 z-[200] w-full max-w-sm space-y-4 pointer-events-none px-4 sm:px-0">
                        </div>
                      </Portal>
                      <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        <p className="text-white text-sm md:text-lg font-[1000] uppercase italic tracking-tighter leading-none mb-3 line-clamp-2 drop-shadow-lg">
                          {item.title || item.name}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : inputValue && !loading ? (
          <motion.div key="no-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-20 text-center">
            <SearchVisualEffect />
            <div className="relative z-10">
              <AlertCircle size={64} className="mx-auto text-brand/50 mb-6 animate-bounce" />
              <h2 className="text-2xl md:text-5xl font-[1000] text-main-text uppercase italic tracking-tighter mb-4">
                {t('noResultsFor')} <span className="text-brand">"{inputValue}"</span>
              </h2>
              <NoResultsSuggestions />
            </div>
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center pt-10 relative">
            <SearchVisualEffect />
            <div className="relative -mt-12">
              <h2 className="text-4xl md:text-7xl font-[1000] uppercase tracking-tighter text-main-text italic drop-shadow-[0_0_20px_rgba(229,9,20,0.3)]">{t('search')}</h2>
              <div className="mt-10 flex flex-col items-center gap-4">
                <div className="h-1 w-24 bg-brand rounded-full shadow-[0_0_15px_brand] animate-pulse"></div>
                <p className="text-sec-text font-black uppercase tracking-[0.4em] text-[10px] md:text-xs">Deep Neural Sequence Engine Active</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchPage;