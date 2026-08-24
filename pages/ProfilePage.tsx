import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Shield, Zap, Bell, Moon, Sun, Languages,
    Save, Edit3, Camera, Clock, Activity, Award,
    ChevronRight, ArrowLeft, Check, Sparkles, Monitor, Smartphone, Download,
    ShieldCheck, LogOut, Mail, Lock, Eye, EyeOff, KeyRound, Loader2, Crown,
    CheckCircle2, Sliders, TrendingUp, Radio, Users, Captions, Play, Trash2,
    Film, Tv, Mic2, Compass, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import { SkeletonProfile } from '../components/Skeleton';
import AnimatedThemeToggler from '../components/ui/animated-theme-toggler';
import { useAuth } from '../contexts/AuthContext';
import { fetchData } from '../services/tmdbService';
import { requests, IMAGE_BASE_URL, API_KEY } from '../constants';
import { supabase } from '../utils/supabaseClient';
import { db } from '../utils/db';
import { AvatarEffectContainer, AvatarEffectType } from '../components/UserProfileModal';
import VisitorAnalyticsModal from '../components/VisitorAnalyticsModal';
import { AdminManagementModal } from '../components/AdminManagementModal';
import { AdminBroadcastModal } from '../components/AdminBroadcastModal';
import AdminPanelModal from '../components/AdminPanelModal';

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { t, language, setLanguage } = useTranslation();
    const { theme, toggleTheme, accentColor, setIsSettingsOpen, isAdminModalOpen, setIsAdminModalOpen, loginAsAdmin, isAdmin, setIsAdmin, hasPermission } = useUI();
    const { addNotification } = useNotification();
    const { user, signIn, signUp, signOut, resetPassword, loading: authLoading, isPasswordRecovery, updatePassword, signInWithGoogle } = useAuth();
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Tab state: 'history' | 'preferences' | 'admin'
    const [activeTab, setActiveTab] = useState<'history' | 'preferences' | 'admin'>('history');

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
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatusText, setUploadStatusText] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

    // Admin Command Center Modals states
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [showAdminModal, setShowAdminModal] = useState(false);

    // Watch Progress History
    const [historyList, setHistoryList] = useState<any[]>(() => {
        try {
            const raw = localStorage.getItem('watchProgress');
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.sort((a: any, b: any) => (b.lastWatched || 0) - (a.lastWatched || 0)) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        const refreshHistory = () => {
            try {
                const raw = localStorage.getItem('watchProgress');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    setHistoryList(Array.isArray(parsed) ? parsed.sort((a: any, b: any) => (b.lastWatched || 0) - (a.lastWatched || 0)) : []);
                } else {
                    setHistoryList([]);
                }
            } catch {
                setHistoryList([]);
            }
        };
        refreshHistory();
        window.addEventListener('storage', refreshHistory);
        window.addEventListener('watchProgressUpdated', refreshHistory);
        return () => {
            window.removeEventListener('storage', refreshHistory);
            window.removeEventListener('watchProgressUpdated', refreshHistory);
        };
    }, []);

    const isStoredAdmin = typeof window !== 'undefined' && localStorage.getItem('isFlkrdAdmin') === 'true';
    const isMasterAdmin = isAdmin || isStoredAdmin || user?.email?.toLowerCase() === 'flkrdstudio@gmail.com';

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
        } else if (isMasterAdmin) {
            const adminEmail = typeof window !== 'undefined' ? (localStorage.getItem('flkrd_admin_email') || 'flkrdstudio@gmail.com') : 'flkrdstudio@gmail.com';
            setTempUserName(adminEmail === 'flkrdstudio@gmail.com' ? 'Zana Barzani (CEO)' : adminEmail.split('@')[0]);
        }
    }, [user, isAdmin, isStoredAdmin, isMasterAdmin]);

    // Override body background so the profile ambient video background is visible
    useEffect(() => {
        const prev = document.body.style.backgroundColor;
        document.body.style.backgroundColor = 'transparent';
        document.documentElement.style.backgroundColor = 'transparent';
        return () => {
            document.body.style.backgroundColor = prev;
            document.documentElement.style.backgroundColor = '';
        };
    }, []);

    const [notifEnabled, setNotifEnabled] = useState(() => (typeof Notification !== 'undefined' ? Notification.permission === 'granted' : false));

    const requestNotificationPermission = async () => {
        if (typeof Notification !== 'undefined') {
            const perm = await Notification.requestPermission();
            setNotifEnabled(perm === 'granted');
            if (perm === 'granted') {
                addNotification({ type: 'success', title: 'Notifications Enabled', message: 'You will receive movie release and system alerts.' });
            }
        }
    };

    const stats = {
        memberSince: user?.created_at ? new Date(user.created_at).getFullYear().toString() : '2026',
        watchedCount: historyList.length,
        rank: isMasterAdmin ? (language === 'ku' || language === 'badini' ? 'بەڕێوەبەری سەرەکی' : 'Master Administrator') : t('userRank')
    };

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 500);
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
        try {
            if (user) {
                await supabase.auth.updateUser({
                    data: { user_name: tempUserName }
                });
            }
        } catch (e) {
            // local update already saved
        }
        addNotification({ 
            type: 'success', 
            title: language === 'ku' || language === 'badini' ? 'پرۆفایل نوێکرایەوە' : 'Profile Updated', 
            message: language === 'ku' || language === 'badini' ? 'ناوی بەکارهێنەر بە سەرکەوتوویی پاشەکەوت کرا.' : 'User identity synchronized.' 
        });
    };

    const handleLanguageChange = (lang: 'en' | 'ku' | 'badini') => {
        setLanguage(lang);
        let langName = 'English';
        if (lang === 'ku') langName = 'Kurdish Sorani (سۆرانی)';
        if (lang === 'badini') langName = 'Kurdish Badini (بادینی)';
        addNotification({ type: 'info', title: 'Language Sync', message: `Interface language set to ${langName}.` });
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            addNotification({ type: 'error', title: 'Error', message: 'Please fill in all fields' });
            return;
        }
        setFormSubmitting(true);
        const cleanEmail = email.trim().toLowerCase();

        // Check Sub-Admin / Master Admin login credentials
        const adminRes = await loginAsAdmin(cleanEmail, password);
        if (adminRes.success && adminRes.admin) {
            setFormSubmitting(false);
            setTempUserName(adminRes.admin.username || 'ADMIN');
            addNotification({ 
                type: 'success', 
                title: (language === 'ku' || language === 'badini') ? 'بەخێربێیتەوە ئادمن' : 'Admin Authorized', 
                message: (language === 'ku' || language === 'badini') ? `وەک ${adminRes.admin.username} چوویتە ژوورەوە` : `Logged in as ${adminRes.admin.username}` 
            });
            return;
        }

        const { error } = await signIn(cleanEmail, password);
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

    const safeSetAvatarStorage = (avatarDataUrl: string) => {
        try {
            localStorage.setItem('flkrd_avatar_url', avatarDataUrl);
        } catch (err) {
            try {
                localStorage.removeItem('flkrd_fallback_movies');
                localStorage.removeItem('flkrd_fallback_tmdb');
                localStorage.removeItem('tmdb_cache');
                localStorage.setItem('flkrd_avatar_url', avatarDataUrl);
            } catch (retryErr) {
                try {
                    sessionStorage.setItem('flkrd_avatar_url', avatarDataUrl);
                } catch (sErr) {
                    console.warn("[AVATAR] Storage error", sErr);
                }
            }
        }
    };

    const processAvatarFile = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
            const reader = new FileReader();

            if (isGif) {
                reader.readAsDataURL(file);
                reader.onload = (event) => resolve(event.target?.result as string);
                reader.onerror = (err) => reject(err);
            } else {
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
                            resolve(canvas.toDataURL('image/webp', 0.88));
                        } else {
                            resolve(event.target?.result as string);
                        }
                    };
                };
                reader.onerror = (err) => reject(err);
            }
        });
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setAvatarUploading(true);
        setUploadProgress(15);
        setUploadStatusText(language === 'ku' || language === 'badini' ? 'ئامادەکردنی وێنە...' : 'Preparing image...');
        try {
            let finalUrl = '';
            const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
            const ext = (file.name.split('.').pop() || (isGif ? 'gif' : 'jpg')).toLowerCase();
            const mimeType = file.type || (ext === 'gif' ? 'image/gif' : (ext === 'png' ? 'image/png' : 'image/jpeg'));
            const storagePath = `user_avatars/${user.id}_${Date.now()}.${ext}`;

            setUploadProgress(40);
            setUploadStatusText(language === 'ku' || language === 'badini' ? 'بارکردن بۆ سێرڤەر...' : 'Uploading to server...');

            try {
                const { data: uploadRes, error: uploadErr } = await supabase.storage
                    .from('avatars')
                    .upload(storagePath, file, { 
                        contentType: mimeType,
                        cacheControl: '3600', 
                        upsert: true 
                    });

                setUploadProgress(70);

                if (!uploadErr && uploadRes) {
                    const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(storagePath);
                    if (pubData?.publicUrl) {
                        finalUrl = pubData.publicUrl;
                    }
                }
            } catch (storageErr: any) {
                console.warn("[AVATAR] Cloud storage fallback to local DataURL", storageErr);
            }

            if (!finalUrl) {
                setUploadProgress(80);
                finalUrl = await processAvatarFile(file);
            }
            await db.saveAvatar('current_user_avatar', finalUrl);

            setUploadProgress(90);

            try {
                await supabase.auth.updateUser({
                    data: { avatar_url: finalUrl }
                });
            } catch (authErr) {
                console.warn("[AVATAR] Auth metadata warning:", authErr);
            }

            setUploadProgress(100);
            safeSetAvatarStorage(finalUrl);
            setAvatarUrl(finalUrl);
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('flkrd-avatar-changed'));

            addNotification({
                type: 'success',
                title: language === 'ku' || language === 'badini' ? 'وێنەی پرۆفایل نوێکرایەوە' : 'Avatar Updated',
                message: language === 'ku' || language === 'badini' 
                    ? 'وێنەی پرۆفایلەکەت بە سەرکەوتوویی لەسەر هەموو بەرنامەکە نوێکرایەوە.' 
                    : 'Your profile avatar has been updated successfully.'
            });
        } catch (err: any) {
            console.error("[AVATAR] Handler error:", err);
            addNotification({ type: 'error', title: 'Upload Failed', message: err.message || 'Could not upload avatar.' });
        } finally {
            setTimeout(() => {
                setAvatarUploading(false);
                setUploadProgress(0);
                setUploadStatusText('');
            }, 600);
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

    const handleNavigateItem = (item: any) => {
        if (!item) return;
        if (String(item.type) === 'dubbed') {
            navigate(`/dubbed-details/${item.id}`);
        } else if (String(item.type) === 'tv') {
            navigate(`/details/tv/${item.id}`);
        } else {
            navigate(`/details/movie/${item.id}`);
        }
    };

    const handleRemoveHistoryItem = (e: React.MouseEvent, id: number | string, type?: string) => {
        e.stopPropagation();
        try {
            const raw = localStorage.getItem('watchProgress');
            if (raw) {
                const parsed = JSON.parse(raw);
                const updated = parsed.filter((item: any) => !(String(item.id) === String(id) && (!type || String(item.type) === String(type))));
                localStorage.setItem('watchProgress', JSON.stringify(updated));
                setHistoryList(updated);
                window.dispatchEvent(new Event('storage'));
                window.dispatchEvent(new Event('watchProgressUpdated'));
                addNotification({
                    type: 'info',
                    title: language === 'ku' || language === 'badini' ? 'سڕایەوە' : 'Removed',
                    message: language === 'ku' || language === 'badini' ? 'فیلمەکە لە مێژووی سەیرکردن سڕایەوە.' : 'Item removed from watch history.'
                });
            }
        } catch (err) {
            console.error("Failed to remove history item", err);
        }
    };

    const handleClearAllHistory = () => {
        const confirmMsg = language === 'ku' || language === 'badini' 
            ? 'دڵنیای لە سڕینەوەی تەواوی مێژووی سەیرکردن؟' 
            : 'Are you sure you want to clear your entire watch history?';
        if (window.confirm(confirmMsg)) {
            localStorage.removeItem('watchProgress');
            setHistoryList([]);
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('watchProgressUpdated'));
            addNotification({
                type: 'info',
                title: language === 'ku' || language === 'badini' ? 'مێژوو پاککرایەوە' : 'History Cleared',
                message: language === 'ku' || language === 'badini' ? 'تەواوی مێژووی سەیرکردن سڕایەوە.' : 'Your watch history has been reset.'
            });
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
            <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-20 bg-black">
                {/* Fullscreen Atmospheric Background Video Layer */}
                <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <video
                        key={authVideo}
                        autoPlay
                        loop
                        muted
                        playsInline
                        disablePictureInPicture
                        className="w-full h-full object-cover opacity-85 scale-105 transform-gpu transition-opacity duration-1000"
                        src={authVideo}
                    />
                    <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="w-full max-w-[420px] bg-black/40 backdrop-blur-[35px] backdrop-saturate-[1.8] border border-white/25 rounded-[2.5rem] p-8 md:p-10 shadow-[0_30px_90px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.3)] relative z-10"
                >
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
    if (!user && !isAdmin && !isStoredAdmin) {
        const isRTL = language === 'ku' || language === 'badini';

        const AUTH_VIDEO_DARK  = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_055001_8e16d972-3b2b-441c-86ad-2901a54682f9.mp4';
        const AUTH_VIDEO_LIGHT = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4';
        const authVideo = theme === 'dark' ? AUTH_VIDEO_DARK : AUTH_VIDEO_LIGHT;

        return (
            <div className="h-[100dvh] w-full flex items-center justify-center relative overflow-hidden px-4 py-0 select-none bg-black">
                {/* Fullscreen Atmospheric Background Video Layer */}
                <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <video
                        key={authVideo}
                        autoPlay
                        loop
                        muted
                        playsInline
                        disablePictureInPicture
                        className="w-full h-full object-cover opacity-85 scale-105 transform-gpu transition-opacity duration-1000"
                        src={authVideo}
                    />
                    <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                </div>

                <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="w-full max-w-[420px] max-h-[calc(100dvh-1.5rem)] bg-black/50 backdrop-blur-[35px] backdrop-saturate-[1.8] border border-white/25 rounded-[2.2rem] p-6 sm:p-7 md:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.75),inset_0_1px_2px_rgba(255,255,255,0.3)] relative z-10 overflow-hidden flex flex-col my-auto"
                >
                    {/* Back Button Pill */}
                    <button
                        onClick={() => navigate(-1)}
                        className="absolute top-5 left-5 flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white text-[10px] font-black uppercase tracking-wider hover:bg-white/20 active:scale-95 transition-all shadow-md z-20"
                    >
                        <ArrowLeft size={10} />
                        <span>{isRTL ? 'گەڕانەوە' : 'Back'}</span>
                    </button>

                    {/* Logo & Header */}
                    <div className="text-center space-y-1.5 mt-5 mb-5 select-none">
                        <span className="text-[13px] font-[1000] text-white tracking-widest italic block drop-shadow-md">FLKRD MOVIE</span>
                        <h2 className="text-lg md:text-xl font-[900] text-white tracking-tight uppercase leading-tight max-w-[260px] mx-auto opacity-95 drop-shadow-md">
                            {authScreen === 'login' && (isRTL ? 'بچۆ ژوورەوە، گەشتەکەت دەستپێبکە' : 'Log In, Start Your AI Journey')}
                            {authScreen === 'signup' && (isRTL ? 'ئەکاونتت دروست بکە' : 'Start Here, Create Your Account')}
                            {authScreen === 'reset' && (isRTL ? 'دانانەوەی پاسوۆرد' : 'Reset Password To Continue Using')}
                        </h2>
                    </div>

                    {/* Forms Area */}
                    <div className="flex-grow flex flex-col justify-center">
                        <AnimatePresence mode="wait">
                            {authScreen === 'login' && (
                                <motion.form 
                                    key="login-form"
                                    initial={{ opacity: 0, x: -15 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 15 }}
                                    onSubmit={handleLogin} 
                                    className="space-y-3.5 text-left"
                                    dir={isRTL ? 'rtl' : 'ltr'}
                                >
                                    <div className="space-y-1.5">
                                        <label htmlFor="login-email" className="text-[9px] font-black uppercase tracking-widest text-gray-300 block px-1 drop-shadow-sm">
                                            {isRTL ? 'ئیمەیڵ' : 'Email'}
                                        </label>
                                        <div className="relative">
                                            <input 
                                                id="login-email"
                                                name="email"
                                                autoComplete="email"
                                                type="email" required
                                                value={email} onChange={e => setEmail(e.target.value)}
                                                placeholder={isRTL ? 'ئیمەیڵەکەت بنووسە' : 'Enter your email'}
                                                className="w-full bg-black/40 backdrop-blur-md border border-white/15 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-[var(--brand-red)]/70 focus:bg-black/60 transition-all shadow-inner placeholder-gray-400"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label htmlFor="login-password" className="text-[9px] font-black uppercase tracking-widest text-gray-300 block px-1 drop-shadow-sm">
                                            {isRTL ? 'پاسوۆرد' : 'Password'}
                                        </label>
                                        <div className="relative">
                                            <input 
                                                id="login-password"
                                                name="password"
                                                autoComplete="current-password"
                                                type={showPassword ? "text" : "password"} required
                                                value={password} onChange={e => setPassword(e.target.value)}
                                                placeholder={isRTL ? 'پاسوۆردەکەت بنووسە' : 'Enter your password'}
                                                className="w-full bg-black/40 backdrop-blur-md border border-white/15 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-[var(--brand-red)]/70 focus:bg-black/60 transition-all shadow-inner placeholder-gray-400"
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors`}
                                            >
                                                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between py-0.5 px-1">
                                        <label htmlFor="login-remember" className="flex items-center gap-2 text-[10px] font-bold text-gray-300 cursor-pointer select-none">
                                            <input 
                                                id="login-remember"
                                                name="rememberMe"
                                                type="checkbox" 
                                                checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                                                className="rounded border-white/20 accent-brand w-3.5 h-3.5 bg-transparent"
                                            />
                                            {isRTL ? 'بمھێڵەوە' : 'Remember me'}
                                        </label>
                                    </div>

                                    <button 
                                        type="submit" disabled={formSubmitting}
                                        className="w-full py-3.5 bg-gradient-to-r from-[var(--brand-red)] via-red-600 to-red-700 hover:brightness-110 border border-red-500/30 text-white font-black uppercase text-xs tracking-widest rounded-full transition-all flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(229,9,20,0.35)] active:scale-98"
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
                                    className="space-y-3 text-left"
                                    dir={isRTL ? 'rtl' : 'ltr'}
                                >
                                    <div className="space-y-1">
                                        <label htmlFor="signup-username" className="text-[9px] font-black uppercase tracking-widest text-gray-300 block px-1 drop-shadow-sm">
                                            {isRTL ? 'ناوی بەکارهێنەر' : 'Username'}
                                        </label>
                                        <input 
                                            id="signup-username"
                                            name="username"
                                            autoComplete="username"
                                            type="text" required
                                            value={regUserName} onChange={e => setRegUserName(e.target.value)}
                                            placeholder={isRTL ? 'ناو بنووسە' : 'Enter your username'}
                                            className="w-full bg-black/40 backdrop-blur-md border border-white/15 rounded-xl py-2.5 px-3.5 text-xs font-bold text-white outline-none focus:border-[var(--brand-red)]/70 focus:bg-black/60 transition-all shadow-inner placeholder-gray-400"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label htmlFor="signup-email" className="text-[9px] font-black uppercase tracking-widest text-gray-300 block px-1 drop-shadow-sm">
                                            {isRTL ? 'ئیمەیڵ' : 'Email'}
                                        </label>
                                        <input 
                                            id="signup-email"
                                            name="email"
                                            autoComplete="email"
                                            type="email" required
                                            value={email} onChange={e => setEmail(e.target.value)}
                                            placeholder={isRTL ? 'ئیمەیڵ بنووسە' : 'Enter your email'}
                                            className="w-full bg-black/40 backdrop-blur-md border border-white/15 rounded-xl py-2.5 px-3.5 text-xs font-bold text-white outline-none focus:border-[var(--brand-red)]/70 focus:bg-black/60 transition-all shadow-inner placeholder-gray-400"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label htmlFor="signup-password" className="text-[9px] font-black uppercase tracking-widest text-gray-300 block px-1 drop-shadow-sm">
                                            {isRTL ? 'پاسوۆرد' : 'Password'}
                                        </label>
                                        <input 
                                            id="signup-password"
                                            name="password"
                                            autoComplete="new-password"
                                            type="password" required
                                            value={password} onChange={e => setPassword(e.target.value)}
                                            placeholder={isRTL ? 'پاسوۆردێکی بەهێز بنووسە' : 'Enter your password'}
                                            className="w-full bg-black/40 backdrop-blur-md border border-white/15 rounded-xl py-2.5 px-3.5 text-xs font-bold text-white outline-none focus:border-[var(--brand-red)]/70 focus:bg-black/60 transition-all shadow-inner placeholder-gray-400"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label htmlFor="signup-confirm-password" className="text-[9px] font-black uppercase tracking-widest text-gray-300 block px-1 drop-shadow-sm">
                                            {isRTL ? 'پشتڕاستکردنەوەی پاسوۆرد' : 'Confirm password'}
                                        </label>
                                        <input 
                                            id="signup-confirm-password"
                                            name="confirmPassword"
                                            autoComplete="new-password"
                                            type="password" required
                                            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                            placeholder={isRTL ? 'پاسوۆرد دووبارە بکەرەوە' : 'Confirm your password'}
                                            className="w-full bg-black/40 backdrop-blur-md border border-white/15 rounded-xl py-2.5 px-3.5 text-xs font-bold text-white outline-none focus:border-[var(--brand-red)]/70 focus:bg-black/60 transition-all shadow-inner placeholder-gray-400"
                                        />
                                    </div>

                                    <button 
                                        type="submit" disabled={formSubmitting}
                                        className="w-full py-3.5 bg-gradient-to-r from-[var(--brand-red)] via-red-600 to-red-700 hover:brightness-110 border border-red-500/30 text-white font-black uppercase text-xs tracking-widest rounded-full transition-all flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(229,9,20,0.35)] active:scale-98"
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
                                    className="space-y-3.5 text-left"
                                    dir={isRTL ? 'rtl' : 'ltr'}
                                >
                                    <p className="text-[10px] text-gray-300 font-bold leading-relaxed mb-1 uppercase px-1 drop-shadow-sm">
                                        {isRTL ? 'ئیمەیڵەکەت بنووسە بۆ ناردنی کۆدی دانانەوەی پاسوۆرد.' : 'Enter your email to receive a password reset link.'}
                                    </p>
                                    <div className="space-y-1.5">
                                        <label htmlFor="reset-email" className="text-[9px] font-black uppercase tracking-widest text-gray-300 block px-1 drop-shadow-sm">
                                            {isRTL ? 'ئیمەیڵ' : 'Email'}
                                        </label>
                                        <input 
                                            id="reset-email"
                                            name="email"
                                            autoComplete="email"
                                            type="email" required
                                            value={email} onChange={e => setEmail(e.target.value)}
                                            placeholder="Enter your email"
                                            className="w-full bg-black/40 backdrop-blur-md border border-white/15 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-[var(--brand-red)]/70 focus:bg-black/60 transition-all shadow-inner placeholder-gray-400"
                                        />
                                    </div>

                                    <button 
                                        type="submit" disabled={formSubmitting}
                                        className="w-full py-3.5 bg-gradient-to-r from-[var(--brand-red)] via-red-600 to-red-700 hover:brightness-110 border border-red-500/30 text-white font-black uppercase text-xs tracking-widest rounded-full transition-all flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(229,9,20,0.35)] active:scale-98"
                                    >
                                        {formSubmitting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : (isRTL ? 'کۆد بنێرە' : 'Send Code')}
                                    </button>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Socials Divider */}
                    {authScreen === 'login' && (
                        <div className="space-y-3 mt-4">
                            <div className="flex items-center gap-3">
                                <div className="h-px bg-white/20 flex-1" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-300 drop-shadow-sm">Or continue with</span>
                                <div className="h-px bg-white/20 flex-1" />
                            </div>

                            <div className="w-full">
                                <button 
                                    type="button"
                                    onClick={() => handleOAuth('google')}
                                    className="w-full flex items-center justify-center gap-2.5 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all text-white active:scale-95 shadow-lg cursor-pointer"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                                    Google
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Integrated Bottom Tab Switching Bar */}
                    <div className="mt-8 border-t border-white/10 pt-5 flex items-center justify-around text-xs font-black uppercase tracking-wider">
                        {authScreen === 'login' ? (
                            <>
                                <button 
                                    onClick={() => setAuthScreen('signup')}
                                    className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                                >
                                    {isRTL ? 'دروستکردنی ئەکاونت' : 'Create Account'}
                                </button>
                                <span className="text-white/20">|</span>
                                <button 
                                    onClick={() => setAuthScreen('reset')}
                                    className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                                >
                                    {isRTL ? 'دانانەوەی پاسوۆرد' : 'Reset Password'}
                                </button>
                            </>
                        ) : authScreen === 'signup' ? (
                            <>
                                <button 
                                    onClick={() => setAuthScreen('login')}
                                    className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                                >
                                    {isRTL ? 'چوونەژوورەوە' : 'Log In'}
                                </button>
                                <span className="text-white/20">|</span>
                                <button 
                                    onClick={() => setAuthScreen('reset')}
                                    className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                                >
                                    {isRTL ? 'دانانەوەی پاسوۆرد' : 'Reset Password'}
                                </button>
                            </>
                        ) : (
                            <>
                                <button 
                                    onClick={() => setAuthScreen('login')}
                                    className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                                >
                                    {isRTL ? 'چوونەژوورەوە' : 'Log In'}
                                </button>
                                <span className="text-white/20">|</span>
                                <button 
                                    onClick={() => setAuthScreen('signup')}
                                    className="text-gray-400 hover:text-white transition-colors cursor-pointer"
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

    // ─── AUTHENTICATED MODERN APPLE TV / NETFLIX PROFILE DASHBOARD ───────────────────
    const isRtl = language === 'ku' || language === 'badini';
    const isDark = theme !== 'light';

    const PROFILE_VIDEO_DARK = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_031045_0e1165dd-ab48-46e3-ad3d-5fe77f217647.mp4';
    const PROFILE_VIDEO_LIGHT = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_171521_25968ba2-b594-4b32-aab7-f6b69398a6fa.mp4';
    const profileVideo = isDark ? PROFILE_VIDEO_DARK : PROFILE_VIDEO_LIGHT;

    return (
        <div className={`min-h-screen pt-20 md:pt-24 pb-36 relative overflow-x-hidden ${isDark ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-900'}`}>

            {/* Ambient Background Layer */}
            <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <video
                    key={profileVideo}
                    autoPlay
                    loop
                    muted
                    playsInline
                    disablePictureInPicture
                    className="w-full h-full object-cover opacity-35 dark:opacity-40 scale-105 transform-gpu transition-opacity duration-1000"
                    src={profileVideo}
                />
                <div className={`absolute inset-0 ${isDark ? 'bg-black/60' : 'bg-white/70'} backdrop-blur-3xl pointer-events-none`} />
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 relative z-10">
                
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className={`mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-black uppercase tracking-wider backdrop-blur-xl transition-all shadow-sm active:scale-95 cursor-pointer ${
                        isDark 
                            ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' 
                            : 'bg-white/80 border-zinc-200 hover:bg-white text-zinc-800'
                    }`}
                >
                    {isRtl ? <ArrowLeft size={16} className="rotate-180" /> : <ArrowLeft size={16} />}
                    <span>{t('back')}</span>
                </button>

                {/* ── 1. Top Profile Hero Card (Apple TV Style) ── */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-3xl p-6 sm:p-8 border shadow-2xl backdrop-blur-2xl transition-colors duration-300 relative overflow-hidden mb-8 ${
                        isDark 
                            ? 'bg-zinc-950/70 border-white/10 text-white' 
                            : 'bg-white/85 border-zinc-200 text-zinc-900'
                    }`}
                >
                    <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 md:gap-8">
                        
                        {/* Avatar & User Details */}
                        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                            
                            {/* Avatar with Camera upload */}
                            <div className="relative shrink-0">
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/gif,image/png,image/jpeg,image/webp,image/apng,image/*,.gif"
                                    className="hidden"
                                    onChange={handleAvatarUpload}
                                />
                                
                                <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 shadow-2xl relative flex items-center justify-center ${
                                    isMasterAdmin ? 'border-amber-400 ring-4 ring-amber-400/20' : 'border-red-500 ring-4 ring-red-500/20'
                                }`}>
                                    {avatarUrl ? (
                                        <img 
                                            src={avatarUrl} 
                                            alt={tempUserName} 
                                            className="w-full h-full object-cover" 
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-tr from-red-600 via-red-500 to-amber-500 text-white flex items-center justify-center font-black text-2xl uppercase">
                                            {tempUserName[0] || 'U'}
                                        </div>
                                    )}

                                    {/* Uploading Spinner Overlay */}
                                    {avatarUploading && (
                                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-2 z-20">
                                            <Loader2 size={24} className="animate-spin text-red-500 mb-1" />
                                            <span className="text-[10px] font-black text-white">{uploadProgress}%</span>
                                        </div>
                                    )}
                                </div>

                                {/* Camera Upload Button */}
                                <button
                                    onClick={() => avatarInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 p-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white border-2 border-black dark:border-zinc-950 shadow-lg active:scale-90 transition-transform cursor-pointer"
                                    title="Upload new avatar"
                                    aria-label="Upload avatar"
                                >
                                    <Camera size={14} />
                                </button>
                            </div>

                            {/* Info */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-center sm:justify-start gap-2">
                                    {isEditingName ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={tempUserName}
                                                onChange={(e) => setTempUserName(e.target.value)}
                                                className={`px-3 py-1 text-sm font-bold rounded-xl border outline-none ${
                                                    isDark ? 'bg-zinc-900 border-red-500 text-white' : 'bg-white border-red-500 text-zinc-900'
                                                }`}
                                                autoFocus
                                            />
                                            <button 
                                                onClick={handleSaveName}
                                                className="p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
                                            >
                                                <Check size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <h1 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight">
                                                {tempUserName}
                                            </h1>
                                            <button 
                                                onClick={() => setIsEditingName(true)}
                                                className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                                                title="Edit username"
                                            >
                                                <Edit3 size={15} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <p className="text-xs text-zinc-400 font-medium flex items-center justify-center sm:justify-start gap-1.5">
                                    <Mail size={13} className="text-zinc-500" />
                                    <span>{user?.email || 'member@flkrd.stream'}</span>
                                </p>

                                {/* Badge */}
                                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                                    {isMasterAdmin ? (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-sm">
                                            <Crown size={12} className="text-amber-400" />
                                            <span>{language === 'ku' || language === 'badini' ? 'بەڕێوەبەری سەرەکی' : 'Master Administrator'}</span>
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/15 border border-red-500/30 text-red-500 shadow-sm">
                                            <Film size={12} />
                                            <span>{language === 'ku' || language === 'badini' ? 'ئەندامی تایبەت' : 'VIP Cinephile'}</span>
                                        </span>
                                    )}
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                        <CheckCircle2 size={11} />
                                        <span>Active</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Apple-style Info Pills */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full md:w-auto">
                            <div className={`p-3.5 rounded-2xl border text-center flex flex-col justify-center ${
                                isDark ? 'bg-white/[0.03] border-white/5' : 'bg-zinc-50 border-zinc-200'
                            }`}>
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">
                                    {t('memberSince')}
                                </span>
                                <span className="text-sm font-black font-mono">
                                    {stats.memberSince}
                                </span>
                            </div>

                            <div className={`p-3.5 rounded-2xl border text-center flex flex-col justify-center ${
                                isDark ? 'bg-white/[0.03] border-white/5' : 'bg-zinc-50 border-zinc-200'
                            }`}>
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">
                                    {isRtl ? 'سەیرکراو' : 'Watched'}
                                </span>
                                <span className="text-sm font-black text-red-500 font-mono">
                                    {historyList.length} {isRtl ? 'فیلم' : 'Titles'}
                                </span>
                            </div>

                            <div className={`col-span-2 sm:col-span-1 p-3.5 rounded-2xl border text-center flex flex-col justify-center ${
                                isDark ? 'bg-white/[0.03] border-white/5' : 'bg-zinc-50 border-zinc-200'
                            }`}>
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">
                                    {isRtl ? 'هەور' : 'Cloud Sync'}
                                </span>
                                <span className="text-sm font-black text-emerald-400 font-mono flex items-center justify-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                    Online
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ── 2. Segmented Navigation Tabs (Apple TV Pill Style) ── */}
                <div className="flex items-center justify-center mb-8">
                    <div className={`p-1.5 rounded-2xl border backdrop-blur-2xl flex items-center gap-1 shadow-lg max-w-md w-full ${
                        isDark ? 'bg-zinc-950/80 border-white/10' : 'bg-white/90 border-zinc-200'
                    }`}>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
                                activeTab === 'history'
                                    ? (isDark ? 'bg-white text-zinc-950 shadow-md font-[1000]' : 'bg-zinc-900 text-white shadow-md font-[1000]')
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            <Film size={14} />
                            <span>{isRtl ? 'تەماشاکراوەکان' : 'Watch History'}</span>
                            {historyList.length > 0 && (
                                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                                    activeTab === 'history' 
                                        ? (isDark ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900') 
                                        : 'bg-red-500/20 text-red-400'
                                }`}>
                                    {historyList.length}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('preferences')}
                            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
                                activeTab === 'preferences'
                                    ? (isDark ? 'bg-white text-zinc-950 shadow-md font-[1000]' : 'bg-zinc-900 text-white shadow-md font-[1000]')
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            <Sliders size={14} />
                            <span>{isRtl ? 'ڕێکخستنەکان' : 'Settings'}</span>
                        </button>

                        {isMasterAdmin && (
                            <button
                                onClick={() => setActiveTab('admin')}
                                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
                                    activeTab === 'admin'
                                        ? 'bg-red-600 text-white shadow-md shadow-red-600/40 font-[1000]'
                                        : 'text-zinc-400 hover:text-red-400'
                                }`}
                            >
                                <ShieldCheck size={14} />
                                <span>{isRtl ? 'بەڕێوەبردن' : 'Admin'}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* ── 3. Tab Contents ── */}
                <AnimatePresence mode="wait">
                    
                    {/* TAB 1: WATCH HISTORY & CONTINUE WATCHING */}
                    {activeTab === 'history' && (
                        <motion.div
                            key="history-tab"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <Clock size={18} className="text-red-500" />
                                    <h2 className="text-lg font-black uppercase italic tracking-tight">
                                        {isRtl ? 'مێژووی سەیرکردن و بەردەوامبوون' : 'Continue Watching & History'}
                                    </h2>
                                    <span className="text-xs text-zinc-400 font-mono">
                                        ({historyList.length})
                                    </span>
                                </div>

                                {historyList.length > 0 && (
                                    <button
                                        onClick={handleClearAllHistory}
                                        className="text-xs font-black uppercase tracking-wider text-zinc-400 hover:text-red-500 transition-colors flex items-center gap-1.5 py-1 px-3 rounded-full border border-white/5 hover:border-red-500/30 cursor-pointer"
                                    >
                                        <Trash2 size={13} />
                                        <span>{isRtl ? 'سڕینەوەی هەمووی' : 'Clear All'}</span>
                                    </button>
                                )}
                            </div>

                            {/* Cards Grid */}
                            {historyList.length === 0 ? (
                                <div className={`rounded-3xl p-12 text-center border backdrop-blur-xl ${
                                    isDark ? 'bg-zinc-950/40 border-white/5' : 'bg-white/60 border-zinc-200'
                                }`}>
                                    <div className="w-16 h-16 rounded-full bg-red-600/10 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                                        <Film size={28} />
                                    </div>
                                    <h3 className="text-base font-black uppercase italic tracking-tight mb-1">
                                        {isRtl ? 'هیچ فیلم یان زنجیرەیەک سەیر نەکراوە' : 'No Watch History Yet'}
                                    </h3>
                                    <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-6">
                                        {isRtl 
                                            ? 'دەستبکە بە سەیرکردنی هەزاران فیلم، زنجیرە و ئەنیمەیشنی دۆبلاژکراوی کوردی لە FLKRD.' 
                                            : 'Explore thousands of movies, TV series, and Kurdish dubbed films to start your history.'}
                                    </p>
                                    <button
                                        onClick={() => navigate('/discover')}
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/30 active:scale-95 transition-all cursor-pointer"
                                    >
                                        <Compass size={16} />
                                        <span>{isRtl ? 'دەستپێکردنی گەڕان و سەیرکردن' : 'Browse Catalog'}</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
                                    {historyList.map((item: any) => {
                                        const rawPoster = item.poster_path || item.image || item.backdrop_path;
                                        const posterUrl = rawPoster?.startsWith('http') 
                                            ? rawPoster 
                                            : (rawPoster ? `https://image.tmdb.org/t/p/w500${rawPoster}` : '/flkrd-logo.png');
                                        
                                        const title = item.title || item.name || 'Movie';
                                        const duration = item.duration || 3600;
                                        const progressSec = item.progress || 0;
                                        const percent = Math.min(100, Math.max(5, Math.round((progressSec / duration) * 100)));

                                        return (
                                            <motion.div
                                                key={`${item.id}-${item.type}`}
                                                whileHover={{ y: -4, scale: 1.02 }}
                                                onClick={() => handleNavigateItem(item)}
                                                className={`group rounded-2xl overflow-hidden border cursor-pointer relative flex flex-col shadow-lg transition-all ${
                                                    isDark ? 'bg-zinc-950/80 border-white/10 hover:border-red-500/50' : 'bg-white border-zinc-200 hover:border-red-500/50'
                                                }`}
                                            >
                                                {/* Poster Frame */}
                                                <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900">
                                                    <img 
                                                        src={posterUrl} 
                                                        alt={title}
                                                        loading="lazy"
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = '/flkrd-logo.png';
                                                        }}
                                                    />

                                                    {/* Gradient overlay */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 opacity-70 group-hover:opacity-90 transition-opacity" />

                                                    {/* Top Badges */}
                                                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
                                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm ${
                                                            String(item.type) === 'dubbed'
                                                                ? 'bg-amber-500 text-black'
                                                                : (String(item.type) === 'tv' ? 'bg-cyan-500 text-black' : 'bg-red-600 text-white')
                                                        }`}>
                                                            {String(item.type) === 'dubbed' ? (isRtl ? 'دۆبلاژ' : 'DUBBED') : (String(item.type) === 'tv' ? 'TV' : 'MOVIE')}
                                                        </span>

                                                        <button
                                                            onClick={(e) => handleRemoveHistoryItem(e, item.id, item.type)}
                                                            className="w-6 h-6 rounded-full bg-black/60 hover:bg-red-600 text-white/80 hover:text-white flex items-center justify-center transition-colors shadow-md cursor-pointer"
                                                            title="Remove from history"
                                                            aria-label="Remove"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>

                                                    {/* Play Hover Icon */}
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                                                        <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl shadow-red-600/50">
                                                            <Play size={20} className="fill-white translate-x-0.5" />
                                                        </div>
                                                    </div>

                                                    {/* Progress Bar at Bottom of Image */}
                                                    <div className="absolute bottom-0 inset-x-0 h-1.5 bg-white/20">
                                                        <div 
                                                            className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-r-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                                                            style={{ width: `${percent}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Meta Info */}
                                                <div className="p-3 flex flex-col justify-between flex-grow">
                                                    <div>
                                                        <h4 className="text-xs font-black truncate text-white" title={title}>
                                                            {title}
                                                        </h4>
                                                        {item.season && item.episode && (
                                                            <span className="text-[9px] text-zinc-400 font-medium block">
                                                                S{item.season} : E{item.episode}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-zinc-400 mt-2">
                                                        <span className="text-red-400 font-mono">{percent}% {isRtl ? 'تەواوکراوە' : 'watched'}</span>
                                                        <span className="text-zinc-500 font-mono">
                                                            {Math.floor(progressSec / 60)}m / {Math.floor(duration / 60)}m
                                                        </span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* TAB 2: PREFERENCES & ACCOUNT SETTINGS */}
                    {activeTab === 'preferences' && (
                        <motion.div
                            key="preferences-tab"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                
                                {/* 1. Appearance / Theme */}
                                <div className={`p-6 rounded-3xl border backdrop-blur-2xl flex items-center justify-between ${
                                    isDark ? 'bg-zinc-950/70 border-white/10' : 'bg-white/80 border-zinc-200'
                                }`}>
                                    <div className="flex items-center gap-4">
                                        <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                            {isDark ? <Moon size={22} /> : <Sun size={22} />}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-wider">
                                                {t('appearance')}
                                            </h3>
                                            <p className="text-xs text-zinc-400 font-medium">
                                                {isDark ? t('dark') : t('light')} Mode Enabled
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-1 rounded-full bg-black/30 border border-white/10">
                                        <AnimatedThemeToggler />
                                    </div>
                                </div>

                                {/* 2. Language Selector */}
                                <div className={`p-6 rounded-3xl border backdrop-blur-2xl flex flex-col justify-between gap-4 ${
                                    isDark ? 'bg-zinc-950/70 border-white/10' : 'bg-white/80 border-zinc-200'
                                }`}>
                                    <div className="flex items-center gap-4">
                                        <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            <Languages size={22} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-wider">
                                                {t('language')}
                                            </h3>
                                            <p className="text-xs text-zinc-400 font-medium">
                                                {language === 'ku' ? 'Kurdish Sorani' : (language === 'badini' ? 'Kurdish Badini' : 'English')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Segmented language buttons */}
                                    <div className="flex p-1 rounded-2xl bg-black/40 border border-white/10">
                                        <button
                                            onClick={() => handleLanguageChange('en')}
                                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                language === 'en' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            {t('english')}
                                        </button>
                                        <button
                                            onClick={() => handleLanguageChange('ku')}
                                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                language === 'ku' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            سۆرانی
                                        </button>
                                        <button
                                            onClick={() => handleLanguageChange('badini')}
                                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                language === 'badini' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            بادینی
                                        </button>
                                    </div>
                                </div>

                                {/* 3. Notifications */}
                                <div className={`p-6 rounded-3xl border backdrop-blur-2xl flex items-center justify-between ${
                                    isDark ? 'bg-zinc-950/70 border-white/10' : 'bg-white/80 border-zinc-200'
                                }`}>
                                    <div className="flex items-center gap-4">
                                        <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            <Bell size={22} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-wider">
                                                {t('notifications')}
                                            </h3>
                                            <p className="text-xs text-zinc-400 font-medium">
                                                {notifEnabled ? (isRtl ? 'چالاککراوە' : 'Push notifications active') : (isRtl ? 'ناچالاکە' : 'Notifications disabled')}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={requestNotificationPermission}
                                        className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                                            notifEnabled 
                                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                                                : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                                        }`}
                                    >
                                        {notifEnabled ? 'Enabled' : 'Enable'}
                                    </button>
                                </div>

                                {/* 4. Full App Settings Modal Launcher */}
                                <div 
                                    onClick={() => setIsSettingsOpen(true)}
                                    className={`p-6 rounded-3xl border backdrop-blur-2xl flex items-center justify-between cursor-pointer hover:border-white/20 transition-all ${
                                        isDark ? 'bg-zinc-950/70 border-white/10' : 'bg-white/80 border-zinc-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                            <Sliders size={22} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-wider">
                                                {isRtl ? 'ڕێکخستنە پێشکەوتووەکان' : 'Advanced Preferences'}
                                            </h3>
                                            <p className="text-xs text-zinc-400 font-medium">
                                                {isRtl ? 'شووشە، خێرایی، دەنگ و کاش' : 'Glass, player engine, cache & sound'}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-zinc-500" />
                                </div>
                            </div>

                            {/* Sign Out Card */}
                            <div className="pt-4">
                                <div className={`p-6 rounded-3xl border backdrop-blur-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border-red-500/20 ${
                                    isDark ? 'bg-red-950/10' : 'bg-red-50/50'
                                }`}>
                                    <div className="flex items-center gap-4 text-center sm:text-left">
                                        <div className="p-3.5 rounded-2xl bg-red-600/10 text-red-500 border border-red-500/20">
                                            <LogOut size={22} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-wider text-red-500">
                                                {isRtl ? 'چوونەدەرەوە لە ئەکاونت' : 'Sign Out of Account'}
                                            </h3>
                                            <p className="text-xs text-zinc-400 font-medium">
                                                {isRtl ? 'کۆتایی هێنان بە دانیشتنی ئێستات.' : 'Safely end your active profile session.'}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={async () => {
                                            if (window.confirm(isRtl ? 'دڵنیای لە چوونەدەرەوە؟' : 'Are you sure you want to log out?')) {
                                                setIsAdmin(false);
                                                await signOut();
                                                addNotification({ type: 'info', title: 'Signed Out', message: 'Session terminated.' });
                                            }
                                        }}
                                        className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/30 active:scale-95 transition-all cursor-pointer"
                                    >
                                        {isRtl ? 'چوونەدەرەوە' : 'Log Out'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* TAB 3: ADMIN COMMAND HUB (Only rendered for Admins) */}
                    {activeTab === 'admin' && isMasterAdmin && (
                        <motion.div
                            key="admin-tab"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-5"
                        >
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={18} className="text-red-500" />
                                    <h2 className="text-sm font-black uppercase italic tracking-wider">
                                        {isRtl ? 'کۆنسۆڵی سەرەکی بەڕێوەبردن' : 'Executive Management Command Suite'}
                                    </h2>
                                </div>
                                <span className="text-[9px] bg-red-600/20 text-red-400 border border-red-500/30 font-black px-2.5 py-0.5 rounded-full uppercase">
                                    AUTHORIZED ROOT
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                
                                {/* 1. Master Control Hub */}
                                <div
                                    onClick={() => setIsAdminModalOpen(true)}
                                    className="p-6 rounded-3xl border border-red-500/30 hover:border-red-500/60 bg-gradient-to-br from-red-950/40 via-zinc-950 to-black backdrop-blur-2xl cursor-pointer shadow-xl relative overflow-hidden group transition-all"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/40">
                                            <Sliders size={20} />
                                        </div>
                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30">
                                            MASTER HUB
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-black uppercase tracking-tight text-white mb-1">
                                        {isRtl ? 'سەنتەری گشتی بەڕێوەبردن' : 'Master Control Hub'}
                                    </h3>
                                    <p className="text-[11px] text-zinc-400 font-medium mb-4">
                                        {isRtl ? 'سێرڤەرەکان، فیلمەکان، بەنەرەکان و ژێرنووسەکان' : 'Servers, Movie Manager, Banners & Sources'}
                                    </p>
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-red-400 group-hover:text-white pt-2 border-t border-white/5">
                                        <span>{isRtl ? 'کردنەوەی پانێڵ' : 'Launch Panel'}</span>
                                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>

                                {/* 2. Visitor Analytics */}
                                <div
                                    onClick={() => setShowAnalyticsModal(true)}
                                    className="p-6 rounded-3xl border border-emerald-500/30 hover:border-emerald-500/60 bg-gradient-to-br from-emerald-950/30 via-zinc-950 to-black backdrop-blur-2xl cursor-pointer shadow-xl relative overflow-hidden group transition-all"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/40">
                                            <TrendingUp size={20} />
                                        </div>
                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                            LIVE STATS
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-black uppercase tracking-tight text-white mb-1">
                                        {isRtl ? 'ئاماری بینەران و سەردانیکەران' : 'Visitor Analytics & Audience'}
                                    </h3>
                                    <p className="text-[11px] text-zinc-400 font-medium mb-4">
                                        {isRtl ? 'بینەرانی ڕاستەوخۆ، وڵاتەکان و خێرایی' : 'Live users, countries, speed & reports'}
                                    </p>
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-emerald-400 group-hover:text-white pt-2 border-t border-white/5">
                                        <span>{isRtl ? 'بینینی ئامارەکان' : 'View Analytics'}</span>
                                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>

                                {/* 3. Live Broadcaster */}
                                <div
                                    onClick={() => setShowBroadcastModal(true)}
                                    className="p-6 rounded-3xl border border-indigo-500/30 hover:border-indigo-500/60 bg-gradient-to-br from-indigo-950/30 via-zinc-950 to-black backdrop-blur-2xl cursor-pointer shadow-xl relative overflow-hidden group transition-all"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/40">
                                            <Radio size={20} />
                                        </div>
                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                            BROADCAST
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-black uppercase tracking-tight text-white mb-1">
                                        {isRtl ? 'ناردنی ئاگاداری ڕاستەوخۆ' : 'Live Broadcaster'}
                                    </h3>
                                    <p className="text-[11px] text-zinc-400 font-medium mb-4">
                                        {isRtl ? 'ناردنی پەیامی ئاگاداری بۆ هەموو بینەران' : 'Push instant announcement toasts to active users'}
                                    </p>
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-indigo-400 group-hover:text-white pt-2 border-t border-white/5">
                                        <span>{isRtl ? 'ناردنی پەیام' : 'Send Alert'}</span>
                                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>

                                {/* 4. Sub-Admin Security */}
                                <div
                                    onClick={() => setShowAdminModal(true)}
                                    className="p-6 rounded-3xl border border-amber-500/30 hover:border-amber-500/60 bg-gradient-to-br from-amber-950/30 via-zinc-950 to-black backdrop-blur-2xl cursor-pointer shadow-xl relative overflow-hidden group transition-all"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-600/40">
                                            <Users size={20} />
                                        </div>
                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                            SECURITY
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-black uppercase tracking-tight text-white mb-1">
                                        {isRtl ? 'بەڕێوەبردنی ئادمنەکان' : 'Sub-Admin Manager'}
                                    </h3>
                                    <p className="text-[11px] text-zinc-400 font-medium mb-4">
                                        {isRtl ? 'زیادکردنی ئەدمین و دیاریکردنی دەسەڵاتەکان' : 'Manage sub-admin credentials & roles'}
                                    </p>
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-amber-400 group-hover:text-white pt-2 border-t border-white/5">
                                        <span>{isRtl ? 'بەڕێوەبردن' : 'Manage Roles'}</span>
                                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>

                                {/* 5. Kurdish Subtitles */}
                                <div
                                    onClick={() => navigate('/kurdish-cc')}
                                    className="p-6 rounded-3xl border border-cyan-500/30 hover:border-cyan-500/60 bg-gradient-to-br from-cyan-950/30 via-zinc-950 to-black backdrop-blur-2xl cursor-pointer shadow-xl relative overflow-hidden group transition-all"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-cyan-600 flex items-center justify-center text-white shadow-lg shadow-cyan-600/40">
                                            <Captions size={20} />
                                        </div>
                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                            SUBTITLES
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-black uppercase tracking-tight text-white mb-1">
                                        {isRtl ? 'بەڕێوەبەری ژێرنووسی کوردی' : 'Subtitle Manager'}
                                    </h3>
                                    <p className="text-[11px] text-zinc-400 font-medium mb-4">
                                        {isRtl ? 'ژێرنووسەکان و سینککردنی کلاود' : 'Upload Kurdish subtitle files & sync to cloud'}
                                    </p>
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-cyan-400 group-hover:text-white pt-2 border-t border-white/5">
                                        <span>{isRtl ? 'کردنەوە' : 'Open CC Hub'}</span>
                                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Standalone Admin Command Center Modals */}
            <VisitorAnalyticsModal 
                isOpen={showAnalyticsModal} 
                onClose={() => setShowAnalyticsModal(false)} 
            />
            <AdminBroadcastModal 
                isOpen={showBroadcastModal} 
                onClose={() => setShowBroadcastModal(false)} 
            />
            <AdminManagementModal 
                isOpen={showAdminModal} 
                onClose={() => setShowAdminModal(false)} 
                accentColor={accentColor} 
                language={language} 
            />
            <AdminPanelModal 
                isOpen={isAdminModalOpen} 
                onClose={() => setIsAdminModalOpen(false)} 
            />
        </div>
    );
};

export default ProfilePage;