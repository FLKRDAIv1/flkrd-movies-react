import React, { useEffect, useState } from 'react';
import { Minus, Maximize2, Minimize2, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

const DesktopTitleBar: React.FC = () => {
    const [isTauri, setIsTauri] = useState(false);
    const [osType, setOsType] = useState<string>('');
    const [isMaximized, setIsMaximized] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (!(window as any).__TAURI_INTERNALS__) return;
        setIsTauri(true);

        // Detect OS
        import('../services/tauriService').then(async ({ tauriService }) => {
            const type = await tauriService.getOS();
            setOsType((type || '').toLowerCase());
        });

        // Track window state
        const win = getCurrentWindow();
        const syncState = async () => {
            try {
                setIsMaximized(await win.isMaximized());
                setIsFullscreen(await win.isFullscreen());
            } catch (_) {}
        };

        syncState();
        let unlistenResize: (() => void) | undefined;

        win.onResized(() => syncState()).then(u => { unlistenResize = u; });

        return () => {
            unlistenResize?.();
        };
    }, []);

    if (!isTauri) return null;

    const win = getCurrentWindow();
    // macOS returns 'macos', Linux 'linux', Windows 'windows'
    const isMac = osType === 'macos' || osType === 'darwin' || osType === 'osx';

    const handleClose = () => win.close();
    const handleMinimize = () => win.minimize();
    const handleMaximize = async () => {
        if (isMac) {
            // On Mac: green dot = fullscreen
            const full = await win.isFullscreen();
            win.setFullscreen(!full);
        } else {
            win.toggleMaximize();
        }
    };

    return (
        <div
            data-tauri-drag-region
            className="fixed top-0 left-0 right-0 h-10 z-[9999] select-none flex items-center justify-between px-3"
            style={{
                background: 'rgba(0,0,0,0.35)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
        >
            {/* Left side: macOS traffic lights OR app logo */}
            {isMac ? (
                // macOS: traffic lights on the left (matching system style)
                <div className="flex items-center gap-[6px] pointer-events-auto pl-1">
                    {/* Red close */}
                    <button
                        onClick={handleClose}
                        title="Close"
                        className="group w-[13px] h-[13px] rounded-full flex items-center justify-center transition-all"
                        style={{ background: '#ff5f57', border: '0.5px solid rgba(0,0,0,0.2)' }}
                    >
                        <X size={7} className="text-[#7a0000] opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
                    </button>
                    {/* Yellow minimize */}
                    <button
                        onClick={handleMinimize}
                        title="Minimize"
                        className="group w-[13px] h-[13px] rounded-full flex items-center justify-center transition-all"
                        style={{ background: '#febc2e', border: '0.5px solid rgba(0,0,0,0.2)' }}
                    >
                        <Minus size={7} className="text-[#7a4800] opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
                    </button>
                    {/* Green fullscreen */}
                    <button
                        onClick={handleMaximize}
                        title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
                        className="group w-[13px] h-[13px] rounded-full flex items-center justify-center transition-all"
                        style={{ background: '#28c840', border: '0.5px solid rgba(0,0,0,0.2)' }}
                    >
                        {isFullscreen
                            ? <Minimize2 size={7} className="text-[#003800] opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
                            : <Maximize2 size={7} className="text-[#003800] opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
                        }
                    </button>
                </div>
            ) : (
                // Windows/Linux: app icon + name on the left
                <div className="flex items-center gap-2 pointer-events-none pl-1">
                    <div
                        className="w-5 h-5 rounded-md overflow-hidden flex-shrink-0"
                        style={{ boxShadow: '0 0 6px rgba(229,9,20,0.4)' }}
                    >
                        <img src="/flkrd-icon.png" alt="FLKRD" className="w-full h-full object-cover" />
                    </div>
                    <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.55)',
                        letterSpacing: 3,
                        textTransform: 'uppercase',
                    }}>
                        FLKRD MOVIES
                    </span>
                </div>
            )}

            {/* Center: app name (macOS) or empty spacer */}
            {isMac && (
                <div
                    data-tauri-drag-region
                    className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none"
                >
                    <div
                        className="w-4 h-4 rounded overflow-hidden flex-shrink-0"
                        style={{ boxShadow: '0 0 4px rgba(229,9,20,0.3)' }}
                    >
                        <img src="/flkrd-icon.png" alt="FLKRD" className="w-full h-full object-cover" />
                    </div>
                    <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.45)',
                        letterSpacing: 3,
                        textTransform: 'uppercase',
                    }}>
                        FLKRD MOVIES
                    </span>
                </div>
            )}

            {/* Right side: Windows/Linux controls */}
            {!isMac && (
                <div className="flex items-center pointer-events-auto">
                    <button
                        onClick={handleMinimize}
                        title="Minimize"
                        className="w-10 h-10 flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                        <Minus size={14} className="text-white/60" />
                    </button>
                    <button
                        onClick={handleMaximize}
                        title={isMaximized ? 'Restore' : 'Maximize'}
                        className="w-10 h-10 flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                        {isMaximized
                            ? <Minimize2 size={12} className="text-white/60" />
                            : <Maximize2 size={12} className="text-white/60" />
                        }
                    </button>
                    <button
                        onClick={handleClose}
                        title="Close"
                        className="w-10 h-10 flex items-center justify-center hover:bg-red-600 transition-colors group"
                    >
                        <X size={14} className="text-white/60 group-hover:text-white transition-colors" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default DesktopTitleBar;
