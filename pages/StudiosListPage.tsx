
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { STUDIOS } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import { Film, Sparkles, Stars, Zap, Globe, Sword } from 'lucide-react';

const StudiosListPage: React.FC = () => {
  const { t } = useTranslation();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    show: { opacity: 1, scale: 1, y: 0 }
  };

  return (
    <div className="min-h-screen pt-24 container mx-auto px-4 sm:px-6 lg:px-8 pb-32">
      <div className="flex flex-col items-center mb-16 text-center">
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-600/10 border border-red-600/20 px-4 py-1.5 rounded-full mb-6"
        >
            <span className="text-red-500 text-xs font-black uppercase tracking-[0.4em]">Official Partners</span>
        </motion.div>
        <motion.h2 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-4xl md:text-7xl font-[1000] mb-4 uppercase italic tracking-tighter"
        >
            {t('studios')}
        </motion.h2>
        <p className="text-gray-500 max-w-xl font-medium">Explore the legendary archives of the world's most iconic production houses. Every brand is a unique world of storytelling.</p>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8"
      >
        {STUDIOS.map(studio => (
          <motion.div key={studio.id} variants={itemVariants}>
            <Link
              to={`/studio/${studio.id}/${encodeURIComponent(studio.name)}`}
              className="group relative block aspect-[4/3] sm:aspect-video rounded-[2rem] overflow-hidden bg-[#0c0c0c] border border-white/5 transition-all duration-500 hover:border-white/20 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
            >
                {/* Brand Background Glow */}
                <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-3xl pointer-events-none"
                    style={{ backgroundColor: (studio as any).color || '#ffffff' }}
                ></div>

                {/* Glass Layer */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent"></div>

                {/* Content Container */}
                <div className="relative h-full w-full flex flex-col items-center justify-center p-6 text-center">
                    <div className="relative mb-4 group-hover:scale-110 transition-transform duration-500">
                        {studio.name === 'Nickelodeon' ? (
                            <div className="relative">
                                <Zap className="w-12 h-12 md:w-16 md:h-16 text-[#FF6600]" strokeWidth={2.5} />
                                <motion.div 
                                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="absolute inset-0 bg-[#FF6600]/20 rounded-full blur-xl"
                                />
                            </div>
                        ) : studio.name === 'Lucasfilm' ? (
                            <Sword className="w-12 h-12 md:w-16 md:h-16 text-gray-300 group-hover:text-blue-200 transition-colors" />
                        ) : studio.name === 'National Geographic' ? (
                            <Globe className="w-12 h-12 md:w-16 md:h-16 text-[#FFCC00] group-hover:rotate-12 transition-transform duration-700" />
                        ) : studio.name.includes('Disney') || studio.name.includes('Pixar') ? (
                            <Stars className="w-12 h-12 md:w-16 md:h-16 text-gray-300 group-hover:text-blue-400 transition-colors" />
                        ) : studio.name.includes('Marvel') ? (
                            <Sparkles className="w-12 h-12 md:w-16 md:h-16 text-gray-300 group-hover:text-red-600 transition-colors" />
                        ) : (
                            <Film className="w-12 h-12 md:w-16 md:h-16 text-gray-400 group-hover:text-white transition-colors" />
                        )}
                    </div>
                    
                    <h3 className="text-white text-sm md:text-lg font-black uppercase tracking-tighter leading-tight italic group-hover:translate-y-[-4px] transition-transform">
                        {studio.name}
                    </h3>
                    
                    <div className="mt-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="h-1 w-1 rounded-full bg-red-600"></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Enter Vault</span>
                    </div>
                </div>

                {/* Animation Highlights */}
                {studio.name === 'Nickelodeon' && (
                    <div className="absolute top-4 right-4 bg-[#FF6600] text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                        Animation
                    </div>
                )}
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default StudiosListPage;
