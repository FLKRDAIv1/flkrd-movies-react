//
//  HomeView.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import SwiftUI
import Combine

// MARK: - Persistent In-Memory Home View Model
class HomeViewModel: ObservableObject {
    static let shared = HomeViewModel()
    
    @Published var trending: [MediaItem] = []
    @Published var top10Today: [MediaItem] = []
    @Published var actionMovies: [MediaItem] = []
    @Published var topRatedTV: [MediaItem] = []
    @Published var adventureMovies: [MediaItem] = []
    @Published var scifiMovies: [MediaItem] = []
    @Published var thrillerMovies: [MediaItem] = []
    @Published var comedyMovies: [MediaItem] = []
    @Published var animationMovies: [MediaItem] = []
    @Published var topRatedMovies: [MediaItem] = []
    @Published var netflixOriginals: [MediaItem] = []
    @Published var customDubbed: [DubbedMovie] = []
    
    @Published var hasLoaded = false
    @Published var isRefreshing = false
    
    func loadAllData(forceRefresh: Bool = false) {
        if hasLoaded && !forceRefresh { return }
        isRefreshing = true
        
        Task {
            async let fetchDubbed = NetworkService.shared.fetchDubbedMovies(forceRefresh: forceRefresh)
            async let fetchTrend = NetworkService.shared.fetchTrending(mediaType: "movie", forceRefresh: forceRefresh)
            async let fetchAction = NetworkService.shared.fetchCategoryMovies(genreId: 28, pages: 3)
            async let fetchTV = NetworkService.shared.fetchDiscover(mediaType: "tv", page: 1, forceRefresh: forceRefresh)
            async let fetchAdv = NetworkService.shared.fetchCategoryMovies(genreId: 12, pages: 3)
            async let fetchSci = NetworkService.shared.fetchCategoryMovies(genreId: 878, pages: 3)
            async let fetchThrill = NetworkService.shared.fetchCategoryMovies(genreId: 53, pages: 3)
            async let fetchCom = NetworkService.shared.fetchCategoryMovies(genreId: 35, pages: 3)
            async let fetchAnim = NetworkService.shared.fetchCategoryMovies(genreId: 16, pages: 3)
            async let fetchTop = NetworkService.shared.fetchDiscover(mediaType: "movie", page: 1, forceRefresh: forceRefresh)
            async let fetchNet = NetworkService.shared.fetchDiscover(mediaType: "tv", companyId: 213, page: 1, forceRefresh: forceRefresh)
            
            let dubbed = (try? await fetchDubbed) ?? []
            let trend = (try? await fetchTrend) ?? []
            let act = await fetchAction
            let tv = (try? await fetchTV) ?? []
            let adv = await fetchAdv
            let sci = await fetchSci
            let thrill = await fetchThrill
            let com = await fetchCom
            let anim = await fetchAnim
            let top = (try? await fetchTop) ?? []
            let net = (try? await fetchNet) ?? []
            
            DispatchQueue.main.async {
                self.customDubbed = dubbed
                self.trending = trend
                self.top10Today = Array(trend.prefix(10))
                self.actionMovies = act
                self.topRatedTV = tv
                self.adventureMovies = adv
                self.scifiMovies = sci
                self.thrillerMovies = thrill
                self.comedyMovies = com
                self.animationMovies = anim
                self.topRatedMovies = top
                self.netflixOriginals = net
                self.hasLoaded = true
                self.isRefreshing = false
            }
        }
    }
}

struct HomeView: View {
    @ObservedObject var lang = LocalizationService.shared
    @ObservedObject var vm = HomeViewModel.shared
    
    @State private var activeHeroIndex = 0
    
    // Navigation destinations
    @State private var selectedMedia: MediaItem? = nil
    @State private var selectedDubbed: DubbedMovie? = nil
    @State private var selectedStudio: (id: Int, name: String)? = nil
    
