"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlayCircle,
  Database,
  Cpu,
  MonitorPlay,
  Clock,
  CheckCircle,
  ChartBar,
  Film,
  Activity,
  Globe,
  Sliders,
  FolderLock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "../../contexts/LanguageContext";

/* ──────────────────────────────────────────────────────
   Bento Card Container
   ────────────────────────────────────────────────────── */
interface FeatCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

export function FeatCard({ title, description, children, className = "" }: FeatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative flex flex-col gap-2 overflow-hidden rounded-[24px] p-5",
        "bg-zinc-950/40 backdrop-blur-[10px] border border-white/5",
        "shadow-2xl hover:border-white/10 transition-all duration-300",
        className
      )}
    >
      <div className="z-10 flex flex-col gap-1.5 select-none">
        <h3 className="font-black text-sm tracking-widest text-white uppercase italic">{title}</h3>
        <p className="text-gray-500 text-[10px] font-bold leading-normal">{description}</p>
      </div>
      <div className="relative mt-2 flex-1 w-full rounded-[16px] overflow-hidden border border-white/5 bg-black/40">
        {children}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Card1 – Playback Pipeline Visualizer
   ───────────────────────────────────────────── */
type ActiveStep = 'request' | 'server' | 'decrypt' | 'subtitle' | 'render';

const VW = 320;
const VH = 240;

const NODES = [
  { id: 'request', x: 50, y: 120, icon: PlayCircle, label: "STREAM", color: "bg-red-500", border: "border-red-600" },
  { id: 'server', x: 125, y: 60, icon: Database, label: "CDN", color: "bg-blue-500", border: "border-blue-600" },
  { id: 'decrypt', x: 200, y: 120, icon: Cpu, label: "DECODE", color: "bg-violet-500", border: "border-violet-600" },
  { id: 'subtitle', x: 125, y: 180, icon: Sliders, label: "CC SYNC", color: "bg-amber-500", border: "border-amber-600" },
  { id: 'render', x: 275, y: 120, icon: MonitorPlay, label: "RENDER", color: "bg-emerald-500", border: "border-emerald-600" },
];

