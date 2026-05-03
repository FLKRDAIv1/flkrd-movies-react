import React, { useEffect, useState } from 'react';
import { Minus, Square, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

const DesktopTitleBar: React.FC = () => {
    const [isTauri, setIsTauri] = useState(false);
    const [osType, setOsType] = useState<string>('');
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        if ((window as any).__TAURI_INTERNALS__) {
            setIsTauri(true);
            
            import('../services/tauriService').then(async ({ tauriService }) => {
                const type = await tauriService.getOS();
                setOsType(type);
            });

            const checkMaximized = async () => {
                const win = getCurrentWindow();
                setIsMaximized(await win.isMaximized());
            };

            checkMaximized();
            const unlisten = getCurrentWindow().onResized(() => checkMaximized());
            return () => { unlisten.then(u => u()); };
        }
    }, []);

    if (!isTauri) return null;

    const win = getCurrentWindow();
    const isMac = osType === 'macos' || osType === 'darwin';

    return (
        <div 
            data-tauri-drag-region 
            className="fixed top-0 left-0 right-0 h-10 bg-black/40 backdrop-blur-xl flex items-center justify-between px-4 z-[9999] select-none border-b border-white/5"
        >
            <div className={`flex items-center gap-3 pointer-events-none ${isMac ? 'ml-20' : ''}`}>
                <div className="w-5 h-5 bg-brand rounded-lg flex items-center justify-center">
                    <span className="text-[10px] font-black text-white">F</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">FLKRD MOVIES Desktop</span>
            </div>

            <div className={`flex items-center ${isMac ? 'flex-row-reverse absolute left-4' : ''}`}>
                <button 
                    onClick={() => win.close()}
                    className={`p-2 transition-all group ${isMac ? 'hover:bg-red-500/20 rounded-full' : 'hover:bg-red-600'}`}
                >
                    {isMac ? <div className="w-3.5 h-3.5 rounded-full bg-red-500 border border-red-600/50" /> : <X size={14} className="text-white/60 group-hover:text-white" />}
                </button>
                <button 
                    onClick={() => win.minimize()}
                    className={`p-2 transition-all group ${isMac ? 'hover:bg-yellow-500/20 rounded-full' : 'hover:bg-white/10'}`}
                >
                    {isMac ? <div className="w-3.5 h-3.5 rounded-full bg-yellow-500 border border-yellow-600/50" /> : <Minus size={14} className="text-white/60 group-hover:text-white" />}
                </button>
                <button 
                    onClick={() => win.toggleMaximize()}
                    className={`p-2 transition-all group ${isMac ? 'hover:bg-green-500/20 rounded-full' : 'hover:bg-white/10'}`}
                >
                    {isMac ? <div className="w-3.5 h-3.5 rounded-full bg-green-500 border border-green-600/50" /> : <Square size={12} className={`text-white/60 group-hover:text-white ${isMaximized ? 'scale-75' : ''}`} />}
                </button>
            </div>
        </div>
    );
};

export default DesktopTitleBar;
