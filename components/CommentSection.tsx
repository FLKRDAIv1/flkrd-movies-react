import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, CornerDownLeft, Trash2, Send, Lock, User } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';

import UserProfileModal, { AvatarEffectContainer, AvatarEffectType } from './UserProfileModal';

interface Comment {
  id: string;
  created_at: string;
  movie_id: string;
  media_type: string;
  user_id: string;
  user_name: string;
  user_email: string;
  avatar_url: string | null;
  content: string;
  parent_id: string | null;
}

interface CommentSectionProps {
  movieId: string | number;
  mediaType: 'movie' | 'tv' | 'dubbed';
}

const CommentSection: React.FC<CommentSectionProps> = ({ movieId, mediaType }) => {
  const cleanId = String(movieId).replace('custom_', '');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { addNotification } = useNotification();

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Profile Modal State
  const [selectedUserModal, setSelectedUserModal] = useState<{
    name: string;
    email?: string;
    avatarUrl?: string | null;
    avatarEffect?: AvatarEffectType;
  } | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Current user's avatar from localStorage/sessionStorage or Supabase Auth metadata
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('flkrd_avatar_url') || sessionStorage.getItem('flkrd_avatar_url') || user?.user_metadata?.avatar_url || null;
    }
    return user?.user_metadata?.avatar_url || null;
  });

  const myAvatarUrl = currentAvatarUrl || user?.user_metadata?.avatar_url || null;
  const myName = user?.user_metadata?.user_name || user?.email?.split('@')[0] || 'Anonymous';

  useEffect(() => {
    const handleAvatarUpdate = () => {
      const updated = localStorage.getItem('flkrd_avatar_url') || sessionStorage.getItem('flkrd_avatar_url') || user?.user_metadata?.avatar_url || null;
      setCurrentAvatarUrl(updated);
    };

    window.addEventListener('storage', handleAvatarUpdate);
    window.addEventListener('flkrd-avatar-changed', handleAvatarUpdate);
    return () => {
      window.removeEventListener('storage', handleAvatarUpdate);
      window.removeEventListener('flkrd-avatar-changed', handleAvatarUpdate);
    };
  }, [user]);

  // Fetch comments
  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('movie_id', cleanId)
        .eq('media_type', mediaType)
        .order('created_at', { ascending: true });
      if (!error && data) setComments(data as Comment[]);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel(`comments_sync_${cleanId}_${mediaType}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `movie_id=eq.${cleanId}` },
        () => { fetchComments(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [cleanId, mediaType]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('comments').insert([{
        movie_id: cleanId,
        media_type: mediaType,
        user_id: user.id,
        user_name: myName,
        user_email: user.email,
        avatar_url: myAvatarUrl,
        content: newComment.trim(),
        parent_id: null,
      }]);
      if (error) throw error;
      setNewComment('');
      addNotification({ type: 'success', title: 'کۆمێنت نێردرا', message: 'کۆمێنتەکەت بە سەرکەوتوویی زیاد کرا.' });
      fetchComments();
    } catch (err: any) {
      addNotification({ type: 'error', title: 'هەڵە', message: err.message || 'نەتوانرا کۆمێنت بنێردرێت' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (parentId: string) => {
    if (!user || !replyContent.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('comments').insert([{
        movie_id: cleanId,
        media_type: mediaType,
        user_id: user.id,
        user_name: myName,
        user_email: user.email,
        avatar_url: myAvatarUrl,
        content: replyContent.trim(),
        parent_id: parentId,
      }]);
      if (error) throw error;
      setReplyContent('');
      setReplyToId(null);
      addNotification({ type: 'success', title: 'وەڵام نێردرا', message: 'وەڵامەکەت بە سەرکەوتوویی زیاد کرا.' });
      fetchComments();
    } catch (err: any) {
      addNotification({ type: 'error', title: 'هەڵە', message: err.message || 'نەتوانرا وەڵام بنێردرێت' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!window.confirm(language === 'ku' || language === 'badini' ? 'دڵنیای لە سڕینەوەی ئەم کۆمێنتە؟' : 'Delete this comment?')) return;
    try {
      setComments(prev => prev.filter(c => c.id !== id && c.parent_id !== id));
      const { error } = await supabase.from('comments').delete().eq('id', id);
      if (error) throw error;
      addNotification({ type: 'success', title: 'سڕایەوە', message: 'کۆمێنتەکە سڕایەوە.' });
      fetchComments();
    } catch (err: any) {
      fetchComments();
      addNotification({ type: 'error', title: 'هەڵە', message: err.message || 'سڕینەوە سەرکەوتوو نەبوو' });
    }
  };

  // Build tree structure
  const parents = comments.filter(c => !c.parent_id);
  const repliesGrouped = comments.reduce((acc: Record<string, Comment[]>, comment) => {
    if (comment.parent_id) {
      if (!acc[comment.parent_id]) acc[comment.parent_id] = [];
      acc[comment.parent_id].push(comment);
    }
    return acc;
  }, {});

  const isRTL = language === 'ku' || language === 'badini';

  return (
    <div className="w-full mt-12 bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6 md:p-8 space-y-6 text-left" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3">
        <MessageSquare className="text-brand w-5 h-5" />
        <h3 className="text-lg font-black uppercase italic tracking-wider text-white">
          {isRTL ? 'کۆمێنتەکان' : 'Comments & Discussion'} ({comments.length})
        </h3>
      </div>

      {/* ── Add Comment Input Box ── */}
      {user ? (
        <form onSubmit={handleSubmitComment} className="flex gap-3 items-end">
          {/* Current user avatar */}
          <AvatarEffectContainer url={myAvatarUrl} name={myName} email={user?.email} size={38} />
          <div className="flex-1 relative flex items-center">
            <textarea
              rows={2}
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder={isRTL ? 'کۆمێنتێک بنووسە...' : 'Share your thoughts about this...'}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-brand/40 focus:bg-white/[0.05] transition-all resize-none pr-12"
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="absolute bottom-3.5 right-3 w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center hover:bg-red-600 disabled:bg-white/5 disabled:text-gray-600 transition-all cursor-pointer"
            >
              <Send size={12} className={isRTL ? 'rotate-180' : ''} />
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400">
            <Lock size={16} />
          </div>
          <div className="text-center">
            <p className="text-xs font-black text-white uppercase tracking-wider">
              {isRTL ? 'بۆ نووسینی کۆمێنت پێویستە بچیتە ژوورەوە' : 'Authentication Required'}
            </p>
            <p className="text-[10px] text-gray-500 font-bold mt-0.5 uppercase">
              {isRTL ? 'تکایە ئەکاونتەکەت لود بکە یان تۆمارببە بۆ ئەوەی گفتوگۆ بکەیت' : 'Sign in to join the conversation'}
            </p>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="px-6 py-2.5 bg-brand text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-all shadow-[0_4px_15px_rgba(229,9,20,0.25)]"
          >
            {isRTL ? 'چوونەژوورەوە' : 'Sign In'}
          </button>
        </div>
      )}

      {/* ── Comments List ── */}
      <div className="space-y-6 mt-4">
        {parents.map(c => {
          const replies = repliesGrouped[c.id] || [];
          const isMyComment = user && (c.user_id === user.id || c.user_email === user.email);
          const effectiveAvatarUrl = isMyComment ? (myAvatarUrl || c.avatar_url) : c.avatar_url;
          return (
            <div key={c.id} className="space-y-4">
              {/* Parent Comment */}
              <div className="flex gap-3 items-start">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserModal({
                      name: c.user_name,
                      email: c.user_email,
                      avatarUrl: effectiveAvatarUrl
                    });
                    setIsProfileModalOpen(true);
                  }}
                  className="cursor-pointer transition-transform hover:scale-105 active:scale-95 text-left"
                >
                  <AvatarEffectContainer url={effectiveAvatarUrl} name={c.user_name} email={c.user_email} size={38} />
                </button>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUserModal({
                            name: c.user_name,
                            email: c.user_email,
                            avatarUrl: c.avatar_url
                          });
                          setIsProfileModalOpen(true);
                        }}
                        className="text-xs font-black text-white hover:text-red-400 transition-colors uppercase tracking-tight"
                      >
                        {c.user_name}
                      </button>
                      <span className="text-[9px] text-gray-500 font-bold ml-2 uppercase">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {user?.id === c.user_id && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-gray-600 hover:text-brand transition-colors p-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-gray-300 leading-relaxed">{c.content}</p>

                  {/* Actions */}
                  {user && (
                    <div className="flex items-center gap-4 pt-1">
                      <button
                        onClick={() => {
                          setReplyToId(replyToId === c.id ? null : c.id);
                          setReplyContent('');
                        }}
                        className="text-[9px] font-black uppercase tracking-widest text-brand hover:underline flex items-center gap-1"
                      >
                        <CornerDownLeft size={10} className={isRTL ? 'rotate-90' : ''} />
                        {isRTL ? 'وەڵامدانەوە' : 'Reply'}
                      </button>
                    </div>
                  )}

                  {/* Reply Input Box */}
                  <AnimatePresence>
                    {replyToId === c.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-3"
                      >
                        <div className="flex gap-2 items-center">
                          <AvatarEffectContainer url={myAvatarUrl} name={myName} email={user.email} size={30} />
                          <input
                            type="text"
                            value={replyContent}
                            onChange={e => setReplyContent(e.target.value)}
                            placeholder={isRTL ? 'وەڵام بنووسە...' : 'Write a reply...'}
                            className="flex-grow bg-white/[0.02] border border-white/10 rounded-xl py-2 px-3 text-[11px] font-bold text-white outline-none focus:border-brand/40 transition-all"
                          />
                          <button
                            onClick={() => handleSendReply(c.id)}
                            disabled={submitting || !replyContent.trim()}
                            className="px-4 py-2 bg-brand text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isRTL ? 'نێردن' : 'Reply'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Replies (Nested 1-level) */}
              {replies.length > 0 && (
                <div className={`space-y-4 ${isRTL ? 'mr-10 border-r-2' : 'ml-10 border-l-2'} border-white/5 pr-4 pl-4`}>
                  {replies.map(r => {
                    const isMyReply = user && (r.user_id === user.id || r.user_email === user.email);
                    const effectiveReplyAvatarUrl = isMyReply ? (myAvatarUrl || r.avatar_url) : r.avatar_url;
                    return (
                      <div key={r.id} className="flex gap-3 items-start">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUserModal({
                              name: r.user_name,
                              email: r.user_email,
                              avatarUrl: effectiveReplyAvatarUrl
                            });
                            setIsProfileModalOpen(true);
                          }}
                          className="cursor-pointer transition-transform hover:scale-105 active:scale-95 text-left"
                        >
                          <AvatarEffectContainer url={effectiveReplyAvatarUrl} name={r.user_name} email={r.user_email} size={32} />
                        </button>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUserModal({
                                    name: r.user_name,
                                    email: r.user_email,
                                    avatarUrl: effectiveReplyAvatarUrl
                                  });
                                  setIsProfileModalOpen(true);
                                }}
                                className="text-xs font-black text-white hover:text-red-400 transition-colors uppercase tracking-tight"
                              >
                                {r.user_name}
                              </button>
                              <span className="text-[9px] text-gray-500 font-bold ml-2 uppercase">
                                {new Date(r.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {user?.id === r.user_id && (
                              <button
                                onClick={() => handleDeleteComment(r.id)}
                                className="text-gray-600 hover:text-brand transition-colors p-1"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] font-bold text-gray-300 leading-relaxed">{r.content}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        );
      })}

        {comments.length === 0 && !loading && (
          <p className="text-center text-[10px] text-gray-600 py-6 uppercase tracking-wider font-bold">
            {isRTL ? 'هیچ کۆمێنتێک نییە. یەکەم بەشداربوو بە!' : 'No comments yet. Be the first to share your thoughts!'}
          </p>
        )}
      </div>

      {/* Nitro Style User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={selectedUserModal}
      />
    </div>
  );
};

export default CommentSection;
