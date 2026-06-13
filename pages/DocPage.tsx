import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Shield, FileText, Layers, Cpu, Laptop, Smartphone, Apple, 
  RefreshCw, ArrowLeft, ExternalLink, Activity, Check, Settings, AlertCircle, 
  Sparkles, Globe, ShieldCheck, HelpCircle, Monitor, ArrowRight, User,
  Search, Play, Tv, Terminal, Database, Server, HardDrive, Key, Lock, Scale
} from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';

type Tab = 'flow' | 'tutorials' | 'tech' | 'legal' | 'privacy';
type DocLanguage = 'en' | 'ku' | 'badini';

const DocPage: React.FC = () => {
  const { language: appLang } = useTranslation();
  const { accentColor, glassConfig = {
    redOpacity: 0.15,
    darkOpacity: 0.85,
    blurAmount: 20,
    saturation: 120,
    borderOpacity: 0.1,
    aberrationIntensity: 0.5
  } } = useUI();

  const glassCardStyle = {
    background: `radial-gradient(circle at 50% 0%, rgba(var(--brand-red-rgb), ${glassConfig.redOpacity}), transparent 80%), rgba(10, 10, 10, ${glassConfig.darkOpacity})`,
    backdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
    WebkitBackdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
    borderStyle: 'solid',
    borderColor: `rgba(var(--brand-red-rgb), ${glassConfig.borderOpacity})`,
    borderRadius: '2.5rem',
    boxShadow: `
      inset 0 1px 0 0 rgba(255, 255, 255, ${0.12 + glassConfig.borderOpacity * 0.45}),
      inset ${glassConfig.aberrationIntensity * 0.15}px 0 0.5px rgba(255, 0, 80, 0.05),
      inset -${glassConfig.aberrationIntensity * 0.15}px 0 0.5px rgba(0, 200, 255, 0.05),
      0 20px 40px rgba(0, 0, 0, 0.5)
    `,
    transform: 'translate3d(0, 0, 0)',
    willChange: 'transform, border-color'
  };
  
  // Local doc language state, initialized to app language
  const [docLang, setDocLang] = useState<DocLanguage>(() => {
    if (appLang === 'badini') return 'badini';
    if (appLang === 'ku') return 'ku';
    return 'en';
  });

  // Helper to extract query parameters from either standard search params (web) or hash params (tauri)
  const getQueryParam = (name: string): string | null => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has(name)) {
      return searchParams.get(name);
    }
    const hashPart = window.location.hash.split('?')[1] || '';
    const hashParams = new URLSearchParams(hashPart);
    return hashParams.get(name);
  };

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const tabParam = getQueryParam('tab') as Tab;
    if (tabParam === 'terms' as any || tabParam === 'license' as any || tabParam === 'legal' as any) return 'legal';
    return ['flow', 'tutorials', 'tech', 'legal', 'privacy'].includes(tabParam) ? tabParam : 'flow';
  });

  const [selectedNode, setSelectedNode] = useState<string | null>('client');
  const [legalDoc, setLegalDoc] = useState<'terms' | 'fairuse' | 'mit' | 'apache' | 'dmca'>(() => {
    const tabParam = getQueryParam('tab');
    const docParam = getQueryParam('doc');
    if (docParam === 'mit' || docParam === 'apache' || docParam === 'fairuse' || docParam === 'dmca') return docParam as any;
    if (tabParam === 'license' || tabParam === 'mit') return 'mit';
    return 'terms';
  });

  // Listen to tab changes in query params or set manually
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    
    const isTauriEnv = !!(window as any).__TAURI_INTERNALS__;
    if (isTauriEnv) {
      const baseUrl = window.location.hash.split('?')[0] || '#/doc';
      window.location.hash = `${baseUrl}?tab=${tab}`;
    } else {
      const newUrl = `${window.location.pathname}?tab=${tab}`;
      window.history.replaceState(null, '', newUrl);
    }
  };

  // Extensive system translations and content
  const text = {
    en: {
      backHome: "Back to Home",
      createdBy: "CREATED BY ZANA FAROQ",
      poweredBy: "POWERED BY FLKRD STUDIO",
      title: "FLKRD SYSTEMS HUB",
      subtitle: "Unified Cinematic Network Architecture & Technical Manual",
      verifiedBadge: "VERIFIED SYSTEM CORE V5.5.1.25",
      authorBioTitle: "Zana Faroq — Architectural Lead",
      authorBioDesc: "As the founder and chief engineer of FLKRD STUDIO, Zana Faroq designed and engineered the entire unified streaming ecosystem. From the highly optimized, locked 60+ FPS clientside player and localized right-to-left (RTL) translation layers, to custom subtitle rankers and sandboxed CORS gateways, Zana Faroq has built this cinematic portal to set a new benchmark in modern visual entertainment for Kurdish audiences globally.",
      tabFlow: "Ecosystem Flow Map",
      tabTutorials: "System Tutorials",
      tabTech: "App Architecture & Tech Stack",
      tabLegal: "Licenses & Legal Hub",
      tabPrivacy: "Privacy Policy",
      
      // Node description texts
      nodeInspectorTitle: "Active Node Inspector",
      nodeIntegrity: "Node Integrity: 100% Operational",
      liveTraffic: "Data Packet Flow: Active & Healthy",
      specifications: "Technical Specifications",
      operationalStatus: "Node Status",
      activeEngine: "Routing Engine",
      nodeLatency: "Network Latency",

      // Tech Stack
      techTitle: "FLKRD Studio Stack Overview",
      techDesc: "Explore the state-of-the-art technologies underpinning the FLKRD Cinematic Engine. Every layer is carefully curated to achieve optimal compression, locked framerates, and bypass CORS limits.",
      
      // Tutorials
      tutorialsTitle: "Universal Application Guides",
      tutorialsDesc: "Master the FLKRD platform. Read these comprehensive, step-by-step guides detailing player controls, semantic search indexing, closed captions, and native hardware wrappers.",
      
      // Legal
      legalTitle: "Official Legal & Licensing Hub",
      legalDesc: "Welcome to the FLKRD legal portal. This section compiles proprietary terms, Fair Use disclaimers, open-source attributions, and DMCA Safe Harbor guidelines.",
      
      // Privacy
      privacyTitle: "Privacy & Data Protection Principles",
      privacyDesc: "FLKRD is engineered with a local-first philosophy. We respect your digital boundaries, storing watch metadata on your device and using zero-log SSL tunnels."
    },
    ku: {
      backHome: "گەڕانەوە بۆ سەرەکی",
      createdBy: "دروستکراوە لەلایەن زانا فارووق",
      poweredBy: "بەهێزکراوە لەلایەن ستۆدیۆی فڵکرد",
      title: "تەلارسازی فڵکرد",
      subtitle: "ناوەندی گشتی سیستم، مۆڵەتە یاساییەکان و فێرکارییە تەکنیکییەکان",
      verifiedBadge: "وەشانی باوەڕپێکراوی سێرڤەر v5.5.1.25",
      authorBioTitle: "زانا فارووق — ئەندازیاری سەرەکی سیستم",
      authorBioDesc: "وەک دامەزرێنەر و سەرۆکی ئەندازیارانی FLKRD STUDIO، زانا فارووق دیزاین و تەلارسازی سەرجەم بەشەکانی ئەم پڕۆژەیەی کردووە. لە پەرەپێدانی ڕووکاری شوشەیی زۆر خێرا لەسەر 60+ FPS و دروستکردنی باشترین سیستەمی زمانی کوردی (ڕاست-بۆ-چەپ)، تا دەگات بە کۆدەکانی پاشەکەوتکردنی ژێرنووس و تێپەڕاندنی بلۆکی CORSی وێبگەڕەکان، زانا فارووق ئەم ئەپەی ڕێکخستووە بۆ پێشکەشکردنی نایابترین کوالێتی بە بینەرانی کورد لە سەرانسەری جیهان.",
      tabFlow: "نەخشەی ڕێڕەوی سیستم",
      tabTutorials: "فێرکاری و ڕێنماییەکان",
      tabTech: "زمان و تەکنەلۆژیاکان",
      tabLegal: "مۆڵەتنامەکان و DMCA",
      tabPrivacy: "پاراستنی زانیارییەکان",
      
      nodeInspectorTitle: "پشکنەری نۆدی چالاک",
      nodeIntegrity: "بارودۆخی نۆد: ١٠٠٪ چالاک و بێ کێشە",
      liveTraffic: "هاتووچۆی داتا: ڕێکوپێک و خێرا",
      specifications: "زانیارییە تەکنیکییەکان",
      operationalStatus: "دۆخی نۆد",
      activeEngine: "مەکینەی کارپێکەر",
      nodeLatency: "خێرایی گەیاندنی داتا",

      techTitle: "زمان و تەکنەلۆژیاکانی پڕۆژەکە",
      techDesc: "ئەو زمان و کەرەستانەی پڕۆژەی فڵکردی لەسەر بنیادنراوە بخوێنەرەوە. هەر کەرەستەیەک بە وردی هەڵبژێردراوە بۆ مسۆگەرکردنی خێراترین کات و کوالێتی پەخش.",
      
      tutorialsTitle: "ڕێنمایی و فێرکارییە گشتییەکان",
      tutorialsDesc: "فێری کارکردنی سەرجەم بەشەکانی ئەپی فڵکرد ببە. لێرەدا بە وردی هەنگاوەکانی گەڕان، کارپێکردنی ڤیدیۆ، دانانی ژێرنووس و دامەزراندنی ئەپەکە لەسەر ئامێرە جیاوازەکان نیشان دراوە.",
      
      legalTitle: "بەشی یاسایی و مۆڵەتنامە فەرمییەکان",
      legalDesc: "بەخێربێن بۆ بەشی یاسایی فڵکرد. لێرەدا مەرجەکانی بەکارهێنان، یاسای بەکارهێنانی دادپەروەرانە (Fair Use)، مۆڵەتە سەرچاوە کراوەکان و ڕێنماییەکانی DMCA بە وردی نیشان دراون.",
      
      privacyTitle: "یاسا و پاراستنی نهێنییەکانی بەکارهێنەر",
      privacyDesc: "فڵکرد لەسەر بنەمای پاراستنی تەواوی زانیارییەکانت دروستکراوە. تەواوی داتای بینینەکانت لەسەر ئامێری خۆت پاشەکەوت دەبێت و سێرڤەرەکانمان هیچ تۆمارێکی بەردەوام ناپارێزن."
    },
    badini: {
      backHome: "گەڕانەوە بۆ سەرەکی",
      createdBy: "هاتیە دروستکرن ژ لایێ زانا فارووق",
      poweredBy: "ب هێزکریێ ستۆدیۆیا فڵکرد",
      title: "تەلارسازیا فڵکرد",
      subtitle: "ناڤەندا گشتیا سیستەمی، مۆڵەتێن یاسایی و فێرکاریێن تەکنیکی",
      verifiedBadge: "وەشانا baوەرپێکریێ سێرڤەری v5.5.1.25",
      authorBioTitle: "زانا فارووق — ئەندازیارێ سەرەکیێ سیستەمی",
      authorBioDesc: "وەک دامەزرێنەر و سەرۆکێ ئەندازیارێن FLKRD STUDIO، زانا فارووق دیزاین و تەلارسازیا هەمی بەشێن ئەڤی پرۆژەیی کریە. ژ دروستکرنا ڕووکارێ شوشەیی زۆر خێرا ل سەر 60+ FPS و باشترین سیستەمێ زمانی کوردی (ڕاست-بۆ-چەپ)، تا دگەهیتە کۆدێن پاراستنا ژێرنووسێ کوردی و دەربازبوونا بەربەستێن CORSێن وێبگەڕان، زانا فارووق ئەڤ ئەپە ڕێکخستیە دا کو باشترین کوالێتی پێشکێشی بینەرێن کورد بکەت ل سەرانسەری جیهانێ.",
      tabFlow: "نەخشێ ڕێڕەوێ سیستەمی",
      tabTutorials: "فێرکاری و ڕێنمایی",
      tabTech: "زمان و تەکنەلۆژیا",
      tabLegal: "مۆڵەتنامە و DMCA",
      tabPrivacy: "پاراستنا پێزانینان",
      
      nodeInspectorTitle: "پشکنەرێ نۆدێ چالاک",
      nodeIntegrity: "بارودۆخێ نۆدێ: ١٠٠٪ چالاکە بێ کێشە",
      liveTraffic: "هاتووچۆیا داتایان: ب دروستی و خێرا",
      specifications: "پێزانینێن تەکنیکی",
      operationalStatus: "دۆخێ نۆدێ",
      activeEngine: "مەکینەیا کارپێکەر",
      nodeLatency: "خێراییا گەیاندنا داتایان",

      techTitle: "زمان و تەکنەلۆژیاێن پرۆژەی",
      techDesc: "ئەو زمان و کەرەستێن پرۆژێ فڵکرد ل سەر هاتیە ئاڤاکرن بخوینە. هەر کەرەستەک ب هووربینی هاتیە هەلبژارتن بۆ مسۆگەرکرنا خێراترین کات و کوالێتیا پەخشێ.",
      
      tutorialsTitle: "ڕێنمایی و فێرکاریێن گشتی",
      tutorialsDesc: "فێری کارکرنا هەمی بەشێن ئەپێ فڵکرد ببە. لێرە دا ب هووربینی پێنگاڤێن گەڕیانێ، کارپێکرنا ڤیدیۆیان، دانانا ژێرنووسان و دامەزراندنا ئەپی ل سەر ئامێران دهێتە نیشادان.",
      
      legalTitle: "پشکا یاسایی و مۆڵەتنامێن فەرمی",
      legalDesc: "بخێرهاتن بۆ پشکا یاساییا فڵکرد. لێرە دا مەرجێن بکارئینانێ، یاسایا بکارئینانا دادپەروەرانە (Fair Use)، مۆڵەتێن سەرچاوە کراوە و ڕێنماییێن DMCA دیار دکەین.",
      
      privacyTitle: "یاسا و پاراستنا تایبەتیا بکاربەران",
      privacyDesc: "فڵکرد ل سەر بنەمایێ پاراستنا پێزانینێن تە هاتیە دروستکرن. هەمی داتایێن تە یێن بینینێ ل سەر ئامێرێ تە دهێنە پاراستن و سێرڤەرێن مە چ تۆماران ناپارێزن."
    }
  };

  const tLocal = (key: keyof typeof text.en) => {
    return text[docLang][key] || text.en[key] || String(key);
  };

  // Node information for Giant Slow Flow Map
  const nodes = {
    search: {
      name: docLang === 'en' ? 'User Search Queries' : docLang === 'ku' ? 'سیستەمی گەڕانی بەکارهێنەر' : 'سیستەمێ گەڕیانا بکاربەری',
      sub: docLang === 'en' ? 'Search Indexer & Autocomplete' : 'کۆدی گەڕان و پێشنیارەکان',
      desc: docLang === 'en' 
        ? 'Intercepts user search inputs instantly. Employs multi-dialect translation and smart spelling mapping. Dynamically processes queries in Latin, English, Sorani, and Badini scripts to index all movie databases in less than 12ms.'
        : docLang === 'ku'
        ? 'پیتەکان و پەیڤەکانی گەڕان ڕاستەوخۆ دەخوێنێتەوە. پشتگیری لە ڕێنووسی عەرەبی کوردی و لاتینی دەکات. پەیوەستە بە بنکەدراوەی زیرەکەوە بۆ پێشنیارکردنی ناونیشانەکان بە کەمتر لە ١٢ میلی چرکە.'
        : 'پیت و پەیڤێن گەڕیانێ ڕاستەوخۆ دخوینیتەڤە. پشتگیریێ ل ڕێنووسا عەرەبی کوردی و لاتینی دکەت. گرێدایە ب بنکەدراوێ زیرەک ڤە بۆ پێشنیارکرنا ناڤان ب کێمتری ١٢ میلی چرکە.',
      stats: [
        { label: 'Process Speed', val: '< 12ms' },
        { label: 'Dialect Routing', val: 'Triple Language Sync' },
        { label: 'Fuzzy Matcher', val: 'Active (Levenshtein)' }
      ]
    },
    client: {
      name: docLang === 'en' ? 'User Client (App Frontend)' : docLang === 'ku' ? 'ئەپی بەکارهێنەر (ڕووکار)' : 'ئەپێ بکاربەری (ڕووکار)',
      sub: docLang === 'en' ? '60+ FPS Smooth UI Engine' : 'ڕووکاری شوشەیی زۆر خێرا',
      desc: docLang === 'en' 
        ? 'The user interface built using highly optimized React & Framer Motion. Runs at a locked 60+ FPS on low-end devices by offloading repaint storms, managing glassmorphism layouts, and storing dynamic states locally.'
        : docLang === 'ku'
        ? 'ڕووکاری کارپێکردنی ئەپەکە کە بە React پەرەی پێدراوە. کاردەکات بە خێرایی 60+ FPS لەسەر ئامێرە لاوازەکانیش بەهۆی کەمکردنەوەی باری وێبگەڕ و بەکارهێنانی شێوازەکانی ڕێکخستنی خێرا.'
        : 'ڕووکارێ کارپێکرنا ئەپی کو ب React هاتیە دروستکرن. کار دکەت ب خێراییا 60+ FPS ل سەر ئامێرێن لاواز ژی ب ڕێیا کێمکرنا باری وێبگەڕی و بکارئینانا شێوازێن خێراکرنێ.',
      stats: [
        { label: 'FPS Target', val: '60+ Locked' },
        { label: 'Local Store', val: 'Client encrypted' },
        { label: 'Theme Core', val: 'Liquid Glass Theme' }
      ]
    },
    proxy: {
      name: docLang === 'en' ? 'Tauri Proxy / CORS Gateway' : docLang === 'ku' ? 'پرۆکسی و دەروازەی CORS' : 'پرۆکسی و دەروازێ CORS',
      sub: docLang === 'en' ? 'Tauri HTTP / Vercel Edge Serverless' : 'شکێنەری بەربەستەکانی وێبگەڕ',
      desc: docLang === 'en' 
        ? 'Bypasses browser CORS sandbox restrictions. In desktop app packages (Tauri), it routes requests directly through native C++/Rust sockets via Tauri HTTP plugin. In browser, it tunnels safely through Vercel Edge Serverless endpoints.'
        : docLang === 'ku'
        ? 'بەربەستەکانی CORSی وێبگەڕ تێکدەشکێنێت. لەسەر ماک و ویندۆز لەڕێگەی نۆدی ڕوستی ئەپەکەوە (Tauri HTTP plugin) کاردەکات و لەسەر وێبیش لەڕێگەی پرۆکسی سێرڤەرلێسی Vercelەوە بەستەرەکان دەخوێنێتەوە.'
        : 'بەربەستێن CORSێن وێبگەڕی تێکدەشکێنیت. ل سەر ماک و ویندۆزێ ب ڕێیا نۆدێ ڕوستی یێ ئەپی (Tauri HTTP plugin) کار دکەت و ل سەر وێبێ ژی ب پرۆکسیا Vercel سێرڤەرلێس لینک کارا دکەت.',
      stats: [
        { label: 'Bypass Integrity', val: '100% Reliable' },
        { label: 'Bypass Protocol', val: 'HTTP/3 Tunnel' },
        { label: 'Data Encryption', val: 'AES-256 SSL' }
      ]
    },
    tmdb: {
      name: docLang === 'en' ? 'Metadata TMDB Node' : docLang === 'ku' ? 'بنکەدراوەی زانیاری TMDB' : 'بنکەدراوێ پێزانینێن TMDB',
      sub: docLang === 'en' ? 'TMDB API v3 Indexer' : 'زانیاری و پۆستەرەکان',
      desc: docLang === 'en' 
        ? 'Retrieves rich metadata, movie covers, casting biographies, high-definition posters, and multi-dialect descriptions. Integrates local caching and mirrors to prevent rate limits.'
        : docLang === 'ku'
        ? 'زانیاری دەربارەی فیلمەکان، کورتە، ئەکتەرەکان و پۆستەری ڕوون باردەکات. بەستراوەتەوە بە سیستەمی پاشەکەوتکردنی کاتی بۆ ڕێگری لە بلۆکبوون.'
        : 'پێزانینان ل سەر فیلمی، کورتە، ئەکتەر و پۆستەرێ ڕوون بار دکەت. گرێدایە ب سیستەمێ پاراستنا کاتی بۆ ڕێگریکرن ژ بلۆککرنێ.',
      stats: [
        { label: 'Cache TTL', val: '24 Hours' },
        { label: 'Backup Nodes', val: '3 Mirror APIs' },
        { label: 'Translation Sync', val: 'Dynamic Fallback' }
      ]
    },
    servers: {
      name: docLang === 'en' ? 'FLKRD Video Servers (1-5 Cluster)' : docLang === 'ku' ? 'کۆمەڵەی سێرڤەرەکانی ڤیدیۆ' : 'کۆمەڵەیا سێرڤەرێن ڤیدیۆ',
      sub: docLang === 'en' ? 'Multiplexed CDN mirrors' : 'سێرڤەرەکانی پەخشکردنی فڵکرد',
      desc: docLang === 'en' 
        ? 'A high-speed streaming cluster consisting of 5 distributed servers. Automatically scrapes stream paths, indexes direct HLS/MP4 streams, and routes traffic through Server 4 (CinePro UHD) to ensure maximum 4K playback quality.'
        : docLang === 'ku'
        ? 'تۆڕێکی خێرا لە ٥ سێرڤەری سەرەکی پەخشی ڤیدیۆ. بە شێوەیەکی داینامیکی بەستەرەکان دەخوێنێتەوە و سێرڤەری ٤ (کۆدی تایبەت بە 4K) دەخاتە پێشەنگ بۆ دابینکردنی بەرزترین کوالێتی.'
        : 'تۆڕەکا خێرا ژ ٥ سێرڤەرێن سەرەکیێن پەخشێ ڤیدیۆیان. خۆکارانە لینکێن پەخشێ دخوینیت و سێرڤەرێ ٤ (کۆدێ تایبەت یێ 4K) دکەتە پێشەنگ بۆ باشترین کوالێتی.',
      stats: [
        { label: 'Server 4 Core', val: 'CinePro 4K Ultra' },
        { label: 'Auto Failover', val: 'Active (Next Stream)' },
        { label: 'Load Balancer', val: 'CDN Geolocation' }
      ]
    },
    subtitles: {
      name: docLang === 'en' ? 'Kurdish Subtitle Engine' : docLang === 'ku' ? 'مەکینەی ژێرنووسی کوردی' : 'مەکینەیا ژێرنووسێ کوردی',
      sub: docLang === 'en' ? 'OpenSubtitles & Local Databases' : 'ڕێکخەری زمانی کوردی بۆ فیلمەکان',
      desc: docLang === 'en' 
        ? 'Scrapes OpenSubtitles and private resources. If Kurdish closed captions are detected, it assigns a +1000 score boost, automatically registers badges, and embeds them directly into player parameters.'
        : docLang === 'ku'
        ? 'پشکنینی ژێرنووسە کوردییەکان دەکات لە سەرچاوە گشتی و تایبەتەکانەوە. ئەگەر ژێرنووسی کوردی هەبێت، نمرەی سێرڤەرەکە بە +١٠٠٠ نمرە بەرزدەکاتەوە بۆ بینینی ئاسان.'
        : 'پشکنینا ژێرنووسێن کوردی دکەت د سەرچاوێن گشتی و تایبەت دا. هەکە ژێرنووس هەبیت, نمرەیا سێرڤەری ب +١٠٠٠ بەرز دکەت بۆ دیتنەکا ئاسان.',
      stats: [
        { label: 'Ranking Boost', val: '+1000 Score' },
        { label: 'Formats supported', val: 'SRT, VTT, ASS' },
        { label: 'Auto Translation', val: 'Sorani & Badini' }
      ]
    },
    player: {
      name: docLang === 'en' ? 'Media Player Pipeline' : docLang === 'ku' ? 'هێڵی کارپێکەری ڤیدیۆ' : 'هێڵا کارپێکەرا ڤیدیۆیێ',
      sub: docLang === 'en' ? 'Hardware-accelerated decoder' : 'سیستەمی خوێندنەوەی ڤیدیۆکان',
      desc: docLang === 'en' 
        ? 'Directs the decrypted stream packets to the universal playback wrapper. Handles real-time video buffer metrics, GPU-accelerated decoding, aspect ratio controls, and sound rendering to deliver zero-lag playback.'
        : docLang === 'ku'
        ? 'بەرپرسە لە خوێندنەوەی ڤیدیۆکە لەسەر شاشە. کۆنترۆڵی خێراکردنی ڕەقەکاڵای ئامێرەکە دەکات بۆ ڕێگری لە لەرینەوەی ڤیدیۆ و پاشەکەوتکردنی بەردەوام.'
        : 'بەرپرسە ژ خوێندنا ڤیدیۆیێ ل سەر شاشێ. کۆنترۆلا خێراکرنا ڕەقەکالایێ دکەت بۆ ڕێگریکرن د لەرین و وەستانا ڤیدیۆیێ دا.',
      stats: [
        { label: 'Decoders', val: 'HEVC / H.264 / AV1' },
        { label: 'GPU Decoding', val: 'Active (Hardware)' },
        { label: 'Adaptive Buffer', val: 'Auto (60s Chunk)' }
      ]
    }
  };

  const selectedNodeData = selectedNode ? nodes[selectedNode as keyof typeof nodes] : null;

  // Sync state for tab updates
  const handleLegalDocChange = (doc: typeof legalDoc) => {
    setLegalDoc(doc);
    const isTauriEnv = !!(window as any).__TAURI_INTERNALS__;
    if (isTauriEnv) {
      const baseUrl = window.location.hash.split('?')[0] || '#/doc';
      window.location.hash = `${baseUrl}?tab=legal&doc=${doc}`;
    } else {
      const newUrl = `${window.location.pathname}?tab=legal&doc=${doc}`;
      window.history.replaceState(null, '', newUrl);
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-gray-200 overflow-x-hidden relative" dir={docLang === 'en' ? 'ltr' : 'rtl'}>
      {/* Background radial glowing meshes */}
      <div className="absolute top-[-10%] left-[-15%] w-[60%] h-[60%] rounded-full bg-[var(--brand-red)]/10 blur-[180px] pointer-events-none" style={{ backgroundColor: `${accentColor}12` }} />
      <div className="absolute bottom-[-10%] right-[-15%] w-[60%] h-[60%] rounded-full bg-[var(--brand-red)]/5 blur-[180px] pointer-events-none" style={{ backgroundColor: `${accentColor}06` }} />
      <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full bg-blue-500/[0.03] blur-[150px] pointer-events-none" />

      {/* Header bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <a 
          href="/#/" 
          className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 px-4 py-2.5 rounded-full"
        >
          <ArrowLeft size={12} className={docLang === 'en' ? 'mr-1' : 'ml-1'} />
          {tLocal('backHome')}
        </a>

        {/* Floating 3-Language Selector Pill */}
        <div className="flex items-center gap-1.5 p-1 rounded-full border backdrop-blur-md transition-all duration-300"
             style={{
               background: `rgba(10, 10, 10, ${glassConfig.darkOpacity})`,
               backdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
               WebkitBackdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
               borderColor: `rgba(var(--brand-red-rgb), ${glassConfig.borderOpacity})`,
               boxShadow: `inset 0 1px 0 0 rgba(255, 255, 255, ${0.1 + glassConfig.borderOpacity * 0.25})`
             }}
        >
          {(['en', 'ku', 'badini'] as DocLanguage[]).map((lang) => (
            <button
              key={lang}
              onClick={() => {
                setDocLang(lang);
                // Also trigger selection on selected nodes
                setSelectedNode(selectedNode);
              }}
              className="text-[9px] font-black uppercase px-3.5 py-2 rounded-full transition-all"
              style={{
                backgroundColor: docLang === lang ? accentColor : 'transparent',
                color: docLang === lang ? '#fff' : 'rgba(255,255,255,0.4)',
              }}
            >
              {lang === 'en' ? 'EN' : lang === 'ku' ? 'سۆرانی' : 'بادینی'}
            </button>
          ))}
        </div>
      </header>

      {/* Massive Hero & Credits Section */}
      <section className="relative w-full max-w-7xl mx-auto px-6 pt-16 pb-12 flex flex-col items-center text-center overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900/40 via-transparent to-transparent pointer-events-none" />
        
        {/* Verification badge */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.02] border border-white/10 text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          {tLocal('verifiedBadge')}
        </motion.div>

        {/* Huge Typography Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="space-y-4 max-w-4xl z-10"
        >
          <span className="text-[11px] md:text-xs font-black tracking-[0.4em] uppercase text-gray-500 block">
            {tLocal('createdBy')}
          </span>
          <h1 className="text-4xl md:text-7xl font-[1000] uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-300 to-gray-500 italic">
            FLKRD STUDIO PORTAL
          </h1>
          <p className="text-sm md:text-lg text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed">
            {tLocal('subtitle')}
          </p>
        </motion.div>

        {/* Animated Orbs */}
        <div className="absolute top-[40%] w-[300px] h-[300px] rounded-full filter blur-[100px] opacity-10 mix-blend-screen pointer-events-none" style={{ backgroundColor: accentColor }} />

        {/* Studio Branding */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="mt-8 text-[9px] font-black uppercase tracking-[0.5em] text-gray-400 border border-white/5 bg-white/[0.01] px-6 py-3 rounded-full backdrop-blur-md"
        >
          {tLocal('poweredBy')}
        </motion.div>
      </section>

      {/* Main Grid Portal */}
      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
        
        {/* Side Panel (Navigation) */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="border rounded-[2.5rem] p-6 backdrop-blur-xl sticky top-28 space-y-8 transition-all duration-500 overflow-hidden relative"
               style={{
                 background: `radial-gradient(circle at 50% 0%, rgba(var(--brand-red-rgb), ${glassConfig.redOpacity}), transparent 80%), rgba(10, 10, 10, ${glassConfig.darkOpacity})`,
                 backdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
                 WebkitBackdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
                 borderColor: `rgba(var(--brand-red-rgb), ${glassConfig.borderOpacity})`,
                 boxShadow: `
                   inset 0 1px 0 0 rgba(255, 255, 255, ${0.12 + glassConfig.borderOpacity * 0.45}),
                   inset ${glassConfig.aberrationIntensity * 0.15}px 0 0.5px rgba(255, 0, 80, 0.05),
                   inset -${glassConfig.aberrationIntensity * 0.15}px 0 0.5px rgba(0, 200, 255, 0.05),
                   0 20px 40px rgba(0, 0, 0, 0.5)
                 `,
                 transform: 'translate3d(0, 0, 0)'
               }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                <BookOpen size={18} style={{ color: accentColor }} />
              </div>
              <div>
                <h3 className="text-[11px] font-black uppercase text-white tracking-widest">{tLocal('title')}</h3>
                <span className="text-[7.5px] font-black text-gray-500 uppercase tracking-widest mt-0.5 block">FLKRD CORE SYSTEMS</span>
              </div>
            </div>

            {/* Menu Tabs */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleTabChange('flow')}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-wider text-left transition-all ${
                  activeTab === 'flow' 
                    ? 'bg-white/5 border-white/10 text-white' 
                    : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.01]'
                }`}
                style={activeTab === 'flow' ? { borderRight: docLang !== 'en' ? `3px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)', borderLeft: docLang === 'en' ? `3px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)' } : {}}
              >
                <Layers size={14} style={{ color: activeTab === 'flow' ? accentColor : undefined }} />
                {tLocal('tabFlow')}
              </button>

              <button
                onClick={() => handleTabChange('tutorials')}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-wider text-left transition-all ${
                  activeTab === 'tutorials' 
                    ? 'bg-white/5 border-white/10 text-white' 
                    : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.01]'
                }`}
                style={activeTab === 'tutorials' ? { borderRight: docLang !== 'en' ? `3px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)', borderLeft: docLang === 'en' ? `3px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)' } : {}}
              >
                <HelpCircle size={14} style={{ color: activeTab === 'tutorials' ? accentColor : undefined }} />
                {tLocal('tabTutorials')}
              </button>

              <button
                onClick={() => handleTabChange('tech')}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-wider text-left transition-all ${
                  activeTab === 'tech' 
                    ? 'bg-white/5 border-white/10 text-white' 
                    : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.01]'
                }`}
                style={activeTab === 'tech' ? { borderRight: docLang !== 'en' ? `3px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)', borderLeft: docLang === 'en' ? `3px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)' } : {}}
              >
                <Cpu size={14} style={{ color: activeTab === 'tech' ? accentColor : undefined }} />
                {tLocal('tabTech')}
              </button>

              <button
                onClick={() => handleTabChange('legal')}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-wider text-left transition-all ${
                  activeTab === 'legal' 
                    ? 'bg-white/5 border-white/10 text-white' 
                    : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.01]'
                }`}
                style={activeTab === 'legal' ? { borderRight: docLang !== 'en' ? `3px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)', borderLeft: docLang === 'en' ? `3px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)' } : {}}
              >
                <ShieldCheck size={14} style={{ color: activeTab === 'legal' ? accentColor : undefined }} />
                {tLocal('tabLegal')}
              </button>

              <button
                onClick={() => handleTabChange('privacy')}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-wider text-left transition-all ${
                  activeTab === 'privacy' 
                    ? 'bg-white/5 border-white/10 text-white' 
                    : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.01]'
                }`}
                style={activeTab === 'privacy' ? { borderRight: docLang !== 'en' ? `3px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)', borderLeft: docLang === 'en' ? `3px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)' } : {}}
              >
                <Shield size={14} style={{ color: activeTab === 'privacy' ? accentColor : undefined }} />
                {tLocal('tabPrivacy')}
              </button>
            </div>

            {/* Creator Bio Card (Zana Faroq) */}
            <div className="border-t border-white/5 pt-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <User size={16} style={{ color: accentColor }} />
                </div>
                <div>
                  <span className="text-[8px] font-black uppercase text-gray-500 tracking-wider block">{tLocal('authorBioTitle').split('—')[1]?.trim() || "Lead Engineer"}</span>
                  <span className="text-[11px] font-black text-white block">Zana Faroq</span>
                </div>
              </div>
              <p className="text-[9px] text-gray-400 font-medium leading-relaxed bg-white/[0.01] p-4 rounded-2xl border border-white/5 text-justify">
                {tLocal('authorBioDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* Content Container Area */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            
            {/* ── TAB: FLOW MAP ── */}
            {activeTab === 'flow' && (
              <motion.div
                key="flow-tab"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="p-8 md:p-10 backdrop-blur-xl" style={glassCardStyle}>
                  <div className="flex items-center gap-3.5 mb-4">
                    <Sparkles size={20} style={{ color: accentColor }} />
                    <h2 className="text-xl md:text-2xl font-[1000] text-white uppercase italic tracking-tighter">
                      {docLang === 'en' ? 'INTERACTIVE ECOSYSTEM MESH' : docLang === 'ku' ? 'سیستەمی ڕێڕەوی کارکردن' : 'نەخشێ ڕێڕەوێ کارکرنێ'}
                    </h2>
                  </div>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed mb-10">
                    {docLang === 'en' 
                      ? 'Inspect the underlying data pipelines of FLKRD. Hover and click on any network node to display latency parameters, CORS bypass mechanisms, metadata caches, and Kurdish caption boosting logic.'
                      : docLang === 'ku'
                      ? 'لێرەدا تەلارسازی فڵکرد بە شێوەیەکی داینامیکی نیشان دراوە. لەسەر هەر نۆدێک کرتە بکە بۆ پیشاندانی خێرایی، شێوازی تێپەڕاندنی سانسۆری وێبگەڕ و زیادکردنی نمرەی ژێرنووسی کوردی.'
                      : 'لێرە دا تەلارسازیا فڵکرد ب شێوەیەکێ داینامیکی دهێتە نیشادان. کرتێ ل سەر هەر نۆدەکێ بکە بۆ دیتنا خێراییێ، شێوازێ دەربازبوون ژ سانسۆرێن وێبگەڕان و زێدەکرنا نمرەیا ژێرنووسان.'
                    }
                  </p>

                  {/* Desktop Large Animated Network Canvas */}
                  <div className="hidden md:block relative border border-white/5 bg-black/50 rounded-[2.5rem] p-8 overflow-hidden aspect-[1000/600] w-full shadow-inner shadow-black/80">
                    {/* SVG Flow Connecting Lines & Slow Floating Data Particles */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 1000 600" fill="none" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="glow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={accentColor} stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
                        </linearGradient>
                      </defs>

                      {/* Connection Vectors */}
                      <path d="M 100 150 L 100 450" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
                      <path d="M 100 450 L 350 300" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
                      <path d="M 100 150 L 350 300" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
                      <path d="M 350 300 L 600 120" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
                      <path d="M 350 300 L 600 300" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
                      <path d="M 350 300 L 600 480" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
                      <path d="M 600 120 L 880 300" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
                      <path d="M 600 300 L 880 300" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
                      <path d="M 600 480 L 880 300" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />

                      {/* Animated Packets using native SMIL animateMotion (extremely smooth & slow) */}
                      {/* Search -> Client */}
                      <motion.circle r="3" fill={accentColor} style={{ filter: `drop-shadow(0 0 6px ${accentColor})` }}>
                        <animateMotion dur="9s" repeatCount="indefinite" path="M 100 150 L 100 450" />
                      </motion.circle>

                      {/* Client -> Proxy */}
                      <motion.circle r="3" fill="#ffffff" style={{ filter: `drop-shadow(0 0 6px #ffffff)` }}>
                        <animateMotion dur="11s" repeatCount="indefinite" path="M 100 450 L 350 300" />
                      </motion.circle>

                      {/* Proxy -> TMDB */}
                      <motion.circle r="3" fill={accentColor} style={{ filter: `drop-shadow(0 0 6px ${accentColor})` }}>
                        <animateMotion dur="10s" repeatCount="indefinite" path="M 350 300 L 600 120" />
                      </motion.circle>

                      {/* Proxy -> Servers */}
                      <motion.circle r="3" fill={accentColor} style={{ filter: `drop-shadow(0 0 6px ${accentColor})` }}>
                        <animateMotion dur="7s" repeatCount="indefinite" path="M 350 300 L 600 300" />
                      </motion.circle>

                      {/* Proxy -> Subtitle */}
                      <motion.circle r="3" fill="#ffffff" style={{ filter: `drop-shadow(0 0 6px #ffffff)` }}>
                        <animateMotion dur="12s" repeatCount="indefinite" path="M 350 300 L 600 480" />
                      </motion.circle>

                      {/* Servers -> Player */}
                      <motion.circle r="3" fill={accentColor} style={{ filter: `drop-shadow(0 0 6px ${accentColor})` }}>
                        <animateMotion dur="8s" repeatCount="indefinite" path="M 600 300 L 880 300" />
                      </motion.circle>

                      {/* Subtitles -> Player */}
                      <motion.circle r="3" fill="#ffffff" style={{ filter: `drop-shadow(0 0 6px #ffffff)` }}>
                        <animateMotion dur="11s" repeatCount="indefinite" path="M 600 480 L 880 300" />
                      </motion.circle>
                    </svg>

                    {/* Nodes Absolute Layout */}
                    {/* Node 1: Search Queries */}
                    <div className="absolute" style={{ left: '10%', top: '25%', transform: 'translate(-50%, -50%)' }}>
                      <button 
                        onClick={() => setSelectedNode('search')}
                        className={`flex flex-col items-center p-3 rounded-2xl border text-center transition-all bg-black/60 backdrop-blur-md min-w-[130px] ${selectedNode === 'search' ? 'border-white/20' : 'border-white/5 hover:border-white/15'}`}
                        style={selectedNode === 'search' ? { boxShadow: `0 0 20px ${accentColor}22`, borderColor: accentColor } : {}}
                      >
                        <Search size={16} className="mb-2" style={{ color: selectedNode === 'search' ? accentColor : '#a3a3a3' }} />
                        <span className="text-[8px] font-black uppercase text-white tracking-widest">Search Query</span>
                      </button>
                    </div>

                    {/* Node 2: Client */}
                    <div className="absolute" style={{ left: '10%', top: '75%', transform: 'translate(-50%, -50%)' }}>
                      <button 
                        onClick={() => setSelectedNode('client')}
                        className={`flex flex-col items-center p-3 rounded-2xl border text-center transition-all bg-black/60 backdrop-blur-md min-w-[130px] ${selectedNode === 'client' ? 'border-white/20' : 'border-white/5 hover:border-white/15'}`}
                        style={selectedNode === 'client' ? { boxShadow: `0 0 20px ${accentColor}22`, borderColor: accentColor } : {}}
                      >
                        <Smartphone size={16} className="mb-2" style={{ color: selectedNode === 'client' ? accentColor : '#a3a3a3' }} />
                        <span className="text-[8px] font-black uppercase text-white tracking-widest">User Client</span>
                      </button>
                    </div>

                    {/* Node 3: Tauri Proxy */}
                    <div className="absolute" style={{ left: '35%', top: '50%', transform: 'translate(-50%, -50%)' }}>
                      <button 
                        onClick={() => setSelectedNode('proxy')}
                        className={`flex flex-col items-center p-3 rounded-2xl border text-center transition-all bg-black/60 backdrop-blur-md min-w-[140px] ${selectedNode === 'proxy' ? 'border-white/20' : 'border-white/5 hover:border-white/15'}`}
                        style={selectedNode === 'proxy' ? { boxShadow: `0 0 20px ${accentColor}22`, borderColor: accentColor } : {}}
                      >
                        <Cpu size={16} className="mb-2" style={{ color: selectedNode === 'proxy' ? accentColor : '#a3a3a3' }} />
                        <span className="text-[8px] font-black uppercase text-white tracking-widest">Tauri CORS Proxy</span>
                      </button>
                    </div>

                    {/* Node 4: TMDB Node */}
                    <div className="absolute" style={{ left: '60%', top: '20%', transform: 'translate(-50%, -50%)' }}>
                      <button 
                        onClick={() => setSelectedNode('tmdb')}
                        className={`flex flex-col items-center p-3 rounded-2xl border text-center transition-all bg-black/60 backdrop-blur-md min-w-[130px] ${selectedNode === 'tmdb' ? 'border-white/20' : 'border-white/5 hover:border-white/15'}`}
                        style={selectedNode === 'tmdb' ? { boxShadow: `0 0 20px ${accentColor}22`, borderColor: accentColor } : {}}
                      >
                        <Globe size={16} className="mb-2" style={{ color: selectedNode === 'tmdb' ? accentColor : '#a3a3a3' }} />
                        <span className="text-[8px] font-black uppercase text-white tracking-widest">TMDB Meta API</span>
                      </button>
                    </div>

                    {/* Node 5: Video Servers */}
                    <div className="absolute" style={{ left: '60%', top: '50%', transform: 'translate(-50%, -50%)' }}>
                      <button 
                        onClick={() => setSelectedNode('servers')}
                        className={`flex flex-col items-center p-3 rounded-2xl border text-center transition-all bg-black/60 backdrop-blur-md min-w-[140px] ${selectedNode === 'servers' ? 'border-white/20' : 'border-white/5 hover:border-white/15'}`}
                        style={selectedNode === 'servers' ? { boxShadow: `0 0 20px ${accentColor}22`, borderColor: accentColor } : {}}
                      >
                        <Server size={16} className="mb-2" style={{ color: selectedNode === 'servers' ? accentColor : '#a3a3a3' }} />
                        <span className="text-[8px] font-black uppercase text-white tracking-widest">FLKRD Servers (1-5)</span>
                      </button>
                    </div>

                    {/* Node 6: Subtitle Engine */}
                    <div className="absolute" style={{ left: '60%', top: '80%', transform: 'translate(-50%, -50%)' }}>
                      <button 
                        onClick={() => setSelectedNode('subtitles')}
                        className={`flex flex-col items-center p-3 rounded-2xl border text-center transition-all bg-black/60 backdrop-blur-md min-w-[140px] ${selectedNode === 'subtitles' ? 'border-white/20' : 'border-white/5 hover:border-white/15'}`}
                        style={selectedNode === 'subtitles' ? { boxShadow: `0 0 20px ${accentColor}22`, borderColor: accentColor } : {}}
                      >
                        <RefreshCw size={16} className="mb-2" style={{ color: selectedNode === 'subtitles' ? accentColor : '#a3a3a3' }} />
                        <span className="text-[8px] font-black uppercase text-white tracking-widest">Subtitle Engine</span>
                      </button>
                    </div>

                    {/* Node 7: Media Player */}
                    <div className="absolute" style={{ left: '88%', top: '50%', transform: 'translate(-50%, -50%)' }}>
                      <button 
                        onClick={() => setSelectedNode('player')}
                        className={`flex flex-col items-center p-3 rounded-2xl border text-center transition-all bg-black/60 backdrop-blur-md min-w-[130px] ${selectedNode === 'player' ? 'border-white/20' : 'border-white/5 hover:border-white/15'}`}
                        style={selectedNode === 'player' ? { boxShadow: `0 0 20px ${accentColor}22`, borderColor: accentColor } : {}}
                      >
                        <Play size={16} className="mb-2" style={{ color: selectedNode === 'player' ? accentColor : '#a3a3a3' }} />
                        <span className="text-[8px] font-black uppercase text-white tracking-widest">Player Pipeline</span>
                      </button>
                    </div>
                  </div>

                  {/* Mobile Layout (Simple clickable grid list) */}
                  <div className="block md:hidden grid grid-cols-2 gap-3.5">
                    {Object.keys(nodes).map((n) => (
                      <button
                        key={n}
                        onClick={() => setSelectedNode(n)}
                        className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${
                          selectedNode === n 
                            ? 'bg-white/5 border-white/20' 
                            : 'bg-white/[0.01] border-white/5'
                        }`}
                        style={selectedNode === n ? { borderColor: accentColor } : {}}
                      >
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-wider text-white">
                          {nodes[n as keyof typeof nodes].name.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Dynamic Node Inspector Display */}
                  {selectedNodeData && (
                    <motion.div
                      key={selectedNode}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 bg-white/[0.01] border border-white/5 rounded-[2rem] p-6 md:p-8"
                    >
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-5 mb-6">
                        <div>
                          <span className="text-[8px] font-black uppercase text-gray-500 tracking-wider">
                            {tLocal('nodeInspectorTitle')}
                          </span>
                          <h3 className="text-lg font-black text-white uppercase tracking-wide mt-1">
                            {selectedNodeData.name}
                          </h3>
                          <span className="text-[9px] text-gray-400 font-extrabold uppercase mt-0.5 block">
                            {selectedNodeData.sub}
                          </span>
                        </div>

                        {/* Node status pill */}
                        <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-4 py-2 rounded-full border border-green-500/20 text-[9px] font-black uppercase tracking-wider">
                          <Activity size={11} className="animate-pulse" />
                          {tLocal('nodeIntegrity')}
                        </div>
                      </div>

                      <p className="text-xs text-gray-400 font-medium leading-relaxed mb-8 text-justify">
                        {selectedNodeData.desc}
                      </p>

                      <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-4 border-b border-white/5 pb-2">
                        {tLocal('specifications')}
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {selectedNodeData.stats.map((s, idx) => (
                          <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-1.5 hover:bg-white/[0.03] transition-all duration-300">
                            <span className="text-[8.5px] font-black uppercase text-gray-500 tracking-wider">
                              {s.label}
                            </span>
                            <span className="text-xs font-black text-white uppercase tracking-wide">
                              {s.val}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── TAB: TUTORIALS ── */}
            {activeTab === 'tutorials' && (
              <motion.div
                key="tutorials-tab"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="rounded-[2.5rem] p-8 md:p-10 backdrop-blur-xl space-y-8"
                style={glassCardStyle}
              >
                <div className="flex items-center gap-3.5 mb-2">
                  <HelpCircle size={20} style={{ color: accentColor }} />
                  <h2 className="text-xl md:text-2xl font-[1000] text-white uppercase italic tracking-tighter">
                    {tLocal('tutorialsTitle')}
                  </h2>
                </div>
                <p className="text-xs text-gray-400 font-medium leading-relaxed mb-6">
                  {tLocal('tutorialsDesc')}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  {/* Tutorial 1: Search Queries */}
                  <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-4 hover:border-white/10 transition-all duration-300">
                    <div className="flex items-center gap-3.5 border-b border-white/5 pb-4">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                        <Search size={15} style={{ color: accentColor }} />
                      </div>
                      <h3 className="text-xs font-black uppercase text-white tracking-widest">
                        {docLang === 'en' ? 'Searching Across All Pages' : docLang === 'ku' ? 'چۆنیەتی گەڕان بەناو لاپەڕەکاندا' : 'چەوانیا گەڕیانێ د ناڤ لاپەڕان دا'}
                      </h3>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                      {docLang === 'en' 
                        ? 'FLKRD features an optimized global indexing system. The search input instantly scrapes title identifiers from TMDB alongside internal dubbed indices. Kurdish characters are dynamically normalized, allowing Sorani and Badini users to input dialect keywords and receive instant cover-art matches.'
                        : docLang === 'ku'
                        ? 'فڵکرد خاوەن مەکینەیەکی گەڕانی زۆر زیرەکە. کاتێک ناوێک دەنووسیت، سیستمەکە خۆکارانە پیتە کوردییەکان ڕێکدەخاتەوە و لە هەمان کاتدا ناونیشانەکان بە زمانی لاتینی، ئینگلیزی و کوردی دەپشکنێت و کورتە و پۆستەرەکان نیشان دەدات.'
                        : 'فڵکرد خاوەن مەکینەکا گەڕیانێ یا زۆر زیرەکە. دەما ناڤەکی دنویسی, سیستەم خۆکارانە پیتێن کوردی ڕێکدێخیت و ل هەمان کات دا ناڤان ب زمانێ لاتینی، ئینگلیزی و کوردی دپشکنیت و پۆستەران نیشان ددەت.'
                      }
                    </p>
                  </div>

                  {/* Tutorial 2: Codecs & Media Player */}
                  <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-4 hover:border-white/10 transition-all duration-300">
                    <div className="flex items-center gap-3.5 border-b border-white/5 pb-4">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                        <Play size={15} style={{ color: accentColor }} />
                      </div>
                      <h3 className="text-xs font-black uppercase text-white tracking-widest">
                        {docLang === 'en' ? 'How the Video Player works' : docLang === 'ku' ? 'چۆنیەتی کارکردنی پەخشکەرەکە' : 'چەوانیا کارکرنا کارپێکەری'}
                      </h3>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                      {docLang === 'en' 
                        ? 'The universal player connects direct stream sources to a custom HTML5 canvas container. On native shells (macOS/Android), hardware acceleration yields smooth locked 60+ FPS decodings. You can toggle audio streams, adjust play speeds, and force resolutions dynamically.'
                        : docLang === 'ku'
                        ? 'پەخشکەری فڵکرد ڕاستەوخۆ پەخشی ڤیدیۆکان گرێدەداتەوە بە سێرڤەری کوالێتی بەرز. پشتگیری لە خێراکردنی ڕەقەکاڵای مۆبایلەکەت دەکات بۆ ڕێگری لە پچڕانی ڤیدیۆ. دەتوانیت خێرایی پەخش، دەنگ و ڕوونی شاشەکە بە ویستی خۆت بگۆڕیت.'
                        : 'کارپێکەرێ فڵکرد ڕاستەوخۆ پەخشا ڤیدیۆیان گرێددەتەڤە ب سێرڤەرێن کوالێتی بەرز. پشتگیریێ ل خێراکرنا ڕەقەکالایێ دکەت بۆ ڕێگریکرن د وەستانا ڤیدیۆیێ دا. دشێی خێرایی و کوالێتیا پەخشێ بگۆڕی.'
                      }
                    </p>
                  </div>

                  {/* Tutorial 3: Applying Subtitles */}
                  <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-4 hover:border-white/10 transition-all duration-300">
                    <div className="flex items-center gap-3.5 border-b border-white/5 pb-4">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                        <RefreshCw size={15} style={{ color: accentColor }} />
                      </div>
                      <h3 className="text-xs font-black uppercase text-white tracking-widest">
                        {docLang === 'en' ? 'Applying Kurdish Subtitles' : docLang === 'ku' ? 'ڕێکخستنی ژێرنووسی کوردی' : 'ڕێکخستنا ژێرنووسێ کوردی'}
                      </h3>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                      {docLang === 'en' 
                        ? 'If a movie contains Kurdish closed captions, the engine triggers subtitle mapping, ranking it higher with a +1000 score. Users can click the subtitle icon inside the player, select Kurdish Sorani or Badini dialects, adjust text scale overlays, or sync custom offsets.'
                        : docLang === 'ku'
                        ? 'ئەگەر فیلمەکە خاوەن ژێرنووسی کوردی بێت، مەکینەی فڵکرد ڕاستەوخۆ ژێرنووسەکە چالاک دەکات و دەیخاتە پێشەنگ. لە ناو پەخشکەرەکەدا بە داگرتنی ئایکۆنی ژێرنووس دەتوانیت زمانی سۆرانی یان بادینی هەڵبژێریت و قەبارەی دەقەکە و دواکەوتنی ڕێکبخەیت.'
                        : 'هەکە فیلم خاوەن ژێرنووسێ کوردی بیت, مەکینەیا فڵکرد ڕاستەوخۆ ژێرنووسێ چالاک دکەت. دشێی د ناڤ کارپێکەری دا ب لێدانا ئایکۆنێ ژێرنووسێ، زمانی سۆرانی یان بادینی هەلبێخی.'
                      }
                    </p>
                  </div>

                  {/* Tutorial 4: Universal Navigation */}
                  <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-4 hover:border-white/10 transition-all duration-300">
                    <div className="flex items-center gap-3.5 border-b border-white/5 pb-4">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                        <Tv size={15} style={{ color: accentColor }} />
                      </div>
                      <h3 className="text-xs font-black uppercase text-white tracking-widest">
                        {docLang === 'en' ? 'Navigation Guide for All Pages' : docLang === 'ku' ? 'ڕێنمایی گەشتکردن بەنێو لاپەڕەکاندا' : 'ڕێنماییا گەڕیانێ د ناڤ لاپەڕان دا'}
                      </h3>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                      {docLang === 'en' 
                        ? 'Navigate seamlessly across the application. Expand the sidebar to switch between Movies, Dubbed channels, TV Series, and Short clips. The Profile section saves your continue-watching states and bookmarks which sync dynamically across your desktop and mobile wraps.'
                        : docLang === 'ku'
                        ? 'بە ئاسانی بەناو بەشەکانی ئەپەکەدا بگەڕێ. لە ڕێگەی مینیوی لای ڕاستەوە دەتوانیت بچیتە بەشی فیلمەکان، دۆبلاژەکان، دراماکان و کورتە ڤیدیۆکان. لە بەشی پرۆفایلیش دەتوانیت مێژووی بینینەکانت و فیلمە دڵخوازەکانت ببینیتەوە.'
                        : 'ب ئاسانی د ناڤ پشکێن ئەپی دا بگەڕە. ژ لایێ ڕاستێ ڤە دشێی بچیە پشکا فیلم، دۆبلاژ، دراما و کورتە ڤیدیۆیان. د پشکا پرۆفایلی دا مێژوویا تە یا تەماشەکرنێ دهێتە پاراستن.'
                      }
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── TAB: TECH STACK ── */}
            {activeTab === 'tech' && (
              <motion.div
                key="tech-tab"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="rounded-[2.5rem] p-8 md:p-10 backdrop-blur-xl space-y-8"
                style={glassCardStyle}
              >
                <div className="flex items-center gap-3.5 mb-2">
                  <Cpu size={20} style={{ color: accentColor }} />
                  <h2 className="text-xl md:text-2xl font-[1000] text-white uppercase italic tracking-tighter">
                    {tLocal('techTitle')}
                  </h2>
                </div>
                <p className="text-xs text-gray-400 font-medium leading-relaxed">
                  {tLocal('techDesc')}
                </p>

                {/* Grid of Tech Stack Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                  {/* Tauri */}
                  <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 flex flex-col gap-4 hover:border-blue-500/20 transition-all duration-300 hover:bg-blue-950/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Terminal size={14} className="text-blue-400" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-white">Tauri Desktop Shell</span>
                    </div>
                    <p className="text-[9.5px] text-gray-400 font-medium leading-relaxed">
                      {docLang === 'en' 
                        ? 'Enables highly optimized, native macOS, Windows, and Linux standalone application wrappers. Executes Rust-level multi-threaded proxy loops to successfully secure direct video stream packages.'
                        : docLang === 'ku'
                        ? 'ئەپڵیکەیشنی ڕەسەن بۆ ماک، ویندۆز و لینوکس فەراهەم دەکات. کۆدەکانی ڕوست بەکاردێنێت بۆ خوێندنەوەی ڤیدیۆکان و پاراستنی بەستەرەکانی پەخش.'
                        : 'ئەپی سەرەکی بۆ ماک، ویندۆز و لینوکسێ دابین دکەت. کۆدێن ڕوست بەکاردینیت بۆ خواندنا ڤیدیۆیان و پاراستنا لینکێن پەخشێ.'
                      }
                    </p>
                  </div>

                  {/* React 19 & TypeScript */}
                  <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 flex flex-col gap-4 hover:border-cyan-500/20 transition-all duration-300 hover:bg-cyan-950/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                        <Globe size={14} className="text-cyan-400" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-white">React 19 & TS</span>
                    </div>
                    <p className="text-[9.5px] text-gray-400 font-medium leading-relaxed">
                      {docLang === 'en' 
                        ? 'Unified rendering engine providing ultra-fast layout rendering. TypeScript ensures full compilation type-safety and robust data models across all streaming endpoints.'
                        : docLang === 'ku'
                        ? 'بەکارهێنانی وەشانی نوێی ڕیاکت بۆ بارکردنی زۆر خێرای لاپەڕەکان. زمانەکەی تەیپسکریپت مۆدێل و کۆدەکانی ئەپەکە لە هەڵە و لەناوچوون دەپارێزێت.'
                        : 'بکارئینانا وەشانا نوو یا ڕیاکت بۆ بارکرنا زۆر خێرا یا لاپەڕان. زمانێ تەیپسکریپت کۆد و داتایێن ئەپی ژ خەلەتیان دپارێزیت.'
                      }
                    </p>
                  </div>

                  {/* Framer Motion */}
                  <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 flex flex-col gap-4 hover:border-purple-500/20 transition-all duration-300 hover:bg-purple-950/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                        <Sparkles size={14} className="text-purple-400" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-white">Framer Motion</span>
                    </div>
                    <p className="text-[9.5px] text-gray-400 font-medium leading-relaxed">
                      {docLang === 'en' 
                        ? 'Executes fluid 60+ FPS web layout animations. Offloads visual shifts directly to device GPUs to guarantee ultra-premium UI transitions across low-end smartphones.'
                        : docLang === 'ku'
                        ? 'جوڵە نایاب و نێوان لاپەڕەکانی ئەپەکە بە خێرایی 60+ FPS جێبەجێ دەکات. جوڵەکان ڕەوانەی کارتی شاشەی ئامێرەکە دەکات بۆ ڕێگری لە خاوبوونەوە.'
                        : 'بزووتنەوەیێن نایاب د ناڤ لاپەڕان دا ب خێراییا 60+ FPS ڕێکدێخیت. بزووتنەوان ڕەوانەی کارتی شاشە دکەت بۆ ڕێگریکرن د خاوبوونێ دا.'
                      }
                    </p>
                  </div>

                  {/* Vercel */}
                  <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 flex flex-col gap-4 hover:border-neutral-500/20 transition-all duration-300 hover:bg-neutral-950/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-neutral-500/10 flex items-center justify-center border border-neutral-500/20">
                        <HardDrive size={14} className="text-white" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-white">Vercel CDN Gate</span>
                    </div>
                    <p className="text-[9.5px] text-gray-400 font-medium leading-relaxed">
                      {docLang === 'en' 
                        ? 'Deploys static assets across global edge nodes. Operates serverless bypass proxy routes to shield metadata scrapers and bypass rigid browser CORS rules.'
                        : docLang === 'ku'
                        ? 'پەڕگە و کۆدەکان لە سەرانسەری جیهاندا بڵاودەکاتەوە. سێرڤەرلێسەکانی بەکاردێن بۆ تێپەڕاندنی سانسۆری وێب و خوێندنەوەی بەستەرەکانی پەخش.'
                        : 'کۆد و پەڕگان ل سەرانسەری جیهانێ بەلاڤ دکەت. سێرڤەرلێسێن خۆ بەکاردینیت بۆ دەربازبوونا بەربەستێن وێبگەڕی و کارکرنا بەستەران.'
                      }
                    </p>
                  </div>

                  {/* Supabase */}
                  <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 flex flex-col gap-4 hover:border-emerald-500/20 transition-all duration-300 hover:bg-emerald-950/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <Database size={14} className="text-emerald-400" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-white">Supabase Core</span>
                    </div>
                    <p className="text-[9.5px] text-gray-400 font-medium leading-relaxed">
                      {docLang === 'en' 
                        ? 'Supplies transactional PostgreSQL databases. Manages real-time watchroom ticket generation, watch party synchronization, and secure offline client bookmarks backup.'
                        : docLang === 'ku'
                        ? 'بنکەدراوەیەکی بەهێز بۆ پاشەکەوتکردنی داتاکان فەراهەم دەکات. مۆڵەتی ژووری بینینی بەکۆمەڵ (Watch Parties) و ڕێکخستنی کاتی واژووەکانی ئەپەکە ڕێکدەخات.'
                        : 'بنکەدراوەیەکا بهێز بۆ پاراستنا پێزانینان دابین دکەت. مۆڵەتێن ژوورا بینینا ب کۆمەڵ (Watch Parties) و ڕێکخستنا کارێ ئەپی ڕێکدێخیت.'
                      }
                    </p>
                  </div>

                  {/* Cloudflare */}
                  <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 flex flex-col gap-4 hover:border-orange-500/20 transition-all duration-300 hover:bg-orange-950/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <Shield size={14} className="text-orange-400" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-white">Cloudflare Edge</span>
                    </div>
                    <p className="text-[9.5px] text-gray-400 font-medium leading-relaxed">
                      {docLang === 'en' 
                        ? 'Shields all server endpoints against DDoS sweeps. Implements custom DNS layers, Edge rules, and SSL protection to guarantee continuous database accessibility.'
                        : docLang === 'ku'
                        ? 'پارێزگاری لە سێرڤەر و کۆدەکان دەکات لە هێرشی ئەلیکترۆنی. سیستەمی ناونیشانی سێرڤەر (DNS) و پاراستنی SSL چالاک دەکات بۆ کارکردنی بەردەوام.'
                        : 'پاراستنێ ل سێرڤەران دکەت ژ هێرشێن ئەلیکترۆنی. سیستەمێ ناڤونیشانێن سێرڤەری (DNS) و پاراستنا SSL کارا دکەت بۆ بەردەوامییا ئەپی.'
                      }
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── TAB: LICENSES & LEGAL HUB ── */}
            {activeTab === 'legal' && (
              <motion.div
                key="legal-tab"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="rounded-[2.5rem] p-8 md:p-10 backdrop-blur-xl space-y-8"
                style={glassCardStyle}
              >
                <div className="flex items-center gap-3.5 mb-2">
                  <ShieldCheck size={20} style={{ color: accentColor }} />
                  <h2 className="text-xl md:text-2xl font-[1000] text-white uppercase italic tracking-tighter">
                    {tLocal('legalTitle')}
                  </h2>
                </div>
                <p className="text-xs text-gray-400 font-medium leading-relaxed">
                  {tLocal('legalDesc')}
                </p>

                {/* Sub Document Selector Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 border-b border-white/5 pb-6">
                  {(['terms', 'fairuse', 'mit', 'apache', 'dmca'] as const).map((doc) => (
                    <button
                      key={doc}
                      onClick={() => handleLegalDocChange(doc)}
                      className={`text-[9px] font-black uppercase py-3 px-2 rounded-xl transition-all border ${
                        legalDoc === doc 
                          ? 'bg-white/5 border-white/10 text-white' 
                          : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'
                      }`}
                      style={legalDoc === doc ? { color: accentColor, borderColor: `${accentColor}44` } : {}}
                    >
                      {doc === 'terms' && (docLang === 'en' ? 'Proprietary Terms' : 'یاسای بەکارهێنان')}
                      {doc === 'fairuse' && 'Fair Use'}
                      {doc === 'mit' && 'MIT License'}
                      {doc === 'apache' && 'Apache 2.0'}
                      {doc === 'dmca' && 'DMCA / copyright'}
                    </button>
                  ))}
                </div>

                {/* Official Legal Document Viewer Frame */}
                <div className="bg-black/60 border border-white/5 rounded-[2rem] p-6 md:p-8 max-h-[450px] overflow-y-auto font-mono text-[10px] text-gray-400 leading-relaxed space-y-6 shadow-inner">
                  
                  {/* TERMS OF SERVICE */}
                  {legalDoc === 'terms' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase text-white tracking-widest border-b border-white/5 pb-2">
                        FLKRD Studio proprietary Terms of Service
                      </h4>
                      <p className="text-justify">
                        {docLang === 'en' 
                          ? '1. FLKRD operates as a decoupled catalog indexer intended strictly for individual educational research and cinematic critique. By entering the streaming cluster, you acknowledge that all visual assets, metadata representations, and cover designs are scraped dynamically in real-time from open public databases.'
                          : docLang === 'ku'
                          ? '١. پڕۆژەی فڵکرد وەک ئیندێکسکارێکی ڤیدیۆیی کاردەکات کە تایبەتە بە مەبەستی فێربوون و لێکۆڵینەوە. بە بەکارهێنانی ئەم ئەپە، تۆ هاوڕایت لەسەر ئەوەی کە سەرجەم زانیارییەکان، کورتەکان و پۆستەرەکان بە شێوەیەکی خۆکار لە سێرڤەرە گشتییەکانەوە باردەکرێن.'
                          : '١. پرۆژێ فڵکرد وەک ئیندێکسکارەکێ ڤیدیۆیی کار دکەت کو تایبەتە بۆ مەبەستێن فێربوون و لێکۆلینەوە. ب بکارئینانا ئەڤی ئەپی، تۆ هاوڕایی کو هەمی پێزانین، کورتە و پۆستەر ب شێوەیەکێ خۆکار ژ سێرڤەرێن گشتی دهێنە خواندن.'
                        }
                      </p>
                      <p className="text-justify">
                        {docLang === 'en' 
                          ? '2. Automated crawler loops, massive DDOS queries, and headless API scraping attempts against FLKRD Edge CORS endpoints are strictly prohibited. The Studio reserves the absolute right to isolate client configurations and black-list corresponding IP boundaries to preserve cluster high-speed standards.'
                          : docLang === 'ku'
                          ? '٢. هەر جۆرە بەکارهێنانێکی ناڕەوای کۆد، هێرشکردنە سەر سێرڤەرەکان، یان ڕاکێشانی زۆرەملێی داتاکان لە دەروازەکانی پرۆکسی CORS بە تەواوی قەدەغەیە. فڵکرد مافی بلۆککردنی ناونیشانی IP بەکارهێنەر دەپارێزێت بۆ پاراستنی خێرایی سیستم.'
                          : '٢. هەر بکارئینانەکا نەیاسایی یا کۆدان، هێرشکرنە سەر سێرڤەران، یان کۆمکرنا داتایان ژ دەروازێن پرۆکسیا CORS ب تەمامی قەدەغەیە. فڵکرد مافێ بلۆککرنا ناڤونیشانێن IPێن بکاربەران دپارێزیت بۆ پاراستنا خێراییا سیستەمی.'
                        }
                      </p>
                      <p className="text-justify">
                        {docLang === 'en' 
                          ? '3. Native application installations (APK packages, iOS standalone Mobileconfig profiles, macOS DMG packages) carry permission controls allowing direct TCP socket hooks bypassing CORS boundaries. These permissions are used exclusively to secure HLS video fragments rendering.'
                          : docLang === 'ku'
                          ? '٣. دامەزراندنی ئەپڵیکەیشنە فەرمییەکان (APK، پرۆفایلی ئایفۆن، پاکێجی ماک) مۆڵەتی شکاندنی CORS دەدەن بۆ خوێندنەوەی بەستەرەکان. ئەم مۆڵەتانە تەنها و تەنها بۆ پەخشکردنی ڤیدیۆکان بە خێرایی و کوالێتی بەرز بەکاردێن.'
                          : '٣. دامەزراندنا ئەپێن فەرمی (APK، پرۆفایلێ ئایفۆنێ، ماک) مۆڵەتا دەربازبوون ژ CORS ددەن بۆ خواندنا لینکێن پەخشێ. ئەڤ مۆڵەتە تەنها بۆ کارپێکرنا ڤیدیۆیان ب خێراییا بەرز دهێنە بکارئینان.'
                        }
                      </p>
                    </div>
                  )}

                  {/* FAIR USE */}
                  {legalDoc === 'fairuse' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase text-white tracking-widest border-b border-white/5 pb-2">
                        Section 107 — Fair Use compliance Analysis
                      </h4>
                      <p className="text-justify">
                        {docLang === 'en'
                          ? 'FLKRD constitutes a non-commercial metadata compilation indexer and translation laboratory. Under Section 107 of the United States Copyright Act of 1976, allowance is made for "fair use" for purposes such as education, scholarship, language study, research, and cinematic critique.'
                          : docLang === 'ku'
                          ? 'ئەپی فڵکرد پرۆژەیەکی بێبەرامبەرە بۆ فێربوونی زمان و لێکۆڵینەوەی فیلم. بەپێی بەشی ١٠٧ی یاسای مافی کۆپیکردنی ئەمریکا لە ساڵی ١٩٧٦، بڵاوکردنەوەی کاتی و کۆکردنەوەی زانیاری بۆ مەبەستی فێرکاری و زمانەوانی لەژێر یاسای "بەکارهێنانی دادپەروەرانە" (Fair Use) ڕێگەپێدراوە.'
                          : 'ئەپێ فڵکرد پرۆژەکێ بێ بەرامبەرە بۆ فێربوونا زمانان و شیکاریا فیلمی. ب گورەی پشکا ١٠٧ یا یاسایا مافێ کۆپیکرنا ئەمریکا ل سالا ١٩٧٦، بەلاڤکرنا کاتی یا پێزانینان بۆ مەبەستێن فێرکاری و زمانەوانی ل بن یاسایا "بکارئینانا دادپەروەرانە" (Fair Use) ڕێگەپێدایە.'
                        }
                      </p>
                      <p className="text-justify">
                        {docLang === 'en'
                          ? 'All cover graphics, casting names, and textual descriptors displayed are sourced directly from public REST endpoints (such as TMDB) to assist users in selecting streams. FLKRD maintains no physical video files on its hosting infrastructures, serving strictly as an automated routing hub linking to third-party public mirrors.'
                          : docLang === 'ku'
                          ? 'تەواوی وێنەکان، ناوی ئەکتەرەکان و کورتەکان لە سەرچاوە گشتییەکانەوە دەخوێندرێنەوە. فڵکرد هیچ پەڕگەیەکی ڤیدیۆیی یان فیلم لەسەر سێرڤەرەکانی خۆی پاشەکەوت ناکات، بەڵکو تەنها وەک ڕێڕەوێک بۆ گەیشتن بە ڤیدیۆ گشتییەکان کاردەکات.'
                          : 'هەمی وێنە, ناڤێن ئەکتەران و کورتە ل سەرچاوێن گشتی دهێنە خواندن. فڵکرد چ فۆڵدەر یان فایلێن ڤیدیۆیان ل سەر سێرڤەرێن خۆ ناپارێزیت، بەلکو تەنها وەک ڕێڕەوەک کار دکەت بۆ گەهشتن ب ڤیدیۆێن گشتی.'
                        }
                      </p>
                    </div>
                  )}

                  {/* MIT LICENSE */}
                  {legalDoc === 'mit' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase text-white tracking-widest border-b border-white/5 pb-2">
                        The MIT License (MIT)
                      </h4>
                      <p>Copyright (c) 2026 FLKRD STUDIO & Zana Faroq</p>
                      <p className="text-justify">
                        Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
                      </p>
                      <p className="text-justify">
                        The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
                      </p>
                      <p className="text-justify">
                        THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                      </p>
                    </div>
                  )}

                  {/* APACHE 2.0 */}
                  {legalDoc === 'apache' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase text-white tracking-widest border-b border-white/5 pb-2">
                        Apache License, Version 2.0
                      </h4>
                      <p>Copyright 2026 FLKRD STUDIO — Zana Faroq</p>
                      <p className="text-justify">
                        Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at:
                      </p>
                      <p className="text-blue-400 underline hover:text-blue-300">
                        http://www.apache.org/licenses/LICENSE-2.0
                      </p>
                      <p className="text-justify">
                        Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
                      </p>
                    </div>
                  )}

                  {/* DMCA COPYRIGHT */}
                  {legalDoc === 'dmca' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase text-white tracking-widest border-b border-white/5 pb-2">
                        DMCA copyright Takedown Procedures
                      </h4>
                      <p className="text-justify">
                        FLKRD acts strictly as a clientside browser crawler indexing public metadata. We respect copyright properties and comply with the Digital Millennium Copyright Act ("DMCA").
                      </p>
                      <p className="text-justify">
                        If you are a copyright holder or authorized representative and believe that indexed link results display unauthorized materials, you may file a structured notification by emailing:
                      </p>
                      <p className="text-white font-bold bg-white/5 px-4 py-2 rounded-lg inline-block border border-white/10">
                        legal@flkrd.studio
                      </p>
                      <p className="text-justify">
                        Your notice must include: (1) identification of the copyrighted work, (2) the specific URL path/identifier containing the link to be removed, (3) your contact address, email, and telephone number, and (4) a signed statement declaring good faith belief of copyright infringement. Structured notifications are processed and removed within 24 hours.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── TAB: PRIVACY POLICY ── */}
            {activeTab === 'privacy' && (
              <motion.div
                key="privacy-tab"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="rounded-[2.5rem] p-8 md:p-10 backdrop-blur-xl space-y-8"
                style={glassCardStyle}
              >
                <div className="flex items-center gap-3.5 mb-2">
                  <Shield size={20} style={{ color: accentColor }} />
                  <h2 className="text-xl md:text-2xl font-[1000] text-white uppercase italic tracking-tighter">
                    {tLocal('privacyTitle')}
                  </h2>
                </div>
                <p className="text-xs text-gray-400 font-medium leading-relaxed">
                  {tLocal('privacyDesc')}
                </p>

                <div className="space-y-6 mt-8">
                  {/* Privacy Section 1 */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest">
                      {docLang === 'en' ? '1. Local-First Encrypted Caching' : docLang === 'ku' ? '١. پاشەکەوتکردنی نهێنی لەسەر ئامێر' : '١. پاراستنا نهێنی ل سەر ئامێری'}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed text-justify">
                      {docLang === 'en' 
                        ? 'All user streaming configurations, bookmarked items, UI accent settings, and "Continue Watching" progress timelines are kept strictly inside secure local client caches. We never transmit this metadata to external databases unless explicitly synced by the user.'
                        : docLang === 'ku'
                        ? 'تەواوی نیشانەکان، مێژووی بینینەکان، و ڕێکخستنەکانی ئەپەکەت بە تەواوی لەسەر ئامێرەکەی خۆت پاشەکەوت دەبن. ئێمە بە هیچ شێوەیەک ئەم زانیاریانە بۆ هیچ بنکەدراوەیەکی دەرەکی نانێرین بەبێ مۆڵەت و داواکاری خۆت.'
                        : 'هەمی نیشانە، مێژوویا تە یا تەماشەکرنێ و ڕێکخستنێن ئەپەکەت ل سەر ئامێری تە دهێنە پاراستن. ئەم ب چ شێوەیەک ئەڤان پێزانینان بۆ هیچ بنکەدراوێن دەرەکی ناهنێرین بێی مۆڵەتا تە.'
                      }
                    </p>
                  </div>

                  {/* Privacy Section 2 */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest">
                      {docLang === 'en' ? '2. Zero-Log CORS Gateways' : docLang === 'ku' ? '٢. دەروازەی بەستەری بێ تۆمار' : '٢. دەروازێ بەستەرێ بێ تۆمار'}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed text-justify">
                      {docLang === 'en' 
                        ? 'Our Vercel edge endpoints and Tauri proxies function solely as headers routing tunnels to bypass browser CORS lockouts. No watch histories, user IP registries, or session tokens are stored on the proxy layers. All traffic is secured via dynamic SSL.'
                        : docLang === 'ku'
                        ? 'سێرڤەر و پرۆکسییەکانی ئێمە تەنها بۆ تێپەڕاندنی بەربەستەکانی وێب کاردەکەن. هیچ مێژوویەکی تەماشەکردن یان ناونیشانی ئای پی تۆمار ناکرێت و سەرجەم هاتووچۆی داتا پارێزراوە بە مۆرکی SSL.'
                        : 'سێرڤەر و پرۆکسیێن مە تەنها بۆ تێپەڕاندنا بەربەستێن وێبێ کار دکەن. چ مێژوویا تەماشەکرنێ یان ئای پی نا‌هێنە تۆمارکرن و هەمی هاتووچۆیا داتایان پاراستیە ب مۆرکا SSL.'
                      }
                    </p>
                  </div>

                  {/* Privacy Section 3 */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest">
                      {docLang === 'en' ? '3. Wrappers & Sandbox Boundaries' : docLang === 'ku' ? '٣. پاراستنی ڕەقەکاڵا و مۆڵەتەکان' : '٣. پاراستنا ڕەقەکالای و مۆڵەتان'}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed text-justify">
                      {docLang === 'en' 
                        ? 'The native packages (iOS WebClip profile, Android APK, macOS DMG bundle) execute inside highly restricted sandbox boundaries. The application has zero permissions to read physical storage, geolocations, device identifiers, or external contacts.'
                        : docLang === 'ku'
                        ? 'پاکێجە فەرمییەکان لەناو چوارچێوەیەکی توندی پاراستنی ئامێرەکاندا کاردەکەن. ئەپی فڵکرد هیچ دەسەڵاتێکی نییە بۆ خوێندنەوەی ناوەکانی مۆبایلەکەت، شوێنی جوگرافی، یان وێنە و پەڕگە ناوخۆییەکانت.'
                        : 'پاکێجێن فەرمی د ناڤ چوارچۆڤەکێ توند یێ پاراستنا ئامێران دا کار دکەن. ئەپێ فڵکرد چ دەسهەڵات نینە بۆ خواندنا ناڤێن مۆبایلا تە، جهێ تە یێ جوگرافی، یان وێنە و پەڕگێن تە.'
                      }
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default DocPage;
