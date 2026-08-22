//
//  TVShowsView.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import SwiftUI
import Combine

struct TVShowsView: View {
    @ObservedObject var lang = LocalizationService.shared
    
    @State private var top10TVToday: [MediaItem] = []
    @State private var popularTV: [MediaItem] = []
    @State private var topRatedTV: [MediaItem] = []
    @State private var actionAdventureTV: [MediaItem] = []
    @State private var scifiFantasyTV: [MediaItem] = []
    @State private var crimeDramaTV: [MediaItem] = []
    @State private var comedyTV: [MediaItem] = []
    @State private var animationTV: [MediaItem] = []
    @State private var networkOriginals: [MediaItem] = []
    
    @State private var loading = true
    @State private var errorMessage = ""
    @State private var activeHeroIndex = 0
    @State private var selectedMedia: MediaItem? = nil
    
    let tvHeroTimer = Timer.publish(every: 6.0, on: .main, in: .common).autoconnect()
    
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
                
                // 1. Featured TV Series Hero Spotlight (Auto-cycling 10 top shows)
                if !popularTV.isEmpty {
                    let hero = popularTV[min(activeHeroIndex, popularTV.count - 1)]
                    HeroTVBannerView(item: hero) {
                        selectedMedia = hero
                    }
                    .frame(height: 360)
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                    .shadow(color: Color.black.opacity(0.5), radius: 20, x: 0, y: 10)
                    .padding(.horizontal, 24)
                } else {
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color.white.opacity(0.04))
                        .frame(height: 360)
                        .overlay(ProgressView())
                        .padding(.horizontal, 24)
                }
                
                // 2. 🔥 TOP 10 TV SERIES TODAY (Numbered Badges)
                if !top10TVToday.isEmpty {
                    Top10RankRowView(title: lang.t("top10TVToday"), items: top10TVToday) { item in
                        selectedMedia = item
                    }
                }
                
                // 3. Trending TV Series
                if !popularTV.isEmpty {
                    MediaRowView(title: lang.t("trendingToday"), items: popularTV) { item in
                        selectedMedia = item
                    }
                }
                
                // 4. Top Rated Masterpieces
                if !topRatedTV.isEmpty {
                    MediaRowView(title: lang.t("topRatedTVMasterpieces"), items: topRatedTV) { item in
                        selectedMedia = item
                    }
                }
                
                // 5. Action & Adventure TV
                if !actionAdventureTV.isEmpty {
                    MediaRowView(title: lang.t("actionBlockbusters"), items: actionAdventureTV) { item in
                        selectedMedia = item
                    }
                }
                
                // 6. Sci-Fi & Fantasy Series
                if !scifiFantasyTV.isEmpty {
                    MediaRowView(title: lang.t("scifiCyberpunk"), items: scifiFantasyTV) { item in
                        selectedMedia = item
                    }
                }
                
                // 7. Crime & Mystery Dramas
                if !crimeDramaTV.isEmpty {
                    MediaRowView(title: lang.t("crimeThrillers"), items: crimeDramaTV) { item in
                        selectedMedia = item
                    }
                }
                
                // 8. Comedy Series
                if !comedyTV.isEmpty {
                    MediaRowView(title: lang.t("comedyFun"), items: comedyTV) { item in
                        selectedMedia = item
                    }
                }
                
                // 9. Animation & Anime Series
                if !animationTV.isEmpty {
                    MediaRowView(title: lang.t("animationFamily"), items: animationTV) { item in
                        selectedMedia = item
                    }
                }
                
                // 10. Streaming Exclusives
                if !networkOriginals.isEmpty {
                    MediaRowView(title: lang.t("flkrdOriginals"), items: networkOriginals) { item in
                        selectedMedia = item
                    }
                }
                
                Spacer(minLength: 40)
            }
            .padding(.top, 20)
        }
        .onAppear {
            loadTVData()
        }
        .sheet(item: $selectedMedia) { media in
            DetailView(mediaItem: media)
        }
        .onReceive(tvHeroTimer) { _ in
            guard !popularTV.isEmpty else { return }
            withAnimation(.spring(response: 0.45, dampingFraction: 0.8)) {
                activeHeroIndex = (activeHeroIndex + 1) % min(10, popularTV.count)
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("BannedContentUpdated"))) { _ in
            loadTVData(force: true)
        }
    }
    
    private func loadTVData(force: Bool = false) {
        if !popularTV.isEmpty && !force {
            loading = false
            return
        }
        if popularTV.isEmpty {
            loading = true
        }
        Task {
            _ = await NetworkService.shared.fetchBannedContentIds()
            
            var seenIds = Set<Int>()
            
            // 1. Top 10 TV Today
            let top10 = await NetworkService.shared.fetchTop10Today(mediaType: "tv")
            let uniqueTop10 = filterUnique(items: top10, seen: &seenIds)
            
            // 2. Trending TV
            let fetchedPopular = (try? await NetworkService.shared.fetchTrending(mediaType: "tv", timeWindow: "week", forceRefresh: force)) ?? []
            let uniquePopular = filterUnique(items: fetchedPopular, seen: &seenIds)
            
            // 3. Concurrent Multi-Page Categories (3 pages each)
            async let topRatedAsync = fetchMultiPageTV(genreId: nil, pages: 3)
            async let actionAsync = fetchMultiPageTV(genreId: 10759, pages: 3)
            async let scifiAsync = fetchMultiPageTV(genreId: 10765, pages: 3)
            async let crimeAsync = fetchMultiPageTV(genreId: 80, pages: 3)
            async let comedyAsync = fetchMultiPageTV(genreId: 35, pages: 3)
            async let animAsync = fetchMultiPageTV(genreId: 16, pages: 3)
            async let originalsAsync = NetworkService.shared.fetchDiscover(mediaType: "tv", companyId: 213, page: 1)
            
            let rawTopRated = await topRatedAsync
            let uniqueTopRated = filterUnique(items: rawTopRated, seen: &seenIds)
            
            let rawAction = await actionAsync
            let uniqueAction = filterUnique(items: rawAction, seen: &seenIds)
            
            let rawScifi = await scifiAsync
            let uniqueScifi = filterUnique(items: rawScifi, seen: &seenIds)
            
            let rawCrime = await crimeAsync
            let uniqueCrime = filterUnique(items: rawCrime, seen: &seenIds)
            
            let rawComedy = await comedyAsync
            let uniqueComedy = filterUnique(items: rawComedy, seen: &seenIds)
            
            let rawAnim = await animAsync
            let uniqueAnim = filterUnique(items: rawAnim, seen: &seenIds)
            
            let rawOriginals = (try? await originalsAsync) ?? []
            let uniqueOriginals = filterUnique(items: rawOriginals, seen: &seenIds)
            
            DispatchQueue.main.async {
                self.top10TVToday = uniqueTop10
                self.popularTV = uniquePopular
                self.topRatedTV = uniqueTopRated
                self.actionAdventureTV = uniqueAction
                self.scifiFantasyTV = uniqueScifi
                self.crimeDramaTV = uniqueCrime
                self.comedyTV = uniqueComedy
                self.animationTV = uniqueAnim
                self.networkOriginals = uniqueOriginals
                self.loading = false
            }
        }
    }
    
    private func fetchMultiPageTV(genreId: Int?, pages: Int = 3) async -> [MediaItem] {
        await withTaskGroup(of: (Int, [MediaItem]).self) { group in
            for p in 1...pages {
                group.addTask {
                    let items: [MediaItem]
                    if let gid = genreId {
                        items = (try? await NetworkService.shared.fetchDiscover(mediaType: "tv", genreId: gid, page: p)) ?? []
                    } else {
                        items = (try? await NetworkService.shared.fetchDiscover(mediaType: "tv", page: p)) ?? []
                    }
                    return (p, items)
                }
            }
            var pageDict: [Int: [MediaItem]] = [:]
            for await (p, items) in group {
                pageDict[p] = items
            }
            var combined: [MediaItem] = []
            for p in 1...pages {
                if let items = pageDict[p] {
                    combined.append(contentsOf: items)
                }
            }
            return combined
        }
    }
    
    private func filterUnique(items: [MediaItem], seen: inout Set<Int>) -> [MediaItem] {
        var result: [MediaItem] = []
        for item in items {
            if !seen.contains(item.id) {
                seen.insert(item.id)
                result.append(item)
            }
        }
        return result
    }
}

