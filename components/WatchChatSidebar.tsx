import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, Shield, Sparkles, X, Smile, Settings, AlertTriangle } from 'lucide-react';
import { SearchComponent } from 'stipop-react-sdk';
import { supabase } from '../utils/supabaseClient';
import { useTranslation } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';

class StickerErrorBoundary extends React.Component<{ children: React.ReactNode; language: string }, { hasError: boolean }> {
  state: { hasError: boolean };
  props: { children: React.ReactNode; language: string };

  constructor(props: { children: React.ReactNode; language: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn("Caught Stipop SDK render exception:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isKurdish = this.props.language === 'ku' || this.props.language === 'badini';
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center bg-zinc-950/80 rounded-[1.25rem] border border-zinc-800 m-2 h-[220px]">
          <AlertTriangle className="text-orange-500 mb-3 animate-pulse" size={24} />
          <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-2">
            {isKurdish ? 'ستیکەرەکان بەردەست نین' : 'Stickers Unavailable'}
          </p>
          <p className="text-[8px] font-bold text-zinc-500 leading-relaxed max-w-[200px] uppercase">
            {isKurdish 
              ? 'تکایە دڵنیابەرەوە کە کلیلی API لە فایلی کۆنفیگ بە شێوەیەکی دروست دانراوە.' 
              : 'Please verify that your Stipop API Key is correctly configured in your Dashboard.'}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

interface WatchChatSidebarProps {
  ticketId: string;
  localUserId: string;
  localUserName: string;
  isHost: boolean;
  guestName: string;
  hostName: string;
  onClose?: () => void;
  isChatOpen?: boolean;
  chatWidth?: number;
  onChatWidthChange?: (width: number) => void;
}

interface MessageItem {
  id: string;
  userId: string;
  sender: string;
  text: string;
  createdAt: string;
  isSystem?: boolean;
}

const playSyncChime = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.04, audioCtx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (e) {}
};

const parseDurationToSeconds = (timeStr: string): number | null => {
  const parts = timeStr.trim().split(':');
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parseInt(parts[2], 10);
    if (!isNaN(h) && !isNaN(m) && !isNaN(s)) {
      return h * 3600 + m * 60 + s;
    }
  } else if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (!isNaN(m) && !isNaN(s)) {
      return m * 60 + s;
    }
  } else if (parts.length === 1) {
    const s = parseInt(parts[0], 10);
    if (!isNaN(s)) {
      return s;
    }
  }
  return null;
};

export const WatchChatSidebar: React.FC<WatchChatSidebarProps> = ({
  ticketId,
  localUserId,
  localUserName,
  isHost,
  guestName,
  hostName,
  onClose,
  isChatOpen = true,
  chatWidth = 22,
  onChatWidthChange,
}) => {
  const { language } = useTranslation();
  const { addNotification } = useNotification();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const headerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [stickerError, setStickerError] = useState(false);

  // Use refs to track live state inside timeout callbacks (avoids stale closure)
  const isInputFocusedRef = useRef(false);
  const showStickersRef = useRef(false);
  const showSettingsRef = useRef(false);

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason && (
        String(reason).includes('stipop') || 
        String(reason.message).includes('401') || 
        String(reason.message).includes('stipop') ||
        String(reason).includes('401')
      )) {
        console.warn("Caught Stipop promise rejection:", reason);
        setStickerError(true);
        event.preventDefault(); // Stop from logging uncaught exception
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  useEffect(() => {
    if (showStickers) {
      setStickerError(false);
    }
  }, [showStickers]);

  const STIPOP_API_KEY = 'c186cd75c25d5975d1edf3e8fef69234';

  const resetHeaderTimer = () => {
    setShowControls(true);
    if (headerTimeoutRef.current) {
      clearTimeout(headerTimeoutRef.current);
    }
    headerTimeoutRef.current = setTimeout(() => {
      // Read from refs (not stale closure values) to get current live state
      if (!isInputFocusedRef.current && !showStickersRef.current && !showSettingsRef.current) {
        setShowControls(false);
      }
    }, 4000);
  };

  useEffect(() => {
    if (isChatOpen) {
      resetHeaderTimer();
    } else {
      setShowControls(false);
    }
    return () => {
      if (headerTimeoutRef.current) {
        clearTimeout(headerTimeoutRef.current);
      }
    };
  }, [isChatOpen]);

  useEffect(() => {
    if (isInputFocused || showStickers || showSettings) {
      // Sync refs
      isInputFocusedRef.current = isInputFocused;
      showStickersRef.current = showStickers;
      showSettingsRef.current = showSettings;
      setShowControls(true);
      if (headerTimeoutRef.current) {
        clearTimeout(headerTimeoutRef.current);
      }
    } else {
      isInputFocusedRef.current = false;
      showStickersRef.current = false;
      showSettingsRef.current = false;
      resetHeaderTimer();
    }
  }, [isInputFocused, showStickers, showSettings]);

  const isRtl = (language === 'ku' || language === 'badini');

  // 1. Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('room_messages')
          .select('*')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (data) {
          const parsed = data.map((msg: any) => {
            let sender = msg.user_id?.toLowerCase() === localUserId?.toLowerCase() ? localUserName : (isHost ? guestName : hostName);
            let text = msg.message;
            let isSystem = false;

            try {
              const payload = JSON.parse(msg.message);
              sender = payload.sender;
              text = payload.text;
              isSystem = !!payload.isSystem;
            } catch {
              // Fail-safe for plain text messages
            }

            return {
              id: msg.id,
              userId: msg.user_id,
              sender,
              text,
              createdAt: msg.created_at,
              isSystem,
            };
          });
          setMessages(parsed);
        }
      } catch (err) {
        console.error('Failed to load room messages:', err);
      }
    };

    fetchMessages();
  }, [ticketId, localUserId, localUserName, isHost, guestName, hostName]);

  // 2. Realtime subscription for incoming messages
  useEffect(() => {
    const channel = supabase
      .channel(`chat-room-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const msg = payload.new;
          let sender = msg.user_id?.toLowerCase() === localUserId?.toLowerCase() ? localUserName : (isHost ? guestName : hostName);
          let text = msg.message;
          let isSystem = false;

          try {
            const parsed = JSON.parse(msg.message);
            sender = parsed.sender;
            text = parsed.text;
            isSystem = !!parsed.isSystem;
          } catch {
            // plain text
          }

          const newMessage: MessageItem = {
            id: msg.id,
            userId: msg.user_id,
            sender,
            text,
            createdAt: msg.created_at,
            isSystem,
          };

          // Alert user if the chat is closed and the message is from another watcher
          if (!isChatOpen && msg.user_id?.toLowerCase() !== localUserId?.toLowerCase()) {
            playSyncChime();
            const isSenderHost = sender === hostName;
            addNotification({
              type: 'info',
              title: (language === 'ku' || language === 'badini') ? '💬 پەیامی نوێ' : '💬 New Message',
              message: (language === 'ku' || language === 'badini')
                ? `نامەیەکی نوێ لە لایەن [${isSenderHost ? 'پێشکەشکار' : 'بینەر'}] (${sender})`
                : `New chat from [${isSenderHost ? 'Host' : 'Watcher'}] (${sender})`,
            });
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, localUserId, localUserName, isHost, guestName, hostName, isChatOpen]);

  // 3. Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed || sending) return;

    // Check for slash seek command
    if (trimmed.startsWith('/seek ')) {
      const timePart = trimmed.substring(6).trim();
      const seconds = parseDurationToSeconds(timePart);
      if (seconds !== null) {
        window.dispatchEvent(new CustomEvent('cowatch-seek', { detail: { seconds } }));
        setInputMessage('');
        return;
      }
    }

    // Check for raw timestamp (e.g. 1:25 or 01:23:45)
    const timestampRegex = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/;
    if (timestampRegex.test(trimmed)) {
      const seconds = parseDurationToSeconds(trimmed);
      if (seconds !== null) {
        window.dispatchEvent(new CustomEvent('cowatch-seek', { detail: { seconds } }));
        setInputMessage('');
        return;
      }
    }

    setSending(true);
    try {
      const payload = JSON.stringify({
        sender: localUserName,
        text: trimmed,
      });

      const { error } = await supabase.from('room_messages').insert({
        ticket_id: ticketId,
        user_id: localUserId,
        message: payload,
      });

      if (error) throw error;
      setInputMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
      addNotification({
        type: 'error',
        title: (language === 'ku' || language === 'badini') ? 'نامەکە نەنێردرا' : 'Send Failed',
        message: (language === 'ku' || language === 'badini') ? 'کێشەیەک لە پەیوەندی هەیە.' : 'Connection failure in database relay.',
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendStipopSticker = async (imgUrl: string) => {
    setShowStickers(false);
    try {
      const payload = JSON.stringify({
        sender: localUserName,
        text: `[stipop:${imgUrl}]`,
      });

      const { error } = await supabase.from('room_messages').insert({
        ticket_id: ticketId,
        user_id: localUserId,
        message: payload,
      });

      if (error) throw error;
      playSyncChime();
    } catch (err) {
      console.error('Failed to send Stipop sticker:', err);
    }
  };

  const isStipopSticker = (text: string) => {
    return text.startsWith('[stipop:') && text.endsWith(']');
  };

  const getStipopStickerUrl = (text: string) => {
    return text.substring(8, text.length - 1);
  };

  const handleSendSticker = async (name: string) => {
    setShowStickers(false);
    try {
      const payload = JSON.stringify({
        sender: localUserName,
        text: `[sticker:${name}]`,
      });

      const { error } = await supabase.from('room_messages').insert({
        ticket_id: ticketId,
        user_id: localUserId,
        message: payload,
      });

      if (error) throw error;
      playSyncChime();
    } catch (err) {
      console.error('Failed to send sticker:', err);
    }
  };

  const isSticker = (text: string) => {
    return text.startsWith('[sticker:') && text.endsWith(']');
  };

  const getStickerName = (text: string) => {
    return text.substring(9, text.length - 1);
  };

  const renderSticker = (name: string) => {
    const emojis: Record<string, string> = {
      sun: '☀️',
      lion: '🦁',
      popcorn: '🍿',
      clapper: '🎬',
      heart: '💖',
      pizza: '🍕',
      soda: '🥤',
      award: '🏆'
    };

    const emoji = emojis[name] || '🎬';

    return (
      <motion.span
        animate={{ scale: [1, 1.2, 1], rotate: name === 'sun' ? [0, 360] : 0 }}
        transition={{ duration: name === 'sun' ? 10 : 2, repeat: Infinity, ease: 'linear' }}
        className="inline-block text-2xl filter drop-shadow-[0_2px_8px_rgba(249,115,22,0.3)] select-none align-middle mx-1"
      >
        {emoji}
      </motion.span>
    );
  };

  const renderMessageText = (text: string) => {
    const timestampRegex = /\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b/g;
    
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = timestampRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }

      const fullMatch = match[0];
      const hours = match[1] ? parseInt(match[1]) : 0;
      const minutes = parseInt(match[2]);
      const seconds = parseInt(match[3]);
      
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;

      parts.push(
        <button
          key={matchIndex}
          type="button"
          onClick={() => {
            playSyncChime();
            window.dispatchEvent(new CustomEvent('cowatch-seek', { detail: { seconds: totalSeconds } }));
          }}
          className="text-orange-400 hover:text-orange-300 font-[1000] underline focus:outline-none px-1.5 py-0.5 rounded bg-white/5 border border-white/10 active:scale-95 transition-all inline-flex items-center gap-1 leading-none shadow-sm cursor-pointer mx-0.5"
        >
          <Sparkles size={9} className="text-orange-400 animate-pulse" />
          <span>{fullMatch}</span>
        </button>
      );

      lastIndex = timestampRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div 
      onMouseMove={resetHeaderTimer}
      onMouseEnter={resetHeaderTimer}
      onTouchStart={resetHeaderTimer}
      className="flex flex-col h-full bg-transparent w-full rounded-[2.25rem] overflow-hidden relative select-none"
    >
      {/* Sidebar Header */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -15, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -15, height: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="p-4 flex flex-col shrink-0 bg-transparent text-white overflow-hidden w-full select-none"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-orange-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-white italic">
                  {(language === 'ku' || language === 'badini') ? 'چاتی ڕاستەوخۆ' : 'PARTY CHAT'}
                </h3>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-orange-600/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                  <Shield size={10} className="text-orange-500" />
                  <span className="text-[7px] font-black uppercase text-orange-500 tracking-wider">
                    {(language === 'ku' || language === 'badini') ? 'پارێزراوە' : 'SECURE'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${showSettings ? 'text-orange-500 bg-orange-950/15' : 'text-zinc-500 hover:text-white'}`}
                >
                  <Settings size={14} />
                </button>
                {onClose && (
                  <button
                    onClick={() => {
                      playSyncChime();
                      onClose();
                    }}
                    className="text-zinc-500 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {showSettings && onChatWidthChange && (
              <div className="flex items-center gap-2 mt-2 px-1 py-1 border-t border-zinc-900 w-full select-none">
                <span className="text-[8px] font-black text-zinc-500 tracking-widest uppercase">
                  {(language === 'ku' || language === 'badini') ? 'قەبارەی چات:' : 'CHAT SIZE:'}
                </span>
                <input
                  type="range"
                  min="15"
                  max="50"
                  value={chatWidth}
                  onChange={(e) => onChatWidthChange(Number(e.target.value))}
                  className="flex-1 accent-orange-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                />
                <span className="text-[9px] font-black text-orange-500 font-mono leading-none">{chatWidth}%</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <div className="text-center py-2 shrink-0">
          <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] bg-zinc-900/50 border border-zinc-800 px-3 py-1 rounded-full">
            {(language === 'ku' || language === 'badini') ? 'ئاهەنگی تەماشا دەستیپێکرد' : 'CO-WATCH INITIATED'}
          </span>
        </div>

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.userId?.toLowerCase() === localUserId?.toLowerCase();

            const isHostUser = msg.sender === hostName;

            if (msg.isSystem) {
              // YouTube style "Super Chat" or "System highlight" sync alert!
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="w-full my-2 bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-500 p-3.5 rounded-2xl border border-orange-500/20 shadow-lg relative overflow-hidden flex flex-col gap-1 text-left select-none"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] font-[1000] tracking-[0.25em] text-white/80 uppercase">
                      {(language === 'ku' || language === 'badini') ? 'هاوکاتکردنی پەخش' : 'CINEMA SYNC ALERT'}
                    </span>
                    <Sparkles size={10} className="text-white animate-pulse" />
                  </div>
                  <span className="text-xs font-black text-white leading-relaxed">
                    🎉 {msg.text}
                  </span>
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                </motion.div>
              );
            }

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: isRtl ? 15 : -15 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 text-sm leading-relaxed p-1.5 rounded-xl hover:bg-white/[0.03] transition-colors text-left drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
              >
                <div className="flex items-baseline flex-wrap gap-1.5 w-full">
                  {/* Glowing moderator/vip badge */}
                  <span className={`text-[7px] font-[1000] uppercase tracking-widest px-1.5 py-0.5 rounded leading-none shrink-0 inline-flex items-center gap-0.5 ${
                    isHostUser
                      ? 'bg-red-600/20 text-red-500 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.15)]'
                      : 'bg-orange-600/20 text-orange-500 border border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.15)]'
                  }`}>
                    {isHostUser ? ((language === 'ku' || language === 'badini') ? 'پێشکەشکار' : 'HOST') : ((language === 'ku' || language === 'badini') ? 'ئەندام' : 'MEMBER')}
                  </span>

                  {/* Nickname with YouTube highlight */}
                  <span className={`font-black uppercase tracking-wider text-xs ${
                    isHostUser ? 'text-red-400' : 'text-orange-400'
                  }`}>
                    {msg.sender}:
                  </span>

                  {/* Message body or Sticker inline */}
                  {isSticker(msg.text) ? (
                    <div className="inline-block mt-1">
                      {renderSticker(getStickerName(msg.text))}
                    </div>
                  ) : isStipopSticker(msg.text) ? (
                    <div className="inline-block mt-1">
                      <img 
                        src={getStipopStickerUrl(msg.text)} 
                        alt="Sticker" 
                        className="w-16 h-16 object-contain inline-block my-0.5 filter drop-shadow-md select-none align-middle cursor-pointer active:scale-95 transition-all" 
                      />
                    </div>
                  ) : (
                    <span className="text-zinc-200 font-bold break-all leading-relaxed select-text">
                      {renderMessageText(msg.text)}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Official Stipop SDK Sticker Drawer */}
      <AnimatePresence>
        {showStickers && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="absolute bottom-20 left-2 right-2 z-50 rounded-[1.75rem] overflow-hidden shadow-2xl border border-zinc-800"
          >
            {/* Header row */}
            <div className="flex justify-between items-center px-3 py-2 bg-zinc-950/98 border-b border-zinc-800/60">
              <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-1.5">
                <Sparkles size={9} className="text-orange-500" />
                {(language === 'ku' || language === 'badini') ? 'ستیکەرەکانی ئاهەنگ' : 'STIPOP STICKERS'}
              </span>
              <button
                type="button"
                onClick={() => setShowStickers(false)}
                className="text-zinc-500 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={12} />
              </button>
            </div>

            {/* Stipop SDK SearchComponent — handles auth, search, pagination, grid natively */}
            <div className="stipop-sdk-wrapper" dir="ltr">
              {stickerError ? (
                <div className="flex flex-col items-center justify-center p-6 text-center bg-zinc-950/80 rounded-[1.25rem] border border-zinc-800 m-2 h-[220px]">
                  <AlertTriangle className="text-orange-500 mb-3 animate-pulse" size={24} />
                  <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-2">
                    {(language === 'ku' || language === 'badini') ? 'ستیکەرەکان بەردەست نین' : 'Stickers Unavailable'}
                  </p>
                  <p className="text-[8px] font-bold text-zinc-500 leading-relaxed max-w-[200px] uppercase">
                    {(language === 'ku' || language === 'badini')
                      ? 'تکایە دڵنیابەرەوە کە کلیلی API لە فایلی کۆنفیگ بە شێوەیەکی دروست دانراوە.' 
                      : 'Please verify that your Stipop API Key is correctly configured in your Dashboard.'}
                  </p>
                </div>
              ) : (
                <StickerErrorBoundary language={language}>
                  <SearchComponent
                    params={{
                      apikey: STIPOP_API_KEY,
                      userId: localUserId || 'flkrd-guest',
                      lang: (language === 'ku' || language === 'badini') ? 'ar' : 'en',
                      countryCode: (language === 'ku' || language === 'badini') ? 'IQ' : 'US',
                      limit: 50,
                    }}
                    mainLanguage={(language === 'ku' || language === 'badini') ? 'ar' : 'en'}
                    size={{ width: undefined, height: 220, imgSize: 80 }}
                    backgroundColor="#09090b"
                    column={4}
                    scroll={true}
                    scrollHover="#f97316"
                    preview={false}
                    loadingColor="#f97316"
                    shadow="none"
                    border={{
                      border: 'none',
                      radius: { all: 0 },
                    }}
                    input={{
                      border: '1px solid #27272a',
                      radius: 12,
                      backgroundColor: '#18181b',
                      color: '#ffffff',
                      width: undefined,
                      height: 34,
                      focus: '#f97316',
                      search: (language === 'ku' || language === 'badini') ? 'گەڕان...' : 'Search stickers...',
                    }}
                    stickerClick={(sticker: any) => {
                      // SDK passes the sticker object — url is the image URL
                      const imgUrl = sticker?.url || sticker?.imgUrl || sticker?.stickerImg || sticker?.img || '';
                      if (imgUrl) {
                        handleSendStipopSticker(imgUrl);
                      }
                    }}
                  />
                </StickerErrorBoundary>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Tray */}
      <AnimatePresence>
        {showControls && (
          <motion.form
            onSubmit={handleSendMessage}
            initial={{ opacity: 0, y: 15, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 15, height: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="p-4 bg-transparent shrink-0 relative overflow-hidden w-full select-none"
          >
            <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-1.5 focus-within:border-orange-600/50 transition-colors">
              <button
                type="button"
                onClick={() => {
                  playSyncChime();
                  setShowStickers(!showStickers);
                }}
                className={`p-2.5 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white transition-all active:scale-95 shrink-0 cursor-pointer ${showStickers ? 'text-orange-500' : 'text-zinc-400'}`}
              >
                <Smile size={16} />
              </button>
              
              <input
                type="text"
                placeholder={(language === 'ku' || language === 'badini') ? 'نامەیەک بنووسە...' : 'Type a message...'}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                disabled={sending}
                className="flex-1 bg-transparent text-sm text-white px-2 py-2 outline-none font-bold placeholder-zinc-500 min-w-0"
              />
              
              <button
                type="submit"
                disabled={!inputMessage.trim() || sending}
                className="w-10 h-10 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:hover:bg-orange-600 text-white flex items-center justify-center transition-all shadow-lg active:scale-95 shrink-0 cursor-pointer"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};