    @ObservedObject var progressManager = WatchProgressManager.shared
    
    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 32) {
                // 1. Grand VisionOS Cinematic Hero Spotlight Banner (Auto-cycling 10 top films)
                if !vm.trending.isEmpty {
                    let currentHero = vm.trending[min(activeHeroIndex, vm.trending.count - 1)]
                    GrandHeroSpotlight(
                        item: currentHero,
                        playlist: Array(vm.trending.prefix(10)),
                        currentIndex: $activeHeroIndex,
                        onWatch: {
                            selectedMedia = currentHero
                        },
                        onInfo: {
                            selectedMedia = currentHero
                        }
                    )
                    .frame(height: 420)
                    .padding(.horizontal, 24)
                } else {
                    RoundedRectangle(cornerRadius: 24)
                        .fill(Color.white.opacity(0.04))
                        .frame(height: 420)
                        .overlay(ProgressView())
                        .padding(.horizontal, 24)
                }
                
                // 2. Continue Watching (Liquid progress indicators)
                if !progressManager.continueWatchingList.isEmpty {
                    VStack(alignment: .leading, spacing: 14) {
                        HStack(spacing: 8) {
                            Image(systemName: "play.circle.fill")
                                .foregroundColor(.blue)
                                .font(.system(size: 16))
                            Text(lang.t("continueWatching"))
                                .font(.system(size: 17, weight: .bold, design: .rounded))
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
                
                // 3. Featured Studio Glass Cards (Marvel, Disney, Pixar, Warner Bros, etc.)
                VStack(alignment: .leading, spacing: 14) {
                    HStack(spacing: 8) {
                        Image(systemName: "sparkles.tv.fill")
                            .foregroundColor(.purple)
                            .font(.system(size: 16))
                        Text(lang.t("studios"))
                            .font(.system(size: 17, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 24)
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 16) {
                            ForEach(STUDIOS_MOCK, id: \.id) { studio in
                                StudioCard(studio: studio) {
                                    selectedStudio = (id: studio.id, name: studio.name)
                                }
                            }
                        }
                        .padding(.horizontal, 24)
                    }
                }
                
                // 4. 🔥 TOP 10 MOVIES TODAY (Numbered Badges & High-Impact Posters)
                if !vm.top10Today.isEmpty {
                    Top10RankRowView(title: lang.t("top10MoviesToday"), items: vm.top10Today) { item in
                        selectedMedia = item
                    }
                }
                
                // 5. Kurdish Dubbed Movies (Supabase Real-Time Live Sync)
                if !vm.customDubbed.isEmpty {
                    MediaRowView(
                        title: lang.t("dubbedMovies"),
                        items: vm.customDubbed.map { dub in
                            MediaItem(
                                id: Int(dub.id) ?? abs(dub.id.hashValue),
                                title: !dub.kurdishTitle.isEmpty ? dub.kurdishTitle : dub.title,
                                name: nil,
                                originalTitle: dub.title,
                                originalName: nil,
                                posterPath: dub.imageBase64 ?? dub.bannerBase64,
                                backdropPath: dub.bannerBase64 ?? dub.imageBase64,
                                overview: dub.description ?? "Kurdish Dubbed",
                                voteAverage: 9.0,
                                releaseDate: nil,
                                firstAirDate: nil,
                                mediaType: dub.mediaType
                            )
                        },
                        isDubbed: true
                    ) { selectedItem in
                        let targetId = selectedItem.id
                        if let matched = vm.customDubbed.first(where: { dub in
                            if let intVal = Int(dub.id), intVal == targetId { return true }
                            if dub.id == "\(targetId)" { return true }
                            return abs(dub.id.hashValue) == targetId
                        }) {
                            selectedDubbed = matched
                        }
                    }
                }
                
                // 6. Trending Movies
                if !vm.trending.isEmpty {
                    MediaRowView(title: lang.t("trendingNow"), items: vm.trending) { item in
                        selectedMedia = item
                    }
                }
                
                // 7. Action & Adventure Blockbusters
                if !vm.actionMovies.isEmpty {
                    MediaRowView(title: lang.t("actionBlockbusters"), items: vm.actionMovies) { item in
                        selectedMedia = item
                    }
                }
                
                // 8. Popular TV Series
                if !vm.topRatedTV.isEmpty {
                    MediaRowView(title: lang.t("trendingToday"), items: vm.topRatedTV) { item in
                        selectedMedia = item
                    }
                }
                
                // 9. Adventure & Quest
                if !vm.adventureMovies.isEmpty {
                    MediaRowView(title: lang.t("epicAdventure"), items: vm.adventureMovies) { item in
                        selectedMedia = item
                    }
                }
                
                // 10. Sci-Fi & Cyberpunk
                if !vm.scifiMovies.isEmpty {
                    MediaRowView(title: lang.t("scifiCyberpunk"), items: vm.scifiMovies) { item in
                        selectedMedia = item
                    }
                }
                
                // 11. Thrillers & Mystery
                if !vm.thrillerMovies.isEmpty {
                    MediaRowView(title: lang.t("crimeThrillers"), items: vm.thrillerMovies) { item in
                        selectedMedia = item
                    }
                }
                
                // 12. Comedy Hits
                if !vm.comedyMovies.isEmpty {
                    MediaRowView(title: lang.t("comedyFun"), items: vm.comedyMovies) { item in
                        selectedMedia = item
                    }
                }
                
                // 13. Animation & Kids
                if !vm.animationMovies.isEmpty {
                    MediaRowView(title: lang.t("animationFamily"), items: vm.animationMovies) { item in
                        selectedMedia = item
                    }
                }
                
                // 14. Top Rated IMDb Masterpieces
                if !vm.topRatedMovies.isEmpty {
                    MediaRowView(title: lang.t("topRatedMasterpieces"), items: vm.topRatedMovies) { item in
                        selectedMedia = item
                    }
                }
                
                // 15. FLKRD Streaming Originals
                if !vm.netflixOriginals.isEmpty {
                    MediaRowView(title: lang.t("flkrdOriginals"), items: vm.netflixOriginals) { item in
                        selectedMedia = item
                    }
                }
                
                Spacer(minLength: 40)
            }
            .padding(.top, 16)
        }
        .onAppear {
            progressManager.loadProgressList()
            vm.loadAllData()
        }
        // Navigation Sheets
        .sheet(item: $selectedMedia) { media in
            DetailView(mediaItem: media)
        }
        .sheet(item: $selectedDubbed) { dub in
            DetailView(mediaItem: MediaItem(
                id: Int(dub.id) ?? abs(dub.id.hashValue),
                title: !dub.kurdishTitle.isEmpty ? dub.kurdishTitle : dub.title,
                name: nil,
                originalTitle: dub.title,
                originalName: nil,
                posterPath: dub.imageBase64 ?? dub.bannerBase64,
                backdropPath: dub.bannerBase64 ?? dub.imageBase64,
                overview: dub.description ?? "Kurdish dubbed film.",
                voteAverage: 9.0,
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
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("BannedContentUpdated"))) { _ in
            vm.loadAllData(forceRefresh: true)
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("DubbedMoviesUpdated"))) { _ in
            vm.loadAllData(forceRefresh: true)
        }
    }
    
    private func playFromProgress(_ item: WatchProgress) {
        if item.type == "dubbed" {
            let cleanId = item.id.replacingOccurrences(of: "custom_", with: "")
            let foundDub = vm.customDubbed.first(where: {
                $0.id.replacingOccurrences(of: "custom_", with: "") == cleanId
            })
            let videoUrl = foundDub?.videoUrl ?? ""
            PlayerWindowController.show(
                videoURLString: videoUrl,
                movieTitle: item.title,
                tmdbId: Int(foundDub?.tmdbId ?? 0) != 0 ? Int(foundDub?.tmdbId ?? 0) : (Int(cleanId) ?? 0),
                mediaType: "dubbed",
                customDubbedMovie: foundDub,
                posterPath: item.posterPath,
                selectedSource: PlayerSourceManager.shared.defaultSource
            )
        } else {
            PlayerWindowController.show(
                videoURLString: "",
                movieTitle: item.title,
                tmdbId: Int(item.id) ?? 0,
                mediaType: item.type,
                seasonNumber: item.season,
                episodeNumber: item.episode,
                posterPath: item.posterPath,
                selectedSource: PlayerSourceManager.shared.defaultSource
            )
        }
    }
}

