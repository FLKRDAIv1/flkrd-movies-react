import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X, Sparkles } from 'lucide-react';
import { Notification } from '../types';

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const badgeStyles = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
  error: 'bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.2)]',
  info: 'bg-sky-500/15 text-sky-400 border-sky-500/30 shadow-[0_0_15px_rgba(56,189,248,0.2)]',
};

const progressGradient = {
  success: 'from-emerald-500 via-teal-400 to-emerald-400',
  error: 'from-rose-500 via-red-400 to-rose-400',
  info: 'from-sky-500 via-blue-400 to-sky-400',
};

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onDismiss }) => {
  const { id, type, title, message, duration = 4000, image, actionUrl } = notification;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const handleActionClick = () => {
    if (actionUrl) {
      window.location.href = actionUrl;
      onDismiss(id);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } }}
      onClick={actionUrl ? handleActionClick : undefined}
      className={`relative w-full bg-zinc-950/90 border border-white/10 backdrop-blur-2xl text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-2xl p-3.5 overflow-hidden pointer-events-auto flex items-start gap-3 select-none transition-all duration-300 ${
        actionUrl ? 'cursor-pointer hover:border-white/20 hover:bg-zinc-900/90 group' : ''
      }`}
    >
      {/* Icon Badge */}
      <div className={`p-2 rounded-xl border flex-shrink-0 flex items-center justify-center ${badgeStyles[type]}`}>
        {type === 'success' && <Sparkles className="w-4 h-4" />}
        {type === 'error' && <AlertTriangle className="w-4 h-4" />}
        {type === 'info' && <Info className="w-4 h-4" />}
      </div>

      {/* Optional Movie Backdrop / Poster Image */}
      {image && (
        <img
          src={image}
          alt=""
          className="w-12 h-12 rounded-xl object-cover ring-1 ring-white/15 flex-shrink-0 shadow-md group-hover:scale-105 transition-transform duration-300"
        />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5">
          <h4 className="text-xs font-bold tracking-tight text-white truncate">{title}</h4>
        </div>
        <p className="text-[11px] text-zinc-300 font-medium leading-relaxed mt-0.5 line-clamp-2">
          {message}
        </p>
      </div>

      {/* Close Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(id);
        }}
        className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer flex-shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Sleek Progress Bar (Defaults to 4 Seconds) */}
      <motion.div
        className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${progressGradient[type]}`}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        style={{ originX: 0 }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
      />
    </motion.div>
  );
};

export default NotificationItem;