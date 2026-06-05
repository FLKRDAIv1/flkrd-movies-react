import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Tv, 
  Users, 
  Lock, 
  ArrowLeft, 
  Copy, 
  Check, 
  Share2, 
  Play, 
  Pause,
  LogOut,
  Sparkles, 
  ShieldAlert, 
  CheckCircle,
  Delete,
  Maximize2,
  MessageSquare,
  X
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { useLocalUser } from '../hooks/useLocalUser';
import { useTranslation } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { CoWatchVideoPlayer } from '../components/CoWatchVideoPlayer';
import { WatchChatSidebar } from '../components/WatchChatSidebar';
import { WatchPartyTicketModal } from '../components/WatchPartyTicketModal';
import Spinner from '../components/Spinner';
import { fetchData } from '../services/tmdbService';
import { API_KEY } from '../constants';

interface TicketRecord {
  id: string;
  movie_id: string;
  host_id: string;
  guest_id: string | null;
  pin_code: string;
  status: 'waiting' | 'active' | 'finished';
  created_at: string;
}

interface MovieDetails {
  id: number;
  title: string;
  poster_path: string;
  backdrop_path?: string;
  runtime?: number;
  vote_average?: number;
  release_date?: string;
}

// Custom High-Fidelity Audio Synth Chime using Web Audio API for immersive, tactile feedback
let sharedAudioCtx: AudioContext | null = null;

export const playSyncChime = (type: 'join' | 'sync' | 'error') => {
  try {
    if (!sharedAudioCtx) {
      sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioCtx = sharedAudioCtx;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Master compressor/limiter — prevents clipping and keeps everything cinema-quiet
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24, audioCtx.currentTime);
    compressor.knee.setValueAtTime(30, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(12, audioCtx.currentTime);
    compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
    compressor.release.setValueAtTime(0.25, audioCtx.currentTime);
    compressor.connect(audioCtx.destination);

    // Master volume — keep all sounds very subtle
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    masterGain.connect(compressor);

    if (type === 'join') {
      // Soft warm 3-note ascending arpeggio (C5 → E5 → G5)
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(masterGain);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.7);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.7);
        }, idx * 130);
      });
    } else if (type === 'sync') {
      // Gentle 2-note ping (F5 → A5) — very short and light
      const notes = [698.46, 880.00];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(masterGain);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.35);
        }, idx * 110);
      });
    } else if (type === 'error') {
      // Soft low thud — not jarring, just a subtle bump
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.04);
      gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    }
  } catch (err) {
    console.warn('AudioContext not allowed or not supported yet:', err);
  }
};


