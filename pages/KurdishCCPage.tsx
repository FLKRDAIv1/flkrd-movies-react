import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Subtitles, ArrowRight, ArrowLeft, Trash2, Clapperboard, MonitorPlay } from 'lucide-react';
import { kurdishCcService, KurdishCCEntry } from '../services/kurdishCcService';
import { IMAGE_BASE_URL_POSTER } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import Spinner from '../components/Spinner';

const KurdishCCPage: React.FC = () => {
    const [items, setItems] = useState<KurdishCCEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { t, language } = useTranslation();
    const { isAdmin } = useUI();
    const { addNotification } = useNotification();
    const isRtl = language === 'ku';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await kurdishCcService.getAll();
        setItems(data);
        setLoading(false);
    };

    const handleRemove = async (e: React.MouseEvent, tmdbId: number) => {
        e.stopPropagation();
        if (!window.confirm('Remove from Kurdish CC Registry?')) return;
        
        const success = await kurdishCcService.remove(tmdbId);
        if (success) {
            setItems(prev => prev.filter(item => item.tmdb_id !== tmdbId));
            addNotification({ type: 'success', title: 'Removed', message: 'Movie removed from registry.' });
        }
    };

    const ColorMixtureDivider = () => (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60">
            <motion.div 
                animate={{ x: [-40, 60, -40], y: [-20, 30, -20], scale: [1, 1.2, 1] }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute -left-20 -top-20 w-[500px] h-[500px] bg-red-600/20 rounded-full blur-[120px]"
            />
            <motion.div 
                animate={{ x: [40, -60, 40], y: [30, -20, 30], scale: [1.2, 1, 1.2] }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="absolute -right-20 -bottom-20 w-[600px] h-[600px] bg-brand/30 rounded-full blur-[140px]"
            />
        </div>
    );

    return (
        <div className="min-h-screen pt-24 container mx-auto px-4 sm:px-6 lg:px-8 relative pb-32 bg-main-bg">
            <ColorMixtureDivider />
            
            <div className={`sticky top-20 md:top-24 z-[45] mb-12 transition-all duration-500`}>
                <div className="relative overflow-hidden backdrop-blur-[100px] rounded-[3rem] bg-card-bg/80 border border-border-color p-8 shadow-2xl">
                    <div className={`relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 ${isRtl ? 'md:flex-row-reverse text-right' : 'text-left'}`}>
                        <div className={`flex items-center gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className="p-4 bg-red-600/20 rounded-2xl border border-red-500/30">
                                <Subtitles className="w-8 h-8 text-red-500" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-5xl font-[1000] text-main-text uppercase italic tracking-tighter leading-none mb-2">
                                    {isRtl ? 'ژێرنووسی کوردی' : 'Kurdish Subtitles'}
                                </h1>
                                <p className="text-sec-text font-bold text-sm tracking-widest uppercase">
                                    {isRtl ? 'تەنها ئەو فیلمانەی ژێرنووسی کوردییان هەیە' : 'Strictly Curated Kurdish CC Collection'}
                                </p>
                            </div>
                        </div>
                        <button onClick={() => navigate('/')} className="bg-white/5 text-main-text rounded-xl p-4 md:p-5 border border-border-color hover:bg-brand transition-all">
                            {isRtl ? <ArrowRight size={24} /> : <ArrowLeft size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-6 relative z-10">
                    <Spinner size="lg" />
                    <span className="text-sec-text font-black uppercase tracking-[0.5em] animate-pulse text-sm">Syncing Registry...</span>
                </div>
            ) : items.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-8 relative z-10">
                    {items.map((item, index) => (
                        <motion.div
                            key={`${item.tmdb_id}-${index}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => navigate(`/details/${item.media_type}/${item.tmdb_id}`)}
                            className="cursor-pointer group relative"
                            whileHover={{ y: -8, scale: 1.02 }}
                        >
                            <div className="relative aspect-[2/3] overflow-hidden rounded-[2rem] border-2 border-border-color group-hover:border-red-500/50 transition-all duration-700 shadow-2xl">
                                {item.poster_path ? (
                                    <img src={`${IMAGE_BASE_URL_POSTER}${item.poster_path}`} alt={item.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" loading="lazy" />
                                ) : (
                                    <div className="w-full h-full bg-box-bg flex items-center justify-center">
                                        {item.media_type === 'movie' ? <Clapperboard size={40} className="text-sec-text/30" /> : <MonitorPlay size={40} className="text-sec-text/30" />}
                                    </div>
                                )}
                                
                                <div className="absolute top-4 left-4 z-30">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-600/90 backdrop-blur-md rounded-xl border border-red-500/50 shadow-[0_4px_15px_rgba(229,9,20,0.4)]">
                                        <Subtitles size={12} className="text-white" />
                                        <span className="text-[9px] font-black text-white uppercase tracking-wider">KU CC</span>
                                    </div>
                                </div>

                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-5">
                                    <p className="text-white text-[10px] md:text-xs font-black uppercase italic truncate mb-2">{item.title}</p>
                                </div>

                                {isAdmin && (
                                    <div className="absolute top-4 right-4 z-50 opacity-0 group-hover:opacity-100 transition-all">
                                        <button 
                                            onClick={(e) => handleRemove(e, item.tmdb_id)}
                                            className="p-3 bg-red-600/80 backdrop-blur-md rounded-2xl text-white border border-red-500 shadow-[0_0_20px_rgba(255,0,0,0.3)] hover:bg-red-600 hover:scale-110 active:scale-95 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-32 bg-box-bg border border-border-color rounded-[3rem] shadow-2xl relative z-10">
                    <Subtitles className="w-16 h-16 text-sec-text/50 mx-auto mb-6" />
                    <h2 className="text-xl md:text-2xl font-black text-sec-text uppercase italic">
                        {isRtl ? 'هیچ فیلمێک تۆمار نەکراوە' : 'No Kurdish CC Movies Registered Yet'}
                    </h2>
                    <p className="text-sec-text mt-4 max-w-md mx-auto text-sm">
                        {isRtl ? 'بە شێوەیەکی ئۆتۆماتیکی فیلمەکان لێرە زیاد دەکرێن کاتێک بەکارهێنەران سەیریان دەکەن.' : 'Movies will automatically appear here once users discover them with Kurdish subtitles.'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default KurdishCCPage;