// MARK: - Grand VisionOS Cinematic Hero Spotlight
struct GrandHeroSpotlight: View {
    @ObservedObject var lang = LocalizationService.shared
    let item: MediaItem
    let playlist: [MediaItem]
    @Binding var currentIndex: Int
    var onWatch: () -> Void
    var onInfo: () -> Void
    
    let carouselTimer = Timer.publish(every: 6.0, on: .main, in: .common).autoconnect()
    
    var body: some View {
        ZStack(alignment: .bottomLeading) {
            // High-res Backdrop
            AsyncImage(url: URL(string: item.backdropURL)) { phase in
                if let img = phase.image {
                    img
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } else {
                    Color.black.opacity(0.6)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: 420)
            .clipped()
            
            // VisionOS Ambient Gradients
            LinearGradient(
                colors: [
                    Color.black.opacity(0.88),
                    Color.black.opacity(0.4),
                    Color.clear,
                    Color.black.opacity(0.85)
                ],
                startPoint: .leading,
                endPoint: .trailing
            )
            
            LinearGradient(
                colors: [Color.clear, Color.black.opacity(0.92)],
                startPoint: .center,
                endPoint: .bottom
            )
            
            // Foreground Content
            VStack(alignment: .leading, spacing: 14) {
                // Meta Tags
                HStack(spacing: 8) {
                    Text(lang.t("featuredPremiere"))
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(.blue)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color.blue.opacity(0.25))
                        .cornerRadius(6)
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(Color.blue.opacity(0.5), lineWidth: 1)
                        )
                    
                    if let vote = item.voteAverage, vote > 0 {
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .foregroundColor(.yellow)
                                .font(.system(size: 9))
                            Text(String(format: "%.1f", vote))
                                .fontWeight(.bold)
                                .font(.system(size: 10.5))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.yellow.opacity(0.2))
                        .cornerRadius(6)
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(Color.yellow.opacity(0.4), lineWidth: 1)
                        )
                    }
                    
                    Text(item.releaseDate?.prefix(4) ?? "2026")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.white.opacity(0.7))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.white.opacity(0.08))
                        .cornerRadius(6)
                    
                    Text(lang.t("ultraHd"))
                        .font(.system(size: 9, weight: .black))
                        .foregroundColor(.cyan)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 4)
                        .background(Color.cyan.opacity(0.18))
                        .cornerRadius(6)
                }
                
                // Title
                Text(item.computedTitle)
                    .font(.system(size: 34, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                    .lineLimit(2)
                    .shadow(color: .black.opacity(0.8), radius: 8, y: 3)
                
                // Overview Description
                Text(item.overview ?? "")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.white.opacity(0.8))
                    .lineLimit(3)
                    .frame(maxWidth: 540, alignment: .leading)
                
                // Action Buttons
                HStack(spacing: 14) {
                    TactileMacButton {
                        onWatch()
                    } content: {
                        HStack(spacing: 8) {
                            Image(systemName: "play.fill")
                            Text(lang.t("watchNow"))
                        }
                        .font(.system(size: 13.5, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(
                            LinearGradient(
                                colors: [Color.blue, Color(red: 0.0, green: 0.35, blue: 0.95)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .cornerRadius(10)
                        .shadow(color: Color.blue.opacity(0.5), radius: 12, y: 4)
                    }
                    
                    TactileMacButton {
                        onInfo()
                    } content: {
                        HStack(spacing: 8) {
                            Image(systemName: "info.circle")
                            Text(lang.t("moreInfo"))
                        }
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)
                        .nativeMacGlass(cornerRadius: 10)
                    }
                }
                .padding(.top, 4)
                
                // Live Thumbnail Preview Stack (10 Top items)
                HStack(spacing: 10) {
                    ForEach(0..<playlist.count, id: \.self) { idx in
                        let plItem = playlist[idx]
                        Button {
                            withAnimation(.spring(response: 0.28, dampingFraction: 0.74)) {
                                currentIndex = idx
                            }
                        } label: {
                            AsyncImage(url: URL(string: plItem.posterURL)) { phase in
                                if let img = phase.image {
                                    img
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                } else {
                                    Color.white.opacity(0.1)
                                }
                            }
                            .frame(width: 46, height: 64)
                            .cornerRadius(8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(currentIndex == idx ? Color.blue : Color.white.opacity(0.2), lineWidth: currentIndex == idx ? 2.5 : 1)
                            )
                            .shadow(color: currentIndex == idx ? Color.blue.opacity(0.6) : Color.clear, radius: 8)
                            .scaleEffect(currentIndex == idx ? 1.08 : 1.0)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.top, 6)
            }
            .padding(32)
        }
        .cornerRadius(24)
        .overlay(
            RoundedRectangle(cornerRadius: 24)
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
        .shadow(color: Color.black.opacity(0.6), radius: 24, y: 12)
        .onReceive(carouselTimer) { _ in
            guard !playlist.isEmpty else { return }
            withAnimation(.spring(response: 0.45, dampingFraction: 0.8)) {
                currentIndex = (currentIndex + 1) % playlist.count
            }
        }
    }
}

// MARK: - Continue Watching Progress Card
struct ContinueWatchingCard: View {
    let progress: WatchProgress
    @State private var isHovered = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack(alignment: .bottomLeading) {
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
                .frame(width: 210, height: 120)
                .clipped()
                .cornerRadius(14)
                
                // Play hover overlay
                if isHovered {
                    ZStack {
                        Color.black.opacity(0.45)
                        Image(systemName: "play.circle.fill")
                            .font(.system(size: 36))
                            .foregroundColor(.white)
                            .shadow(radius: 6)
                    }
                    .frame(width: 210, height: 120)
                    .cornerRadius(14)
                }
                
                // Frosted progress bar
                VStack {
                    Spacer()
                    let percent = progress.duration > 0 ? (progress.progress / progress.duration) : 0.0
                    
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(Color.black.opacity(0.6))
                            .frame(height: 5)
                        Rectangle()
                            .fill(LinearGradient(colors: [.blue, .cyan], startPoint: .leading, endPoint: .trailing))
                            .frame(width: 210 * CGFloat(min(1.0, max(0.0, percent))), height: 5)
                    }
                }
                .cornerRadius(14)
            }
            .frame(width: 210, height: 120)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(isHovered ? Color.blue : Color.white.opacity(0.12), lineWidth: isHovered ? 1.5 : 1)
            )
            .shadow(color: isHovered ? Color.blue.opacity(0.35) : Color.black.opacity(0.35), radius: isHovered ? 12 : 6, y: 4)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(progress.title)
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                    .lineLimit(1)
                
                Text(progress.season != nil ? "Season \(progress.season!) • Episode \(progress.episode!)" : "Movie")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.white.opacity(0.5))
            }
        }
        .frame(width: 210)
        .scaleEffect(isHovered ? 1.03 : 1.0)
        .animation(.spring(response: 0.25, dampingFraction: 0.75), value: isHovered)
        .onHover { hover in
            isHovered = hover
        }
    }
}

