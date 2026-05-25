import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Shield, FileText, Layers, Cpu, Laptop, Smartphone, Apple, 
  RefreshCw, ArrowLeft, ExternalLink, Activity, Check, Settings, AlertCircle, 
  Sparkles, Globe, ShieldCheck, HelpCircle, Monitor, ArrowRight, User
} from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';

type Tab = 'flow' | 'terms' | 'privacy' | 'license' | 'tutorials';
type DocLanguage = 'en' | 'ku' | 'badini';

const DocPage: React.FC = () => {
  const { language: appLang } = useTranslation();
  const { accentColor } = useUI();
  
  // Local doc language state, initialized to app language
  const [docLang, setDocLang] = useState<DocLanguage>(() => {
    if (appLang === 'badini') return 'badini';
    if (appLang === 'ku') return 'ku';
    return 'en';
  });

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    // Read from URL query param if present
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const tabParam = params.get('tab') as Tab;
    return ['flow', 'terms', 'privacy', 'license', 'tutorials'].includes(tabParam) ? tabParam : 'flow';
  });

  const [selectedNode, setSelectedNode] = useState<string | null>('gateway');

  // Listen to tab changes in query params or set manually
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    // Update hash query string cleanly without reloading
    const baseUrl = window.location.hash.split('?')[0];
    window.location.hash = `${baseUrl}?tab=${tab}`;
  };

  // Text contents for each language
  const content = {
    en: {
      title: "FLKRD Documentation Hub",
      subtitle: "System Architecture, Legal Guidelines & Deployment Guides",
      backHome: "Back to Home",
      tabFlow: "Ecosystem Flow Map",
      tabTerms: "Terms of Service",
      tabPrivacy: "Privacy Policy",
      tabLicense: "DMCA & Licenses",
      tabTutorials: "System Tutorials",
      creatorBadge: "Creator Bio",
      developer: "Lead Software Engineer",
      creatorText: "FLKRD Cinematic Engine was envisioned, designed, and fully engineered by Zain Faroq. Zain designed the unified streaming architecture, custom Kurdish subtitle boosting algorithms, CORS sandbox bypass mechanisms, and premium glassmorphic UI systems to bring top-tier cinematic streaming to Kurdish viewers globally.",
      tutorialsTitle: "How the FLKRD Ecosystem Works",
      tutorialsDesc: "FLKRD is a highly optimized client-server application built on top of React, Vite, and Tauri. Here is a step-by-step guide to installing packages on your hardware:",
      iosGuideTitle: "iOS Standalone Profile Installation (iOS 15 to 26+)",
      iosStep1: "1. Click 'Install iOS WebClip' inside the Settings Modal.",
      iosStep2: "2. Your device will open System Settings. Tap 'Install Profile' and authorize.",
      iosStep3: "3. The FLKRD icon will appear on your Home Screen. It launches a standalone web container that bypasses Safari sandbox limits, unlocking locked 60+ FPS, native notches, and push notifications.",
      androidGuideTitle: "Android Native App installation",
      androidStep1: "1. Download the signed Universal APK file from Settings.",
      androidStep2: "2. Enable 'Install from Unknown Sources' in your Android security settings.",
      androidStep3: "3. Open the APK file to complete installation. The native app has fully dedicated video codecs for hardware decoding.",
      macosGuideTitle: "macOS Application Bundle",
      macosStep1: "1. Click 'Download macOS DMG' to fetch the installer.",
      macosStep2: "2. Double click the DMG, drag FLKRD MOVIES to your Applications folder.",
      macosStep3: "3. Run the app. Features include native picture-in-picture, custom overlays, and hardware-accelerated streaming.",
      flowMapTitle: "Interactive FLKRD SERVER Flow Map",
      flowMapDesc: "Below is an interactive simulation of how FLKRD bypasses browser CORS constraints, queries catalogs, and dynamically streams 4K video streams with custom Kurdish closed-captions. Click any node to inspect its live architecture properties.",
      termsTitle: "Terms of Service & Fair Use Protocol",
      termsIntro: "Welcome to FLKRD. By accessing this platform, you agree to comply with our fair-use and technical terms outlined below. These guidelines ensure high-speed streaming for everyone in the cluster.",
      terms1Title: "1. Platform Usage & Streaming Etiquette",
      terms1Text: "FLKRD is a private cinematic platform designed for personal, non-commercial entertainment. Content indexation is simulated in real-time. Automated scraping, crawling, or DDOS requests against FLKRD proxy gateways is strictly prohibited and results in immediate IP exclusion.",
      terms2Title: "2. Decoupled Subtitle Caching",
      terms2Text: "Kurdish closed-captions are retrieved dynamically via custom scrapers and cached locally in your client storage. Sharing subtitle endpoints externally is limited by rate-limiting rules.",
      terms3Title: "3. Universal Sandbox Bypass",
      terms3Text: "By installing native wrappers (APK, macOS DMG, iOS WebClip), the application gains execution permissions to bypass standard Web CORS sandbox controls, enabling direct connections to third-party streaming engines.",
      privacyTitle: "Privacy & Encryption Protocols",
      privacyIntro: "We prioritize your streaming privacy. This policy outlines how local client data is compiled and synced safely with security nodes.",
      privacy1Title: "1. Local-First Caching",
      privacy1Text: "All streaming bookmarks, 'Continue Watching' metrics, and UI configurations are saved directly in local client storage. They are never sent to remote database engines without explicit user synchronization actions.",
      privacy2Title: "2. CORS Proxy Gateway logs",
      privacy2Text: "Our CORS proxy servers cache streaming headers temporarily. No user data, watch history, or IP logs are permanently stored on the servers. All communication is secured via AES-256 SSL encryption.",
      privacy3Title: "3. PWA & Native Sandboxes",
      privacy3Text: "The PWA mobileconfig files and APK packages run strictly inside secure application contexts. They do not read your contacts, geolocation, or external local device storage.",
      dmcaTitle: "DMCA Compliance & Open Source Licenses",
      dmcaIntro: "FLKRD is a metadata indexer and client rendering engine. We respect intellectual property rights and comply with legal frameworks.",
      dmca1Title: "1. Catalog Indexing Policy",
      dmca1Text: "FLKRD does not host, upload, or store any movie files, media clips, or video files on its own servers. The platform acts strictly as an automated crawler indexing public streaming APIs (such as TMDB, OpenSubtitles, and public streaming mirrors).",
      dmca2Title: "2. Take Down Requests (DMCA)",
      dmca2Text: "If you are a copyright holder and wish to request the removal of indexed metadata or links, please send a structured DMCA takedown request to our legal gateway. Requests are processed within 24 hours.",
      dmca3Title: "3. Open Source Attributions",
      dmca3Text: "This software is built using React, Vite, Framer Motion, Lucide icons, and the official Tauri multi-platform framework. We appreciate the contributors of the open-source community for making this ecosystem possible."
    },
    ku: {
      title: "ناوەندی زانیاری فڵکرد",
      subtitle: "شیکاری سیستەم، ڕێنماییە یاساییەکان و هەنگاوەکانی دامەزراندن",
      backHome: "گەڕانەوە بۆ سەرەکی",
      tabFlow: "نەخشەی ڕێڕەوی سیستم",
      tabTerms: "مەرجەکانی بەکارهێنان",
      tabPrivacy: "یاسای پاراستنی نهێنی",
      tabLicense: "مۆڵەت و DMCA",
      tabTutorials: "فێرکارییەکان",
      creatorBadge: "دروستکەری سیستم",
      developer: "سەرۆکی ئەندازیارانی سۆفتوێر",
      creatorText: "پڕۆژەی فڵکرد بە تەواوی لەلایەن زانا فارووق دیزاین و ئەندازیاری بۆ کراوە. زانا تەلارسازی یەکگرتووی پەخش، مۆدیولەکانی خێراکردنی ژێرنووسی کوردی، تێپەڕاندنی بلۆکی CORS و سیستەمی دیزاینی شوشەیی پەرەپێداوە بۆ فەراهەمکردنی پەخشێکی نایاب بۆ بینەرانی کورد لە سەرانسەری جیهان.",
      tutorialsTitle: "چۆنیەتی کارکردنی تەکنیکی فڵکرد",
      tutorialsDesc: "فڵکرد ئەپڵیکەیشنێکی زۆر خێرایە لەسەر بنەمای React و Tauri پەرەی پێدراوە. لێرەدا ڕێنمایی هەنگاو بە هەنگاوی دامەزراندنی پاکێجەکان دەخەینە ڕوو:",
      iosGuideTitle: "دامەزراندنی وەشانی iOS (وەشانەکانی ١٥ تا ٢٦+)",
      iosStep1: "١. کرتە لەسەر 'Install iOS WebClip' بکە لە بەشی ڕێکخستنەکاندا.",
      iosStep2: "٢. مۆبایلەکەت دەچێتە ڕێکخستنی سیستەم، کرتە لە 'Install Profile' بکە و پەسەندی بکە.",
      iosStep3: "٣. ئایکۆنی فڵکرد لەسەر شاشەی سەرەکی دەردەکەوێت، بە پەخشکردنی کاردەکات بە خێرایی 60+ FPS و ناردنی ئاگادارییەکان بە شێوەی ڕاستەوخۆ کارا دەبێت.",
      androidGuideTitle: "دامەزراندنی وەشانی ئەندرۆید",
      androidStep1: "١. فایلی واژووکراوی APK دابەزێنە لە ڕێکخستنەکانەوە.",
      androidStep2: "٢. بژاردەی 'سەرچاوە نەناسراوەکان' (Unknown Sources) لە ڕێکخستنی پاراستنی مۆبایلەکەت چالاک بکە.",
      androidStep3: "٣. فایلی APK بکەرەوە بۆ تەواوکردنی دامەزراندن. ئەپەکە خاوەن کۆدێکی تایبەتە بۆ خێراکردنی کارکردنی ڤیدیۆکان.",
      macosGuideTitle: "دامەزراندنی وەشانی ماک",
      macosStep1: "١. کرتە لەسەر 'Download macOS DMG' بکە بۆ دابەزاندنی فایلەکە.",
      macosStep2: "٢. فایلی DMG بکەرەوە و ئەپی FLKRD بکێشە بۆ ناو فۆڵدەرەکەت.",
      macosStep3: "٣. ئەپەکە بکەرەوە. پشتگیری لە وێنە لە ناو وێنە (PIP) و خێراکردنی ڕەقەکاڵا دەکات.",
      flowMapTitle: "نەخشەی ڕێڕەوی کارکردنی سێرڤەر",
      flowMapDesc: "لێرەدا دەتوانیت بە شێوەیەکی ڕاستەوخۆ و ئەنیمەیشن ببینی چۆن فڵکرد بەربەستەکانی وێبگەڕ دەشکێنێت و بەستەرەکانی ڤیدیۆی 4K باردەکات لەگەڵ ژێرنووسی کوردی. کرتە لە هەر نۆدێک بکە بۆ بینینی زانیاری دەربارەی.",
      termsTitle: "یاسا و مەرجەکانی بەکارهێنان",
      termsIntro: "بەخێربێیت بۆ فڵکرد. بە بەکارهێنانی ئەم ماڵپەڕە، تۆ هاوڕایت لەگەڵ مەرجە تەکنیکی و یاساییەکانی خوارەوە کە خێراییەکی بەرز بۆ هەمووان مسۆگەر دەکات.",
      terms1Title: "١. یاسای بەکارهێنانی سێرڤەر",
      terms1Text: "فڵکرد سەکۆیەکی تایبەتە بۆ کات بەسەربردنی کەسی. هەر جۆرە هێرشێکی ئەلیکترۆنی یان بەکارهێنانی ڕۆبۆت بۆ ڕاکێشانی داتا قەدەغەیە و دەبێتە هۆی بلۆککردنی ناونیشانی IP بەکارهێنەر.",
      terms2Title: "٢. ژێرنووسی کوردی",
      terms2Text: "ژێرنووسە کوردییەکان بە شێوەیەکی داینامیکی لە سێرڤەرەکانەوە دەخوێندرێنەوە و لە وێبگەڕەکەتدا پاشەکەوت دەکرێن بۆ ئەوەی خێرایی بەکاربردن کەم نەبێتەوە.",
      terms3Title: "٣. تێپەڕاندنی سانسۆری وێب",
      terms3Text: "بە بەکارهێنانی وەشانی ئەپڵیکەیشنەکان (ماک، ئەندرۆید، ئایفۆن)، بەرنامەکە مۆڵەتی تێپەڕاندنی سانسۆری CORSی دەبێت و ڕاستەوخۆ ڤیدیۆکان لە سێرڤەرەکانەوە بار دەکات.",
      privacyTitle: "پاراستنی زانیاری و نهێنی بەکارهێنەر",
      privacyIntro: "پاراستنی تۆ لە کارە لەپێشینەکانی ئێمەیە. لێرەدا ڕوون دەکرێتەوە چۆن زانیارییەکانت دەپارێزرێن:",
      privacy1Title: "١. پاشەکەوتکردنی ناوخۆیی",
      privacy1Text: "هەموو فیلمە دڵخوازەکانت، مێژووی بینینەکانت و ڕێکخستنەکانت بە تەواوی لەسەر مۆبایل یان کۆمپیوتەرەکەت پاشەکەوت دەبن و نانێردرێن بۆ سێرڤەری دەرەکی بەبێ مۆڵەتی خۆت.",
      privacy2Title: "٢. تۆماری داتا لە سێرڤەر",
      privacy2Text: "سێرڤەرەکانی پرۆکسی ئێمە زانیاری ڤیدیۆکان بە شێوەیەکی کاتی پاشەکەوت دەکەن. هیچ تۆمارێکی بەردەوامی بینین یان ناونیشانی IP لەلایەن ئێمەوە پاشەکەوت ناکرێت.",
      privacy3Title: "٣. مۆڵەتەکانی ئەپڵیکەیشن",
      privacy3Text: "پاکێجەکانی فڵکرد تەنها مۆڵەتی کارکردنی بەرنامەکەیان هەیە و بە هیچ شێوەیەک دەستیان ناگات بە ناونیشانی ناو مۆبایلەکەت، شوێنی جوگرافی یان وێنەکانت.",
      dmcaTitle: "مافی بڵاوکردنەوە و مۆڵەتەکان (DMCA)",
      dmcaIntro: "فڵکرد تەنها مەکینەیەکی کۆکەرەوە و نیشاندانی زانیارییەکانە و پابەندی یاسا نێودەوڵەتییەکانە.",
      dmca1Title: "١. شێوازی کارکردنی ئیندێکس",
      dmca1Text: "ماڵپەڕی فڵکرد بە هیچ شێوەیەک هیچ فایلێکی ڤیدیۆیی لەسەر سێرڤەرەکانی خۆی پاشەکەوت ناکات. فڵکرد هاوشێوەی گوگڵ کاردەکات و تەنها بە شێوەیەکی خۆکار بەستەری پەخشی گشتی کۆدەکاتەوە.",
      dmca2Title: "٢. داواکاری سڕینەوە",
      dmca2Text: "ئەگەر تۆ خاوەنی مافی بڵاوکردنەوەی بەرهەمێکی و دەتەوێت لە فڵکرد بسڕدرێتەوە، دەتوانیت داواکارییەک بنێریت بۆ بەشی یاسایی و لە ماوەی ٢٤ کاتژمێردا بەستەرەکە لادەبرێت.",
      dmca3Title: "٣. مۆڵەتەکانی پڕۆژە",
      dmca3Text: "ئەم پڕۆژەیە بە بەکارهێنانی زمانەکانی React, Vite, Framer Motion و Tauri دروستکراوە. سوپاسی خاوەن پڕۆژە سەرچاوە کراوەکان دەکەین بۆ یارمەتیدانی ئەم تەکنەلۆژیایە."
    },
    badini: {
      title: "ناڤەندا پێزانینێن فڵکرد",
      subtitle: "شیکاریا سیستەمی، ڕێنمایێن یاسایی و پێنگاڤێن دامەزراندنێ",
      backHome: "گەڕانەوە بۆ لاپەڕێ سەرەکی",
      tabFlow: "نەخشێ ڕێڕەوێ سیستەمی",
      tabTerms: "مەرجێن بکارئینانێ",
      tabPrivacy: "یاسایا پاراستنا نهێنیێ",
      tabLicense: "مۆڵەت و DMCA",
      tabTutorials: "فێرکاریێن تەکنیکی",
      creatorBadge: "دروستکەرێ سیستەمی",
      developer: "سەرۆکێ ئەندازیارێن سۆفتوێری",
      creatorText: "پڕۆژێ فڵکرد ب تەمامی ژ لایێ زانا فارووق هاتیە دیزاین و ئەندازیاری کرن. زانا تەلارسازیا ئێکگرتیا پەخشێ، مۆدیولێن خێراکرنا ژێرنووسێ کوردی، دەربازبوونا بلۆکێن CORS و سیستەمێ دیزاینا شووشەیی پەرەپێدایە دا کو پەخشەکێ شاهانە پێشکێشی بینەرێن کورد بکەت ل سەرانسەری جیهانێ.",
      tutorialsTitle: "چەوانیا کارکرنا تەکنیکیا فڵکرد",
      tutorialsDesc: "فڵکرد ئەپڵیکەیشنەکێ زۆر خێرایە ل سەر بنەمایێ React و Tauri هاتیە دروستکرن. لێرە دا ڕێنمایێن پێنگاڤ ب پێنگاڤ بۆ دامەزراندنا پاکێجێن بەرنامەی دیار دکەین:",
      iosGuideTitle: "دامەزراندنا وەشانا iOS (وەشانێن ١٥ تا ٢٦+)",
      iosStep1: "١. کرتێ ل سەر 'Install iOS WebClip' بکە د پشکا ڕێکخستنان دا.",
      iosStep2: "٢. مۆبایلا تە دێ چیتە د ناڤ ڕێکخستنێن مۆبایلێ دا، کرتێ ل سەر 'Install Profile' بکە و پەسەند بکە.",
      iosStep3: "٣. ئایکۆنا فڵکرد دێ ل سەر شاشێ دیار بیت، ب ڤەکرنێ دێ ب خێراییا 60+ FPS کار کەت و ناردنا ئاگاداریان دێ چالاک بیت ب شێوەیەکێ سەرەکی.",
      androidGuideTitle: "دامەزراندنا وەشانا ئەندرۆید",
      androidStep1: "١. فایلی واژووکریێ APK دابەزینە ژ پشکا ڕێکخستنان.",
      androidStep2: "٢. بژاردا 'سەرچاوەیێن نەنیاس' (Unknown Sources) د ڕێکخستنێن پاراستنا مۆبایلا خۆ دا چالاک بکە.",
      androidStep3: "٣. فایلێ APK ڤەکە دا کو دامەزراندن ب دوماهی بێت. بەرنامە خاوەن کۆدەکێ تایبەتە بۆ خێراکرنا پەخشێ ڤیدیۆیان.",
      macosGuideTitle: "دامەزراندنا وەشانا ماک (macOS)",
      macosStep1: "١. کرتێ ل سەر 'Download macOS DMG' بکە بۆ دابەزاندنا فایلی.",
      macosStep2: "٢. فایلێ DMG ڤەکە و بەرنامێ FLKRD بکێشە د ناڤ فۆڵدەرێ ئەپڵیکەیشنان دا.",
      macosStep3: "٣. ئەپی کارا بکە. پشتگیریێ ل تایبەتمەندیا وێنە د ناڤ وێنەی دا (PIP) دکەت.",
      flowMapTitle: "نەخشێ ڕێڕەوێ کارکرنا سێرڤەری",
      flowMapDesc: "لێرە دا دێ ب شێوەیەکێ ڕاستەوخۆ و ئەنیمەیشن بینی چەوان فڵکرد بەربەستێن وێبگەڕان دشکێنیت و ڤیدیۆیێن 4K دگەل ژێرنووسێ کوردی بار دکەت. کرتێ ل سەر هەر نۆدەکێ بکە بۆ دیتنا پێزانینێن زێدەتر.",
      termsTitle: "مەرجێن بکارئینانێ و ڕێسا تەکنیکیان",
      termsIntro: "بەخێربێی بۆ فڵکرد. ب کارئینانا ئەڤێ سەکۆیێ، تۆ هاوڕایی دگەل مەرجێن تەکنیکی و یاساییێن ل خوارێ کو خێراییەکا بەرز بۆ هەمی بکاربەران دابین دکەت.",
      terms1Title: "١. یاسایا کارکرنا سێرڤەران",
      terms1Text: "فڵکرد سەکۆیەکا تایبەتە بۆ کات بەسەربرنا کەسی. هەر جۆرە هێرشەکا ئەلیکترۆنی یان بکارئینانا ڕۆبۆتان بۆ کۆمکرنا زانیاریان قەدەغەیە و بکاربەر دێ هێتە بلۆککرن.",
      terms2Title: "٢. ژێرنووسێ کوردی",
      terms2Text: "ژێرنووسێن کوردی ب شێوازەکێ داینامیکی ژ سێرڤەران دهێنە خواندن و د ئامێری تە دا دهێنە پاراستن دا کو کاریگەریێ ل سەر خێراییێ نەکەت.",
      terms3Title: "٣. دەربازبوون ژ سانسۆرێ",
      terms3Text: "ب کارئینانا وەشانێن ئەپڵیکەیشنان (ماک، ئەندرۆید، ئایفۆن)، بەرنامە دێ شێت ڕاستەوخۆ ڤیدیۆیان ژ سێرڤەران بار کەت بێی چوونە د ناڤ سانسۆرێن وێبگەڕان دا.",
      privacyTitle: "پاراستنا پێزانینان و تایبەتیا بکاربەران",
      privacyIntro: "پاراستنا تە ل کارێن هەرە پێشینێن مەیە. لێرە دا دیار دکەین کا پێزانینێن تە چەوان دهێنە پاراستن:",
      privacy1Title: "١. پاشەکەوتکرنا ناوخۆیی",
      privacy1Text: "هەمی فیلمێن دڵخوازێن تە، مێژوویا بینینێ و ڕێکخستنێن تە ب تەواوی د ناڤ مۆبایل یان کۆمپیوتەرا تە دا دهێنە پاراستن و بۆ هیچ سێرڤەرەکێ دەرەکی ناهێنە هنارتن.",
      privacy2Title: "٢. تۆمارێن سێرڤەری",
      privacy2Text: "سێرڤەرێن پرۆکسی یێن مە پێزانینێن ڤیدیۆیان ب شێوەیەکێ کاتی دپارێزن. چ تۆمارێن بەردەوام یێن بینینێ یان ناونیشانێن IP ژ لایێ مە ڤە ناهێنە پاراستن.",
      privacy3Title: "٣. مۆڵەتێن ئەپی",
      privacy3Text: "پاکێجێن فڵکرد تەنها مۆڵەتا کارکرنا بەرنامەی یا هەی و ب هیچ شێوەیەک دەستێ وان ناگەهیتە ناڤێن مۆبایلا تە، وێنە یان جهێ تە یێ جوگرافی.",
      dmcaTitle: "مافێن بەلاڤکرنێ و مۆڵەت (DMCA)",
      dmcaIntro: "فڵکرد تەنها مەکینەکا کۆمکرن و نیشادانا زانیاریانە و یا پابەندە ب یاسایێن نێودەوڵەتی.",
      dmca1Title: "١. شێوازێ کارێ ئیندێکسێ",
      dmca1Text: "ماڵپەڕێ فڵکرد ب چ شێوەیەک فایلێن ڤیدیۆیان د ناڤ سێرڤەرێن خۆ دا ناپارێزیت. کارێ فڵکرد هاوشێوەیا گوگڵە و تەنها لینکێن پەخشێن گشتی کۆ دکەتەڤە.",
      dmca2Title: "٢. داواکاریا سڕینەوەیێ",
      dmca2Text: "ئەگەر تۆ خودانێ مافێ بەلاڤکرنا بەرهەمەکی بی و دخوازی ژ فڵکرد بهێتە ڕشکرن، دشێی داواکارییەکێ بنێری بۆ پشکا یاسایی و د ماوێ ٢٤ کاتژمێران دا دێ هێتە لادان.",
      dmca3Title: "٣. مۆڵەتێن پرۆژەی",
      dmca3Text: "ئەڤ پڕۆژەیە ب بەستنا زمانێن React, Vite, Framer Motion و Tauri هاتیە ئاڤاکرن. سوپاسیا هەمی پارتنەرێن سەرچاوە کراوە دکەین بۆ هاریکاریکرنا ئەڤێ تەکنەلۆژیایێ."
    }
  };

  const tLocal = (key: keyof typeof content.en) => {
    return content[docLang][key] || content.en[key] || String(key);
  };

  // Node information for Flow Map
  const nodes = {
    user: {
      name: docLang === 'en' ? 'User Client' : docLang === 'ku' ? 'ئامێری بەکارهێنەر' : 'ئامێری بکاربەر',
      sub: docLang === 'en' ? 'Mobile / Mac / Web' : 'مۆبایل / ماک / وێب',
      desc: docLang === 'en' 
        ? 'The user frontend UI. Rendered under locked 60+ FPS with custom scale overlays and localized translation states (English, Sorani, Badini).'
        : docLang === 'ku'
        ? 'ڕووکاری سەرەکی مۆبایل، کۆمپیوتەر یان تیڤی. کاردەکات بە خێرایی 60+ FPS لەگەڵ دیزاینی شوشەیی و زمانەکانی ئینگلیزی، سۆرانی و بادینی.'
        : 'ڕووکارێ سەرەکیێ مۆبایل، کۆمپیوتەر یان تیڤی. کار دکەت ب خێراییا 60+ FPS دگەل زمانێن ئینگلیزی، سۆرانی و بادینی.',
      stats: [
        { label: 'FPS Target', val: '60+ Locked' },
        { label: 'Viewport Size', val: 'Responsive' },
        { label: 'Audio Engine', val: 'Dynamic Rewind' }
      ]
    },
    gateway: {
      name: docLang === 'en' ? 'CORS Proxy Gateway' : docLang === 'ku' ? 'پرۆکسی و دەروازەی CORS' : 'پرۆکسی و دەروازێ CORS',
      sub: docLang === 'en' ? 'Rust Tauri / Edge API' : 'ئەپی ماک یان سێرڤەری سەرەکی',
      desc: docLang === 'en'
        ? 'Bypasses standard browser CORS (Cross-Origin Resource Sharing) restrictions. On web, queries are tunneled via Vercel Edge Serverless functions. On native (Tauri), it uses direct Rust-level HTTP socket plugins for instant data fetch.'
        : docLang === 'ku'
        ? 'ڕێگری دەکات لە ڕێساکانی CORSی وێبگەڕ. لەسەر وێب لەڕێگەی سێرڤەری Vercelەوە کاردەکات، و لەسەر ئەپەکانیش لە ڕێگەی نۆدی ناوخۆیی ڕوستی (Tauri HTTP Plugin) ڕاستەوخۆ بەستەرەکان دەخوێنێتەوە.'
        : 'ڕێگریێ دکەت ژ یاسایێن CORSێن وێبگەڕان. سەر وێبێ ب ڕێیا سێرڤەرێ Vercelێ کار دکەت، و سەر ئەپڵیکەیشنان ژی ب ڕێیا نۆدێ ڕوستی (Tauri HTTP Plugin) ڕاستەوخۆ لینک پێشاندەت.',
      stats: [
        { label: 'Latency', val: '< 18ms' },
        { label: 'Protocol', val: 'HTTP/3 Quic' },
        { label: 'Bypass Rating', val: '100% Secure' }
      ]
    },
    tmdb: {
      name: docLang === 'en' ? 'Metadata TMDB Node' : docLang === 'ku' ? 'ئیندێکسی داتای فیلم' : 'ئیندێکسێ داتایێن فیلمی',
      sub: docLang === 'en' ? 'TMDB API v3 Proxy' : 'سێرڤەری زانیاری فیلمەکان',
      desc: docLang === 'en'
        ? 'Fetches high-definition metadata, movie backdrops, posters, cast bios, and localized descriptions. Combined with fallback logic if main TMDB nodes encounter localized API limits.'
        : docLang === 'ku'
        ? 'زانیارییەکان، پۆستەر، ئەکتەرەکان و کورتەی فیلمەکان باردەکات. بەستراوەتەوە بە سیستەمی فڵتەرکردنی داتاکان بۆ ڕێگری لە بلۆکبوون.'
        : 'زانیاری، پۆستەر، ئەکتەر و کورتەیێن فیلمی بار دکەت. یا بەستراوە ب سیستەمێ فڵتەرکرنا داتایان بۆ ڕێگری ژ بلۆککرنێ.',
      stats: [
        { label: 'API Queries', val: 'SSL Encrypted' },
        { label: 'Cache Status', val: '24hr TTL' },
        { label: 'Translation', val: 'Dynamic Fallback' }
      ]
    },
    servers: {
      name: docLang === 'en' ? 'FLKRD SERVERS Cluster' : docLang === 'ku' ? 'کۆمەڵەی سێرڤەرەکانی فڵکرد' : 'کۆمەڵەیا سێرڤەرێن فڵکرد',
      sub: docLang === 'en' ? 'Server 1 to 5' : 'سێرڤەری ١ تا ٥',
      desc: docLang === 'en'
        ? 'An intelligent cluster of 5 high-speed streaming databases. Automatically queries video stream pathways, indexes direct HLS / MP4 playbacks, and prioritizes the highest resolution.'
        : docLang === 'ku'
        ? 'تۆڕێک لە ٥ سێرڤەری خێرای پەخشکردنی ڤیدیۆ. بە شێوەیەکی خۆکار بەستەری 1080p و 4K کۆدەکاتەوە و بەرزترین کوالێتی پێشکەش دەکات.'
        : 'تۆڕەک ژ ٥ سێرڤەرێن خێرایێن پەخشکرنا ڤیدیۆیان. خۆکارانە لینکێن 1080p و 4K کۆ دکەتەڤە و باشترین کوالێتی دابین دکەت.',
      stats: [
        { label: 'Server 4 (CinePro)', val: '4K/UHD & Kurdish Sub Boost' },
        { label: 'Server 1 / 3', val: '1080p SuperEmbed' },
        { label: 'Auto Failover', val: 'Active (Next Source)' }
      ]
    },
    subtitles: {
      name: docLang === 'en' ? 'Kurdish Subtitle Engine' : docLang === 'ku' ? 'مەکینەی ژێرنووسی کوردی' : 'مەکینەیا ژێرنووسێ کوردی',
      sub: docLang === 'en' ? 'OpenSubtitles / Stremio API' : 'سیستەمی ژێرنووسەکان',
      desc: docLang === 'en'
        ? 'Scrapes OpenSubtitles and Stremio API instances. If Kurdish closed captions are found, the engine boosts the source in ranking by +1000 score, registers Kurdish badging, and passes subtitles directly to player parameters.'
        : docLang === 'ku'
        ? 'پشکنین دەکات بۆ ژێرنووسی کوردی لە بنکەدراوە گشتییەکان. لە کاتی بوونی ژێرنووس، سێرڤەرەکە بەرز دەکاتەوە بۆ پێشەوە بە کۆنمرەی +١٠٠٠ بۆ بینینی ئاسان.'
        : 'پشکنینێ دکەت بۆ ژێرنووسێ کوردی د سێرڤەران دا. دەما ژێرنووس هەبیت، سێرڤەرێ وێ دێ بەرز کەت بۆ پێش دگەل کۆنمرەیا +١٠٠٠ بۆ دیتنەکا ئاسان.',
      stats: [
        { label: 'Subtitle Boost', val: '+1000 Ranking Score' },
        { label: 'Auto Pinning', val: 'Active on Kurdish CC' },
        { label: 'Supported Formats', val: 'SRT, VTT, ASS' }
      ]
    }
  };

  const selectedNodeData = selectedNode ? nodes[selectedNode as keyof typeof nodes] : null;

  return (
    <div className="min-h-screen w-full bg-black text-gray-200 overflow-x-hidden relative" dir={docLang === 'en' ? 'ltr' : 'rtl'}>
      {/* Background Neon Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--brand-red)]/10 blur-[150px] pointer-events-none" style={{ backgroundColor: `${accentColor}10` }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--brand-red)]/5 blur-[150px] pointer-events-none" style={{ backgroundColor: `${accentColor}05` }} />

      {/* Header Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <a 
          href="/#/" 
          className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 px-4 py-2.5 rounded-full"
        >
          <ArrowLeft size={12} className={docLang === 'en' ? 'mr-1' : 'ml-1'} />
          {tLocal('backHome')}
        </a>

        {/* Floating Language Selector Pill */}
        <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-full border border-white/10">
          {(['en', 'ku', 'badini'] as DocLanguage[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setDocLang(lang)}
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Navigation Panel */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 backdrop-blur-md sticky top-28">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                <BookOpen size={18} style={{ color: accentColor }} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase text-white tracking-widest">{tLocal('title')}</h3>
                <span className="text-[7.5px] font-extrabold text-gray-500 uppercase tracking-widest mt-0.5 block">VERIFIED ENGINE v5.5.1.25</span>
              </div>
            </div>

            {/* Nav Tabs */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleTabChange('flow')}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-[10px] font-black uppercase tracking-wider text-left transition-all ${
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
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-[10px] font-black uppercase tracking-wider text-left transition-all ${
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
                onClick={() => handleTabChange('terms')}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-[10px] font-black uppercase tracking-wider text-left transition-all ${
                  activeTab === 'terms' 
                    ? 'bg-white/5 border-white/10 text-white' 
                    : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.01]'
                }`}
                style={activeTab === 'terms' ? { borderRight: docLang !== 'en' ? `3px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)', borderLeft: docLang === 'en' ? `3px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)' } : {}}
              >
                <FileText size={14} style={{ color: activeTab === 'terms' ? accentColor : undefined }} />
                {tLocal('tabTerms')}
              </button>

              <button
                onClick={() => handleTabChange('privacy')}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-[10px] font-black uppercase tracking-wider text-left transition-all ${
                  activeTab === 'privacy' 
                    ? 'bg-white/5 border-white/10 text-white' 
                    : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.01]'
                }`}
                style={activeTab === 'privacy' ? { borderRight: docLang !== 'en' ? `3px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)', borderLeft: docLang === 'en' ? `3px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)' } : {}}
              >
                <Shield size={14} style={{ color: activeTab === 'privacy' ? activeTab === 'privacy' ? accentColor : undefined : undefined }} />
                {tLocal('tabPrivacy')}
              </button>

              <button
                onClick={() => handleTabChange('license')}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-[10px] font-black uppercase tracking-wider text-left transition-all ${
                  activeTab === 'license' 
                    ? 'bg-white/5 border-white/10 text-white' 
                    : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.01]'
                }`}
                style={activeTab === 'license' ? { borderRight: docLang !== 'en' ? `3px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)', borderLeft: docLang === 'en' ? `3px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)' } : {}}
              >
                <ShieldCheck size={14} style={{ color: activeTab === 'license' ? accentColor : undefined }} />
                {tLocal('tabLicense')}
              </button>
            </div>

            {/* Creator Bio Widget */}
            <div className="mt-8 border-t border-white/5 pt-6 flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <User size={14} style={{ color: accentColor }} />
                </div>
                <div>
                  <span className="text-[7.5px] font-black uppercase text-gray-500 tracking-wider block">{tLocal('creatorBadge')}</span>
                  <span className="text-[10px] font-bold text-white block">Zana Faroq</span>
                </div>
              </div>
              <p className="text-[9px] text-gray-400 font-medium leading-relaxed bg-white/[0.01] p-3.5 rounded-2xl border border-white/5">
                {tLocal('creatorText')}
              </p>
            </div>
          </div>
        </div>

        {/* Right Content Panels */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            
            {/* ── Tab: Architecture Flow Map ──────────────── */}
            {activeTab === 'flow' && (
              <motion.div
                key="flow-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 md:p-10 backdrop-blur-md">
                  <div className="flex items-center gap-3.5 mb-4">
                    <Sparkles size={20} style={{ color: accentColor }} />
                    <h2 className="text-xl md:text-2xl font-[1000] text-white uppercase italic tracking-tighter">{tLocal('flowMapTitle')}</h2>
                  </div>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed mb-8">{tLocal('flowMapDesc')}</p>

                  {/* Flow Map Visual Simulation */}
                  <div className="relative border border-white/5 bg-black/40 rounded-[2rem] p-8 min-h-[360px] flex flex-col items-center justify-center overflow-hidden">
                    {/* Animated Lines/Particles in Background */}
                    <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
                      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={accentColor} stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#fff" stopOpacity="0.2" />
                          </linearGradient>
                        </defs>
                        <path d="M 100,100 L 700,100 M 100,200 L 700,200" stroke="url(#line-grad)" strokeWidth="2" strokeDasharray="5,5" className="animate-[dash_10s_linear_infinite]" />
                      </svg>
                      <style>{`
                        @keyframes dash {
                          to {
                            stroke-dashoffset: -100;
                          }
                        }
                      `}</style>
                    </div>

                    {/* Nodes Array Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 w-full relative z-10">
                      
                      {/* Node: User */}
                      <button
                        onClick={() => setSelectedNode('user')}
                        className={`flex flex-col items-center gap-3 p-4 rounded-2xl border text-center transition-all ${
                          selectedNode === 'user'
                            ? 'bg-white/5 border-white/20'
                            : 'bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                        }`}
                        style={selectedNode === 'user' ? { boxShadow: `0 0 25px ${accentColor}15`, borderColor: `${accentColor}33` } : {}}
                      >
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center" style={selectedNode === 'user' ? { backgroundColor: `${accentColor}15` } : {}}>
                          <Smartphone size={22} style={selectedNode === 'user' ? { color: accentColor } : {}} />
                        </div>
                        <span className="text-[9.5px] font-black uppercase text-white tracking-wider">{nodes.user.name.split(' ')[0]}</span>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[7.5px] text-gray-500 font-bold uppercase">UI Active</span>
                        </div>
                      </button>

                      {/* Node: CORS Gateway */}
                      <button
                        onClick={() => setSelectedNode('gateway')}
                        className={`flex flex-col items-center gap-3 p-4 rounded-2xl border text-center transition-all ${
                          selectedNode === 'gateway'
                            ? 'bg-white/5 border-white/20'
                            : 'bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                        }`}
                        style={selectedNode === 'gateway' ? { boxShadow: `0 0 25px ${accentColor}15`, borderColor: `${accentColor}33` } : {}}
                      >
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center" style={selectedNode === 'gateway' ? { backgroundColor: `${accentColor}15` } : {}}>
                          <Cpu size={22} style={selectedNode === 'gateway' ? { color: accentColor } : {}} />
                        </div>
                        <span className="text-[9.5px] font-black uppercase text-white tracking-wider">CORS Proxy</span>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[7.5px] text-gray-500 font-bold uppercase">Gateway</span>
                        </div>
                      </button>

                      {/* Node: TMDB Node */}
                      <button
                        onClick={() => setSelectedNode('tmdb')}
                        className={`flex flex-col items-center gap-3 p-4 rounded-2xl border text-center transition-all ${
                          selectedNode === 'tmdb'
                            ? 'bg-white/5 border-white/20'
                            : 'bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                        }`}
                        style={selectedNode === 'tmdb' ? { boxShadow: `0 0 25px ${accentColor}15`, borderColor: `${accentColor}33` } : {}}
                      >
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center" style={selectedNode === 'tmdb' ? { backgroundColor: `${accentColor}15` } : {}}>
                          <Globe size={22} style={selectedNode === 'tmdb' ? { color: accentColor } : {}} />
                        </div>
                        <span className="text-[9.5px] font-black uppercase text-white tracking-wider">TMDB Node</span>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[7.5px] text-gray-500 font-bold uppercase">Cached</span>
                        </div>
                      </button>

                      {/* Node: FLKRD Servers */}
                      <button
                        onClick={() => setSelectedNode('servers')}
                        className={`flex flex-col items-center gap-3 p-4 rounded-2xl border text-center transition-all ${
                          selectedNode === 'servers'
                            ? 'bg-white/5 border-white/20'
                            : 'bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                        }`}
                        style={selectedNode === 'servers' ? { boxShadow: `0 0 25px ${accentColor}15`, borderColor: `${accentColor}33` } : {}}
                      >
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center" style={selectedNode === 'servers' ? { backgroundColor: `${accentColor}15` } : {}}>
                          <Layers size={22} style={selectedNode === 'servers' ? { color: accentColor } : {}} />
                        </div>
                        <span className="text-[9.5px] font-black uppercase text-white tracking-wider">Servers</span>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[7.5px] text-gray-500 font-bold uppercase">5 Online</span>
                        </div>
                      </button>

                      {/* Node: Subtitle Engine */}
                      <button
                        onClick={() => setSelectedNode('subtitles')}
                        className={`flex flex-col items-center gap-3 p-4 rounded-2xl border text-center transition-all ${
                          selectedNode === 'subtitles'
                            ? 'bg-white/5 border-white/20'
                            : 'bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                        }`}
                        style={selectedNode === 'subtitles' ? { boxShadow: `0 0 25px ${accentColor}15`, borderColor: `${accentColor}33` } : {}}
                      >
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center" style={selectedNode === 'subtitles' ? { backgroundColor: `${accentColor}15` } : {}}>
                          <RefreshCw size={22} style={selectedNode === 'subtitles' ? { color: accentColor } : {}} />
                        </div>
                        <span className="text-[9.5px] font-black uppercase text-white tracking-wider">Kurdish CC</span>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[7.5px] text-gray-500 font-bold uppercase">Merged</span>
                        </div>
                      </button>
                    </div>

                    {/* Simulation Flow Path description */}
                    <div className="mt-8 flex items-center gap-2 bg-white/5 border border-white/5 px-4 py-2 rounded-full text-[8.5px] font-black uppercase tracking-widest text-gray-400">
                      <span>User Request</span>
                      <ArrowRight size={10} className="mx-1 stroke-[3]" />
                      <span>CORS Bypass</span>
                      <ArrowRight size={10} className="mx-1 stroke-[3]" />
                      <span>Metadata & Stream Hunt</span>
                      <ArrowRight size={10} className="mx-1 stroke-[3]" />
                      <span>Kurdish Sub Boost (+1000)</span>
                      <ArrowRight size={10} className="mx-1 stroke-[3]" />
                      <span style={{ color: accentColor }}>Unified 60+ FPS playback</span>
                    </div>
                  </div>

                  {/* Node Inspector Display */}
                  {selectedNodeData && (
                    <motion.div
                      key={selectedNode}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 bg-white/[0.01] border border-white/5 rounded-[2rem] p-6 md:p-8"
                    >
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-5">
                        <div>
                          <span className="text-[8px] font-black uppercase text-gray-500 tracking-wider">Node Inspector</span>
                          <h3 className="text-base font-black text-white uppercase tracking-wide">{selectedNodeData.name}</h3>
                          <span className="text-[8.5px] text-gray-400 font-bold uppercase">{selectedNodeData.sub}</span>
                        </div>

                        {/* Performance status indicator */}
                        <div className="flex items-center gap-2 bg-green-500/10 text-green-500 px-3.5 py-1.5 rounded-full border border-green-500/20 text-[9px] font-black uppercase tracking-wider">
                          <Activity size={10} className="animate-pulse" />
                          Node Integrity: 100% Operational
                        </div>
                      </div>

                      <p className="text-[10px] text-gray-400 font-medium leading-relaxed mb-6">{selectedNodeData.desc}</p>

                      {/* Node Stats Table */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {selectedNodeData.stats.map((s, index) => (
                          <div key={index} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-1">
                            <span className="text-[8px] font-black uppercase text-gray-500 tracking-wider">{s.label}</span>
                            <span className="text-[10.5px] font-black text-white uppercase">{s.val}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Tab: Tutorials ──────────────────────────── */}
            {activeTab === 'tutorials' && (
              <motion.div
                key="tutorials-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 md:p-10 backdrop-blur-md space-y-8"
              >
                <div className="flex items-center gap-3.5 mb-2">
                  <HelpCircle size={20} style={{ color: accentColor }} />
                  <h2 className="text-xl md:text-2xl font-[1000] text-white uppercase italic tracking-tighter">{tLocal('tutorialsTitle')}</h2>
                </div>
                <p className="text-xs text-gray-400 font-medium leading-relaxed">{tLocal('tutorialsDesc')}</p>

                <div className="grid grid-cols-1 gap-6 mt-8">
                  {/* iOS Tutorial */}
                  <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-4">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                      <Apple size={18} style={{ color: accentColor }} />
                      <h3 className="text-xs font-black uppercase text-white tracking-widest">{tLocal('iosGuideTitle')}</h3>
                    </div>
                    <div className="space-y-2.5 text-[10px] text-gray-400 font-medium leading-relaxed">
                      <p>{tLocal('iosStep1')}</p>
                      <p>{tLocal('iosStep2')}</p>
                      <p>{tLocal('iosStep3')}</p>
                    </div>
                  </div>

                  {/* Android Tutorial */}
                  <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-4">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                      <Smartphone size={18} style={{ color: accentColor }} />
                      <h3 className="text-xs font-black uppercase text-white tracking-widest">{tLocal('androidGuideTitle')}</h3>
                    </div>
                    <div className="space-y-2.5 text-[10px] text-gray-400 font-medium leading-relaxed">
                      <p>{tLocal('androidStep1')}</p>
                      <p>{tLocal('androidStep2')}</p>
                      <p>{tLocal('androidStep3')}</p>
                    </div>
                  </div>

                  {/* macOS Tutorial */}
                  <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-4">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                      <Laptop size={18} style={{ color: accentColor }} />
                      <h3 className="text-xs font-black uppercase text-white tracking-widest">{tLocal('macosGuideTitle')}</h3>
                    </div>
                    <div className="space-y-2.5 text-[10px] text-gray-400 font-medium leading-relaxed">
                      <p>{tLocal('macosStep1')}</p>
                      <p>{tLocal('macosStep2')}</p>
                      <p>{tLocal('macosStep3')}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Tab: Terms of Service ────────────────────── */}
            {activeTab === 'terms' && (
              <motion.div
                key="terms-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 md:p-10 backdrop-blur-md space-y-8"
              >
                <div className="flex items-center gap-3.5 mb-2">
                  <FileText size={20} style={{ color: accentColor }} />
                  <h2 className="text-xl md:text-2xl font-[1000] text-white uppercase italic tracking-tighter">{tLocal('termsTitle')}</h2>
                </div>
                <p className="text-xs text-gray-400 font-medium leading-relaxed">{tLocal('termsIntro')}</p>

                <div className="space-y-6 mt-8">
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest">{tLocal('terms1Title')}</h3>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">{tLocal('terms1Text')}</p>
                  </div>
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest">{tLocal('terms2Title')}</h3>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">{tLocal('terms2Text')}</p>
                  </div>
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest">{tLocal('terms3Title')}</h3>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">{tLocal('terms3Text')}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Tab: Privacy Policy ──────────────────────── */}
            {activeTab === 'privacy' && (
              <motion.div
                key="privacy-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 md:p-10 backdrop-blur-md space-y-8"
              >
                <div className="flex items-center gap-3.5 mb-2">
                  <Shield size={20} style={{ color: accentColor }} />
                  <h2 className="text-xl md:text-2xl font-[1000] text-white uppercase italic tracking-tighter">{tLocal('privacyTitle')}</h2>
                </div>
                <p className="text-xs text-gray-400 font-medium leading-relaxed">{tLocal('privacyIntro')}</p>

                <div className="space-y-6 mt-8">
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest">{tLocal('privacy1Title')}</h3>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">{tLocal('privacy1Text')}</p>
                  </div>
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest">{tLocal('privacy2Title')}</h3>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">{tLocal('privacy2Text')}</p>
                  </div>
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest">{tLocal('privacy3Title')}</h3>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">{tLocal('privacy3Text')}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Tab: DMCA & Licenses ─────────────────────── */}
            {activeTab === 'license' && (
              <motion.div
                key="license-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 md:p-10 backdrop-blur-md space-y-8"
              >
                <div className="flex items-center gap-3.5 mb-2">
                  <ShieldCheck size={20} style={{ color: accentColor }} />
                  <h2 className="text-xl md:text-2xl font-[1000] text-white uppercase italic tracking-tighter">{tLocal('tabLicense')}</h2>
                </div>
                <p className="text-xs text-gray-400 font-medium leading-relaxed">{tLocal('dmcaIntro')}</p>

                <div className="space-y-6 mt-8">
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest">{tLocal('dmca1Title')}</h3>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">{tLocal('dmca1Text')}</p>
                  </div>
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest">{tLocal('dmca2Title')}</h3>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">{tLocal('dmca2Text')}</p>
                  </div>
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest">{tLocal('dmca3Title')}</h3>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">{tLocal('dmca3Text')}</p>
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
