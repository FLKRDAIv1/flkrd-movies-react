import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Subtitles } from 'lucide-react';
import { ccDetectionService } from '../services/ccDetectionService';
import { useTranslation } from '../contexts/LanguageContext';

interface KurdishCCBadgeProps {
    tmdbId: number;
    type: 'movie' | 'tv';
}

const KurdishCCBadge: React.FC<KurdishCCBadgeProps> = ({ tmdbId, type }) => {
    const [hasCC, setHasCC] = useState<boolean | null>(null);
    const { language } = useTranslation();

    useEffect(() => {
        let isMounted = true;
        
        ccDetectionService.checkKurdishCC(tmdbId, type).then(result => {
            if (isMounted) setHasCC(result);
        });

        return () => { isMounted = false; };
    }, [tmdbId, type]);

    if (!hasCC) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, scale: 0.8, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute top-4 left-4 z-30"
            >
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-600/90 backdrop-blur-md rounded-xl border border-red-500/50 shadow-[0_4px_15px_rgba(229,9,20,0.4)]">
                    <Subtitles size={12} className="text-white" />
                    <span className="text-[9px] font-black text-white uppercase tracking-wider">
                        {language === 'ku' ? 'کوردی' : 'KU CC'}
                    </span>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default KurdishCCBadge;
