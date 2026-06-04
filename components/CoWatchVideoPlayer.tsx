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
  contentType?: 'movie' | 'tv';
  season?: number;
  episode?: number;
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
  contentType,
  season,
  episode,
}) => {
  const { language } = useTranslation();
  const { accentColor } = useUI();
  const { addNotification } = useNotification();

  const getShortName = (fullName: string) => {
    if (fullName === 'FLKRD SERVER') return (language === 'ku' || language === 'badini') ? 'سەرەکی' : 'Master';
    return fullName.replace('FLKRD SERVER ', 'S');
  };

  const [activeSource, setActiveSource] = useState('FLKRD SERVER');
  const [currentTime, setCurrentTime] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [isHostPaused, setIsHostPaused] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const [peerSyncTrigger, setPeerSyncTrigger] = useState<{ currentTime: number; paused: boolean; timestamp: number } | null>(null);
  const [showMobileConsole, setShowMobileConsole] = useState(false);

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

  // Broadcast status to room page header
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('cowatch-status-change', { detail: { paused: isPaused } }));
  }, [isPaused]);

  const handlePlayPauseToggle = useCallback(async () => {
    const nextPaused = !isPausedRef.current;
    setIsPaused(nextPaused);
    isPausedRef.current = nextPaused;

    // Apply to local player
    isApplyingPeerSyncRef.current = true;
    setPeerSyncTrigger({
      currentTime: currentTimeRef.current,
      paused: nextPaused,
      timestamp: Date.now()
    });

    // Broadcast to peer
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'sync',
        payload: {
          paused: nextPaused,
          currentTime: currentTimeRef.current,
          senderName: localUserName,
          timestamp: Date.now()
        }
      });
    }

    // Format time duration cleanly
    const formatTime = (secs: number) => {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = Math.floor(secs % 60);
      return [h, m, s]
        .map(v => v < 10 ? '0' + v : v)
        .filter((v, i) => v !== '00' || i > 0)
        .join(':');
    };
    const timeStr = formatTime(currentTimeRef.current);

    // Post notice to chat
    const actionNotice = JSON.stringify({
      sender: 'System',
      text: nextPaused
        ? (language === 'ku' || language === 'badini')
          ? `⏸ ${localUserName} پەخشی ژوورەکەی ڕاگرت لە [${timeStr}]`
          : `⏸ ${localUserName} paused the video at [${timeStr}]`
        : (language === 'ku' || language === 'badini')
          ? `▶ ${localUserName} پەخشی ژوورەکەی دەستپێکردەوە لە [${timeStr}]`
          : `▶ ${localUserName} resumed the video at [${timeStr}]`,
      isSystem: true
    });

    try {
      await supabase.from('room_messages').insert({
        ticket_id: ticketId,
        user_id: localUserId,
        message: actionNotice
      });
    } catch (err) {
      console.warn('Failed to insert play/pause notice:', err);
    }
  }, [ticketId, localUserId, localUserName, language]);

  // Listen to cowatch-toggle-play event
  useEffect(() => {
    const handleToggle = () => {
      handlePlayPauseToggle();
    };
    window.addEventListener('cowatch-toggle-play', handleToggle);
    return () => window.removeEventListener('cowatch-toggle-play', handleToggle);
  }, [handlePlayPauseToggle]);

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
        const { paused, currentTime: peerTime, senderName } = response.payload;
        
        isApplyingPeerSyncRef.current = true;
        setPeerSyncTrigger({
          currentTime: peerTime,
          paused,
          timestamp: Date.now()
        });

        playSyncChime('sync');

        addNotification({
          type: 'info',
          title: (language === 'ku' || language === 'badini') ? 'هاوکات کرا' : 'Playback Synced',
          message: (language === 'ku' || language === 'badini')
            ? `${senderName} پەخشی هۆڵەکەی هاوکات کردەوە!`
            : `${senderName} synchronized the cinema screen!`,
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, localUserId, language, addNotification]);

  // 1b. Listen to local clickable timestamp/slash command seek requests
  useEffect(() => {
    const handleCowatchSeek = async (e: Event) => {
      const customEvent = e as CustomEvent<{ seconds: number }>;
      const targetSeconds = customEvent.detail.seconds;
      if (typeof targetSeconds !== 'number') return;

      // Update local player trigger
      isApplyingPeerSyncRef.current = true;
      setPeerSyncTrigger({
        currentTime: targetSeconds,
        paused: isPausedRef.current,
        timestamp: Date.now()
      });

      // Play sync sound check locally
      playSyncChime('sync');

      // Broadcast sync payload to peer
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'sync',
          payload: {
            paused: isPausedRef.current,
            currentTime: targetSeconds,
            senderName: localUserName,
            timestamp: Date.now()
          }
        });
      }

      // Format time duration cleanly (e.g. 01:23:45)
      const formatTime = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);
        return [h, m, s]
          .map(v => v < 10 ? '0' + v : v)
          .filter((v, i) => v !== '00' || i > 0)
          .join(':');
      };
      const timeStr = formatTime(targetSeconds);

      // Post audit message to Supabase chat
      const syncNotice = JSON.stringify({
        sender: 'System',
        text: (language === 'ku' || language === 'badini')
          ? `🔴 ${localUserName} پەخشی ژوورەکەی گواستەوە بۆ [${timeStr}]!`
          : `🔴 ${localUserName} seeked the playback to [${timeStr}]!`,
        isSystem: true
      });

      try {
        await supabase.from('room_messages').insert({
          ticket_id: ticketId,
          user_id: localUserId,
          message: syncNotice
        });
      } catch (err) {
        console.warn('Failed to insert dynamic seek notice:', err);
      }
    };

    window.addEventListener('cowatch-seek', handleCowatchSeek);
    return () => {
      window.removeEventListener('cowatch-seek', handleCowatchSeek);
    };
  }, [ticketId, localUserId, localUserName, language]);

  // 2. Broadcast Local Playback changes to Peer (Explicit Sync Triggered)
  const triggerRoomManualSync = async () => {
    if (!channelRef.current || syncing) return;
    setSyncing(true);

    try {
      playSyncChime('sync');

      // 1. Broadcast sync payload
      channelRef.current.send({
        type: 'broadcast',
        event: 'sync',
        payload: {
          paused: isPausedRef.current,
          currentTime: currentTimeRef.current,
          senderName: localUserName,
          timestamp: Date.now()
        }
      });

      // 2. Pretty print seek duration
      const formatTime = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);
        return [h, m, s]
          .map(v => v < 10 ? '0' + v : v)
          .filter((v, i) => v !== '00' || i > 0)
          .join(':');
      };
      
      const timeStr = formatTime(currentTimeRef.current);

      // 3. Post dynamic system/audit notice to supabase room messages
      const syncNotice = JSON.stringify({
        sender: 'System',
        text: (language === 'ku' || language === 'badini')
          ? `🔴 ${localUserName} پەخشی ژوورەکەی هاوکات کرد بۆ کاتی [${timeStr}]!`
          : `🔴 ${localUserName} synchronized the room playback to [${timeStr}]!`,
        isSystem: true
      });

      await supabase.from('room_messages').insert({
        ticket_id: ticketId,
        user_id: localUserId,
        message: syncNotice
      });

      addNotification({
        type: 'success',
        title: (language === 'ku' || language === 'badini') ? 'هاوکات کرا' : 'Room Synced',
        message: (language === 'ku' || language === 'badini')
          ? `هۆڵەکەت هاوکات کرد بۆ کاتی [${timeStr}]!`
          : `You successfully synchronized the room to [${timeStr}]!`,
      });
    } catch (err) {
      console.error('Failed to trigger room sync:', err);
    } finally {
      setTimeout(() => setSyncing(false), 800);
    }
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

        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'sync',
            payload: {
              paused: true,
              currentTime,
              senderName: localUserName,
              timestamp: Date.now()
            }
          });
        }
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
      title: (language === 'ku' || language === 'badini') ? 'سێرڤەر گۆڕدرا' : 'Server Switched',
      message: (language === 'ku' || language === 'badini')
        ? `سێرڤەری تەماشاکردن گۆڕدرا بۆ ${serverName}`
        : `Cinema server changed to ${serverName}`,
    });
  };

  // Render Co-Watching Video Player with bidirectional control
  const getPlayerComponent = () => {
    const type = contentType || 'movie';
    return activeSource === 'FLKRD SERVER 1' ? (
      <PremiumPlayer
        key={`${activeSource}-${playerKey}`}
        tmdbId={movieId}
        type={type}
        season={season}
        episode={episode}
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
        src={getSourceUrl(activeSource, movieId, type, season, episode, currentTime, accentColor, subtitleUrl)}
        accentColor={accentColor}
        language={language}
        onProgress={handlePlayerProgress}
        subtitleUrl={subtitleUrl}
        imdbId={imdbId}
        contentType={type}
        season={season}
        episode={episode}
        title={movieTitle}
        peerSyncTrigger={peerSyncTrigger}
      />
    );
  };

  const rankedSources = getRankedSources(!!subtitleUrl);

  return (
    <div 
      onClick={() => setShowMobileConsole(prev => !prev)}
      className="relative w-full h-full bg-[#060606] overflow-hidden rounded-[2rem] border border-white/5 flex flex-col items-stretch shadow-2xl cursor-pointer"
    >
      {/* Video Content */}
      <div className="flex-1 w-full relative group/player">
        {getPlayerComponent()}

        {/* Floating Glassmorphic Server Selector console overlay */}
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{ top: 'var(--player-console-top)' }}
          className={`absolute left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-xl transition-all duration-500 transform ${
            showMobileConsole 
              ? 'translate-y-0 opacity-100 pointer-events-auto' 
              : 'translate-y-[-10px] opacity-0 pointer-events-none'
          } sm:translate-y-[-10px] sm:opacity-0 sm:pointer-events-none sm:group-hover/player:opacity-100 sm:group-hover/player:translate-y-0 sm:group-hover/player:pointer-events-auto`}
        >
          <div className="bg-[#050505]/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-2.5 sm:p-3 shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 text-white">
            
            {/* Top Row on mobile: Status + Controls */}
            <div className="flex items-center justify-between sm:justify-start gap-4">
              {/* Sync connection status */}
              <div className="flex items-center gap-2">
                <div className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="hidden sm:inline text-[8px] font-black uppercase tracking-widest text-zinc-400">
                    {(language === 'ku' || language === 'badini') ? 'دۆخی هۆڵ' : 'THEATRE STATUS'}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-white uppercase tracking-tight">
                    {(language === 'ku' || language === 'badini') ? 'چات چالاکە' : 'CHAT ACTIVE'}
                  </span>
                </div>
              </div>

              {/* Mobile Controls Row */}
              <div className="flex items-center gap-1.5">
                {/* Play/Pause Button (Mobile only) */}
                <button
                  onClick={handlePlayPauseToggle}
                  className="sm:hidden px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-1.5 border border-white/10 bg-white/5 hover:bg-white/10 text-white active:scale-95 cursor-pointer"
                >
                  {isPaused ? <Play size={10} className="fill-white text-white" /> : <Pause size={10} className="fill-white text-white" />}
                  <span>{isPaused ? ((language === 'ku' || language === 'badini') ? 'پەخش' : 'PLAY') : ((language === 'ku' || language === 'badini') ? 'ڕاگرتن' : 'PAUSE')}</span>
                </button>

                {/* Sync Playback Action Button (Mobile only) */}
                <button
                  onClick={triggerRoomManualSync}
                  disabled={syncing}
                  className="sm:hidden px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-1.5 border bg-orange-600/10 border-orange-500/30 hover:border-orange-500 text-orange-500 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles size={10} className={syncing ? "animate-spin" : "animate-pulse"} />
                  <span>{(language === 'ku' || language === 'badini') ? 'هاوکات' : 'SYNC'}</span>
                </button>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              {/* Play/Pause Button (Desktop only) */}
              <button
                onClick={handlePlayPauseToggle}
                className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white active:scale-95 cursor-pointer shrink-0"
              >
                {isPaused ? <Play size={11} className="fill-white text-white" /> : <Pause size={11} className="fill-white text-white" />}
                <span>{isPaused ? ((language === 'ku' || language === 'badini') ? 'دەستپێکردن' : 'PLAY') : ((language === 'ku' || language === 'badini') ? 'ڕاگرتن' : 'PAUSE')}</span>
              </button>

              {/* Sync Playback Action Button (Desktop only) */}
              <button
                onClick={triggerRoomManualSync}
                disabled={syncing}
                className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 border bg-orange-600/10 border-orange-500/30 hover:border-orange-500 hover:bg-orange-600 hover:text-white shadow-[0_0_20px_rgba(234,88,12,0.12)] hover:shadow-[0_0_25px_rgba(234,88,12,0.4)] text-orange-500 active:scale-95 cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Sparkles size={11} className={syncing ? "animate-spin" : "animate-pulse"} />
                <span>{(language === 'ku' || language === 'badini') ? 'هاوکاتکردنی پەخش' : 'SYNC PLAYBACK'}</span>
              </button>
            </div>

            {/* Server Selector Ribbon */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5 sm:pb-0 custom-scrollbar justify-center sm:justify-start">
              {rankedSources.slice(0, 4).map((source) => {
                const isActive = source.name === activeSource;
                return (
                  <button
                    key={source.name}
                    onClick={() => handleServerSwitch(source.name)}
                    className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1 sm:gap-1.5 border relative shrink-0 active:scale-95 ${
                      isActive
                        ? 'bg-orange-600/20 border-orange-500 text-orange-500 shadow-[0_0_12px_rgba(234,88,12,0.2)]'
                        : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    <Server size={9} className="sm:w-2.5 sm:h-2.5" />
                    <span className="hidden xs:inline">{source.name.replace('FLKRD ', '')}</span>
                    <span className="xs:hidden">{getShortName(source.name)}</span>
                    {source.badge === 'ku' && (
                      <span className="flex items-center gap-0.5 bg-blue-600 text-white px-1 py-0.5 rounded font-black text-[5px] sm:text-[6px] tracking-tight uppercase scale-90 shadow-md shrink-0">
                        <span>{(language === 'ku' || language === 'badini') ? 'کورد' : 'KU'}</span>
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
                {(language === 'ku' || language === 'badini') ? 'فیلمەکە کۆتایی هات!' : 'CINEMA TICKET REDEEMED'}
              </h2>
              <p className="text-zinc-400 max-w-md font-bold text-xs uppercase tracking-widest mb-8 leading-relaxed">
                {(language === 'ku' || language === 'badini')
                  ? 'ئەم ئاهەنگی تەماشا کردنە بە سەرکەوتوویی تەواو بوو. سوپاس بۆ بەکارهێنانی خزمەتگوزارییەکانمان!'
                  : 'This synchronized viewing party has concluded. Thank you for sharing the magic of cinema!'}
              </p>
              <div className="flex items-center gap-2 bg-orange-600/15 border border-orange-500/30 px-5 py-2 rounded-2xl shadow-xl">
                <Award size={14} className="text-orange-500" />
                <span className="text-[10px] font-black uppercase text-orange-500 tracking-widest">
                  {(language === 'ku' || language === 'badini') ? 'فیلمەکە تەواو بوو' : 'PARTY FINISHED'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