// MARK: - Hero TV Banner View Component
struct HeroTVBannerView: View {
    @ObservedObject var lang = LocalizationService.shared
    let item: MediaItem
    var onPlay: () -> Void
    
    var body: some View {
        Button {
            onPlay()
        } label: {
            ZStack(alignment: .bottomLeading) {
                AsyncImage(url: URL(string: item.backdropURL)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color.black.opacity(0.5)
                }
                
                LinearGradient(
                    colors: [.black.opacity(0.85), .black.opacity(0.2), .clear],
                    startPoint: .bottom,
                    endPoint: .top
                )
                
                VStack(alignment: .leading, spacing: 10) {
                    Text(lang.t("featuredSeries"))
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.pink)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.pink.opacity(0.15))
                        .cornerRadius(4)
                    
                    Text(item.computedTitle)
                        .font(.system(size: 26, weight: .black))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    
                    Text(item.overview ?? "")
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.7))
                        .lineLimit(2)
                        .frame(maxWidth: 450, alignment: .leading)
                    
                    HStack(spacing: 12) {
                        HStack(spacing: 6) {
                            Image(systemName: "play.fill")
                            Text(lang.t("watchSeries"))
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .font(.system(size: 12, weight: .bold))
                        .cornerRadius(8)
                    }
                    .padding(.top, 4)
                }
                .padding(32)
            }
        }
        .buttonStyle(.plain)
    }
}
