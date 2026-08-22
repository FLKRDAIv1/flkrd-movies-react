//
//  LocalizationService.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import SwiftUI
import Combine

class LocalizationService: ObservableObject {
    static let shared = LocalizationService()
    
    @Published var selectedLanguage: String {
        didSet {
            UserDefaults.standard.set(selectedLanguage, forKey: "selected_language")
            // Notify SwiftUI views that language changed
            objectWillChange.send()
        }
    }
    
    @Published var selectedAccentColor: String {
        didSet {
            UserDefaults.standard.set(selectedAccentColor, forKey: "selected_accent_color")
            // Notify SwiftUI views that accent color changed
            objectWillChange.send()
        }
    }
    
    private init() {
        self.selectedLanguage = UserDefaults.standard.string(forKey: "selected_language") ?? "en"
        self.selectedAccentColor = UserDefaults.standard.string(forKey: "selected_accent_color") ?? "Blue"
    }
    
    var accentColor: Color {
        switch selectedAccentColor {
        case "Red": return .red
        case "Purple": return .purple
        case "Green": return .green
        case "Yellow": return .yellow
        case "Orange": return .orange
        default: return .blue
        }
    }
    
    func t(_ key: String) -> String {
        let lang = selectedLanguage
        return LocalizationService.translations[lang]?[key] ?? LocalizationService.translations["en"]?[key] ?? key
    }
    
