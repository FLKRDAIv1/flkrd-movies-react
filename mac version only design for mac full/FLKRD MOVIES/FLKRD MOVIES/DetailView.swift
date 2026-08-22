//
//  DetailView.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import SwiftUI
import Combine

struct PlaybackContext: Identifiable {
    let id = UUID()
    let tmdbId: Int
    let mediaType: String
    let seasonNumber: Int?
    let episodeNumber: Int?
    let customDubbedMovie: DubbedMovie?
    let title: String
    let directURL: String?
    let posterPath: String?
    let selectedSource: String?
}

struct DetailView: View {
    let mediaItem: MediaItem
    var customDubbedMovie: DubbedMovie? = nil
    
    @Environment(\.presentationMode) var presentationMode
    @State private var cast: [CastMember] = []
    @State private var seasons: [Season] = []
    @State private var episodes: [Episode] = []
    @State private var selectedSeason = 1
    @State private var loadingCast = true
    @State private var loadingEpisodes = false
    
    // Server source picking states
    @State private var selectedSource = PlayerSourceManager.shared.defaultSource
    @State private var showSourcePicker = false
    @State private var showCoWatchSetup = false
    
    // Admin Controls
    @ObservedObject var lang = LocalizationService.shared
    @ObservedObject var adminManager = AdminAuthManager.shared
    @State private var showAdminLoginPrompt = false
    @State private var adminInputPassword = ""
    @State private var showDeleteConfirmation = false
    @State private var isPerformingAdminAction = false
    
