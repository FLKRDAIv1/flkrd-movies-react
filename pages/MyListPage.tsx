
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, Link as LinkIcon, Trash2, ShieldCheck, Stars, Copy, MessageCircle, X, ExternalLink, ArrowRight, Play, Check, Plus, ArrowLeft } from 'lucide-react';
import { MyListItem } from '../types';
import { IMAGE_BASE_URL_POSTER, API_KEY } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { fetchData } from '../services/tmdbService';
import Spinner from '../components/Spinner';
import { LiquidButton } from '../components/ui/liquid-glass-button';
import { isTauri } from '../utils/tauriUtils';

const MyListPage: React.FC = () => {
    const [myListItems, setMyListItems] = useState<MyListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { t, language } = useTranslation();
    const { addNotification } = useNotification();
    
    const sharedData = searchParams.get('share');
    const isSharedView = !!sharedData;

    const loadMyList = React.useCallback(() => {
        if (isSharedView && sharedData) {
            setLoading(true);
            try {
                const decoded = atob(decodeURIComponent(sharedData));
                const items: MyListItem[] = JSON.parse(decoded);
                setMyListItems(items);
            } catch (err) {
                console.error("Failed to parse shared list", err);
                addNotification({ type: 'error', title: 'Invalid Link', message: 'Broken link' });
            } finally {
                setLoading(false);
            }
            return;
        }

        try {
            const myList = localStorage.getItem('myList');
            if (myList) {
                setMyListItems(JSON.parse(myList));
            } else {
                setMyListItems([]);
            }
        } catch (error) {
            setMyListItems([]);
        }
    }, [isSharedView, sharedData, addNotification]);

    useEffect(() => {
        loadMyList();
        if (!isSharedView) {
            window.addEventListener('storage', loadMyList);
            return () => window.removeEventListener('storage', loadMyList);
        }
    }, [loadMyList, isSharedView]);

    const handleToggleItem = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        const updated = myListItems.filter(item => item.id !== id);
        localStorage.setItem('myList', JSON.stringify(updated));
        setMyListItems(updated);
        window.dispatchEvent(new Event('storage'));
        addNotification({ type: 'info', title: t('notificationsInfoTitle'), message: t('myListRemoveSuccess') });
    };

    const getShareUrl = () => {
        const jsonStr = JSON.stringify(myListItems);
        const encoded = encodeURIComponent(btoa(jsonStr));
        const routePrefix = isTauri() ? '/#/my-list' : '/my-list';
        return `${window.location.origin}${routePrefix}?share=${encoded}`;
    };

    const clearMyList = () => {
        if (confirm("System Wipe: Clear your watchlist?")) {
            localStorage.setItem('myList', '[]');
            setMyListItems([]);
            window.dispatchEvent(new Event('storage'));
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-black"><Spinner /></div>;

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
                            <ShieldCheck size={20} className="text-red-500" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
                            {isSharedView ? "External Archive Log" : "Vault Collection"}
                        </span>
                    </div>
                    <h2 className="text-4xl md:text-7xl font-[1000] uppercase italic tracking-tighter">
                        {isSharedView ? "Shared Archive" : t('myList')}
                    </h2>
                </div>
                
                <div className="flex items-center gap-4">
                    {myListItems.length > 0 && !isSharedView && (
                        <LiquidButton 
                            variant="default"
                            onClick={() => setShowShareModal(true)}
                            className="!py-4 !px-8 rounded-2xl flex items-center gap-3 uppercase italic tracking-widest text-xs"
                        >
                            <Share size={18} />
                            Share Protocol
                        </LiquidButton>
                    )}
                    {!isSharedView && myListItems.length > 0 && (
                        <LiquidButton 
                            variant="secondary"
                            onClick={clearMyList}
                            className="!p-4 !h-auto !w-auto !min-h-0 !min-w-0 rounded-2xl"
                        >
                            <Trash2 size={24} className="text-sec-text hover:text-brand transition-colors" />
                        </LiquidButton>
                    )}
                </div>
            </div>

            {myListItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
                    {myListItems.map((item, index) => (
                        <motion.div
                            key={`${item.id}-${index}`}
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => navigate(`/details/${item.media_type}/${item.id}`)}
                            className="cursor-pointer group relative transform transition-all duration-500"
                            whileHover={{ scale: 1.08, zIndex: 30 }}
                        >
                            <div className="aspect-[2/3] overflow-hidden rounded-[2.5rem] border-2 border-white/5 group-hover:border-brand/50 shadow-2xl transition-all relative">
                                <img
                                    src={item.poster_path.startsWith('http') ? item.poster_path : `${IMAGE_BASE_URL_POSTER}${item.poster_path}`}
                                    alt={item.title || item.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />

                                {/* Liquid Glass Hover Overlay */}
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none border border-white/10" />
                                
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                                    <LiquidButton
                                        variant="destructive"
                                        onClick={(e) => handleToggleItem(e, item.id)}
                                        className="!p-2.5 !h-auto !w-auto !min-h-0 !min-w-0 rounded-xl"
                                    >
                                        <X size={18} strokeWidth={3} />
                                    </LiquidButton>
                                </div>

                                <div className="absolute inset-0 z-20 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6 pointer-events-none">
                                    <p className="text-white text-sm font-black uppercase italic truncate mb-2">{item.title || item.name}</p>
                                    <div className="flex items-center gap-2">
                                        <div className="bg-brand p-1.5 rounded-full"><Play size={10} fill="white" className="text-white" /></div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-sec-text">Watch Now</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-40 bg-white/[0.02] border border-white/5 rounded-[4rem] backdrop-blur-xl">
                    <Stars size={64} className="mx-auto text-gray-800 mb-8 animate-pulse" />
                    <p className="text-gray-500 font-black uppercase tracking-[0.3em] text-lg">{t('myListEmpty')}</p>
                </div>
            )}

            <AnimatePresence>
                {showShareModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowShareModal(false)} className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[150] flex items-center justify-center p-6">
                        <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} onClick={e => e.stopPropagation()} className="bg-[#111] border border-white/10 rounded-[3rem] p-10 w-full max-w-sm shadow-2xl">
                             <h3 className="text-3xl font-[1000] uppercase tracking-tighter italic mb-6">Share Sync</h3>
                             <button onClick={() => { navigator.clipboard.writeText(getShareUrl()); addNotification({type: 'success', title: 'Copied', message: 'Link ready'}); setShowShareModal(false); }} className="w-full flex items-center justify-between p-6 bg-white/5 rounded-3xl mb-4">
                                <span className="text-xs font-black uppercase">Copy Deep Link</span>
                                <Copy size={18} />
                             </button>
                             <button onClick={() => setShowShareModal(false)} className="w-full py-4 text-gray-500 text-[10px] font-black uppercase">Close</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MyListPage;