    static let translations: [String: [String: String]] = [
        "en": [
            // Sidebar Sections
            "section_discover": "DISCOVER",
            "section_library": "LIBRARY",
            "section_preferences": "PREFERENCES",
            
            // Sidebar Nav Tabs
            "home": "Home",
            "explore": "Explore & Search",
            "discover": "Studios & Genres",
            "tvShows": "TV Series",
            "dubbedMovies": "Kurdish Dubbed",
            "kurdishCC": "Kurdish Subtitles",
            "shorts": "Cinematic Shorts",
            "favorites": "Favorites",
            "watchParty": "Watch Party",
            "settings": "Settings & System",
            
            // Header & Search
            "searchPlaceholder": "Search movies, series, dubbed...",
            "movies": "Movies",
            "series": "Series",
            "dubbed": "Dubbed",
            "sync": "Sync",
            "online": "Online",
            "vipUser": "FLKRD VIP",
            "didYouMean": "Did you mean:",
            "kurdishDubbedTag": "KURDISH DUBBED",
            "cinemaSeriesTag": "CINEMA & SERIES",
            "viewAllInExplore": "View all results in Explore",
            "searchingFor": "Searching for",
            
            // Home & Spotlight
            "featuredPremiere": "FEATURED PREMIERE",
            "featuredSeries": "FEATURED SERIES",
            "ultraHd": "4K ULTRA HD",
            "continueWatching": "Continue Watching",
            "studios": "Featured Studios",
            "top10MoviesToday": "Top 10 Movies Today",
            "top10TVToday": "Top 10 TV Series Today",
            "trendingNow": "Trending Movies",
            "trendingToday": "Trending TV Series",
            "actionBlockbusters": "💥 Action Blockbusters",
            "epicAdventure": "🗺️ Epic Adventure",
            "scifiCyberpunk": "🚀 Sci-Fi & Cyberpunk",
            "crimeThrillers": "🕵️ Crime & Mystery Thrillers",
            "comedyFun": "😂 Comedy & Fun",
            "animationFamily": "🏰 Animation & Family",
            "topRatedMasterpieces": "⭐ Top Rated IMDb Masterpieces",
            "topRatedTVMasterpieces": "⭐ Top Rated Masterpiece Series",
            "flkrdOriginals": "📺 Netflix & HBO Exclusives",
            "seeMore": "See More",
            "play": "Play Now",
            "watchNow": "Watch Now",
            "watchSeries": "Watch Series",
            "moreInfo": "More Details",
            "errorLoading": "Error Loading Content",
            "allYears": "All Years",
            "filterByYear": "Filter by Year",
            
            // Detail & Coming Soon
            "details": "Details",
            "cast": "Starring Cast",
            "overview": "Storyline & Overview",
            "director": "Director",
            "releaseDate": "Release Date",
            "rating": "Rating",
            "duration": "Duration",
            "genre": "Genre",
            "seasons": "Seasons",
            "episodes": "Episodes",
            "episode": "Episode",
            "unreleasedTitle": "Coming Soon / Unreleased",
            "releaseCountdown": "Official Release Countdown",
            "days": "Days",
            "hours": "Hours",
            "minutes": "Minutes",
            "seconds": "Seconds",
            "adminVipPlay": "Admin VIP Early Access",
            "availableInDubbed": "Kurdish Dubbed Audio Available",
            "availableInSubtitles": "Kurdish Subtitles & CC Available",
            "moreLikeThis": "More Like This",
            "selectSource": "Select Stream Source",
            "server": "Server",
            "servers": "Servers",
            
            // Player & Subtitles
            "nextEpisode": "Next Episode",
            "prevEpisode": "Previous Episode",
            "subtitles": "Subtitles",
            "subtitlesAndCC": "Subtitles & CC",
            "kurdishTranslation": "Kurdish AI Translation",
            "subtitleSync": "Subtitle Lip-Sync Calibration",
            "fontSize": "Font Size",
            "textColor": "Text Color",
            "backgroundBlur": "Background Glass Blur",
            "lightingFilters": "Cinema Lighting & Color",
            "brightness": "Brightness",
            "contrast": "Contrast",
            "saturation": "Saturation",
            "resetFilters": "Reset Filters (0s)",
            "pipMode": "Picture in Picture",
            "fullscreen": "Fullscreen",
            "speed": "Playback Speed",
            "quality": "Stream Quality",
            
            // Dubbed Portal & Admin
            "all": "ALL",
            "newBadge": "NEW",
            "topBadge": "TOP",
            "kingBadge": "KING",
            "kurdishAudio": "Kurdish Audio",
            "adminPortal": "Admin Portal",
            "adminLogin": "Admin Login",
            "adminDashboard": "Admin Dashboard",
            "uploadMovie": "Upload New Movie",
            "uploadAndPublish": "Upload & Publish",
            "uploadTitle": "Original Movie Title",
            "uploadKurdishTitle": "Kurdish Dubbed Title",
            "uploadVideoUrl": "Direct Video / Embed URL",
            "uploadPoster": "Poster Image URL / Base64",
            "uploadBanner": "Backdrop Banner URL / Base64",
            "uploadStory": "Overview / Story Description",
            "uploadLevel": "Display Badge Level",
            "adminPassword": "Admin Password",
            "login": "Sign In",
            "logout": "Sign Out",
            "delete": "Delete",
            "edit": "Edit",
            "save": "Save Changes",
            "cancel": "Cancel",
            
            // Settings
            "preferences": "Preferences",
            "generalPreferences": "General Preferences",
            "generalSubtitle": "Language, accent color and disk cache management.",
            "language": "Interface Language",
            "english": "English",
            "kurdish": "Kurdish (Sorani)",
            "badini": "Kurdish (Badini)",
            "appColor": "Accent Theme Color",
            "designSettings": "Liquid Glass & UI",
            "playbackSettings": "Playback Engine",
            "subtitlesStudio": "Subtitles & AI Studio",
            "adminPortalTab": "Admin & Banned List",
            "aboutFLKRD": "About FLKRD Cinema",
            "performanceTurbo": "60/120 FPS Turbo Mode",
            "performanceDescription": "Hardware accelerated fluid rendering and instant zero-reload cache.",
            "clearCache": "Clear In-Memory Cache",
            "cacheCleared": "Cache Successfully Cleared",
            "checkForUpdates": "Check for Updates",
            "upToDate": "FLKRD is up to date."
        ],
        "ku": [
            // Sidebar Sections
            "section_discover": "دۆزینەوە",
            "section_library": "کتێبخانە",
            "section_preferences": "ڕێکخستنەکان",
            
            // Sidebar Nav Tabs
            "home": "سەرەکی",
            "explore": "گەڕان و دۆزینەوە",
            "discover": "کۆمپانیا و ژانەرەکان",
            "tvShows": "زنجیرە تیڤییەکان",
            "dubbedMovies": "دۆبلاژی کوردی",
            "kurdishCC": "ژێرنووسی کوردی",
            "shorts": "کورتە ڤیدیۆکان",
            "favorites": "دڵخوازەکان",
            "watchParty": "ژووری سەیرکردن",
            "settings": "ڕێکخستنەکان",
            
            // Header & Search
            "searchPlaceholder": "بگەڕێ بۆ فیلم، زنجیرە، دۆبلاژ...",
            "movies": "فیلمەکان",
            "series": "زنجیرەکان",
            "dubbed": "دۆبلاژکراو",
            "sync": "هاوکات",
            "online": "سەرهێڵ",
            "vipUser": "ئەندامی VIP",
            "didYouMean": "مەبەستت ئەمە بوو:",
            "kurdishDubbedTag": "دۆبلاژی کوردی",
            "cinemaSeriesTag": "سینەما و زنجیرە",
            "viewAllInExplore": "بینینی هەموو ئەنجامەکان لە بەشی گەڕان",
            "searchingFor": "گەڕان بۆ",
            
            // Home & Spotlight
            "featuredPremiere": "تایبەت و پەخشی نوێ",
            "featuredSeries": "زنجیرەی هەڵبژێردراو",
            "ultraHd": "کوالێتی 4K ناوازە",
            "continueWatching": "بەردەوامبە لە بینین",
            "studios": "کۆمپانیاکانی سینەما",
            "top10MoviesToday": "١٠ باشترین فیلمی ئەمڕۆ",
            "top10TVToday": "١٠ باشترین زنجیرەی ئەمڕۆ",
            "trendingNow": "فیلمە باوەکان",
            "trendingToday": "زنجیرە باوەکانی ئەمڕۆ",
            "actionBlockbusters": "💥 فیلمە ئەکشنە بەهێزەکان",
            "epicAdventure": "🗺️ سەرکێشی و گەشتی مەزن",
            "scifiCyberpunk": "🚀 زانستی و سایبەرپانک",
            "crimeThrillers": "🕵️ تاوان و نهێنی و ترسناک",
            "comedyFun": "😂 کۆمیدی و بەزم و پێکەنین",
            "animationFamily": "🏰 ئەنیمەیشن و خێزانی",
            "topRatedMasterpieces": "⭐ شاكارە بەرزەکانی IMDb",
            "topRatedTVMasterpieces": "⭐ بەرزترین زنجیرە هەڵسەنگێنراوەکان",
            "flkrdOriginals": "📺 بەرهەمە تایبەتەکانی فڵکرد",
            "seeMore": "بینینی زیاتر",
            "play": "پەخش بکە",
            "watchNow": "تەماشاکردن",
            "watchSeries": "سەیرکردنی زنجیرە",
            "moreInfo": "زانیاری زیاتر",
            "errorLoading": "هەڵە لە بارکردنی ناوەڕۆکدا",
            "allYears": "هەموو ساڵەکان",
            "filterByYear": "فلتەرکردن بەپێی ساڵ",
            
            // Detail & Coming Soon
            "details": "وردەکارییەکان",
            "cast": "ئەکتەرە بەشداربووەکان",
            "overview": "کورتە و چیرۆکی فیلم",
            "director": "دەرهێنەر",
            "releaseDate": "بەرواری پەخش",
            "rating": "هەڵسەنگاندن",
            "duration": "ماوەی فیلم",
            "genre": "جۆری فیلم",
            "seasons": "وەرزەکان",
            "episodes": "ئەڵقەکان",
            "episode": "ئەڵقەی",
            "unreleasedTitle": "بەم زووانە / پەخش نەکراو",
            "releaseCountdown": "کاتی ماوە تا پەخشی فەرمی",
            "days": "ڕۆژ",
            "hours": "کاتژمێر",
            "minutes": "خولەک",
            "seconds": "چرکە",
            "adminVipPlay": "دەستپێکردنی پێشوەختەی ئەدمین",
            "availableInDubbed": "دەنگی دۆبلاژی کوردی بەردەستە",
            "availableInSubtitles": "ژێرنووسی کوردی بەردەستە",
            "moreLikeThis": "هاوشێوەی ئەم بەرهەمە",
            "selectSource": "سێرڤەری پەخش هەڵبژێرە",
            "server": "سێرڤەر",
            "servers": "سێرڤەرەکان",
            
            // Player & Subtitles
            "nextEpisode": "ئەڵقەی داهاتوو",
            "prevEpisode": "ئەڵقەی پێشوو",
            "subtitles": "ژێرنووس",
            "subtitlesAndCC": "ژێرنووس و CC",
            "kurdishTranslation": "وەرگێڕانی زیرەکی دەستکرد",
            "subtitleSync": "ڕێکخستنی دەمی ژێرنووس (Sync)",
            "fontSize": "قەبارەی دەق",
            "textColor": "ڕەنگی دەق",
            "backgroundBlur": "لێڵکردنی شوشەیی پشتەوە",
            "lightingFilters": "فلتەر و ڕووناکی سینەما",
            "brightness": "ڕووناکی",
            "contrast": "کۆنتراست",
            "saturation": "تێری ڕەنگ",
            "resetFilters": "گەڕاندنەوە بۆ بنەڕەت",
            "pipMode": "پەنجەرەی وێنە لە وێنەدا",
            "fullscreen": "شاشەی تەواو",
            "speed": "خێرایی لێدان",
            "quality": "کوالێتی پەخش",
            
            // Dubbed Portal & Admin
            "all": "هەمووی",
            "newBadge": "نوێ",
            "topBadge": "نایاب",
            "kingBadge": "تایبەت",
            "kurdishAudio": "دەنگی کوردی",
            "adminPortal": "بەشی بەڕێوەبەر",
            "adminLogin": "چوونەژوورەوەی ئەدمین",
            "adminDashboard": "داشبۆردی کۆنترۆڵ",
            "uploadMovie": "زیادکردنی فیلمی نوێ",
            "uploadAndPublish": "بارکردن و بڵاوکردنەوە",
            "uploadTitle": "ناوی فیلم بە ئینگلیزی",
            "uploadKurdishTitle": "ناوی فیلم بە کوردی",
            "uploadVideoUrl": "لینکی ڕاستەوخۆ یان ئیمبێد",
            "uploadPoster": "لینکی پۆستەر یان Base64",
            "uploadBanner": "لینکی باکدراپ یان Base64",
            "uploadStory": "کورتەی چیرۆک بە کوردی",
            "uploadLevel": "ئاستی باج (LEVEL)",
            "adminPassword": "تێپەڕەوشەی ئەدمین",
            "login": "داخڵبوون",
            "logout": "دەرچوون",
            "delete": "سڕینەوە",
            "edit": "دەستکاری",
            "save": "پاشەکەوتکردن",
            "cancel": "پەشیمانبوونەوە",
            
            // Settings
            "preferences": "ڕێکخستنەکان",
            "generalPreferences": "ڕێکخستنی گشتی",
            "generalSubtitle": "زمان، ڕەنگی بەرنامە و بەڕێوەبردنی کاش.",
            "language": "زمانی بەرنامە",
            "english": "ئینگلیزی (English)",
            "kurdish": "کوردی (سۆرانی)",
            "badini": "کوردی (بادینی)",
            "appColor": "ڕەنگی سەرەکی بەرنامە",
            "designSettings": "دیزاین و شێوازی شوشەیی",
            "playbackSettings": "ماتۆڕی لێدەری ڤیدیۆ",
            "subtitlesStudio": "ستۆدیۆی ژێرنووس و AI",
            "adminPortalTab": "ئەدمین و لیستی قەدەغەکراو",
            "aboutFLKRD": "دەربارەی فڵکرد سینەما",
            "performanceTurbo": "مۆدی خێرایی ٦٠/١٢٠ فڕێم",
            "performanceDescription": "باشترکردنی ڕەوانی جوڵەکان و گواستنەوەی خێرا بەبێ لۆدبوون.",
            "clearCache": "سڕینەوەی کاشی کاتی",
            "cacheCleared": "کاش بە سەرکەوتوویی سڕایەوە",
            "checkForUpdates": "پشکنینی نوێکردنەوە",
            "upToDate": "بەرنامەکە لە نوێترین وەشاندایە."
        ],
        "badini": [
            // Sidebar Sections
            "section_discover": "دۆزینەڤە",
            "section_library": "پەرتووکخانە",
            "section_preferences": "ڕێکخستنێن سیستەمی",
            
            // Sidebar Nav Tabs
            "home": "سەرەکی",
            "explore": "گەڕیان و لێگەڕیان",
            "discover": "کۆمپانی و بەشێن سینەمایێ",
            "tvShows": "زنجیرێن تیڤی",
            "dubbedMovies": "دۆبلاژێ کوردی",
            "kurdishCC": "ژێرنووسێ کوردی",
            "shorts": "کورتە ڤیدیۆ",
            "favorites": "دڵخوازێن من",
            "watchParty": "ژوورا تەماشاکرنێ",
            "settings": "ڕێکخستن",
            
            // Header & Search
            "searchPlaceholder": "بگەڕی بۆ فیلم، زنجیرە، دۆبلاژ...",
            "movies": "فیلم",
            "series": "زنجیرە",
            "dubbed": "دۆبلاژکری",
            "sync": "هەڤدەم",
            "online": "سەرهێڵ",
            "vipUser": "ئەندامێ VIP",
            "didYouMean": "مەبەستا تە ئەڤە بوو:",
            "kurdishDubbedTag": "دۆبلاژێ کوردی",
            "cinemaSeriesTag": "سینەما و زنجیرە",
            "viewAllInExplore": "دیتنا هەمی ئەنجامان د گەڕیانێ دا",
            "searchingFor": "لێگەڕیان بۆ",
            
            // Home & Spotlight
            "featuredPremiere": "تایبەت و بەلاڤکرنا نووی",
            "featuredSeries": "زنجیرەیا هەلبژارتی",
            "ultraHd": "کوالێتییا 4K یا بێ وێنە",
            "continueWatching": "بەردەوامبە ل تەماشاکرنێ",
            "studios": "کۆمپانیێن مەزنێن سینەمایێ",
            "top10MoviesToday": "١٠ باشترین فیلمێن ئەڤرۆ",
            "top10TVToday": "١٠ باشترین زنجیرێن ئەڤرۆ",
            "trendingNow": "فیلمێن نوکە باو",
            "trendingToday": "زنجیرێن ئەڤرۆ یێن باو",
            "actionBlockbusters": "💥 فیلمێن ئەکشن و بزاڤێ",
            "epicAdventure": "🗺️ سەرهاتی و گەشتێن نایاب",
            "scifiCyberpunk": "🚀 زانستی و سایبەرپانک",
            "crimeThrillers": "🕵️ تاوان و نهێنی و ترسناک",
            "comedyFun": "😂 کۆمیدی و کەیف و کەنی",
            "animationFamily": "🏰 ئەنیمەیشن و خێزانی",
            "topRatedMasterpieces": "⭐ شاهکارێن بلندێن IMDb",
            "topRatedTVMasterpieces": "⭐ زنجیرێن هەرە بلند هەلسەنگاندی",
            "flkrdOriginals": "📺 بەرهەمێن تایبەتێن فڵکرد",
            "seeMore": "دیتنا زێدەتر",
            "play": "پەخش بکە",
            "watchNow": "تەماشاکرن",
            "watchSeries": "تەماشاکرنا زنجیرێ",
            "moreInfo": "پێزانینێن زێدەتر",
            "errorLoading": "خەلەتی د بارکرنا ناڤەڕۆکێ دا",
            "allYears": "هەمی سال",
            "filterByYear": "فلتەرکرن ل دووڤ سالێ",
            
            // Detail & Coming Soon
            "details": "هوورکاری",
            "cast": "ئەکتەرێن پشکدار",
            "overview": "کورتیا چیڕۆکا فیلمی",
            "director": "دەرهێنەر",
            "releaseDate": "مێژوویا بەلاڤکرنێ",
            "rating": "هەلسەنگاندن",
            "duration": "دەمێ فیلمی",
            "genre": "جوڕێ فیلمی",
            "seasons": "وەرز",
            "episodes": "ئەڵقە",
            "episode": "ئەڵقەیا",
            "unreleasedTitle": "ب لەز دێ هێت / نەهاتییە بەلاڤکرن",
            "releaseCountdown": "دەمێ مایی تا بەلاڤکرنا فەرمی",
            "days": "ڕۆژ",
            "hours": "دەژمێر",
            "minutes": "خولەک",
            "seconds": "چرکە",
            "adminVipPlay": "دەستپێکرنا ئەدمینی یا VIP",
            "availableInDubbed": "دەنگێ دۆبلاژکریێ کوردی بەردەستە",
            "availableInSubtitles": "ژێرنووسێ کوردی بەردەستە",
            "moreLikeThis": "وەکی ڤی بەرهەمی",
            "selectSource": "سێرڤەرێ پەخشێ هەلبژێرە",
            "server": "سێرڤەر",
            "servers": "سێرڤەرێن بەردەست",
            
            // Player & Subtitles
            "nextEpisode": "ئەڵقەیا دیتر",
            "prevEpisode": "ئەڵقەیا پێشتر",
            "subtitles": "ژێرنووس",
            "subtitlesAndCC": "ژێرنووس و CC",
            "kurdishTranslation": "وەرگێڕانا ژیرییا دەستکرد",
            "subtitleSync": "ڕێکخستنا کاتی ژێرنووسی (Sync)",
            "fontSize": "مەزناهیا دەقی",
            "textColor": "ڕەنگێ دەقی",
            "backgroundBlur": "لێڵکرنا پاشبنەمای",
            "lightingFilters": "فلتەرێن ڕووناهیێ و سینەمایێ",
            "brightness": "ڕووناهی",
            "contrast": "کۆنتراست",
            "saturation": "تێرییا ڕەنگی",
            "resetFilters": "ڤەگەڕاندن بۆ دەستپێکێ",
            "pipMode": "پەنجەرا وێنەی د وێنەی دا",
            "fullscreen": "شاشەیا تەمام",
            "speed": "خێراییا لێدانێ",
            "quality": "کوالێتییا پەخشێ",
            
            // Dubbed Portal & Admin
            "all": "هەمی",
            "newBadge": "نوو",
            "topBadge": "نایاب",
            "kingBadge": "تایبەت",
            "kurdishAudio": "دەنگێ کوردی",
            "adminPortal": "پۆرتالا ڕێڤەبەری",
            "adminLogin": "چوونەژوورا ئەدمینی",
            "adminDashboard": "داشبۆردا کۆنترۆلێ",
            "uploadMovie": "زێدەکرنا فیلمەکێ نوو",
            "uploadAndPublish": "بارکرن و بەلاڤکرن",
            "uploadTitle": "ناڤێ فیلمی ب ئینگلیزی",
            "uploadKurdishTitle": "ناڤێ فیلمی ب کوردی",
            "uploadVideoUrl": "لینکا ئێکسەر یان ئیمبێد",
            "uploadPoster": "لینکا پۆستەری یان Base64",
            "uploadBanner": "لینکا باکدراپی یان Base64",
            "uploadStory": "کورتیا چیڕۆکێ ب کوردی",
            "uploadLevel": "ئاستێ نیشانێ (LEVEL)",
            "adminPassword": "پەیڤا نهێنی یا ئەدمینی",
            "login": "داخڵبوون",
            "logout": "دەرکەفتن",
            "delete": "ژێبرن",
            "edit": "دەستکاری",
            "save": "پاراستن",
            "cancel": "پاشگەزبوون",
            
            // Settings
            "preferences": "ڕێکخستنێن بەرنامەی",
            "generalPreferences": "ڕێکخستنا گشتی",
            "generalSubtitle": "زمان، ڕەنگێ بەرنامەی و پاراستنا کاشی.",
            "language": "زمانێ بەرنامەی",
            "english": "ئینگلیزی (English)",
            "kurdish": "کوردی (سۆرانی)",
            "badini": "کوردی (بادینی)",
            "appColor": "ڕەنگێ سەرەکیێ بەرنامەی",
            "designSettings": "دیزاین و شێوازێ شوشەیی",
            "playbackSettings": "ماتۆڕێ ڤیدیۆ پلەیەرێ",
            "subtitlesStudio": "ستۆدیۆیا ژێرنووسان و ژیرییا دەستکرد",
            "adminPortalTab": "ئەدمین و لیستا قەدەغەکریان",
            "aboutFLKRD": "دەربارەی فڵکرد سینەما",
            "performanceTurbo": "مۆدێ خێراییا ٦٠/١٢٠ فڕێم",
            "performanceDescription": "باشترکرنا بلەز و ڕەوان یا پەڕان بێیی لۆدبوون.",
            "clearCache": "پاڤژکرنا کاشێ دەمکی",
            "cacheCleared": "کاش ب سەرکەفتی هاتە پاڤژکرن",
            "checkForUpdates": "پشکنینا نویکرنێ",
            "upToDate": "بەرنامە د نوویترین وەشانێ دایە."
        ]
    ]
}
