//
//  HomeView.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import SwiftUI

struct HomeView: View {
    @ObservedObject var lang = LocalizationService.shared
    
    @State private var trending: [MediaItem] = []
    @State private var netflixOriginals: [MediaItem] = []
    @State private var topRatedTV: [MediaItem] = []
    @State private var customDubbed: [DubbedMovie] = []
    @State private var loading = true
    @State private var errorMessage = ""
    
    // Navigation destinations
    @State private var selectedMedia: MediaItem? = nil
    @State private var selectedDubbed: DubbedMovie? = nil
    @State private var selectedStudio: (id: Int, name: String)? = nil

    
    @ObservedObject var progressManager = WatchProgressManager.shared
    
    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 28) {
                if !errorMessage.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 6) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.red)
                                .font(.system(size: 12, weight: .bold))
                            Text("Error Loading Content")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white)
                        }
                        Text(errorMessage)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.white.opacity(0.7))
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.red.opacity(0.12))
                    .cornerRadius(12)
                    .padding(.horizontal, 24)
                }
                
                // 1. Featured Ambient Hero Banner
                if let hero = trending.first {
                    HeroBannerView(item: hero) {
                        selectedMedia = hero
                    }
                    .frame(height: 380)
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                    .shadow(color: Color.black.opacity(0.4), radius: 15, x: 0, y: 10)
                    .padding(.horizontal, 24)
                } else {
                    // Preloading placeholder skeleton
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color.white.opacity(0.04))
                        .frame(height: 380)
                        .overlay(ProgressView())
                        .padding(.horizontal, 24)
                }
                
                // 2. Continue Watching (Liquid progress indicators)
                if !progressManager.continueWatchingList.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "play.circle.fill")
                                .foregroundColor(lang.accentColor)
                            Text(lang.t("continueWatching"))
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 24)
                        
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 16) {
                                ForEach(progressManager.continueWatchingList) { item in
                                    ContinueWatchingCard(progress: item)
                                        .onTapGesture {
                                            playFromProgress(item)
                                        }
                                }
                            }
                            .padding(.horizontal, 24)
                        }
                    }
                }
                
                // 3. Premium Studio Cards (Glass buttons)
                VStack(alignment: .leading, spacing: 12) {
                    Text(lang.t("studios"))
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 24)
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 16) {
                            ForEach(STUDIOS_MOCK, id: \.id) { studio in
                                StudioCard(studio: studio) {
                                    selectedStudio = (studio.id, studio.name)
                                }
                            }
                        }
                        .padding(.horizontal, 24)
                    }
                }
                
                // 4. Kurdish Dubbed Movies (Supabase Real-Time live API integration)
                if !customDubbed.isEmpty {
                    MediaRowView(title: lang.t("dubbedMovies"), items: customDubbed.prefix(8).map { 
                        MediaItem(id: Int($0.id) ?? 0, title: $0.kurdishTitle, name: nil, originalTitle: $0.title, originalName: nil, posterPath: nil, backdropPath: nil, overview: "Bilingual Movie dubbed in Kurdish language.", voteAverage: 8.8, releaseDate: nil, firstAirDate: nil, mediaType: $0.mediaType)
                    }) { selectedItem in
                        if let matched = customDubbed.first(where: { Int($0.id) == selectedItem.id }) {
                            selectedDubbed = matched
                        }
                    }
                }
                
                // 5. Trending Movies
                MediaRowView(title: lang.t("trendingNow"), items: trending) { item in
                    selectedMedia = item
                }
                
                // 6. Popular TV Series
                MediaRowView(title: lang.t("trendingToday"), items: topRatedTV) { item in
                    selectedMedia = item
                }
                
                // 7. Netflix Originals
                MediaRowView(title: lang.t("flkrdOriginals"), items: netflixOriginals) { item in
                    selectedMedia = item
                }
                
                Spacer(minLength: 40)
            }
            .padding(.top, 20)
        }
        .onAppear {
            loadAllData()
        }
        // Navigation Sheets
        .sheet(item: $selectedMedia) { media in
            DetailView(mediaItem: media)
        }
        .sheet(item: $selectedDubbed) { dub in
            DetailView(mediaItem: MediaItem(
                id: Int(dub.id) ?? 999,
                title: dub.title,
                name: nil,
                originalTitle: dub.kurdishTitle,
                originalName: nil,
                posterPath: nil,
                backdropPath: nil,
                overview: "Kurdish dubbed film.",
                voteAverage: 8.5,
                releaseDate: nil,
                firstAirDate: nil,
                mediaType: dub.mediaType
            ), customDubbedMovie: dub)
        }

        .sheet(item: Binding(
            get: { selectedStudio != nil ? StudioContainer(id: selectedStudio!.id, name: selectedStudio!.name) : nil },
            set: { _ in selectedStudio = nil }
        )) { container in
            StudioMediaListView(studioId: container.id, studioName: container.name)
        }
    }
    
    private func loadAllData() {
        NSLog("HomeView: loadAllData started")
        progressManager.loadProgressList()
        
        // 1. Fetch Trending Movies (Hero Banner + Row)
        Task {
            do {
                NSLog("HomeView: fetching trending movies...")
                let fetchedTrending = try await NetworkService.shared.fetchTrending(mediaType: "movie")
                NSLog("HomeView: fetched \(fetchedTrending.count) trending movies")
                DispatchQueue.main.async {
                    self.trending = fetchedTrending
                    self.loading = false
                }
            } catch {
                NSLog("HomeView: caught error fetching trending movies: \(error)")
                DispatchQueue.main.async {
                    self.errorMessage = "\(error.localizedDescription) (\(error))"
                    self.loading = false
                }
            }
        }
        
        // 2. Fetch Trending TV
        Task {
            do {
                NSLog("HomeView: fetching trending TV...")
                let fetchedTV = try await NetworkService.shared.fetchTrending(mediaType: "tv")
                NSLog("HomeView: fetched \(fetchedTV.count) trending TV")
                DispatchQueue.main.async {
                    self.topRatedTV = fetchedTV
                }
            } catch {
                NSLog("HomeView: caught error fetching trending TV: \(error)")
            }
        }
        
        // 3. Fetch Netflix Originals
        Task {
            do {
                NSLog("HomeView: fetching Netflix originals...")
                let fetchedOriginals = try await NetworkService.shared.fetchDiscover(mediaType: "tv", companyId: 213)
                NSLog("HomeView: fetched \(fetchedOriginals.count) Netflix originals")
                DispatchQueue.main.async {
                    self.netflixOriginals = fetchedOriginals
                }
            } catch {
                NSLog("HomeView: caught error fetching Netflix originals: \(error)")
            }
        }
        
        // 4. Fetch Supabase custom dubbed movies (contains large base64 strings, runs independently)
        Task {
            do {
                NSLog("HomeView: fetching dubbed movies...")
                let fetchedDubbed = try await NetworkService.shared.fetchDubbedMovies()
                NSLog("HomeView: fetched \(fetchedDubbed.count) dubbed movies")
                DispatchQueue.main.async {
                    self.customDubbed = fetchedDubbed
                }
            } catch {
                NSLog("HomeView: caught error fetching dubbed movies: \(error)")
            }
        }
    }
    
    private func playFromProgress(_ item: WatchProgress) {
        if item.type == "dubbed" {
            let matched = customDubbed.first(where: { $0.id == item.id })
            PlayerWindowController.show(
                videoURLString: matched?.videoUrl ?? "",
                movieTitle: item.title,
                tmdbId: Int(item.id) ?? 999,
                mediaType: "dubbed",
                customDubbedMovie: matched,
                posterPath: item.posterPath
            )
        } else {
            PlayerWindowController.show(
                videoURLString: "",
                movieTitle: item.title,
                tmdbId: Int(item.id) ?? 999,
                mediaType: item.type,
                seasonNumber: item.season,
                episodeNumber: item.episode,
                posterPath: item.posterPath
            )
        }
    }
}

