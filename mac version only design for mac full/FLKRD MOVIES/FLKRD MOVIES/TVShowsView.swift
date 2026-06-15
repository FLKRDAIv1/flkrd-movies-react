//
//  TVShowsView.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import SwiftUI

struct TVShowsView: View {
    @State private var popularTV: [MediaItem] = []
    @State private var topRatedTV: [MediaItem] = []
    @State private var networkOriginals: [MediaItem] = []
    @State private var loading = true
    @State private var errorMessage = ""
    
    @State private var selectedMedia: MediaItem? = nil
    
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
                
                // 1. Popular TV Series Featured Banner
                if let hero = popularTV.first {
                    HeroTVBannerView(item: hero) {
                        selectedMedia = hero
                    }
                    .frame(height: 340)
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                    .shadow(color: Color.black.opacity(0.4), radius: 15, x: 0, y: 10)
                    .padding(.horizontal, 24)
                } else {
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color.white.opacity(0.04))
                        .frame(height: 340)
                        .overlay(ProgressView())
                        .padding(.horizontal, 24)
                }
                
                // 2. Top Rated TV Shows Row
                MediaRowView(title: "Top Rated Series", items: topRatedTV) { item in
                    selectedMedia = item
                }
                
                // 3. Popular TV Shows Row
                MediaRowView(title: "Popular TV Shows", items: popularTV) { item in
                    selectedMedia = item
                }
                
                // 4. Netflix Originals Row
                MediaRowView(title: "Original TV Series", items: networkOriginals) { item in
                    selectedMedia = item
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
    }
    
    private func loadTVData() {
        // 1. Fetch Popular TV (for Hero + Row)
        Task {
            do {
                let fetchedPopular = try await NetworkService.shared.fetchTrending(mediaType: "tv", timeWindow: "week")
                DispatchQueue.main.async {
                    self.popularTV = fetchedPopular
                    self.loading = false
                }
            } catch {
                NSLog("TVShowsView: caught error fetching popular TV: \(error)")
                DispatchQueue.main.async {
                    self.errorMessage = error.localizedDescription
                    self.loading = false
                }
            }
        }
        
        // 2. Fetch Top Rated TV
        Task {
            do {
                let fetchedTop = try await NetworkService.shared.fetchDiscover(mediaType: "tv", companyId: nil, page: 1)
                DispatchQueue.main.async {
                    self.topRatedTV = fetchedTop
                }
            } catch {
                NSLog("TVShowsView: caught error fetching top rated TV: \(error)")
            }
        }
        
        // 3. Fetch Netflix/Network Originals
        Task {
            do {
                let fetchedOriginals = try await NetworkService.shared.fetchDiscover(mediaType: "tv", companyId: 213, page: 1)
                DispatchQueue.main.async {
                    self.networkOriginals = fetchedOriginals
                }
            } catch {
                NSLog("TVShowsView: caught error fetching originals TV: \(error)")
            }
        }
    }
}

// MARK: - Hero TV Banner View Component
struct HeroTVBannerView: View {
    let item: MediaItem
    var action: () -> Void
    
    var body: some View {
        Button(action: action) {
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
                    Text("FEATURED SERIES")
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
                            Text("Watch Series")
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
