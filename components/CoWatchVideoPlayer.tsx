import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tv, Play, Pause, Shield, Sparkles, AlertCircle, Award, CheckCircle, Wifi, Server } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import { supabase } from '../utils/supabaseClient';
import { getSourceUrl, getRankedSources } from '../utils/playerSourceUtils';
import UniversalVideoPlayer from './UniversalVideoPlayer';
import PremiumVidLinkPlayer from './PremiumVidLinkPlayer';

const PremiumPlayer = PremiumVidLinkPlayer as any;

// Custom High-Fidelity Audio Synth Chime using Web Audio API for immersive, tactile feedback
let sharedAudioCtx: AudioContext | null = null;

const playSyncChime = (type: 'join' | 'sync' | 'error') => {
  try {
    if (!sharedAudioCtx) {
      sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioCtx = sharedAudioCtx;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    if (type === 'join') {
      // Warm Sub-bass chord note for cinematic depth (C4)
      const subOsc = audioCtx.createOscillator();
      const subGain = audioCtx.createGain();
      subOsc.connect(subGain);
      subGain.connect(audioCtx.destination);
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(261.63, audioCtx.currentTime);
      
      subGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      subGain.gain.exponentialRampToValueAtTime(0.7, audioCtx.currentTime + 0.1);
      subGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
      
      subOsc.start();
      subOsc.stop(audioCtx.currentTime + 1.2);

      // Glorious 3-note ascending chord (C5 - E5 - G5) with dual-harmonics (sine + triangle)
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          // Principal sine wave
          const oscSine = audioCtx.createOscillator();
          const gainSine = audioCtx.createGain();
          oscSine.connect(gainSine);
          gainSine.connect(audioCtx.destination);
          oscSine.type = 'sine';
          oscSine.frequency.setValueAtTime(freq, audioCtx.currentTime);
          
          gainSine.gain.setValueAtTime(0.001, audioCtx.currentTime);
          gainSine.gain.exponentialRampToValueAtTime(0.8, audioCtx.currentTime + 0.08);
          gainSine.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
          
          oscSine.start();
          oscSine.stop(audioCtx.currentTime + 0.8);

          // Warm harmonic triangle wave
          const oscTri = audioCtx.createOscillator();
          const gainTri = audioCtx.createGain();
          oscTri.connect(gainTri);
          gainTri.connect(audioCtx.destination);
          oscTri.type = 'triangle';
          oscTri.frequency.setValueAtTime(freq * 0.995, audioCtx.currentTime); // slight detune for chorus warmth
          
          gainTri.gain.setValueAtTime(0.001, audioCtx.currentTime);
          gainTri.gain.exponentialRampToValueAtTime(0.45, audioCtx.currentTime + 0.08);
          gainTri.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
          
          oscTri.start();
          oscTri.stop(audioCtx.currentTime + 0.8);
        }, idx * 150);
      });
    } else if (type === 'sync') {
      // Gentle, clean 2-note ascending chord (F5 - A5) with detuned Chorus
      const notes = [698.46, 880.00];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          const osc1 = audioCtx.createOscillator();
          const osc2 = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc1.type = 'sine';
          osc2.type = 'triangle';
          
          osc1.frequency.setValueAtTime(freq, audioCtx.currentTime);
          osc2.frequency.setValueAtTime(freq * 1.002, audioCtx.currentTime);
          
          gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.55, audioCtx.currentTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
          
          osc1.start();
          osc2.start();
          osc1.stop(audioCtx.currentTime + 0.5);
          osc2.stop(audioCtx.currentTime + 0.5);
        }, idx * 120);
      });
    } else if (type === 'error') {
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      
      osc1.frequency.setValueAtTime(120, audioCtx.currentTime);
      osc2.frequency.setValueAtTime(118, audioCtx.currentTime);
      
      gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.55, audioCtx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      
      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + 0.4);
      osc2.stop(audioCtx.currentTime + 0.4);
    }
  } catch (err) {
    console.warn('AudioContext not allowed or not supported yet:', err);
  }
};

interface CoWatchVideoPlayerProps {
  ticketId: string;
  movieId: string;
  movieTitle: string;
  isHost: boolean;
  localUserId: string;
  localUserName: string;
  partnerName: string;
  subtitleUrl?: string;
  imdbId?: string;
}