    var releaseDateParsed: Date? {
        guard let dateString = mediaItem.releaseDate ?? mediaItem.firstAirDate, !dateString.isEmpty else { return nil }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: String(dateString.prefix(10)))
    }
    
    var isUnreleased: Bool {
        guard let release = releaseDateParsed else { return false }
        return release > Date()
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // 1. Top macOS Liquid Navigation Bar with Close Button
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "film.fill")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.blue)
                    Text(mediaItem.computedMediaType == "tv" ? "TV Series Details" : "Movie Details")
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundColor(.white.opacity(0.85))
                }
                
                Spacer()
                
                // Top Right Close Button
                TactileMacButton {
                    presentationMode.wrappedValue.dismiss()
                } content: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.white.opacity(0.6))
                        .padding(4)
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 18)
            .padding(.bottom, 12)
            
            Divider().background(Color.white.opacity(0.08))
            
            // 2. Scrollable Detail Viewport
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 24) {
                    
                    // --- Hero Header (Poster + Info + Actions) ---
                    HStack(alignment: .top, spacing: 22) {
                        // Left Poster Card with Refractive Liquid Glass
                        Base64Image(base64String: customDubbedMovie?.imageBase64 ?? mediaItem.posterURL, placeholderSystemName: "popcorn")
                            .frame(width: 140, height: 210)
                            .cornerRadius(14)
                            .clipped()
                            .overlay(
                                RoundedRectangle(cornerRadius: 14)
                                    .stroke(
                                        LinearGradient(
                                            colors: [Color.white.opacity(0.35), Color.white.opacity(0.08)],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        ),
                                        lineWidth: 1.2
                                    )
                            )
                            .shadow(color: Color.blue.opacity(0.25), radius: 12, y: 6)
                            .fixedSize()
                        
                        // Right Metadata & Action Buttons
                        VStack(alignment: .leading, spacing: 12) {
                            // Title
                            Text(mediaItem.computedTitle)
                                .font(.system(size: 24, weight: .black, design: .rounded))
                                .foregroundColor(.white)
                                .fixedSize(horizontal: false, vertical: true)
                                .lineLimit(2)
                                .shadow(color: .black.opacity(0.5), radius: 3)
                            
                            // Badges Row (Rating, Year, Type, HD)
                            HStack(spacing: 8) {
                                if let vote = mediaItem.voteAverage, vote > 0 {
                                    HStack(spacing: 4) {
                                        Image(systemName: "star.fill")
                                            .font(.system(size: 9))
                                            .foregroundColor(.yellow)
                                        Text(String(format: "%.1f", vote))
                                            .font(.system(size: 10.5, weight: .heavy))
                                            .foregroundColor(.white)
                                    }
                                    .padding(.horizontal, 7)
                                    .padding(.vertical, 3)
                                    .background(Color.yellow.opacity(0.2))
                                    .cornerRadius(6)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 6)
                                            .stroke(Color.yellow.opacity(0.4), lineWidth: 1)
                                    )
                                }
                                
                                Text(mediaItem.releaseDate?.prefix(4) ?? mediaItem.firstAirDate?.prefix(4) ?? "2026")
                                    .font(.system(size: 10.5, weight: .bold))
                                    .foregroundColor(.white.opacity(0.7))
                                    .padding(.horizontal, 7)
                                    .padding(.vertical, 3)
                                    .background(Color.white.opacity(0.08))
                                    .cornerRadius(6)
                                
                                Text(mediaItem.computedMediaType.uppercased())
                                    .font(.system(size: 9.5, weight: .black))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 7)
                                    .padding(.vertical, 3)
                                    .background(Color.blue.opacity(0.35))
                                    .cornerRadius(6)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 6)
                                            .stroke(Color.blue.opacity(0.6), lineWidth: 1)
                                    )
                                
                                if isUnreleased {
                                    Text(lang.t("comingSoon"))
                                        .font(.system(size: 9, weight: .black))
                                        .foregroundColor(.yellow)
                                        .padding(.horizontal, 7)
                                        .padding(.vertical, 3)
                                        .background(Color.yellow.opacity(0.2))
                                        .cornerRadius(6)
                                } else {
                                    Text(lang.t("ultraHd"))
                                        .font(.system(size: 9, weight: .black))
                                        .foregroundColor(.cyan)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 3)
                                        .background(Color.cyan.opacity(0.15))
                                        .cornerRadius(6)
                                }
                            }
                            
                            // Unreleased Coming Soon Countdown Card
                            if isUnreleased, let targetDate = releaseDateParsed {
                                ComingSoonCountdownCard(targetDate: targetDate)
                                    .padding(.vertical, 4)
                            }
                            
                            // Action Buttons Row
                            HStack(spacing: 10) {
                                if !isUnreleased || adminManager.isAdmin {
                                    // Play Now / Admin Override Button
                                    TactileMacButton {
                                        launchMovieStream()
                                    } content: {
                                        HStack(spacing: 6) {
                                            Image(systemName: isUnreleased ? "lock.open.fill" : "play.fill")
                                                .font(.system(size: 11))
                                            Text(isUnreleased ? lang.t("adminVipPlay") : (mediaItem.computedMediaType == "tv" ? lang.t("watchSeries") : lang.t("play")))
                                        }
                                        .font(.system(size: 12.5, weight: .bold, design: .rounded))
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 18)
                                        .padding(.vertical, 9)
                                        .background(
                                            LinearGradient(
                                                colors: isUnreleased ? [Color.purple, Color.indigo] : [Color.blue, Color(red: 0.0, green: 0.35, blue: 0.95)],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .cornerRadius(8)
                                        .shadow(color: isUnreleased ? .purple.opacity(0.4) : .blue.opacity(0.4), radius: 8, y: 3)
                                    }
                                } else {
                                    // Locked Coming Soon Indicator
                                    HStack(spacing: 6) {
                                        Image(systemName: "lock.fill")
                                            .font(.system(size: 11))
                                            .foregroundColor(.white.opacity(0.5))
                                        Text(lang.t("lockedPremiere"))
                                            .font(.system(size: 12, weight: .bold))
                                            .foregroundColor(.white.opacity(0.7))
                                    }
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 9)
                                    .background(Color.white.opacity(0.06))
                                    .cornerRadius(8)
                                }
                                
                                // Watch Party Button
                                if !isUnreleased || adminManager.isAdmin {
                                    TactileMacButton {
                                        showCoWatchSetup = true
                                    } content: {
                                        HStack(spacing: 5) {
                                            Image(systemName: "ticket.fill")
                                                .foregroundColor(.yellow)
                                            Text(lang.t("watchParty"))
                                        }
                                        .font(.system(size: 11.5, weight: .bold))
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 9)
                                        .nativeMacGlass(cornerRadius: 8)
                                    }
                                }
                                
                                // Server Selector Button
                                let currentItem = PlayerSourceManager.shared.allSources.first(where: { $0.id == selectedSource }) ?? PlayerSourceManager.shared.allSources[0]
                                Button {
                                    showSourcePicker.toggle()
                                } label: {
                                    HStack(spacing: 5) {
                                        Image(systemName: "server.rack")
                                            .foregroundColor(.cyan)
                                        Text(currentItem.name)
                                        Image(systemName: "chevron.down")
                                            .font(.system(size: 8))
                                    }
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundColor(.white.opacity(0.9))
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 9)
                                    .nativeMacGlass(cornerRadius: 8)
                                }
                                .buttonStyle(.plain)
                                .popover(isPresented: $showSourcePicker) {
                                    serverPickerMenu
                                }
                                
                                // Admin Action
                                if adminManager.isAdmin {
                                    TactileMacButton {
                                        showDeleteConfirmation = true
                                    } content: {
                                        HStack(spacing: 5) {
                                            Image(systemName: "slash.circle.fill")
                                            Text(lang.t("blockGlobally"))
                                        }
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundColor(.red)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 9)
                                        .background(Color.red.opacity(0.18))
                                        .cornerRadius(8)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 8)
                                                .stroke(Color.red.opacity(0.4), lineWidth: 1)
                                        )
                                    }
                                } else {
                                    Button {
                                        showAdminLoginPrompt = true
                                    } label: {
                                        Image(systemName: "lock.shield")
                                            .font(.system(size: 11))
                                            .foregroundColor(.white.opacity(0.4))
                                            .padding(9)
                                            .nativeMacGlass(cornerRadius: 8)
                                    }
                                    .buttonStyle(.plain)
                                    .popover(isPresented: $showAdminLoginPrompt) {
                                        adminLoginPopover
                                    }
                                }
                            }
                            
                            // Overview Synopsis
                            Text(mediaItem.overview ?? "No storyline synopsis provided for this title.")
                                .font(.system(size: 12))
                                .foregroundColor(.white.opacity(0.75))
                                .lineSpacing(3.5)
                                .lineLimit(4)
                                .padding(.top, 2)
                        }
                    }
                    .padding(.horizontal, 24)
                    
                    // --- Cast & Crew Section ---
                    VStack(alignment: .leading, spacing: 12) {
                        Text(lang.t("cast"))
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                            .padding(.horizontal, 24)
                        
                        if loadingCast {
                            HStack {
                                Spacer()
                                ProgressView()
                                Spacer()
                            }
                            .padding(.horizontal, 24)
                        } else {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 14) {
                                    ForEach(cast.prefix(14)) { actor in
                                        VStack(spacing: 5) {
                                            AsyncImage(url: URL(string: actor.profileURL)) { img in
                                                img
                                                    .resizable()
                                                    .aspectRatio(contentMode: .fill)
                                            } placeholder: {
                                                Circle().fill(Color.white.opacity(0.06))
                                            }
                                            .frame(width: 48, height: 48)
                                            .clipShape(Circle())
                                            .overlay(
                                                Circle().stroke(Color.white.opacity(0.18), lineWidth: 1.2)
                                            )
                                            .shadow(color: .black.opacity(0.4), radius: 3)
                                            
                                            Text(actor.name)
                                                .font(.system(size: 10, weight: .bold))
                                                .foregroundColor(.white)
                                                .lineLimit(1)
                                            
                                            Text(actor.character)
                                                .font(.system(size: 8.5))
                                                .foregroundColor(.white.opacity(0.45))
                                                .lineLimit(1)
                                        }
                                        .frame(width: 70)
                                    }
                                }
                                .padding(.horizontal, 24)
                            }
                        }
                    }
                    
                    // --- TV Show Seasons & Episode Selector ---
                    if mediaItem.computedMediaType == "tv" {
                        VStack(alignment: .leading, spacing: 14) {
                            HStack {
                                Text(lang.t("seasonsEpisodes"))
                                    .font(.system(size: 14, weight: .bold, design: .rounded))
                                    .foregroundColor(.white)
                                
                                Spacer()
                                
                                // Season Picker Menu
                                Picker("", selection: $selectedSeason) {
                                    ForEach(seasons) { season in
                                        Text(season.name).tag(season.seasonNumber)
                                    }
                                }
                                .pickerStyle(.menu)
                                .frame(width: 130)
                                .onChange(of: selectedSeason) { _, seasonNum in
                                    loadEpisodes(seasonNumber: seasonNum)
                                }
                            }
                            .padding(.horizontal, 24)
                            
                            if loadingEpisodes {
                                HStack {
                                    Spacer()
                                    ProgressView()
                                    Spacer()
                                }
                            } else {
                                VStack(spacing: 8) {
                                    ForEach(episodes) { ep in
                                        TactileMacButton {
                                            launchEpisodeStream(ep)
                                        } content: {
                                            HStack(spacing: 12) {
                                                AsyncImage(url: URL(string: ep.stillURL)) { img in
                                                    img
                                                        .resizable()
                                                        .aspectRatio(contentMode: .fill)
                                                } placeholder: {
                                                    RoundedRectangle(cornerRadius: 6)
                                                        .fill(Color.white.opacity(0.04))
                                                }
                                                .frame(width: 90, height: 54)
                                                .cornerRadius(6)
                                                .clipped()
                                                
                                                VStack(alignment: .leading, spacing: 3) {
                                                    Text("\(lang.t("episode")) \(ep.episodeNumber)")
                                                        .font(.system(size: 8.5, weight: .black))
                                                        .foregroundColor(.blue)
                                                    
                                                    Text(ep.name)
                                                        .font(.system(size: 11.5, weight: .bold))
                                                        .foregroundColor(.white)
                                                    
                                                    Text(ep.overview ?? "No episode description.")
                                                        .font(.system(size: 10))
                                                        .foregroundColor(.white.opacity(0.5))
                                                        .lineLimit(2)
                                                }
                                                
                                                Spacer()
                                                
                                                Image(systemName: "play.circle.fill")
                                                    .font(.system(size: 20))
                                                    .foregroundColor(.blue)
                                                    .padding(.trailing, 4)
                                            }
                                            .padding(8)
                                            .nativeMacGlass(cornerRadius: 10)
                                        }
                                    }
                                }
                                .padding(.horizontal, 24)
                            }
                        }
                    }
                    
                    Spacer(minLength: 24)
                }
                .padding(.top, 14)
            }
        }
        .frame(minWidth: 720, idealWidth: 780, maxWidth: 840, minHeight: 500, idealHeight: 560, maxHeight: 620)
        .background(
            ZStack {
                VisualEffectView(material: .hudWindow, blendingMode: .behindWindow, state: .active)
                Color.black.opacity(0.4)
                // Soft ambient blur backdrop
                AsyncImage(url: URL(string: mediaItem.backdropURL)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color.clear
                }
                .blur(radius: 40)
                .opacity(0.25)
            }
        )
        .cornerRadius(18)
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(
                    LinearGradient(
                        stops: [
                            .init(color: .white.opacity(0.35), location: 0.0),
                            .init(color: .white.opacity(0.08), location: 0.4),
                            .init(color: .clear, location: 1.0)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1.5
                )
        )
        .onAppear {
            loadInitialDetails()
        }
        .sheet(isPresented: $showCoWatchSetup) {
            CoWatchView(movieId: String(mediaItem.id), movieTitle: mediaItem.computedTitle)
        }
        .alert(isPresented: $showDeleteConfirmation) {
            Alert(
                title: Text("Remove Movie Globally?"),
                message: Text("Are you sure you want to block or remove '\(mediaItem.computedTitle)'? It will be removed from all users across web and macOS apps."),
                primaryButton: .destructive(Text("Block / Remove")) {
                    performAdminRemove()
                },
                secondaryButton: .cancel()
            )
        }
    }
    
    // MARK: - Subviews & Menus
    private var serverPickerMenu: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("STREAMING SERVERS")
                .font(.system(size: 10, weight: .black))
                .foregroundColor(.white.opacity(0.5))
                .padding(.horizontal, 12)
                .padding(.top, 8)
            
            ForEach(PlayerSourceManager.shared.allSources) { source in
                Button {
                    selectedSource = source.id
                    PlayerSourceManager.shared.defaultSource = source.id
                    showSourcePicker = false
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 6) {
                                Text(source.badge)
                                    .font(.system(size: 8, weight: .black))
                                    .foregroundColor(.blue)
                                    .padding(.horizontal, 4)
                                    .padding(.vertical, 1)
                                    .background(Color.blue.opacity(0.2))
                                    .cornerRadius(3)
                                Text(source.name)
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.white)
                            }
                            Text(source.description)
                                .font(.system(size: 10))
                                .foregroundColor(.white.opacity(0.5))
                        }
                        Spacer()
                        if selectedSource == source.id {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.blue)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(selectedSource == source.id ? Color.blue.opacity(0.18) : Color.clear)
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(6)
        .frame(width: 280)
        .background(VisualEffectView(material: .popover))
    }
    
    private var adminLoginPopover: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Admin Security Mode")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.white)
            
            SecureField("Password (e.g. zana123)...", text: $adminInputPassword)
                .textFieldStyle(.plain)
                .padding(8)
                .background(Color.white.opacity(0.08))
                .cornerRadius(6)
            
            Button {
                if adminManager.login(password: adminInputPassword) {
                    showAdminLoginPrompt = false
                    adminInputPassword = ""
                }
            } label: {
                Text("Unlock Admin Mode")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.vertical, 6)
                    .frame(maxWidth: .infinity)
                    .background(Color.blue)
                    .cornerRadius(6)
            }
            .buttonStyle(.plain)
        }
        .padding(14)
        .frame(width: 220)
        .background(VisualEffectView(material: .popover))
    }
    
    private func performAdminRemove() {
        Task {
            if let dubbed = customDubbedMovie {
                try? await NetworkService.shared.deleteDubbedMovie(id: dubbed.id)
            }
            try? await NetworkService.shared.banContent(contentId: String(mediaItem.id), mediaType: mediaItem.computedMediaType, title: mediaItem.computedTitle)
            DispatchQueue.main.async {
                presentationMode.wrappedValue.dismiss()
            }
        }
    }
    
    // MARK: - Actions
    private func loadInitialDetails() {
        Task {
            let targetId = customDubbedMovie?.tmdbId ?? (mediaItem.id > 0 && mediaItem.id != 999 ? mediaItem.id : nil)
            var fetchedCast: [CastMember]? = nil
            if let tId = targetId {
                fetchedCast = try? await NetworkService.shared.fetchCredits(mediaType: mediaItem.computedMediaType, id: tId)
            }
            
            // Load TV details if TV Series
            if mediaItem.computedMediaType == "tv", let tId = targetId {
                if let tv = try? await NetworkService.shared.fetchTVDetails(id: tId) {
                    DispatchQueue.main.async {
                        self.seasons = tv.seasons ?? []
                        if let firstSeason = tv.seasons?.first {
                            self.selectedSeason = firstSeason.seasonNumber
                            loadEpisodes(seasonNumber: firstSeason.seasonNumber)
                        }
                    }
                }
            }
            
            DispatchQueue.main.async {
                self.cast = fetchedCast ?? []
                self.loadingCast = false
            }
        }
    }
    
    private func loadEpisodes(seasonNumber: Int) {
        loadingEpisodes = true
        Task {
            let fetched = try? await NetworkService.shared.fetchSeasonDetails(tvId: mediaItem.id, seasonNumber: seasonNumber)
            DispatchQueue.main.async {
                self.episodes = fetched ?? []
                self.loadingEpisodes = false
            }
        }
    }
    
    private func launchMovieStream() {
        if let custom = customDubbedMovie {
            PlayerWindowController.show(
                videoURLString: custom.videoUrl,
                movieTitle: mediaItem.computedTitle,
                tmdbId: Int(custom.tmdbId ?? 0),
                mediaType: "dubbed",
                customDubbedMovie: custom,
                posterPath: custom.imageBase64,
                selectedSource: selectedSource
            )
        } else {
            PlayerWindowController.show(
                videoURLString: "",
                movieTitle: mediaItem.computedTitle,
                tmdbId: mediaItem.id,
                mediaType: mediaItem.computedMediaType,
                posterPath: mediaItem.posterPath,
                selectedSource: selectedSource
            )
        }
    }
    
    private func launchEpisodeStream(_ ep: Episode) {
        PlayerWindowController.show(
            videoURLString: "",
            movieTitle: "\(mediaItem.computedTitle) - S\(ep.seasonNumber) E\(ep.episodeNumber)",
            tmdbId: mediaItem.id,
            mediaType: "tv",
            seasonNumber: ep.seasonNumber,
            episodeNumber: ep.episodeNumber,
            posterPath: mediaItem.posterPath,
            selectedSource: selectedSource
        )
    }
}

