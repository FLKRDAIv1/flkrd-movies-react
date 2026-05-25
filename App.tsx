import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { Download, X, ShieldCheck, Share, Plus, ArrowRight } from 'lucide-react';
const HomePage = React.lazy(() => import('./pages/HomePage'));
const DetailPage = React.lazy(() => import('./pages/DetailPage'));
const TVDetailPage = React.lazy(() => import('./pages/TVDetailPage'));
const DubbedDetailPage = React.lazy(() => import('./pages/DubbedDetailPage'));
const SearchPage = React.lazy(() => import('./pages/SearchPage'));
const TVShowsPage = React.lazy(() => import('./pages/TVShowsPage'));
const StudioPage = React.lazy(() => import('./pages/StudioPage'));
const MyListPage = React.lazy(() => import('./pages/MyListPage'));
const ShortsPage = React.lazy(() => import('./pages/ShortsPage'));
const KurdishCCPage = React.lazy(() => import('./pages/KurdishCCPage'));
const StudiosListPage = React.lazy(() => import('./pages/StudiosListPage'));
const DiscoverPage = React.lazy(() => import('./pages/DiscoverPage'));
const DubbedMoviesPage = React.lazy(() => import('./pages/DubbedMoviesPage'));
const ContinueWatchingPage = React.lazy(() => import('./pages/ContinueWatchingPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const WatchRoomPage = React.lazy(() => import('./pages/WatchRoomPage'));
const DocPage = React.lazy(() => import('./pages/DocPage'));
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import SplashScreen from './components/SplashScreen';
import Spinner from './components/Spinner';
import { useTranslation } from './contexts/LanguageContext';
import { useUI } from './contexts/UIContext';
import { useNotification } from './contexts/NotificationContext';
import WelcomeNotificationPrompt from './components/WelcomeNotificationPrompt';
import ContinueWatchingPortal from './components/ContinueWatchingPortal';
import SettingsModal from './components/SettingsModal';
import { PremiumBackground } from './components/PremiumBackground';
import Portal from './components/Portal';
import DesktopTitleBar from './components/DesktopTitleBar';
import { fetchData } from './services/tmdbService';
import { requests } from './constants';
import GamepadHints from './components/GamepadHints';
import { downloadMobileConfig } from './utils/appleProfileUtils';
import { useSpatialNavigation } from './hooks/useSpatialNavigation';
import { bannedService } from './services/bannedService';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { isTauri } from './utils/tauriUtils';
import { updateService } from './services/updateService';

class ChunkErrorBoundary extends React.Component<{ children?: React.ReactNode }, { hasError: boolean }> {
  state: { hasError: boolean };
  props: { children?: React.ReactNode };

  constructor(props: { children?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    if (error.name === 'ChunkLoadError' || (error.message && error.message.includes('Failed to fetch dynamically imported module'))) {
      console.warn("[VITE ROUTER] Chunk load error detected! Auto-reloading page to fetch latest deployment...");
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return <div className="h-full w-full flex items-center justify-center text-white"><SplashScreen /></div>;
    }
    return this.props.children;
  }
}

const IOSInstallPrompt: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState<'choice' | 'manual' | 'pro'>('choice');

    const handleClose = () => {
        try {
            localStorage.setItem('flkrd_ios_prompt_dismissed', Date.now().toString());
        } catch (e) { }
        onClose();
    };

    return (
        <Portal id="ios-prompt-portal">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-[50px] flex items-center justify-center p-6">
                <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} className="bg-[var(--card-bg)] border border-white/10 rounded-[3rem] w-full max-w-lg p-8 md:p-12 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-[var(--brand-red)]" />
                <button onClick={handleClose} className="absolute top-6 right-6 text-gray-500 hover:text-[var(--text-primary)] transition-colors"><X size={24} /></button>

                <AnimatePresence mode="wait">
                    {step === 'choice' && (
                        <motion.div key="choice" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <div className="flex flex-col items-center text-center mb-10">
                                <div className="w-24 h-24 rounded-[2.5rem] overflow-hidden mb-6 shadow-2xl border-2 border-white/10 bg-black">
                                    <img src="/flkrd-icon.png" alt="FLKRD" className="w-full h-full object-cover" />
                                </div>
                                <h2 className="text-3xl md:text-4xl font-[1000] uppercase italic tracking-tighter mb-4 text-[var(--text-primary)]">Native Sync</h2>
                                <p className="text-[var(--text-secondary)] font-bold text-sm leading-relaxed px-4">Optimize FLKRD for your Apple hardware. Select your installation protocol.</p>
                            </div>

                            <div className="space-y-4">
                                <button onClick={() => setStep('pro')} className="w-full flex items-center justify-between p-6 bg-[var(--brand-red)] rounded-3xl group transition-all hover:scale-[1.02] text-white">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/20 rounded-2xl"><ShieldCheck size={24} /></div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Elite Method</p>
                                            <p className="text-lg font-black uppercase italic tracking-tighter">Native Profile</p>
                                        </div>
                                    </div>
                                    <ArrowRight size={20} />
                                </button>

                                <button onClick={() => setStep('manual')} className="w-full flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-3xl group transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/10 rounded-2xl"><Share size={24} className="text-[var(--text-secondary)]" /></div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Quick Method</p>
                                            <p className="text-lg font-black uppercase italic tracking-tighter text-[var(--text-primary)]">Home Screen Link</p>
                                        </div>
                                    </div>
                                    <ArrowRight size={20} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 'manual' && (
                        <motion.div key="manual" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2 text-[var(--text-primary)]">Home Sync</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Add to your Apple device</p>
                            </div>
                            <div className="space-y-3 mb-8">
                                <div className="flex items-center gap-5 bg-white/5 p-5 rounded-[2rem] border border-white/5">
                                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0"><Share size={20} className="text-blue-500" /></div>
                                    <p className="text-xs font-black uppercase tracking-widest text-gray-300">1. Tap the Share icon</p>
                                </div>
                                <div className="flex items-center gap-5 bg-white/5 p-5 rounded-[2rem] border border-white/5">
                                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0"><Plus size={20} className="text-white" /></div>
                                    <p className="text-xs font-black uppercase tracking-widest text-gray-300">2. Select 'Add to Home Screen'</p>
                                </div>
                            </div>
                            <button onClick={() => setStep('choice')} className="w-full py-4 text-gray-500 text-[10px] font-black uppercase tracking-[0.4em]">Go Back</button>
                        </motion.div>
                    )}

                    {step === 'pro' && (
                        <motion.div key="pro" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2 text-[var(--text-primary)]">Native Profile</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Full-Screen Cinema Link</p>
                            </div>
                            <div className="bg-white/5 rounded-3xl p-6 mb-8 border border-white/10">
                                <ol className="space-y-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                                    <li className="flex gap-4"><span className="text-[var(--brand-red)] font-black">01</span> Tap Download below.</li>
                                    <li className="flex gap-4"><span className="text-[var(--brand-red)] font-black">02</span> Open Settings &gt; General &gt; VPN &amp; Device Management.</li>
                                    <li className="flex gap-4"><span className="text-[var(--brand-red)] font-black">03</span> Select 'FLKRD MOVIES' and tap Install.</li>
                                </ol>
                            </div>
                            <button
                                onClick={() => { downloadMobileConfig(); handleClose(); }}
                                className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] font-[1000] py-6 rounded-3xl flex items-center justify-center gap-3 uppercase italic tracking-widest text-sm shadow-2xl active:scale-95 transition-all"
                            >
                                <Download size={20} /> DOWNLOAD PROFILE
                            </button>
                            <button onClick={() => setStep('choice')} className="w-full mt-4 py-4 text-gray-500 text-[10px] font-black uppercase tracking-[0.4em]">Go Back</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
        </Portal>
    );
};

const App: React.FC = () => {
    const { language, t } = useTranslation();
    const { theme, isSettingsOpen, setIsSettingsOpen, isPerformanceMode } = useUI();
    const { addNotification } = useNotification();
    const [loading, setLoading] = useState(true);
    const [scrolled, setScrolled] = useState(false);
    const [showIOSPrompt, setShowIOSPrompt] = useState(false);
    const mainRef = useRef<HTMLElement>(null);
    
    // Initialized Spatial Navigation Engine
    useSpatialNavigation();

    useEffect(() => {
        if ((window as any).__TAURI_INTERNALS__) {
            document.body.classList.add('is-tauri');
        }
        
        // Quantum Prefetch Engine - Eagerly load core archives
        const prefetchCore = async () => {
            try {
                // 1. Parallel fetch banned registry & trending
                await Promise.all([
                    bannedService.fetchBannedList(),
                    fetchData(requests.fetchTrending('en-US'), 'en'),
                    fetchData(requests.fetchLatestMovies('en-US'), 'en')
                ]);
                
                // 2. Background prefetch secondary routes
                setTimeout(() => {
                    fetchData(requests.fetchNetflixOriginals('en-US'), 'en');
                    fetchData(requests.fetchTopRatedMovies('en-US'), 'en');
                }, 2000);
            } catch (e) {
                console.warn("[QUANTUM PREFETCH] Sync stalled:", e);
            }
        };

        prefetchCore();
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            if (mainRef.current) {
                setScrolled(mainRef.current.scrollTop > 10);
            }
        };
        const mainEl = mainRef.current;
        if (mainEl) {
            mainEl.addEventListener('scroll', handleScroll);
        }
        return () => {
            if (mainEl) {
                mainEl.removeEventListener('scroll', handleScroll);
            }
        };
    }, [loading]);

    useEffect(() => {
        const checkForNewContent = async () => {
            try {
                const data = await fetchData(requests.fetchLatestMovies('en-US'), 'en');
                if (data && data.length > 0) {
                    const latestMovie = data[0];
                    const lastNotifiedId = localStorage.getItem('flkrd_last_notified_id');

                    if (lastNotifiedId !== String(latestMovie.id)) {
                        const title = t('newMovieTitle', { movieTitle: latestMovie.title });
                        const body = t('newMovieBody', { movieTitle: latestMovie.title });
                        
                        // 1. In-App Native-like Professional Notification (Always fires)
                        addNotification({
                            type: 'success',
                            title: title,
                            message: body,
                        });

                        // 2. System/Browser Push Notifications
                        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                            if (navigator.serviceWorker && navigator.serviceWorker.ready) {
                                const registration = await navigator.serviceWorker.ready;
                                if (registration && registration.showNotification) {
                                    registration.showNotification(title, {
                                        body: body,
                                        icon: window.location.origin + '/flkrd-icon.png',
                                        badge: window.location.origin + '/flkrd-icon.png',
                                        image: `https://image.tmdb.org/t/p/w500${latestMovie.backdrop_path}`,
                                        vibrate: [200, 100, 200],
                                        data: {
                                            url: `/#/details/movie/${latestMovie.id}`
                                        }
                                    } as any);
                                }
                            } else {
                                new Notification(title, {
                                    body: body,
                                    icon: window.location.origin + '/flkrd-icon.png',
                                });
                            }
                        }
                        
                        localStorage.setItem('flkrd_last_notified_id', String(latestMovie.id));
                    }
                }
            } catch (e) {
                console.warn("Notification sync failed", e);
            }
        };

        checkForNewContent();
        const interval = setInterval(checkForNewContent, 300000); // Poll every 5 minutes for real-time feel
        return () => clearInterval(interval);
    }, [t]);

    useEffect(() => {
        try {
            const userAgent = (navigator.userAgent || navigator.vendor || (window as any).opera || "").toLowerCase();
            const isIOS = /ipad|iphone|ipod/.test(userAgent) && !(window as any).MSStream;
            const isMac = /macintosh|macintel|macppc|mac68k/.test(userAgent);
            const isAppleDevice = isIOS || isMac || (typeof document !== 'undefined' && "ontouchend" in document);

            const nav: any = window.navigator;
            const isStandalone = nav && (nav.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));

            if (isAppleDevice && !isStandalone) {
                const dismissedTime = localStorage.getItem('flkrd_ios_prompt_dismissed');
                const now = Date.now();

                let shouldPrompt = true;
                if (dismissedTime) {
                    const dTime = parseInt(dismissedTime);
                    if (!isNaN(dTime)) {
                        const sevenDays = 7 * 24 * 60 * 60 * 1000;
                        shouldPrompt = (now - dTime) > sevenDays;
                    }
                }

                if (shouldPrompt) {
                    const timer = setTimeout(() => setShowIOSPrompt(true), 25000);
                    return () => clearTimeout(timer);
                }
            }
        } catch (e) {
            console.warn("Apple detection logic failure", e);
        }
    }, []);

    // Direct pathname '/doc' SPA redirection to HashRouter '/#/doc'
    useEffect(() => {
        if (window.location.pathname === '/doc' || window.location.pathname === '/doc/') {
            window.location.replace('/#/doc');
        }
    }, []);

    // Background Update Check Engine
    useEffect(() => {
        const checkAppUpdates = async () => {
            try {
                const result = await updateService.checkForUpdates();
                if (result.updateAvailable) {
                    // Elegantly toast notification to the user
                    addNotification({
                        type: 'info',
                        title: language === 'ku' ? 'نوێکاری گرنگ بەردەستە' : 'System Update Available',
                        message: language === 'ku' 
                            ? `وەشانی ${result.latestVersion} بەردەستە. بۆ جێبەجێکردنی نوێکاری سەردانی ڕێکخستن بکە.`
                            : `Version ${result.latestVersion} is ready. Visit Settings to execute the system update.`
                    });
                }
            } catch (e) {
                console.warn("[BACKGROUND UPDATER] Update check failed:", e);
            }
        };

        // Delay checking to let core database query and splash screen animations run smoothly
        const timer = setTimeout(checkAppUpdates, 5000);
        return () => clearTimeout(timer);
    }, [language, addNotification]);

    return (
        <MotionConfig reducedMotion={isPerformanceMode ? "always" : "user"}>
            <div className={`h-screen w-screen overflow-hidden bg-black transition-colors duration-500 text-[var(--text-primary)] ${theme === 'dark' || theme === 'light' ? 'bg-[var(--bg-primary)]' : 'bg-transparent'} flex flex-col`} dir={language === 'ku' ? 'rtl' : 'ltr'}>
                <AnimatePresence mode="wait">
                    {loading && <SplashScreen key="splash" onComplete={() => setLoading(false)} />}
                </AnimatePresence>
                <DesktopTitleBar />
                <PremiumBackground />
                <HashRouter>
                    <div className="flex flex-1 h-full overflow-hidden relative">
                        <Sidebar />
                        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden pt-10 tauri-only-pt">
                            <Header scrolled={scrolled} />
                            <ChunkErrorBoundary>
                              <React.Suspense fallback={
                                <div className="flex-1 flex flex-col items-center justify-center h-[70vh] gap-6">
                                  <Spinner size="lg" />
                                </div>
                              }>
                                  <main ref={mainRef} className="flex-1 overflow-y-auto console-perspective-container">
                                      <Routes>
                                          <Route path="/" element={<HomePage />} />
                                          <Route path="/tv" element={<TVShowsPage />} />
                                          <Route path="/dubbed" element={<DubbedMoviesPage />} />
                                          <Route path="/discover" element={<DiscoverPage />} /><Route path="/discover/:selection" element={<DiscoverPage />} />
                                          <Route path="/shorts" element={<ShortsPage />} />
                                          <Route path="/kurdish-cc" element={<KurdishCCPage />} />
                                          <Route path="/studios" element={<StudiosListPage />} /><Route path="/studio/:id/:name" element={<StudioPage />} />
                                          <Route path="/details/movie/:id" element={<DetailPage />} /><Route path="/details/tv/:id" element={<TVDetailPage />} />
                                          <Route path="/dubbed-details/:id" element={<DubbedDetailPage />} />
                                          <Route path="/search" element={<SearchPage />} /><Route path="/my-list" element={<MyListPage />} />
                                          <Route path="/continue-watching" element={<ContinueWatchingPage />} />
                                          <Route path="/profile" element={<ProfilePage />} />
                                          <Route path="/watch/:ticket_id" element={<WatchRoomPage />} />
                                          <Route path="/doc" element={<DocPage />} />
                                      </Routes>
                                  </main>
                              </React.Suspense>
                            </ChunkErrorBoundary>
                        </div>
                        <MobileNav />
                    </div>
                    <ContinueWatchingPortal />
                    <WelcomeNotificationPrompt />
                    <AnimatePresence>{showIOSPrompt && <IOSInstallPrompt onClose={() => setShowIOSPrompt(false)} />}</AnimatePresence>
                    <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
                    <GamepadHints />
                    {!isTauri() && import.meta.env.PROD && <SpeedInsights />}
                </HashRouter>
            </div>
        </MotionConfig>
    );
};

export default App;