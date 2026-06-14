
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Trash2, Zap, ArrowLeft, Stars } from 'lucide-react';
import { WatchProgress } from '../types';
import { IMAGE_BASE_URL_POSTER } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { useUI } from '../contexts/UIContext';
import { SkeletonGrid } from '../components/Skeleton';
import { LiquidButton } from '../components/ui/liquid-glass-button';
import MovieCard from '../components/MovieCard';

const ContinueWatchingPage: React.FC = () => {
    const [items, setItems] = useState<WatchProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { t, language } = useTranslation();
    const { addNotification } = useNotification();
    const { glassConfig = {
        redOpacity: 0.15,
        darkOpacity: 0.85,
        blurAmount: 20,
        saturation: 120,
        borderOpacity: 0.1,
        aberrationIntensity: 0.5
    } } = useUI();

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

    if (loading) return <SkeletonGrid title={t('continueWatching') || 'Continue Watching'} count={6} />;

    return (
        <div className="min-h-screen pt-32 pb-40 container mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className={`absolute top-24 ${(language === 'ku' || language === 'badini') ? 'right-8 md:right-20' : 'left-8 md:left-20'} z-50`}>
                <LiquidButton 
                  variant="secondary"
                  onClick={() => navigate(-1)} 
                  className="!px-5 !py-3 rounded-2xl flex items-center gap-2"
                >
                  {(language === 'ku' || language === 'badini') ? <ArrowLeft size={20} className="rotate-180" /> : <ArrowLeft size={20} />}
                  <span className="text-[10px] font-black uppercase tracking-widest">{t('back')}</span>
                </LiquidButton>
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
                    <LiquidButton 
                        variant="destructive"
                        onClick={clearAll}
                        className="!px-8 !py-4 rounded-2xl flex items-center gap-3 uppercase italic tracking-widest text-xs"
                    >
                        <Trash2 size={18} />
                        Clear All Archive
                    </LiquidButton>
                )}
            </div>

            {items.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-10">
                    {items.map((item, index) => {
                        const progressPct = Math.min(100, (item.progress / item.duration) * 100);
                        return (
                            <div key={`${item.id}-${item.type}`} className="flex flex-col animate-[fade-in_0.5s_ease-out]">
                                <MovieCard
                                    item={item}
                                    type={item.type as any}
                                    isProgressRow={true}
                                    className="w-full"
                                />
                                <div className="mt-2 flex items-center justify-between px-2">
                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest italic">{Math.floor(progressPct)}% Complete</span>
                                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{Math.floor((item.duration - item.progress) / 60)}m Left</span>
                                </div>
                            </div>
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
