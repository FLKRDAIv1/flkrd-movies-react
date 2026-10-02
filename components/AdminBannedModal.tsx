import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, Trash2, RotateCcw, Plus, Search, CheckCircle2, Film, AlertTriangle } from 'lucide-react';
import { bannedService } from '../services/bannedService';
import { useNotification } from '../contexts/NotificationContext';
import { useTranslation } from '../contexts/LanguageContext';
import Portal from './Portal';

interface AdminBannedModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AdminBannedModal: React.FC<AdminBannedModalProps> = ({ isOpen, onClose }) => {
    const { addNotification } = useNotification();
    const { language } = useTranslation();
    const isRtl = language === 'ku' || language === 'badini';

    const [bannedList, setBannedList] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [newId, setNewId] = useState('');
    const [newMediaType, setNewMediaType] = useState<'movie' | 'tv' | 'dubbed'>('movie');
    const [submitting, setSubmitting] = useState(false);

    const loadRegistry = async () => {
        setLoading(true);
        try {
            const list = await bannedService.getBannedRegistry();
            setBannedList(list || []);
        } catch {
            setBannedList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadRegistry();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleUnban = async (contentId: string) => {
        const confirmMsg = isRtl
            ? `ئایا دڵنیایت لە لابردنی بلۆک لەسەر ناوەڕۆکی ژمارە ${contentId}؟ دووبارە لە وێبسایت پیشان دەدرێتەوە.`
            : `Are you sure you want to unban ID ${contentId}? It will be visible again.`;
        if (!window.confirm(confirmMsg)) return;

        await bannedService.unbanContent(contentId);
        addNotification({
            type: 'success',
            title: isRtl ? 'بلۆک لادرا' : 'Unbanned',
            message: isRtl ? `ناوەڕۆکی ${contentId} بە سەرکەوتوویی لە لیستی بلۆک لادرا.` : `Content ID ${contentId} has been unbanned.`
        });
        await loadRegistry();
    };

    const handleManualBan = async (e: React.FormEvent) => {
        e.preventDefault();
        const clean = newId.trim();
        if (!clean) return;

        setSubmitting(true);
        await bannedService.banContent(clean, newMediaType);
        setSubmitting(false);
        setNewId('');

        addNotification({
            type: 'success',
            title: isRtl ? 'ناوەڕۆک بلۆک کرا' : 'Content Banned',
            message: isRtl ? `ناوەڕۆکی ${clean} خرایە لیستی بلۆکەوە.` : `Content ${clean} has been banned.`
        });
        await loadRegistry();
    };

    const filtered = bannedList.filter(item => {
        const idStr = String(item.content_id || '').toLowerCase();
        const typeStr = String(item.media_type || '').toLowerCase();
        const q = searchQuery.toLowerCase().trim();
        return !q || idStr.includes(q) || typeStr.includes(q);
    });

    return (
        <Portal>
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/80 backdrop-blur-xl"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="relative w-full max-w-2xl bg-zinc-950/95 border border-red-500/30 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.85)] p-5 sm:p-7 overflow-hidden z-10 text-white flex flex-col max-h-[90vh]"
                    dir={isRtl ? 'rtl' : 'ltr'}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
                                <ShieldAlert size={20} />
                            </div>
                            <div>
                                <h2 className="text-base sm:text-lg font-black uppercase italic tracking-tight">
                                    {isRtl ? 'بەڕێوەبەری فیلمە بلۆککراوەکان' : 'Banned Content Control'}
                                </h2>
                                <p className="text-[11px] text-zinc-400 font-medium">
                                    {isRtl ? 'بینین و گەڕاندنەوەی فیلم و زنجیرە بلۆککراوەکان' : 'View, manage and restore blocked movies & series'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Manual Ban Form */}
                    <form onSubmit={handleManualBan} className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl mb-4 shrink-0 flex flex-wrap items-center gap-2">
                        <input
                            type="text"
                            value={newId}
                            onChange={(e) => setNewId(e.target.value)}
                            placeholder={isRtl ? 'ناسنامەی فیلم یان زنجیرە (ID)' : 'Movie/Series ID to ban'}
                            className="flex-1 min-w-[140px] bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-red-500"
                        />
                        <select
                            value={newMediaType}
                            onChange={(e: any) => setNewMediaType(e.target.value)}
                            className="bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                        >
                            <option value="movie">Movie</option>
                            <option value="tv">TV Series</option>
                            <option value="dubbed">Dubbed</option>
                        </select>
                        <button
                            type="submit"
                            disabled={submitting || !newId.trim()}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                            <Plus size={14} />
                            <span>{isRtl ? 'بلۆک بکە' : 'Ban ID'}</span>
                        </button>
                    </form>

                    {/* Search & Count */}
                    <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={isRtl ? 'گەڕان لە نێو ناسنامەکان...' : 'Search banned IDs...'}
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-red-500/50"
                            />
                        </div>
                        <span className="text-xs font-mono font-bold text-zinc-400 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
                            {filtered.length} {isRtl ? 'بلۆککراو' : 'Banned'}
                        </span>
                    </div>

                    {/* Content List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[220px]">
                        {loading ? (
                            <div className="py-12 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
                                <span className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                <span>{isRtl ? 'بارکردنی تۆمارەکان...' : 'Loading banned registry...'}</span>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="py-12 text-center text-zinc-500 text-xs">
                                <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-500/60" />
                                <p className="font-bold">{isRtl ? 'هیچ فیلم یان زنجیرەیەکی بلۆککراو نەدۆزرایەوە.' : 'No banned content found.'}</p>
                            </div>
                        ) : (
                            filtered.map((item) => (
                                <div
                                    key={item.content_id}
                                    className="p-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 rounded-2xl flex items-center justify-between gap-3 transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-xl bg-red-600/15 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                                            <Film size={14} />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-xs font-mono font-bold text-white block truncate">
                                                ID: {item.content_id}
                                            </span>
                                            <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">
                                                Type: {item.media_type || 'movie'}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleUnban(item.content_id)}
                                        className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
                                        title="Unban this content"
                                    >
                                        <RotateCcw size={12} />
                                        <span>{isRtl ? 'لابردنی بلۆک' : 'Unblock'}</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </Portal>
    );
};