// MARK: - Studio Card Component Helper
struct StudioMock: Identifiable {
    let id: Int
    let name: String
    let color: Color
    let iconName: String
}

let STUDIOS_MOCK = [
    StudioMock(id: 420, name: "Marvel Studios", color: .red, iconName: "bolt.shield.fill"),
    StudioMock(id: 2, name: "Walt Disney", color: .blue, iconName: "sparkles"),
    StudioMock(id: 3, name: "Pixar", color: .white, iconName: "lamp.desk.fill"),
    StudioMock(id: 1, name: "Lucasfilm", color: .yellow, iconName: "safari.fill"),
    StudioMock(id: 174, name: "Warner Bros", color: .cyan, iconName: "globe.americas.fill"),
    StudioMock(id: 33, name: "Universal", color: .indigo, iconName: "globe")
]

struct StudioContainer: Identifiable {
    let id: Int
    let name: String
}

struct StudioCard: View {
    let studio: StudioMock
    var action: () -> Void
    @State private var isHovered = false
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: studio.iconName)
                    .font(.system(size: 24))
                    .foregroundColor(studio.color)
                
                Text(studio.name)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.white)
            }
            .frame(width: 105, height: 80)
            .glassPanel(cornerRadius: 12)
            .scaleEffect(isHovered ? 1.05 : 1.0)
            .animation(.easeOut(duration: 0.2), value: isHovered)
        }
        .buttonStyle(.plain)
        .onHover { hover in
            isHovered = hover
        }
    }
}

// MARK: - Hero Banner Component
struct HeroBannerView: View {
    let item: MediaItem
    var action: () -> Void
    
