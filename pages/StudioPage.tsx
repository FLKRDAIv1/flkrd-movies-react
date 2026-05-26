
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Zap, Sparkles, Stars, Globe, Sword, ChevronLeft, Plus, Check, Play } from 'lucide-react';
import { Content, Studio as StudioType, MyListItem } from '../types';
import { fetchData } from '../services/tmdbService';
import { fetchByStudio, IMAGE_BASE_URL_POSTER, IMAGE_BASE_URL_LOGO, API_KEY, API_BASE_URL, STUDIOS } from '../constants';
import Spinner from '../components/Spinner';
import { useTranslation } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';

const StudioPage: React.FC = () => {
    const { id, name } = useParams<{ id: string; name: string }>();
    const [studio, setStudio] = useState<StudioType | null>(null);
    const [results, setResults] = useState<Content[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [myListIds, setMyListIds] = useState<Set<number>>(new Set());
    
    const navigate = useNavigate();
    const { t, language } = useTranslation();
    const { addNotification } = useNotification();
    const langCode = language === 'ku' ? 'ku' : 'en-US';

    const observer = useRef<IntersectionObserver | null>(null);
    const partnerStudio = STUDIOS.find(s => String(s.id) === String(id));
    const brandColor = partnerStudio?.color || '#333333';

    const updateMyListIds = useCallback(() => {
        const myList = JSON.parse(localStorage.getItem('myList') || '[]');
        setMyListIds(new Set(myList.map((item: any) => item.id)));
    }, []);

    useEffect(() => {
        updateMyListIds();
        window.addEventListener('storage', updateMyListIds);
        return () => window.removeEventListener('storage', updateMyListIds);
    }, [updateMyListIds]);

    const handleToggleMyList = (e: React.MouseEvent, item: Content) => {
        e.stopPropagation();
        let myList: MyListItem[] = JSON.parse(localStorage.getItem('myList') || '[]');
        const index = myList.findIndex(i => i.id === item.id);
        
        if (index > -1) {
            myList.splice(index, 1);
            addNotification({ type: 'info', title: t('notificationsInfoTitle'), message: t('myListRemoveSuccess') });
        } else {
            myList.push({ 
                id: item.id, 
                media_type: item.media_type || 'movie', 
                title: item.title || item.name || '', 
                poster_path: item.poster_path 
            });
            addNotification({ type: 'success', title: t('notificationsSuccessTitle'), message: t('myListAddSuccess') });
        }
        
        localStorage.setItem('myList', JSON.stringify(myList));
        updateMyListIds();
        window.dispatchEvent(new Event('storage'));
    };

    const handleLoadMore = useCallback(() => {
        if (!id || loadingMore || !hasMore) return;
        setLoadingMore(true);
        const nextPage = page + 1;
        const endpoint = fetchByStudio(id, langCode, nextPage);
        fetchData(endpoint, language)
            .then(data => {
                if (data && Array.isArray(data) && data.length > 0) {
                    setResults(prev => [...prev, ...data]);
                    setPage(nextPage);
                    if (data.length < 20) {
                        setHasMore(false);
                    }
                } else {
                    setHasMore(false);
                }
            })
            .catch(error => {
                console.error("Failed to load more studio content:", error);
            })
            .finally(() => {
                setLoadingMore(false);
            });
    }, [id, langCode, language, page, hasMore, loadingMore]);

    const lastElementRef = useCallback((node: HTMLDivElement) => {
        if (loadingMore) return;
        if (observer.current) observer.current.disconnect();
        
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                handleLoadMore();
            }
        });
        
        if (node) observer.current.observe(node);
    }, [loadingMore, hasMore, handleLoadMore]);

    useEffect(() => {
        const fetchStudioDetails = async () => {
            if (!id) return;
            try {
                const response = await fetch(`${API_BASE_URL}/company/${id}?api_key=${API_KEY}`);
                if (response.ok) {
                    const studioData = await response.json();
                    setStudio(studioData);
                }
            } catch (error) {
                console.error("Error fetching studio details:", error);
            }
        };
        fetchStudioDetails();
    }, [id]);

    useEffect(() => {
        const fetchStudioContent = async () => {
            if (!id) return;
            setLoading(true);
            setResults([]);
            setPage(1);
            setHasMore(true);
            
            const endpoint = fetchByStudio(id, langCode, 1);
            const data = await fetchData(endpoint, language);
            if (data && Array.isArray(data)) {
                setResults(data);
                if(data.length < 20) setHasMore(false);
            } else {
                setResults([]);
                setHasMore(false);
            }
            setLoading(false);
        };

        fetchStudioContent();
        const mainEl = document.querySelector('main');
        if (mainEl) {
            mainEl.scrollTo({ top: 0, behavior: 'instant' });
        }
    }, [id, langCode, language]);

    const getBrandIcon = () => {
        const sName = studio?.name || name || '';
        if (sName.includes('Nickelodeon')) return <Zap className="w-16 h-16 md:w-24 md:h-24 text-[#FF6600]" strokeWidth={2.5} />;
        if (sName.includes('Lucasfilm')) return <Sword className="w-16 h-16 md:w-24 md:h-24 text-gray-300" />;
        if (sName.includes('National Geographic')) return <Globe className="w-16 h-16 md:w-24 md:h-24 text-[#FFCC00]" />;
        if (sName.includes('Marvel')) return <Sparkles className="w-16 h-16 md:w-24 md:h-24 text-red-600" />;
        if (sName.includes('Disney') || sName.includes('Pixar')) return <Stars className="w-16 h-16 md:w-24 md:h-24 text-blue-400" />;
        return <Film className="w-16 h-16 md:w-24 md:h-24 text-gray-500" />;
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
    }

    return (
        <div className="min-h-screen container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32 relative">
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative h-64 md:h-80 rounded-[3rem] overflow-hidden mb-16 flex flex-col items-center justify-center p-6 bg-[#0a0a0a] border border-white/5 shadow-2xl group"
            >
                <div 
                    className="absolute inset-0 opacity-20 blur-3xl pointer-events-none transition-all duration-1000"
                    style={{ background: `radial-gradient(circle at center, ${brandColor}, transparent)` }}
                ></div>
                
                <button 
                    onClick={() => navigate('/studios')} 
                    className="absolute top-6 left-6 z-20 p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all backdrop-blur-xl border border-white/10"
                >
                    <ChevronLeft size={20} />
                </button>

                <div className="relative z-10 text-center">
                    {studio?.logo_path ? (
                         <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative">
                            <img src={`${IMAGE_BASE_URL_LOGO}${studio.logo_path}`} alt="" className="h-16 md:h-24 object-contain mx-auto" />
                         </motion.div>
                    ) : (
                        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>{getBrandIcon()}</motion.div>
                    )}
                     <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-4xl md:text-6xl font-[1000] mt-6 uppercase italic tracking-tighter drop-shadow-2xl">
                        {studio?.name || decodeURIComponent(name || '')}
                    </motion.h2>
                    <motion.div initial={{ width: 0 }} animate={{ width: "100px" }} className="h-1.5 bg-red-600 mx-auto mt-4 rounded-full shadow-[0_0_15px_rgba(229,9,20,0.5)]" />
                </div>
            </motion.div>
            
            {results.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
                    {results.map((item, index) => {
                        const isAdded = myListIds.has(item.id);
                        return (
                            <motion.div
                                key={`${item.id}-${index}`}
                                ref={index === results.length - 1 ? lastElementRef : null}
                                onClick={() => navigate(`/details/${item.media_type || 'movie'}/${item.id}`)}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: (index % 12) * 0.05 }}
                                className="cursor-pointer group relative"
                                whileHover={{ scale: 1.05, zIndex: 10 }}
                            >
                                <div className="aspect-[2/3] overflow-hidden rounded-[2rem] border-2 border-white/5 group-hover:border-red-600/50 shadow-2xl transition-all duration-500 relative">
                                    <img
                                        src={`${IMAGE_BASE_URL_POSTER}${item.poster_path}`}
                                        alt={item.title || item.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                                        <button
                                            onClick={(e) => handleToggleMyList(e, item)}
                                            className={`p-2 rounded-xl backdrop-blur-xl border transition-all ${isAdded ? 'bg-red-600 border-red-500 text-white' : 'bg-black/40 border-white/10 text-white hover:bg-white/20'}`}
                                        >
                                            {isAdded ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
                                        </button>
                                    </div>

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-5">
                                        <h3 className="text-white text-xs font-black uppercase italic truncate mb-3">{item.title || item.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <div className="bg-red-600 p-1.5 rounded-full"><Play size={10} fill="white" className="text-white ml-0.5" /></div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-300">Play Node</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-32 bg-white/5 rounded-[4rem] border border-white/5 backdrop-blur-xl">
                    <Stars size={48} className="mx-auto mb-6 text-gray-700 animate-pulse" />
                    <p className="text-gray-500 font-black uppercase tracking-widest">{t('contentNotFound')}</p>
                </div>
            )}

            {loadingMore && (
                <div className="flex flex-col items-center justify-center mt-16 gap-4">
                    <Spinner size="sm" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 animate-pulse">Syncing Archive</span>
                </div>
            )}
        </div>
    );
};

export default StudioPage;
