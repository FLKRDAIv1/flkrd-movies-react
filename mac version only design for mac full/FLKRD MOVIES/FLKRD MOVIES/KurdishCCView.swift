//
//  KurdishCCView.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import SwiftUI

struct KurdishCCView: View {
    @State private var items: [MediaItem] = []
    @State private var loading = true
    @State private var selectedMedia: MediaItem? = nil
    
    // Exact replica of the web's KURDISH_CC_REGISTRY
    let registry = [
        KurdishCCEntry(tmdbId: 872585, type: "movie"),   // Oppenheimer
        KurdishCCEntry(tmdbId: 346698, type: "movie"),   // Barbie
        KurdishCCEntry(tmdbId: 569094, type: "movie"),   // Spider-Man: Across the Spider-Verse
        KurdishCCEntry(tmdbId: 385687, type: "movie"),   // Fast X
        KurdishCCEntry(tmdbId: 298618, type: "movie"),   // The Flash
        KurdishCCEntry(tmdbId: 447365, type: "movie"),   // Guardians of the Galaxy Vol. 3
        KurdishCCEntry(tmdbId: 693134, type: "movie"),   // Dune: Part Two
        KurdishCCEntry(tmdbId: 823464, type: "movie"),   // Godzilla x Kong: The New Empire
        KurdishCCEntry(tmdbId: 1022789, type: "movie"),  // Inside Out 2
        KurdishCCEntry(tmdbId: 94997, type: "tv"),       // House of the Dragon
        KurdishCCEntry(tmdbId: 84773, type: "tv"),       // The Lord of the Rings: The Rings of Power
        KurdishCCEntry(tmdbId: 1396, type: "tv"),        // Breaking Bad
        KurdishCCEntry(tmdbId: 95396, type: "tv")        // Squid Game
    ]
    
    var body: some View {
        VStack(spacing: 0) {
            // Header card
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 12) {
                    Image(systemName: "captions.bubble.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.red)
                        .padding(10)
                        .background(Color.red.opacity(0.12))
                        .cornerRadius(12)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Kurdish Subtitles (CC)")
                            .font(.system(size: 20, weight: .black))
                            .foregroundColor(.white)
                        Text("Strictly curated collection of cinematic releases with confirmed Kurdish CC")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white.opacity(0.4))
                    }
                    
                    Spacer()
                }
                .padding(.horizontal, 24)
                .padding(.top, 24)
            }
            .padding(.bottom, 16)
            
            Divider().background(Color.white.opacity(0.08))
            
            // Content
            if loading {
                Spacer()
                VStack(spacing: 12) {
                    ProgressView()
                    Text("Syncing OpenSubtitles registry...")
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                        .foregroundColor(.white.opacity(0.4))
                }
                Spacer()
            } else {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 130), spacing: 18)], spacing: 24) {
                        ForEach(items) { item in
                            Button {
                                selectedMedia = item
                            } label: {
                                KurdishCCCard(item: item)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(24)
                }
            }
        }
        .onAppear {
            loadCCContent()
        }
        .sheet(item: $selectedMedia) { media in
            DetailView(mediaItem: media)
        }
    }
    
    private func loadCCContent() {
        Task {
            var fetched: [MediaItem] = []
            
            // Query details for all CC items in parallel
            await withTaskGroup(of: MediaItem?.self) { group in
                for entry in registry {
                    group.addTask {
                        do {
                            // Query from TMDB details
                            if entry.type == "movie" {
                                let urlString = "https://api.themoviedb.org/3/movie/\(entry.tmdbId)?api_key=452d84f48c4e43c5a4c7331a7de3954f&language=en-US"
                                guard let url = URL(string: urlString) else { return nil }
                                let (data, _) = try await URLSession.shared.data(from: url)
                                return try JSONDecoder().decode(MediaItem.self, from: data)
                            } else {
                                let urlString = "https://api.themoviedb.org/3/tv/\(entry.tmdbId)?api_key=452d84f48c4e43c5a4c7331a7de3954f&language=en-US"
                                guard let url = URL(string: urlString) else { return nil }
                                let (data, _) = try await URLSession.shared.data(from: url)
                                var parsed = try JSONDecoder().decode(MediaItem.self, from: data)
                                // Standardize TV mediaType
                                return MediaItem(
                                    id: parsed.id,
                                    title: parsed.title,
                                    name: parsed.name,
                                    originalTitle: parsed.originalTitle,
                                    originalName: parsed.originalName,
                                    posterPath: parsed.posterPath,
                                    backdropPath: parsed.backdropPath,
                                    overview: parsed.overview,
                                    voteAverage: parsed.voteAverage,
                                    releaseDate: parsed.releaseDate,
                                    firstAirDate: parsed.firstAirDate,
                                    mediaType: "tv",
                                    adult: parsed.adult
                                )
                            }
                        } catch {
                            return nil
                        }
                    }
                }
                
                for await item in group {
                    if let it = item {
                        fetched.append(it)
                    }
                }
            }
            
            DispatchQueue.main.async {
                self.items = fetched
                self.loading = false
            }
        }
    }
}

// MARK: - Kurdish CC Card
struct KurdishCCCard: View {
    let item: MediaItem
    @State private var isHovered = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack(alignment: .topLeading) {
                AsyncImage(url: URL(string: item.posterURL)) { img in
                    img
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    ZStack {
                        Color.white.opacity(0.04)
                        Image(systemName: "film")
                            .font(.system(size: 24))
                            .foregroundColor(.white.opacity(0.12))
                    }
                }
                .frame(width: 130, height: 195)
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(isHovered ? Color.red.opacity(0.6) : Color.clear, lineWidth: 1.5)
                )
                
                // Kurdish CC badge overlay
                HStack(spacing: 3) {
                    Image(systemName: "captions.bubble.fill")
                    Text("KU CC")
                }
                .font(.system(size: 8, weight: .black))
                .foregroundColor(.white)
                .padding(.horizontal, 6)
                .padding(.vertical, 4)
                .background(Color.red.opacity(0.95))
                .cornerRadius(6)
                .padding(8)
                .shadow(color: .red.opacity(0.3), radius: 3)
            }
            .scaleEffect(isHovered ? 1.04 : 1.0)
            .shadow(color: isHovered ? Color.red.opacity(0.15) : Color.black.opacity(0.3), radius: 8)
            .animation(.spring(response: 0.25, dampingFraction: 0.75), value: isHovered)
            
            Text(item.computedTitle)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)
                .frame(width: 130, alignment: .leading)
        }
        .onHover { hover in
            isHovered = hover
        }
    }
}

struct KurdishCCEntry: Hashable {
    let tmdbId: Int
    let type: String
}