// MARK: - Coming Soon Liquid Glass Countdown Card
struct ComingSoonCountdownCard: View {
    @ObservedObject var lang = LocalizationService.shared
    let targetDate: Date
    @State private var timeRemaining: (days: Int, hours: Int, minutes: Int, seconds: Int) = (0, 0, 0, 0)
    let timer = Timer.publish(every: 1.0, on: .main, in: .common).autoconnect()
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "hourglass.circle.fill")
                    .foregroundColor(.yellow)
                    .font(.system(size: 14))
                Text(lang.t("releaseCountdown"))
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(.yellow)
                    .tracking(1.2)
                Spacer()
            }
            
            HStack(spacing: 8) {
                CountdownBox(value: timeRemaining.days, label: lang.t("days"))
                Text(":").font(.system(size: 16, weight: .black)).foregroundColor(.white.opacity(0.4))
                CountdownBox(value: timeRemaining.hours, label: lang.t("hours"))
                Text(":").font(.system(size: 16, weight: .black)).foregroundColor(.white.opacity(0.4))
                CountdownBox(value: timeRemaining.minutes, label: lang.t("minutes"))
                Text(":").font(.system(size: 16, weight: .black)).foregroundColor(.white.opacity(0.4))
                CountdownBox(value: timeRemaining.seconds, label: lang.t("seconds"))
            }
        }
        .padding(14)
        .background(
            ZStack {
                VisualEffectView(material: .hudWindow, blendingMode: .behindWindow)
                Color.black.opacity(0.3)
                LinearGradient(colors: [Color.yellow.opacity(0.08), Color.clear], startPoint: .topLeading, endPoint: .bottomTrailing)
            }
        )
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(
                    LinearGradient(colors: [Color.yellow.opacity(0.4), Color.yellow.opacity(0.1)], startPoint: .topLeading, endPoint: .bottomTrailing),
                    lineWidth: 1
                )
        )
        .onAppear { updateCountdown() }
        .onReceive(timer) { _ in updateCountdown() }
    }
    
    private func updateCountdown() {
        let diff = max(0, Int(targetDate.timeIntervalSince(Date())))
        let days = diff / 86400
        let hours = (diff % 86400) / 3600
        let minutes = (diff % 3600) / 60
        let seconds = diff % 60
        withAnimation(.spring(response: 0.25, dampingFraction: 0.75)) {
            timeRemaining = (days, hours, minutes, seconds)
        }
    }
}

struct CountdownBox: View {
    let value: Int
    let label: String
    
    var body: some View {
        VStack(spacing: 3) {
            Text(String(format: "%02d", value))
                .font(.system(size: 18, weight: .heavy, design: .monospaced))
                .foregroundColor(.white)
            Text(label)
                .font(.system(size: 8, weight: .black))
                .foregroundColor(.white.opacity(0.5))
                .tracking(1)
        }
        .frame(minWidth: 44)
        .padding(.vertical, 6)
        .padding(.horizontal, 6)
        .background(Color.white.opacity(0.08))
        .cornerRadius(8)
    }
}

// Wrapper for Identifiable String sheet targets
extension String: @retroactive Identifiable {
    public var id: String { self }
}
