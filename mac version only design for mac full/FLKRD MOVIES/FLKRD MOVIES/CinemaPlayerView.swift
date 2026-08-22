//
//  CinemaPlayerView.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import SwiftUI
import AVKit
import Combine
import WebKit

struct SubtitleCue: Identifiable {
    let id = UUID()
    let start: Double
    let end: Double
    let text: String
}

struct CinemaPlayerView: View {
    let videoURLString: String
    let movieTitle: String
    var isCoWatchMode: Bool = false
    var ticketId: String? = nil
    var isHost: Bool = false
    
    // Parameters to resolve universal web stream URLs
    var tmdbId: Int? = nil
    var mediaType: String? = nil
    var seasonNumber: Int? = nil
    var episodeNumber: Int? = nil
    var customDubbedMovie: DubbedMovie? = nil
    var posterPath: String? = nil
    var initialSource: String? = nil
    
    @ObservedObject var lang = LocalizationService.shared
    @Environment(\.presentationMode) var presentationMode
    
    // Player core state
    @State private var player: AVPlayer?
    @State private var isPlaying = false
    @State private var currentTime: Double = 0
    @State private var duration: Double = 1
    @State private var volume: Double = 0.8
    @State private var isMuted = false
    @State private var showControls = true
    @State private var lastSavedTime: Date = Date.distantPast
    @State private var didPlayToEndObserver: Any? = nil
    @State private var sleepActivityToken: NSObjectProtocol?
    
    // Current Active Source
    @State private var currentSource: String = PlayerSourceManager.shared.defaultSource
    @State private var currentSeasonNum: Int = 1
    @State private var currentEpisodeNum: Int = 1
    
    // HUD Panels & Popovers
    @State private var showSubtitleModal = false
    @State private var showSourcePicker = false
    @State private var showFilterModal = false
    @State private var showEpisodeModal = false
    @State private var showChat = false
    
    // Subtitles & Kurdish CC settings
    @State private var selectedSubtitleLanguage = "ku" // ku (Sorani), badini, en, ar, tr, fa
    @State private var kurdishTranslationEnabled = true
    @State private var subtitleOffset: Double = 0.0 // seconds
    @AppStorage("flkrd_sub_font_size") private var subtitleFontSize: Double = 22.0
    @AppStorage("flkrd_sub_bg_opacity") private var subtitleBackgroundOpacity: Double = 0.0 // Default to 0 (No background box)
    @AppStorage("flkrd_sub_bg_blur") private var subtitleBackgroundBlur: Bool = false
    @AppStorage("flkrd_sub_color") private var subtitleTextColor: String = "white" // white, yellow, cyan, green, amber
    @AppStorage("flkrd_sub_stroke") private var subtitleHasStroke: Bool = true // Deep black outline
    @AppStorage("flkrd_sub_weight") private var subtitleFontWeight: String = "bold" // bold, heavy, medium
    @AppStorage("flkrd_sub_vertical_offset") private var subtitleVerticalOffset: Double = 65.0 // Bottom padding
    @State private var subtitleStudioTab: String = "tracks" // "tracks" or "style"
    @State private var activeSubtitleCue: String = ""
    @State private var subtitleCues: [SubtitleCue] = []
    @State private var isTranslatingSubtitles = false
    @State private var availableSubtitleTracks: [OpenSubtitleTrack] = []
    @State private var loadingOpenSubtitles = false
    @State private var selectedTrackId: Int? = nil
    @State private var subtitleSearchText: String = ""
    @State private var translationProgress: Double = 0.0
    
    let webSubtitleSyncTimer = Timer.publish(every: 0.5, on: .main, in: .common).autoconnect()
    
    // Video Lighting Adjustments
    @State private var brightness: Double = 0.0
    @State private var contrast: Double = 1.0
    @State private var saturation: Double = 1.0
    
    // TV Series Season & Episode List
    @State private var seasonsList: [Season] = []
    @State private var episodesList: [Episode] = []
    @State private var loadingEpisodes = false
    
    // Co-Watch properties
    @State private var chatMessage: String = ""
    @State private var messages: [RoomMessage] = []
    @State private var ticketStatus: String = "waiting"
    
    private let timer = Timer.publish(every: 1.5, on: .main, in: .common).autoconnect()
    @State private var timeObserverToken: Any?
    
    let availableSources = [
        ("FLKRD SERVER", "VidKing Multi-Embed (Top 1)"),
        ("FLKRD SERVER 1", "VidLink Pro 4K (Top 2)"),
        ("FLKRD SERVER 2", "VidSrc Real-Time (Top 3)"),
        ("FLKRD SERVER 3", "SuperEmbed High Speed"),
        ("FLKRD SERVER 4", "CinePro Direct Stream")
    ]
    
    let subtitleLanguages = [
        ("ku", "کوردی (سۆرانی)", "Flag_of_Kurdistan"),
        ("badini", "کوردی (بادینی)", "Flag_of_Kurdistan"),
        ("en", "English", "us"),
        ("ar", "العربية", "sa"),
        ("fa", "فارسی", "ir"),
        ("tr", "Türkçe", "tr"),
        ("fr", "Français", "fr"),
        ("de", "Deutsch", "de"),
        ("es", "Español", "es")
    ]
    
