import React from 'react';
import { motion } from 'framer-motion';

const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const getSizePx = () => {
    switch (size) {
      case 'sm': return '40px';
      case 'lg': return '120px';
      default: return '80px';
    }
  };

  const sizePx = getSizePx();

  return (
    <div className="flex flex-col items-center justify-center pointer-events-none" style={{ width: sizePx, height: sizePx }}>
        <div className="relative flex items-center justify-center w-full h-full">
            {/* Outer Neural Ring */}
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-red-600 border-r-red-600 shadow-[0_0_15px_rgba(229,9,20,0.5)]"
            />
            {/* Inner Pulsing Core */}
            <motion.div 
                animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.7, 0.3] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="w-1/2 h-1/2 bg-red-600 rounded-full blur-[8px]"
            />
            {/* Static Background Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-white/5" />
        </div>
    </div>
  );
};

export default Spinner;