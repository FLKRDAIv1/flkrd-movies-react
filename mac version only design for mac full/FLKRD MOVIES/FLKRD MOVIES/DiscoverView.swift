//
//  DiscoverView.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import SwiftUI

struct DiscoverView: View {
    @ObservedObject var lang = LocalizationService.shared
    @State private var activeCategory: String? = nil
    @State private var activeCountry: String? = nil
    @State private var movies: [MediaItem] = []
    @State private var loading = false
    @State private var selectedMedia: MediaItem? = nil
    
    // Genre & Year filters in discovery
    @State private var selectedGenres: Set<Int> = []
    @State private var selectedYear: Int? = nil
    @State private var showGenres = false
    
    // Infinite Scrolling Pagination State
    @State private var currentPage: Int = 1
    @State private var canLoadMore: Bool = true
    @State private var isLoadingMore: Bool = false
    
    let countriesList = [
        CountryEntry(name: "Kurdistan", code: "KURDISTAN", flagUrl: "https://i.imgur.com/t3yYQyv.jpeg"),
        CountryEntry(name: "USA", code: "US", flagUrl: "https://flagcdn.com/w640/us.png"),
        CountryEntry(name: "United Kingdom", code: "GB", flagUrl: "https://flagcdn.com/w640/gb.png"),
        CountryEntry(name: "India", code: "IN", flagUrl: "https://flagcdn.com/w640/in.png"),
        CountryEntry(name: "Japan", code: "JP", flagUrl: "https://flagcdn.com/w640/jp.png"),
        CountryEntry(name: "South Korea", code: "KR", flagUrl: "https://flagcdn.com/w640/kr.png"),
        CountryEntry(name: "France", code: "FR", flagUrl: "https://flagcdn.com/w640/fr.png"),
        CountryEntry(name: "Germany", code: "DE", flagUrl: "https://flagcdn.com/w640/de.png"),
        CountryEntry(name: "Greece", code: "GR", flagUrl: "https://flagcdn.com/w640/gr.png")
    ]
    