// MARK: - Studio Card Component
struct StudioMock: Identifiable {
    let id: Int
    let name: String
    let color: Color
    let iconName: String
    let gradient: [Color]
}

let STUDIOS_MOCK = [
    StudioMock(id: 420, name: "Marvel Studios", color: .red, iconName: "bolt.shield.fill", gradient: [Color.red.opacity(0.8), Color(red: 0.5, green: 0.05, blue: 0.1)]),
    StudioMock(id: 2, name: "Walt Disney", color: .blue, iconName: "sparkles", gradient: [Color.blue.opacity(0.8), Color(red: 0.0, green: 0.2, blue: 0.6)]),
    StudioMock(id: 3, name: "Pixar", color: .white, iconName: "lamp.desk.fill", gradient: [Color(red: 0.2, green: 0.4, blue: 0.8), Color(red: 0.1, green: 0.15, blue: 0.3)]),
    StudioMock(id: 1, name: "Lucasfilm", color: .yellow, iconName: "safari.fill", gradient: [Color(red: 0.8, green: 0.6, blue: 0.1), Color(red: 0.3, green: 0.2, blue: 0.05)]),
    StudioMock(id: 174, name: "Warner Bros", color: .cyan, iconName: "globe.americas.fill", gradient: [Color.cyan.opacity(0.8), Color(red: 0.0, green: 0.25, blue: 0.5)]),
    StudioMock(id: 33, name: "Universal", color: .indigo, iconName: "globe", gradient: [Color.indigo.opacity(0.8), Color(red: 0.15, green: 0.05, blue: 0.3)])
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
            ZStack {
                LinearGradient(
                    colors: studio.gradient,
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .opacity(0.65)
                
                VStack(spacing: 8) {
                    Image(systemName: studio.iconName)
                        .font(.system(size: 24))
                        .foregroundColor(studio.color)
                        .shadow(radius: 4)
                    
                    Text(studio.name)
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .shadow(radius: 3)
                }
            }
            .frame(width: 125, height: 85)
            .cornerRadius(14)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(isHovered ? Color.white.opacity(0.5) : Color.white.opacity(0.15), lineWidth: isHovered ? 1.5 : 1)
            )
            .shadow(color: isHovered ? studio.color.opacity(0.35) : Color.black.opacity(0.35), radius: isHovered ? 12 : 6, y: 4)
            .scaleEffect(isHovered ? 1.05 : 1.0)
            .animation(.spring(response: 0.25, dampingFraction: 0.75), value: isHovered)
        }
        .buttonStyle(.plain)
        .onHover { hover in
            isHovered = hover
        }
    }
}

