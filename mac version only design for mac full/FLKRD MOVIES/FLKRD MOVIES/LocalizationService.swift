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
            // Header & Nav
            "home": "Home",
            "explore": "Explore",
            "discover": "Discover",
            "tvShows": "TV Series",
            "dubbedMovies": "Kurdish Dubbed",
            "kurdishCC": "Kurdish CC",
            "shorts": "Cinematic Shorts",
            "favorites": "Favorites",
            "watchParty": "Watch Party",
            "settings": "Settings",
            
            // UI
            "searchPlaceholder": "Search for movies or shows...",
            "continueWatching": "Continue Watching",
            "weeklySpotlight": "Weekly Spotlight",
            "recentlyViewed": "Recently Viewed",
            "trendingNow": "Trending Now",
            "flkrdOriginals": "FLKRD Originals",
            "topRatedMovies": "Top Rated Movies",
            "seeMore": "See More",
            "play": "Play Now",
            "seasons": "Seasons",
            "episodes": "Episodes",
            "episode": "Episode",
            "subtitles": "Subtitles",
            "moreLikeThis": "More Like This",
            "details": "Details",
            "cast": "Cast",
            
            // Discover
            "hollywood": "Hollywood",
            "bollywood": "Bollywood",
            "animations": "Animations",
            "byCountry": "By Country",
            "choiceCountry": "Choose Country",
            "discoverPrompt": "What do you want to watch?",
            
            // Settings
            "language": "Language",
            "english": "English",
            "kurdish": "Sorani Kurdish",
            "badini": "Badini Kurdish",
            "appColor": "App Color",
            "designSettings": "Design & Style",
            "performanceTurbo": "Performance Turbo",
            "performanceDescription": "Optimized for performance",
            "videoQualityPreset": "Video Quality Preset",
            "maxResolution": "Maximum Resolution",
            "frameRateLimit": "Frame Rate Limit",
            "videoVolume": "Video Volume",
            "transitionDuration": "Transition Duration"
        ],
        "ku": [
            // Header & Nav
            "home": "سەرەکی",
            "explore": "گەڕان",
            "discover": "دۆزینەوە",
            "tvShows": "زنجیرەکان",
            "dubbedMovies": "دۆبلاژی کوردی",
            "kurdishCC": "ژێرنووسی کوردی",
            "shorts": "کورتە ڤیدیۆکان",
            "favorites": "دڵخوازەکان",
            "watchParty": "شەکەرۆکە",
            "settings": "ڕێکخستنەکان",
            
            // UI
            "searchPlaceholder": "بگەڕێ بۆ فیلم و زنجیرە...",
            "continueWatching": "بەردەوامبە لە بینین",
            "weeklySpotlight": "تیشکی هەفتە",
            "recentlyViewed": "دوایین بینراوەکان",
            "trendingNow": "ئێستا باوە",
            "flkrdOriginals": "بەرهەمەکانی فڵکرد",
            "topRatedMovies": "فیلمە نایابەکان",
            "seeMore": "بینینی زیاتر",
            "play": "پەخش بکە",
            "seasons": "وەرزەکان",
            "episodes": "ئەڵقەکان",
            "episode": "ئەڵقەی",
            "subtitles": "ژێرنووس",
            "moreLikeThis": "فیلمی هاوشێوە",
            "details": "وردەکاری",
            "cast": "ئەکتەرەکان",
            
            // Discover
            "hollywood": "هۆڵیوود",
            "bollywood": "بۆڵیوود",
            "animations": "ئەنیمەیشنەکان",
            "byCountry": "بەپێی وڵات",
            "choiceCountry": "وڵاتێک هەڵبژێرە",
            "discoverPrompt": "دەتەوێت سەیری چی بکەیت؟",
            
            // Settings
            "language": "زمان",
            "english": "ئینگلیزی",
            "kurdish": "سۆرانی کوردی",
            "badini": "بادینی کوردی",
            "appColor": "ڕەنگی بەرنامە",
            "designSettings": "شێواز و دیزاین",
            "performanceTurbo": "خێراکاری بەرنامە",
            "performanceDescription": "باشترکردنی بۆ مۆبایلە لاوازەکان",
            "videoQualityPreset": "کوالێتی ڤیدیۆ",
            "maxResolution": "بەرزترین ڕوونی",
            "frameRateLimit": "ڕێژەی فڕێم",
            "videoVolume": "دەنگی ڤیدیۆ",
            "transitionDuration": "ماوەی گواستنەوە"
        ],
        "badini": [
            // Header & Nav
            "home": "سەرەکی",
            "explore": "گەڕیان",
            "discover": "دۆزینەوە",
            "tvShows": "زنجیرەکان",
            "dubbedMovies": "دۆبلاژی کوردی",
            "kurdishCC": "ژێرنووسی کوردی",
            "shorts": "کورتە ڤیدیۆکان",
            "favorites": "دڵخوازەکان",
            "watchParty": "شەکەرۆکە",
            "settings": "ڕێکخستنێن",
            
            // UI
            "searchPlaceholder": "بگەڕی بۆ فیلم و زنجیران...",
            "continueWatching": "بەردەوامبە لە دیتنێ",
            "weeklySpotlight": "ڕووناهیا هەفتەیێ",
            "recentlyViewed": "دوایین دیتنەکان",
            "trendingNow": "نوکە یا باوە",
            "flkrdOriginals": "بەرهەمێن فڵکرد",
            "topRatedMovies": "فیلمێن نایاب",
            "seeMore": "دیتنا زێدەتر",
            "play": "پەخش بکە",
            "seasons": "وەرزەکان",
            "episodes": "ئەڵقەکان",
            "episode": "ئەڵقەیا",
            "subtitles": "ژێرنووس",
            "moreLikeThis": "فیلمێن هاوشێوە",
            "details": "وردەکاری",
            "cast": "ئەکتەرەکان",
            
            // Discover
            "hollywood": "هۆڵیوود",
            "bollywood": "بۆڵیوود",
            "animations": "ئەنیمەیشنەکان",
            "byCountry": "بەپێی وڵات",
            "choiceCountry": "وڵاتەک هەڵبژێرە",
            "discoverPrompt": "دەتەوێت سەیری چی بکەیت؟",
            
            // Settings
            "language": "زمان",
            "english": "ئینگلیزی",
            "kurdish": "سۆرانی",
            "badini": "بادینی",
            "appColor": "ڕەنگێ بەرنامەی",
            "designSettings": "شێواز و دیزاین",
            "performanceTurbo": "چالاککرنا خێرا",
            "performanceDescription": "باشترکردن بۆ مۆبایلێن لاواز",
            "videoQualityPreset": "کوالێتی ڤیدیۆ",
            "maxResolution": "بەرزترین ڕوونی",
            "frameRateLimit": "ڕێژەی فڕێم",
            "videoVolume": "دەنگی ڤیدیۆ",
            "transitionDuration": "ماوەی گواستنەوە"
        ]
    ]
}
