import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Clapperboard, ChevronDown, Globe, Sparkles, Wand2, Stars, Star, Search, X, Check, Filter, Zap, ArrowLeft, ArrowRight, Settings2 } from 'lucide-react';
import { Content } from '../types';
import { fetchPaginatedData } from '../services/tmdbService';
import { API_KEY, IMAGE_BASE_URL_POSTER, GENRES_T, FORBIDDEN_GENRE_IDS } from '../constants';
import Spinner from '../components/Spinner';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';

type Selection = 'hollywood' | 'bollywood' | 'infinity' | 'country' | 'animations';

interface Country {
    name: string;
    code: string;
    flagUrl: string;
    special?: boolean;
}

const ColorMixtureDivider: React.FC = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60">
            <motion.div 
                animate={{ 
                    x: [-40, 60, -40],
                    y: [-20, 30, -20],
                    scale: [1, 1.2, 1]
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute -left-20 -top-20 w-[500px] h-[500px] bg-brand/40 rounded-full blur-[120px]"
            />
            <motion.div 
                animate={{ 
                    x: [40, -60, 40],
                    y: [30, -20, 30],
                    scale: [1.2, 1, 1.2]
                }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="absolute -right-20 -bottom-20 w-[600px] h-[600px] bg-purple-900/30 rounded-full blur-[140px]"
            />
        </div>
    );
};

const DiscoverPage: React.FC = () => {
    const { selection: urlSelection } = useParams<{ selection: Selection }>();
    const [selection, setSelection] = useState<Selection | null>(null);
    const [activeCountry, setActiveCountry] = useState<string | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    
    const [results, setResults] = useState<Content[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
    const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
    const [isSticky, setIsSticky] = useState(false);
    
    const navigate = useNavigate();
    const { t, language } = useTranslation();
    const { theme } = useUI();
    const langCode = language === 'ku' ? 'ku' : 'en-US';
    const isRtl = language === 'ku';
    const observer = useRef<IntersectionObserver | null>(null);

    const countries: Country[] = [
        { name: t('kurdistan'), code: 'KURDISTAN', flagUrl: 'https://i.imgur.com/t3yYQyv.jpeg', special: true },
        { name: language === 'ku' ? 'یۆنان (Yonan)' : 'Greece', code: 'GR', flagUrl: 'https://flagcdn.com/w640/gr.png' },
        { name: 'USA', code: 'US', flagUrl: 'https://flagcdn.com/w640/us.png' },
        { name: 'United Kingdom', code: 'GB', flagUrl: 'https://flagcdn.com/w640/gb.png' },
        { name: 'India', code: 'IN', flagUrl: 'https://flagcdn.com/w640/in.png' },
        { name: 'Japan', code: 'JP', flagUrl: 'https://flagcdn.com/w640/jp.png' },
        { name: 'South Korea', code: 'KR', flagUrl: 'https://flagcdn.com/w640/kr.png' },
        { name: 'France', code: 'FR', flagUrl: 'https://flagcdn.com/w640/fr.png' },
        { name: 'Germany', code: 'DE', flagUrl: 'https://flagcdn.com/w640/de.png' },
        { name: 'Spain', code: 'ES', flagUrl: 'https://flagcdn.com/w640/es.png' },
        { name: 'Italy', code: 'IT', flagUrl: 'https://flagcdn.com/w640/it.png' },
        { name: 'Turkey', code: 'TR', flagUrl: 'https://flagcdn.com/w640/tr.png' }
    ];

    useEffect(() => {
        if (urlSelection && ['hollywood', 'bollywood', 'infinity', 'country', 'animations'].includes(urlSelection)) {
            setSelection(urlSelection as Selection);
            if (urlSelection !== 'country') setActiveCountry(null);
        } else {
            setSelection(null);
            setActiveCountry(null);
        }
    }, [urlSelection]);

    useEffect(() => {
        const handleScroll = () => setIsSticky(window.scrollY > 120);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const fetchMovies = async (category: Selection, pageNum: number, year: number | 'all', countryCode?: string, genres: number[] = []) => {
        let endpoint = '';
        const baseParams = `api_key=${API_KEY}&language=${langCode}&sort_by=popularity.desc&include_adult=false&page=${pageNum}`;
        
        const effectiveGenres = [...genres];
        if (category === 'animations' && !effectiveGenres.includes(16)) effectiveGenres.push(16);

        if (category === 'hollywood') endpoint = `/discover/movie?${baseParams}&with_origin_country=US`;
        else if (category === 'bollywood') endpoint = `/discover/movie?${baseParams}&with_origin_country=IN&with_original_language=hi`;
        else if (category === 'animations') endpoint = `/discover/movie?${baseParams}`;
        else if (category === 'country' && countryCode) {
            endpoint = countryCode === 'KURDISTAN' 
                ? `/discover/movie?${baseParams}&with_original_language=ku` 
                : `/discover/movie?${baseParams}&with_origin_country=${countryCode}`;
        } else endpoint = `/discover/movie?${baseParams}`;

        if (year !== 'all') endpoint += `&primary_release_year=${year}`;
        if (effectiveGenres.length > 0) endpoint += `&with_genres=${[...new Set(effectiveGenres)].join(',')}`;
        
        return await fetchPaginatedData(endpoint, language);
    };

    useEffect(() => {
        const loadInitialData = async () => {
            if (!selection || (selection === 'country' && !activeCountry)) return;
            setLoading(true);
            const response = await fetchMovies(selection, 1, yearFilter, activeCountry || undefined, selectedGenres);
            if (response) {
                setResults(response.results);
                setPage(2);
                setHasMore(response.page < response.total_pages);
            } else {
                setResults([]);
                setHasMore(false);
            }
            setLoading(false);
        };
        loadInitialData();
    }, [selection, activeCountry, yearFilter, selectedGenres, language, langCode]);

    const loadMoreMovies = useCallback(() => {
        if (loadingMore || !selection || !hasMore) return;
        setLoadingMore(true);
        fetchMovies(selection, page, yearFilter, activeCountry || undefined, selectedGenres).then(response => {
            if (response) {
                setResults(prev => [...prev, ...response.results]);
                setPage(p => p + 1);
                setHasMore(response.page < response.total_pages);
            }
            setLoadingMore(false);
        });
    }, [loadingMore, selection, page, hasMore, yearFilter, selectedGenres, activeCountry, langCode, language]);

    const loadMoreRef = useCallback(node => {
        if (loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) loadMoreMovies();
        });
        if (node) observer.current.observe(node);
    }, [loadingMore, hasMore, loadMoreMovies]);

    const toggleGenre = (id: number) => {
        setSelectedGenres(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
    };

    const CategoryButton = ({ title, onClick, icon, color, className = "" }: any) => (
        <motion.button
            whileHover={{ scale: 1.05, y: -10 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`flex-1 p-8 md:p-10 rounded-[2.5rem] bg-white/5 backdrop-blur-2xl border border-border-color shadow-2xl text-center group relative overflow-hidden flex flex-col items-center ${className}`}
        >
            <div className={`absolute -bottom-12 -right-12 w-40 h-40 rounded-full ${color} filter blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity`}></div>
            <div className="text-brand mb-4 group-hover:-translate-y-1 transition-transform">{icon}</div>
            <h2 className="text-xl md:text-3xl font-black text-main-text uppercase tracking-tighter italic">{title}</h2>
        </motion.button>
    );

    const SelectionScreen = () => (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-main-bg overflow-y-auto pt-40 pb-20">
            <ColorMixtureDivider />
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center relative z-10 mb-16 px-4">
                <div className="relative inline-block mb-6">
                  <Clapperboard className="w-16 h-16 md:w-20 md:h-20 text-brand" />
                </div>
                <h1 className="text-3xl md:text-6xl font-[1000] text-main-text uppercase tracking-tighter italic drop-shadow-2xl">{t('discoverPrompt')}</h1>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-8 w-full max-w-6xl relative z-10">
                <CategoryButton title={t('hollywood')} onClick={() => navigate('/discover/hollywood')} icon={<Stars className="w-6 h-6 md:w-8 md:h-8" />} color="bg-blue-600" />
                <CategoryButton title={t('bollywood')} onClick={() => navigate('/discover/bollywood')} icon={<Stars className="w-6 h-6 md:w-8 md:h-8" />} color="bg-orange-600" />
                <CategoryButton title={t('animations')} onClick={() => navigate('/discover/animations')} icon={<Zap className="w-6 h-6 md:w-8 md:h-8" />} color="bg-yellow-600" />
                <CategoryButton title={t('choiceCountry')} onClick={() => navigate('/discover/country')} icon={<Globe className="w-6 h-6 md:w-8 md:h-8" />} color="bg-green-600" />
                <CategoryButton title={language === 'ku' ? 'هەمووی' : 'ALL'} onClick={() => navigate('/discover/infinity')} icon={<Sparkles className="w-6 h-6 md:w-8 md:h-8" />} color="bg-purple-600" className="col-span-2 md:col-span-1" />
            </div>
        </div>
    );

    const years = Array.from({ length: new Date().getFullYear() - 1959 }, (_, i) => new Date().getFullYear() - i);
    const yearsOptions = [
        <option key="all" value="all" className="bg-[#111]">{t('allYears')}</option>,
        ...years.map(y => <option key={y} value={y} className="bg-[#111]">{y}</option>)
    ];

    const displayTitle = activeCountry 
        ? (activeCountry === 'KURDISTAN' ? t('kurdistan') : countries.find(c => c.code === activeCountry)?.name || activeCountry) 
        : t(selection! as any);

    return (
        <div className="min-h-screen pt-24 container mx-auto px-4 sm:px-6 lg:px-8 relative pb-32 bg-main-bg">
            <AnimatePresence mode="wait">
                <motion.div key={selection || activeCountry || 'selection'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
                    {!selection && <SelectionScreen />}
                    {selection === 'country' && !activeCountry && (
                        <div className="absolute inset-0 bg-main-bg flex flex-col items-center justify-start p-8 pt-32 overflow-y-auto">
                            <ColorMixtureDivider />
                            <div className="fixed top-24 left-8 z-50">
                                <button onClick={() => navigate('/discover')} className="text-main-text bg-white/10 backdrop-blur-xl p-4 rounded-2xl hover:bg-brand hover:scale-110 transition-all shadow-xl border border-white/10">
                                    {isRtl ? <ArrowRight size={24} /> : <ArrowLeft size={24} />}
                                </button>
                            </div>
                            <h2 className="text-4xl md:text-6xl font-[1000] text-main-text mb-8 uppercase tracking-tighter italic text-center drop-shadow-2xl relative z-10">{t('choiceCountry')}</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-6xl mb-20 relative z-10">
                                {countries.map((country) => (
                                    <motion.button key={country.code} whileHover={{ scale: 1.05 }} onClick={() => setActiveCountry(country.code)} className="aspect-square rounded-[2.5rem] bg-white/5 border border-border-color flex flex-col items-center justify-center relative overflow-hidden group shadow-xl">
                                        <img src={country.flagUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity" />
                                        <span className="relative z-10 text-xl font-black uppercase tracking-widest text-center px-4 text-white drop-shadow-md">{country.name}</span>
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    )}
                    {(selection && (selection !== 'country' || activeCountry)) && (
                        <div className="flex flex-col">
                            <div className={`sticky top-20 md:top-24 z-[45] mb-12 transition-all duration-500 ease-in-out`}>
                                <div className={`relative transition-all duration-500 overflow-hidden backdrop-blur-[100px] ${isSticky ? 'rounded-[2rem] bg-black/80 border-white/10 p-4 shadow-2xl' : 'rounded-[3rem] bg-card-bg/80 border-border-color p-8 shadow-2xl'}`}>
                                    <div className={`relative z-10 flex flex-col ${isRtl ? 'items-end' : 'items-start'} gap-6`}>
                                        <div className={`w-full flex flex-col md:flex-row items-center justify-between gap-4 ${isRtl ? 'md:flex-row-reverse text-right' : 'text-left'}`}>
                                            <h2 className={`font-[1000] text-main-text uppercase italic tracking-tighter leading-none transition-all ${isSticky ? 'text-xl md:text-3xl' : 'text-4xl md:text-7xl'}`}>
                                                {displayTitle}
                                            </h2>
                                            <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                                <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="bg-box-bg backdrop-blur-2xl border-2 border-border-color rounded-xl text-main-text font-black uppercase py-2 px-4 text-xs">
                                                    {yearsOptions}
                                                </select>
                                                <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`rounded-xl text-main-text border border-border-color px-6 py-4 text-xs font-black uppercase tracking-widest transition-all ${isFilterOpen ? 'bg-brand text-white border-brand shadow-[0_0_15px_rgba(var(--brand-red-rgb),0.5)]' : 'bg-white/5 hover:bg-brand'}`}>GENRES</button>
                                                <button onClick={() => activeCountry ? setActiveCountry(null) : navigate('/discover')} className="bg-white/5 text-main-text rounded-xl p-4 md:p-5 border border-border-color hover:bg-brand">
                                                    {isRtl ? <ArrowRight size={24} /> : <ArrowLeft size={24} />}
                                                </button>
                                            </div>
                                        </div>
                                        <AnimatePresence>
                                            {isFilterOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden w-full"
                                                >
                                                    <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                                                        {GENRES_T.filter(g => !FORBIDDEN_GENRE_IDS.includes(g.id)).map(genre => (
                                                            <button
                                                                key={genre.id}
                                                                onClick={() => toggleGenre(genre.id)}
                                                                className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all border ${selectedGenres.includes(genre.id) ? 'bg-brand text-white border-brand shadow-[0_0_15px_rgba(var(--brand-red-rgb),0.5)]' : 'bg-white/5 text-main-text border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                                                            >
                                                                {t(genre.nameKey as any)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                            
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-40 gap-6">
                                  <Spinner size="lg" />
                                  <span className="text-sec-text font-black uppercase tracking-[0.5em] animate-pulse text-sm">Neural Archive Sync</span>
                                </div>
                            ) : results.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-8">
                                    {results.map((item, index) => (
                                        <motion.div
                                            ref={index === results.length - 1 ? loadMoreRef : null}
                                            key={`${item.id}-${index}`}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            onClick={() => navigate(`/details/${item.media_type || 'movie'}/${item.id}`, { state: { customData: item } })}
                                            className="cursor-pointer group relative"
                                            whileHover={{ y: -8, scale: 1.02 }}
                                        >
                                            <div className="relative aspect-[2/3] overflow-hidden rounded-[2rem] border-2 border-border-color group-hover:border-brand/50 transition-all duration-700 shadow-2xl">
                                              <img src={`${IMAGE_BASE_URL_POSTER}${item.poster_path}`} alt="" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-5">
                                                  <p className="text-white text-[10px] md:text-xs font-black uppercase italic truncate mb-2">{item.title || item.name}</p>
                                              </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-32 bg-box-bg border border-border-color rounded-[3rem] shadow-2xl">
                                    <h2 className="text-xl md:text-2xl font-black text-sec-text uppercase italic">{t('noResultsFor')}</h2>
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default DiscoverPage;