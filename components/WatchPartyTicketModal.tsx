import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Send, Share2, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { useLocalUser } from '../hooks/useLocalUser';

interface WatchPartyTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  movie: {
    id: number | string;
    title: string;
    poster_path: string;
    backdrop_path?: string;
    runtime?: number;
    vote_average?: number;
    release_date?: string;
  };
  ticketId: string;
  pinCode: string;
  status?: 'waiting' | 'active' | 'finished';
}

const PRODUCTION_BASE = 'https://fkurd.vercel.app';

const getPublicShareUrl = (ticketId: string): string => {
  const host = window.location.hostname;
  const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');
  const base = isLocalhost ? PRODUCTION_BASE : window.location.origin;
  return `${base}/watch/${ticketId}`;
};

const resolveImage = (path: string | null | undefined, size: 'w500' | 'w1280' = 'w1280') => {
  if (!path) return '';
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

// Generate a fake barcode-like numeric string for aesthetics
const fakeBarcode = (ticketId: string) =>
  ticketId.replace(/-/g, '').slice(0, 20).toUpperCase();

// Perforated edge SVG dash pattern
const PerforatedLine = ({ vertical = false }: { vertical?: boolean }) => (
  <div
    className={vertical ? 'w-px self-stretch' : 'h-px w-full'}
    style={{
      backgroundImage: vertical
        ? 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.15) 0, rgba(255,255,255,0.15) 6px, transparent 6px, transparent 12px)'
        : 'repeating-linear-gradient(to right, rgba(255,255,255,0.15) 0, rgba(255,255,255,0.15) 6px, transparent 6px, transparent 12px)',
    }}
  />
);