export default function WatchRoomPage() {
  const { ticket_id } = useParams<{ ticket_id: string }>();
  const navigate = useNavigate();
  
  const { language } = useTranslation();
  const { addNotification } = useNotification();
  const { localUserId, localUserName } = useLocalUser();

  const location = useLocation();

  // Page States — instantly hydrate from router state if available (no loading screen!)
  const [ticket, setTicket] = useState<TicketRecord | null>(() => location.state?.ticket || null);
  const [movie, setMovie] = useState<MovieDetails | null>(() => location.state?.movie || null);
  const [loading, setLoading] = useState(() => !(location.state?.ticket && location.state?.movie));
  const [error, setError] = useState<string | null>(null);
  const [roomFullError, setRoomFullError] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [playerPaused, setPlayerPaused] = useState(true);
  const [showHeader, setShowHeader] = useState(true);
  const headerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isChatOpenRef = useRef(true);

  const resetRoomHeaderTimer = useCallback(() => {
    setShowHeader(true);
    if (headerTimeoutRef.current) clearTimeout(headerTimeoutRef.current);
    headerTimeoutRef.current = setTimeout(() => {
      if (!isChatOpenRef.current) {
        setShowHeader(false);
      }
    }, 3500);
  }, []);

  // Keep header visible when chat is open, and restart timer when closed
  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
    if (isChatOpen) {
      // When chat is open, always show the header
      setShowHeader(true);
      if (headerTimeoutRef.current) clearTimeout(headerTimeoutRef.current);
    } else {
      resetRoomHeaderTimer();
    }
  }, [isChatOpen, resetRoomHeaderTimer]);

  // Cleanup header timeout on unmount
  useEffect(() => () => { if (headerTimeoutRef.current) clearTimeout(headerTimeoutRef.current); }, []);

  // Listen to cowatch-status-change event
  useEffect(() => {
    const handleStatus = (e: Event) => {
      const customEvent = e as CustomEvent<{ paused: boolean }>;
      setPlayerPaused(customEvent.detail.paused);
    };
    window.addEventListener('cowatch-status-change', handleStatus as EventListener);
    return () => window.removeEventListener('cowatch-status-change', handleStatus as EventListener);
  }, []);

  const [chatWidth, setChatWidth] = useState(() => {
    try {
      return Number(localStorage.getItem('flkrd-cowatch-chat-width')) || 22;
    } catch {
      return 22;
    }
  });

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const [season, setSeason] = useState<number | undefined>(() => {
    const t = location.state?.ticket;
    if (t && String(t.movie_id).startsWith('tv_')) {
      const cleanId = String(t.movie_id).replace('tv_', '');
      if (cleanId.includes('_s_')) {
        return parseInt(cleanId.split('_s_')[1].split('_e_')[0]) || 1;
      }
      if (cleanId.includes('_')) {
        return parseInt(cleanId.split('_')[1]) || 1;
      }
    }
    return undefined;
  });

  const [episode, setEpisode] = useState<number | undefined>(() => {
    const t = location.state?.ticket;
    if (t && String(t.movie_id).startsWith('tv_')) {
      const cleanId = String(t.movie_id).replace('tv_', '');
      if (cleanId.includes('_s_')) {
        return parseInt(cleanId.split('_s_')[1].split('_e_')[1]) || 1;
      }
      if (cleanId.includes('_')) {
        return parseInt(cleanId.split('_')[2]) || 1;
      }
    }
    return undefined;
  });

  // Guest PIN entry states
  const [pinVerified, setPinVerified] = useState(false);
  const [pinInputs, setPinInputs] = useState(['', '', '', '']);
  const [isShaking, setIsShaking] = useState(false);
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);

  // Transition States for Synchronized Room Entry
  const [isTransitioningToActive, setIsTransitioningToActive] = useState(false);
  const [activeRoomReady, setActiveRoomReady] = useState(false);

  // Spatial Navigation & Dynamic Nicknames Map
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];
  
  const presenceChannelRef = useRef<any>(null);

  // Determine user role
  const isHost = ticket ? localUserId?.toLowerCase() === ticket.host_id?.toLowerCase() : false;

  // Spatial Navigation & Dynamic Nicknames Map Helpers - Declared here at the top to prevent TDZ (Temporal Dead Zone) errors inside early return screens
  const getMemberName = (userId: string | null) => {
    if (!userId) return '';
    const lowerId = userId.toLowerCase();
    const matchKey = Object.keys(memberNames).find((k) => k.toLowerCase() === lowerId);
    return matchKey ? memberNames[matchKey] : '';
  };

  const hostName = ticket ? (getMemberName(ticket.host_id) || (isHost ? localUserName : ((language === 'ku' || language === 'badini') ? 'پێشکەشکار' : 'Host'))) : '';
  const guestName = ticket && ticket.guest_id ? (getMemberName(ticket.guest_id) || (!isHost ? localUserName : ((language === 'ku' || language === 'badini') ? 'میوان' : 'Guest'))) : '';

  // Helper: derive back-route from a ticket's movie_id
  const getBackRoute = (movieId: string) => {
    if (movieId.startsWith('tv_')) {
      let cleanId = movieId.replace('tv_', '');
      if (cleanId.includes('_s_')) {
        cleanId = cleanId.split('_s_')[0];
      } else if (cleanId.includes('_')) {
        cleanId = cleanId.split('_')[0];
      }
      return `/details/tv/${cleanId}`;
    }
    if (movieId.startsWith('custom_')) return `/dubbed-details/${movieId}`;
    return `/details/movie/${movieId}`;
  };

  // Helper: resolve any image — base64 data URI, full http URL, or TMDB relative path
  const getImageUrl = (path: string | null | undefined, size: 'w500' | 'w1280' = 'w1280'): string => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };


  // 1. Fetch Ticket details & register database realtime listener
  useEffect(() => {
    if (!ticket_id) return;

    // If we already have ticket + movie from router state, skip the initial fetch
    const alreadyHydrated = !!(location.state?.ticket && location.state?.movie);

    const fetchTicket = async () => {
      try {
        const { data, error: dbError } = await supabase
          .from('watch_tickets')
          .select('*')
          .eq('id', ticket_id)
          .single();

        if (dbError || !data) {
          throw new Error((language === 'ku' || language === 'badini') ? 'تیکت نەدۆزرایەوە' : 'Ticket not found');
        }

        const ticketData = data as TicketRecord;
        setTicket(ticketData);

        // Restore active room session if already active
        if (ticketData.status === 'active') {
          setActiveRoomReady(true);
          if (ticketData.guest_id?.toLowerCase() === localUserId?.toLowerCase()) {
            setPinVerified(true);
          }
        }

        const rawMovieId = String(ticketData.movie_id);
        let movieData: any = null;

        if (rawMovieId.startsWith('tv_')) {
          // TV Show: fetch /tv/{id}
          let cleanId = rawMovieId.replace('tv_', '');
          let seasonNum = 1;
          let episodeNum = 1;
          if (cleanId.includes('_s_')) {
            const parts = cleanId.split('_s_');
            cleanId = parts[0];
            const epParts = parts[1].split('_e_');
            seasonNum = parseInt(epParts[0]) || 1;
            episodeNum = parseInt(epParts[1]) || 1;
          } else if (cleanId.includes('_')) {
            const parts = cleanId.split('_');
            cleanId = parts[0];
            seasonNum = parseInt(parts[1]) || 1;
            episodeNum = parseInt(parts[2]) || 1;
          }
          setSeason(seasonNum);
          setEpisode(episodeNum);

          movieData = await fetchData(`/tv/${cleanId}?api_key=${API_KEY}&language=en-US`, language);
          if (movieData) {
            setMovie({
              id: movieData.id,
              title: movieData.name || movieData.title,
              poster_path: movieData.poster_path,
              backdrop_path: movieData.backdrop_path,
              runtime: movieData.episode_run_time?.[0],
              vote_average: movieData.vote_average,
              release_date: movieData.first_air_date
            });
          }
        } else if (rawMovieId.startsWith('custom_')) {
          // Dubbed Movie: fetch from Supabase dubbed_movies table
          const cleanId = rawMovieId.replace('custom_', '');
          const { data: dubData } = await supabase.from('dubbed_movies').select('*').eq('id', cleanId).single();
          if (dubData) {
            setMovie({
              id: dubData.id,
              title: dubData.title || dubData.kurdishTitle || 'Dubbed Movie',
              poster_path: dubData.imageBase64 || dubData.poster_path || '',
              backdrop_path: dubData.bannerBase64 || dubData.imageBase64 || '',
              vote_average: dubData.vote_average,
              release_date: dubData.created_at
            });
          }
        } else {
          // Standard movie
          movieData = await fetchData(`/movie/${rawMovieId}?api_key=${API_KEY}&language=en-US`, language);
          if (movieData) {
            setMovie({
              id: movieData.id,
              title: movieData.title,
              poster_path: movieData.poster_path,
              backdrop_path: movieData.backdrop_path,
              runtime: movieData.runtime,
              vote_average: movieData.vote_average,
              release_date: movieData.release_date
            });
          }
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load co-watch session.');
      } finally {
        setLoading(false);
      }
    };

    if (!alreadyHydrated) {
      fetchTicket();
    }

    // Polling fallback to retrieve the ticket state directly from DB
    const pollInterval = setInterval(async () => {
      try {
        const { data, error: pollError } = await supabase
          .from('watch_tickets')
          .select('*')
          .eq('id', ticket_id)
          .single();

        if (data && !pollError) {
          const updated = data as TicketRecord;
          setTicket((prev) => {
            if (!prev) return updated;
            if (prev.status !== updated.status || prev.guest_id !== updated.guest_id) {
              return updated;
            }
            return prev;
          });

          if (updated.status === 'active') {
            const isLocalHost = localUserId?.toLowerCase() === updated.host_id?.toLowerCase();
            if (isLocalHost) {
              setIsTransitioningToActive((prevTransitioning) => {
                if (!prevTransitioning) {
                  // Fallback join chime when detected via polling to ensure "be loud" chime always plays!
                  playSyncChime('join');
                  addNotification({
                    type: 'success',
                    title: (language === 'ku' || language === 'badini') ? '🎉 میوان هاتە ژوورەوە!' : '🎉 GUEST ENTERED!',
                    message: (language === 'ku' || language === 'badini')
                      ? 'میوانەکە چوو کاتەکەی هاوڕێکەت هاوکات کراوەتەوە!'
                      : 'The guest has successfully entered the cinema hall!',
                  });
                  setTimeout(() => {
                    setActiveRoomReady(true);
                  }, 2000);
                  return true;
                }
                return prevTransitioning;
              });
            } else if (updated.guest_id?.toLowerCase() === localUserId?.toLowerCase()) {
              setPinVerified(true);
              setActiveRoomReady(true);
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);

    // Subscribe to ticket changes
    const subscription = supabase
      .channel(`watch_tickets_${ticket_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'watch_tickets',
          filter: `id=eq.${ticket_id}`,
        },
        (payload) => {
          if (payload.new) {
            const updated = payload.new as TicketRecord;
            setTicket(updated);

            // Only trigger synchronized transition animations for Host when guest is accepted
            if (updated.status === 'active' && updated.host_id?.toLowerCase() === localUserId?.toLowerCase()) {
              setIsTransitioningToActive((prev) => {
                if (!prev) {
                  // Play cinematic join chime when state updates in DB changes subscription
                  playSyncChime('join');
                  addNotification({
                    type: 'success',
                    title: (language === 'ku' || language === 'badini') ? '🎉 میوان هاتە ژوورەوە!' : '🎉 GUEST ENTERED!',
                    message: (language === 'ku' || language === 'badini')
                      ? 'میوانەکە چوو کاتەکەی هاوڕێکەت هاوکات کراوەتەوە!'
                      : 'The guest has successfully entered the cinema hall!',
                  });
                  setTimeout(() => {
                    setActiveRoomReady(true);
                  }, 2000);
                  return true;
                }
                return prev;
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
      clearInterval(pollInterval);
    };
  }, [ticket_id, language, localUserId]);

  // 2. Realtime dynamic nickname syncing (Ping-Pong & Guest Join Broadcast)
  useEffect(() => {
    if (!ticket_id || !localUserId || !localUserName) return;

    const presenceChannel = supabase.channel(`presence-${ticket_id}`, {
      config: {
        broadcast: { self: false },
      },
    });

    presenceChannel
      .on('broadcast', { event: 'ping' }, (response) => {
        const { userId, userName } = response.payload;
        setMemberNames((prev) => ({ ...prev, [userId]: userName }));
        // Reply with pong
        presenceChannel.send({
          type: 'broadcast',
          event: 'pong',
          payload: { userId: localUserId, userName: localUserName }
        });
      })
      .on('broadcast', { event: 'pong' }, (response) => {
        const { userId, userName } = response.payload;
        setMemberNames((prev) => ({ ...prev, [userId]: userName }));
      })
      .on('broadcast', { event: 'guest_joined' }, (response) => {
        const { guestId, guestName: joinedGuestName } = response.payload;
        setMemberNames((prev) => ({ ...prev, [guestId]: joinedGuestName }));
        
        // Host receives the guest joined event in real-time! Play audio chime and trigger premium transition!
        playSyncChime('join');
        
        addNotification({
          type: 'success',
          title: (language === 'ku' || language === 'badini') ? '🎉 میوان هاتە ژوورەوە!' : '🎉 GUEST ENTERED!',
          message: (language === 'ku' || language === 'badini')
            ? 'میوانەکە چوو کاتەکەی هاوڕێکەت هاوکات کراوەتەوە!'
            : 'The guest has successfully entered the cinema hall!',
        });

        setTicket((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: 'active',
            guest_id: guestId
          };
        });

        setIsTransitioningToActive(true);
        setTimeout(() => {
          setActiveRoomReady(true);
        }, 2000);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Announce presence
          presenceChannel.send({
            type: 'broadcast',
            event: 'ping',
            payload: { userId: localUserId, userName: localUserName }
          });
        }
      });

    presenceChannelRef.current = presenceChannel;

    return () => {
      supabase.removeChannel(presenceChannel);
      presenceChannelRef.current = null;
    };
  }, [ticket_id, localUserId, localUserName, ticket]);



  // 4. Update Database Ticket and notify chat on join
  const executeGuestJoin = async () => {
    if (!ticket_id || !localUserId || !localUserName) return;

    try {
      // Set status to active & register guest ID using RPC (bypasses PATCH preflight CORS issues)
      const { error: patchError } = await supabase.rpc('join_watch_party', {
        p_ticket_id: ticket_id,
        p_guest_id: localUserId
      });

      if (patchError) throw patchError;

      // Broadcast join event to Host instantly over the open presenceChannel node
      if (presenceChannelRef.current) {
        presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'guest_joined',
          payload: { guestId: localUserId, guestName: localUserName }
        });
      }

      // Send join notice to Chat Sidebar
      const systemMessage = JSON.stringify({
        sender: 'System',
        text: (language === 'ku' || language === 'badini') 
          ? `میوان ${localUserName} بەشداربوو لە تەماشاکردنەکە!` 
          : `${localUserName} joined the cinema room!`,
        isSystem: true
      });

      await supabase.from('room_messages').insert({
        ticket_id: ticket_id,
        user_id: localUserId,
        message: systemMessage
      });

      addNotification({
        type: 'success',
        title: (language === 'ku' || language === 'badini') ? 'بەستراوەتەوە' : 'Session Synced',
        message: (language === 'ku' || language === 'badini') 
          ? 'هاوکاتبوون لەگەڵ پێشکەشکار چالاک کرا!' 
          : 'Co-watching synchronized with the host!',
      });
    } catch (err) {
      console.error('Failed to update ticket status on join:', err);
    }
  };

  // Keyboard Navigation / Autoshifting PIN Digits
  const handlePinInputChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return; // Only numbers allowed
    const cleanVal = val.slice(-1); // Only take last character

    const newInputs = [...pinInputs];
    newInputs[index] = cleanVal;
    setPinInputs(newInputs);

    // Auto-focus next box
    if (cleanVal !== '' && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && pinInputs[index] === '' && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  // Custom key pad triggers
  const handleKeypadPress = (num: string) => {
    const firstEmptyIdx = pinInputs.findIndex((c) => c === '');
    const targetIdx = firstEmptyIdx === -1 ? 3 : firstEmptyIdx;

    const newInputs = [...pinInputs];
    newInputs[targetIdx] = num;
    setPinInputs(newInputs);

    if (targetIdx < 3) {
      pinRefs[targetIdx + 1].current?.focus();
    }
  };

  const handleKeypadBackspace = () => {
    const lastFilledIdx = [...pinInputs].reverse().findIndex((c) => c !== '');
    if (lastFilledIdx === -1) return; // All slots empty
    const targetIdx = 3 - lastFilledIdx;

    const newInputs = [...pinInputs];
    newInputs[targetIdx] = '';
    setPinInputs(newInputs);
    pinRefs[targetIdx].current?.focus();
  };

  // Watch for full PIN completion to trigger verify
  useEffect(() => {
    const completed = pinInputs.every((char) => char !== '');
    if (completed && ticket && !isHost && !pinVerified) {
      verifyManualPin();
    }
  }, [pinInputs, ticket, isHost, pinVerified]);

  const verifyManualPin = async () => {
    if (!ticket) return;

    const enteredPin = pinInputs.join('');
    setVerifyingPin(true);

    if (enteredPin === ticket.pin_code) {
      // 8-user limit check (memberNames contains other active users in the room)
      const currentSpectatorCount = Object.keys(memberNames).length;
      if (currentSpectatorCount >= 8) {
        setVerifyingPin(false);
        playSyncChime('error');
        addNotification({
          type: 'error',
          title: (language === 'ku' || language === 'badini') ? 'تیکتەکە پڕبووە' : 'Ticket Full',
          message: (language === 'ku' || language === 'badini') 
            ? 'تیکتەکە تەنها پشتگیری ٨ بەکارهێنەر دەکات. هۆڵەکە پڕبووە، جارێکی تر تاقی بکەرەوە.'
            : 'Ticket is full. Ticket supports a maximum of 8 users. Try another time.',
        });
        setRoomFullError(true);
        return;
      }

      // Correct! Play premium success checkmark animation and sound
      setPinSuccess(true);
      playSyncChime('join');
      
      // Update database status immediately so Host sees "GUEST ACCEPTED" in real-time
      await executeGuestJoin();

      // Keep the Guest on the ACCEPTED screen for 2 seconds to match Host's transition time
      setTimeout(() => {
        setPinVerified(true);
        setVerifyingPin(false);
        setActiveRoomReady(true);
      }, 2000);
    } else {
      // Incorrect! Trigger locks-screen iOS shake animation and audio error buzz
      playSyncChime('error');
      setTimeout(() => {
        setIsShaking(true);
        setVerifyingPin(false);
        addNotification({
          type: 'error',
          title: (language === 'ku' || language === 'badini') ? 'کۆدی نادروست' : 'Verification Failed',
          message: (language === 'ku' || language === 'badini') ? 'تکایە کۆدی چوونەژوورەوەی دروست بنووسە.' : 'Incorrect entry PIN code.',
        });

        // Buzz feedback and reset fields after shake
        setTimeout(() => {
          setIsShaking(false);
          setPinInputs(['', '', '', '']);
          pinRefs[0].current?.focus();
        }, 500);
      }, 600);
    }
  };

  // Render Loader screen (only shown if neither ticket nor movie are available yet)
  if (loading) {
    return (
      <div className="flex-1 w-full h-[70vh] flex flex-col items-center justify-center gap-6">
        <Spinner size="lg" />
      </div>
    );
  }

  // Render Error screen
  if (error || !ticket || !movie) {
    return (
      <div className="flex-1 w-full h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full bg-red-950/20 border border-red-500/30 flex items-center justify-center text-red-500 mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2">
          {(language === 'ku' || language === 'badini') ? 'هەڵەی سێرڤەر' : 'ROOM STALLED'}
        </h2>
        <p className="text-sm font-bold text-zinc-400 uppercase tracking-wide leading-relaxed mb-8">
          {error || ((language === 'ku' || language === 'badini') ? 'تیکتی تەماشا چالاک نییە یان هەڵوەشاوەتەوە.' : 'The requested Watch Party session could not be synchronized.')}
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3.5 bg-zinc-900 border border-white/10 text-white rounded-2xl flex items-center gap-2 font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
        >
          <ArrowLeft size={16} /> {(language === 'ku' || language === 'badini') ? 'گەڕانەوە بۆ سەرەکی' : 'BACK TO LOBBY'}
        </button>
      </div>
    );
  }

  // Render Room Full screen
  if (roomFullError) {
    return (
      <div className="flex-1 w-full h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full bg-red-950/20 border border-red-500/30 flex items-center justify-center text-red-500 mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2">
          {(language === 'ku' || language === 'badini') ? 'هۆڵەکە پڕبووە' : 'CINEMA HALL FULL'}
        </h2>
        <p className="text-sm font-bold text-zinc-400 uppercase tracking-wide leading-relaxed mb-8">
          {(language === 'ku' || language === 'badini')
            ? 'ببورە، ئەم تیکتە تەنها پشتگیری ٨ بەکارهێنەر دەکات. هۆڵەکە پڕبووە، جارێکی تر تاقی بکەرەوە.'
            : 'Sorry, this ticket supports a maximum of 8 users. The room is currently full. Please try another time.'}
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3.5 bg-zinc-900 border border-white/10 text-white rounded-2xl flex items-center gap-2 font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
        >
          <ArrowLeft size={16} /> {(language === 'ku' || language === 'badini') ? 'گەڕانەوە بۆ سەرەکی' : 'BACK TO LOBBY'}
        </button>
      </div>
    );
  }

  // A. Host View: Waiting for Guest Room (Renders Digital Ticket directly on page)
  if (isHost && (ticket.status === 'waiting' || (isTransitioningToActive && !activeRoomReady))) {
    if (isTransitioningToActive) {
      return (
        <div className="relative w-full min-h-[85vh] flex flex-col items-center justify-center p-6 bg-black overflow-hidden">
          {/* Giant Ambient Blurred Poster Backdrop */}
          <div className="absolute inset-0 z-0 opacity-20 filter blur-[80px] scale-110">
            <img
              src={getImageUrl(movie.backdrop_path || movie.poster_path)}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-[420px] bg-zinc-950/80 border border-green-500/30 backdrop-blur-3xl rounded-[2.5rem] p-10 shadow-[0_0_80px_rgba(0,0,0,0.8)] text-center flex flex-col items-center"
          >
            <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-500 mb-6 shadow-xl relative overflow-hidden">
              <CheckCircle className="w-10 h-10 animate-bounce text-green-400" />
              <div className="absolute inset-0 bg-green-500/5 blur-md" />
            </div>

            <h1 className="text-3xl font-[1000] uppercase italic tracking-tighter text-white mb-2">
              {(language === 'ku' || language === 'badini') ? 'هاوکات بوو!' : 'CINEMA SYNCED!'}
            </h1>
            <p className="text-sm font-bold text-green-500 uppercase tracking-widest leading-relaxed mb-6 animate-pulse">
              {(language === 'ku' || language === 'badini') ? 'میوان قبوڵکرا' : 'GUEST ACCEPTED'}
            </p>
            
            <div className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-2 mb-6">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 uppercase font-black tracking-wider">{(language === 'ku' || language === 'badini') ? 'پێشکەشکار:' : 'HOST:'}</span>
                <span className="text-white font-bold">{localUserName}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                <span className="text-zinc-500 uppercase font-black tracking-wider">{(language === 'ku' || language === 'badini') ? 'میوان:' : 'GUEST:'}</span>
                <span className="text-white font-bold">{guestName || ((language === 'ku' || language === 'badini') ? 'میوان' : 'Guest')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-green-500 animate-spin" />
              <span className="text-[10px] font-black uppercase text-green-500 tracking-[0.25em]">
                {(language === 'ku' || language === 'badini') ? 'چوونە ژوورەوە بۆ هۆڵ...' : 'ENTERING CINEMA HALL...'}
              </span>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="relative w-full min-h-[85vh] flex items-center justify-center p-6 bg-black overflow-hidden">
        {/* Giant Ambient Blurred Poster Backdrop */}
        <div className="absolute inset-0 z-0 opacity-15 filter blur-[60px] scale-110">
          <img
            src={getImageUrl(movie.backdrop_path || movie.poster_path)}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>

        {/* Embedded Ticket component */}
        <div className="relative z-10 w-full flex flex-col items-center">
          <div className="text-center mb-6 max-w-sm px-4">
            <h1 className="text-3xl font-[1000] uppercase italic tracking-tighter text-white mb-2">
              {(language === 'ku' || language === 'badini') ? 'تەماشاکردنی هاوبەش' : 'CO-WATCH PARTY'}
            </h1>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
              {(language === 'ku' || language === 'badini') 
                ? 'هاوڕێکەت بانگهێشت بکە بە ناردنی ئەم تیکتە ئەلیکترۆنییە بۆ بەشداریکردن!' 
                : 'Send this digital invitation ticket to your guest to establish cinema synchronization.'}
            </p>
          </div>
          
          <WatchPartyTicketModal
            isOpen={true}
            onClose={() => navigate(getBackRoute(ticket.movie_id))}
            movie={{
              id: movie.id,
              title: movie.title,
              poster_path: movie.poster_path,
              backdrop_path: movie.backdrop_path,
              runtime: movie.runtime,
              vote_average: movie.vote_average,
              release_date: movie.release_date
            }}
            ticketId={ticket.id}
            pinCode={ticket.pin_code}
            status={ticket.status}
          />

          <button
            onClick={() => playSyncChime('join')}
            className="mt-6 px-6 py-3 bg-zinc-950 border border-white/5 hover:border-orange-500/30 hover:bg-orange-950/10 text-zinc-400 hover:text-orange-500 rounded-2xl flex items-center gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all cursor-pointer z-20"
          >
            <Sparkles size={14} className="text-orange-500 animate-pulse" />
            {(language === 'ku' || language === 'badini') ? 'تاقیکردنەوەی دەنگی هۆڵ' : 'TEST THEATRE BELL'}
          </button>
        </div>
      </div>
    );
  }

  // B. Guest View: PIN Entry verification overlay (Glassmorphism + custom visual keyboard)
  if (!isHost && !pinVerified) {
    if (pinSuccess) {
      return (
        <div className="relative w-full min-h-[85vh] flex flex-col items-center justify-center p-6 bg-black overflow-hidden">
          {/* Giant Ambient Blurred Poster Backdrop */}
          <div className="absolute inset-0 z-0 opacity-20 filter blur-[80px] scale-110">
            <img
              src={getImageUrl(movie.backdrop_path || movie.poster_path)}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-[420px] bg-zinc-950/80 border border-green-500/30 backdrop-blur-3xl rounded-[2.5rem] p-10 shadow-[0_0_80px_rgba(0,0,0,0.8)] text-center flex flex-col items-center animate-pulse"
          >
            <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-500 mb-6 shadow-xl relative overflow-hidden">
              <CheckCircle className="w-10 h-10 animate-bounce text-green-400" />
              <div className="absolute inset-0 bg-green-500/5 blur-md" />
            </div>

            <h1 className="text-3xl font-[1000] uppercase italic tracking-tighter text-white mb-2">
              {(language === 'ku' || language === 'badini') ? 'هاوکات بوو!' : 'CINEMA SYNCED!'}
            </h1>
            <p className="text-sm font-bold text-green-500 uppercase tracking-widest leading-relaxed mb-6 animate-pulse">
              {(language === 'ku' || language === 'badini') ? 'پەیوەست بوویت' : 'SUCCESSFULLY JOINED'}
            </p>
            
            <div className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-2 mb-6">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 uppercase font-black tracking-wider">{(language === 'ku' || language === 'badini') ? 'پێشکەشکار:' : 'HOST:'}</span>
                <span className="text-white font-bold">{hostName || ((language === 'ku' || language === 'badini') ? 'پێشکەشکار' : 'Host')}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                <span className="text-zinc-500 uppercase font-black tracking-wider">{(language === 'ku' || language === 'badini') ? 'میوان (تۆ):' : 'GUEST (YOU):'}</span>
                <span className="text-white font-bold">{localUserName}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-green-500 animate-spin" />
              <span className="text-[10px] font-black uppercase text-green-500 tracking-[0.25em]">
                {(language === 'ku' || language === 'badini') ? 'چوونە ژوورەوە بۆ هۆڵ...' : 'ENTERING CINEMA HALL...'}
              </span>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="relative w-full min-h-[85vh] flex items-center justify-center p-4 overflow-hidden bg-black">
        
        {/* Giant Blurred Ambient Light Poster Backdrop */}
        <div className="absolute inset-0 z-0 opacity-10 filter blur-[80px] scale-110">
          <img
            src={getImageUrl(movie.poster_path)}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/80" />
        </div>

        {/* Floating Translucent Verification Card with iOS/Tauri shake ability */}
        <motion.div
          animate={isShaking ? { x: [-12, 12, -12, 12, -6, 6, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-[400px] bg-zinc-950/80 border border-white/5 backdrop-blur-3xl rounded-[2.5rem] p-8 md:p-10 shadow-[0_0_80px_rgba(0,0,0,0.8)] text-center flex flex-col items-center"
        >
          {/* Animated Header */}
          <div className="w-16 h-16 rounded-[1.75rem] bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-500 mb-6 shadow-xl relative overflow-hidden">
            <Lock className="w-6 h-6 animate-pulse" />
            <div className="absolute inset-0 bg-orange-500/5 blur-md" />
          </div>

          <h2 className="text-[22px] font-black uppercase italic tracking-wider text-white mb-2">
            {(language === 'ku' || language === 'badini') ? 'تەماشاکردنی هاوبەش' : 'WATCH ROOM SECURE'}
          </h2>
          
          {Object.keys(memberNames).length >= 8 ? (
            <p className="text-xs font-bold text-red-500 uppercase tracking-widest leading-relaxed mb-8 max-w-xs animate-pulse">
              {(language === 'ku' || language === 'badini')
                ? 'ببورە، هۆڵەکە پڕبووە (زۆرترین ٨ کەس بەشدارە).'
                : 'Sorry, the room is full (maximum 8 participants).'}
            </p>
          ) : (
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest leading-relaxed mb-8 max-w-xs">
              {(language === 'ku' || language === 'badini')
                ? 'کۆدی ٤ ژمارەیی پێشکەشکار بنووسە بۆ چوونە ژوورەوە.'
                : 'Enter the 4-digit entry PIN generated by the party host.'}
            </p>
          )}

          {/* Interactive PIN inputs boxes */}
          <div className="flex gap-3 justify-center mb-8 relative" dir="ltr">
            <AnimatePresence>
              {pinSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950 rounded-2xl border border-green-500"
                >
                  <CheckCircle size={28} className="text-green-500 mr-2 animate-bounce" />
                  <span className="text-xs font-black uppercase tracking-widest text-green-500 animate-pulse">
                    {(language === 'ku' || language === 'badini') ? 'قبوڵکرا' : 'ACCEPTED'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {pinInputs.map((char, index) => (
              <input
                key={index}
                ref={pinRefs[index]}
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={1}
                value={char}
                onChange={(e) => handlePinInputChange(index, e.target.value)}
                onKeyDown={(e) => handlePinKeyDown(index, e)}
                disabled={verifyingPin || pinSuccess || Object.keys(memberNames).length >= 8}
                className="w-12 h-14 bg-zinc-900 border border-white/10 rounded-2xl text-center text-2xl font-black font-mono text-white outline-none focus:border-orange-500 focus:shadow-[0_0_15px_rgba(234,88,12,0.25)] transition-all uppercase leading-none shadow-inner"
              />
            ))}
          </div>

          {/* Verification Status Loader */}
          {verifyingPin && (
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full border-t border-orange-500 animate-spin" />
              <span className="text-[10px] font-black uppercase text-orange-500 tracking-wider">
                {(language === 'ku' || language === 'badini') ? 'پشکنینی کۆد...' : 'VERIFYING KEY...'}
              </span>
            </div>
          )}

          {/* Sleek Touchscreen & Gamepad Keypad */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-[280px] mb-8 shrink-0" dir="ltr">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                disabled={verifyingPin || pinSuccess || Object.keys(memberNames).length >= 8}
                onClick={() => handleKeypadPress(num)}
                className="bg-white/5 border border-white/5 hover:bg-white/10 hover:border-orange-500/20 active:scale-95 rounded-2xl py-3 text-lg font-black text-white transition-all shadow-md shrink-0 select-none disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:border-white/5"
              >
                {num}
              </button>
            ))}
            <div className="flex items-center justify-center py-3 text-gray-600 select-none shrink-0 font-black">
              •
            </div>
            <button
              type="button"
              disabled={verifyingPin || pinSuccess || Object.keys(memberNames).length >= 8}
              onClick={() => handleKeypadPress('0')}
              className="bg-white/5 border border-white/5 hover:bg-white/10 hover:border-orange-500/20 active:scale-95 rounded-2xl py-3 text-lg font-black text-white transition-all shadow-md shrink-0 select-none disabled:opacity-30"
            >
              0
            </button>
            <button
              type="button"
              disabled={verifyingPin || pinSuccess || Object.keys(memberNames).length >= 8}
              onClick={handleKeypadBackspace}
              className="bg-orange-600/10 border border-orange-500/10 hover:bg-orange-600/20 hover:border-orange-500/20 active:scale-95 rounded-2xl py-3 flex items-center justify-center text-orange-500 transition-all shadow-md shrink-0 select-none disabled:opacity-30"
            >
              <Delete size={20} />
            </button>
          </div>

          {/* Quick Exit back to detail */}
          <button
            onClick={() => navigate(getBackRoute(ticket.movie_id))}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest mt-1 active:scale-95"
          >
            <ArrowLeft size={12} /> {(language === 'ku' || language === 'badini') ? 'گەڕانەوە بۆ دواوە' : 'QUIT WATCH PARTY'}
          </button>

        </motion.div>
      </div>
    );
  }

  // C. Full Active Room: Double column widescreen layouts (Player + Chat Sidebar)

  const isRtl = (language === 'ku' || language === 'badini');
  const headerSpacingClass = isChatOpen 
    ? isRtl 
      ? 'left-4 right-4 md:left-[calc(clamp(280px,var(--chat-width,22vw),50vw)+32px)] md:right-4' // Chat is on the left, so left has offset
      : 'left-4 right-4 md:right-[calc(clamp(280px,var(--chat-width,22vw),50vw)+32px)] md:left-4' // Chat is on the right, so right has offset
    : 'left-4 right-4';


  const sidebarResponsiveClass = isRtl
    ? 'left-4 right-4 bottom-24 h-[300px] sm:h-[calc(100%-2rem)] sm:top-4 sm:bottom-4 sm:right-auto sm:left-4'
    : 'left-4 right-4 bottom-24 h-[300px] sm:h-[calc(100%-2rem)] sm:top-4 sm:bottom-4 sm:left-auto sm:right-4';

  return (
    <div 
      style={{ '--chat-width': `${chatWidth}vw` } as React.CSSProperties}
      className="relative w-full h-[calc(100vh-40px)] bg-black text-white overflow-hidden select-none"
    >
      
      {/* Dynamic blurred color flow backdrop */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none filter blur-[120px] scale-110">
        <img
          src={getImageUrl(movie.backdrop_path || movie.poster_path)}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      {/* Full-Screen interaction layer for header reveal on mouse/touch move */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        onMouseMove={resetRoomHeaderTimer}
        onTouchStart={resetRoomHeaderTimer}
        style={{ pointerEvents: 'none' }}
      />
      {/* Capture mouse move globally across entire room */}
      <div
        className="absolute inset-0 z-[5] pointer-events-auto"
        onMouseMove={resetRoomHeaderTimer}
        onTouchStart={resetRoomHeaderTimer}
        onClick={resetRoomHeaderTimer}
        style={{ background: 'transparent' }}
      />

      {/* 100% Full-Screen Synced Video Player */}
      <div className="absolute inset-0 z-10 w-full h-full">
        <CoWatchVideoPlayer
          ticketId={ticket.id}
          movieId={String(movie.id)}
          movieTitle={movie.title}
          isHost={isHost}
          localUserId={localUserId}
          localUserName={localUserName}
          partnerName={isHost ? guestName : hostName}
          contentType={ticket.movie_id.startsWith('tv_') ? 'tv' : 'movie'}
          season={season}
          episode={episode}
        />
      </div>

      {/* Floating Cinematic Top Bar panel — auto-hides after 3.5s idle */}
      <AnimatePresence>
      {showHeader && (
        <motion.div
          key="room-header"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))', zIndex: 40 }}
          className={`absolute transition-all duration-500 ease-out px-3 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl border border-white/5 bg-zinc-950/90 backdrop-blur-xl shadow-2xl flex items-center justify-between select-none ${headerSpacingClass}`}
      >
        
        {/* Movie Identity */}
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          {/* Poster thumbnail — hidden on very small screens */}
          <div className="hidden xs:block w-7 h-9 sm:w-8 sm:h-11 bg-zinc-900 rounded border border-white/10 overflow-hidden shadow flex-shrink-0">
            <img
              src={getImageUrl(movie.poster_path, 'w500')}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col text-left min-w-0">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-[7px] sm:text-[9px] font-black tracking-widest text-orange-500 uppercase bg-orange-600/10 border border-orange-500/20 px-1.5 py-0.5 rounded leading-none shrink-0">
                {(language === 'ku' || language === 'badini') ? 'چالاکە' : 'LIVE'}
              </span>
              <span className="text-[10px] sm:text-sm font-black text-white uppercase italic tracking-tight truncate max-w-[90px] xs:max-w-[110px] sm:max-w-xs md:max-w-md">
                {movie.title} {season !== undefined && episode !== undefined ? ` • S${season} E${episode}` : ''}
              </span>
            </div>
            {/* Spectators — hidden on mobile to save space */}
            <div className="hidden sm:flex items-center gap-1 mt-0.5 text-zinc-500">
              <Users size={10} className="text-zinc-500 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider truncate max-w-none">
                {localUserName} {Object.values(memberNames).length > 0 ? `+ ${Object.values(memberNames).join(' + ')}` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Exit & actions */}
        <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
          {/* Play/Pause Button */}
          <button
            onClick={() => {
              playSyncChime('sync');
              window.dispatchEvent(new CustomEvent('cowatch-toggle-play'));
            }}
            className="flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all cursor-pointer shadow-lg rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 bg-zinc-900/50 p-2 sm:px-4 sm:py-2"
          >
            {playerPaused ? <Play size={13} className="fill-current text-white" /> : <Pause size={13} className="fill-current text-white" />}
            <span className="hidden sm:inline">{playerPaused ? ((language === 'ku' || language === 'badini') ? 'پەخش' : 'PLAY') : ((language === 'ku' || language === 'badini') ? 'ڕاگرتن' : 'PAUSE')}</span>
          </button>

          <button
            onClick={() => {
              playSyncChime('sync');
              setIsChatOpen(!isChatOpen);
            }}
            className={`flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all cursor-pointer shadow-lg rounded-xl border p-2 sm:px-4 sm:py-2 ${
              isChatOpen 
                ? 'border-orange-500 text-orange-500 bg-orange-950/20 shadow-[0_0_15px_rgba(234,88,12,0.15)]' 
                : 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 bg-zinc-900/50'
            }`}
          >
            <MessageSquare size={13} className={isChatOpen ? 'animate-pulse text-orange-500' : ''} />
            <span className="hidden sm:inline">{(language === 'ku' || language === 'badini') ? 'چات' : 'CHAT'}</span>
          </button>

          <button
            onClick={() => playSyncChime('join')}
            className="hidden sm:flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all cursor-pointer shadow-lg rounded-xl border border-zinc-800 text-zinc-400 hover:text-orange-500 hover:border-orange-500/40 bg-zinc-900/50 p-2 sm:px-4 sm:py-2"
          >
            <Sparkles size={13} className="text-orange-500 animate-pulse" />
            <span className="hidden sm:inline">{(language === 'ku' || language === 'badini') ? 'دەنگ' : 'SOUND'}</span>
          </button>

          <button
            onClick={() => navigate(getBackRoute(ticket.movie_id))}
            className="flex items-center justify-center gap-1 sm:gap-2 font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all cursor-pointer shadow-lg rounded-xl border border-red-900/30 bg-red-650/10 hover:bg-red-600 text-red-500 hover:text-white p-2 sm:px-4 sm:py-2"
          >
            <LogOut size={13} className="shrink-0" />
            {/* Hide label on very small mobile, show from xs up */}
            <span className="hidden xs:inline">{(language === 'ku' || language === 'badini') ? 'جێهێشتن' : 'LEAVE'}</span>
          </button>
        </div>


      </motion.div>
      )}
      </AnimatePresence>

      {/* Floating Cinematic Live Chat Sidebar overlay */}
      <motion.div
        animate={{ 
          opacity: isChatOpen ? 1 : 0,
          x: isChatOpen ? 0 : (isRtl ? -200 : 200),
          scale: isChatOpen ? 1 : 0.95,
          pointerEvents: isChatOpen ? 'auto' : 'none'
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        style={isChatOpen ? (isMobile ? {} : { width: `clamp(280px, ${chatWidth}vw, 50vw)` }) : { width: '0px' }}
        className={`absolute z-40 flex flex-col overflow-hidden shadow-2xl ${sidebarResponsiveClass}`}
      >
        <WatchChatSidebar
          ticketId={ticket.id}
          localUserId={localUserId}
          localUserName={localUserName}
          isHost={isHost}
          guestName={guestName || 'Guest'}
          hostName={hostName || 'Host'}
          onClose={() => setIsChatOpen(false)}
          isChatOpen={isChatOpen}
          chatWidth={chatWidth}
          onChatWidthChange={(w) => {
            setChatWidth(w);
            try {
              localStorage.setItem('flkrd-cowatch-chat-width', String(w));
            } catch (e) {}
          }}
        />
      </motion.div>

    </div>
  );
}