    static func cleanVideoURL(_ urlString: String) -> String {
        let trimmed = urlString.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.lowercased().contains("<iframe") {
            let pattern = #"src\s*=\s*["']([^"']+)["']"#
            if let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) {
                let nsString = trimmed as NSString
                let results = regex.matches(in: trimmed, options: [], range: NSRange(location: 0, length: nsString.length))
                if let match = results.first, match.numberOfRanges > 1 {
                    let srcRange = match.range(at: 1)
                    var srcUrl = nsString.substring(with: srcRange)
                    if srcUrl.hasPrefix("//") {
                        srcUrl = "https:" + srcUrl
                    }
                    return srcUrl
                }
            }
        }
        return trimmed
    }
    
    var resolvedVideoURL: String {
        if let custom = customDubbedMovie {
            return CinemaPlayerView.cleanVideoURL(custom.videoUrl)
        }
        if !videoURLString.isEmpty && videoURLString != "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4" {
            return CinemaPlayerView.cleanVideoURL(videoURLString)
        }
        
        let type = mediaType ?? "movie"
        let tmdb = String(tmdbId ?? 999)
        let sourceName = currentSource
        let playerColor = "3b82f6" // blue accent
        
        switch sourceName {
        case "FLKRD SERVER": // 1. 111Movies Ultra 4K
            if type == "tv" {
                return "https://111movies.com/tv/\(tmdb)/\(currentSeasonNum)/\(currentEpisodeNum)"
            } else {
                return "https://111movies.com/movie/\(tmdb)"
            }

        case "FLKRD SERVER 1": // 2. VidLove 4K Pro (player.vidlove.cc)
            let vlParams = "?autoplay=true&nextbutton=true&download=true&primarycolor=\(playerColor)&secondarycolor=c49de8"
            if type == "tv" {
                return "https://player.vidlove.cc/embed/tv/\(tmdb)/\(currentSeasonNum)/\(currentEpisodeNum)\(vlParams)"
            } else {
                return "https://player.vidlove.cc/embed/movie/\(tmdb)\(vlParams)"
            }
            
        case "FLKRD SERVER 2": // 3. VidLink Pro 4K
            let vlParams = "?primaryColor=\(playerColor)&secondaryColor=a2a2a2&iconColor=eefdec&playerIcon=default&title=true&poster=true&autoplay=true&nextbutton=true"
            if type == "tv" {
                return "https://vidlink.pro/tv/\(tmdb)/\(currentSeasonNum)/\(currentEpisodeNum)\(vlParams)"
            } else {
                return "https://vidlink.pro/movie/\(tmdb)\(vlParams)"
            }

        case "FLKRD SERVER 3": // 4. Videasy HD
            if type == "tv" {
                return "https://player.videasy.net/tv/\(tmdb)/\(currentSeasonNum)/\(currentEpisodeNum)?color=\(playerColor)&overlay=true"
            } else {
                return "https://player.videasy.net/movie/\(tmdb)?color=\(playerColor)&overlay=true"
            }
            
        case "FLKRD SERVER 4": // 5. VidKing 4K
            let vkParams = "&color=\(playerColor)&autoplay=1&playsinline=1&subtitles=0"
            if type == "tv" {
                return "https://www.vidking.net/embed/tv/\(tmdb)/\(currentSeasonNum)/\(currentEpisodeNum)?\(vkParams)&nextEpisode=true&episodeSelector=true"
            } else {
                return "https://www.vidking.net/embed/movie/\(tmdb)?\(vkParams)"
            }
            
        case "FLKRD SERVER 5": // 6. AutoEmbed VIP
            if type == "tv" {
                return "https://autoembed.co/tv/tmdb/\(tmdb)-\(currentSeasonNum)-\(currentEpisodeNum)"
            } else {
                return "https://autoembed.co/movie/tmdb/\(tmdb)"
            }

        case "FLKRD SERVER 6": // 7. VidSrc VIP
            if type == "tv" {
                return "https://vidsrc.pm/embed/tv/\(tmdb)/\(currentSeasonNum)/\(currentEpisodeNum)"
            } else {
                return "https://vidsrc.pm/embed/movie/\(tmdb)"
            }

        case "FLKRD SERVER 7": // 8. SuperEmbed Multi-Mirror
            if type == "tv" {
                return "https://multiembed.mov/?video_id=\(tmdb)&tmdb=1&s=\(currentSeasonNum)&e=\(currentEpisodeNum)"
            } else {
                return "https://multiembed.mov/?video_id=\(tmdb)&tmdb=1"
            }
            
        default: // Fallback to 111Movies Ultra 4K
            if type == "tv" {
                return "https://111movies.com/tv/\(tmdb)/\(currentSeasonNum)/\(currentEpisodeNum)"
            } else {
                return "https://111movies.com/movie/\(tmdb)"
            }
        }
    }
    
    var isWebEmbed: Bool {
        let url = resolvedVideoURL.lowercased()
        return url.contains("vidlink.pro") || 
               url.contains("videasy") || 
               url.contains("vidlove.cc") || 
               url.contains("111movies") || 
               url.contains("vidking.net") || 
               url.contains("vidsrc") || 
               url.contains("autoembed") || 
               url.contains("multiembed") || 
               url.contains("embed") || 
               (!url.contains(".mp4") && !url.contains(".m3u8") && !url.contains(".mov") && url.starts(with: "http"))
    }
    
    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            
            if isWebEmbed {
                ZStack(alignment: .topLeading) {
                    WebKitPlayerView(urlString: resolvedVideoURL, onTimeUpdate: { time, dur in
                        self.currentTime = time
                        if let d = dur, d > 0 {
                            self.duration = d
                        }
                        self.updateActiveSubtitleCue()
                        self.saveWatchProgress()
                    })
                    .id("\(resolvedVideoURL)_\(currentSource)")
                    .edgesIgnoringSafeArea(.all)
                    .brightness(brightness)
                    .contrast(contrast)
                    .saturation(saturation)
                    
                    // Subtitle Cue Text Overlay for WebKit Player
                    subtitleOverlayView
                    
                    // Floating Top Glass Toolbar for WebKit Stream
                    HStack(spacing: 12) {
                        Button {
                            closePlayer()
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "chevron.left")
                                    .font(.system(size: 13, weight: .bold))
                                Text("Back to Details")
                                    .font(.system(size: 11, weight: .bold))
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .glassPanel(cornerRadius: 12)
                        }
                        .buttonStyle(.plain)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text(movieTitle)
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.white)
                            if (mediaType ?? "") == "tv" {
                                Text("Season \(currentSeasonNum) • Episode \(currentEpisodeNum)")
                                    .font(.system(size: 10, weight: .medium))
                                    .foregroundColor(.blue.opacity(0.8))
                            }
                        }
                        .padding(.horizontal, 8)
                        
                        Spacer()
                        
                        // Server Switcher Button
                        let activeSourceItem = PlayerSourceManager.shared.allSources.first(where: { $0.id == currentSource }) ?? PlayerSourceManager.shared.allSources[0]
                        Button {
                            showSourcePicker.toggle()
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "server.rack")
                                Text(activeSourceItem.name)
                                Image(systemName: "chevron.down")
                            }
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .glassPanel(cornerRadius: 12)
                        }
                        .buttonStyle(.plain)
                        .popover(isPresented: $showSourcePicker) {
                            sourcePickerMenu
                        }
                        
                        // Kurdish CC & Subtitles Modal Button
                        Button {
                            showSubtitleModal.toggle()
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "captions.bubble.fill")
                                    .foregroundColor(.red)
                                if isTranslatingSubtitles {
                                    Text("✨ \(Int(translationProgress * 100))%")
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundColor(.yellow)
                                } else {
                                    Text(availableSubtitleTracks.isEmpty ? "Subtitles" : "Kurdish CC (\(availableSubtitleTracks.count))")
                                        .font(.system(size: 11, weight: .bold))
                                }
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .glassPanel(cornerRadius: 12)
                        }
                        .buttonStyle(.plain)
                        .popover(isPresented: $showSubtitleModal) {
                            subtitleManagerPopover
                        }
                        
                        // Video Lighting Filters Button
                        Button {
                            showFilterModal.toggle()
                        } label: {
                            Image(systemName: "slider.horizontal.3")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.white)
                                .frame(width: 32, height: 32)
                                .glassPanel(cornerRadius: 16)
                        }
                        .buttonStyle(.plain)
                        .popover(isPresented: $showFilterModal) {
                            videoFiltersPopover
                        }
                        
                        // TV Show Controls (Prev, Selector, Next)
                        if (mediaType ?? "") == "tv" {
                            HStack(spacing: 6) {
                                // Previous Episode
                                Button {
                                    previousEpisode()
                                } label: {
                                    Image(systemName: "backward.end.fill")
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundColor(currentEpisodeNum > 1 ? .white : .white.opacity(0.3))
                                        .frame(width: 32, height: 32)
                                        .glassPanel(cornerRadius: 16)
                                }
                                .buttonStyle(.plain)
                                .disabled(currentEpisodeNum <= 1)
                                
                                // Episode Selector Button
                                Button {
                                    showEpisodeModal.toggle()
                                } label: {
                                    HStack(spacing: 5) {
                                        Image(systemName: "list.bullet.rectangle.portrait.fill")
                                            .foregroundColor(.blue)
                                        Text("S\(currentSeasonNum) E\(currentEpisodeNum)")
                                            .font(.system(size: 11, weight: .black))
                                    }
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .glassPanel(cornerRadius: 12)
                                }
                                .buttonStyle(.plain)
                                .popover(isPresented: $showEpisodeModal) {
                                    episodesPopover
                                }
                                
                                // Next Episode
                                Button {
                                    nextEpisode()
                                } label: {
                                    Image(systemName: "forward.end.fill")
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundColor(.white)
                                        .frame(width: 32, height: 32)
                                        .glassPanel(cornerRadius: 16)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    .padding(24)
                }
                .onReceive(webSubtitleSyncTimer) { _ in
                    if isWebEmbed {
                        self.updateActiveSubtitleCue()
                    }
                }
            } else {
                // Native AVPlayer Fullscreen
                if let player = player {
                    VideoPlayer(player: player)
                        .edgesIgnoringSafeArea(.all)
                        .brightness(brightness)
                        .contrast(contrast)
                        .saturation(saturation)
                        .onTapGesture {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                showControls.toggle()
                            }
                        }
                    
                    // Subtitle text cue overlay on video
                    subtitleOverlayView
                } else {
                    ZStack {
                        Color.black
                        VStack(spacing: 12) {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .blue))
                            Text("Loading cinema stream...")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.white.opacity(0.6))
                        }
                    }
                }
                
                // Native Cinema Controls HUD Overlay
                if showControls {
                    VStack {
                        // Header Bar
                        HStack(spacing: 12) {
                            Button {
                                cleanupPlayer()
                                closePlayer()
                            } label: {
                                Image(systemName: "chevron.left")
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundColor(.white)
                                    .frame(width: 36, height: 36)
                                    .glassPanel(cornerRadius: 18)
                            }
                            .buttonStyle(.plain)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text(movieTitle)
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(.white)
                                if isCoWatchMode {
                                    Text("Co-Watching Room Active")
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundColor(.cyan)
                                }
                            }
                            .padding(.leading, 8)
                            
                            Spacer()
                            
                            // Kurdish CC & Subtitles Modal Button
                            Button {
                                showSubtitleModal.toggle()
                            } label: {
                                HStack(spacing: 6) {
                                    Image(systemName: "captions.bubble.fill")
                                        .foregroundColor(.red)
                                    Text("Kurdish CC")
                                }
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .glassPanel(cornerRadius: 12)
                            }
                            .buttonStyle(.plain)
                            .popover(isPresented: $showSubtitleModal) {
                                subtitleManagerPopover
                            }
                            
                            // Video Filters Button
                            Button {
                                showFilterModal.toggle()
                            } label: {
                                Image(systemName: "slider.horizontal.3")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(.white)
                                    .frame(width: 36, height: 36)
                                    .glassPanel(cornerRadius: 18)
                            }
                            .buttonStyle(.plain)
                            .popover(isPresented: $showFilterModal) {
                                videoFiltersPopover
                            }
                            
                            if isCoWatchMode {
                                Button {
                                    withAnimation(.spring()) {
                                        showChat.toggle()
                                    }
                                } label: {
                                    Image(systemName: "bubble.left.and.bubble.right.fill")
                                        .font(.system(size: 14))
                                        .foregroundColor(showChat ? .cyan : .white)
                                        .frame(width: 36, height: 36)
                                        .glassPanel(cornerRadius: 18)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, 24)
                        .padding(.top, 24)
                        
                        Spacer()
                        
                        // Footer Glass Control Center
                        VStack(spacing: 14) {
                            // Progress Slider
                            HStack(spacing: 12) {
                                Text(formatTime(currentTime))
                                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                                    .foregroundColor(.white.opacity(0.8))
                                
                                GlassSlider(
                                    value: Binding(
                                        get: { currentTime },
                                        set: { newValue in
                                            seek(to: newValue)
                                        }
                                    ),
                                    bounds: 0...max(1, duration),
                                    step: 1.0,
                                    activeColor: .blue
                                )
                                
                                Text(formatTime(duration))
                                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                                    .foregroundColor(.white.opacity(0.8))
                            }
                            
                            // Controls Row
                            HStack(spacing: 24) {
                                // Skip Back 10s
                                Button {
                                    seek(to: max(0, currentTime - 10))
                                } label: {
                                    Image(systemName: "gobackward.10")
                                        .font(.system(size: 18))
                                        .foregroundColor(.white)
                                }
                                .buttonStyle(.plain)
                                
                                // Play/Pause
                                Button {
                                    if isPlaying {
                                        pausePlayer()
                                    } else {
                                        startPlayer()
                                    }
                                } label: {
                                    Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                                        .font(.system(size: 22))
                                        .foregroundColor(.white)
                                        .frame(width: 48, height: 48)
                                        .background(Color.blue)
                                        .cornerRadius(24)
                                        .shadow(color: .blue.opacity(0.4), radius: 6)
                                }
                                .buttonStyle(.plain)
                                
                                // Skip Forward 10s
                                Button {
                                    seek(to: min(duration, currentTime + 10))
                                } label: {
                                    Image(systemName: "goforward.10")
                                        .font(.system(size: 18))
                                        .foregroundColor(.white)
                                }
                                .buttonStyle(.plain)
                                
                                Spacer()
                                
                                // Volume control
                                HStack(spacing: 8) {
                                    Button {
                                        isMuted.toggle()
                                        player?.isMuted = isMuted
                                    } label: {
                                        Image(systemName: isMuted ? "speaker.slash.fill" : "speaker.wave.2.fill")
                                            .foregroundColor(.white)
                                            .frame(width: 24, height: 24)
                                    }
                                    .buttonStyle(.plain)
                                    
                                    GlassSlider(
                                        value: $volume,
                                        bounds: 0...1,
                                        step: 0.05,
                                        activeColor: .blue
                                    )
                                    .frame(width: 80)
                                    .onChange(of: volume) { _, val in
                                        player?.volume = Float(val)
                                        isMuted = val == 0
                                    }
                                }
                            }
                        }
                        .padding(20)
                        .glassPanel(cornerRadius: 16)
                        .padding(.horizontal, 24)
                        .padding(.bottom, 24)
                    }
                    .background(
                        LinearGradient(
                            colors: [Color.black.opacity(0.65), Color.clear, Color.black.opacity(0.75)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                        .edgesIgnoringSafeArea(.all)
                    )
                }
            }
            
            // Co-Watch Chat Drawer
            if isCoWatchMode && showChat {
                coWatchChatDrawer
            }
        }
        .onAppear {
            if let src = initialSource {
                self.currentSource = src
            }
            self.currentSeasonNum = seasonNumber ?? 1
            self.currentEpisodeNum = episodeNumber ?? 1
            
            initializePlayer()
            disableSleep()
            loadSubtitlesData()
            if (mediaType ?? "") == "tv" {
                loadEpisodesForTV()
            }
        }
        .onDisappear {
            enableSleep()
            cleanupPlayer()
        }
        .onReceive(timer) { _ in
            if isCoWatchMode, let tid = ticketId {
                Task {
                    await syncCoWatchRoom(ticketId: tid)
                }
            }
        }
    }
    
    // MARK: - Subtitle Customization Helpers
    private func getSubtitleFont() -> Font {
        let weight: Font.Weight = (subtitleFontWeight == "heavy") ? .heavy : ((subtitleFontWeight == "medium") ? .medium : .bold)
        return .system(size: CGFloat(subtitleFontSize), weight: weight, design: .rounded)
    }
    
    private func getSubtitleColor() -> Color {
        switch subtitleTextColor {
        case "yellow":
            return Color(red: 1.0, green: 0.85, blue: 0.2)
        case "cyan":
            return Color(red: 0.2, green: 0.9, blue: 1.0)
        case "green":
            return Color(red: 0.3, green: 1.0, blue: 0.5)
        case "amber":
            return Color(red: 1.0, green: 0.65, blue: 0.2)
        default:
            return Color.white
        }
    }
    
    @ViewBuilder
    private var subtitleOverlayView: some View {
        if !activeSubtitleCue.isEmpty {
            VStack {
                Spacer()
                Text(activeSubtitleCue)
                    .font(getSubtitleFont())
                    .foregroundColor(getSubtitleColor())
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .shadow(color: subtitleHasStroke ? Color.black : Color.black.opacity(0.85), radius: subtitleHasStroke ? 3 : 2, x: 0, y: 1)
                    .shadow(color: subtitleHasStroke ? Color.black : Color.clear, radius: 4, x: 1, y: 1)
                    .shadow(color: subtitleHasStroke ? Color.black : Color.clear, radius: 4, x: -1, y: -1)
                    .padding(.horizontal, subtitleBackgroundOpacity > 0.05 ? 18 : 8)
                    .padding(.vertical, subtitleBackgroundOpacity > 0.05 ? 8 : 4)
                    .background(SubtitleBackgroundBox(opacity: subtitleBackgroundOpacity, blur: subtitleBackgroundBlur))
                    .shadow(color: subtitleBackgroundOpacity > 0.05 ? Color.black.opacity(0.7) : Color.clear, radius: 8, x: 0, y: 4)
                    .padding(.bottom, CGFloat(subtitleVerticalOffset))
            }
            .frame(maxWidth: .infinity)
            .allowsHitTesting(false)
        }
    }
    
    // MARK: - Popovers
    
    // 1. Kurdish CC & Subtitle Customization Studio Popover
    private var subtitleManagerPopover: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with Segmented Tab Picker
            HStack(spacing: 8) {
                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.75)) {
                        subtitleStudioTab = "tracks"
                    }
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "captions.bubble.fill")
                        Text("Tracks & AI")
                    }
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(subtitleStudioTab == "tracks" ? .white : .white.opacity(0.5))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(subtitleStudioTab == "tracks" ? Color.red : Color.white.opacity(0.06))
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
                
                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.75)) {
                        subtitleStudioTab = "style"
                    }
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "paintbrush.fill")
                        Text("Style Studio")
                    }
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(subtitleStudioTab == "style" ? .white : .white.opacity(0.5))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(subtitleStudioTab == "style" ? Color.blue : Color.white.opacity(0.06))
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
                
                Spacer()
            }
            
            Divider().background(Color.white.opacity(0.1))
            
            if subtitleStudioTab == "tracks" {
                subtitleTracksTab
            } else {
                subtitleStyleStudioTab
            }
        }
        .padding(14)
        .frame(width: 360)
        .background(VisualEffectView(material: .popover))
    }
    
    // Sub-view: Tracks & Translation
    private var subtitleTracksTab: some View {
        VStack(alignment: .leading, spacing: 10) {
            Toggle(isOn: $kurdishTranslationEnabled) {
                HStack(spacing: 8) {
                    Image(systemName: "sparkles")
                        .foregroundColor(.yellow)
                    Text("Kurdish AI Auto-Translate")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                }
            }
            .toggleStyle(GlassToggleStyle(activeColor: .red))
            
            subtitleRegistryListView
            subtitleLanguagePickerView
        }
    }
    
    // Sub-view: Registry list
    private var subtitleRegistryListView: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("SUBTITLE REGISTRY (\(availableSubtitleTracks.count))")
                    .font(.system(size: 9, weight: .black))
                    .foregroundColor(.white.opacity(0.4))
                Spacer()
                if loadingOpenSubtitles {
                    ProgressView().scaleEffect(0.5)
                } else {
                    Button {
                        loadSubtitlesData()
                    } label: {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.blue)
                    }
                    .buttonStyle(.plain)
                }
            }
            
            HStack(spacing: 6) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 11))
                    .foregroundColor(.white.opacity(0.4))
                TextField("Search subtitles (e.g. Kurdish, English)...", text: $subtitleSearchText)
                    .textFieldStyle(.plain)
                    .font(.system(size: 11))
                    .foregroundColor(.white)
                if !subtitleSearchText.isEmpty {
                    Button {
                        subtitleSearchText = ""
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 11))
                            .foregroundColor(.white.opacity(0.4))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(Color.white.opacity(0.06))
            .cornerRadius(6)
            
            let filteredTracks = availableSubtitleTracks.filter { track in
                subtitleSearchText.isEmpty ||
                track.language.localizedCaseInsensitiveContains(subtitleSearchText) ||
                track.releaseName.localizedCaseInsensitiveContains(subtitleSearchText) ||
                track.languageCode.localizedCaseInsensitiveContains(subtitleSearchText)
            }
            
            if filteredTracks.isEmpty && !loadingOpenSubtitles {
                Text(availableSubtitleTracks.isEmpty ? "Fetching from Stremio & OpenSubtitles..." : "No matching subtitles found.")
                    .font(.system(size: 10))
                    .foregroundColor(.white.opacity(0.4))
                    .padding(.vertical, 4)
            } else {
                ScrollView(.vertical, showsIndicators: true) {
                    VStack(spacing: 4) {
                        ForEach(filteredTracks) { track in
                            Button {
                                loadOpenSubtitleTrack(track)
                            } label: {
                                HStack(spacing: 8) {
                                    Text(track.isKurdish ? "CC" : track.languageCode.uppercased())
                                        .font(.system(size: 9, weight: .black))
                                        .foregroundColor(track.isKurdish ? .white : .blue)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(track.isKurdish ? Color.red : Color.blue.opacity(0.2))
                                        .cornerRadius(4)
                                    
                                    VStack(alignment: .leading, spacing: 1) {
                                        HStack(spacing: 4) {
                                            Text(track.language)
                                                .font(.system(size: 11, weight: .bold))
                                                .foregroundColor(.white)
                                            Text("• \(track.sourceName)")
                                                .font(.system(size: 9, weight: .medium))
                                                .foregroundColor(.white.opacity(0.4))
                                        }
                                        Text(track.releaseName)
                                            .font(.system(size: 9))
                                            .foregroundColor(.white.opacity(0.5))
                                            .lineLimit(1)
                                    }
                                    Spacer()
                                    if selectedTrackId == track.id {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(.green)
                                            .font(.system(size: 12))
                                    }
                                }
                                .padding(6)
                                .background(selectedTrackId == track.id ? Color.white.opacity(0.14) : Color.white.opacity(0.04))
                                .cornerRadius(6)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .frame(maxHeight: 130)
            }
        }
    }
    
    // Sub-view: Language picker
    private var subtitleLanguagePickerView: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("Translate Target Language")
                    .font(.system(size: 9, weight: .black))
                    .foregroundColor(.white.opacity(0.4))
                Spacer()
                if isTranslatingSubtitles {
                    HStack(spacing: 4) {
                        ProgressView().scaleEffect(0.6)
                        Text("\(Int(translationProgress * 100))%")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.yellow)
                    }
                }
            }
            
            if isTranslatingSubtitles {
                VStack(alignment: .leading, spacing: 4) {
                    ProgressView(value: translationProgress, total: 1.0)
                        .progressViewStyle(LinearProgressViewStyle(tint: .yellow))
                    Text("Progressively translating dialogue... (\(Int(translationProgress * 100))% applied)")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundColor(.yellow.opacity(0.8))
                }
                .padding(6)
                .background(Color.yellow.opacity(0.1))
                .cornerRadius(6)
            }
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(subtitleLanguages, id: \.0) { langTuple in
                        Button {
                            selectedSubtitleLanguage = langTuple.0
                            triggerSubtitleTranslation(targetLang: langTuple.0)
                        } label: {
                            Text(langTuple.1)
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(selectedSubtitleLanguage == langTuple.0 ? Color.red : Color.white.opacity(0.08))
                                .cornerRadius(6)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }
    
    // Sub-view: Style Studio Tab
    private var subtitleStyleStudioTab: some View {
        VStack(alignment: .leading, spacing: 12) {
            subtitleLivePreviewCard
            subtitleBackgroundControlsView
            subtitleTextColorsView
            subtitleSizeAndHeightView
            subtitleLipSyncView
        }
    }
    
    // Live Preview Card
    private var subtitleLivePreviewCard: some View {
        VStack(spacing: 6) {
            Text("سڵاو، بەخێربێن بۆ FLKRD MOVIES")
                .font(getSubtitleFont())
                .foregroundColor(getSubtitleColor())
                .multilineTextAlignment(.center)
                .shadow(color: subtitleHasStroke ? Color.black : Color.black.opacity(0.85), radius: subtitleHasStroke ? 3 : 2, x: 0, y: 1)
                .shadow(color: subtitleHasStroke ? Color.black : Color.clear, radius: 4, x: 1, y: 1)
                .shadow(color: subtitleHasStroke ? Color.black : Color.clear, radius: 4, x: -1, y: -1)
                .padding(.horizontal, subtitleBackgroundOpacity > 0.05 ? 14 : 6)
                .padding(.vertical, subtitleBackgroundOpacity > 0.05 ? 6 : 2)
                .background(SubtitleBackgroundBox(opacity: subtitleBackgroundOpacity, blur: subtitleBackgroundBlur))
        }
        .frame(maxWidth: .infinity, minHeight: 50)
        .padding(8)
        .background(Color.black.opacity(0.4))
        .cornerRadius(10)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }
    
    // Background Presets & Opacity
    private var subtitleBackgroundControlsView: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("BACKGROUND PRESETS / باکگراوند")
                .font(.system(size: 9, weight: .black))
                .foregroundColor(.white.opacity(0.4))
            
            HStack(spacing: 6) {
                Button {
                    withAnimation(.spring()) {
                        subtitleBackgroundOpacity = 0.0
                        subtitleBackgroundBlur = false
                        subtitleHasStroke = true
                    }
                } label: {
                    Text("🚫 None (لابردن)")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(subtitleBackgroundOpacity <= 0.05 ? .white : .white.opacity(0.6))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 5)
                        .background(subtitleBackgroundOpacity <= 0.05 ? Color.blue : Color.white.opacity(0.06))
                        .cornerRadius(6)
                }
                .buttonStyle(.plain)
                
                Button {
                    withAnimation(.spring()) {
                        subtitleBackgroundOpacity = 0.35
                        subtitleBackgroundBlur = true
                        subtitleHasStroke = true
                    }
                } label: {
                    Text("💧 Glass")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor((subtitleBackgroundOpacity > 0.05 && subtitleBackgroundBlur) ? .white : .white.opacity(0.6))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 5)
                        .background((subtitleBackgroundOpacity > 0.05 && subtitleBackgroundBlur) ? Color.blue : Color.white.opacity(0.06))
                        .cornerRadius(6)
                }
                .buttonStyle(.plain)
                
                Button {
                    withAnimation(.spring()) {
                        subtitleBackgroundOpacity = 0.55
                        subtitleBackgroundBlur = false
                        subtitleHasStroke = true
                    }
                } label: {
                    Text("⬛ Semi")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor((subtitleBackgroundOpacity > 0.4 && subtitleBackgroundOpacity < 0.75 && !subtitleBackgroundBlur) ? .white : .white.opacity(0.6))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 5)
                        .background((subtitleBackgroundOpacity > 0.4 && subtitleBackgroundOpacity < 0.75 && !subtitleBackgroundBlur) ? Color.blue : Color.white.opacity(0.06))
                        .cornerRadius(6)
                }
                .buttonStyle(.plain)
                
                Button {
                    withAnimation(.spring()) {
                        subtitleBackgroundOpacity = 0.85
                        subtitleBackgroundBlur = false
                    }
                } label: {
                    Text("⬛⬛ Solid")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor((subtitleBackgroundOpacity >= 0.75) ? .white : .white.opacity(0.6))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 5)
                        .background((subtitleBackgroundOpacity >= 0.75) ? Color.blue : Color.white.opacity(0.06))
                        .cornerRadius(6)
                }
                .buttonStyle(.plain)
            }
            
            HStack {
                Text("Opacity")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.white.opacity(0.6))
                Spacer()
                Text(String(format: "%.0f%%", subtitleBackgroundOpacity * 100))
                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                    .foregroundColor(.blue)
            }
            GlassSlider(value: $subtitleBackgroundOpacity, bounds: 0.0...1.0, step: 0.05, activeColor: .blue)
        }
    }
    
    // Text Color & Stroke
    private var subtitleTextColorsView: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("TEXT COLOR / ڕەنگ")
                    .font(.system(size: 9, weight: .black))
                    .foregroundColor(.white.opacity(0.4))
                Spacer()
                Toggle(isOn: $subtitleHasStroke) {
                    Text("Black Outline")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.white.opacity(0.8))
                }
                .toggleStyle(GlassToggleStyle(activeColor: .cyan))
            }
            
            HStack(spacing: 8) {
                let colors: [(String, String, Color)] = [
                    ("white", "White", Color.white),
                    ("yellow", "Gold", Color(red: 1.0, green: 0.85, blue: 0.2)),
                    ("cyan", "Cyan", Color(red: 0.2, green: 0.9, blue: 1.0)),
                    ("green", "Mint", Color(red: 0.3, green: 1.0, blue: 0.5)),
                    ("amber", "Amber", Color(red: 1.0, green: 0.65, blue: 0.2))
                ]
                
                ForEach(colors, id: \.0) { item in
                    Button {
                        subtitleTextColor = item.0
                    } label: {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(item.2)
                                .frame(width: 8, height: 8)
                            Text(item.1)
                                .font(.system(size: 10, weight: .bold))
                        }
                        .foregroundColor(subtitleTextColor == item.0 ? .white : .white.opacity(0.6))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 5)
                        .background(subtitleTextColor == item.0 ? item.2.opacity(0.3) : Color.white.opacity(0.06))
                        .cornerRadius(6)
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(subtitleTextColor == item.0 ? item.2 : Color.clear, lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
    
    // Font Size & Vertical Position
    private var subtitleSizeAndHeightView: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("Font Size")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.white.opacity(0.6))
                Spacer()
                Text("\(Int(subtitleFontSize))px")
                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                    .foregroundColor(.blue)
            }
            GlassSlider(value: $subtitleFontSize, bounds: 14...44, step: 1, activeColor: .blue)
            
            HStack(spacing: 6) {
                ForEach([18.0, 22.0, 28.0, 34.0], id: \.self) { sz in
                    Button {
                        subtitleFontSize = sz
                    } label: {
                        Text("\(Int(sz))px")
                            .font(.system(size: 9, weight: subtitleFontSize == sz ? .black : .medium))
                            .foregroundColor(subtitleFontSize == sz ? .white : .white.opacity(0.5))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(subtitleFontSize == sz ? Color.blue : Color.white.opacity(0.06))
                            .cornerRadius(4)
                    }
                    .buttonStyle(.plain)
                }
            }
            
            HStack {
                Text("Vertical Height on Screen")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.white.opacity(0.6))
                Spacer()
                Text("\(Int(subtitleVerticalOffset))px")
                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                    .foregroundColor(.purple)
            }
            GlassSlider(value: $subtitleVerticalOffset, bounds: 30...160, step: 5, activeColor: .purple)
        }
    }
    
    // Lip-Sync Delay
    private var subtitleLipSyncView: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("Lip-Sync Audio Delay")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.white.opacity(0.6))
                Spacer()
                Text(String(format: "%+.2fs", subtitleOffset))
                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                    .foregroundColor(subtitleOffset == 0 ? .white.opacity(0.8) : (subtitleOffset > 0 ? .yellow : .cyan))
            }
            
            GlassSlider(value: $subtitleOffset, bounds: -5.0...5.0, step: 0.05, activeColor: .blue)
            
            HStack(spacing: 4) {
                Button {
                    subtitleOffset = max(-5.0, subtitleOffset - 0.5)
                    updateActiveSubtitleCue()
                } label: {
                    Text("-0.5s")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(Color.white.opacity(0.08))
                        .cornerRadius(4)
                }
                .buttonStyle(.plain)
                
                Button {
                    subtitleOffset = 0.0
                    updateActiveSubtitleCue()
                } label: {
                    Text("Reset")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 3)
                        .background(Color.blue.opacity(0.2))
                        .cornerRadius(4)
                }
                .buttonStyle(.plain)
                
                Button {
                    subtitleOffset = min(5.0, subtitleOffset + 0.5)
                    updateActiveSubtitleCue()
                } label: {
                    Text("+0.5s")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(Color.white.opacity(0.08))
                        .cornerRadius(4)
                }
                .buttonStyle(.plain)
            }
        }
    }
    
    // 2. Source Server Switcher Popover
    private var sourcePickerMenu: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("SELECT STREAM SERVER")
                .font(.system(size: 9, weight: .black))
                .foregroundColor(.white.opacity(0.4))
                .padding(.horizontal, 12)
                .padding(.top, 8)
            
            ForEach(PlayerSourceManager.shared.allSources) { src in
                Button {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                        currentSource = src.id
                        PlayerSourceManager.shared.defaultSource = src.id
                        showSourcePicker = false
                    }
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 6) {
                                Text(src.badge)
                                    .font(.system(size: 8, weight: .black))
                                    .foregroundColor(.blue)
                                    .padding(.horizontal, 4)
                                    .padding(.vertical, 1)
                                    .background(Color.blue.opacity(0.2))
                                    .cornerRadius(3)
                                Text(src.name)
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.white)
                            }
                            Text(src.description)
                                .font(.system(size: 10))
                                .foregroundColor(.white.opacity(0.5))
                        }
                        Spacer()
                        if currentSource == src.id {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.blue)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(currentSource == src.id ? Color.blue.opacity(0.15) : Color.clear)
                    .cornerRadius(6)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(6)
        .frame(width: 270)
        .background(VisualEffectView(material: .popover))
    }
    
    // 3. Video Filters Popover
    private var videoFiltersPopover: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Video Lighting & Filters")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                Button {
                    brightness = 0.0
                    contrast = 1.0
                    saturation = 1.0
                } label: {
                    Text("Reset")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.blue)
                }
                .buttonStyle(.plain)
            }
            
            Divider().background(Color.white.opacity(0.1))
            
            // Brightness
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("Brightness")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.white.opacity(0.7))
                    Spacer()
                    Text(String(format: "%.0f%%", (brightness + 1.0) * 50))
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                }
                GlassSlider(value: $brightness, bounds: -0.5...0.5, step: 0.05, activeColor: .yellow)
            }
            
            // Contrast
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("Contrast")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.white.opacity(0.7))
                    Spacer()
                    Text(String(format: "%.1f", contrast))
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                }
                GlassSlider(value: $contrast, bounds: 0.5...1.8, step: 0.05, activeColor: .orange)
            }
            
            // Saturation
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("Saturation")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.white.opacity(0.7))
                    Spacer()
                    Text(String(format: "%.1f", saturation))
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                }
                GlassSlider(value: $saturation, bounds: 0.0...2.0, step: 0.05, activeColor: .blue)
            }
        }
        .padding(16)
        .frame(width: 260)
        .background(VisualEffectView(material: .popover))
    }
    
    // 4. TV Seasons & Episodes Popover
    private var episodesPopover: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("SEASONS & EPISODES")
                        .font(.system(size: 11, weight: .black, design: .rounded))
                        .foregroundColor(.white)
                    Text("Season \(currentSeasonNum) • Episode \(currentEpisodeNum)")
                        .font(.system(size: 9.5, weight: .bold, design: .monospaced))
                        .foregroundColor(.blue)
                }
                
                Spacer()
                
                if !episodesList.isEmpty {
                    Text("\(episodesList.count) Episodes")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.white.opacity(0.6))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.white.opacity(0.08))
                        .cornerRadius(6)
                }
            }
            
            // Horizontal Season Switcher Bar
            let availableSeasons = seasonsList.isEmpty ? 
                (1...max(currentSeasonNum, 4)).map { Season(id: $0, name: "Season \($0)", seasonNumber: $0, episodeCount: 0, posterPath: nil) } : 
                seasonsList
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(availableSeasons) { season in
                        Button {
                            if currentSeasonNum != season.seasonNumber {
                                withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                                    currentSeasonNum = season.seasonNumber
                                    currentEpisodeNum = 1
                                }
                                loadEpisodesForTV()
                                onEpisodeChanged()
                            }
                        } label: {
                            HStack(spacing: 5) {
                                Image(systemName: "tv.fill")
                                    .font(.system(size: 9))
                                Text("Season \(season.seasonNumber)")
                                    .font(.system(size: 11, weight: .bold))
                            }
                            .foregroundColor(currentSeasonNum == season.seasonNumber ? .white : .white.opacity(0.6))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(
                                currentSeasonNum == season.seasonNumber ?
                                AnyView(LinearGradient(colors: [Color.blue, Color.purple], startPoint: .leading, endPoint: .trailing)) :
                                AnyView(Color.white.opacity(0.06))
                            )
                            .cornerRadius(8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(currentSeasonNum == season.seasonNumber ? Color.blue.opacity(0.8) : Color.white.opacity(0.1), lineWidth: 1)
                            )
                            .shadow(color: currentSeasonNum == season.seasonNumber ? Color.blue.opacity(0.3) : Color.clear, radius: 4)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.vertical, 2)
            }
            
            Divider().background(Color.white.opacity(0.1))
            
            // Episodes List for Selected Season
            if loadingEpisodes {
                HStack {
                    Spacer()
                    VStack(spacing: 8) {
                        ProgressView()
                        Text("Loading Season \(currentSeasonNum)...")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.white.opacity(0.6))
                    }
                    .padding(.vertical, 30)
                    Spacer()
                }
            } else if episodesList.isEmpty {
                VStack(spacing: 6) {
                    Text("No episodes available for Season \(currentSeasonNum).")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.white.opacity(0.5))
                }
                .padding(.vertical, 30)
                .frame(maxWidth: .infinity)
            } else {
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(episodesList) { ep in
                            Button {
                                withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                                    currentEpisodeNum = ep.episodeNumber
                                    showEpisodeModal = false
                                }
                                onEpisodeChanged()
                            } label: {
                                HStack(spacing: 10) {
                                    // Thumbnail
                                    AsyncImage(url: URL(string: ep.stillURL)) { img in
                                        img
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        ZStack {
                                            RoundedRectangle(cornerRadius: 6)
                                                .fill(Color.white.opacity(0.08))
                                            Image(systemName: "play.tv")
                                                .font(.system(size: 14))
                                                .foregroundColor(.white.opacity(0.2))
                                        }
                                    }
                                    .frame(width: 80, height: 48)
                                    .cornerRadius(6)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 6)
                                            .stroke(currentEpisodeNum == ep.episodeNumber ? Color.blue : Color.white.opacity(0.1), lineWidth: 1)
                                    )
                                    
                                    VStack(alignment: .leading, spacing: 3) {
                                        HStack(spacing: 6) {
                                            Text("E\(ep.episodeNumber)")
                                                .font(.system(size: 10, weight: .black, design: .monospaced))
                                                .foregroundColor(currentEpisodeNum == ep.episodeNumber ? .white : .blue)
                                                .padding(.horizontal, 4)
                                                .padding(.vertical, 1)
                                                .background(currentEpisodeNum == ep.episodeNumber ? Color.blue : Color.blue.opacity(0.2))
                                                .cornerRadius(4)
                                            
                                            Text(ep.name)
                                                .font(.system(size: 12, weight: .bold))
                                                .foregroundColor(.white)
                                                .lineLimit(1)
                                        }
                                        
                                        if let overview = ep.overview, !overview.isEmpty {
                                            Text(overview)
                                                .font(.system(size: 10))
                                                .foregroundColor(.white.opacity(0.5))
                                                .lineLimit(2)
                                        }
                                    }
                                    
                                    Spacer()
                                    
                                    if currentEpisodeNum == ep.episodeNumber {
                                        HStack(spacing: 4) {
                                            Circle()
                                                .fill(Color.green)
                                                .frame(width: 6, height: 6)
                                            Text("PLAYING")
                                                .font(.system(size: 8, weight: .black))
                                                .foregroundColor(.green)
                                        }
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 3)
                                        .background(Color.green.opacity(0.15))
                                        .cornerRadius(4)
                                    }
                                }
                                .padding(8)
                                .background(currentEpisodeNum == ep.episodeNumber ? Color.blue.opacity(0.2) : Color.white.opacity(0.04))
                                .cornerRadius(8)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(currentEpisodeNum == ep.episodeNumber ? Color.blue.opacity(0.6) : Color.clear, lineWidth: 1)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .frame(maxHeight: 340)
            }
        }
        .padding(14)
        .frame(width: 380)
        .background(VisualEffectView(material: .popover))
    }
    
    // 5. Co-Watch Chat Drawer
    private var coWatchChatDrawer: some View {
        HStack {
            Spacer()
            VStack(alignment: .leading, spacing: 16) {
                Text("Co-Watch Room Messages")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.top, 16)
                
                Divider().background(Color.white.opacity(0.12))
                
                ScrollViewReader { scrollProxy in
                    ScrollView {
                        VStack(alignment: .leading, spacing: 12) {
                            ForEach(messages) { msg in
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text(msg.senderName)
                                            .font(.system(size: 11, weight: .bold))
                                            .foregroundColor(msg.userId == "host" ? .orange : .cyan)
                                        Spacer()
                                    }
                                    Text(msg.message)
                                        .font(.system(size: 12))
                                        .foregroundColor(.white)
                                        .padding(8)
                                        .background(Color.white.opacity(0.06))
                                        .cornerRadius(8)
                                }
                                .id(msg.id)
                            }
                        }
                        .padding(.trailing, 8)
                    }
                }
                
                Spacer()
                
                HStack(spacing: 8) {
                    TextField("Say something...", text: $chatMessage)
                        .textFieldStyle(.plain)
                        .padding(8)
                        .background(Color.black.opacity(0.3))
                        .cornerRadius(8)
                        .foregroundColor(.white)
                        .onSubmit { sendChat() }
                    
                    Button {
                        sendChat()
                    } label: {
                        Image(systemName: "paperplane.fill")
                            .foregroundColor(.blue)
                            .padding(8)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.bottom, 16)
            }
            .padding(.horizontal, 16)
            .frame(width: 280)
            .glassPanel()
            .edgesIgnoringSafeArea(.all)
        }
    }
    
    // MARK: - Actions
    private func closePlayer() {
        if PlayerWindowController.activeController != nil {
            PlayerWindowController.activeController?.close()
        } else {
            presentationMode.wrappedValue.dismiss()
        }
    }
    
    private func initializePlayer() {
        if isWebEmbed { return }
        guard let url = URL(string: videoURLString) else { return }
        let player = AVPlayer(url: url)
        self.player = player
        player.volume = Float(volume)
        player.isMuted = isMuted
        
        let mediaId = customDubbedMovie?.id ?? String(tmdbId ?? 0)
        let type = customDubbedMovie != nil ? "dubbed" : (mediaType ?? "movie")
        if let saved = WatchProgressManager.shared.getProgress(id: mediaId, type: type) {
            let resumeTime = saved.progress
            if resumeTime > 10 && resumeTime < (saved.duration * 0.95) {
                let targetTime = CMTime(seconds: resumeTime, preferredTimescale: 1000)
                player.seek(to: targetTime)
                self.currentTime = resumeTime
            }
        }
        
        let interval = CMTime(seconds: 1.0, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
        timeObserverToken = player.addPeriodicTimeObserver(forInterval: interval, queue: .main) { time in
            self.currentTime = time.seconds
            if let durationTime = player.currentItem?.duration {
                let seconds = durationTime.seconds
                if !seconds.isNaN {
                    self.duration = seconds
                }
            }
            self.updateActiveSubtitleCue()
            self.saveWatchProgress()
        }
        
        startPlayer()
    }
    
    private func updateActiveSubtitleCue() {
        guard !subtitleCues.isEmpty else { return }
        let shiftedTime = currentTime - subtitleOffset
        if let cue = subtitleCues.first(where: { shiftedTime >= ($0.start - 0.2) && shiftedTime <= ($0.end + 0.35) }) {
            self.activeSubtitleCue = NetworkService.shared.cleanSubtitleText(cue.text)
        } else {
            self.activeSubtitleCue = ""
        }
    }
    
    private func loadOpenSubtitleTrack(_ track: OpenSubtitleTrack) {
        selectedTrackId = track.id
        isTranslatingSubtitles = true
        translationProgress = 0.0
        Task {
            let cues = await NetworkService.shared.downloadAndParseSubtitle(track: track)
            guard !cues.isEmpty else {
                DispatchQueue.main.async {
                    self.isTranslatingSubtitles = false
                }
                return
            }
            
            // If already Kurdish track, ensure intro and outro credits are added
            if track.isKurdish {
                var stampedCues = cues
                let introCue = SubtitleCue(
                    start: 3.0,
                    end: 9.5,
                    text: "ژێرنووسکراوە لەلایەن: زانا فاروق\nPowered by FLKRD Studio • zana.fkurd.pro"
                )
                let lastEnd = stampedCues.last?.end ?? 120.0
                let outroCue = SubtitleCue(
                    start: lastEnd + 1.0,
                    end: lastEnd + 14.0,
                    text: "سوپاس بۆ سەیرکردنی ئەم بەرهەمە لە FLKRD MOVIES\nبۆ هەر پرسیار یان کێشەیەک لە ژێرنووس: zana.fkurd.pro"
                )
                stampedCues.insert(introCue, at: 0)
                stampedCues.append(outroCue)
                
                DispatchQueue.main.async {
                    self.subtitleCues = stampedCues
                    self.isTranslatingSubtitles = false
                    self.translationProgress = 1.0
                    self.updateActiveSubtitleCue()
                }
                return
            }
            
            // Immediately apply original downloaded subtitles so playback has cues instantly
            DispatchQueue.main.async {
                self.subtitleCues = cues
                self.updateActiveSubtitleCue()
            }
            
            // If Kurdish translation is active and track is not Kurdish, translate progressively
            if kurdishTranslationEnabled {
                let finalCues = await NetworkService.shared.translateCuesProgressive(
                    cues: cues,
                    targetLang: selectedSubtitleLanguage
                ) { progress, partialCues in
                    DispatchQueue.main.async {
                        self.translationProgress = progress
                        self.subtitleCues = partialCues
                        self.updateActiveSubtitleCue()
                    }
                }
                DispatchQueue.main.async {
                    self.subtitleCues = finalCues
                    self.isTranslatingSubtitles = false
                    self.translationProgress = 1.0
                    self.updateActiveSubtitleCue()
                }
            } else {
                DispatchQueue.main.async {
                    self.isTranslatingSubtitles = false
                    self.translationProgress = 1.0
                }
            }
        }
    }
    
    private func loadSubtitlesData() {
        let id = tmdbId ?? (customDubbedMovie?.tmdbId ?? 872585)
        loadingOpenSubtitles = true
        let mType = mediaType ?? "movie"
        
        let appLang = LocalizationService.shared.selectedLanguage
        self.selectedSubtitleLanguage = (appLang == "badini") ? "badini" : "ckb"
        self.kurdishTranslationEnabled = true
        
        Task {
            let tracks = await NetworkService.shared.searchAllSubtitles(
                tmdbId: id,
                mediaType: mType,
                seasonNumber: currentSeasonNum,
                episodeNumber: currentEpisodeNum,
                queryTitle: movieTitle
            )
            DispatchQueue.main.async {
                self.availableSubtitleTracks = tracks
                self.loadingOpenSubtitles = false
                if let firstKurdish = tracks.first(where: { $0.isKurdish }) {
                    self.loadOpenSubtitleTrack(firstKurdish)
                } else if let firstEnglish = tracks.first(where: { $0.languageCode == "en" }) {
                    self.loadOpenSubtitleTrack(firstEnglish)
                } else if let first = tracks.first {
                    self.loadOpenSubtitleTrack(first)
                }
            }
        }
    }
    
    private func triggerSubtitleTranslation(targetLang: String) {
        guard !subtitleCues.isEmpty else { return }
        isTranslatingSubtitles = true
        translationProgress = 0.0
        Task {
            let finalCues = await NetworkService.shared.translateCuesProgressive(
                cues: self.subtitleCues,
                targetLang: targetLang
            ) { progress, partialCues in
                DispatchQueue.main.async {
                    self.translationProgress = progress
                    self.subtitleCues = partialCues
                    self.updateActiveSubtitleCue()
                }
            }
            DispatchQueue.main.async {
                self.subtitleCues = finalCues
                self.isTranslatingSubtitles = false
                self.translationProgress = 1.0
                self.updateActiveSubtitleCue()
            }
        }
    }
    
    private func previousEpisode() {
        guard currentEpisodeNum > 1 else { return }
        currentEpisodeNum -= 1
        onEpisodeChanged()
    }
    
    private func nextEpisode() {
        if !episodesList.isEmpty && currentEpisodeNum >= episodesList.count {
            currentSeasonNum += 1
            currentEpisodeNum = 1
            loadEpisodesForTV()
        } else {
            currentEpisodeNum += 1
        }
        onEpisodeChanged()
    }
    
    private func onEpisodeChanged() {
        activeSubtitleCue = ""
        subtitleCues = []
        availableSubtitleTracks = []
        loadSubtitlesData()
    }
    
    private func loadEpisodesForTV() {
        guard let id = tmdbId else { return }
        loadingEpisodes = true
        Task {
            // Load TV seasons list if not loaded yet
            if seasonsList.isEmpty {
                if let details = try? await NetworkService.shared.fetchTVDetails(id: id), let seasons = details.seasons {
                    let filtered = seasons.filter { $0.seasonNumber > 0 }
                    DispatchQueue.main.async {
                        self.seasonsList = filtered.isEmpty ? seasons : filtered
                    }
                }
            }
            
            let eps = try? await NetworkService.shared.fetchSeasonDetails(tvId: id, seasonNumber: currentSeasonNum)
            DispatchQueue.main.async {
                self.episodesList = eps ?? []
                self.loadingEpisodes = false
            }
        }
    }
    
    private func saveWatchProgress(force: Bool = false) {
        guard currentTime > 3 else { return }
        let now = Date()
        if force || now.timeIntervalSince(lastSavedTime) >= 5 {
            lastSavedTime = now
            let mediaId = customDubbedMovie?.id ?? String(tmdbId ?? 0)
            let mType = customDubbedMovie != nil ? "dubbed" : (mediaType ?? "movie")
            let poster = customDubbedMovie?.imageBase64 ?? posterPath ?? ""
            
            WatchProgressManager.shared.saveProgress(
                id: mediaId,
                type: mType,
                title: movieTitle,
                posterPath: poster,
                backdropPath: nil,
                progress: currentTime,
                duration: duration > 1 ? duration : 5400,
                season: seasonNumber,
                episode: episodeNumber
            )
        }
    }
    
    private func startPlayer() {
        player?.play()
        isPlaying = true
    }
    
    private func pausePlayer() {
        player?.pause()
        isPlaying = false
        saveWatchProgress(force: true)
    }
    
    private func seek(to seconds: Double) {
        let targetTime = CMTime(seconds: seconds, preferredTimescale: 1000)
        player?.seek(to: targetTime)
        currentTime = seconds
    }
    
    private func disableSleep() {
        if sleepActivityToken == nil {
            sleepActivityToken = ProcessInfo.processInfo.beginActivity(
                options: [.idleDisplaySleepDisabled, .userInitiated],
                reason: "FLKRD Cinema Video Playback"
            )
        }
    }
    
    private func enableSleep() {
        if let token = sleepActivityToken {
            ProcessInfo.processInfo.endActivity(token)
            sleepActivityToken = nil
        }
    }
    
    private func cleanupPlayer() {
        enableSleep()
        saveWatchProgress(force: true)
        if let token = timeObserverToken {
            player?.removeTimeObserver(token)
            timeObserverToken = nil
        }
        player?.pause()
        player = nil
    }
    
    private func sendChat() {
        guard !chatMessage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        guard let tid = ticketId else { return }
        let msgText = chatMessage
        chatMessage = ""
        Task {
            do {
                let newMsg = try await NetworkService.shared.sendRoomMessage(ticketId: tid, userId: isHost ? "host" : "guest", message: msgText)
                DispatchQueue.main.async {
                    self.messages.append(newMsg)
                }
            } catch {
                print("Failed sending chat: \(error)")
            }
        }
    }
    
    private func syncCoWatchRoom(ticketId: String) async {
        do {
            let fetchedMsgs = try await NetworkService.shared.fetchRoomMessages(ticketId: ticketId)
            if let ticket = try await NetworkService.shared.fetchTicket(ticketId: ticketId) {
                DispatchQueue.main.async {
                    self.messages = fetchedMsgs
                    self.ticketStatus = ticket.status
                    if !self.isHost {
                        if ticket.status == "waiting" && self.isPlaying {
                            self.player?.pause()
                            self.isPlaying = false
                        } else if ticket.status == "active" && !self.isPlaying {
                            self.player?.play()
                            self.isPlaying = true
                        }
                    }
                }
            }
        } catch {
            print("CoWatch coordination failed: \(error)")
        }
    }
    
    private func formatTime(_ seconds: Double) -> String {
        if seconds.isNaN || seconds.isInfinite { return "00:00" }
        let hours = Int(seconds) / 3600
        let minutes = (Int(seconds) % 3600) / 60
        let secs = Int(seconds) % 60
        if hours > 0 {
            return String(format: "%02d:%02d:%02d", hours, minutes, secs)
        } else {
            return String(format: "%02d:%02d", minutes, secs)
        }
    }
}

