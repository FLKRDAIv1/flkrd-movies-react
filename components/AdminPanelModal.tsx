import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PlusCircle, Tv, ListVideo, Server, Sparkles, ShieldAlert, X, Search,
    RefreshCw, Trash2, Edit2, ArrowUp, ArrowDown, Subtitles, Maximize,
    ChevronRight, Check, Key, Mail, User, Minimize2, Plus, Zap, Sliders, Layout, ShieldCheck
} from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import { useTranslation } from '../contexts/LanguageContext';
import { supabase } from '../utils/supabaseClient';
import { compressImage } from '../utils/imageUtils';
import { featuredBannerService, FeaturedBannerItem } from '../services/featuredBannerService';
import { bannedService } from '../services/bannedService';
import { API_KEY, API_BASE_URL } from '../constants';
import Portal from './Portal';

const TABS = [
    { id: 'upload', label: 'Upload Movie', labelKu: 'بڵاوکردنەوەی فیلم', icon: PlusCircle, perm: 'canManageMovies' },
    { id: 'carousel', label: 'Banner Carousel', labelKu: 'بەنەری سەرەکی', icon: Tv, perm: 'canManageMovies' },
    { id: 'archive', label: 'Movies List', labelKu: 'لیستی فیلمەکان', icon: ListVideo, perm: 'canManageMovies' },
    { id: 'servers', label: 'Servers', labelKu: 'سێرڤەرەکان', icon: Server, perm: 'canClearSystemCache' },
    { id: 'glass', label: 'Glass Design', labelKu: 'دیزاینی شووشە', icon: Sparkles, perm: 'canManageAdmins' },
    { id: 'mobilenav', label: 'Mobile Bar', labelKu: 'مۆبایل بار', icon: Layout, perm: 'canManageAdmins' },
    { id: 'oneboard', label: 'Website Tour', labelKu: 'گەشتی وێبسایت', icon: Sliders, perm: 'canManageAdmins' },
    { id: 'player', label: 'Button Layouts', icon: Sparkles, labelKu: 'دوگمەی پلەیەر', perm: 'canManageAdmins' },
    { id: 'banned', label: 'Banned', labelKu: 'یاساغەکان', icon: ShieldAlert, perm: 'canManageAdmins' },
];

