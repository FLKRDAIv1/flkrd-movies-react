import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../contexts/UIContext';
import { useGamepad } from '../contexts/GamepadContext';

const GamepadHints: React.FC = () => {
  const { isConsoleMode } = useUI();
  const { isConnected, gamepadName } = useGamepad();

  if (!isConnected || !isConsoleMode) return null;

  const isPlaystation = gamepadName?.toLowerCase().includes('sony') || gamepadName?.toLowerCase().includes('dualshock') || gamepadName?.toLowerCase().includes('dualsense');

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[500] pointer-events-none"
    >
      <div className="flex items-center gap-6 bg-black/60 backdrop-blur-3xl px-8 py-3 rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <HintItem label="بجوڵێ" buttons={['L', 'DPAD']} />
        <div className="w-px h-4 bg-white/10" />
        <HintItem label="دیاریکردن" icon={isPlaystation ? '✕' : 'A'} color="bg-blue-500" />
        <HintItem label="گەڕانەوە" icon={isPlaystation ? '○' : 'B'} color="bg-red-500" />
        <HintItem label="مێنیو" icon={isPlaystation ? '△' : 'Y'} color="bg-green-500" />
      </div>
    </motion.div>
  );
};

const HintItem: React.FC<{ label: string; icon?: string; buttons?: string[]; color?: string }> = ({ label, icon, buttons, color }) => (
  <div className="flex items-center gap-2">
    {icon ? (
      <div className={`w-5 h-5 rounded-full ${color || 'bg-white/20'} flex items-center justify-center text-[10px] font-black text-white shadow-lg`}>
        {icon}
      </div>
    ) : (
      <div className="flex gap-1">
        {buttons?.map(b => (
          <div key={b} className="bg-white/10 px-2 py-0.5 rounded text-[8px] font-black uppercase text-gray-300 border border-white/5">{b}</div>
        ))}
      </div>
    )}
    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</span>
  </div>
);

export default GamepadHints;
