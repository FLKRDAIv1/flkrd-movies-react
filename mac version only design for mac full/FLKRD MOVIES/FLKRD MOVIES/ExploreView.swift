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
    
    // Search tracking
    @State private var searchTask: Task<Void, Never>? = nil
    
    var body: some View {
        VStack(spacing: 0) {
            // Frosted Header Search Box
            HStack {
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.white.opacity(0.4))
                    
                    TextField("Search movies, TV shows, actors...", text: $searchText)
                        .textFieldStyle(.plain)
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
                                .foregroundColor(.white.opacity(0.4))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(10)
                .glassPanel(cornerRadius: 10)
                .frame(maxWidth: 500)
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)
            .padding(.bottom, 16)
            
            Divider().background(Color.white.opacity(0.08))
            
            // Content
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 24) {
                    if isSearching {
                        VStack(spacing: 12) {
                            Spacer(minLength: 40)
                            ProgressView()
                            Text("Searching flkrd index...")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.white.opacity(0.6))
                        }
                        .frame(maxWidth: .infinity)
                    } else if !searchResults.isEmpty {
                        // Results Grid
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Search Results for \"\(searchText)\"")
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(.white)
                            
                            LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: 16)], spacing: 20) {
                                ForEach(searchResults) { item in
                                    MediaSearchPosterCard(item: item)
                                }
                            }
                        }
                        .padding(.horizontal, 24)
                    } else {
                        // Default discovery categories & genres
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Browse Genres")
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(.white)
                            
                            LazyVGrid(columns: [GridItem(.flexible(), spacing: 16), GridItem(.flexible(), spacing: 16)], spacing: 16) {
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
    let gradientColors: [Color]
}

let GENRES_MOCK = [
    GenreMock(id: 28, name: "Action", gradientColors: [.red, .orange]),
    GenreMock(id: 12, name: "Adventure", gradientColors: [.blue, .cyan]),
    GenreMock(id: 16, name: "Animation", gradientColors: [.purple, .pink]),
    GenreMock(id: 35, name: "Comedy", gradientColors: [.yellow, .orange]),
    GenreMock(id: 27, name: "Horror", gradientColors: [.black, .red]),
    GenreMock(id: 878, name: "Sci-Fi", gradientColors: [.indigo, .teal])
]

struct GenreCard: View {
    let genre: GenreMock
    @State private var isHovered = false
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: genre.gradientColors,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .opacity(0.85)
            
            Text(genre.name)
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundColor(.white)
        }
        .frame(height: 90)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.white.opacity(0.15), lineWidth: 1)
        )
        .scaleEffect(isHovered ? 1.02 : 1.0)
        .animation(.easeOut(duration: 0.2), value: isHovered)
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
            VStack(alignment: .leading, spacing: 6) {
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
                .scaleEffect(isHovered ? 1.05 : 1.0)
                .animation(.spring(response: 0.2, dampingFraction: 0.75), value: isHovered)
                
                Text(item.computedTitle)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .frame(width: 120, alignment: .leading)
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
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text(genreName)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                Button {
                    presentationMode.wrappedValue.dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.white.opacity(0.4))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)
            .padding(.bottom, 16)
            
            Divider().background(Color.white.opacity(0.08))
            
            if loading {
                Spacer()
                ProgressView()
                Spacer()
            } else {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: 16)], spacing: 20) {
                        ForEach(items) { item in
                            MediaSearchPosterCard(item: item)
                        }
                    }
                    .padding(24)
                }
            }
        }
        .frame(width: 600, height: 500)
        .background(VisualEffectView(material: .hudWindow).edgesIgnoringSafeArea(.all))
        .onAppear {
            Task {
                let fetched = try? await NetworkService.shared.fetchDiscover(mediaType: "movie", genreId: genreId)
                DispatchQueue.main.async {
                    self.items = fetched ?? []
                    self.loading = false
                }
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
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text(studioName)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                Button {
                    presentationMode.wrappedValue.dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.white.opacity(0.4))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)
            .padding(.bottom, 16)
            
            Divider().background(Color.white.opacity(0.08))
            
            if loading {
                Spacer()
                ProgressView()
                Spacer()
            } else {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: 16)], spacing: 20) {
                        ForEach(items) { item in
                            MediaSearchPosterCard(item: item)
                        }
                    }
                    .padding(24)
                }
            }
        }
        .frame(width: 600, height: 500)
        .background(VisualEffectView(material: .hudWindow).edgesIgnoringSafeArea(.all))
        .onAppear {
            Task {
                let fetched = try? await NetworkService.shared.fetchDiscover(mediaType: "movie", companyId: studioId)
                DispatchQueue.main.async {
                    self.items = fetched ?? []
                    self.loading = false
                }
            }
        }
    }
}
