import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sparkles, Crown, X, Mail, Calendar, Award, Star, Zap, CheckCircle2 } from 'lucide-react';
import Portal from './Portal';

export type AvatarEffectType = 'creator-ceo-aura' | 'cosmic-pulsar' | 'cyber-glitch' | 'ruby-phoenix' | 'quantum-vortex' | 'emerald-shield' | 'none';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    name: string;
    email?: string;
    avatarUrl?: string | null;
    avatarEffect?: AvatarEffectType;
    role?: string;
    joinedDate?: string;
    bio?: string;
  } | null;
}

// ── Avatar Effect Component ──────────────────────────────────────────────────
export const AvatarEffectContainer: React.FC<{
  url?: string | null;
  name: string;
  effect?: AvatarEffectType;
  email?: string;
  size?: number;
  className?: string;
}> = ({ url, name, effect, email, size = 64, className = '' }) => {
  const isCreator = email?.toLowerCase() === 'flkrdstudio@gmail.com' || name.toLowerCase().includes('zana faroq') || name.toLowerCase().includes('zana barzani');
  const activeEffect: AvatarEffectType = isCreator ? 'creator-ceo-aura' : (effect || 'none');

  const initials = name?.[0]?.toUpperCase() || '?';

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size }}>
      {/* 👑 SPECIAL CREATOR / CEO CROWN */}
      {activeEffect === 'creator-ceo-aura' && (
        <motion.div
          initial={{ y: -6, opacity: 0 }}
          animate={{ y: [ -6, -10, -6 ], opacity: 1 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-6 z-30 flex flex-col items-center pointer-events-none drop-shadow-[0_0_12px_rgba(234,179,8,0.9)]"
        >
          <Crown size={size * 0.42} className="text-amber-400 fill-amber-300 animate-pulse" />
        </motion.div>
      )}

      {/* 🌟 ANIMATED BORDER EFFECTS */}
      {activeEffect === 'creator-ceo-aura' && (
        <>
          {/* Holographic Glowing Outer Ring */}
          <div 
            className="absolute -inset-2.5 rounded-full z-10 pointer-events-none animate-[spin_5s_linear_infinite]"
            style={{
              background: 'conic-gradient(from 0deg, #eab308, #ef4444, #ec4899, #8b5cf6, #3b82f6, #10b981, #eab308)',
              filter: 'blur(3px)',
              opacity: 0.9,
            }}
          />
          <div 
            className="absolute -inset-2 rounded-full z-10 pointer-events-none animate-[spin_3s_linear_infinite_reverse]"
            style={{
              background: 'conic-gradient(from 180deg, #eab308, #ffffff, #ef4444, #eab308)',
              opacity: 0.85,
            }}
          />
        </>
      )}

      {activeEffect === 'cosmic-pulsar' && (
        <div 
          className="absolute -inset-2 rounded-full z-10 pointer-events-none animate-[spin_4s_linear_infinite]"
          style={{
            background: 'conic-gradient(from 0deg, #ec4899, #06b6d4, #3b82f6, #ec4899)',
            filter: 'blur(2px)',
          }}
        />
      )}

      {activeEffect === 'cyber-glitch' && (
        <div 
          className="absolute -inset-2 rounded-full z-10 pointer-events-none animate-[spin_3s_linear_infinite_reverse]"
          style={{
            background: 'conic-gradient(from 0deg, #10b981, #eab308, #06b6d4, #10b981)',
            filter: 'blur(2px)',
          }}
        />
      )}

      {activeEffect === 'ruby-phoenix' && (
        <div 
          className="absolute -inset-2 rounded-full z-10 pointer-events-none animate-[pulse_1.5s_infinite]"
          style={{
            background: 'radial-gradient(circle, rgba(239,68,68,0.8) 0%, rgba(234,179,8,0.6) 70%, transparent 100%)',
            filter: 'blur(4px)',
          }}
        />
      )}

      {activeEffect === 'quantum-vortex' && (
        <div 
          className="absolute -inset-2 rounded-full z-10 pointer-events-none animate-[spin_6s_linear_infinite]"
          style={{
            background: 'conic-gradient(from 0deg, #8b5cf6, #6366f1, #3b82f6, #8b5cf6)',
            filter: 'blur(2.5px)',
          }}
        />
      )}

      {activeEffect === 'emerald-shield' && (
        <div 
          className="absolute -inset-2 rounded-full z-10 pointer-events-none animate-[pulse_2s_infinite]"
          style={{
            background: 'conic-gradient(from 0deg, #10b981, #84cc16, #06b6d4, #10b981)',
            filter: 'blur(2px)',
          }}
        />
      )}

      {/* AVATAR IMAGE / INITIALS INNER CONTAINER */}
      <div 
        className="relative z-20 rounded-full overflow-hidden border-2 border-white/20 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black w-full h-full shadow-2xl"
      >
        {url ? (
          <img src={url} alt={name} className="w-full h-full object-cover rounded-full select-none" />
        ) : (
          <span className="font-black text-white uppercase select-none" style={{ fontSize: size * 0.38 }}>
            {initials}
          </span>
        )}
      </div>
    </div>
  );
};