export const WatchPartyTicketModal: React.FC<WatchPartyTicketModalProps> = ({
  isOpen,
  onClose,
  movie,
  ticketId,
  pinCode,
  status = 'waiting',
}) => {
  const { language } = useTranslation();
  const { addNotification } = useNotification();
  const { localUserName } = useLocalUser();
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shimmer, setShimmer] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setShimmer(true), 400);
      return () => clearTimeout(t);
    }
    setShimmer(false);
  }, [isOpen]);

  const shareUrl = getPublicShareUrl(ticketId);
  const posterUrl = resolveImage(movie.poster_path, 'w500');
  const backdropUrl = resolveImage(movie.backdrop_path || movie.poster_path);

  const seatNumber = `${pinCode[0]}${pinCode[1]}`;
  const rowLetter = String.fromCharCode(64 + ((parseInt(pinCode[2]) % 8) + 1));
  const hallNumber = ((parseInt(pinCode[3]) % 6) + 1);
  const ticketSerial = fakeBarcode(ticketId);
  const releaseYear = movie.release_date?.split('-')[0] || '2025';
  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : '— ';

  const handleCopy = async () => {
    try {
      const fullMsg = language === 'ku'
        ? `🎬 وەرە پێکەوە سەیری "${movie.title}" بکەین!\n🔗 ${shareUrl}\n🔑 کۆدی چوونەژوورەوە: ${pinCode}`
        : `🎬 Join me to watch "${movie.title}" on FLKRD!\n🔗 ${shareUrl}\n🔑 Entry PIN: ${pinCode}`;
      await navigator.clipboard.writeText(fullMsg);
      setCopied(true);
      addNotification({
        type: 'success',
        title: language === 'ku' ? '✅ بانگهێشت کۆپیکرا' : '✅ Invitation Copied',
        message: language === 'ku' ? 'بیناردە بۆ هاوڕێکەت!' : 'Send it to your guest!',
      });
      setTimeout(() => setCopied(false), 3000);
    } catch { /* ignore */ }
  };

  const handleCopyLinkOnly = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      addNotification({
        type: 'success',
        title: language === 'ku' ? '✅ بەستەرەکە کۆپیکرا' : '✅ Link Copied',
        message: language === 'ku' ? 'بەستەری ژوور کۆپیکرا بۆ حافظە!' : 'Room link copied to clipboard!',
      });
      setTimeout(() => setCopiedLink(false), 3000);
    } catch { /* ignore */ }
  };

  const kuMsg = `🎬 وەرە پێکەوە سەیری "${movie.title}" بکەین لە FLKRD!\n🔗 ${shareUrl}\n🔑 کۆدی چوونەژوورەوە: ${pinCode}`;
  const enMsg = `🎬 Watch "${movie.title}" with me on FLKRD!\n🔗 ${shareUrl}\n🔑 Entry PIN: ${pinCode}`;
  const shareMsg = encodeURIComponent(language === 'ku' ? kuMsg : enMsg);

  const whatsappUrl = `https://api.whatsapp.com/send?text=${shareMsg}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${shareMsg}`;

  if (!isOpen) return null;

  const isKu = language === 'ku';

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(24px)' }}
    >
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 30, rotateX: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 280 }}
        className="relative z-10 w-full max-w-[390px]"
        style={{ perspective: '1000px' }}
      >
        {/* ─────────────── CLOSE ─────────────── */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-50 w-9 h-9 bg-zinc-900 border border-white/15 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-all active:scale-90 shadow-xl"
        >
          <X size={15} />
        </button>

        {/* ═══════════════════════════════════════
            TICKET WRAPPER — main card + stub
        ═══════════════════════════════════════ */}
        <div className="flex flex-col rounded-3xl overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.06)] select-none">

          {/* ─────────────── MAIN TICKET BODY ─────────────── */}
          <div className="relative overflow-hidden bg-[#0f0d0b]" style={{ minHeight: 460 }}>

            {/* Backdrop image — full bleed, dark overlay */}
            {backdropUrl && (
              <div className="absolute inset-0">
                <img
                  src={backdropUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ filter: 'brightness(0.25) saturate(1.4)', transform: 'scale(1.05)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-transparent to-orange-950/30" />
              </div>
            )}

            {/* Holographic shimmer overlay */}
            <AnimatePresence>
              {shimmer && (
                <motion.div
                  initial={{ x: '-100%', opacity: 0 }}
                  animate={{ x: '200%', opacity: [0, 0.4, 0] }}
                  transition={{ duration: 1.6, ease: 'easeInOut', delay: 0.1 }}
                  className="absolute inset-0 z-20 pointer-events-none"
                  style={{
                    background: 'linear-gradient(105deg, transparent 30%, rgba(255,200,80,0.18) 50%, rgba(255,140,0,0.12) 55%, transparent 70%)',
                    transform: 'skewX(-15deg)',
                  }}
                />
              )}
            </AnimatePresence>

            {/* Noise texture */}
            <div
              className="absolute inset-0 z-10 pointer-events-none opacity-[0.04] mix-blend-overlay"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              }}
            />

            {/* ── TOP HEADER BAR ── */}
            <div className="relative z-20 flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shadow-[0_0_16px_rgba(234,88,12,0.6)]">
                  <Sparkles size={13} className="text-white" />
                </div>
                <div>
                  <p className="text-[8px] font-black tracking-[0.4em] text-orange-400 uppercase leading-none">FLKRD CINEMA</p>
                  <p className="text-[7px] font-bold tracking-widest text-zinc-600 uppercase">Private Screening</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black tracking-widest text-zinc-600 uppercase">
                  {isKu ? 'ژمارەی تیکت' : 'TICKET NO.'}
                </p>
                <p className="text-[9px] font-black text-orange-400 font-mono tracking-tight">#FLK-{pinCode}</p>
              </div>
            </div>

            {/* ── POSTER + DETAILS MIDDLE SECTION ── */}
            <div className="relative z-20 flex items-stretch gap-4 px-5 pb-4 mt-1">

              {/* Poster */}
              <div className="flex-shrink-0 relative">
                <div
                  className="rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
                  style={{ width: 96, height: 136 }}
                >
                  {posterUrl ? (
                    <img src={posterUrl} alt={movie.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-700">
                      <Sparkles size={28} />
                    </div>
                  )}
                </div>
                {/* Golden corner accents */}
                <div className="absolute -top-0.5 -left-0.5 w-3 h-3 border-t-2 border-l-2 border-orange-500/60 rounded-tl-md" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-b-2 border-r-2 border-orange-500/60 rounded-br-md" />
              </div>

              {/* Info */}
              <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                {/* Movie title */}
                <div>
                  <p className="text-[8px] font-black tracking-[0.35em] text-orange-500/70 uppercase mb-1">
                    {isKu ? 'ناوی فیلم' : 'NOW SCREENING'}
                  </p>
                  <h2
                    className="font-black uppercase italic tracking-tight text-white leading-none mb-2 line-clamp-2"
                    style={{ fontSize: movie.title.length > 18 ? '15px' : '18px' }}
                  >
                    {movie.title}
                  </h2>
                  {releaseYear && (
                    <p className="text-[9px] font-bold text-zinc-500">{releaseYear}</p>
                  )}
                </div>

                {/* Seat grid */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    { label: isKu ? 'هۆڵ' : 'HALL', value: `0${hallNumber}` },
                    { label: isKu ? 'ڕیز' : 'ROW', value: rowLetter },
                    { label: isKu ? 'کورسی' : 'SEAT', value: `${seatNumber}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/[0.04] border border-white/8 rounded-xl p-2 text-center">
                      <p className="text-[7px] font-black tracking-widest text-zinc-600 uppercase leading-none mb-1">{label}</p>
                      <p className="text-sm font-black text-white leading-none">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Runtime */}
                {runtime !== '— ' && (
                  <p className="text-[8px] font-bold text-zinc-600 mt-2 tracking-wide">{runtime}</p>
                )}
              </div>
            </div>

            {/* ── ADMIT ONE RIBBON ── */}
            <div className="relative z-20 mx-5 mb-4">
              <div
                className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-orange-500/20"
                style={{
                  background: 'linear-gradient(135deg, rgba(234,88,12,0.12) 0%, rgba(234,88,12,0.04) 100%)',
                }}
              >
                <div className="flex items-center gap-2.5">
                  {/* Live status dot */}
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === 'active' ? 'bg-green-400' : 'bg-orange-400'}`} />
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status === 'active' ? 'bg-green-500' : 'bg-orange-500'}`} />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white">
                    {status === 'active'
                      ? (isKu ? 'میوان هاتووە ✓' : 'GUEST JOINED ✓')
                      : (isKu ? 'یەک کەس داواکراو' : 'ADMIT ONE GUEST')}
                  </span>
                </div>
                <span className="text-[9px] font-black text-orange-400 tracking-widest uppercase">
                  {status === 'active' ? (isKu ? 'چالاکە' : 'ACTIVE') : (isKu ? 'چاوەڕێ' : 'PENDING')}
                </span>
              </div>
            </div>

            {/* ── ENTRY PIN SECTION ── */}
            <div className="relative z-20 px-5 mb-5">
              <p className="text-[8px] font-black tracking-[0.4em] text-zinc-500 uppercase mb-2.5">
                {isKu ? 'کۆدی چوونەژوورەوە' : 'ENTRY PIN CODE'}
              </p>
              <div className="flex items-center justify-between gap-3">
                <div className="flex gap-2" dir="ltr">
                  {pinCode.split('').map((char, idx) => (
                    <div
                      key={idx}
                      className="relative w-12 h-14 flex flex-col items-center justify-center rounded-xl overflow-hidden"
                      style={{
                        background: 'linear-gradient(160deg, #1a1714 0%, #0f0d0b 100%)',
                        border: '1px solid rgba(234,88,12,0.3)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
                      }}
                    >
                      {/* inner glow */}
                      <div className="absolute inset-0 bg-orange-500/5 rounded-xl" />
                      <span className="relative text-2xl font-black text-orange-400 font-mono leading-none">{char}</span>
                      {/* index dot */}
                      <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-orange-500/40" />
                    </div>
                  ))}
                </div>
                {/* Copy PIN button */}
                <button
                  onClick={handleCopy}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-orange-600 hover:bg-orange-500 active:scale-90 transition-all shadow-[0_0_20px_rgba(234,88,12,0.3)] text-white"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span className="text-[7px] font-black uppercase tracking-wider leading-none">
                    {copied ? (isKu ? 'کرا' : 'DONE') : (isKu ? 'کۆپی' : 'COPY')}
                  </span>
                </button>
              </div>
            </div>

          </div>

          {/* ─────────────── PERFORATION TEAR LINE ─────────────── */}
          <div className="relative bg-[#0a0907] flex items-center">
            {/* Left notch */}
            <div
              className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black z-10"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)' }}
            />
            {/* Right notch */}
            <div
              className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black z-10"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)' }}
            />
            <div className="w-full mx-6">
              <PerforatedLine />
            </div>
          </div>

          {/* ─────────────── STUB / BOTTOM SECTION ─────────────── */}
          <div
            className="relative overflow-hidden px-5 py-4"
            style={{ background: 'linear-gradient(160deg, #0f0d0b 0%, #13100d 100%)' }}
          >
            {/* Subtle amber glow from below */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-orange-600/6 blur-2xl rounded-full pointer-events-none" />

            <div className="relative z-10 flex items-start justify-between gap-3">

              {/* LEFT: QR + share link */}
              <div className="flex flex-col gap-2.5 flex-1 min-w-0">
                <p className="text-[7px] font-black tracking-[0.4em] text-zinc-600 uppercase">
                  {isKu ? 'بکەرەوە بۆ بەشداریکردن' : 'SCAN TO JOIN ROOM'}
                </p>

                {/* QR */}
                <div className="flex items-end gap-3">
                  <div
                    className="p-1.5 rounded-xl flex-shrink-0"
                    style={{
                      background: '#fff',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                    }}
                  >
                    <QRCodeSVG value={shareUrl} size={72} level="H" includeMargin={false} />
                  </div>

                  {/* Share buttons stacked */}
                  <div className="flex flex-col gap-1.5">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-xl bg-white/4 border border-white/8 flex items-center justify-center text-green-500 hover:bg-green-600/15 hover:border-green-500/25 active:scale-90 transition-all"
                      title="WhatsApp"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.858.002-2.634-1.013-5.11-2.861-6.961S14.368 1.83 11.734 1.83c-5.434 0-9.858 4.417-9.863 9.854-.002 1.762.481 3.484 1.396 5.018l-.997 3.64 3.777-.99zM16.89 13.91c-.263-.13-1.555-.767-1.796-.854-.24-.087-.417-.13-.59.13-.175.26-.675.854-.828 1.03-.153.173-.306.195-.568.064-.263-.13-1.11-.409-2.113-1.302-.78-.696-1.307-1.555-1.46-1.817-.153-.263-.016-.404.116-.534.118-.117.262-.304.394-.455.13-.152.175-.26.263-.434.088-.173.044-.326-.022-.456-.065-.13-.59-1.422-.808-1.946-.213-.51-.448-.44-.61-.448-.158-.008-.34-.01-.52-.01-.18 0-.473.067-.72.338-.246.27-.94.919-.94 2.241s.961 2.599 1.095 2.772c.134.173 1.89 2.884 4.577 4.045.639.277 1.138.441 1.528.566.643.204 1.229.175 1.691.106.514-.077 1.555-.635 1.774-1.248.219-.613.219-1.139.153-1.248-.066-.109-.24-.173-.504-.303z"/>
                      </svg>
                    </a>
                    <a
                      href={telegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-xl bg-white/4 border border-white/8 flex items-center justify-center text-sky-400 hover:bg-sky-600/15 hover:border-sky-500/25 active:scale-90 transition-all"
                      title="Telegram"
                    >
                      <Send size={14} />
                    </a>
                    <button
                      onClick={handleCopyLinkOnly}
                      className="w-8 h-8 rounded-xl bg-white/4 border border-white/8 flex items-center justify-center text-orange-400 hover:bg-orange-600/15 hover:border-orange-500/25 active:scale-90 transition-all"
                      title={isKu ? 'کۆپیکردن' : 'Copy link'}
                    >
                      {copiedLink ? <Check size={14} className="text-green-400" /> : <Share2 size={14} />}
                    </button>
                  </div>
                </div>

                {/* URL display */}
                <div
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 border border-white/6 overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                  dir="ltr"
                >
                  <span className="text-[8px] font-mono text-zinc-600 truncate flex-1">
                    fkurd.vercel.app/watch/{ticketId.slice(0, 8)}…
                  </span>
                </div>
              </div>

              {/* RIGHT: vertical barcode-style decoration + host info */}
              <div className="flex flex-col items-end gap-3 flex-shrink-0">
                {/* Barcode visual */}
                <div className="flex items-end gap-[2px] h-14" dir="ltr">
                  {ticketSerial.slice(0, 16).split('').map((char, i) => {
                    const h = 30 + ((char.charCodeAt(0) * 7 + i * 13) % 42);
                    const w = i % 3 === 0 ? 3 : 2;
                    return (
                      <div
                        key={i}
                        className="bg-white/25 rounded-[1px] flex-shrink-0"
                        style={{ width: w, height: h, opacity: 0.4 + (i % 4) * 0.15 }}
                      />
                    );
                  })}
                </div>
                <p className="text-[6px] font-mono text-zinc-700 tracking-widest" dir="ltr">
                  {ticketSerial.slice(0, 12)}
                </p>

                {/* Host badge */}
                <div className="flex flex-col items-end gap-0.5">
                  <p className="text-[7px] font-black tracking-widest text-zinc-600 uppercase">
                    {isKu ? 'پێشکەشکار' : 'HOST'}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] font-black text-white">{localUserName}</p>
                    <div className="w-5 h-5 rounded-full bg-orange-600/25 border border-orange-500/40 flex items-center justify-center text-[9px] font-black text-orange-400">
                      {localUserName.charAt(0).toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom branding strip */}
            <div className="relative z-10 flex items-center justify-center gap-2 mt-3 pt-3 border-t border-white/4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-orange-500/20" />
              <p className="text-[7px] font-black uppercase tracking-[0.5em] text-zinc-700">
                FLKRD · CO-WATCH SYSTEM · {new Date().getFullYear()}
              </p>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-orange-500/20" />
            </div>

          </div>
        </div>

        {/* Outer ticket edge glow */}
        <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{
          boxShadow: '0 0 0 1px rgba(234,88,12,0.12), 0 0 60px rgba(234,88,12,0.08)',
        }} />
      </motion.div>
    </div>
  );
};
