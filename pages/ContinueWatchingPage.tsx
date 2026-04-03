
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Trash2, Zap, ArrowLeft, Stars } from 'lucide-react';
import { WatchProgress } from '../types';
import { IMAGE_BASE_URL_POSTER } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import Spinner from '../components/Spinner';

const ContinueWatchingPage: React.FC = () => {
    const [items, setItems] = useState<WatchProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { t, language } = useTranslation();
    const { addNotification } = useNotification();

    const loadItems = React.useCallback(() => {
        try {
            const data = localStorage.getItem('watchProgress');
            if (data) {
                const progress: WatchProgress[] = JSON.parse(data);
                // Filter unfinished items
                const unfinished = progress.filter(i => i.progress > 5 && i.progress < i.duration * 0.98);
                setItems(unfinished.sort((a, b) => b.lastWatched - a.lastWatched));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadItems();
        window.addEventListener('storage', loadItems);
        return () => window.removeEventListener('storage', loadItems);
    }, [loadItems]);

    const handleRemove = (e: React.MouseEvent, id: number, type: string) => {
        e.stopPropagation();
        const progress = JSON.parse(localStorage.getItem('watchProgress') || '[]');
        const updated = progress.filter((i: WatchProgress) => !(i.id === id && String(i.type) === type));
        localStorage.setItem('watchProgress', JSON.stringify(updated));
        setItems(prev => prev.filter(i => !(i.id === id && String(i.type) === type)));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('watchProgressUpdated'));
        addNotification({ type: 'info', title: 'Transmission Cleared', message: t('removeFromProgress') });
    };

    const handleResume = (item: WatchProgress) => {
        if (String(item.type) === 'dubbed') {
            navigate(`/dubbed-details/${item.id}`);
        } else {
            navigate(`/details/${item.type}/${item.id}`);
        }
    };

    const clearAll = () => {
        if (window.confirm("Nuclear Wipe: Clear all active transmissions?")) {
            localStorage.setItem('watchProgress', '[]');
            setItems([]);
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('watchProgressUpdated'));
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-black"><Spinner /></div>;

    return (
        <div className="min-h-screen pt-32 pb-40 container mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className={`absolute top-24 ${language === 'ku' ? 'right-8 md:right-20' : 'left-8 md:left-20'} z-50`}>
                <button 
                  onClick={() => navigate(-1)} 
                  className="flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-red-600 text-white px-5 py-3 rounded-2xl transition-all shadow-2xl group active:scale-95"
                >
                  {language === 'ku' ? <ArrowLeft size={20} className="rotate-180 group-hover:translate-x-1 transition-transform" /> : <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />}
                  <span className="text-[10px] font-black uppercase tracking-widest">{t('back')}</span>
                </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-600/20 rounded-xl border border-red-600/20">
                            <Zap size={20} className="text-red-500 animate-pulse" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 italic">Active Neural Link Logs</span>
                    </div>
                    <h2 className="text-4xl md:text-7xl font-[1000] uppercase italic tracking-tighter">
                        {t('continueWatching')}
                    </h2>
                </div>
                
                {items.length > 0 && (
                    <button 
                        onClick={clearAll}
                        className="flex items-center gap-3 bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white border border-red-600/20 px-8 py-4 rounded-2xl font-black transition-all shadow-xl uppercase italic tracking-widest text-xs"
                    >
                        <Trash2 size={18} />
                        Clear All Archive
                    </button>
                )}
            </div>

            {items.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
                    {items.map((item, index) => {
                        const progressPct = Math.min(100, (item.progress / item.duration) * 100);
                        const isDubbed = String(item.type) === 'dubbed';
                        return (
                            <motion.div
                                key={`${item.id}-${item.type}`}
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => handleResume(item)}
                                className="cursor-pointer group relative transform transition-all duration-500"
                                whileHover={{ scale: 1.08, zIndex: 30 }}
                            >
                                <div className="aspect-[2/3] overflow-hidden rounded-[2.5rem] border-2 border-white/5 group-hover:border-red-600/50 group-hover:shadow-[0_0_30px_rgba(229,9,20,0.4)] shadow-2xl transition-all relative bg-black">
                                    <img
                                        src={item.poster_path?.startsWith('http') ? item.poster_path : `${IMAGE_BASE_URL_POSTER}${item.poster_path}`}
                                        alt={item.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <button
                                            onClick={(e) => handleRemove(e, item.id, String(item.type))}
                                            className="p-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-xl flex items-center justify-center transition-transform active:scale-90"
                                            title={t('removeFromProgress')}
                                        >
                                            <X size={18} strokeWidth={3} />
                                        </button>
                                    </div>

                                    {isDubbed && (
                                        <div className="absolute top-3 left-3 bg-red-600 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg">
                                            DUBBED
                                        </div>
                                    )}

                                    <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/60 backdrop-blur-md z-20">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progressPct}%` }}
                                            className="h-full bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_15px_#e50914]"
                                        />
                                    </div>

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6">
                                        <p className="text-white text-sm font-black uppercase italic truncate mb-2">{item.title}</p>
                                        <div className="flex items-center gap-2">
                                            <div className="bg-red-600 p-1.5 rounded-full"><Play size={10} fill="white" className="text-white" /></div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Resume Link</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between px-2">
                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest italic">{Math.floor(progressPct)}% Complete</span>
                                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{Math.floor((item.duration - item.progress) / 60)}m Left</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-40 bg-white/[0.02] border border-white/5 rounded-[4rem] backdrop-blur-xl">
                    <Stars size={64} className="mx-auto text-gray-800 mb-8 animate-pulse" />
                    <p className="text-gray-500 font-black uppercase tracking-[0.3em] text-lg">No Active Transmissions Found</p>
                </div>
            )}
        </div>
    );
};

export default ContinueWatchingPage;
