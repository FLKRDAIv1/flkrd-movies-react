//
//  DetailView.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import SwiftUI

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
    @State private var selectedSource = "FLKRD SERVER"
    @State private var showSourcePicker = false
    @State private var showCoWatchSetup = false
    
    // Player presented via dedicated window (PlayerWindowController)
    
    let serverSources = [
        "FLKRD SERVER",      // VidKing (TOP 1)
        "FLKRD SERVER 1",    // VidLink Pro (TOP 2)
        "FLKRD SERVER 2",    // VidSrc (TOP 3)
        "FLKRD SERVER 3",    // SuperEmbed
        "FLKRD SERVER 4"     // CinePro
    ]
    
    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // 1. Cinematic Backdrop Hero Header
                    ZStack(alignment: .bottomLeading) {
                        AsyncImage(url: URL(string: mediaItem.backdropURL)) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Color.black.opacity(0.6)
                        }
                        .frame(height: 280)
                        .clipped()
                        
                        // Transparent gradient blend
                        LinearGradient(
                            colors: [.black, .black.opacity(0.4), .clear],
                            startPoint: .bottom,
                            endPoint: .top
                        )
                        
                        // Title overlays
                        VStack(alignment: .leading, spacing: 8) {
                            Text(mediaItem.computedTitle)
                                .font(.system(size: 26, weight: .black, design: .rounded))
                                .foregroundColor(.white)
                                .shadow(color: .black, radius: 4)
                            
                            HStack(spacing: 12) {
                                // TMDB Rating pill
                                if let vote = mediaItem.voteAverage {
                                    HStack(spacing: 4) {
                                        Image(systemName: "star.fill")
                                            .foregroundColor(.yellow)
                                        Text(String(format: "%.1f", vote))
                                            .fontWeight(.bold)
                                    }
                                    .font(.system(size: 11))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.yellow.opacity(0.2))
                                    .cornerRadius(6)
                                }
                                
                                Text(mediaItem.releaseDate?.prefix(4) ?? mediaItem.firstAirDate?.prefix(4) ?? "2026")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.white.opacity(0.6))
                                
                                Text(mediaItem.computedMediaType.uppercased())
                                    .font(.system(size: 9, weight: .black))
                                    .foregroundColor(.black)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.white)
                                    .cornerRadius(4)
                            }
                        }
                        .padding(24)
                    }
                    
                    // 2. Play Actions & Server Picker
                    HStack(spacing: 16) {
                        Button {
                            launchMovieStream()
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "play.fill")
                                Text("Play Movie")
                            }
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 12)
                            .background(Color.blue)
                            .cornerRadius(8)
                            .shadow(color: .blue.opacity(0.3), radius: 6)
                        }
                        .buttonStyle(.plain)
                        
                        // Co-Watch Lobby Ticket button
                        Button {
                            showCoWatchSetup = true
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "ticket.fill")
                                Text("Create Watch Room")
                            }
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                            .glassPanel(cornerRadius: 8)
                        }
                        .buttonStyle(.plain)
                        
                        // Server Picker dropdown
                        Button {
                            showSourcePicker.toggle()
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "server.rack")
                                Text(selectedSource)
                                Image(systemName: "chevron.down")
                            }
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.white.opacity(0.8))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 12)
                            .glassPanel(cornerRadius: 8)
                        }
                        .buttonStyle(.plain)
                        .popover(isPresented: $showSourcePicker) {
                            VStack(alignment: .leading, spacing: 4) {
                                ForEach(serverSources, id: \.self) { source in
                                    Button {
                                        selectedSource = source
                                        showSourcePicker = false
                                    } label: {
                                        Text(source)
                                            .font(.system(size: 12))
                                            .foregroundColor(.white)
                                            .padding(.horizontal, 16)
                                            .padding(.vertical, 8)
                                            .frame(maxWidth: .infinity, alignment: .leading)
                                            .background(selectedSource == source ? Color.blue.opacity(0.2) : Color.clear)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.vertical, 4)
                            .frame(width: 220)
                            .background(VisualEffectView(material: .popover))
                        }
                    }
                    .padding(.horizontal, 24)
                    
                    // 3. Synopsis / Description
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Overview")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.white)
                        
                        Text(mediaItem.overview ?? "No synopsis available.")
                            .font(.system(size: 13))
                            .foregroundColor(.white.opacity(0.7))
                            .lineSpacing(4)
                    }
                    .padding(.horizontal, 24)
                    
                    // 4. Circular Cast & Crew Row
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Cast & Crew")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 24)
                        
                        if loadingCast {
                            ProgressView()
                                .padding(.horizontal, 24)
                        } else {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 16) {
                                    ForEach(cast.prefix(12)) { actor in
                                        VStack(spacing: 6) {
                                            AsyncImage(url: URL(string: actor.profileURL)) { img in
                                                img
                                                    .resizable()
                                                    .aspectRatio(contentMode: .fill)
                                            } placeholder: {
                                                Circle().fill(Color.white.opacity(0.04))
                                            }
                                            .frame(width: 54, height: 54)
                                            .clipShape(Circle())
                                            .overlay(Circle().stroke(Color.white.opacity(0.12), lineWidth: 1))
                                            
                                            Text(actor.name)
                                                .font(.system(size: 10, weight: .bold))
                                                .foregroundColor(.white)
                                                .lineLimit(1)
                                            
                                            Text(actor.character)
                                                .font(.system(size: 9))
                                                .foregroundColor(.white.opacity(0.5))
                                                .lineLimit(1)
                                        }
                                        .frame(width: 75)
                                    }
                                }
                                .padding(.horizontal, 24)
                            }
                        }
                    }
                    
                    // 5. TV Show Seasons & Episode details selector
                    if mediaItem.computedMediaType == "tv" {
                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                Text("Seasons & Episodes")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(.white)
                                
                                Spacer()
                                
                                // Season dropdown
                                Picker("", selection: $selectedSeason) {
                                    ForEach(seasons) { season in
                                        Text(season.name).tag(season.seasonNumber)
                                    }
                                }
                                .pickerStyle(.menu)
                                .frame(width: 140)
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
                                // Episodes layout list
                                VStack(spacing: 12) {
                                    ForEach(episodes) { ep in
                                        Button {
                                            launchEpisodeStream(ep)
                                        } label: {
                                            HStack(spacing: 12) {
                                                AsyncImage(url: URL(string: ep.stillURL)) { img in
                                                    img
                                                        .resizable()
                                                        .aspectRatio(contentMode: .fill)
                                                } placeholder: {
                                                    RoundedRectangle(cornerRadius: 6)
                                                        .fill(Color.white.opacity(0.04))
                                                }
                                                .frame(width: 90, height: 55)
                                                .cornerRadius(6)
                                                
                                                VStack(alignment: .leading, spacing: 4) {
                                                    Text("EPISODE \(ep.episodeNumber)")
                                                        .font(.system(size: 9, weight: .bold))
                                                        .foregroundColor(.blue)
                                                    
                                                    Text(ep.name)
                                                        .font(.system(size: 13, weight: .bold))
                                                        .foregroundColor(.white)
                                                    
                                                    Text(ep.overview ?? "No description available.")
                                                        .font(.system(size: 11))
                                                        .foregroundColor(.white.opacity(0.5))
                                                        .lineLimit(2)
                                                }
                                                
                                                Spacer()
                                                
                                                Image(systemName: "play.circle.fill")
                                                    .font(.system(size: 20))
                                                    .foregroundColor(.blue)
                                                    .padding(.trailing, 8)
                                            }
                                            .padding(8)
                                            .glassPanel(cornerRadius: 10)
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                                .padding(.horizontal, 24)
                            }
                        }
                    }
                    
                    Spacer(minLength: 40)
                }
            }
            
            // Frosty bottom sheet dismissal button
            HStack {
                Spacer()
                Button {
                    presentationMode.wrappedValue.dismiss()
                } label: {
                    Text("Close Window")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 10)
                        .glassPanel(cornerRadius: 8)
                }
                .buttonStyle(.plain)
                .padding(16)
            }
            .background(VisualEffectView(material: .contentBackground))
        }
        .frame(width: 700, height: 600)
        .background(VisualEffectView(material: .hudWindow).edgesIgnoringSafeArea(.all))
        .onAppear {
            loadInitialDetails()
        }

        .sheet(isPresented: $showCoWatchSetup) {
            CoWatchView(movieId: String(mediaItem.id), movieTitle: mediaItem.computedTitle)
        }
    }
    
    // MARK: - Actions
    private func loadInitialDetails() {
        Task {
            // Load cast
            let fetchedCast = try? await NetworkService.shared.fetchCredits(mediaType: mediaItem.computedMediaType, id: mediaItem.id)
            
            // Load TV details if TV Series
            if mediaItem.computedMediaType == "tv" {
                if let tv = try? await NetworkService.shared.fetchTVDetails(id: mediaItem.id) {
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

// Wrapper for Identifiable String sheet targets
extension String: @retroactive Identifiable {
    public var id: String { self }
}
