import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Send, X, Sparkles, AlertTriangle, Info, Image as ImageIcon, Link as LinkIcon, Clock } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { useNotification } from '../contexts/NotificationContext';
import { useTranslation } from '../contexts/LanguageContext';
import Portal from './Portal';

interface AdminBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminBroadcastModal: React.FC<AdminBroadcastModalProps> = ({ isOpen, onClose }) => {
  const { addNotification } = useNotification();
  const { t } = useTranslation();
  
  const [type, setType] = useState<'success' | 'info' | 'error'>('success');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [image, setImage] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [duration, setDuration] = useState<number>(4000);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSendBroadcast = async () => {
    if (!title.trim() || !message.trim()) {
      addNotification({
        type: 'error',
        title: 'Form Incomplete',
        message: 'Please provide both a Title and Message for the broadcast.',
        duration: 3000,
      });
      return;
    }

    setIsSending(true);

    const payload = {
      type,
      title: title.trim(),
      message: message.trim(),
      image: image.trim() || undefined,
      actionUrl: actionUrl.trim() || undefined,
      duration: duration || 4000,
      timestamp: Date.now(),
    };

    try {
      // 1. Send Supabase Realtime Broadcast to ALL connected clients
      const channel = supabase.channel('global_admin_broadcast');
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'admin_notification',
            payload,
          });
          setTimeout(() => supabase.removeChannel(channel), 1000);
        }
      });

      // 2. Insert into Supabase table `admin_broadcasts` for database real-time sync & persistence
      try {
        await supabase.from('admin_broadcasts').insert([{
          type: payload.type,
          title: payload.title,
          message: payload.message,
          image: payload.image,
          action_url: payload.actionUrl,
          duration: payload.duration,
          created_at: new Date().toISOString(),
        }]);
      } catch (e) {}

      // 3. Trigger native notification on local admin browser as well if permitted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(payload.title, { body: payload.message, icon: payload.image || '/favicon.ico' });
        } catch (e) {}
      }

      // 4. Admin local preview feedback
      addNotification({
        type: 'success',
        title: 'Broadcast Dispatched!',
        message: 'Notification sent live to all active users on FLKRD MOVIES.',
        duration: 4000,
      });

      // Reset form & close
      setTitle('');
      setMessage('');
      setImage('');
      setActionUrl('');
      setIsSending(false);
      onClose();
    } catch (err: any) {
      console.error("Broadcast dispatch failed:", err);
      addNotification({
        type: 'error',
        title: 'Dispatch Failed',
        message: err.message || 'Could not send broadcast notification.',
        duration: 4000,
      });
      setIsSending(false);
    }
  };

  return (
    <Portal id="admin-broadcast-modal-portal">
      <AnimatePresence>
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-zinc-950/95 border border-white/10 rounded-3xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden select-none text-white"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    Admin Notification Broadcaster
                  </h3>
                  <p className="text-[10px] font-medium text-zinc-400">
                    Send real-time Shadcn toasts live to all active users
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Inputs */}
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
              {/* Notification Type Selector */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">
                  Notification Style & Type
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setType('success')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                      type === 'success'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Success
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('info')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                      type === 'info'
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.3)]'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                    }`}
                  >
                    <Info className="w-3.5 h-3.5" />
                    Info
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('error')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                      type === 'error'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Alert
                  </button>
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">
                  Notification Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. ئاگاداری گرنگ بۆ وەرگێڕانەکان / New Movie Released"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 transition-all"
                />
              </div>

              {/* Message Input */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">
                  Message Description *
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. فیلمی چاوەڕوانکراوی 'The Odyssey' ئێستا بەردەستە!"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 transition-all resize-none"
                />
              </div>

              {/* Image & URL Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Image URL */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Image / Poster URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://image.tmdb.org/..."
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 transition-all"
                  />
                </div>

                {/* Target Route */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" /> Action Route Link
                  </label>
                  <input
                    type="text"
                    placeholder="/#/details/movie/123"
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 transition-all"
                  />
                </div>
              </div>

              {/* Screen Duration Selector */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Display Duration: {duration / 1000}s
                </label>
                <div className="flex gap-2">
                  {[3000, 4000, 6000, 8000].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setDuration(dur)}
                      className={`flex-1 py-1.5 rounded-xl border text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        duration === dur
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                      }`}
                    >
                      {dur / 1000} Sec
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Toast Preview Box */}
              <div className="pt-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 block">
                  Live Toast Preview:
                </span>
                <div className="relative w-full bg-zinc-950/90 border border-white/10 backdrop-blur-xl text-white rounded-2xl p-3 flex items-start gap-3 select-none">
                  <div className={`p-2 rounded-xl border flex-shrink-0 flex items-center justify-center ${
                    type === 'success' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                    type === 'error' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
                    'bg-sky-500/15 text-sky-400 border-sky-500/30'
                  }`}>
                    {type === 'success' && <Sparkles className="w-4 h-4" />}
                    {type === 'error' && <AlertTriangle className="w-4 h-4" />}
                    {type === 'info' && <Info className="w-4 h-4" />}
                  </div>
                  {image ? (
                    <img src={image} alt="" className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/15 flex-shrink-0" />
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{title || 'Preview Title'}</h4>
                    <p className="text-[10px] text-zinc-300 leading-tight mt-0.5 line-clamp-2">{message || 'Preview message body content...'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Action Button */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl border border-white/10 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendBroadcast}
                disabled={isSending}
                className="flex-[2] py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSending ? 'Sending Live...' : 'Send Live Broadcast'}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </Portal>
  );
};

export default AdminBroadcastModal;
