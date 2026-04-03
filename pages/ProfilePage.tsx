import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Shield, Zap, Bell, Moon, Sun, Languages,
    Save, Edit3, Camera, Clock, Activity, Award,
    ChevronRight, ArrowLeft, Check, Sparkles, Monitor, Smartphone, Download,
    ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import Spinner from '../components/Spinner';
import { downloadMobileConfig } from '../utils/appleProfileUtils';

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { t, language, setLanguage } = useTranslation();
    const { theme, toggleTheme, accentColor } = useUI();
    const { addNotification } = useNotification();

    const [userName, setUserName] = useState(() => localStorage.getItem('flkrd_username') || 'Guest User');
    const [isEditingName, setIsEditingName] = useState(false);
    const [notifEnabled, setNotifEnabled] = useState(() => Notification.permission === 'granted');
    const [loading, setLoading] = useState(true);

    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/.test(userAgent);
    const isApple = isIOS || isMac || (isMac && "ontouchend" in document);

    const stats = {
        memberSince: '2024',
        watchedCount: JSON.parse(localStorage.getItem('watchProgress') || '[]').length,
        rank: t('userRank')
    };

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    const handleSaveName = () => {
        localStorage.setItem('flkrd_username', userName);
        setIsEditingName(false);
        addNotification({ type: 'success', title: 'Profile Updated', message: 'User identity synchronized.' });
    };

    const handleLanguageChange = (lang: 'en' | 'ku') => {
        setLanguage(lang);
        addNotification({ type: 'info', title: 'Language Sync', message: `Interface language set to ${lang === 'en' ? 'English' : 'Kurdish'}.` });
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-black"><Spinner /></div>;

    return (
        <div className="min-h-screen pt-32 pb-40 container mx-auto px-4 md:px-8 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[50vh] bg-gradient-to-b from-[var(--brand-red)]/10 via-transparent to-transparent pointer-events-none" />
            <div
                className="absolute -top-24 -right-24 w-96 h-96 blur-[120px] rounded-full animate-pulse transition-colors duration-1000"
                style={{ backgroundColor: accentColor + '0D' }}
            />

            <div className="max-w-5xl mx-auto relative z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-8 flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-[var(--brand-red)] text-white px-5 py-3 rounded-2xl transition-all shadow-xl group w-fit"
                >
                    {language === 'ku' ? <ArrowLeft size={20} className="rotate-180 group-hover:translate-x-1 transition-transform" /> : <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('back')}</span>
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
                    <div className="lg:col-span-4 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-[var(--card-bg)] border border-white/10 rounded-[3rem] p-10 text-center relative overflow-hidden shadow-2xl transition-colors duration-500"
                        >
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-[var(--brand-red)]" />

                            <div className="relative inline-block mb-6">
                                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[var(--brand-red)] p-1 bg-black">
                                    <div className="w-full h-full rounded-full bg-gradient-to-br from-[var(--brand-red)] to-black flex items-center justify-center overflow-hidden">
                                        <User size={64} className="text-white opacity-40" />
                                    </div>
                                </div>
                                <button className="absolute bottom-1 right-1 bg-[var(--brand-red)] text-white p-2.5 rounded-full border-4 border-[var(--card-bg)] hover:scale-110 transition-all">
                                    <Camera size={18} />
                                </button>
                            </div>

                            <div className="flex flex-col items-center">
                                {isEditingName ? (
                                    <div className="flex items-center gap-2 mb-2 w-full">
                                        <input
                                            type="text"
                                            value={userName}
                                            onChange={(e) => setUserName(e.target.value)}
                                            className="bg-black border border-[var(--brand-red)]/50 rounded-xl px-4 py-2 text-white font-bold w-full outline-none focus:border-[var(--brand-red)]"
                                        />
                                        <button onClick={handleSaveName} className="p-2.5 bg-green-600 rounded-xl text-white"><Check size={20} /></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 mb-2">
                                        <h2 className="text-3xl font-[1000] uppercase italic tracking-tighter text-[var(--text-primary)]">{userName}</h2>
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
                    </div>

                    <div className="lg:col-span-8 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white/[0.02] backdrop-blur-[60px] border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl relative"
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
                                    <button
                                        onClick={toggleTheme}
                                        className="relative w-16 h-8 rounded-full bg-white/10 border border-white/10 p-1 transition-colors duration-300"
                                    >
                                        <motion.div
                                            animate={{ x: theme === 'dark' ? 32 : 0 }}
                                            className="w-6 h-6 rounded-full bg-[var(--brand-red)] shadow-[0_0_15px_rgba(var(--brand-red-rgb),0.6)]"
                                        />
                                    </button>
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
                                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${language === 'en' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-[var(--text-primary)]'}`}
                                        >
                                            {t('english')}
                                        </button>
                                        <button
                                            onClick={() => handleLanguageChange('ku')}
                                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${language === 'ku' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-[var(--text-primary)]'}`}
                                        >
                                            {t('kurdish')}
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gradient-to-r from-[var(--brand-red)] to-black rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden group">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 blur-[60px] group-hover:scale-150 transition-transform duration-[2s]" />
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

                            {isApple && (
                                <motion.div whileHover={{ scale: 1.02 }} className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group flex flex-col justify-between">
                                    <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-4">
                                            <ShieldCheck size={20} className="text-blue-500" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Apple Native Node</span>
                                        </div>
                                        <h4 className="text-xl font-[1000] text-[var(--text-primary)] uppercase italic tracking-tighter leading-tight mb-2">Native Integration</h4>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed">Experience a zero-latency, full-screen native cinematic experience.</p>
                                    </div>
                                    <button
                                        onClick={downloadMobileConfig}
                                        className="relative z-10 mt-6 w-full bg-white/5 border border-white/10 hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-all py-4 rounded-2xl font-black uppercase italic text-[10px] tracking-widest flex items-center justify-center gap-3"
                                    >
                                        <Download size={16} /> Link Device
                                    </button>
                                </motion.div>
                            )}
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