export const CoWatchVideoPlayer: React.FC<CoWatchVideoPlayerProps> = ({
  ticketId,
  movieId,
  movieTitle,
  isHost,
  localUserId,
  localUserName,
  partnerName,
  subtitleUrl,
  imdbId,
}) => {
  const { language } = useTranslation();
  const { accentColor } = useUI();
  const { addNotification } = useNotification();

  const [activeSource, setActiveSource] = useState('FLKRD SERVER');
  const [currentTime, setCurrentTime] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [isHostPaused, setIsHostPaused] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const [peerSyncTrigger, setPeerSyncTrigger] = useState<{ currentTime: number; paused: boolean; timestamp: number } | null>(null);

  const channelRef = useRef<any>(null);
  const lastBroadcastTimeRef = useRef<number>(0);
  const lastBroadcastPausedRef = useRef<boolean>(true);

  // Keep latest state in refs for realtime subscription callback to prevent infinite re-subscriptions
  const currentTimeRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(true);

  // Guard refs to block circular sync loops
  const isApplyingPeerSyncRef = useRef<boolean>(false);
  const lastPeerSyncTimeRef = useRef<number>(0);
  const lastPeerSyncPausedRef = useRef<boolean>(true);
  const lastPeerSyncTimestampRef = useRef<number>(0);
  const activeSourceRef = useRef<string>('FLKRD SERVER');

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    activeSourceRef.current = activeSource;
  }, [activeSource]);

  // 1. Establish Realtime Sync Channel (Bidirectional)
  useEffect(() => {
    if (!ticketId || !localUserId) return;

    const channel = supabase.channel(`room-${ticketId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    channel
      .on('broadcast', { event: 'sync' }, (response: any) => {
        // Disabled: Host & Guest watch party duration/server syncing is disabled so both remain completely free
        return;
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, localUserId, language, addNotification]);

  // 2. Broadcast Local Playback changes to Peer (Disabled - Independent Playback Mode)
  const broadcastSyncState = (paused: boolean, time: number, forceSeek: boolean = false) => {
    return;
  };

  const handlePlayerProgress = (data: any) => {
    const time = data.currentTime || 0;
    const isPlaybackPaused = data.event === 'pause' || data.paused === true;

    setCurrentTime(time);
    setIsPaused(isPlaybackPaused);
  };

  const handleEnded = async () => {
    setIsFinished(true);
    if (isHost) {
      try {
        // Set watch ticket status to finished in database
        await supabase
          .from('watch_tickets')
          .update({ status: 'finished' })
          .eq('id', ticketId);

        broadcastSyncState(true, currentTime, true);
      } catch (err) {
        console.error('Failed to update ticket status to finished:', err);
      }
    }
  };

    // Switch Stream Server dynamically at the current timestamp
  const handleServerSwitch = (serverName: string) => {
    if (serverName === activeSource) return;

    setActiveSource(serverName);
    activeSourceRef.current = serverName;

    // Increment key to force player remount
    setPlayerKey((prev) => prev + 1);

    // Play chime
    playSyncChime('sync');

    addNotification({
      type: 'success',
      title: language === 'ku' ? 'سێرڤەر گۆڕدرا' : 'Server Switched',
      message: language === 'ku'
        ? `سێرڤەری تەماشاکردن گۆڕدرا بۆ ${serverName}`
        : `Cinema server changed to ${serverName}`,
    });
  };

  // Render Co-Watching Video Player with bidirectional control
  const getPlayerComponent = () => {
    return activeSource === 'FLKRD SERVER 1' ? (
      <PremiumPlayer
        key={`${activeSource}-${playerKey}`}
        tmdbId={movieId}
        type="movie"
        title={movieTitle}
        initialProgress={currentTime}
        accentColor={accentColor}
        subtitleUrl={subtitleUrl}
        imdbId={imdbId}
        onProgress={handlePlayerProgress}
        peerSyncTrigger={peerSyncTrigger}
      />
    ) : (
      <UniversalVideoPlayer
        key={`${activeSource}-${playerKey}`}
        src={getSourceUrl(activeSource, movieId, 'movie', undefined, undefined, currentTime, accentColor, subtitleUrl)}
        accentColor={accentColor}
        language={language}
        onProgress={handlePlayerProgress}
        subtitleUrl={subtitleUrl}
        imdbId={imdbId}
        contentType="movie"
        title={movieTitle}
        peerSyncTrigger={peerSyncTrigger}
      />
    );
  };

  const rankedSources = getRankedSources(!!subtitleUrl);

  return (
    <div className="relative w-full h-full bg-[#060606] overflow-hidden rounded-[2rem] border border-white/5 flex flex-col items-stretch shadow-2xl">
      {/* Video Content */}
      <div className="flex-1 w-full relative group/player">
        {getPlayerComponent()}

        {/* Floating Glassmorphic Server Selector console overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-xl transition-all duration-500 transform translate-y-[-10px] opacity-0 pointer-events-none group-hover/player:opacity-100 group-hover/player:translate-y-0 group-hover/player:pointer-events-auto">
          <div className="bg-[#050505]/65 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3 text-white">
            
            {/* Sync connection status */}
            <div className="flex items-center gap-2">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  {language === 'ku' ? 'دۆخی هۆڵ' : 'THEATRE STATUS'}
                </span>
                <span className="text-[10px] font-bold text-white uppercase tracking-tight">
                  {language === 'ku' ? 'تەلار کراوەیە و چات چالاکە' : 'THEATRE OPEN & CHAT ACTIVE'}
                </span>
              </div>
            </div>

            {/* Server Selector Ribbon */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0 custom-scrollbar">
              {rankedSources.slice(0, 4).map((source) => {
                const isActive = source.name === activeSource;
                return (
                  <button
                    key={source.name}
                    onClick={() => handleServerSwitch(source.name)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 border relative shrink-0 active:scale-95 ${
                      isActive
                        ? 'bg-orange-600/20 border-orange-500 text-orange-500 shadow-[0_0_12px_rgba(234,88,12,0.2)]'
                        : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    <Server size={10} />
                    <span>{source.name.replace('FLKRD ', '')}</span>
                    {source.badge === 'ku' && (
                      <span className="flex items-center gap-0.5 bg-blue-600 text-white px-1.5 py-0.5 rounded font-black text-[6px] tracking-tight uppercase scale-90 shadow-md shrink-0">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-white shrink-0">
                          <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.941.1-1.358.275C14.77 2.515 13.512 1.5 12 1.5s-2.77 1.015-3.372 2.285c-.417-.175-.878-.275-1.358-.275-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .941-.1 1.358-.275.602 1.27 1.86 2.285 3.372 2.285s2.77-1.015 3.372-2.285c.417.175.878.275 1.358.275 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.5 4L6 12.5l1.4-1.4 2.6 2.6 6.6-6.6 1.4 1.4-8 8z" />
                        </svg>
                        <span>{language === 'ku' ? 'تەواو' : 'VERIFIED'}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

          </div>
        </div>

        {/* Sync Status overlays */}
        <AnimatePresence>

          {isFinished && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-2xl p-8 text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="w-24 h-24 rounded-full bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-500 mb-6 relative"
              >
                <Tv size={40} />
                <div className="absolute inset-0 bg-orange-500/5 blur-xl rounded-full" />
              </motion.div>
              <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-white mb-3">
                {language === 'ku' ? 'فیلمەکە کۆتایی هات!' : 'CINEMA TICKET REDEEMED'}
              </h2>
              <p className="text-zinc-400 max-w-md font-bold text-xs uppercase tracking-widest mb-8 leading-relaxed">
                {language === 'ku'
                  ? 'ئەم ئاهەنگی تەماشا کردنە بە سەرکەوتوویی تەواو بوو. سوپاس بۆ بەکارهێنانی خزمەتگوزارییەکانمان!'
                  : 'This synchronized viewing party has concluded. Thank you for sharing the magic of cinema!'}
              </p>
              <div className="flex items-center gap-2 bg-orange-600/15 border border-orange-500/30 px-5 py-2 rounded-2xl shadow-xl">
                <Award size={14} className="text-orange-500" />
                <span className="text-[10px] font-black uppercase text-orange-500 tracking-widest">
                  {language === 'ku' ? 'فیلمەکە تەواو بوو' : 'PARTY FINISHED'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