// MARK: - WKWebView Player Wrapper for macOS SwiftUI
struct WebKitPlayerView: NSViewRepresentable {
    let urlString: String
    var onTimeUpdate: ((Double, Double?) -> Void)? = nil
    
    func makeCoordinator() -> Coordinator {
        Coordinator(onTimeUpdate: onTimeUpdate)
    }
    
    class Coordinator: NSObject, WKScriptMessageHandler {
        var onTimeUpdate: ((Double, Double?) -> Void)?
        var lastLoadedURLString: String = ""
        
        init(onTimeUpdate: ((Double, Double?) -> Void)?) {
            self.onTimeUpdate = onTimeUpdate
        }
        
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "timeUpdate" {
                if let dict = message.body as? [String: Any], let time = dict["time"] as? Double {
                    let dur = dict["duration"] as? Double
                    onTimeUpdate?(time, dur)
                } else if let time = message.body as? Double {
                    onTimeUpdate?(time, nil)
                }
            }
        }
    }
    
    func makeNSView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsAirPlayForMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        
        let preferences = WKWebpagePreferences()
        preferences.allowsContentJavaScript = true
        configuration.defaultWebpagePreferences = preferences
        
        let userContentController = WKUserContentController()
        userContentController.add(context.coordinator, name: "timeUpdate")
        
        // Inject popup blocker, autoplay enabler, third-party caption suppression, and real-time playback timer
        let scriptSource = """
        window.open = function() { return null; };
        (function() {
            // Suppress and hide all third-party embedded video captions / text tracks
            try {
                var cleanSubStyle = document.createElement('style');
                cleanSubStyle.id = 'flkrd-clean-subs';
                cleanSubStyle.innerHTML = `
                    ::cue, video::cue { display: none !important; opacity: 0 !important; visibility: hidden !important; }
                    .vjs-text-track-display, .jw-text-track-display, .plyr__captions, .shaka-text-container, 
                    .art-subtitle, .subtitle, .subtitles, .caption, .captions, .jw-captions, 
                    .vjs-captions, .subtitle-display, .vjs-subtitles, div[class*="caption"], div[class*="subtitle"],
                    [class*="subtitle"], [class*="caption"], [id*="subtitle"], [id*="caption"] {
                        display: none !important;
                        opacity: 0 !important;
                        visibility: hidden !important;
                        pointer-events: none !important;
                    }
                `;
                (document.head || document.documentElement).appendChild(cleanSubStyle);
            } catch(e) {}

            function report(time, dur) {
                if (typeof time === 'number' && window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.timeUpdate) {
                    window.webkit.messageHandlers.timeUpdate.postMessage({ time: time, duration: dur || 0 });
                }
            }
            
            // 1. Listen to postMessage from embed iframes (VidLink, VidKing, Videasy, SuperEmbed, etc.)
            window.addEventListener('message', function(e) {
                if (!e || !e.data) return;
                var d = e.data;
                if (typeof d === 'string') {
                    try { d = JSON.parse(d); } catch(err){}
                }
                if (d && typeof d === 'object') {
                    var t = d.currentTime || d.time || d.progress || (d.detail && d.detail.currentTime);
                    var dur = d.duration || (d.detail && d.detail.duration);
                    if (typeof t === 'number') {
                        report(t, dur);
                    }
                }
            });

            // 2. Continuous HTML5 Video Inspector & TextTrack Disabler
            function optimizeVideos() {
                var vids = document.querySelectorAll('video');
                for (var i = 0; i < vids.length; i++) {
                    var v = vids[i];
                    v.setAttribute('playsinline', '');
                    v.setAttribute('webkit-playsinline', '');
                    v.autoplay = true;
                    
                    // Disable all native tracks on video
                    if (v.textTracks) {
                        for (var j = 0; j < v.textTracks.length; j++) {
                            v.textTracks[j].mode = 'disabled';
                        }
                    }
                    
                    v.onplay = function() { report(this.currentTime, this.duration); };
                    v.ontimeupdate = function() { 
                        if (this.textTracks) {
                            for (var k = 0; k < this.textTracks.length; k++) {
                                this.textTracks[k].mode = 'disabled';
                            }
                        }
                        report(this.currentTime, this.duration); 
                    };
                    v.onpause = function() { report(this.currentTime, this.duration); };
                }
            }
            var obs = new MutationObserver(optimizeVideos);
            obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
            optimizeVideos();
            
            setInterval(function() {
                var v = document.querySelector('video');
                if (v && !v.paused) {
                    if (v.textTracks) {
                        for (var k = 0; k < v.textTracks.length; k++) {
                            v.textTracks[k].mode = 'disabled';
                        }
                    }
                    report(v.currentTime, v.duration);
                }
            }, 1000);
        })();
        """
        let userScript = WKUserScript(source: scriptSource, injectionTime: .atDocumentEnd, forMainFrameOnly: false)
        userContentController.addUserScript(userScript)
        configuration.userContentController = userContentController
        
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.customUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        webView.setValue(false, forKey: "drawsBackground")
        
        context.coordinator.lastLoadedURLString = urlString
        if let url = URL(string: urlString) {
            var request = URLRequest(url: url)
            request.timeoutInterval = 15.0
            webView.load(request)
        }
        
        return webView
    }
    
    func updateNSView(_ nsView: WKWebView, context: Context) {
        context.coordinator.onTimeUpdate = onTimeUpdate
        if context.coordinator.lastLoadedURLString != urlString {
            context.coordinator.lastLoadedURLString = urlString
            nsView.stopLoading()
            if let newURL = URL(string: urlString) {
                var request = URLRequest(url: newURL, cachePolicy: .useProtocolCachePolicy, timeoutInterval: 12.0)
                nsView.load(request)
            }
        }
    }
}

