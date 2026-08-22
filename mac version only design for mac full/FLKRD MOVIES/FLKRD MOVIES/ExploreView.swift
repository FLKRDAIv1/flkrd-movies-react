//
//  ExploreView.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import SwiftUI

struct ExploreView: View {
    @State private var searchText = ""
    @State private var searchResults: [MediaItem] = []
    @State private var isSearching = false
    @State private var selectedGenre: GenreMock? = nil
    @State private var selectedFilter: String = "All"
    
    // Search tracking
    @State private var searchTask: Task<Void, Never>? = nil
    
    let filters = ["All", "Movies", "TV Shows", "Kurdish Dubbed", "Top Rated"]
    
    var body: some View {
        VStack(spacing: 0) {
            // Frosted Header Search Box
            VStack(spacing: 12) {
                HStack {
                    HStack(spacing: 10) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.blue)
                        
                        TextField("Search 500+ movies, TV series, actors...", text: $searchText)
                            .textFieldStyle(.plain)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.white)
                            .onChange(of: searchText) { _, newVal in
                                triggerSearch(query: newVal)
                            }
                        
                        if !searchText.isEmpty {
                            Button {
                                searchText = ""
                                searchResults = []
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.white.opacity(0.5))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .nativeMacGlass(cornerRadius: 12)
                    .frame(maxWidth: 580)
                }
                
                // Quick Filter Pills
                HStack(spacing: 8) {
                    ForEach(filters, id: \.self) { filter in
                        Button {
                            withAnimation(.spring(response: 0.25, dampingFraction: 0.75)) {
                                selectedFilter = filter
                            }
                        } label: {
                            Text(filter)
                                .font(.system(size: 11, weight: selectedFilter == filter ? .bold : .medium))
                                .foregroundColor(selectedFilter == filter ? .white : .white.opacity(0.65))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 5)
                                .background(selectedFilter == filter ? Color.blue : Color.white.opacity(0.06))
                                .clipShape(Capsule())
                                .overlay(
                                    Capsule()
                                        .stroke(selectedFilter == filter ? Color.blue : Color.white.opacity(0.1), lineWidth: 1)
                                )
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)
            .padding(.bottom, 16)
            
            Divider().background(Color.white.opacity(0.08))
            
            // Content
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 28) {
                    if isSearching {
                        VStack(spacing: 12) {
                            Spacer(minLength: 50)
                            ProgressView()
                                .scaleEffect(1.2)
                            Text("Searching catalog index...")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.white.opacity(0.7))
                        }
                        .frame(maxWidth: .infinity)
                    } else if !filteredResults.isEmpty {
                        // Results Grid
                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                Text("Results for \"\(searchText)\"")
                                    .font(.system(size: 16, weight: .bold, design: .rounded))
                                    .foregroundColor(.white)
                                Spacer()
                                Text("\(filteredResults.count) titles found")
                                    .font(.system(size: 12))
                                    .foregroundColor(.white.opacity(0.5))
                            }
                            
                            LazyVGrid(columns: [GridItem(.adaptive(minimum: 130), spacing: 18)], spacing: 22) {
                                ForEach(filteredResults) { item in
                                    MediaSearchPosterCard(item: item)
                                }
                            }
                        }
                        .padding(.horizontal, 24)
                    } else {
                        // Default discovery categories & genres
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Explore by Genre")
                                .font(.system(size: 17, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                            
                            LazyVGrid(columns: [GridItem(.flexible(), spacing: 16), GridItem(.flexible(), spacing: 16), GridItem(.flexible(), spacing: 16)], spacing: 16) {
                                ForEach(GENRES_MOCK) { genre in
                                    Button {
                                        selectedGenre = genre
                                    } label: {
                                        GenreCard(genre: genre)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                        .padding(.horizontal, 24)
                    }
                    
                    Spacer(minLength: 40)
                }
                .padding(.top, 20)
            }
        }
        .sheet(item: $selectedGenre) { genre in
            GenreMediaListView(genreId: genre.id, genreName: genre.name)
        }
    }
    
    private var filteredResults: [MediaItem] {
        if selectedFilter == "Movies" {
            return searchResults.filter { $0.mediaType == "movie" || $0.mediaType == nil }
        } else if selectedFilter == "TV Shows" {
            return searchResults.filter { $0.mediaType == "tv" }
        } else if selectedFilter == "Top Rated" {
            return searchResults.filter { ($0.voteAverage ?? 0) >= 7.5 }
        }
        return searchResults
    }
    
    private func triggerSearch(query: String) {
        searchTask?.cancel()
        
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            searchResults = []
            isSearching = false
            return
        }
        
        isSearching = true
        searchTask = Task {
            do {
                try await Task.sleep(nanoseconds: 300_000_000) // Debounce 300ms
                if Task.isCancelled { return }
                
                let results = try await NetworkService.shared.fetchSearch(query: trimmed)
                
                DispatchQueue.main.async {
                    self.searchResults = results
                    self.isSearching = false
                }
            } catch {
                print("Search failed: \(error)")
                DispatchQueue.main.async {
                    self.isSearching = false
                }
            }
        }
    }
}