export function Card1() {
  const [step, setStep] = useState<ActiveStep>("request");

  useEffect(() => {
    const steps: ActiveStep[] = ["request", "server", "decrypt", "subtitle", "render"];
    let idx = 0;
    const interval = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      idx = (idx + 1) % steps.length;
      setStep(steps[idx]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);


  return (
    <div className="w-full h-full relative overflow-hidden select-none bg-neutral-950/60 rounded-xl flex items-center justify-center p-2">
      <svg className="absolute inset-0 w-full h-full" aria-hidden>
        <defs>
          <pattern id="bento-grid-dots" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.75" fill="currentColor" className="text-zinc-800" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bento-grid-dots)" />
      </svg>

      <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
        {/* Connector Lines */}
        <line x1="50" y1="120" x2="125" y2="60" stroke="currentColor" className={cn("transition-colors duration-500", step === "server" ? "text-blue-500 stroke-[2]" : "text-zinc-800")} />
        <line x1="50" y1="120" x2="125" y2="180" stroke="currentColor" className={cn("transition-colors duration-500", step === "subtitle" ? "text-amber-500 stroke-[2]" : "text-zinc-800")} />
        <line x1="125" y1="60" x2="200" y2="120" stroke="currentColor" className={cn("transition-colors duration-500", step === "decrypt" ? "text-violet-500 stroke-[2]" : "text-zinc-800")} />
        <line x1="125" y1="180" x2="200" y2="120" stroke="currentColor" className={cn("transition-colors duration-500", step === "decrypt" ? "text-violet-500 stroke-[2]" : "text-zinc-800")} />
        <line x1="200" y1="120" x2="275" y2="120" stroke="currentColor" className={cn("transition-colors duration-500", step === "render" ? "text-emerald-500 stroke-[2]" : "text-zinc-800")} />

        {NODES.map((node) => {
          const isActive = step === node.id;
          const Icon = node.icon;
          return (
            <foreignObject key={node.id} x={node.x - 22} y={node.y - 22} width="44" height="44" className="overflow-visible">
              <div className="w-full h-full flex items-center justify-center">
                <div className={cn(
                  "w-10 h-10 rounded-xl border flex flex-col items-center justify-center transition-all duration-500 shadow-md",
                  isActive 
                    ? `${node.color} ${node.border} text-white scale-110 shadow-lg` 
                    : "bg-zinc-900 border-zinc-800 text-gray-500"
                )}>
                  <Icon className="w-4 h-4" />
                  <span className="text-[6.5px] font-black tracking-widest mt-0.5">{node.label}</span>
                </div>
              </div>
            </foreignObject>
          );
        })}
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Card2 – Weekly Watch Time Monitor
   ───────────────────────────────────────────── */
export function Card2() {
  const bars = [45, 75, 35, 85, 60, 95, 50];
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev === 0 ? 1 : 0));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full flex flex-col gap-3 justify-between p-4">
      <div className="flex gap-4">
        {[
          { label: "Daily Avg", value: "64 min", trend: "+12%" },
          { label: "This Week", value: "7.4 hrs", trend: "+8%" },
        ].map((s, i) => {
          const isActive = i === activeIdx;
          return (
            <div key={i} className="flex-1 h-[60px] relative select-none">
              <motion.div
                className="absolute inset-0 rounded-xl bg-zinc-900/60 border border-white/5 p-2 flex flex-col justify-center cursor-pointer"
                animate={{
                  scale: isActive ? 1.05 : 1,
                  borderColor: isActive ? "rgba(220, 38, 38, 0.3)" : "rgba(255, 255, 255, 0.05)"
                }}
                transition={{ type: "spring", stiffness: 200, damping: 16 }}
              >
                <span className="text-[7.5px] text-gray-500 font-black uppercase tracking-wider leading-none">{s.label}</span>
                <span className="text-sm font-black font-mono text-white leading-none mt-1 tracking-tight">{s.value}</span>
                <span className="text-[8px] font-black text-emerald-400 mt-1 leading-none">{s.trend} ↑</span>
              </motion.div>
            </div>
          );
        })}
      </div>

      <div className="flex-1 flex items-end gap-2 px-0.5 min-h-[70px]">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 h-full rounded-lg bg-zinc-900/40 border border-white/5 relative overflow-hidden">
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-red-600 rounded-t-[4px]"
              initial={{ height: "0%" }}
              animate={{
                height: [
                  `${h}%`,
                  `${Math.min(95, h + 12)}%`,
                  `${Math.max(10, h - 15)}%`,
                  `${Math.min(90, h + 5)}%`,
                  `${h}%`
                ],
              }}
              transition={{
                repeat: Infinity,
                duration: 3 + (i % 3) * 0.8,
                ease: "easeInOut",
                delay: i * 0.1,
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-between">
        {days.map((d, i) => (
          <p key={i} className="flex-1 text-center text-[7px] text-gray-600 font-mono font-black">{d}</p>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Card3 – Real-time Streaming Logs Feed
   ───────────────────────────────────────────── */
export function Card3() {
  const { t, language } = useTranslation();
  const isRTL = language === 'ku' || language === 'badini';

  const logs = useMemo(() => [
    { event: isRTL ? "دەستپێکردنی فیلمی ئۆپنهایمەر" : "Started Oppenheimer", status: "buffering", type: "buffer", t: "0.2s" },
    { event: isRTL ? "جەرنووسی کوردی سۆرانی لودکرا" : "Sorani CC Synced", status: "success", type: "cc", t: "1.4s" },
    { event: isRTL ? "خێرایی سێرڤەر ٥ باشترینە" : "Server 5 Latency: 95ms", status: "success", type: "server", t: "0.8s" },
    { event: isRTL ? "دڵخوازەکان نوێکرایەوە" : "Syncing Watchlist", status: "success", type: "sync", t: "2.1s" },
  ], [isRTL]);

  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % logs.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [logs.length]);

  const getSlot = (i: number) => {
    const N = logs.length;
    let rel = i - activeIdx;
    if (rel > Math.floor(N / 2)) rel -= N;
    if (rel < -Math.floor(N / 2)) rel += N;
    return rel;
  };

  const Y: Record<string, number> = { "-2": -60, "-1": -32, "0": 0, "1": 32, "2": 60 };

  return (
    <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
      {logs.map((l, i) => {
        const slot = getSlot(i);
        const abs = Math.abs(slot);
        const isActive = slot === 0;
        const isVisible = abs <= 2;

        const yOffset = Y[String(slot)] ?? (slot < 0 ? -100 : 100);
        const scale = isActive ? 1 : abs === 1 ? 0.94 : 0.88;
        const opacity = isActive ? 1 : abs === 1 ? 0.65 : 0.35;
        const zIndex = isActive ? 30 : abs === 1 ? 20 : 10;

        return (
          <motion.div
            key={i}
            className="absolute left-0 right-0 mx-auto px-4"
            style={{ zIndex }}
            animate={{
              y: isVisible ? yOffset : slot < 0 ? -120 : 120,
              scale,
              opacity: isVisible ? opacity : 0,
            }}
            transition={{
              y: { type: "spring", stiffness: 500, damping: 35 },
              scale: { type: "spring", stiffness: 500, damping: 35 },
              opacity: { duration: 0.25 },
            }}
          >
            <div className={cn(
              "w-full rounded-xl border flex items-center gap-3 transition-all",
              isActive
                ? "px-3 py-2.5 bg-zinc-900 border-white/10"
                : "px-2.5 py-1.5 bg-zinc-950/20 border-white/5"
            )}>
              <div className={cn(
                "shrink-0 rounded-[8px] w-6 h-6 flex items-center justify-center border text-white shadow-md",
                l.type === "buffer" ? "bg-amber-600/20 border-amber-600/40" : "bg-red-600/20 border-red-600/40"
              )}>
                {l.type === "buffer" ? (
                  <Activity className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5 text-red-500" />
                )}
              </div>

              <div className="flex-1 min-w-0 text-left">
                <p className="text-[10px] font-black text-white truncate">{l.event}</p>
                {isActive && (
                  <span className="text-[7.5px] font-mono text-gray-500">Latency: {l.t}</span>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Card4 – Favorite Genres Breakdown
   ───────────────────────────────────────────── */
export function Card4() {
  const { t, language } = useTranslation();
  const isRTL = language === 'ku' || language === 'badini';

  const genres = useMemo(() => [
    { name: isRTL ? "ئاکشن" : "Action", hits: 142, fill: 88, color: "from-red-500 to-red-600" },
    { name: isRTL ? "دراما" : "Drama", hits: 98, fill: 62, color: "from-blue-500 to-blue-600" },
    { name: isRTL ? "خەیاڵی زانستی" : "Sci-Fi", hits: 76, fill: 48, color: "from-violet-500 to-violet-600" },
    { name: isRTL ? "کۆمیدی" : "Comedy", hits: 44, fill: 28, color: "from-emerald-500 to-emerald-600" },
  ], [isRTL]);

  return (
    <div className="w-full h-full flex flex-col justify-center gap-3 p-5">
      <p className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1 select-none text-left">GENRE DISTRIBUTION</p>
      <div className="flex flex-col gap-3 flex-1">
        {genres.map((g, i) => (
          <div key={i} className="flex items-center gap-4 group">
            <span className="text-[10px] font-black text-gray-300 w-20 shrink-0 text-left truncate">{g.name}</span>
            <div className="flex-1 h-2.5 bg-zinc-900 rounded-full overflow-hidden relative border border-white/5">
              <motion.div
                className={`absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r ${g.color}`}
                initial={{ width: "0%" }}
                animate={{ width: `${g.fill}%` }}
                transition={{ duration: 1.2, delay: i * 0.1, type: "spring", bounce: 0.2 }}
              />
            </div>
            <span className="text-[9px] font-mono text-gray-500 w-8 text-right font-black">{g.hits}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Card5 – Playback Server Latency Monitor
   ───────────────────────────────────────────── */
export function Card5() {
  const servers = [
    { name: "FLKRD SERVER 1", calls: 14, latency: "180ms", fill: 45, color: "from-blue-500 to-blue-600" },
    { name: "FLKRD SERVER 2", calls: 8, latency: "120ms", fill: 25, color: "from-emerald-500 to-emerald-600" },
    { name: "FLKRD SERVER 3", calls: 22, latency: "340ms", fill: 70, color: "from-amber-500 to-amber-600" },
    { name: "FLKRD SERVER 5", calls: 31, latency: "95ms", fill: 95, color: "from-red-500 to-red-600" },
  ];

  return (
    <div className="w-full h-full flex flex-col justify-center p-4">
      <div className="grid grid-cols-2 gap-2.5 w-full">
        {servers.map((s, i) => (
          <motion.div
            key={i}
            className="relative rounded-[16px] border border-white/5 bg-zinc-900/60 p-2.5 flex flex-col justify-between"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[7.5px] font-black text-gray-500 leading-none">SERVER {s.name.split(" ").pop()}</span>
              <span className="text-[8px] font-mono font-black text-emerald-400 leading-none">{s.latency}</span>
            </div>
            <div className="mt-3 flex flex-col gap-1">
              <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden relative">
                <motion.div
                  className={`absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r ${s.color}`}
                  initial={{ width: "0%" }}
                  animate={{ width: `${s.fill}%` }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Bento Grid Assembler
   ───────────────────────────────────────────── */
export function MovieBentoGrid({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl mx-auto", className)}>
      <FeatCard
        title={t('playbackPipeline' as any) || "PLAYBACK PIPELINE"}
        description={t('playbackPipelineDesc' as any) || "Real-time CDN fetching, stream decryption, and subtitle mapping."}
        className="lg:col-span-1 h-[250px]"
      >
        <Card1 />
      </FeatCard>

      <FeatCard
        title={t('watchMinutes' as any) || "WATCH TIME"}
        description={t('watchMinutesDesc' as any) || "Weekly watch minutes and platform streaming active time."}
        className="lg:col-span-1 h-[250px]"
      >
        <Card2 />
      </FeatCard>

      <FeatCard
        title={t('playbackEvents' as any) || "STREAM LOGS"}
        description={t('playbackEventsDesc' as any) || "Live progress updates, CDN latency signals, and user activities."}
        className="lg:col-span-1 h-[250px]"
      >
        <Card3 />
      </FeatCard>

      <FeatCard
        title={t('favoriteGenres' as any) || "GENRE WATCH HISTORY"}
        description={t('favoriteGenresDesc' as any) || "Watch stats distributed by movie and tv series genre category."}
        className="lg:col-span-2 h-[250px]"
      >
        <Card4 />
      </FeatCard>

      <FeatCard
        title={t('serverPerformance' as any) || "SERVER PERFORMANCE"}
        description={t('serverPerformanceDesc' as any) || "Direct response and latency comparison across our streaming sources."}
        className="lg:col-span-1 h-[250px]"
      >
        <Card5 />
      </FeatCard>
    </div>
  );
}

export default MovieBentoGrid;