    var body: some View {
        VStack(spacing: 0) {
            if activeCategory == nil {
                // 1. Root Selection Grid
                VStack(spacing: 24) {
                    VStack(spacing: 6) {
                        Image(systemName: "safari.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.blue)
                        Text(lang.t("discover"))
                            .font(.system(size: 24, weight: .black))
                            .foregroundColor(.white)
                        Text("Select a category or studio to explore the archive")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white.opacity(0.4))
                    }
                    .padding(.top, 40)
                    
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 16), GridItem(.flexible(), spacing: 16)], spacing: 16) {
                        CategorySelectionButton(title: "Hollywood", icon: "star.fill", color: .blue) {
                            selectCategory("hollywood")
                        }
                        CategorySelectionButton(title: "Bollywood", icon: "sparkles", color: .orange) {
                            selectCategory("bollywood")
                        }
                        CategorySelectionButton(title: "Animations", icon: "sparkles.tv.fill", color: .yellow) {
                            selectCategory("animations")
                        }
                        CategorySelectionButton(title: "By Country", icon: "globe.americas.fill", color: .green) {
                            selectCategory("country")
                        }
                    }
                    .padding(.horizontal, 24)
                    .maxW(500)
                    
                    Spacer()
                }
            } else if activeCategory == "country" && activeCountry == nil {
                // 2. Country Flags Grid
                VStack(spacing: 0) {
                    HStack {
                        Button {
                            activeCategory = nil
                        } label: {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                                .frame(width: 32, height: 32)
                                .glassPanel(cornerRadius: 16)
                        }
                        .buttonStyle(.plain)
                        
                        Text("Choose Country")
                            .font(.system(size: 18, weight: .black))
                            .foregroundColor(.white)
                            .padding(.leading, 8)
                        
                        Spacer()
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 24)
                    .padding(.bottom, 16)
                    
                    Divider().background(Color.white.opacity(0.08))
                    
                    ScrollView {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: 18)], spacing: 20) {
                            ForEach(countriesList) { country in
                                Button {
                                    activeCountry = country.code
                                    loadDiscoveryData()
                                } label: {
                                    CountryFlagCard(country: country)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(24)
                    }
                }
            } else {
                // 3. Discovery Movie Grid View
                VStack(spacing: 0) {
                    HStack {
                        Button {
                            if activeCategory == "country" && activeCountry != nil {
                                activeCountry = nil
                                movies = []
                            } else {
                                activeCategory = nil
                                movies = []
                            }
                        } label: {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                                .frame(width: 32, height: 32)
                                .glassPanel(cornerRadius: 16)
                        }
                        .buttonStyle(.plain)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text(getLobbyTitle())
                                .font(.system(size: 18, weight: .black))
                                .foregroundColor(.white)
                            Text("TMDB Dynamic query synchronization active")
                                .font(.system(size: 10))
                                .foregroundColor(.white.opacity(0.4))
                        }
                        .padding(.leading, 8)
                        
                        Spacer()
                        
                        Button {
                            withAnimation(.spring(response: 0.25, dampingFraction: 0.75)) {
                                showGenres.toggle()
                            }
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "line.3.horizontal.decrease.circle.fill")
                                Text(lang.t("genre"))
                            }
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .glassPanel(cornerRadius: 6)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 24)
                    .padding(.bottom, 12)
                    
                    // Native Year Filter Bar
                    YearFilterBar(selectedYear: $selectedYear) {
                        loadDiscoveryData()
                    }
                    .padding(.bottom, 4)
                    
                    Divider().background(Color.white.opacity(0.08))
                    
                    if showGenres {
                        GenreFilterBar(selectedGenres: $selectedGenres) {
                            loadDiscoveryData()
                        }
                        .padding(.vertical, 8)
                        .background(Color.black.opacity(0.12))
                        Divider().background(Color.white.opacity(0.08))
                    }
                    
                    if loading {
                        Spacer()
                        ProgressView()
                        Spacer()
                    } else if movies.isEmpty {
                        Spacer()
                        Text("No movies found in this archive partition.")
                            .font(.system(size: 12))
                            .foregroundColor(.white.opacity(0.4))
                        Spacer()
                    } else {
                        ScrollView {
                            LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: 18)], spacing: 20) {
                                ForEach(movies) { item in
                                    MediaSearchPosterCard(item: item)
                                        .onAppear {
                                            if item.id == movies.last?.id {
                                                loadNextPage()
                                            }
                                        }
                                }
                            }
                            .padding(24)
                            
                            // Bottom Infinite Scroll Spinner
                            if isLoadingMore {
                                HStack(spacing: 8) {
                                    ProgressView()
                                        .scaleEffect(0.9)
                                    Text("Loading more titles...")
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundColor(.white.opacity(0.5))
                                }
                                .padding(.vertical, 16)
                            }
                        }
                    }
                }
            }
        }
        .sheet(item: $selectedMedia) { media in
            DetailView(mediaItem: media)
        }
    }
    
    private func selectCategory(_ category: String) {
        withAnimation(.spring()) {
            activeCategory = category
            if category != "country" {
                loadDiscoveryData()
            }
        }
    }
    
    private func getLobbyTitle() -> String {
        if let country = activeCountry {
            return countriesList.first(where: { $0.code == country })?.name ?? country
        }
        return activeCategory?.uppercased() ?? "DISCOVER"
    }
    
    private func loadDiscoveryData() {
        guard let category = activeCategory else { return }
        loading = true
        currentPage = 1
        canLoadMore = true
        
        Task {
            let firstGenre = selectedGenres.first
            var originCountry: String? = nil
            var originLanguage: String? = nil
            var targetGenre: Int? = firstGenre
            var targetCompany: Int? = nil
            
            if category == "hollywood" {
                originCountry = "US"
            } else if category == "bollywood" {
                originCountry = "IN"
            } else if category == "animations" {
                targetGenre = 16
            } else if category == "country", let country = activeCountry {
                if country == "KURDISTAN" {
                    originLanguage = "ku"
                } else {
                    originCountry = country
                }
            }
            
            let gId = targetGenre
            let cId = targetCompany
            let countryParam = originCountry
            let langParam = originLanguage
            let yr = selectedYear
            
            let fetched = await withTaskGroup(of: (Int, [MediaItem]).self) { group in
                for p in 1...3 {
                    group.addTask {
                        let items = (try? await NetworkService.shared.fetchDiscover(
                            mediaType: "movie",
                            genreId: gId,
                            companyId: cId,
                            originCountry: countryParam,
                            originalLanguage: langParam,
                            year: yr,
                            page: p
                        )) ?? []
                        return (p, items)
                    }
                }
                var pageDict: [Int: [MediaItem]] = [:]
                for await (p, items) in group {
                    pageDict[p] = items
                }
                var combined: [MediaItem] = []
                var seenIds = Set<Int>()
                for p in 1...3 {
                    if let items = pageDict[p] {
                        for item in items {
                            if !seenIds.contains(item.id) {
                                seenIds.insert(item.id)
                                combined.append(item)
                            }
                        }
                    }
                }
                return combined
            }
            
            DispatchQueue.main.async {
                self.movies = fetched
                self.currentPage = 3
                self.loading = false
            }
        }
    }
    
    private func loadNextPage() {
        guard !isLoadingMore, canLoadMore, !loading, let category = activeCategory else { return }
        isLoadingMore = true
        let nextP = currentPage + 1
        
        Task {
            let firstGenre = selectedGenres.first
            var originCountry: String? = nil
            var originLanguage: String? = nil
            var targetGenre: Int? = firstGenre
            var targetCompany: Int? = nil
            
            if category == "hollywood" {
                originCountry = "US"
            } else if category == "bollywood" {
                originCountry = "IN"
            } else if category == "animations" {
                targetGenre = 16
            } else if category == "country", let country = activeCountry {
                if country == "KURDISTAN" {
                    originLanguage = "ku"
                } else {
                    originCountry = country
                }
            }
            
            let yr = selectedYear
            let items = (try? await NetworkService.shared.fetchDiscover(
                mediaType: "movie",
                genreId: targetGenre,
                companyId: targetCompany,
                originCountry: originCountry,
                originalLanguage: originLanguage,
                year: yr,
                page: nextP
            )) ?? []
            
            DispatchQueue.main.async {
                if items.isEmpty {
                    self.canLoadMore = false
                } else {
                    var currentIds = Set(self.movies.map { $0.id })
                    var newItems: [MediaItem] = []
                    for item in items {
                        if !currentIds.contains(item.id) {
                            currentIds.insert(item.id)
                            newItems.append(item)
                        }
                    }
                    if newItems.isEmpty {
                        self.canLoadMore = false
                    } else {
                        self.movies.append(contentsOf: newItems)
                        self.currentPage = nextP
                    }
                }
                self.isLoadingMore = false
            }
        }
    }
}