// MARK: - Generic Media Row
struct MediaRowView: View {
    let title: String
    let items: [MediaItem]
    var isDubbed: Bool = false
    var onSelect: (MediaItem) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text(title)
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                
                if isDubbed {
                    HStack(spacing: 4) {
                        Circle().fill(Color.red).frame(width: 6, height: 6)
                        Text("Kurdish Audio")
                            .font(.system(size: 9, weight: .black))
                            .foregroundColor(.red)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color.red.opacity(0.18))
                    .cornerRadius(6)
                }
                
                Spacer()
            }
            .padding(.horizontal, 24)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 18) {
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
                .padding(.vertical, 6)
            }
        }
    }
}

struct MediaPosterCard: View {
    let item: MediaItem
    @State private var isHovered = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack(alignment: .bottomLeading) {
                if let path = item.posterPath, !path.isEmpty, !path.starts(with: "/") && !path.starts(with: "http") {
                    Base64Image(base64String: path, placeholderSystemName: "popcorn")
                        .frame(width: 135, height: 200)
                        .cornerRadius(14)
                        .clipped()
                } else {
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
                    .frame(width: 135, height: 200)
                    .cornerRadius(14)
                    .clipped()
                }
                
                // Gradient overlay
                LinearGradient(
                    colors: [Color.clear, Color.black.opacity(0.8)],
                    startPoint: .center,
                    endPoint: .bottom
                )
                .cornerRadius(14)
                
                // Hover Play Overlay
                if isHovered {
                    Color.black.opacity(0.35)
                        .cornerRadius(14)
                    
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 36))
                        .foregroundColor(.white)
                        .shadow(radius: 6)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                
                // Rating / Badge at bottom
                if let vote = item.voteAverage, vote > 0 {
                    HStack(spacing: 3) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 8))
                            .foregroundColor(.yellow)
                        Text(String(format: "%.1f", vote))
                            .font(.system(size: 9.5, weight: .black))
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(Color.black.opacity(0.7))
                    .cornerRadius(5)
                    .padding(8)
                }
            }
            .frame(width: 135, height: 200)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(isHovered ? Color.blue : Color.white.opacity(0.12), lineWidth: isHovered ? 2 : 1)
            )
            .framerHover(isHovered: isHovered, cornerRadius: 14)
            
            Text(item.computedTitle)
                .font(.system(size: 11.5, weight: .semibold))
                .foregroundColor(.white)
                .lineLimit(1)
                .frame(width: 135, alignment: .leading)
        }
        .onHover { hover in
            isHovered = hover
        }
    }
}

