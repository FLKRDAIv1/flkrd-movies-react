import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, Shield, Sparkles } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { useTranslation } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';

interface WatchChatSidebarProps {
  ticketId: string;
  localUserId: string;
  localUserName: string;
  isHost: boolean;
  guestName: string;
  hostName: string;
}

interface MessageItem {
  id: string;
  userId: string;
  sender: string;
  text: string;
  createdAt: string;
  isSystem?: boolean;
}

export const WatchChatSidebar: React.FC<WatchChatSidebarProps> = ({
  ticketId,
  localUserId,
  localUserName,
  isHost,
  guestName,
  hostName,
}) => {
  const { language } = useTranslation();
  const { addNotification } = useNotification();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  }, [ticketId, localUserId, localUserName, isHost, guestName, hostName]);

  // 3. Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed || sending) return;

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
        title: language === 'ku' ? 'نامەکە نەنێردرا' : 'Send Failed',
        message: language === 'ku' ? 'کێشەیەک لە پەیوەندی هەیە.' : 'Connection failure in database relay.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/80 border-l border-zinc-900 backdrop-blur-2xl w-full">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-zinc-900/60 bg-black/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-orange-500" />
          <h3 className="text-xs font-black uppercase tracking-widest text-white italic">
            {language === 'ku' ? 'چاتی ڕاستەوخۆ' : 'PARTY CHAT'}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 bg-orange-600/10 border border-orange-500/20 px-2.5 py-1 rounded-full">
          <Shield size={10} className="text-orange-500" />
          <span className="text-[8px] font-black uppercase text-orange-500 tracking-wider">
            {language === 'ku' ? 'پارێزراوە' : 'SECURE NODE'}
          </span>
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <div className="text-center py-2 shrink-0">
          <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] bg-zinc-900/50 border border-zinc-800 px-3 py-1 rounded-full">
            {language === 'ku' ? 'ئاهەنگی تەماشا دەستیپێکرد' : 'CO-WATCH INITIATED'}
          </span>
        </div>

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.userId?.toLowerCase() === localUserId?.toLowerCase();

            if (msg.isSystem) {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center my-1"
                >
                  <span className="text-[9px] font-black text-orange-500/70 bg-orange-950/20 border border-orange-950/30 px-3 py-1 rounded-xl uppercase tracking-wider">
                    🎉 {msg.text}
                  </span>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                {/* Nickname */}
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1 px-1">
                  {msg.sender}
                </span>

                {/* Bubble */}
                <div
                  className={`px-4 py-2.5 rounded-[1.25rem] text-sm font-bold shadow-md break-all leading-relaxed ${
                    isMe
                      ? 'bg-orange-600 text-white rounded-tr-none'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Tray */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-900/60 bg-black/40 shrink-0">
        <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-1.5 focus-within:border-orange-600/50 transition-colors">
          <input
            type="text"
            placeholder={language === 'ku' ? 'نامەیەک بنووسە...' : 'Type a message...'}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={sending}
            className="flex-1 bg-transparent text-sm text-white px-3.5 py-2 outline-none font-bold placeholder-zinc-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || sending}
            className="w-10 h-10 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:hover:bg-orange-600 text-white flex items-center justify-center transition-all shadow-lg active:scale-95 shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};