export const AdminPanelModal: React.FC = () => {
    const { isAdmin, isAdminModalOpen, setIsAdminModalOpen, hasPermission, language } = useUI();
    const { addNotification } = useNotification();
    const isKurdish = language === 'ku' || language === 'badini';

    // Build the permitted tabs list dynamically based on sub-admin rules
    const visibleTabs = TABS.filter(tab => hasPermission(tab.perm));
    const [activeAdminTab, setActiveAdminTab] = useState('upload');

    // Sync active tab to first available visible tab when modal opens
    useEffect(() => {
        if (isAdminModalOpen && visibleTabs.length > 0) {
            setActiveAdminTab(visibleTabs[0].id);
        }
    }, [isAdminModalOpen, visibleTabs.length]);

    // Data States
    const [previewMovies, setPreviewMovies] = useState<any[]>([]);
    const [archiveContent, setArchiveContent] = useState<any[]>([]);
    const [adminSearchQuery, setAdminSearchQuery] = useState('');
    const [isLoadingArchive, setIsLoadingArchive] = useState(false);

    // Form/Upload State
    const [uploadData, setUploadData] = useState({
        title: '', description: '', videoUrl: '', imageBase64: '', bannerBase64: '', level: 'NEW', imdb_id: '', tmdb_id: ''
    });
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStep, setUploadStep] = useState('');

    // Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [nodeToEdit, setNodeToEdit] = useState<any | null>(null);
    const [editData, setEditData] = useState({
        title: '', description: '', videoUrl: '', imageBase64: '', bannerBase64: '', level: 'NEW', imdb_id: '', tmdb_id: ''
    });
    const [isUpdating, setIsUpdating] = useState(false);

    // Delete State
    const [movieToDelete, setMovieToDelete] = useState<string | null>(null);

    // Banner States
    const [carouselBanners, setCarouselBanners] = useState<FeaturedBannerItem[]>([]);
    const [isLoadingBanners, setIsLoadingBanners] = useState(false);
    const [isSavingBanner, setIsSavingBanner] = useState(false);
    const [editingBannerId, setEditingBannerId] = useState<number | null>(null);
    const [bannerForm, setBannerForm] = useState<Partial<FeaturedBannerItem>>({
        content_id: '', media_type: 'movie', title: '', kurdish_title: '', overview: '', kurdish_overview: '',
        backdrop_path: '', poster_path: '', logo_path: '', video_url: '', rating: 7.5, year: '', sort_order: 0
    });
    const [carouselSettings, setCarouselSettings] = useState({
        autoplayInterval: 10000, cardCount: 10, cardHeightVh: 65, deckOffset: 8, deckScale: 0.07,
        gradientStrength: 85, glowOpacity: 35, roundedSize: '3rem', visibleCards: 3
    });

    // Server list states
    const [serversList, setServersList] = useState<{ id: number; server_name: string; priority: number }[]>([]);
    const [isLoadingServers, setIsLoadingServers] = useState(false);
    const [isSavingServers, setIsSavingServers] = useState(false);

    // Banned items states
    const [bannedItems, setBannedItems] = useState<any[]>([]);
    const [isLoadingBanned, setIsLoadingBanned] = useState(false);

    // TMDB Search
    const [tmdbSearchQuery, setTmdbSearchQuery] = useState('');
    const [tmdbSearchResults, setTmdbSearchResults] = useState<any[]>([]);
    const [isTmdbSearching, setIsTmdbSearching] = useState(false);

    // Fetch tab-specific data on change
    useEffect(() => {
        if (!isAdminModalOpen) return;
        if (activeAdminTab === 'archive') {
            fetchArchiveContent();
        } else if (activeAdminTab === 'carousel') {
            fetchCarouselBanners();
            fetchPreviewMovies();
        } else if (activeAdminTab === 'servers') {
            fetchServersList();
        } else if (activeAdminTab === 'banned') {
            fetchBannedItems();
        }
    }, [activeAdminTab, isAdminModalOpen]);

    // Data Loaders
    const fetchPreviewMovies = async () => {
        try {
            const { data } = await supabase.from('dubbed_movies').select('*').order('created_at', { ascending: false }).limit(10);
            if (data) {
                setPreviewMovies(data.map((movie: any) => ({
                    ...movie,
                    id: String(movie.id).startsWith('custom_') ? movie.id : `custom_${movie.id}`,
                    poster_path: movie.imageBase64,
                    backdrop_path: movie.bannerBase64 || movie.imageBase64,
                })));
            }
        } catch (e) {}
    };

    const fetchArchiveContent = async () => {
        setIsLoadingArchive(true);
        try {
            const { data, error } = await supabase
                .from('dubbed_movies')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setArchiveContent(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingArchive(false);
        }
    };

    const fetchCarouselBanners = async () => {
        setIsLoadingBanners(true);
        try {
            const items = await featuredBannerService.fetchFeaturedItems();
            setCarouselBanners(items);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingBanners(false);
        }
    };

    const fetchServersList = async () => {
        setIsLoadingServers(true);
        try {
            const { data, error } = await supabase
                .from('server_config')
                .select('*')
                .order('priority', { ascending: false });
            if (error) throw error;
            setServersList(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingServers(false);
        }
    };

    const fetchBannedItems = async () => {
        setIsLoadingBanned(true);
        try {
            const list = await bannedService.getBannedRegistry();
            setBannedItems(list || []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingBanned(false);
        }
    };

    // TMDB Handlers
    const fetchFromTmdb = async (endpoint: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`);
            if (res.ok) return await res.json();
        } catch (e) {}
        const fallbackUrl = `https://api.themoviedb.org/3${endpoint}`;
        const res = await fetch(fallbackUrl);
        if (!res.ok) throw new Error(`TMDB call failed: ${res.statusText}`);
        return await res.json();
    };

    const searchTmdbMovies = async (query: string) => {
        if (!query.trim()) return;
        setIsTmdbSearching(true);
        try {
            const data = await fetchFromTmdb(`/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US`);
            setTmdbSearchResults(data.results || []);
        } catch (err: any) {
            console.error(err);
            addNotification({ type: 'error', title: 'TMDB Search Failed', message: err.message });
        } finally {
            setIsTmdbSearching(false);
        }
    };

    const handleSelectTmdbMovie = async (movie: any, target: 'upload' | 'edit' | 'banner') => {
        try {
            addNotification({ type: 'info', title: 'Fetching Data', message: 'Pulling details from TMDB...' });
            const [details, extIds] = await Promise.all([
                fetchFromTmdb(`/movie/${movie.id}?api_key=${API_KEY}&language=en-US`),
                fetchFromTmdb(`/movie/${movie.id}/external_ids?api_key=${API_KEY}`)
            ]);

            const title = details.title || '';
            const description = details.overview || '';
            const verticalPoster = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : '';
            const horizontalBanner = details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : '';
            const imdbId = extIds.imdb_id || '';
            const tmdbId = String(details.id) || '';

            if (target === 'upload') {
                setUploadData(prev => ({
                    ...prev,
                    title: `فیلمی دۆبلاژکراوی کوردی ${title}`,
                    description: description,
                    imageBase64: verticalPoster,
                    bannerBase64: horizontalBanner,
                    imdb_id: imdbId,
                    tmdb_id: tmdbId
                }));
            } else if (target === 'edit') {
                setEditData(prev => ({
                    ...prev,
                    title: `فیلمی دۆبلاژکراوی کوردی ${title}`,
                    description: description,
                    imageBase64: verticalPoster,
                    bannerBase64: horizontalBanner,
                    imdb_id: imdbId,
                    tmdb_id: tmdbId
                }));
            } else if (target === 'banner') {
                setBannerForm(prev => ({
                    ...prev,
                    content_id: tmdbId,
                    media_type: 'movie',
                    title: title,
                    kurdish_title: title,
                    overview: description,
                    kurdish_overview: description,
                    backdrop_path: details.backdrop_path || '',
                    poster_path: details.poster_path || '',
                    rating: details.vote_average || 7.5,
                    year: details.release_date ? details.release_date.split('-')[0] : '',
                }));
            }

            setTmdbSearchQuery('');
            setTmdbSearchResults([]);
            addNotification({ type: 'success', title: 'Fields Populated', message: `Imported "${title}" successfully!` });
        } catch (err: any) {
            console.error(err);
            addNotification({ type: 'error', title: 'Import Failed', message: err.message });
        }
    };

    // Action Handlers
    const handleUploadMovie = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadData.title || !uploadData.videoUrl) {
            addNotification({ type: 'error', title: 'Missing Data', message: 'Title and Video Link are required.' });
            return;
        }

        setIsUploading(true);
        setUploadProgress(20);
        setUploadStep('Broadcasting to global database...');

        const finalImage = uploadData.imageBase64 || 'https://raw.githubusercontent.com/flkrd/cdn/main/default-poster.webp';

        try {
            // Generate a unique ID (custom_<uuid>) required by public.dubbed_movies primary key constraint
            const generatedId = `custom_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substring(2, 9))}`;
            const cleanTitle = uploadData.title.trim();
            const cleanDesc = uploadData.description?.trim() || 'No description provided.';
            const cleanVideo = uploadData.videoUrl.trim();

            const { error } = await supabase
                .from('dubbed_movies')
                .insert([
                    {
                        id: generatedId,
                        title: cleanTitle,
                        kurdishTitle: cleanTitle,
                        description: cleanDesc,
                        overview: cleanDesc,
                        kurdishOverview: cleanDesc,
                        videoUrl: cleanVideo,
                        customStream: cleanVideo,
                        imageBase64: finalImage,
                        poster_path: finalImage,
                        bannerBase64: uploadData.bannerBase64 || null,
                        backdrop_path: uploadData.bannerBase64 || finalImage,
                        level: uploadData.level || 'NEW',
                        media_type: 'dubbed',
                        imdb_id: uploadData.imdb_id ? uploadData.imdb_id.trim() : null,
                        tmdb_id: uploadData.tmdb_id && !isNaN(Number(uploadData.tmdb_id)) ? String(uploadData.tmdb_id).trim() : null
                    }
                ]);

            if (error) throw error;

            setUploadProgress(100);
            addNotification({ type: 'success', title: '🎬 Movie Added!', message: 'New movie is now live!' });
            setUploadData({ title: '', description: '', videoUrl: '', imageBase64: '', bannerBase64: '', level: 'NEW', imdb_id: '', tmdb_id: '' });
            setIsAdminModalOpen(false);
        } catch (err: any) {
            console.error(err);
            addNotification({ type: 'error', title: 'Sync Error', message: err.message });
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleEditMovieClick = (movie: any) => {
        setNodeToEdit(movie);
        setEditData({
            title: movie.title || '',
            description: movie.description || '',
            videoUrl: movie.videoUrl || '',
            imageBase64: movie.imageBase64 || '',
            bannerBase64: movie.bannerBase64 || '',
            level: movie.level || 'NEW',
            imdb_id: movie.imdb_id || '',
            tmdb_id: movie.tmdb_id ? String(movie.tmdb_id) : ''
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateMovieSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nodeToEdit) return;
        setIsUpdating(true);

        try {
            const dbId = nodeToEdit.id;
            const { error } = await supabase
                .from('dubbed_movies')
                .update({
                    title: editData.title,
                    description: editData.description,
                    videoUrl: editData.videoUrl,
                    imageBase64: editData.imageBase64,
                    bannerBase64: editData.bannerBase64,
                    level: editData.level,
                    imdb_id: editData.imdb_id ? editData.imdb_id.trim() : null,
                    tmdb_id: editData.tmdb_id && !isNaN(Number(editData.tmdb_id)) ? parseInt(editData.tmdb_id, 10) : null
                })
                .eq('id', dbId);

            if (error) throw error;

            addNotification({ type: 'success', title: 'Node Modified', message: 'Movie details updated successfully.' });
            setIsEditModalOpen(false);
            setNodeToEdit(null);
            fetchArchiveContent();
        } catch (err: any) {
            console.error(err);
            addNotification({ type: 'error', title: 'Update Failed', message: err.message });
        } finally {
            setIsUpdating(false);
        }
    };

    const confirmDelete = async () => {
        if (!movieToDelete) return;
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('dubbed_movies')
                .delete()
                .eq('id', movieToDelete);

            if (error) throw error;

            addNotification({ type: 'success', title: 'Node Terminated', message: 'Target movie has been permanently removed.' });
            setMovieToDelete(null);
            fetchArchiveContent();
        } catch (e: any) {
            console.error(e);
            addNotification({ type: 'error', title: 'Delete Failed', message: e.message });
        } finally {
            setIsUpdating(false);
        }
    };

    // Banner handlers
    const handleSaveBanner = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bannerForm.content_id) {
            alert("TMDb ID is required!");
            return;
        }
        setIsSavingBanner(true);
        try {
            let success = false;
            if (editingBannerId !== null) {
                success = await featuredBannerService.updateFeaturedItem(editingBannerId, bannerForm);
            } else {
                success = await featuredBannerService.addFeaturedItem(bannerForm);
            }

            if (success) {
                setBannerForm({
                    content_id: '', media_type: 'movie', title: '', kurdish_title: '', overview: '', kurdish_overview: '',
                    backdrop_path: '', poster_path: '', logo_path: '', video_url: '', rating: 7.5, year: '', sort_order: 0
                });
                setEditingBannerId(null);
                fetchCarouselBanners();
            } else {
                alert("Failed to save banner!");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSavingBanner(false);
        }
    };

    const handleDeleteBanner = async (id: number) => {
        if (!window.confirm("Are you sure you want to remove this banner?")) return;
        try {
            const success = await featuredBannerService.deleteFeaturedItem(id);
            if (success) {
                fetchCarouselBanners();
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Server Priorities
    const moveServer = (index: number, direction: 'up' | 'down') => {
        const nextIndex = direction === 'up' ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= serversList.length) return;

        const updated = [...serversList];
        const temp = updated[index];
        updated[index] = updated[nextIndex];
        updated[nextIndex] = temp;
        setServersList(updated);
    };

    const handleSaveServerOrder = async () => {
        setIsSavingServers(true);
        try {
            const updates = serversList.map((server, index) => {
                const priority = 500 - index * 20;
                return {
                    id: server.id,
                    server_name: server.server_name,
                    priority: priority
                };
            });

            const { error } = await supabase
                .from('server_config')
                .upsert(updates);

            if (error) throw error;

            addNotification({ type: 'success', title: 'Priorities Updated', message: 'Servers list priorities configured.' });
            fetchServersList();
        } catch (err: any) {
            console.error(err);
            addNotification({ type: 'error', title: 'Failed to update servers priority', message: err.message });
        } finally {
            setIsSavingServers(false);
        }
    };

    // Unban Content
    const handleUnban = async (id: string) => {
        if (!window.confirm("Restore Content?")) return;
        try {
            const success = await bannedService.unbanContent(id);
            if (success) {
                addNotification({ type: 'success', title: 'Content Restored', message: 'Banned restriction lifted.' });
                fetchBannedItems();
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Helpers
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'upload' | 'edit') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const compressed = await compressImage(reader.result as string, 800, 1200, 0.7);
                if (target === 'upload') {
                    setUploadData({ ...uploadData, imageBase64: compressed });
                } else {
                    setEditData({ ...editData, imageBase64: compressed });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'upload' | 'edit') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const compressed = await compressImage(reader.result as string, 1280, 720, 0.7);
                if (target === 'upload') {
                    setUploadData({ ...uploadData, bannerBase64: compressed });
                } else {
                    setEditData({ ...editData, bannerBase64: compressed });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // Filter local archives list by search
    const adminFilteredContent = archiveContent.filter(movie => {
        const query = adminSearchQuery.toLowerCase().trim();
        if (!query) return true;
        return (movie.title && movie.title.toLowerCase().includes(query)) ||
            (movie.description && movie.description.toLowerCase().includes(query));
    });

    if (!isAdmin || !isAdminModalOpen) return null;

    return (
        <Portal id="admin-panel-portal">
            <AnimatePresence>
                <div key="admin-modal-overlay" className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-3xl overflow-hidden">
                    {/* Backdrop Click */}
                    <motion.div
                        key="admin-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-0 bg-black/45 cursor-pointer"
                        onClick={() => setIsAdminModalOpen(false)}
                    />

                    {/* Main Admin Card */}
                    <motion.div
                        key="admin-modal-card-main"
                            initial={{ y: 40, opacity: 0, scale: 0.96 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 40, opacity: 0, scale: 0.96 }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
                            className="relative z-10 w-full max-w-5xl h-[85vh] bg-gradient-to-br from-[#0c0c11]/95 to-[#060609]/98 border border-white/[0.08] rounded-[2.5rem] shadow-[0_0_80px_rgba(229,9,20,0.15)] flex flex-col md:flex-row overflow-hidden backdrop-blur-xl"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setIsAdminModalOpen(false)}
                                className="absolute top-6 right-6 z-30 text-gray-500 hover:text-white p-2 hover:bg-white/5 rounded-full transition-all duration-300 active:scale-90"
                            >
                                <X size={20} />
                            </button>

                            {/* Left Panel: Sidebar / Horizontal Nav (on Mobile) */}
                            <div className="w-full md:w-[28%] bg-white/[0.01] border-b md:border-b-0 md:border-r border-white/[0.06] flex flex-col p-6 h-auto md:h-full shrink-0 relative">
                                {/* Branding */}
                                <div className="flex items-center gap-3 mb-6 md:mb-8 text-left">
                                    <div className="relative flex items-center justify-center w-11 h-11 bg-gradient-to-br from-brand to-red-800 rounded-xl shadow-[0_0_20px_rgba(229,9,20,0.35)]">
                                        <ShieldAlert size={20} className="text-white animate-pulse" />
                                        <div className="absolute inset-0 rounded-xl bg-brand/20 blur-md -z-10" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black tracking-wider text-white uppercase leading-none">FLKRD Console</h2>
                                        <span className="text-[9px] text-brand font-bold uppercase tracking-widest block mt-1">Authorized Access Only</span>
                                    </div>
                                </div>

                                {/* Navigation Scroller (Horizontal on Mobile, Vertical on Desktop) */}
                                <div className="flex md:flex-col gap-1.5 p-1 bg-white/[0.02] md:bg-transparent rounded-2xl md:rounded-none overflow-x-auto md:overflow-x-visible md:overflow-y-auto scrollbar-hide shrink-0 flex-1 py-1">
                                    {visibleTabs.map(tab => {
                                        const TabIcon = tab.icon;
                                        const isActive = activeAdminTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveAdminTab(tab.id)}
                                                className={`relative flex-shrink-0 flex items-center gap-3 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                                                    isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
                                                }`}
                                            >
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="activeAdminTabIndicator"
                                                        className="absolute inset-0 bg-gradient-to-r from-brand/20 to-brand/[0.02] border-l-2 md:border-l-2 border-brand rounded-xl"
                                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                                    />
                                                )}
                                                <TabIcon size={14} className={isActive ? 'text-brand animate-pulse' : 'text-gray-400'} />
                                                <span className="relative z-10">{isKurdish ? tab.labelKu : tab.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Active Badge / Footer */}
                                <div className="hidden md:flex mt-auto p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand/20 to-red-500/20 border border-brand/35 flex items-center justify-center text-brand font-black text-xs">
                                        <ShieldCheck size={14} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] text-gray-300 font-black leading-none">Security Active</p>
                                        <p className="text-[9px] text-gray-500 mt-1 truncate">Session Secured</p>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-ping shadow-[0_0_10px_#22c55e]" />
                                </div>
                            </div>

                            {/* Right Panel: Content Frame */}
                            <div className="flex-1 flex flex-col h-full overflow-hidden bg-black/10 relative">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeAdminTab || 'default-admin-tab'}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                        transition={{ duration: 0.25, ease: 'easeOut' }}
                                        className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-6"
                                    >
                                        {/* 1. UPLOAD TAB */}
                                        {activeAdminTab === 'upload' && (
                                            <form onSubmit={handleUploadMovie} className="space-y-5 pb-4 text-right" style={{ direction: 'rtl' }}>
                                                {/* Autocomplete */}
                                                <div className="space-y-2 relative text-right">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-brand flex items-center gap-1.5 justify-end">
                                                        <Sparkles size={12} className="text-brand animate-pulse" />
                                                        TMDb Search Autocomplete / گەڕانی خێرا لە TMDb
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <div className="relative flex-1">
                                                            <input
                                                                type="text"
                                                                value={tmdbSearchQuery}
                                                                onChange={(e) => setTmdbSearchQuery(e.target.value)}
                                                                placeholder="ناوێک بنووسە بۆ گەڕان لە TMDb..."
                                                                className="w-full bg-black/40 border border-white/[0.08] focus:border-brand/40 rounded-2xl px-4 py-3.5 text-white outline-none transition-all placeholder:text-gray-600 text-sm text-right focus:bg-[#121218]/80"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        searchTmdbMovies(tmdbSearchQuery);
                                                                    }
                                                                }}
                                                            />
                                                            {tmdbSearchQuery && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setTmdbSearchQuery('');
                                                                        setTmdbSearchResults([]);
                                                                    }}
                                                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => searchTmdbMovies(tmdbSearchQuery)}
                                                            disabled={isTmdbSearching}
                                                            className="px-6 bg-brand hover:bg-red-700 text-white font-black uppercase text-xs rounded-2xl transition-all flex items-center gap-2 shrink-0 active:scale-95 disabled:opacity-50 shadow-lg shadow-brand/20"
                                                        >
                                                            {isTmdbSearching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                                                            گەڕان
                                                        </button>
                                                    </div>

                                                    {/* Dropdown */}
                                                    {tmdbSearchResults.length > 0 && (
                                                        <div className="absolute z-50 left-0 right-0 mt-2 bg-[#121217]/95 border border-white/[0.08] rounded-2xl shadow-2xl max-h-60 overflow-y-auto p-2 space-y-1 backdrop-blur-xl custom-scrollbar">
                                                            {tmdbSearchResults.map((movie, idx) => {
                                                                const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
                                                                return (
                                                                    <button
                                                                        key={`${movie.id}-${idx}`}
                                                                        type="button"
                                                                        onClick={() => handleSelectTmdbMovie(movie, 'upload')}
                                                                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 text-right transition-colors group flex-row-reverse"
                                                                    >
                                                                        <div className="w-10 h-14 rounded-lg bg-white/5 overflow-hidden shrink-0 border border-white/5">
                                                                            {movie.poster_path && <img src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`} className="w-full h-full object-cover" alt="" />}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1 text-right">
                                                                            <h4 className="text-white font-bold text-sm truncate group-hover:text-brand transition-colors">{movie.title}</h4>
                                                                            <p className="text-xs text-gray-500 font-medium mt-0.5">{year} • ⭐ {movie.vote_average?.toFixed(1) || '0.0'}</p>
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">سەردێڕی فیلم (Movie Title)</label>
                                                    <input type="text" className="w-full bg-black/40 border border-white/[0.08] focus:border-brand/40 rounded-2xl px-4 py-3.5 text-white outline-none text-right focus:bg-[#121218]/80 transition-all text-sm font-semibold"
                                                        value={uploadData.title} onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })} required
                                                        placeholder="فیلمی دۆبلاژکراوی کوردی..." />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">لینک یان سەرچاوەی مۆسیقا/ڤیدیۆ (Video link - m3u8)</label>
                                                    <input type="text" className="w-full bg-black/40 border border-white/[0.08] focus:border-brand/40 rounded-2xl px-4 py-3.5 text-white outline-none text-left focus:bg-[#121218]/80 transition-all text-sm font-mono"
                                                        value={uploadData.videoUrl} onChange={(e) => setUploadData({ ...uploadData, videoUrl: e.target.value })} required
                                                        placeholder="https://...m3u8" />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">کورتە و کورتەی چێرۆک (Description)</label>
                                                    <textarea className="w-full bg-black/40 border border-white/[0.08] focus:border-brand/40 rounded-2xl px-4 py-3.5 text-white outline-none min-h-[90px] text-right focus:bg-[#121218]/80 transition-all text-sm font-medium"
                                                        value={uploadData.description} onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })} required
                                                        placeholder="چیرۆکی فیلمەکە لێرە بنووسە..." />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">پۆستەری ڕاستەوخۆ (Vertical Grid Poster)</label>
                                                        <div className="relative border border-dashed border-white/20 hover:border-brand/50 bg-black/30 hover:bg-black/50 rounded-2xl p-4 transition-all duration-300 flex flex-col items-center justify-center overflow-hidden h-36 group">
                                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'upload')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                            {uploadData.imageBase64 ? (
                                                                <img src={uploadData.imageBase64} className="h-full object-cover rounded-lg shadow-xl" alt="" />
                                                            ) : (
                                                                <div className="text-center text-gray-500 pointer-events-none group-hover:scale-105 transition-transform duration-300">
                                                                    <Plus size={20} className="mx-auto mb-1.5 opacity-55 text-brand" />
                                                                    <p className="text-[10px] font-black uppercase tracking-wider leading-tight text-gray-400">کلیک بکە بۆ دیاریکردنی پۆستەر</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">بەنەری هۆڕیزۆنتاڵ (Horizontal Hero Banner)</label>
                                                        <div className="relative border border-dashed border-white/20 hover:border-brand/50 bg-black/30 hover:bg-black/50 rounded-2xl p-4 transition-all duration-300 flex flex-col items-center justify-center overflow-hidden h-36 group">
                                                            <input type="file" accept="image/*" onChange={(e) => handleBannerUpload(e, 'upload')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                            {uploadData.bannerBase64 ? (
                                                                <img src={uploadData.bannerBase64} className="h-full w-full object-cover rounded-lg shadow-xl" alt="" />
                                                            ) : (
                                                                <div className="text-center text-gray-500 pointer-events-none group-hover:scale-105 transition-transform duration-300">
                                                                    <Plus size={20} className="mx-auto mb-1.5 opacity-55 text-brand" />
                                                                    <p className="text-[10px] font-black uppercase tracking-wider leading-tight text-gray-400">کلیک بکە بۆ دیاریکردنی بەنەر</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="space-y-2 text-right">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">پۆلێنکردن (Level)</label>
                                                        <select
                                                            value={uploadData.level}
                                                            onChange={(e) => setUploadData({ ...uploadData, level: e.target.value })}
                                                            className="w-full bg-black/40 border border-white/[0.08] focus:border-brand/40 focus:bg-[#121218]/80 rounded-2xl px-4 py-3.5 text-white outline-none text-right transition-all text-xs font-black uppercase tracking-widest"
                                                        >
                                                            <option value="NEW">🆕 NEW (Standard)</option>
                                                            <option value="BEST">🔥 BEST (Trending)</option>
                                                            <option value="KING">👑 KING (Premium)</option>
                                                            <option value="SPECIAL">✨ SPECIAL (Exclusive)</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2 text-right">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">IMDb ID (Optional)</label>
                                                        <input type="text" className="w-full bg-black/40 border border-white/[0.08] focus:border-brand/40 focus:bg-[#121218]/80 rounded-2xl px-4 py-3.5 text-white outline-none text-left transition-all text-xs font-bold"
                                                            value={uploadData.imdb_id} onChange={(e) => setUploadData({ ...uploadData, imdb_id: e.target.value })}
                                                            placeholder="e.g. tt36042156" />
                                                    </div>
                                                    <div className="space-y-2 text-right">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">TMDb ID (Optional)</label>
                                                        <input type="text" className="w-full bg-black/40 border border-white/[0.08] focus:border-brand/40 focus:bg-[#121218]/80 rounded-2xl px-4 py-3.5 text-white outline-none text-left transition-all text-xs font-bold"
                                                            value={uploadData.tmdb_id} onChange={(e) => setUploadData({ ...uploadData, tmdb_id: e.target.value })}
                                                            placeholder="e.g. 1439930" />
                                                    </div>
                                                </div>

                                                <button type="submit" disabled={isUploading} className="w-full bg-gradient-to-r from-brand to-red-700 hover:from-red-600 hover:to-red-800 text-white font-black uppercase py-4 rounded-2xl mt-4 shadow-lg shadow-brand/20 transition-all flex justify-center items-center gap-2 active:scale-[0.99] disabled:opacity-50">
                                                    {isUploading ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
                                                    {isUploading ? `${uploadStep} (${uploadProgress}%)` : 'زیادکردنی فیلم'}
                                                </button>
                                            </form>
                                        )}

                                        {/* 2. CAROUSEL TAB */}
                                        {activeAdminTab === 'carousel' && (() => {
                                            const updateSetting = (key: string, value: any) => {
                                                const next = { ...carouselSettings, [key]: value };
                                                setCarouselSettings(next);
                                                localStorage.setItem('carouselSettings', JSON.stringify(next));
                                                window.dispatchEvent(new Event('carousel-settings-updated'));
                                            };
                                            return (
                                                <div className="space-y-6 pb-4 text-right animate-fadeIn" style={{ direction: 'rtl' }}>
                                                    <div className="bg-white/[0.02] border border-white/[0.06] p-5 rounded-3xl">
                                                        <h3 className="text-sm font-black uppercase text-white tracking-widest mb-3">ڕێکخستنی سایدباری بەنەری سەرەکی</h3>
                                                        <div className="space-y-4">
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                                                                    <span>بەرزی کارتی بەنەر (Height)</span>
                                                                    <span className="font-mono text-brand">{carouselSettings.cardHeightVh}vh</span>
                                                                </div>
                                                                <input
                                                                    type="range" min="40" max="85"
                                                                    value={carouselSettings.cardHeightVh}
                                                                    onChange={(e) => updateSetting('cardHeightVh', Number(e.target.value))}
                                                                    className="w-full accent-brand bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Add Banner Form */}
                                                    <form onSubmit={handleSaveBanner} className="space-y-4 p-6 bg-white/[0.02] border border-white/[0.06] rounded-3xl">
                                                        <h4 className="text-xs font-black text-brand uppercase tracking-widest border-b border-white/5 pb-2">زیادکردنی بەنەری نوێ</h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-gray-400">TMDb ID / Custom ID</label>
                                                                <input type="text" className="w-full bg-black/40 border border-white/[0.08] focus:border-brand/40 rounded-2xl px-4 py-3 text-white focus:bg-[#121218]/80 outline-none text-left font-mono text-sm"
                                                                    value={bannerForm.content_id} onChange={(e) => setBannerForm({ ...bannerForm, content_id: e.target.value })} required />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-gray-400">Title (EN)</label>
                                                                <input type="text" className="w-full bg-black/40 border border-white/[0.08] focus:border-brand/40 rounded-2xl px-4 py-3 text-white focus:bg-[#121218]/80 outline-none text-right text-sm font-semibold"
                                                                    value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} required />
                                                            </div>
                                                        </div>
                                                        <button type="submit" disabled={isSavingBanner} className="w-full py-4 bg-gradient-to-r from-brand to-red-700 hover:from-red-600 hover:to-red-800 text-white rounded-2xl font-black uppercase text-xs transition-all shadow-lg active:scale-[0.99] disabled:opacity-50">
                                                            {isSavingBanner ? 'تۆمار دەکرێت...' : 'پاشەکەوتکردن'}
                                                        </button>
                                                    </form>

                                                    {/* Banners List */}
                                                    <div className="space-y-3">
                                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">لیستی بەنەرەکان</h4>
                                                        <div className="grid grid-cols-1 gap-3">
                                                            {carouselBanners.map((banner, idx) => (
                                                                <div key={banner.id || `banner-${banner.content_id || 'b'}-${idx}`} className="flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-2xl flex-row-reverse transition-all duration-300">
                                                                    <div>
                                                                        <p className="text-white font-black text-sm">{banner.kurdish_title || banner.title}</p>
                                                                        <p className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">TMDb ID: {banner.content_id}</p>
                                                                    </div>
                                                                    <button onClick={() => handleDeleteBanner(banner.id!)} className="p-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all duration-300 active:scale-95">
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* 3. MOVIES ARCHIVE TAB */}
                                        {activeAdminTab === 'archive' && (
                                            <div className="space-y-4 pb-4 animate-fadeIn">
                                                <div className="relative group text-right">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-brand transition-colors">
                                                        <Search size={18} />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="گەڕان لە لیستی فیلمە بڵاوکراوەکان..."
                                                        value={adminSearchQuery}
                                                        onChange={(e) => setAdminSearchQuery(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/[0.08] focus:border-brand/40 focus:bg-[#121218]/80 rounded-2xl py-4 pl-12 pr-4 text-white outline-none transition-all placeholder:text-gray-600 font-bold text-xs text-right"
                                                    />
                                                </div>

                                                {isLoadingArchive ? (
                                                    <div className="py-20 flex justify-center"><RefreshCw className="animate-spin text-brand" /></div>
                                                ) : adminFilteredContent.length === 0 ? (
                                                    <div className="text-center py-12 text-gray-500 text-xs font-bold uppercase tracking-widest bg-white/[0.01] rounded-3xl border border-white/[0.06]">
                                                        ھیچ فیلمێک نەدۆزرایەوە
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {adminFilteredContent.map((movie, idx) => (
                                                            <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] p-4 rounded-3xl transition-all duration-300 flex-row-reverse relative">
                                                                <div className="w-16 h-20 rounded-2xl shadow-lg border border-white/[0.08] overflow-hidden bg-white/5 flex items-center justify-center shrink-0">
                                                                    <img
                                                                        src={movie.imageBase64 || movie.poster_path || 'https://raw.githubusercontent.com/flkrd/cdn/main/default-poster.webp'}
                                                                        alt=""
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                                <div className="flex-1 min-w-0 text-right">
                                                                    <h3 className="text-white font-bold text-sm leading-snug">{movie.title}</h3>
                                                                    <p className="text-[10px] text-gray-500 font-medium leading-relaxed line-clamp-2 mt-1">{movie.description}</p>
                                                                </div>
                                                                <div className="flex w-full sm:w-auto mt-4 sm:mt-0 gap-2 shrink-0 justify-end">
                                                                    <button onClick={() => handleEditMovieClick(movie)} className="p-3 bg-yellow-500/10 text-yellow-500 rounded-xl hover:bg-yellow-500 hover:text-white transition-all duration-300 active:scale-95">
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                    <button onClick={() => setMovieToDelete(movie.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300 active:scale-95">
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 4. SERVERS CONFIG TAB */}
                                        {activeAdminTab === 'servers' && (
                                            <div className="space-y-5 pb-4 text-right animate-fadeIn" style={{ direction: 'rtl' }}>
                                                <div className="flex items-center justify-between flex-row-reverse">
                                                    <div>
                                                        <h3 className="text-sm font-black text-brand uppercase tracking-widest flex items-center gap-1.5 justify-end">
                                                            ڕیزبەندی سێرڤەرەکان / Server Priorities
                                                        </h3>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                                                            سێرڤەرەکان بەرەو سەرەوە یان خوارەوە ببە بۆ پێشینەکاری داگرتن.
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveServerOrder}
                                                        disabled={isSavingServers || serversList.length === 0}
                                                        className="px-6 py-3 bg-brand hover:bg-red-750 disabled:opacity-50 text-white font-black uppercase text-xs rounded-2xl transition-all shadow-lg active:scale-95 shadow-brand/20"
                                                    >
                                                        {isSavingServers ? <RefreshCw size={14} className="animate-spin" /> : 'تۆمارکردن'}
                                                    </button>
                                                </div>

                                                {isLoadingServers ? (
                                                    <div className="py-20 flex justify-center"><RefreshCw className="animate-spin text-brand" /></div>
                                                ) : (
                                                    <div className="space-y-2.5">
                                                        {serversList.map((server, index) => {
                                                            let friendlyName = server.server_name;
                                                            if (server.server_name === 'FLKRD SERVER') friendlyName = 'VidKing (Server 1)';
                                                            else if (server.server_name === 'FLKRD SERVER 1') friendlyName = 'Videasy (Server 2)';
                                                            else if (server.server_name === 'FLKRD SERVER 2') friendlyName = 'VidLink Pro (Server 3)';
                                                            else if (server.server_name === 'FLKRD SERVER 3') friendlyName = 'VidSrc (Server 4)';
                                                            else if (server.server_name === 'FLKRD SERVER 4') friendlyName = 'SuperEmbed (Server 5)';
                                                            else if (server.server_name === 'FLKRD SERVER 5') friendlyName = 'CinePro (Server 6)';
                                                            else if (server.server_name === 'FLKRD SERVER 6') friendlyName = 'VidSrc.pro (Server 7)';
                                                            else if (server.server_name === 'FLKRD SERVER 7') friendlyName = 'VidSrc-embed.ru (Server 8)';

                                                            return (
                                                                <div key={server.id || server.server_name || `srv-${index}`} className="flex items-center justify-between p-4 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.06] rounded-2xl transition-all duration-300 flex-row-reverse">
                                                                    <div className="flex items-center gap-3 flex-row-reverse">
                                                                        <span className="w-8 h-8 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-black text-xs">
                                                                            {index + 1}
                                                                        </span>
                                                                        <div className="text-right">
                                                                            <p className="text-white font-black uppercase text-xs tracking-wide">{friendlyName}</p>
                                                                            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Priority Score: {server.priority}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            type="button"
                                                                            disabled={index === 0}
                                                                            onClick={() => moveServer(index, 'up')}
                                                                            className="p-2.5 bg-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all duration-300 active:scale-90"
                                                                        >
                                                                            <ArrowUp size={14} />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            disabled={index === serversList.length - 1}
                                                                            onClick={() => moveServer(index, 'down')}
                                                                            className="p-2.5 bg-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all duration-300 active:scale-90"
                                                                        >
                                                                            <ArrowDown size={14} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 5. GLASS CUSTOMIZER TAB */}
                                        {activeAdminTab === 'glass' && (
                                            <div className="animate-fadeIn">
                                                <GlassCustomizer />
                                            </div>
                                        )}

                                        {/* 6. MOBILE NAV TAB */}
                                        {activeAdminTab === 'mobilenav' && (
                                            <div className="animate-fadeIn">
                                                <MobileNavCustomizer />
                                            </div>
                                        )}

                                        {/* 7. WEBSITE TOUR TAB */}
                                        {activeAdminTab === 'oneboard' && (
                                            <div className="animate-fadeIn">
                                                <OnboardingCustomizer />
                                            </div>
                                        )}

                                        {/* 8. BUTTON LAYOUTS TAB */}
                                        {activeAdminTab === 'player' && (
                                            <div className="animate-fadeIn">
                                                <PlayerControlsCustomizer />
                                            </div>
                                        )}

                                        {/* 9. BANNED TAB */}
                                        {activeAdminTab === 'banned' && (
                                            <div className="space-y-4 pb-4 text-right animate-fadeIn" style={{ direction: 'rtl' }}>
                                                <h3 className="text-sm font-black uppercase text-white tracking-widest">یاساغەکان / Banned Registry</h3>
                                                {isLoadingBanned ? (
                                                    <div className="py-20 flex justify-center"><RefreshCw className="animate-spin text-red-500" /></div>
                                                ) : bannedItems.length === 0 ? (
                                                    <div className="py-20 text-center text-gray-500 font-bold uppercase tracking-widest bg-white/[0.01] rounded-3xl border border-white/[0.06] italic opacity-30">Registry Clean</div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {bannedItems.map((item) => (
                                                            <div key={item.id} className="flex items-center justify-between p-4 bg-white/[0.01] hover:bg-white/[0.03] border border-red-500/10 rounded-2xl flex-row-reverse transition-all duration-300">
                                                                <div className="text-right">
                                                                    <p className="text-white font-black uppercase text-xs tracking-tighter">NODE: {item.tmdb_id || item.id}</p>
                                                                    <p className="text-[8px] text-gray-500 font-bold uppercase mt-0.5">Type: {item.media_type}</p>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleUnban(String(item.tmdb_id || item.id))}
                                                                    className="px-4 py-2.5 bg-green-600/15 hover:bg-green-600 text-green-500 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                                                                >
                                                                    Recover
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                </AnimatePresence>

            {/* Sub Edit Modal */}
            <AnimatePresence>
                {isEditModalOpen && (
                    <div className="fixed inset-0 z-[350] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                        {/* Backdrop Click */}
                        <div className="absolute inset-0 z-0 bg-black/30" onClick={() => setIsEditModalOpen(false)} />
                        
                        <motion.div
                            key="sub-edit-card"
                            initial={{ y: 30, opacity: 0, scale: 0.96 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 30, opacity: 0, scale: 0.96 }}
                            transition={{ type: "spring", duration: 0.45 }}
                            className="relative z-10 bg-gradient-to-br from-[#0c0c11]/95 to-[#060609]/98 border border-white/[0.08] p-6 md:p-8 rounded-[2rem] w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col text-right backdrop-blur-xl"
                            style={{ direction: 'rtl' }}
                        >
                            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-6 left-6 text-gray-500 hover:text-white p-1 hover:bg-white/5 rounded-full transition-all duration-300"><X size={18} /></button>

                            <div className="flex items-center gap-3 mb-6 shrink-0 flex-row-reverse">
                                <div className="p-3 bg-yellow-500/20 rounded-2xl border border-yellow-500/30 text-yellow-500"><RefreshCw size={22} className="animate-spin" /></div>
                                <div className="text-right">
                                    <h2 className="text-xl font-black italic uppercase tracking-tighter text-white leading-none">دەستکاریکردن</h2>
                                    <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mt-1 block">Update Information</span>
                                </div>
                            </div>

                            <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 space-y-4">
                                <form onSubmit={handleUpdateMovieSubmit} className="space-y-4 pl-1">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">سەردێڕ (Title)</label>
                                        <input type="text" className="w-full bg-black/40 border border-white/[0.08] focus:border-yellow-500/40 rounded-2xl px-4 py-3 text-white focus:bg-[#121218]/80 outline-none text-right transition-all text-sm font-semibold"
                                            value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">سەرچاوەی ڤیدیۆ (Video Link)</label>
                                        <input type="text" className="w-full bg-black/40 border border-white/[0.08] focus:border-yellow-500/40 rounded-2xl px-4 py-3 text-white focus:bg-[#121218]/80 outline-none text-left transition-all text-xs font-mono"
                                            value={editData.videoUrl} onChange={(e) => setEditData({ ...editData, videoUrl: e.target.value })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">کورتە (Description)</label>
                                        <textarea className="w-full bg-black/40 border border-white/[0.08] focus:border-yellow-500/40 rounded-2xl px-4 py-3 text-white focus:bg-[#121218]/80 outline-none min-h-[90px] text-right transition-all text-sm font-medium"
                                            value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} required />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">پۆستەر</label>
                                            <div className="relative border border-dashed border-white/20 hover:border-yellow-500/50 bg-black/30 hover:bg-black/50 rounded-2xl p-4 transition-all duration-300 flex flex-col items-center justify-center overflow-hidden h-32 group">
                                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'edit')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                {editData.imageBase64 ? (
                                                    <img src={editData.imageBase64} className="h-full object-cover rounded-lg shadow-xl" alt="" />
                                                ) : (
                                                    <div className="text-center text-gray-500 group-hover:scale-105 transition-transform duration-300">
                                                        <Plus size={18} className="mx-auto mb-1.5 text-yellow-500 opacity-55" />
                                                        <p className="text-[10px] font-black tracking-wider leading-tight text-gray-400">پۆستەری ستوونی</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">بەنەر</label>
                                            <div className="relative border border-dashed border-white/20 hover:border-yellow-500/50 bg-black/30 hover:bg-black/50 rounded-2xl p-4 transition-all duration-300 flex flex-col items-center justify-center overflow-hidden h-32 group">
                                                <input type="file" accept="image/*" onChange={(e) => handleBannerUpload(e, 'edit')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                {editData.bannerBase64 ? (
                                                    <img src={editData.bannerBase64} className="h-full w-full object-cover rounded-lg shadow-xl" alt="" />
                                                ) : (
                                                    <div className="text-center text-gray-500 group-hover:scale-105 transition-transform duration-300">
                                                        <Plus size={18} className="mx-auto mb-1.5 text-yellow-500 opacity-55" />
                                                        <p className="text-[10px] font-black tracking-wider leading-tight text-gray-400">پۆستەری ئاسۆیی</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">Level</label>
                                            <select
                                                value={editData.level}
                                                onChange={(e) => setEditData({ ...editData, level: e.target.value })}
                                                className="w-full bg-black/40 border border-white/[0.08] focus:border-yellow-500/45 focus:bg-[#121218]/80 rounded-2xl px-4 py-3 text-white outline-none text-right transition-all text-xs font-black uppercase tracking-widest"
                                            >
                                                <option value="NEW">🆕 NEW</option>
                                                <option value="BEST">🔥 BEST</option>
                                                <option value="KING">👑 KING</option>
                                                <option value="SPECIAL">✨ SPECIAL</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">IMDb ID</label>
                                            <input type="text" className="w-full bg-black/40 border border-white/[0.08] focus:border-yellow-500/40 rounded-2xl px-4 py-3 text-white focus:bg-[#121218]/80 outline-none text-left transition-all text-xs font-semibold"
                                                value={editData.imdb_id} onChange={(e) => setEditData({ ...editData, imdb_id: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">TMDb ID</label>
                                            <input type="text" className="w-full bg-black/40 border border-white/[0.08] focus:border-yellow-500/40 rounded-2xl px-4 py-3 text-white focus:bg-[#121218]/80 outline-none text-left transition-all text-xs font-semibold"
                                                value={editData.tmdb_id} onChange={(e) => setEditData({ ...editData, tmdb_id: e.target.value })} />
                                        </div>
                                    </div>
                                    <button type="submit" disabled={isUpdating} className="w-full bg-gradient-to-r from-yellow-600 to-yellow-750 hover:from-yellow-500 hover:to-yellow-700 text-white font-black uppercase py-4 rounded-2xl mt-4 transition-all shadow-lg active:scale-[0.99] flex justify-center items-center gap-2">
                                        {isUpdating ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
                                        {isUpdating ? 'پاشەکەوت دەکرێت...' : 'تۆمارکردن'}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Sub Delete Confirm Modal */}
            <AnimatePresence>
                {movieToDelete && (
                    <div className="fixed inset-0 z-[350] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                        {/* Backdrop Click */}
                        <div className="absolute inset-0 z-0 bg-black/35" onClick={() => setMovieToDelete(null)} />
                        
                        <motion.div
                            key="sub-delete-card"
                            initial={{ scale: 0.9, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 10 }}
                            transition={{ type: "spring", duration: 0.4 }}
                            className="bg-[#0b0b0f]/95 border border-red-500/30 p-8 rounded-3xl w-full max-w-sm relative text-center shadow-2xl backdrop-blur-xl"
                        >
                            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20 text-red-500">
                                <Trash2 size={24} className="animate-pulse" />
                            </div>
                            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white mb-2">سڕینەوەی فیلم؟</h2>
                            <p className="text-sm text-gray-400 mb-8 font-bold">ئەم کردارە ناگەڕێتەوە. دڵنیایت لە سڕینەوە؟</p>
                            <div className="flex gap-3">
                                <button onClick={() => setMovieToDelete(null)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs py-4 rounded-xl transition-all duration-300">
                                    پاشگەزبوونەوە
                                </button>
                                <button onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-750 text-white font-black uppercase text-xs py-4 rounded-xl transition-all duration-300 shadow-lg shadow-red-600/20 active:scale-95">
                                    سڕینەوە
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Portal>
    );
};

// Sub-components
const GlassCustomizer: React.FC = () => {
    const { glassConfig, updateGlassConfig } = useUI();
    const { addNotification } = useNotification();
    const [localConfig, setLocalConfig] = useState(glassConfig);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setLocalConfig(glassConfig);
    }, [glassConfig]);

    const handleSave = async () => {
        setIsSaving(true);
        const success = await updateGlassConfig(localConfig);
        setIsSaving(false);
        if (success) {
            addNotification({ type: 'success', title: 'تۆمار کرا', message: 'دیزاینەکە بە سەرکەوتوویی بڵاوکرایەوە بۆ هەمووان!' });
        } else {
            addNotification({ type: 'error', title: 'کێشەیەک ڕوویدا', message: 'پەیوەندی سەرنەکەوت لەگەڵ سێرڤەر.' });
        }
    };

    return (
        <div className="space-y-6 pb-6 text-right animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-white/[0.02] border border-white/[0.06] p-5 rounded-3xl">
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">کۆنتڕۆڵی دیزاینی شووشە (Glassmorphism Settings)</h3>
                <p className="text-[10px] text-gray-400 font-bold leading-relaxed font-sans">
                    لەم بەشەدا دەتوانیت لێڵی، ڕوونی، و ڕەنگی بەشە شووشەییەکانی تەواوی وێب سایتەکە بگۆڕیت. هەر گۆڕانکارییەک تۆمار بکەیت ڕاستەوخۆ بۆ هەموو بەکارهێنەران چالاک دەبێت.
                </p>
            </div>

            <div className="space-y-4 bg-white/[0.01] border border-white/[0.06] p-5 rounded-3xl">
                <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                        <span>ڕادەی لێڵی پاشبنەما (Blur)</span>
                        <span className="font-mono text-brand">{localConfig.blurAmount}px</span>
                    </div>
                    <input type="range" min="5" max="120" value={localConfig.blurAmount}
                        onChange={(e) => setLocalConfig({ ...localConfig, blurAmount: Number(e.target.value) })}
                        className="w-full accent-brand bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer" />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                        <span>تێربوونی ڕەنگ (Saturation)</span>
                        <span className="font-mono text-brand">{localConfig.saturation}%</span>
                    </div>
                    <input type="range" min="50" max="250" value={localConfig.saturation}
                        onChange={(e) => setLocalConfig({ ...localConfig, saturation: Number(e.target.value) })}
                        className="w-full accent-brand bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer" />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                        <span>ڕوونی چوارچێوەی بەشەکان (Border Opacity)</span>
                        <span className="font-mono text-brand">{Math.round(localConfig.borderOpacity * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="90" value={Math.round(localConfig.borderOpacity * 100)}
                        onChange={(e) => setLocalConfig({ ...localConfig, borderOpacity: Number(e.target.value) / 100 })}
                        className="w-full accent-brand bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer" />
                </div>
            </div>

            <button onClick={handleSave} disabled={isSaving} className="w-full mt-4 py-4 rounded-[1.5rem] bg-gradient-to-r from-brand to-red-700 hover:from-red-650 hover:to-red-800 text-white text-[10px] font-[1000] uppercase tracking-[0.3em] flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-lg shadow-brand/10">
                {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
                تۆمارکردن و بڵاوکردنەوە بۆ هەمووان (Save & Apply)
            </button>
        </div>
    );
};

const MobileNavCustomizer: React.FC = () => {
    const { mobileNavConfig, updateMobileNavConfig } = useUI();
    const { addNotification } = useNotification();
    const [localConfig, setLocalConfig] = useState<any>(mobileNavConfig);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setLocalConfig(mobileNavConfig);
    }, [mobileNavConfig]);

    if (!localConfig) return null;

    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
    };

    const rgbToHex = (r: number, g: number, b: number) => {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const success = await updateMobileNavConfig(localConfig);
        setIsSaving(false);
        if (success) {
            addNotification({ type: 'success', title: 'تۆمار کرا', message: 'ڕێکخستنی ناڤیگەیشن مۆبایل بە سەرکەوتوویی بڵاوکرایەوە!' });
        }
    };

    const currentColorHex = rgbToHex(localConfig.colorR ?? 220, localConfig.colorG ?? 38, localConfig.colorB ?? 38);

    return (
        <div className="space-y-6 pb-6 text-right animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-white/[0.02] border border-white/[0.06] p-5 rounded-3xl">
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">ڕێکخستنی ناڤیگەیشن بار بۆ مۆبایل</h3>
                <p className="text-[10px] text-gray-400 font-bold leading-relaxed font-sans">
                    لەم پانێلەدا دەتوانیت دیزاین، ڕەنگی جەختکردنەوە و پانی بارەکەی خوارەوەی مۆبایلەکان دەستکاری بکەیت.
                </p>
            </div>

            <div className="space-y-4">
                <div className="bg-white/[0.01] border border-white/[0.06] p-5 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-black/20 border border-white/[0.04] flex-row-reverse">
                        <div className="text-right">
                            <span className="text-[11px] font-black uppercase text-gray-300 block mb-0.5">ڕەنگی سەرەکی (Accent Color)</span>
                        </div>
                        <input
                            type="color"
                            value={currentColorHex}
                            onChange={(e) => {
                                const rgb = hexToRgb(e.target.value);
                                if (rgb) setLocalConfig({ ...localConfig, colorR: rgb.r, colorG: rgb.g, colorB: rgb.b });
                            }}
                            className="w-12 h-12 rounded-2xl bg-transparent border-0 cursor-pointer overflow-hidden p-0 shadow-lg shadow-black/20"
                        />
                    </div>
                </div>

                <div className="bg-white/[0.01] border border-white/[0.06] p-5 rounded-3xl space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                            <span>پانی بارەکە (Width)</span>
                            <span className="font-mono text-brand">{localConfig.capsuleWidth}%</span>
                        </div>
                        <input type="range" min="70" max="100" value={localConfig.capsuleWidth}
                            onChange={(e) => setLocalConfig({ ...localConfig, capsuleWidth: Number(e.target.value) })}
                            className="w-full accent-brand bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer" />
                    </div>
                </div>
            </div>

            <button onClick={handleSave} disabled={isSaving} className="w-full mt-4 py-4 rounded-[1.5rem] bg-gradient-to-r from-brand to-red-700 hover:from-red-650 hover:to-red-800 text-white text-[10px] font-[1000] uppercase tracking-[0.3em] flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-lg shadow-brand/10">
                {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
                تۆمارکردن و بڵاوکردنەوەی ناو بار مۆبایل
            </button>
        </div>
    );
};

const PlayerControlsCustomizer: React.FC = () => {
    const { playerConfig, updatePlayerConfig } = useUI();
    const { addNotification } = useNotification();
    const [localConfig, setLocalConfig] = useState<any>(playerConfig);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setLocalConfig(playerConfig);
    }, [playerConfig]);

    if (!localConfig) return null;

    const handleSave = async () => {
        setIsSaving(true);
        const success = await updatePlayerConfig(localConfig);
        setIsSaving(false);
        if (success) {
            addNotification({ type: 'success', title: 'سەرکەوتوو بوو', message: 'شوێنی دوگمەکانی پلەیەر بە سەرکەوتوویی بۆ هەمووان نوێکرایەوە!' });
        }
    };

    return (
        <div className="space-y-6 text-right animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-white/[0.02] border border-white/[0.06] p-5 rounded-3xl">
                <h3 className="text-sm font-black text-white flex items-center gap-2 justify-end mb-2">
                    <Sparkles className="text-yellow-500 animate-pulse" size={16} />
                    ڕێکخستنی شوێنی دوگمەکانی پلەیەر
                </h3>
                <p className="text-[10px] text-gray-400 font-bold leading-relaxed font-sans">
                    لەم بەشەدا دەتوانیت دیاریکەیت کە ئایا دوگمەکانی کۆنتڕۆڵکردنی پلەیەر (پاشەکەوت، پێشەوە، سەردێڕەکان) لە بەشی سەرەوە یاخود خوارەوەی شاشەی ڤیدیۆ نمایش بکرێن.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 bg-white/[0.01] border border-white/[0.06] p-5 rounded-3xl text-right">
                <div className="space-y-3">
                    <span className="text-[11px] font-black uppercase text-gray-400 block">ئاراستەی نیشاندان (Alignment)</span>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setLocalConfig({ ...localConfig, controlsAlign: 0 })}
                            className={`flex-1 py-4 rounded-2xl text-xs font-black transition-all duration-300 active:scale-95 ${localConfig.controlsAlign === 0 ? 'bg-brand text-white shadow-lg shadow-brand/20 border border-brand' : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}>
                            سەرەوە (Top Controls)
                        </button>
                        <button type="button" onClick={() => setLocalConfig({ ...localConfig, controlsAlign: 1 })}
                            className={`flex-1 py-4 rounded-2xl text-xs font-black transition-all duration-300 active:scale-95 ${localConfig.controlsAlign === 1 ? 'bg-brand text-white shadow-lg shadow-brand/20 border border-brand' : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}>
                            خوارەوە (Bottom Controls)
                        </button>
                    </div>
                </div>
            </div>

            <button onClick={handleSave} disabled={isSaving} className="w-full py-4 rounded-[1.5rem] bg-gradient-to-r from-brand to-red-700 hover:from-red-650 hover:to-red-800 text-white text-[10px] font-[1000] uppercase tracking-[0.3em] flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-lg shadow-brand/10">
                {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
                سەیڤکردن و کاراکردن بۆ هەمووان
            </button>
        </div>
    );
};

const OnboardingCustomizer: React.FC = () => {
    const [steps, setSteps] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState<number | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const { addNotification } = useNotification();

    const [newStepKey, setNewStepKey] = useState('');
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newMedia, setNewMedia] = useState('');
    const [newSelector, setNewSelector] = useState('');
    const [newPriority, setNewPriority] = useState(10);

    const fetchSteps = async () => {
        try {
            const { data, error } = await supabase
                .from('onboarding_steps')
                .select('*')
                .order('priority', { ascending: true });
            if (error) throw error;
            if (data) setSteps(data);
        } catch (e) {}
    };

    useEffect(() => {
        fetchSteps();
    }, []);

    const handleUpdateStep = async (stepId: number, updatedFields: any) => {
        setIsSaving(stepId);
        try {
            const { error } = await supabase
                .from('onboarding_steps')
                .update(updatedFields)
                .eq('id', stepId);

            if (error) throw error;
            addNotification({ type: 'success', title: 'تۆمار کرا', message: 'هەنگاوی ڕێبەرەکە بە سەرکەوتوویی نوێکرایەوە!' });
            fetchSteps();
        } catch (e) {
            addNotification({ type: 'error', title: 'کێشەیەک ڕوویدا', message: 'پەیوەندی لەگەڵ سێرڤەر سەرنەکەوت.' });
        } finally {
            setIsSaving(null);
        }
    };

    const handleDeleteStep = async (stepId: number) => {
        if (!confirm('ئایا دڵنیایت لە سڕینەوەی ئەم هەنگاوە؟')) return;
        try {
            const { error } = await supabase
                .from('onboarding_steps')
                .delete()
                .eq('id', stepId);

            if (error) throw error;
            addNotification({ type: 'success', title: 'سڕایەوە', message: 'هەنگاوەکە بە سەرکەوتوویی سڕایەوە.' });
            fetchSteps();
        } catch (e) {}
    };

    const handleCreateStep = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStepKey || !newTitle || !newDesc) return;
        setIsCreating(true);
        try {
            const { error } = await supabase
                .from('onboarding_steps')
                .insert([{
                    step_key: newStepKey, title_ku: newTitle, description_ku: newDesc,
                    media_url: newMedia || null, selector: newSelector || null, priority: Number(newPriority)
                }]);

            if (error) throw error;
            addNotification({ type: 'success', title: 'زیاد کرا', message: 'هەنگاوی نوێ بە سەرکەوتوویی بۆ گەشتەکە زیاد کرا!' });
            setNewStepKey(''); setNewTitle(''); setNewDesc(''); setNewMedia(''); setNewSelector(''); setNewPriority(10);
            fetchSteps();
        } catch (e: any) {
            addNotification({ type: 'error', title: 'کێشەیەک ڕوویدا', message: e.message });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-6 pb-6 text-right animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-white/[0.02] border border-white/[0.06] p-5 rounded-3xl flex items-center justify-between gap-4 flex-row-reverse">
                <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-1">ڕێبەری گەشت و فێرکاری وێبسایت</h3>
                    <p className="text-[10px] text-gray-400 font-bold leading-relaxed font-sans">
                        هەنگاوەکانی گەشتی فێرکاری وێب سایت بۆ بەکارهێنەرانی نوێ دروست بکە یاخود لێرەوە دەستکارییان بکە.
                    </p>
                </div>
            </div>

            {/* List of Steps */}
            <div className="space-y-4">
                {steps.map((step) => (
                    <div key={step.id} className="bg-white/[0.01] hover:bg-white/[0.02] border border-white/[0.06] p-5 rounded-3xl space-y-4 text-right transition-all duration-300">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2.5 flex-row-reverse">
                            <span className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-widest bg-white/5 py-1 px-2.5 rounded-lg border border-white/5">Key: {step.step_key}</span>
                            <button onClick={() => handleDeleteStep(step.id)} className="text-red-500 hover:text-red-400 text-[10px] font-black uppercase tracking-wider bg-red-500/10 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-xl transition-all">سڕینەوە</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5 text-right">
                                <label className="text-[10px] font-black text-gray-400 block">ناونیشانی هەنگاو</label>
                                <input type="text" defaultValue={step.title_ku} onBlur={(e) => handleUpdateStep(step.id, { title_ku: e.target.value })}
                                    className="w-full bg-black/40 border border-white/[0.08] focus:border-brand/45 focus:bg-[#121218]/80 rounded-2xl py-2 px-3 text-xs font-bold text-white text-right transition-all outline-none" />
                            </div>
                            <div className="space-y-1.5 text-right">
                                <label className="text-[10px] font-black text-gray-400 block">CSS Selector (Optional)</label>
                                <input type="text" defaultValue={step.selector} onBlur={(e) => handleUpdateStep(step.id, { selector: e.target.value })}
                                    className="w-full bg-black/40 border border-white/[0.08] focus:border-brand/45 focus:bg-[#121218]/80 rounded-2xl py-2 px-3 text-xs font-bold text-white text-left transition-all outline-none" />
                            </div>
                        </div>
                        <div className="space-y-1.5 text-right">
                            <label className="text-[10px] font-black text-gray-400 block">ڕوونکردنەوە (Description)</label>
                            <textarea defaultValue={step.description_ku} onBlur={(e) => handleUpdateStep(step.id, { description_ku: e.target.value })} rows={2}
                                className="w-full bg-black/40 border border-white/[0.08] focus:border-brand/45 focus:bg-[#121218]/80 rounded-2xl py-2.5 px-3 text-xs font-bold text-white text-right resize-none transition-all outline-none" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Create New Step Form */}
            <div className="bg-white/[0.02] border border-white/[0.06] p-6 rounded-3xl space-y-4 text-right">
                <h4 className="text-xs font-black text-brand uppercase tracking-widest border-b border-white/5 pb-2">زیادکردنی هەنگاوی نوێ</h4>
                <form onSubmit={handleCreateStep} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-right">
                            <label className="text-[10px] font-black text-gray-400 block">ناسنامەی هەنگاو (Step Key)</label>
                            <input type="text" value={newStepKey} onChange={(e) => setNewStepKey(e.target.value)} required placeholder="e.g., profile_edit"
                                className="w-full bg-black/40 border border-white/[0.08] focus:border-brand/40 focus:bg-[#121218]/80 rounded-2xl py-3 px-4 text-xs font-bold text-white text-left outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5 text-right">
                            <label className="text-[10px] font-black text-gray-400 block">CSS Selector (Optional)</label>
                            <input type="text" value={newSelector} onChange={(e) => setNewSelector(e.target.value)} placeholder="e.g., #edit-profile-btn"
                                className="w-full bg-black/40 border border-white/[0.08] focus:border-brand/40 focus:bg-[#121218]/80 rounded-2xl py-3 px-4 text-xs font-bold text-white text-left outline-none transition-all" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-right">
                            <label className="text-[10px] font-black text-gray-400 block">ناونیشان (Title Kurdish)</label>
                            <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required placeholder="سەردێڕی هەنگاوەکە بنووسە..."
                                className="w-full bg-black/40 border border-white/[0.08] focus:border-brand/40 focus:bg-[#121218]/80 rounded-2xl py-3 px-4 text-xs font-bold text-white text-right outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5 text-right">
                            <label className="text-[10px] font-black text-gray-400 block">ڕێزبەندی (Priority)</label>
                            <input type="number" value={newPriority} onChange={(e) => setNewPriority(Number(e.target.value))} required
                                className="w-full bg-black/40 border border-white/[0.08] focus:border-brand/40 focus:bg-[#121218]/80 rounded-2xl py-3 px-4 text-xs font-bold text-white text-left outline-none transition-all" />
                        </div>
                    </div>
                    <div className="space-y-1.5 text-right">
                        <label className="text-[10px] font-black text-gray-400 block">ڕوونکردنەوە (Description Kurdish)</label>
                        <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} required rows={2} placeholder="ڕوونکردنەوەی فێرکارییەکە لێرە بنووسە..."
                            className="w-full bg-black/40 border border-white/[0.08] focus:border-brand/40 focus:bg-[#121218]/80 rounded-2xl py-3.5 px-4 text-xs font-bold text-white text-right resize-none outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5 text-right">
                        <label className="text-[10px] font-black text-gray-400 block">لینک یان وێنەی جوڵاو / GIF (Media URL)</label>
                        <input type="text" value={newMedia} onChange={(e) => setNewMedia(e.target.value)} placeholder="https://media.giphy.com/..."
                            className="w-full bg-black/40 border border-white/[0.08] focus:border-brand/40 focus:bg-[#121218]/80 rounded-2xl py-3 px-4 text-xs font-bold text-white text-left outline-none transition-all" />
                    </div>
                    <button type="submit" disabled={isCreating} className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand to-red-700 hover:from-red-650 hover:to-red-800 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-brand/20 transition-all duration-300 active:scale-[0.99] disabled:opacity-50">
                        {isCreating ? <RefreshCw className="animate-spin" size={14} /> : <Plus size={14} />}
                        زیادکردنی هەنگاوەکە (Add Step)
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminPanelModal;
