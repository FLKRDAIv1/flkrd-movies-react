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

struct CinemaPlayerView: View {
    let videoURLString: String
    let movieTitle: String
    var isCoWatchMode: Bool = false
    var ticketId: String? = nil
    var isHost: Bool = false
    
    // New parameters to resolve universal web stream URLs
    var tmdbId: Int? = nil
    var mediaType: String? = nil
    var seasonNumber: Int? = nil
    var episodeNumber: Int? = nil
    var customDubbedMovie: DubbedMovie? = nil
    var posterPath: String? = nil
    var selectedSource: String? = nil
    
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
        let sourceName = selectedSource ?? "FLKRD SERVER"
        let playerColor = "3b82f6" // blue accent color
        
        switch sourceName {
        case "FLKRD SERVER": // VidKing (TOP 1)
            let vkParams = "&color=\(playerColor)&autoplay=1&playsinline=1&subtitles=1&sub=1"
            if type == "tv" {
                let s = seasonNumber ?? 1
                let e = episodeNumber ?? 1
                return "https://www.vidking.net/embed/tv/\(tmdb)/\(s)/\(e)?\(vkParams)&nextEpisode=true&episodeSelector=true"
            } else {
                return "https://www.vidking.net/embed/movie/\(tmdb)?\(vkParams)"
            }
            
        case "FLKRD SERVER 1": // VidLink Pro (TOP 2)
            let vlParams = "?primaryColor=\(playerColor)&secondaryColor=a2a2a2&iconColor=eefdec&playerIcon=default&title=true&poster=true&autoplay=true&nextbutton=true"
            if type == "tv" {
                let s = seasonNumber ?? 1
                let e = episodeNumber ?? 1
                return "https://vidlink.pro/tv/\(tmdb)/\(s)/\(e)\(vlParams)"
            } else {
                return "https://vidlink.pro/movie/\(tmdb)\(vlParams)"
            }
            
        case "FLKRD SERVER 2": // VidSrc (TOP 3)
            if type == "tv" {
                let s = seasonNumber ?? 1
                let e = episodeNumber ?? 1
                return "https://vidsrcme.ru/embed/tv?tmdb=\(tmdb)&season=\(s)&episode=\(e)"
            } else {
                return "https://vidsrcme.ru/embed/movie?tmdb=\(tmdb)"
            }
            
        case "FLKRD SERVER 3": // SuperEmbed
            if type == "tv" {
                let s = seasonNumber ?? 1
                let e = episodeNumber ?? 1
                return "https://multiembed.mov/?video_id=\(tmdb)&tmdb=1&s=\(s)&e=\(e)"
            } else {
                return "https://multiembed.mov/?video_id=\(tmdb)&tmdb=1"
            }
            
        default: // Fallback to VidKing (TOP 1)
            let vkParams = "&color=\(playerColor)&autoplay=1&playsinline=1&subtitles=1&sub=1"
            if type == "tv" {
                let s = seasonNumber ?? 1
                let e = episodeNumber ?? 1
                return "https://www.vidking.net/embed/tv/\(tmdb)/\(s)/\(e)?\(vkParams)&nextEpisode=true&episodeSelector=true"
            } else {
                return "https://www.vidking.net/embed/movie/\(tmdb)?\(vkParams)"
            }
        }
    }
    
    var isWebEmbed: Bool {
        let url = resolvedVideoURL.lowercased()
        return url.contains("vidlink.pro") || 
               url.contains("vidking.net") || 
               url.contains("vidsrc") || 
               url.contains("multiembed") || 
               url.contains("rashaba.com") || 
               url.contains("embed") || 
               (!url.contains(".mp4") && !url.contains(".m3u8") && !url.contains(".mov") && url.starts(with: "http"))
    }
    
    @Environment(\.presentationMode) var presentationMode
    @State private var player: AVPlayer?
    @State private var isPlaying = false
    @State private var currentTime: Double = 0
    @State private var duration: Double = 1
    @State private var volume: Double = 0.8
    @State private var isMuted = false
    @State private var showControls = true
    @State private var showChat = false
    @State private var lastSavedTime: Date = Date.distantPast
    @State private var didPlayToEndObserver: Any? = nil
    @State private var sleepActivityToken: NSObjectProtocol?
    
    // Co-Watch properties
    @State private var chatMessage: String = ""
    @State private var messages: [RoomMessage] = []
    @State private var ticketStatus: String = "waiting"
    
    private let timer = Timer.publish(every: 1.5, on: .main, in: .common).autoconnect()
    @State private var timeObserverToken: Any?
    
    var body: some View {
        ZStack {
            if isWebEmbed {
                ZStack(alignment: .topLeading) {
                    WebKitPlayerView(urlString: resolvedVideoURL)
                        .edgesIgnoringSafeArea(.all)
                    
                    // Small floating Close Button in the corner
                    Button {
                        if PlayerWindowController.activeController != nil {
                            PlayerWindowController.activeController?.close()
                        } else {
                            presentationMode.wrappedValue.dismiss()
                        }
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
                    .padding(24)
                }
            } else {
                // Fullscreen Video Player
                if let player = player {
                    VideoPlayer(player: player)
                        .edgesIgnoringSafeArea(.all)
                        .onTapGesture {
                            withAnimation {
                                showControls.toggle()
                            }
                        }
                } else {
                    ZStack {
                        Color.black
                        VStack(spacing: 12) {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .blue))
                            Text("Loading flkrd server stream...")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.white.opacity(0.6))
                        }
                    }
                }
            
            // Custom Video HUD Overlay (Cinema Controls)
            if !isWebEmbed && showControls {
                VStack {
                    // Header Bar (Frosted Title & Back Button)
                    HStack {
                        Button {
                            cleanupPlayer()
                            if PlayerWindowController.activeController != nil {
                                PlayerWindowController.activeController?.close()
                            } else {
                                presentationMode.wrappedValue.dismiss()
                            }
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
                    
                    // Footer Bar (Frosted Glass Control Center)
                    VStack(spacing: 12) {
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
                                    .font(.system(size: 24))
                                    .foregroundColor(.white)
                                    .frame(width: 50, height: 50)
                                    .background(Color.blue)
                                    .cornerRadius(25)
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
                    .glassPanel()
                    .padding(.horizontal, 24)
                    .padding(.bottom, 24)
                }
                .background(
                    LinearGradient(
                        colors: [Color.black.opacity(0.6), Color.clear, Color.black.opacity(0.7)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .edgesIgnoringSafeArea(.all)
                )
            }
            
            // Collapsible Right Co-Watch Chat Drawer
            if isCoWatchMode && showChat {
                HStack {
                    Spacer()
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Co-Watch Room Messages")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.top, 16)
                        
                        Divider().background(Color.white.opacity(0.12))
                        
                        // Messages list
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
                            .onChange(of: messages.count) { _, _ in
                                if let last = messages.last {
                                    withAnimation {
                                        scrollProxy.scrollTo(last.id, anchor: .bottom)
                                    }
                                }
                            }
                        }
                        
                        Spacer()
                        
                        // Message input field
                        HStack(spacing: 8) {
                            TextField("Say something...", text: $chatMessage)
                                .textFieldStyle(.plain)
                                .padding(8)
                                .background(Color.black.opacity(0.3))
                                .cornerRadius(8)
                                .foregroundColor(.white)
                                .onSubmit {
                                    sendChat()
                                }
                            
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
                    .transition(.move(edge: .trailing))
                    .edgesIgnoringSafeArea(.all)
            }
        }
    }
}
.onAppear {
    initializePlayer()
    disableSleep()
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
    
    // MARK: - Player Actions
    private func initializePlayer() {
        if isWebEmbed { return }
        
        guard let url = URL(string: videoURLString) else { return }
        let player = AVPlayer(url: url)
        self.player = player
        player.volume = Float(volume)
        player.isMuted = isMuted
        
        // Load saved watch progress if exists
        let mediaId = customDubbedMovie?.id ?? String(tmdbId ?? 0)
        let type = customDubbedMovie != nil ? "dubbed" : (mediaType ?? "movie")
        if let saved = WatchProgressManager.shared.getProgress(id: mediaId, type: type) {
            let resumeTime = saved.progress
            if resumeTime > 10 && resumeTime < (saved.duration * 0.95) {
                let targetTime = CMTime(seconds: resumeTime, preferredTimescale: 1000)
                player.seek(to: targetTime)
                self.currentTime = resumeTime
                print("Resumed playback at \(resumeTime)s")
            }
        }
        
        // Track time updates
        let interval = CMTime(seconds: 1.0, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
        timeObserverToken = player.addPeriodicTimeObserver(forInterval: interval, queue: .main) { time in
            self.currentTime = time.seconds
            if let durationTime = player.currentItem?.duration {
                let seconds = durationTime.seconds
                if !seconds.isNaN {
                    self.duration = seconds
                }
            }
            self.saveWatchProgress()
        }
        
        // Watch for video completion
        didPlayToEndObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: player.currentItem,
            queue: .main
        ) { _ in
            print("Video playback ended")
            let mediaId = thisMediaId()
            let mType = thisMediaType()
            let poster = customDubbedMovie?.imageBase64 ?? posterPath ?? ""
            
            WatchProgressManager.shared.saveProgress(
                id: mediaId,
                type: mType,
                title: movieTitle,
                posterPath: poster,
                backdropPath: nil,
                progress: duration,
                duration: duration,
                season: seasonNumber,
                episode: episodeNumber
            )
        }
        
        startPlayer()
    }
    
    private func thisMediaId() -> String {
        customDubbedMovie?.id ?? String(tmdbId ?? 0)
    }
    
    private func thisMediaType() -> String {
        customDubbedMovie != nil ? "dubbed" : (mediaType ?? "movie")
    }
    
    private func saveWatchProgress(force: Bool = false) {
        if isWebEmbed { return }
        guard currentTime > 5 else { return }
        
        let now = Date()
        if force || now.timeIntervalSince(lastSavedTime) >= 10 {
            lastSavedTime = now
            let mediaId = thisMediaId()
            let mType = thisMediaType()
            let poster = customDubbedMovie?.imageBase64 ?? posterPath ?? ""
            
            WatchProgressManager.shared.saveProgress(
                id: mediaId,
                type: mType,
                title: movieTitle,
                posterPath: poster,
                backdropPath: nil,
                progress: currentTime,
                duration: duration,
                season: seasonNumber,
                episode: episodeNumber
            )
        }
    }
    
    private func startPlayer() {
        player?.play()
        isPlaying = true
        
        if isCoWatchMode && isHost, let tid = ticketId {
            Task {
                try? await NetworkService.shared.updateTicketStatus(ticketId: tid, status: "active")
            }
        }
    }
    
    private func pausePlayer() {
        player?.pause()
        isPlaying = false
        
        saveWatchProgress(force: true)
        
        if isCoWatchMode && isHost, let tid = ticketId {
            Task {
                try? await NetworkService.shared.updateTicketStatus(ticketId: tid, status: "waiting")
            }
        }
    }
    
    private func seek(to seconds: Double) {
        let targetTime = CMTime(seconds: seconds, preferredTimescale: 1000)
        player?.seek(to: targetTime)
        currentTime = seconds
        
        // If Host, notify sync endpoint
        if isCoWatchMode && isHost, let _ = ticketId {
            // Can push current timeline coordinates to messages or sync progress in a live schema
        }
    }
    
    private func disableSleep() {
        if sleepActivityToken == nil {
            sleepActivityToken = ProcessInfo.processInfo.beginActivity(
                options: [.idleDisplaySleepDisabled, .userInitiated],
                reason: "FLKRD Cinema Video Playback"
            )
            print("[SLEEP MANAGEMENT] macOS idle display sleep disabled.")
        }
    }
    
    private func enableSleep() {
        if let token = sleepActivityToken {
            ProcessInfo.processInfo.endActivity(token)
            sleepActivityToken = nil
            print("[SLEEP MANAGEMENT] macOS idle display sleep restored.")
        }
    }
    
    private func cleanupPlayer() {
        enableSleep()
        saveWatchProgress(force: true)
        
        if let token = timeObserverToken {
            player?.removeTimeObserver(token)
            timeObserverToken = nil
        }
        if let observer = didPlayToEndObserver {
            NotificationCenter.default.removeObserver(observer)
            didPlayToEndObserver = nil
        }
        player?.pause()
        player = nil
    }
    
    // MARK: - Chat & Sync Actions
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
            // Fetch latest messages
            let fetchedMsgs = try await NetworkService.shared.fetchRoomMessages(ticketId: ticketId)
            
            // Fetch ticket state
            if let ticket = try await NetworkService.shared.fetchTicket(ticketId: ticketId) {
                DispatchQueue.main.async {
                    self.messages = fetchedMsgs
                    self.ticketStatus = ticket.status
                    
                    // Coordination details:
                    // If we are the Guest and Host pauses (changes ticket state to waiting), pause local player.
                    // If Host plays (changes ticket state to active), start local player.
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
            print("CoWatch coordination failed sync iteration: \(error)")
        }
    }
    
    // MARK: - Helper Formatting
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
    
    func makeNSView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsAirPlayForMediaPlayback = true
        
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.customUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        webView.setValue(false, forKey: "drawsBackground")
        
        if let url = URL(string: urlString) {
            let request = URLRequest(url: url)
            webView.load(request)
        }
        
        return webView
    }
    
    func updateNSView(_ nsView: WKWebView, context: Context) {
        // No-op
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
        // Run on Main Thread
        DispatchQueue.main.async {
            // If there's an active controller, close it first
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
                selectedSource: selectedSource
            )
            
            let hostingController = NSHostingController(rootView: playerView)
            
            let window = NSWindow(
                contentRect: NSRect(x: 0, y: 0, width: 960, height: 540),
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
            
            // Auto full screen
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