// MARK: - Subviews & Mocks
struct GenreMock: Identifiable {
    let id: Int
    let name: String
    let icon: String
    let gradientColors: [Color]
}

let GENRES_MOCK = [
    GenreMock(id: 28, name: "Action", icon: "flame.fill", gradientColors: [Color(red: 0.9, green: 0.2, blue: 0.2), Color(red: 0.95, green: 0.45, blue: 0.1)]),
    GenreMock(id: 12, name: "Adventure", icon: "map.fill", gradientColors: [Color(red: 0.1, green: 0.5, blue: 0.95), Color(red: 0.0, green: 0.8, blue: 0.8)]),
    GenreMock(id: 16, name: "Animation", icon: "sparkles.tv.fill", gradientColors: [Color(red: 0.55, green: 0.2, blue: 0.9), Color(red: 0.9, green: 0.3, blue: 0.7)]),
    GenreMock(id: 35, name: "Comedy", icon: "face.smiling.fill", gradientColors: [Color(red: 0.95, green: 0.65, blue: 0.0), Color(red: 0.95, green: 0.4, blue: 0.1)]),
    GenreMock(id: 80, name: "Crime & Mystery", icon: "shield.lefthalf.filled", gradientColors: [Color(red: 0.3, green: 0.35, blue: 0.45), Color(red: 0.15, green: 0.18, blue: 0.25)]),
    GenreMock(id: 878, name: "Sci-Fi & Cyber", icon: "cube.transparent.fill", gradientColors: [Color(red: 0.1, green: 0.4, blue: 0.95), Color(red: 0.4, green: 0.1, blue: 0.9)])
]

struct GenreCard: View {
    let genre: GenreMock
    @State private var isHovered = false
    
    var body: some View {
        ZStack(alignment: .leading) {
            LinearGradient(
                colors: genre.gradientColors,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .opacity(0.85)
            
            HStack(spacing: 12) {
                Image(systemName: genre.icon)
                    .font(.system(size: 22))
                    .foregroundColor(.white)
                    .shadow(radius: 4)
                
                Text(genre.name)
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                    .shadow(radius: 3)
            }
            .padding(.horizontal, 16)
        }
        .frame(height: 80)
        .cornerRadius(14)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(isHovered ? Color.white.opacity(0.5) : Color.white.opacity(0.18), lineWidth: isHovered ? 1.5 : 1)
        )
        .shadow(color: isHovered ? Color.blue.opacity(0.3) : Color.black.opacity(0.35), radius: isHovered ? 12 : 6, y: 4)
        .scaleEffect(isHovered ? 1.03 : 1.0)
        .animation(.spring(response: 0.25, dampingFraction: 0.75), value: isHovered)
        .onHover { hover in
            isHovered = hover
        }
    }
}

// MARK: - Search Poster Card
struct MediaSearchPosterCard: View {
    let item: MediaItem
    @State private var isHovered = false
    @State private var showDetail = false
    