// MARK: - Dedicated Player Window Controller
class PlayerWindowController: NSWindowController, NSWindowDelegate {
    static var activeController: PlayerWindowController?
    
    static func show(
        videoURLString: String,
        movieTitle: String,
        isCoWatchMode: Bool = false,
        ticketId: String? = nil,
        isHost: Bool = false,
        tmdbId: Int? = nil,
        mediaType: String? = nil,
        seasonNumber: Int? = nil,
        episodeNumber: Int? = nil,
        customDubbedMovie: DubbedMovie? = nil,
        posterPath: String? = nil,
        selectedSource: String? = nil
    ) {
        DispatchQueue.main.async {
            activeController?.close()
            
            let playerView = CinemaPlayerView(
                videoURLString: videoURLString,
                movieTitle: movieTitle,
                isCoWatchMode: isCoWatchMode,
                ticketId: ticketId,
                isHost: isHost,
                tmdbId: tmdbId,
                mediaType: mediaType,
                seasonNumber: seasonNumber,
                episodeNumber: episodeNumber,
                customDubbedMovie: customDubbedMovie,
                posterPath: posterPath,
                initialSource: selectedSource
            )
            
            let hostingController = NSHostingController(rootView: playerView)
            let window = NSWindow(
                contentRect: NSRect(x: 0, y: 0, width: 1040, height: 600),
                styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
                backing: .buffered,
                defer: false
            )
            
            window.title = movieTitle
            window.center()
            window.contentViewController = hostingController
            window.titlebarAppearsTransparent = true
            window.titleVisibility = .hidden
            window.isReleasedWhenClosed = false
            window.backgroundColor = .black
            
            let controller = PlayerWindowController(window: window)
            window.delegate = controller
            activeController = controller
            
            window.makeKeyAndOrderFront(nil)
            
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                window.toggleFullScreen(nil)
            }
        }
    }
    
    func windowWillClose(_ notification: Notification) {
        if PlayerWindowController.activeController === self {
            PlayerWindowController.activeController = nil
        }
    }
}

// MARK: - Reusable Subtitle Background View
struct SubtitleBackgroundBox: View {
    let opacity: Double
    let blur: Bool
    
    var body: some View {
        if opacity > 0.05 {
            ZStack {
                if blur {
                    VisualEffectView(material: .hudWindow)
                }
                Color.black.opacity(opacity)
            }
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.white.opacity(0.15), lineWidth: 1)
            )
        }
    }
}