// ── User Profile Nitro Modal ─────────────────────────────────────────────────
const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, user }) => {
  if (!isOpen || !user) return null;

  const isCreator = user.email?.toLowerCase() === 'flkrdstudio@gmail.com' || user.name.toLowerCase().includes('zana faroq') || user.name.toLowerCase().includes('zana barzani');
  const effect: AvatarEffectType = isCreator ? 'creator-ceo-aura' : (user.avatarEffect || 'none');

  return (
    <Portal id="user-profile-modal-portal">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-[32px] overflow-hidden border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.85)] bg-zinc-950 text-white font-sans"
            style={{
              fontFamily: "'Zain', 'Outfit', 'Inter', sans-serif"
            }}
          >
            {/* Top Banner Background */}
            <div 
              className="w-full h-32 relative overflow-hidden bg-gradient-to-r from-red-600 via-purple-700 to-indigo-900"
            >
              {isCreator && (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(234,179,8,0.3),transparent_70%)] animate-pulse" />
              )}
              <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

              <button
                onClick={onClose}
                className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white transition-all border border-white/10"
              >
                <X size={16} />
              </button>
            </div>

            {/* Avatar Header Row */}
            <div className="relative px-6 pt-0 pb-6 flex flex-col items-start">
              <div className="absolute -top-12 left-6 z-20">
                <AvatarEffectContainer
                  url={user.avatarUrl}
                  name={user.name}
                  effect={effect}
                  email={user.email}
                  size={88}
                />
              </div>

              {/* Badges Pill Row */}
              <div className="w-full flex justify-end gap-1.5 pt-3 mb-4 flex-wrap">
                {isCreator ? (
                  <>
                    <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[9px] font-[1000] uppercase tracking-wider flex items-center gap-1 shadow-[0_0_15px_rgba(234,179,8,0.4)]">
                      <Crown size={11} fill="currentColor" /> CREATOR & CEO
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 text-[8px] font-black uppercase tracking-wider flex items-center gap-1">
                      <Zap size={10} /> FOUNDER
                    </span>
                  </>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-zinc-300 text-[8px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Shield size={10} /> VIP MEMBER
                  </span>
                )}
              </div>

              {/* User Identity Info */}
              <div className="flex flex-col gap-1 w-full text-left">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-[1000] tracking-tight text-white uppercase italic">
                    {user.name}
                  </h2>
                  {isCreator && <CheckCircle2 size={16} className="text-amber-400 fill-amber-400/20" />}
                </div>

                {user.email && (
                  <span className="text-[11px] text-zinc-400 font-mono font-medium flex items-center gap-1.5">
                    <Mail size={12} className="text-zinc-500" /> {user.email}
                  </span>
                )}
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-white/10 my-4" />

              {/* Custom Bio Section */}
              <div className="w-full flex flex-col gap-1.5 text-left bg-white/[0.03] border border-white/5 p-3.5 rounded-2xl">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">ABOUT USER</span>
                <p className="text-xs text-zinc-200 leading-relaxed font-semibold">
                  {isCreator 
                    ? '🛠️ Lead Developer, Creator & Founder of FLKRD MOVIES. Building next-gen cinema experiences.'
                    : (user.bio || 'FLKRD Premium Cinema Enthusiast. Watching high quality movies & TV series live.')}
                </p>
              </div>

              {/* Stats & Footer info */}
              <div className="grid grid-cols-2 gap-2.5 w-full mt-4">
                <div className="bg-white/[0.03] border border-white/5 p-3 rounded-2xl flex flex-col gap-1 text-left">
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                    <Star size={10} className="text-amber-400" /> STATUS
                  </span>
                  <span className="text-xs font-black text-amber-400 uppercase">
                    {isCreator ? 'OWNER / ADMIN' : 'VERIFIED PRO'}
                  </span>
                </div>

                <div className="bg-white/[0.03] border border-white/5 p-3 rounded-2xl flex flex-col gap-1 text-left">
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                    <Award size={10} className="text-red-400" /> ACCESS
                  </span>
                  <span className="text-xs font-black text-white uppercase">UNLIMITED 4K</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
};

export default UserProfileModal;