// MARK: - Subcomponents
struct CountryEntry: Identifiable {
    var id: String { code }
    let name: String
    let code: String
    let flagUrl: String
}

struct CategorySelectionButton: View {
    let title: String
    let icon: String
    let color: Color
    var action: () -> Void
    @State private var isHovered = false
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 28))
                    .foregroundColor(color)
                    .shadow(color: color.opacity(0.4), radius: 6)
                
                Text(title.uppercased())
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundColor(.white)
            }
            .frame(height: 110)
            .frame(maxWidth: .infinity)
            .glassPanel(cornerRadius: 16)
            .scaleEffect(isHovered ? 1.04 : 1.0)
            .animation(.easeOut(duration: 0.2), value: isHovered)
        }
        .buttonStyle(.plain)
        .onHover { hover in
            isHovered = hover
        }
    }
}

struct CountryFlagCard: View {
    let country: CountryEntry
    @State private var isHovered = false
    
    var body: some View {
        VStack(spacing: 8) {
            AsyncImage(url: URL(string: country.flagUrl)) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Color.white.opacity(0.04)
            }
            .frame(width: 100, height: 60)
            .cornerRadius(8)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.white.opacity(0.12), lineWidth: 1))
            
            Text(country.name)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.white)
        }
        .frame(width: 120, height: 100)
        .glassPanel(cornerRadius: 12)
        .scaleEffect(isHovered ? 1.05 : 1.0)
        .animation(.easeOut(duration: 0.2), value: isHovered)
        .onHover { hover in
            isHovered = hover
        }
    }
}

struct GenreFilterBar: View {
    @Binding var selectedGenres: Set<Int>
    var onChange: () -> Void
    
    let genres = [
        Genre(id: 28, name: "Action"),
        Genre(id: 12, name: "Adventure"),
        Genre(id: 16, name: "Animation"),
        Genre(id: 35, name: "Comedy"),
        Genre(id: 27, name: "Horror"),
        Genre(id: 878, name: "Sci-Fi")
    ]
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(genres) { g in
                    Button {
                        if selectedGenres.contains(g.id) {
                            selectedGenres.remove(g.id)
                        } else {
                            selectedGenres.insert(g.id)
                        }
                        onChange()
                    } label: {
                        Text(g.name.uppercased())
                            .font(.system(size: 9, weight: .bold))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(selectedGenres.contains(g.id) ? Color.blue : Color.white.opacity(0.04))
                            .foregroundColor(.white)
                            .cornerRadius(6)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 24)
        }
    }
}

// Layout helper for max width constraints
extension View {
    func maxW(_ width: CGFloat) -> some View {
        self.frame(maxWidth: width)
    }
}