// MARK: - Top 10 Today Rank Row Component
struct Top10RankRowView: View {
    let title: String
    let items: [MediaItem]
    var onSelect: (MediaItem) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Image(systemName: "flame.fill")
                    .foregroundColor(.red)
                    .font(.system(size: 16, weight: .bold))
                
                Text(title)
                    .font(.system(size: 17, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                
                Text("TOP 10 TODAY")
                    .font(.system(size: 9, weight: .black))
                    .foregroundColor(.red)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color.red.opacity(0.18))
                    .cornerRadius(6)
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(Color.red.opacity(0.4), lineWidth: 1)
                    )
                
                Spacer()
            }
            .padding(.horizontal, 24)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 24) {
                    ForEach(Array(items.prefix(10).enumerated()), id: \.element.id) { index, item in
                        Top10RankCard(rank: index + 1, item: item) {
                            onSelect(item)
                        }
                    }
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 8)
            }
        }
    }
}

struct Top10RankCard: View {
    let rank: Int
    let item: MediaItem
    var action: () -> Void
    @State private var isHovered = false
    
    var body: some View {
        Button(action: action) {
            HStack(alignment: .bottom, spacing: -26) {
                // Giant Stylized Rank Number
                ZStack {
                    Text("\(rank)")
                        .font(.system(size: 110, weight: .black, design: .rounded))
                        .foregroundColor(Color.black.opacity(0.85))
                        .offset(x: 3, y: 3)
                    
                    Text("\(rank)")
                        .font(.system(size: 110, weight: .black, design: .rounded))
                        .foregroundStyle(
                            LinearGradient(
                                colors: rank <= 3 ? [Color.yellow, Color.orange] : [Color.white, Color.white.opacity(0.3)],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .shadow(color: rank <= 3 ? Color.orange.opacity(0.5) : Color.blue.opacity(0.25), radius: 8)
                }
                .frame(width: 75, height: 200, alignment: .bottomLeading)
                .zIndex(2)
                
                // Poster Card
                ZStack(alignment: .bottomLeading) {
                    AsyncImage(url: URL(string: item.posterURL)) { phase in
                        if let img = phase.image {
                            img
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } else {
                            ZStack {
                                Color.white.opacity(0.05)
                                Image(systemName: "film")
                                    .foregroundColor(.white.opacity(0.2))
                            }
                        }
                    }
                    .frame(width: 135, height: 200)
                    .clipped()
                    .cornerRadius(14)
                    
                    // Gradient overlay
                    LinearGradient(
                        colors: [Color.clear, Color.black.opacity(0.85)],
                        startPoint: .center,
                        endPoint: .bottom
                    )
                    .cornerRadius(14)
                    
                    // Hover Play Overlay
                    if isHovered {
                        Color.black.opacity(0.4)
                            .cornerRadius(14)
                        
                        Image(systemName: "play.circle.fill")
                            .font(.system(size: 36))
                            .foregroundColor(.white)
                            .shadow(radius: 6)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                    
                    // Rating / Badge at bottom
                    if let vote = item.voteAverage, vote > 0 {
                        HStack(spacing: 3) {
                            Image(systemName: "star.fill")
                                .font(.system(size: 8))
                                .foregroundColor(.yellow)
                            Text(String(format: "%.1f", vote))
                                .font(.system(size: 9.5, weight: .black))
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(Color.black.opacity(0.7))
                        .cornerRadius(5)
                        .padding(8)
                    }
                }
                .frame(width: 135, height: 200)
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(isHovered ? Color.blue : Color.white.opacity(0.15), lineWidth: isHovered ? 2 : 1)
                )
                .shadow(color: isHovered ? Color.blue.opacity(0.4) : Color.black.opacity(0.4), radius: isHovered ? 14 : 6, y: 4)
            }
            .scaleEffect(isHovered ? 1.05 : 1.0)
            .animation(.spring(response: 0.25, dampingFraction: 0.75), value: isHovered)
        }
        .buttonStyle(.plain)
        .onHover { hover in
            isHovered = hover
        }
    }
}