    var body: some View {
        Button {
            showDetail = true
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                ZStack(alignment: .bottomLeading) {
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
                    .frame(width: 130, height: 195)
                    .cornerRadius(14)
                    .clipped()
                    
                    // Gradient overlay
                    LinearGradient(
                        colors: [Color.clear, Color.black.opacity(0.8)],
                        startPoint: .center,
                        endPoint: .bottom
                    )
                    .cornerRadius(14)
                    
                    // Rating / Badge at bottom
                    if let vote = item.voteAverage, vote > 0 {
                        HStack(spacing: 3) {
                            Image(systemName: "star.fill")
                                .font(.system(size: 8))
                                .foregroundColor(.yellow)
                            Text(String(format: "%.1f", vote))
                                .font(.system(size: 9, weight: .black))
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(Color.black.opacity(0.7))
                        .cornerRadius(6)
                        .padding(8)
                    }
                }
                .frame(width: 130, height: 195)
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(isHovered ? Color.blue : Color.white.opacity(0.12), lineWidth: isHovered ? 2 : 1)
                )
                .framerHover(isHovered: isHovered, cornerRadius: 14)
                
                Text(item.computedTitle)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .frame(width: 130, alignment: .leading)
            }
        }
        .buttonStyle(.plain)
        .onHover { hover in
            isHovered = hover
        }
        .sheet(isPresented: $showDetail) {
            DetailView(mediaItem: item)
        }
    }
}

// MARK: - Genre-specific Media List popup
struct GenreMediaListView: View {
    let genreId: Int
    let genreName: String
    @Environment(\.presentationMode) var presentationMode
    
    @State private var items: [MediaItem] = []
    @State private var loading = true
    @State private var selectedYear: Int? = nil
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text(genreName)
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                Spacer()
                Button {
                    presentationMode.wrappedValue.dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.white.opacity(0.5))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)
            .padding(.bottom, 12)
            
            // Year Selector Bar
            YearFilterBar(selectedYear: $selectedYear) {
                loadData()
            }
            .padding(.bottom, 6)
            
            Divider().background(Color.white.opacity(0.08))
            
            if loading {
                Spacer()
                ProgressView()
                    .scaleEffect(1.2)
                Spacer()
            } else if items.isEmpty {
                Spacer()
                Text("No movies found for selected year.")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.4))
                Spacer()
            } else {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 130), spacing: 18)], spacing: 22) {
                        ForEach(items) { item in
                            MediaSearchPosterCard(item: item)
                        }
                    }
                    .padding(24)
                }
            }
        }
        .frame(width: 720, height: 560)
        .background(VisualEffectView(material: .hudWindow).edgesIgnoringSafeArea(.all))
        .onAppear {
            loadData()
        }
    }
    
    private func loadData() {
        loading = true
        Task {
            let yr = selectedYear
            let fetched = await NetworkService.shared.fetchCategoryMovies(genreId: genreId, year: yr, pages: 3)
            DispatchQueue.main.async {
                self.items = fetched
                self.loading = false
            }
        }
    }
}

// MARK: - Studio-specific Media List popup
struct StudioMediaListView: View {
    let studioId: Int
    let studioName: String
    @Environment(\.presentationMode) var presentationMode
    
    @State private var items: [MediaItem] = []
    @State private var loading = true
    @State private var selectedYear: Int? = nil
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text(studioName)
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                Spacer()
                Button {
                    presentationMode.wrappedValue.dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.white.opacity(0.5))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)
            .padding(.bottom, 12)
            
            // Year Selector Bar
            YearFilterBar(selectedYear: $selectedYear) {
                loadData()
            }
            .padding(.bottom, 6)
            
            Divider().background(Color.white.opacity(0.08))
            
            if loading {
                Spacer()
                ProgressView()
                    .scaleEffect(1.2)
                Spacer()
            } else if items.isEmpty {
                Spacer()
                Text("No studio movies found for selected year.")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.4))
                Spacer()
            } else {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 130), spacing: 18)], spacing: 22) {
                        ForEach(items) { item in
                            MediaSearchPosterCard(item: item)
                        }
                    }
                    .padding(24)
                }
            }
        }
        .frame(width: 720, height: 560)
        .background(VisualEffectView(material: .hudWindow).edgesIgnoringSafeArea(.all))
        .onAppear {
            loadData()
        }
    }
    
    private func loadData() {
        loading = true
        Task {
            let yr = selectedYear
            let fetched = (try? await NetworkService.shared.fetchDiscover(mediaType: "movie", companyId: studioId, year: yr, page: 1)) ?? []
            DispatchQueue.main.async {
                self.items = fetched
                self.loading = false
            }
        }
    }
}