    var body: some View {
        Button(action: action) {
            ZStack(alignment: .bottomLeading) {
                // Background Backdrop Image
                AsyncImage(url: URL(string: item.backdropURL)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color.black.opacity(0.5)
                }
                
                // Vignette ambient overlay
                LinearGradient(
                    colors: [.black.opacity(0.85), .black.opacity(0.2), .clear],
                    startPoint: .bottom,
                    endPoint: .top
                )
                
                // Meta details
                VStack(alignment: .leading, spacing: 12) {
                    Text("FEATURED FILM")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.blue)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.blue.opacity(0.15))
                        .cornerRadius(4)
                    
                    Text(item.computedTitle)
                        .font(.system(size: 28, weight: .black))
                        .foregroundColor(.white)
                        .lineLimit(2)
                    
                    Text(item.overview ?? "")
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.7))
                        .lineLimit(2)
                        .frame(maxWidth: 450, alignment: .leading)
                    
                    HStack(spacing: 12) {
                        // Play Button
                        HStack(spacing: 6) {
                            Image(systemName: "play.fill")
                            Text("Watch Now")
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .font(.system(size: 13, weight: .bold))
                        .cornerRadius(8)
                        
                        // Info Button
                        HStack(spacing: 6) {
                            Image(systemName: "info.circle")
                            Text("More Info")
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.white.opacity(0.12))
                        .foregroundColor(.white)
                        .font(.system(size: 13, weight: .bold))
                        .cornerRadius(8)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.white.opacity(0.15), lineWidth: 1))
                    }
                    .padding(.top, 8)
                }
                .padding(32)
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Continue Watching Progress Card
struct ContinueWatchingCard: View {
    let progress: WatchProgress
    @State private var isHovered = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack(alignment: .bottomLeading) {
                // High-quality poster image background
                Group {
                    if progress.posterPath.starts(with: "http") || (!progress.posterPath.starts(with: "/") && progress.posterPath.count > 100) {
                        Base64Image(base64String: progress.posterPath, placeholderSystemName: "film")
                    } else {
                        AsyncImage(url: URL(string: "https://image.tmdb.org/t/p/w500\(progress.posterPath)")) { phase in
                            if let img = phase.image {
                                img
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } else {
                                ZStack {
                                    Color.white.opacity(0.04)
                                    Image(systemName: "film")
                                        .font(.system(size: 20))
                                        .foregroundColor(.white.opacity(0.3))
                                }
                            }
                        }
                    }
                }
                .frame(width: 180, height: 100)
                .clipped()
                .cornerRadius(8)
                
                // Frosted progress overlay
                VStack {
                    Spacer()
                    let percent = progress.duration > 0 ? (progress.progress / progress.duration) : 0.0
                    
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(Color.black.opacity(0.4))
                            .frame(height: 4)
                        Rectangle()
                            .fill(Color.orange)
                            .frame(width: 180 * CGFloat(min(1.0, max(0.0, percent))), height: 4)
                    }
                }
                .cornerRadius(8)
            }
            .frame(width: 180, height: 100)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(progress.title)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                
                Text(progress.season != nil ? "Season \(progress.season!) • Episode \(progress.episode!)" : "Movie")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.white.opacity(0.5))
            }
        }
        .frame(width: 180)
        .scaleEffect(isHovered ? 1.03 : 1.0)
        .animation(.easeOut(duration: 0.2), value: isHovered)
        .onHover { hover in
            isHovered = hover
        }
    }
}

// MARK: - Generic Media Row
struct MediaRowView: View {
    let title: String
    let items: [MediaItem]
    var onSelect: (MediaItem) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.white)
                .padding(.horizontal, 24)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(items) { item in
                        Button {
                            onSelect(item)
                        } label: {
                            MediaPosterCard(item: item)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 24)
            }
        }
    }
}

struct MediaPosterCard: View {
    let item: MediaItem
    @State private var isHovered = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack {
                AsyncImage(url: URL(string: item.posterURL)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    ZStack {
                        Color.white.opacity(0.04)
                        Image(systemName: "popcorn")
                            .foregroundColor(.white.opacity(0.15))
                    }
                }
            }
            .frame(width: 120, height: 180)
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isHovered ? Color.blue.opacity(0.5) : Color.clear, lineWidth: 1.5)
            )
            .shadow(color: isHovered ? Color.blue.opacity(0.2) : Color.black.opacity(0.2), radius: 8)
            .scaleEffect(isHovered ? 1.05 : 1.0)
            .animation(.spring(response: 0.25, dampingFraction: 0.75), value: isHovered)
            .onHover { hover in
                isHovered = hover
            }
            
            Text(item.computedTitle)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.white)
                .lineLimit(1)
                .frame(width: 120, alignment: .leading)
        }
    }
}

