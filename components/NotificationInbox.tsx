import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, Zap, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { useUI } from '../contexts/UIContext';

interface InboxNotification {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
  read: boolean;
}

const MAX_INBOX = 30;
const STORAGE_KEY = 'flkrd_inbox_notifications';

function loadSaved(): InboxNotification[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveTo(items: InboxNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_INBOX)));
  } catch {}
}

const typeIcon = (type: string) => {
  switch (type) {
    case 'success': return <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />;
    case 'error': return <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />;
    case 'warning': return <Zap className="w-4 h-4 text-yellow-400 shrink-0" />;
    default: return <Info className="w-4 h-4 text-blue-400 shrink-0" />;
  }
};

const NotificationInbox: React.FC = () => {
  const { accentColor } = useUI();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<InboxNotification[]>(loadSaved);
  const popoverRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const unreadCount = items.filter(n => !n.read).length;

  // Listen for app-level notification events to add to inbox
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { title, message, type } = e.detail || {};
      if (!title) return;
      const newItem: InboxNotification = {
        id: `${Date.now()}-${Math.random()}`,
        title,
        message,
        type: type || 'info',
        timestamp: Date.now(),
        read: false,
      };
      setItems(prev => {
        const updated = [newItem, ...prev].slice(0, MAX_INBOX);
        saveTo(updated);
        return updated;
      });
    };
    window.addEventListener('flkrd-inbox-notification', handler as EventListener);
    return () => window.removeEventListener('flkrd-inbox-notification', handler as EventListener);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isOpen]);

  const markAllRead = () => {
    setItems(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveTo(updated);
      return updated;
    });
  };

  const clearAll = () => {
    setItems([]);
    saveTo([]);
  };

  const markRead = (id: string) => {
    setItems(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      saveTo(updated);
      return updated;
    });
  };

  const timeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={btnRef}
        onClick={() => {
          setIsOpen(o => !o);
          if (!isOpen) markAllRead();
        }}
        className="relative flex items-center justify-center w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/10 hover:bg-black/50 transition-all active:scale-90 focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-white/80" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-black text-white px-1 shadow-lg"
            style={{ backgroundColor: accentColor }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-12 w-80 max-h-[420px] flex flex-col z-[9999] rounded-3xl border border-white/10 bg-zinc-950/95 backdrop-blur-2xl shadow-[0_32px_80px_rgba(0,0,0,0.9)] overflow-hidden"
          style={{ marginTop: 4 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
            <span className="text-[11px] font-black uppercase tracking-widest text-white/60">Notifications</span>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] font-bold text-white/40 hover:text-white/80 transition-colors flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" /> All read
                </button>
              )}
              <button
                onClick={clearAll}
                className="text-[10px] font-bold text-white/40 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="overflow-y-auto flex-1 overscroll-contain">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-white/30">
                <Bell className="w-8 h-8" />
                <span className="text-[12px] font-semibold">No notifications yet</span>
              </div>
            ) : (
              items.map(n => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-white/5 transition-colors hover:bg-white/5 ${!n.read ? 'bg-white/[0.03]' : ''}`}
                >
                  <div className="mt-0.5">{typeIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[12px] font-bold truncate ${n.read ? 'text-white/50' : 'text-white'}`}>{n.title}</p>
                      <span className="text-[10px] text-white/30 shrink-0">{timeAgo(n.timestamp)}</span>
                    </div>
                    {n.message && (
                      <p className="text-[11px] text-white/40 mt-0.5 line-clamp-2">{n.message}</p>
                    )}
                  </div>
                  {!n.read && (
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: accentColor }} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationInbox;