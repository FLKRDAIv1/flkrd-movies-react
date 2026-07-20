import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Shield, Zap, Bell, Moon, Sun, Languages,
    Save, Edit3, Camera, Clock, Activity, Award,
    ChevronRight, ArrowLeft, Check, Sparkles, Monitor, Smartphone, Download,
    ShieldCheck, LogOut, Mail, Lock, Eye, EyeOff, KeyRound, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import { SkeletonProfile } from '../components/Skeleton';
import { downloadMobileConfig } from '../utils/appleProfileUtils';
import AnimatedThemeToggler from '../components/ui/animated-theme-toggler';
import { useAuth } from '../contexts/AuthContext';
import { fetchData } from '../services/tmdbService';
import { requests, IMAGE_BASE_URL, API_KEY } from '../constants';
import { supabase } from '../utils/supabaseClient';
import { db } from '../utils/db';
import ElasticStack from '../components/ui/elastic-stack';
import MovieBentoGrid from '../components/ui/movie-bento-grid';
import Portal from '../components/Portal';
import { AvatarEffectContainer, AvatarEffectType } from '../components/UserProfileModal';

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { t, language, setLanguage } = useTranslation();
    const { theme, toggleTheme, accentColor, setIsSettingsOpen } = useUI();
    const { addNotification } = useNotification();
    const { user, signIn, signUp, signOut, resetPassword, loading: authLoading, isPasswordRecovery, updatePassword, signInWithGoogle } = useAuth();
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Local states
    const [authScreen, setAuthScreen] = useState<'login' | 'signup' | 'reset'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [regUserName, setRegUserName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [loading, setLoading] = useState(true);
    const [formSubmitting, setFormSubmitting] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempUserName, setTempUserName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

    // Known TMDB backdrop paths — displayed immediately, no API wait
    const STATIC_BACKDROPS = [
        'https://image.tmdb.org/t/p/w1280/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg',
        'https://image.tmdb.org/t/p/w1280/f1AQhx6ZfGhPkFzvgARFNoeavvg.jpg',
        'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
        'https://image.tmdb.org/t/p/w1280/drulhSX7P5TQlEMQZ3JoXKSDEfz.jpg',
        'https://image.tmdb.org/t/p/w1280/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    ];

    // Load avatar from IndexedDB, LocalStorage or user metadata on mount / user change
    useEffect(() => {
        const loadAvatar = async () => {
            const localAvatar = localStorage.getItem('flkrd_avatar_url') || sessionStorage.getItem('flkrd_avatar_url');
            if (localAvatar) {
                setAvatarUrl(localAvatar);
            } else {
                const idbAvatar = await db.getAvatar('current_user_avatar');
                if (idbAvatar) {
                    setAvatarUrl(idbAvatar);
                } else if (user?.user_metadata?.avatar_url) {
                    setAvatarUrl(user.user_metadata.avatar_url);
                }
            }
        };
        loadAvatar();
        if (user?.user_metadata?.user_name) {
            setTempUserName(user.user_metadata.user_name);
        } else if (user?.email) {
            setTempUserName(user.email.split('@')[0]);
        }
    }, [user]);

    const [backdropUrl, setBackdropUrl] = useState(
        () => STATIC_BACKDROPS[Math.floor(Math.random() * STATIC_BACKDROPS.length)]
    );

    useEffect(() => {
        const loadBackdrop = async () => {
            try {
                const data = await fetchData(requests.fetchTrending('en-US'), 'en');
                if (data && data.length > 0) {
                    const pick = data.find((m: any) => m.backdrop_path) || data[0];
                    if (pick?.backdrop_path) {
                        setBackdropUrl(`https://image.tmdb.org/t/p/w1280${pick.backdrop_path}`);
                    }
                }
            } catch (e) {
                // already showing static fallback, no change needed
            }
        };
        loadBackdrop();
    }, []);

    // Override body background so the profile video background is actually visible
    useEffect(() => {
        const prev = document.body.style.backgroundColor;
        document.body.style.backgroundColor = 'transparent';
        document.documentElement.style.backgroundColor = 'transparent';
        return () => {
            document.body.style.backgroundColor = prev;
            document.documentElement.style.backgroundColor = '';
        };
    }, []);

    const [notifEnabled, setNotifEnabled] = useState(() => Notification.permission === 'granted');

    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/.test(userAgent);
    const isApple = isIOS || isMac || (isMac && "ontouchend" in document);

    const stats = {
        memberSince: user?.created_at ? new Date(user.created_at).getFullYear().toString() : '2026',
        watchedCount: JSON.parse(localStorage.getItem('watchProgress') || '[]').length,
        rank: t('userRank')
    };

    const watchedHistory = React.useMemo(() => {
        try {
            const raw = localStorage.getItem('watchProgress');
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }, []);

    const elasticStackItems = React.useMemo(() => {
        return watchedHistory
            .filter((item: any) => item && item.poster_path)
            .map((item: any) => ({
                id: `${item.id}-${item.type}`,
                image: item.poster_path?.startsWith('http') 
                    ? item.poster_path 
                    : `https://image.tmdb.org/t/p/w200${item.poster_path}`,
                name: item.title || item.name || 'Movie',
                raw: item
            }))
            .slice(0, 7);
    }, [watchedHistory]);

    const handleElasticItemClick = (item: any) => {
        const raw = item.raw;
        if (!raw) return;
        if (String(raw.type) === 'dubbed') {
            navigate(`/dubbed-details/${raw.id}`);
        } else {
            navigate(`/details/${raw.type}/${raw.id}`);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 600);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (user) {
            setTempUserName(user.user_metadata?.user_name || user.email?.split('@')[0] || 'User');
        }
    }, [user]);

    const handleSaveName = async () => {
        if (!tempUserName.trim()) return;
        localStorage.setItem('flkrd_username', tempUserName);
        setIsEditingName(false);
        addNotification({ type: 'success', title: 'Profile Updated', message: 'User identity synchronized.' });
    };

    const handleLanguageChange = (lang: 'en' | 'ku' | 'badini') => {
        setLanguage(lang);
        let langName = 'English';
        if (lang === 'ku') langName = 'Kurdish Sorani';
        if (lang === 'badini') langName = 'Kurdish Badini';
        addNotification({ type: 'info', title: 'Language Sync', message: `Interface language set to ${langName}.` });
    };

    // Authentication Handlers
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            addNotification({ type: 'error', title: 'Error', message: 'Please fill in all fields' });
            return;
        }
        setFormSubmitting(true);
        const { error } = await signIn(email, password);
        setFormSubmitting(false);
        if (error) {
            addNotification({ type: 'error', title: 'Login Failed', message: error.message });
        } else {
            addNotification({ type: 'success', title: 'Welcome Back', message: 'Successfully signed in.' });
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || !regUserName) {
            addNotification({ type: 'error', title: 'Error', message: 'Please fill in all fields' });
            return;
        }
        if (password !== confirmPassword) {
            addNotification({ type: 'error', title: 'Error', message: 'Passwords do not match' });
            return;
        }
        setFormSubmitting(true);
        const { error } = await signUp(email, password, regUserName);
        setFormSubmitting(false);
        if (error) {
            addNotification({ type: 'error', title: 'Registration Failed', message: error.message });
        } else {
            addNotification({ type: 'success', title: 'Account Created', message: 'Please check your email for confirmation link.' });
            setAuthScreen('login');
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            addNotification({ type: 'error', title: 'Error', message: 'Please enter your email' });
            return;
        }
        setFormSubmitting(true);
        const { error } = await resetPassword(email);
        setFormSubmitting(false);
        if (error) {
            addNotification({ type: 'error', title: 'Reset Failed', message: error.message });
        } else {
            addNotification({ type: 'success', title: 'Email Sent', message: 'Check your email for the reset link.' });
            setAuthScreen('login');
        }
    };

    // Upload avatar to Supabase Storage and save URL to user metadata
    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 6) {
            addNotification({ type: 'error', title: 'Too short', message: 'Password must be at least 6 characters.' });
            return;
        }
        if (newPassword !== newPasswordConfirm) {
            addNotification({ type: 'error', title: 'Mismatch', message: 'Passwords do not match.' });
            return;
        }
        setFormSubmitting(true);
        const { error } = await updatePassword(newPassword);
        setFormSubmitting(false);
        if (error) {
            addNotification({ type: 'error', title: 'Update Failed', message: error.message });
        } else {
            addNotification({ type: 'success', title: 'Password Updated!', message: 'You can now sign in with your new password.' });
            setNewPassword('');
            setNewPasswordConfirm('');
            navigate('/profile', { replace: true });
        }
    };

    const [avatarEffect, setAvatarEffect] = useState<AvatarEffectType>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('flkrd_avatar_effect') as AvatarEffectType) || 'none';
        }
        return 'none';
    });

    const handleSelectAvatarEffect = async (eff: AvatarEffectType) => {
        setAvatarEffect(eff);
        localStorage.setItem('flkrd_avatar_effect', eff);
        addNotification({ type: 'success', title: 'Effect Applied', message: `Avatar animation effect updated!` });
    };

    const safeSetAvatarStorage = (avatarDataUrl: string) => {
        try {
            localStorage.setItem('flkrd_avatar_url', avatarDataUrl);
        } catch (err) {
            console.warn("[AVATAR] LocalStorage quota exceeded, clearing old caches...");
            try {
                // Clear non-essential cached items in localStorage to free up space
                localStorage.removeItem('flkrd_fallback_movies');
                localStorage.removeItem('flkrd_fallback_tmdb');
                localStorage.removeItem('tmdb_cache');
                localStorage.setItem('flkrd_avatar_url', avatarDataUrl);
            } catch (retryErr) {
                console.warn("[AVATAR] LocalStorage still full. Using sessionStorage fallback.");
                try {
                    sessionStorage.setItem('flkrd_avatar_url', avatarDataUrl);
                } catch (sErr) {
                    console.warn("[AVATAR] SessionStorage fallback error", sErr);
                }
            }
        }
    };

    const processAvatarFile = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
            const reader = new FileReader();

            if (isGif) {
                // Keep 100% full quality animation for GIF files
                reader.readAsDataURL(file);
                reader.onload = (event) => resolve(event.target?.result as string);
                reader.onerror = (err) => reject(err);
            } else {
                // Auto-resize static images (PNG, JPG, WEBP, SVG) to crisp 400x400 HD WebP for zero quota strain
                reader.readAsDataURL(file);
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target?.result as string;
                    img.onload = () => {
                        const maxDim = 400;
                        let width = img.width;
                        let height = img.height;
                        if (width > height) {
                            if (width > maxDim) {
                                height = Math.round((height * maxDim) / width);
                                width = maxDim;
                            }
                        } else {
                            if (height > maxDim) {
                                width = Math.round((width * maxDim) / height);
                                height = maxDim;
                            }
                        }
                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.imageSmoothingEnabled = true;
                            ctx.imageSmoothingQuality = 'high';
                            ctx.drawImage(img, 0, 0, width, height);
                            resolve(canvas.toDataURL('image/webp', 0.85));
                        } else {
                            resolve(event.target?.result as string);
                        }
                    };
                    img.onerror = () => resolve(event.target?.result as string);
                };
                reader.onerror = (err) => reject(err);
            }
        });
    };    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setAvatarUploading(true);
        try {
            let finalUrl = '';
            const ext = (file.name.split('.').pop() || 'gif').toLowerCase();
            const storagePath = `user_avatars/${user.id}_${Date.now()}.${ext}`;

            // 1. Primary path: Upload directly to Supabase Storage 'avatars' bucket
            try {
                const { data: uploadRes, error: uploadErr } = await supabase.storage
                    .from('avatars')
                    .upload(storagePath, file, { cacheControl: '3600', upsert: true });

                if (!uploadErr && uploadRes) {
                    const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(storagePath);
                    if (pubData?.publicUrl) {
                        finalUrl = pubData.publicUrl;
                    }
                }
            } catch (storageErr) {
                console.warn("[AVATAR] Supabase Storage upload error, falling back to local processing", storageErr);
            }

            // 2. Fallback path: Process as local DataURL if cloud upload is unreached
            if (!finalUrl) {
                finalUrl = await processAvatarFile(file);
            }
            await db.saveAvatar('current_user_avatar', finalUrl);

            // 3. Update Supabase Auth User Metadata with finalUrl if it's a valid public HTTP URL
            if (finalUrl.startsWith('http')) {
                try {
                    await supabase.auth.updateUser({
                        data: { avatar_url: finalUrl }
                    });
                } catch (authErr) {
                    // Silent catch for auth CORS restrictions
                }
            }

            // 4. Save to local storage & state, then dispatch events
            safeSetAvatarStorage(finalUrl);
            setAvatarUrl(finalUrl);
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('flkrd-avatar-changed'));

            addNotification({
                type: 'success',
                title: 'Avatar Updated',
                message: file.type === 'image/gif' ? 'Animated GIF profile updated & uploaded to cloud!' : 'Profile picture updated & uploaded to cloud!'
            });
        } catch (err: any) {
            addNotification({ type: 'error', title: 'Upload Failed', message: err.message || 'Could not upload avatar.' });
        } finally {
            setAvatarUploading(false);
        }
    };

    const handleOAuth = async (provider: 'google' | 'apple') => {
        if (provider === 'google') {
            addNotification({ type: 'info', title: 'Google Auth', message: 'Redirecting to Google sign-in...' });
            const { error } = await signInWithGoogle();
            if (error) {
                addNotification({ type: 'error', title: 'Google Auth Failed', message: error.message || 'Could not sign in with Google.' });
            }
        } else {
            addNotification({ type: 'info', title: 'Apple Auth', message: 'Apple sign-in coming soon.' });
        }
    };

    if (loading || authLoading) return <SkeletonProfile />;

    // ─── PASSWORD RECOVERY SCREEN — shown when user clicks the reset link in email ─────
    if (isPasswordRecovery) {
        const isRTL = language === 'ku' || language === 'badini';
        const AUTH_VIDEO_DARK  = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_055001_8e16d972-3b2b-441c-86ad-2901a54682f9.mp4';
        const AUTH_VIDEO_LIGHT = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4';
        const authVideo = theme === 'dark' ? AUTH_VIDEO_DARK : AUTH_VIDEO_LIGHT;
        return (
            <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-20">
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="w-full max-w-[420px] bg-black/25 backdrop-blur-[10px] border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-[0_40px_80px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)] relative z-10"
                >
                    {/* Top brand accent */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-transparent via-[var(--brand-red)] to-transparent rounded-full" />
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-[var(--brand-red)] to-red-900 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-900/40">
                            <KeyRound size={28} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-[1000] uppercase italic tracking-tighter text-white mb-1">
                            {isRTL ? 'پاسوۆردی نوێ' : 'New Password'}
                        </h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                            {isRTL ? 'پاسوۆردی نوێت دیاری بکە' : 'Choose a strong new password'}
                        </p>
                    </div>
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block px-1">
                                {isRTL ? 'پاسوۆردی نوێ' : 'New Password'}
                            </label>
                            <input
                                type="password" required minLength={6}
                                value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                placeholder={isRTL ? 'پاسوۆردی نوێ بنووسە' : 'Enter new password (min 6 chars)'}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 px-4 text-xs font-bold text-white outline-none focus:border-[var(--brand-red)]/40 focus:bg-white/[0.05] transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block px-1">
                                {isRTL ? 'پشتڕاستکردنەوە' : 'Confirm Password'}
                            </label>
                            <input
                                type="password" required
                                value={newPasswordConfirm} onChange={e => setNewPasswordConfirm(e.target.value)}
                                placeholder={isRTL ? 'پاسوۆرد دووبارە بنووسە' : 'Confirm your new password'}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 px-4 text-xs font-bold text-white outline-none focus:border-[var(--brand-red)]/40 focus:bg-white/[0.05] transition-all"
                            />
                        </div>
                        <button
                            type="submit" disabled={formSubmitting}
                            className="w-full mt-2 py-4 bg-gradient-to-r from-[var(--brand-red)] to-red-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/30 hover:opacity-90 active:scale-98"
                        >
                            {formSubmitting
                                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                : <><Check size={14} />{isRTL ? 'تازەکردنەوەی پاسوۆرد' : 'Update Password'}</>
                            }
                        </button>
                    </form>
                </motion.div>
            </div>
        );
    }

    // ─── UNAUTHENTICATED GUEST AUTHENTICATION VIEW (LIQUID GLASS) ──────────────────────
    if (!user) {
        const isRTL = language === 'ku' || language === 'badini';

        const AUTH_VIDEO_DARK  = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_055001_8e16d972-3b2b-441c-86ad-2901a54682f9.mp4';
        const AUTH_VIDEO_LIGHT = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4';
        const authVideo = theme === 'dark' ? AUTH_VIDEO_DARK : AUTH_VIDEO_LIGHT;

        return (
            <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-20">

                <motion.div 
                    initial={{ opacity: 0, y: 30, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="w-full max-w-[430px] bg-black/25 backdrop-blur-[10px] border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-[0_40px_80px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)] relative z-10 overflow-hidden flex flex-col min-h-[560px]"
                >
                    {/* Back Button Pill */}
                    <button
                        onClick={() => navigate(-1)}
                        className="absolute top-6 left-6 flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white text-[10px] font-black uppercase tracking-wider hover:bg-white/15 active:scale-95 transition-all shadow-md"
                    >
                        <ArrowLeft size={10} />
                        <span>{isRTL ? 'گەڕانەوە' : 'Back'}</span>
                    </button>

                    {/* Logo & Header */}
                    <div className="text-center space-y-2 mt-10 mb-8 select-none">
                        <span className="text-[14px] font-[1000] text-white tracking-widest italic block">FLKRD MOVIE</span>
                        <h2 className="text-xl md:text-2xl font-[900] text-white tracking-tight uppercase leading-tight max-w-[280px] mx-auto opacity-95">
                            {authScreen === 'login' && (isRTL ? 'بچۆ ژوورەوە، گەشتەکەت دەستپێبکە' : 'Log In, Start Your AI Journey')}
                            {authScreen === 'signup' && (isRTL ? 'ئەکاونتت دروست بکە' : 'Start Here, Create Your Account')}
                            {authScreen === 'reset' && (isRTL ? 'دانانەوەی پاسوۆرد' : 'Reset Password To Continue Using')}
                        </h2>
                    </div>

                    {/* Forms Area */}
                    <div className="flex-grow">
                        <AnimatePresence mode="wait">
                            {authScreen === 'login' && (
                                <motion.form 
                                    key="login-form"
                                    initial={{ opacity: 0, x: -15 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 15 }}
                                    onSubmit={handleLogin} 
                                    className="space-y-5 text-left"
                                    dir={isRTL ? 'rtl' : 'ltr'}
                                >
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block px-1">
                                            {isRTL ? 'ئیمەیڵ' : 'Email'}
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type="email" required
                                                value={email} onChange={e => setEmail(e.target.value)}
                                                placeholder={isRTL ? 'ئیمەیڵەکەت بنووسە' : 'Enter your email'}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 px-4 text-xs font-bold text-white outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block px-1">
                                            {isRTL ? 'پاسوۆرد' : 'Password'}
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type={showPassword ? "text" : "password"} required
                                                value={password} onChange={e => setPassword(e.target.value)}
                                                placeholder={isRTL ? 'پاسوۆردەکەت بنووسە' : 'Enter your password'}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 px-4 text-xs font-bold text-white outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors`}
                                            >
                                                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between py-1 px-1">
                                        <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 cursor-pointer select-none">
                                            <input 
                                                type="checkbox" 
                                                checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                                                className="rounded border-white/10 accent-brand w-3.5 h-3.5 bg-transparent"
                                            />
                                            {isRTL ? 'بمھێڵەوە' : 'Remember me'}
                                        </label>
                                    </div>

                                    <button 
                                        type="submit" disabled={formSubmitting}
                                        className="w-full py-4 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-black uppercase text-xs tracking-widest rounded-full transition-all flex items-center justify-center gap-2 shadow-lg active:scale-98"
                                    >
                                        {formSubmitting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : (isRTL ? 'چوونەژوورەوە' : 'Login')}
                                    </button>
                                </motion.form>
                            )}

                            {authScreen === 'signup' && (
                                <motion.form 
                                    key="signup-form"
                                    initial={{ opacity: 0, x: -15 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 15 }}
                                    onSubmit={handleSignUp} 
                                    className="space-y-4 text-left"
                                    dir={isRTL ? 'rtl' : 'ltr'}
                                >
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block px-1">
                                            {isRTL ? 'ناوی بەکارهێنەر' : 'Username'}
                                        </label>
                                        <input 
                                            type="text" required
                                            value={regUserName} onChange={e => setRegUserName(e.target.value)}
                                            placeholder={isRTL ? 'ناو بنووسە' : 'Enter your username'}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 px-4 text-xs font-bold text-white outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block px-1">
                                            {isRTL ? 'ئیمەیڵ' : 'Email'}
                                        </label>
                                        <input 
                                            type="email" required
                                            value={email} onChange={e => setEmail(e.target.value)}
                                            placeholder={isRTL ? 'ئیمەیڵ بنووسە' : 'Enter your email'}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 px-4 text-xs font-bold text-white outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block px-1">
                                            {isRTL ? 'پاسوۆرد' : 'Password'}
                                        </label>
                                        <input 
                                            type="password" required
                                            value={password} onChange={e => setPassword(e.target.value)}
                                            placeholder={isRTL ? 'پاسوۆردێکی بەهێز بنووسە' : 'Enter your password'}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 px-4 text-xs font-bold text-white outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block px-1">
                                            {isRTL ? 'پشتڕاستکردنەوەی پاسوۆرد' : 'Confirm password'}
                                        </label>
                                        <input 
                                            type="password" required
                                            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                            placeholder={isRTL ? 'پاسوۆرد دووبارە بکەرەوە' : 'Confirm your password'}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 px-4 text-xs font-bold text-white outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
                                        />
                                    </div>

                                    <button 
                                        type="submit" disabled={formSubmitting}
                                        className="w-full py-4 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-black uppercase text-xs tracking-widest rounded-full transition-all flex items-center justify-center gap-2 shadow-lg active:scale-98"
                                    >
                                        {formSubmitting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : (isRTL ? 'تۆماربوون' : 'Sign Up')}
                                    </button>
                                </motion.form>
                            )}

                            {authScreen === 'reset' && (
                                <motion.form 
                                    key="reset-form"
                                    initial={{ opacity: 0, x: -15 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 15 }}
                                    onSubmit={handleResetPassword} 
                                    className="space-y-5 text-left"
                                    dir={isRTL ? 'rtl' : 'ltr'}
                                >
                                    <p className="text-[10px] text-gray-500 font-bold leading-relaxed mb-1 uppercase px-1">
                                        {isRTL ? 'ئیمەیڵەکەت بنووسە بۆ ناردنی کۆدی دانانەوەی پاسوۆرد.' : 'Enter your email to receive a password reset link.'}
                                    </p>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block px-1">
                                            {isRTL ? 'ئیمەیڵ' : 'Email'}
                                        </label>
                                        <input 
                                            type="email" required
                                            value={email} onChange={e => setEmail(e.target.value)}
                                            placeholder="Enter your email"
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 px-4 text-xs font-bold text-white outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
                                        />
                                    </div>

                                    <button 
                                        type="submit" disabled={formSubmitting}
                                        className="w-full py-4 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-black uppercase text-xs tracking-widest rounded-full transition-all flex items-center justify-center gap-2 shadow-lg active:scale-98"
                                    >
                                        {formSubmitting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : (isRTL ? 'کۆد بنێرە' : 'Send Code')}
                                    </button>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Socials Divider */}
                    {authScreen === 'login' && (
                        <div className="space-y-5 mt-6">
                            <div className="flex items-center gap-3">
                                <div className="h-px bg-white/10 flex-1" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Or continue with</span>
                                <div className="h-px bg-white/10 flex-1" />
                            </div>

                            <div className="w-full">
                                <button 
                                    type="button"
                                    onClick={() => handleOAuth('google')}
                                    className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-white active:scale-95 shadow-md"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                                    Google
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Integrated Bottom Tab Switching Bar (Mockup Style) */}
                    <div className="mt-8 border-t border-white/10 pt-5 flex items-center justify-around text-xs font-black uppercase tracking-wider">
                        {authScreen === 'login' ? (
                            <>
                                <button 
                                    onClick={() => setAuthScreen('signup')}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    {isRTL ? 'دروستکردنی ئەکاونت' : 'Create Account'}
                                </button>
                                <span className="text-white/20">|</span>
                                <button 
                                    onClick={() => setAuthScreen('reset')}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    {isRTL ? 'دانانەوەی پاسوۆرد' : 'Reset Password'}
                                </button>
                            </>
                        ) : authScreen === 'signup' ? (
                            <>
                                <button 
                                    onClick={() => setAuthScreen('login')}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    {isRTL ? 'چوونەژوورەوە' : 'Log In'}
                                </button>
                                <span className="text-white/20">|</span>
                                <button 
                                    onClick={() => setAuthScreen('reset')}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    {isRTL ? 'دانانەوەی پاسوۆرد' : 'Reset Password'}
                                </button>
                            </>
                        ) : (
                            <>
                                <button 
                                    onClick={() => setAuthScreen('login')}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    {isRTL ? 'چوونەژوورەوە' : 'Log In'}
                                </button>
                                <span className="text-white/20">|</span>
                                <button 
                                    onClick={() => setAuthScreen('signup')}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    {isRTL ? 'دروستکردنی ئەکاونت' : 'Create Account'}
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        );
    }

    // ─── AUTHENTICATED PROFILE VIEW ──────────────────────────────────────────────────
    const PROFILE_VIDEO_DARK = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_031045_0e1165dd-ab48-46e3-ad3d-5fe77f217647.mp4';
    const PROFILE_VIDEO_LIGHT = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_171521_25968ba2-b594-4b32-aab7-f6b69398a6fa.mp4';
    const profileVideo = theme === 'dark' ? PROFILE_VIDEO_DARK : PROFILE_VIDEO_LIGHT;

    return (
        <div className="min-h-screen pt-32 pb-40 relative overflow-x-hidden" style={{ background: 'transparent' }}>

            <div className="max-w-5xl mx-auto px-4 md:px-8 relative z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-8 flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-[var(--brand-red)] text-white px-5 py-3 rounded-2xl transition-all shadow-xl group w-fit"
                >
                    {language === 'ku' || language === 'badini' ? <ArrowLeft size={20} className="rotate-180 group-hover:translate-x-1 transition-transform" /> : <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('back')}</span>
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
                    <div className="lg:col-span-4 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-black/30 backdrop-blur-[10px] border border-white/10 rounded-[3rem] p-10 text-center relative overflow-hidden shadow-2xl transition-colors duration-500"
                        >
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-[var(--brand-red)]" />

                            <div className="relative inline-block mb-6">
                                {/* Hidden file input */}
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/gif,image/png,image/jpeg,image/webp,image/apng,image/*,.gif"
                                    className="hidden"
                                    onChange={handleAvatarUpload}
                                />
                                <AvatarEffectContainer
                                    url={avatarUrl}
                                    name={tempUserName}
                                    effect={avatarEffect}
                                    email={user?.email}
                                    size={140}
                                />
                                <button
                                    onClick={() => avatarInputRef.current?.click()}
                                    className="absolute bottom-1 right-1 bg-[var(--brand-red)] text-white p-2.5 rounded-full border-4 border-black hover:scale-110 transition-all z-30 shadow-xl"
                                    title="Upload photo or animated GIF"
                                >
                                    <Camera size={18} />
                                </button>
                            </div>

                            {/* Animated Avatar Effects Selector Grid */}
                            <div className="w-full mb-6 p-4 bg-white/[0.02] border border-white/10 rounded-2xl flex flex-col gap-2.5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 text-left flex items-center gap-1.5">
                                    <Sparkles size={11} className="text-amber-400" />
                                    {language === 'ku' || language === 'badini' ? 'کاریگەرییە وێنەییەکان (Avatar Effects)' : 'Nitro Animated Avatar Rings'}
                                </span>

                                <div className="grid grid-cols-3 gap-2">
                                    {(user?.email?.toLowerCase() === 'flkrdstudio@gmail.com' || tempUserName.toLowerCase().includes('zana faroq') || tempUserName.toLowerCase().includes('zana barzani')) && (
                                        <button
                                            onClick={() => handleSelectAvatarEffect('creator-ceo-aura')}
                                            className={`p-2 rounded-xl border text-[8px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
                                                avatarEffect === 'creator-ceo-aura' 
                                                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(234,179,8,0.3)]' 
                                                    : 'bg-white/5 border-white/10 text-zinc-300 hover:border-amber-400/40'
                                            }`}
                                        >
                                            👑 CREATOR CEO
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleSelectAvatarEffect('cosmic-pulsar')}
                                        className={`p-2 rounded-xl border text-[8px] font-black uppercase tracking-wider transition-all ${
                                            avatarEffect === 'cosmic-pulsar' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md' : 'bg-white/5 border-white/10 text-zinc-300'
                                        }`}
                                    >
                                        🌀 Pulsar
                                    </button>
                                    <button
                                        onClick={() => handleSelectAvatarEffect('cyber-glitch')}
                                        className={`p-2 rounded-xl border text-[8px] font-black uppercase tracking-wider transition-all ${
                                            avatarEffect === 'cyber-glitch' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md' : 'bg-white/5 border-white/10 text-zinc-300'
                                        }`}
                                    >
                                        ⚡ Cyber
                                    </button>
                                    <button
                                        onClick={() => handleSelectAvatarEffect('ruby-phoenix')}
                                        className={`p-2 rounded-xl border text-[8px] font-black uppercase tracking-wider transition-all ${
                                            avatarEffect === 'ruby-phoenix' ? 'bg-red-500/20 border-red-400 text-red-300 shadow-md' : 'bg-white/5 border-white/10 text-zinc-300'
                                        }`}
                                    >
                                        🔥 Phoenix
                                    </button>
                                    <button
                                        onClick={() => handleSelectAvatarEffect('quantum-vortex')}
                                        className={`p-2 rounded-xl border text-[8px] font-black uppercase tracking-wider transition-all ${
                                            avatarEffect === 'quantum-vortex' ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-md' : 'bg-white/5 border-white/10 text-zinc-300'
                                        }`}
                                    >
                                        🌌 Vortex
                                    </button>
                                    <button
                                        onClick={() => handleSelectAvatarEffect('emerald-shield')}
                                        className={`p-2 rounded-xl border text-[8px] font-black uppercase tracking-wider transition-all ${
                                            avatarEffect === 'emerald-shield' ? 'bg-lime-500/20 border-lime-400 text-lime-300 shadow-md' : 'bg-white/5 border-white/10 text-zinc-300'
                                        }`}
                                    >
                                        🛡️ Shield
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col items-center">
                                {isEditingName ? (
                                    <div className="flex items-center gap-2 mb-2 w-full">
                                        <input
                                            type="text"
                                            value={tempUserName}
                                            onChange={(e) => setTempUserName(e.target.value)}
                                            className="bg-black border border-[var(--brand-red)]/50 rounded-xl px-4 py-2 text-white font-bold w-full outline-none focus:border-[var(--brand-red)]"
                                        />
                                        <button onClick={handleSaveName} className="p-2.5 bg-green-600 rounded-xl text-white"><Check size={20} /></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 mb-2">
                                        <h2 className="text-3xl font-[1000] uppercase italic tracking-tighter text-[var(--text-primary)]">{tempUserName}</h2>
                                        <button onClick={() => setIsEditingName(true)} className="text-gray-500 hover:text-[var(--brand-red)]"><Edit3 size={18} /></button>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 bg-[var(--brand-red)]/10 px-4 py-1.5 rounded-full border border-[var(--brand-red)]/20">
                                    <Shield size={12} className="text-[var(--brand-red)]" />
                                    <span className="text-[10px] font-black uppercase text-[var(--brand-red)] tracking-[0.2em]">{stats.rank}</span>
                                </div>
                            </div>
                        </motion.div>

                        <div className="grid grid-cols-2 gap-4">
                            <StatCard icon={<Clock size={16} />} label={t('memberSince')} value={stats.memberSince} />
                            <StatCard icon={<Activity size={16} />} label={t('totalWatched')} value={stats.watchedCount} />
                        </div>

                        {elasticStackItems.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-black/30 backdrop-blur-[10px] border border-white/10 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden"
                            >
                                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                                    <div className="flex items-center gap-2">
                                        <Activity size={16} className="text-[var(--brand-red)]" />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                            {language === 'ku' || language === 'badini' ? 'سەیرکراوەکانی کۆتایی' : 'Recently Watched'}
                                        </span>
                                    </div>
                                </div>
                                <ElasticStack 
                                    items={elasticStackItems} 
                                    itemSize={64} 
                                    overlap={28} 
                                    pushForce={12}
                                    onItemClick={handleElasticItemClick}
                                    className="py-4 justify-start"
                                />
                            </motion.div>
                        )}
                    </div>

                    <div className="lg:col-span-8 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-black/30 backdrop-blur-[10px] border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl relative"
                        >
                            <div className="flex items-center gap-4 mb-10">
                                <div className="p-3 bg-[var(--brand-red)]/20 rounded-2xl border border-[var(--brand-red)]/20">
                                    <Zap size={24} className="text-[var(--brand-red)]" />
                                </div>
                                <h3 className="text-3xl font-[1000] uppercase italic tracking-tighter text-[var(--text-primary)]">{t('preferences')}</h3>
                            </div>

                            <div className="space-y-10">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-10 border-b border-white/5">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-white/5 rounded-2xl">
                                            {theme === 'dark' ? <Moon size={24} className="text-indigo-400" /> : <Sun size={24} className="text-yellow-500" />}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black uppercase italic tracking-widest text-[var(--text-primary)]">{t('appearance')}</h4>
                                            <p className="text-sm text-gray-500 font-bold">{theme === 'dark' ? t('dark') : t('light')} Mode Enabled</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center p-2 rounded-full bg-black/40 border border-white/10 shadow-inner">
                                        <AnimatedThemeToggler />
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-10 border-b border-white/5">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-white/5 rounded-2xl">
                                            <Languages size={24} className="text-blue-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black uppercase italic tracking-widest text-[var(--text-primary)]">{t('language')}</h4>
                                            <p className="text-sm text-gray-500 font-bold">Region Sync</p>
                                        </div>
                                    </div>
                                    <div className="flex p-1 bg-black/40 rounded-2xl border border-white/5">
                                        <button
                                            onClick={() => handleLanguageChange('en')}
                                            className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${language === 'en' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-[var(--text-primary)]'}`}
                                        >
                                            {t('english')}
                                        </button>
                                        <button
                                            onClick={() => handleLanguageChange('ku')}
                                            className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${language === 'ku' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-[var(--text-primary)]'}`}
                                        >
                                            سۆرانی
                                        </button>
                                        <button
                                            onClick={() => handleLanguageChange('badini')}
                                            className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${language === 'badini' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-[var(--text-primary)]'}`}
                                        >
                                            بادینی
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-white/5 rounded-2xl">
                                            <Bell size={24} className="text-green-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black uppercase italic tracking-widest text-[var(--text-primary)]">{t('notifications')}</h4>
                                            <p className="text-sm text-gray-500 font-bold">{notifEnabled ? 'Transmission Active' : 'Offline'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className={`px-4 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${notifEnabled ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                                            {notifEnabled ? 'Live Sync' : 'Muted'}
                                        </div>
                                        <ChevronRight size={20} className="text-gray-700" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-black/10 border border-white/5 rounded-[3rem] p-6 shadow-2xl relative"
                        >
                            <h3 className="text-xl font-black uppercase italic tracking-wider text-white mb-6 border-b border-white/5 pb-3">
                                {language === 'ku' || language === 'badini' ? 'ئامارەکانی سەیرکردن' : 'WATCHING ANALYTICS'}
                            </h3>
                            <MovieBentoGrid />
                        </motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gradient-to-r from-[var(--brand-red)] to-black rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden group">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 blur-xl md:blur-[60px] group-hover:scale-150 transition-transform duration-[2s]" />
                                <div className="relative z-10 flex flex-col justify-between h-full">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Sparkles size={20} className="text-yellow-400" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">System Privilege</span>
                                        </div>
                                        <h4 className="text-2xl font-[1000] text-white uppercase italic tracking-tighter">Elite Member</h4>
                                    </div>
                                    <div className="mt-8">
                                        <Award size={48} className="text-white/20" />
                                    </div>
                                </div>
                            </div>

                            <motion.div 
                                whileHover={{ scale: 1.02 }} 
                                onClick={async () => {
                                    if (window.confirm(language === 'ku' || language === 'badini' ? 'دڵنیای لە چوونەدەرەوە؟' : 'Are you sure you want to log out?')) {
                                        await signOut();
                                        addNotification({ type: 'info', title: 'Signed Out', message: 'Session terminated.' });
                                    }
                                }}
                                className="bg-black/30 backdrop-blur-[10px] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group flex flex-col justify-between cursor-pointer hover:border-red-500/30 transition-all"
                            >
                                <div className="absolute inset-0 bg-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <LogOut size={20} className="text-brand" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Auth Security</span>
                                    </div>
                                    <h4 className="text-xl font-[1000] text-[var(--text-primary)] uppercase italic tracking-tighter leading-tight mb-2">
                                        {language === 'ku' || language === 'badini' ? 'چوونەدەرەوە' : 'Sign Out'}
                                    </h4>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed">
                                        {language === 'ku' || language === 'badini' ? 'کۆتایی هێنان بە دانیشتنی ئێستات.' : 'Terminate current secure session.'}
                                    </p>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-20 pb-10 text-center relative z-10">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em] opacity-40 italic">
                    {t('profileHeading')}
                </p>
            </div>
        </div>
    );
};

const StatCard = ({ icon, label, value }: any) => (
    <div className="bg-[var(--card-bg)] border border-white/5 rounded-[2rem] p-6 text-center hover:bg-white/[0.06] transition-all group shadow-xl">
        <div className="bg-black/40 w-fit mx-auto p-3 rounded-xl mb-4 group-hover:scale-110 transition-transform text-[var(--brand-red)] shadow-inner border border-white/5">
            {icon}
        </div>
        <p className="text-[7px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1">{label}</p>
        <p className="text-xl font-black text-[var(--text-primary)] italic tracking-tighter">{value}</p>
    </div>
);

export default ProfilePage;