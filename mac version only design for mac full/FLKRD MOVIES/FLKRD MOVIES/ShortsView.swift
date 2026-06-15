//
//  ShortsView.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import SwiftUI
import AVKit

struct ShortReel: Identifiable, Hashable {
    let id: String
    let title: String
    let description: String
    let videoURL: String
    let fullMovieItem: MediaItem
}

struct ShortsView: View {
    @State private var activeIndex = 0
    @State private var likedReels: Set<String> = []
    @State private var showFullMovieDetail: MediaItem? = nil
    
    // Premium cinematic trailers URLs
    let reels = [
        ShortReel(
            id: "r1",
            title: "Dune: Part Two",
            description: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
            videoURL: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
            fullMovieItem: MediaItem(id: 693134, title: "Dune: Part Two", name: nil, originalTitle: nil, originalName: nil, posterPath: "/6y0Qbjzhj6vH0gVl5f3684fkB7B.jpg", backdropPath: "/xOMo8BRK7PfaHDHD6KrVIGkqkkd.jpg", overview: "Follow the mythic journey of Paul Atreides...", voteAverage: 8.3, releaseDate: "2024-02-27", firstAirDate: nil, mediaType: "movie")
        ),
        ShortReel(
            id: "r2",
            title: "Big Buck Bunny",
            description: "A large and lovable rabbit deals with bully squirrels in this beautiful classic trailer.",
            videoURL: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            fullMovieItem: MediaItem(id: 10001, title: "Big Buck Bunny", name: nil, originalTitle: nil, originalName: nil, posterPath: "/images/bunny.jpg", backdropPath: nil, overview: "Classic animation showcase.", voteAverage: 7.5, releaseDate: "2008-05-30", firstAirDate: nil, mediaType: "movie")
        ),
        ShortReel(
            id: "r3",
            title: "Tears of Steel",
            description: "Sci-Fi cinematic highlight. Human resistance fights giant robots in a dystopian cityscape.",
            videoURL: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
            fullMovieItem: MediaItem(id: 10002, title: "Tears of Steel", name: nil, originalTitle: nil, originalName: nil, posterPath: "/images/tears.jpg", backdropPath: nil, overview: "Visual effects masterclass.", voteAverage: 8.0, releaseDate: "2012-09-26", firstAirDate: nil, mediaType: "movie")
        )
    ]
    
    var body: some View {
        GeometryReader { geo in
            ZStack {
                Color.black.edgesIgnoringSafeArea(.all)
                
                if reels.indices.contains(activeIndex) {
                    let activeReel = reels[activeIndex]
                    
                    // Single Active Reel Container
                    ShortsPlayerView(videoURL: activeReel.videoURL)
                        .edgesIgnoringSafeArea(.all)
                        .id(activeReel.id)
                    
                    // Ambient backlight glow
                    LinearGradient(
                        colors: [.black.opacity(0.8), .clear, .black.opacity(0.75)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .edgesIgnoringSafeArea(.all)
                    
                    // Meta Overlay Controls
                    VStack {
                        Spacer()
                        
                        HStack(alignment: .bottom, spacing: 20) {
                            // Left Details
                            VStack(alignment: .leading, spacing: 10) {
                                Text(activeReel.title)
                                    .font(.system(size: 22, weight: .black))
                                    .foregroundColor(.white)
                                
                                Text(activeReel.description)
                                    .font(.system(size: 13))
                                    .foregroundColor(.white.opacity(0.8))
                                    .lineLimit(3)
                                    .frame(maxWidth: 360, alignment: .leading)
                                
                                // Tag pills
                                HStack(spacing: 8) {
                                    Text("#cinematic")
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundColor(.blue)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(Color.blue.opacity(0.12))
                                        .cornerRadius(4)
                                    
                                    Text("#trailers")
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundColor(.cyan)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(Color.cyan.opacity(0.12))
                                        .cornerRadius(4)
                                }
                                .padding(.top, 4)
                            }
                            
                            Spacer()
                            
                            // Right Frosted Utility Bar
                            VStack(spacing: 20) {
                                // Like
                                Button {
                                    if likedReels.contains(activeReel.id) {
                                        likedReels.remove(activeReel.id)
                                    } else {
                                        likedReels.insert(activeReel.id)
                                    }
                                } label: {
                                    VStack(spacing: 4) {
                                        Image(systemName: likedReels.contains(activeReel.id) ? "heart.fill" : "heart")
                                            .font(.system(size: 18))
                                            .foregroundColor(likedReels.contains(activeReel.id) ? .red : .white)
                                            .frame(width: 44, height: 44)
                                            .glassPanel(cornerRadius: 22)
                                        Text(likedReels.contains(activeReel.id) ? "102" : "101")
                                            .font(.system(size: 10, weight: .bold))
                                            .foregroundColor(.white)
                                    }
                                }
                                .buttonStyle(.plain)
                                
                                // Comment Mock
                                Button {
                                    // Pop comments sheet or alert
                                } label: {
                                    VStack(spacing: 4) {
                                        Image(systemName: "bubble.left.fill")
                                            .font(.system(size: 16))
                                            .foregroundColor(.white)
                                            .frame(width: 44, height: 44)
                                            .glassPanel(cornerRadius: 22)
                                        Text("42")
                                            .font(.system(size: 10, weight: .bold))
                                            .foregroundColor(.white)
                                    }
                                }
                                .buttonStyle(.plain)
                                
                                // Direct Link to Full Movie Details Page
                                Button {
                                    showFullMovieDetail = activeReel.fullMovieItem
                                } label: {
                                    VStack(spacing: 4) {
                                        Image(systemName: "popcorn.fill")
                                            .font(.system(size: 16))
                                            .foregroundColor(.yellow)
                                            .frame(width: 44, height: 44)
                                            .glassPanel(cornerRadius: 22)
                                        Text("Full Movie")
                                            .font(.system(size: 9, weight: .bold))
                                            .foregroundColor(.white)
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                            .padding(12)
                            .glassPanel(cornerRadius: 28)
                        }
                        .padding(.horizontal, 32)
                        .padding(.bottom, 40)
                    }
                    
                    // Floating Paging Toggles (Top/Bottom indicators)
                    VStack {
                        HStack {
                            Spacer()
                            VStack(spacing: 12) {
                                Button {
                                    if activeIndex > 0 {
                                        withAnimation(.easeInOut(duration: 0.4)) {
                                            activeIndex -= 1
                                        }
                                    }
                                } label: {
                                    Image(systemName: "chevron.up")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(activeIndex > 0 ? .white : .white.opacity(0.2))
                                        .frame(width: 32, height: 32)
                                        .glassPanel(cornerRadius: 16)
                                }
                                .disabled(activeIndex == 0)
                                .buttonStyle(.plain)
                                
                                Button {
                                    if activeIndex < reels.count - 1 {
                                        withAnimation(.easeInOut(duration: 0.4)) {
                                            activeIndex += 1
                                        }
                                    }
                                } label: {
                                    Image(systemName: "chevron.down")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(activeIndex < reels.count - 1 ? .white : .white.opacity(0.2))
                                        .frame(width: 32, height: 32)
                                        .glassPanel(cornerRadius: 16)
                                }
                                .disabled(activeIndex == reels.count - 1)
                                .buttonStyle(.plain)
                            }
                            .padding(.trailing, 24)
                            .padding(.top, 24)
                        }
                        Spacer()
                    }
                }
            }
        }
        .sheet(item: $showFullMovieDetail) { item in
            DetailView(mediaItem: item)
        }
    }
}

// MARK: - Loop Player View for Shorts
struct ShortsPlayerView: View {
    let videoURL: String
    @State private var player: AVQueuePlayer?
    @State private var looper: AVPlayerLooper?
    
    var body: some View {
        ZStack {
            if let player = player {
                VideoPlayer(player: player)
                    .onAppear {
                        player.play()
                    }
                    .onDisappear {
                        player.pause()
                    }
            } else {
                Color.black
                    .overlay(ProgressView())
            }
        }
        .onAppear {
            setupPlayer()
        }
        .onDisappear {
            player?.pause()
            player = nil
            looper = nil
        }
    }
    
    private func setupPlayer() {
        guard let url = URL(string: videoURL) else { return }
        let playerItem = AVPlayerItem(url: url)
        let queuePlayer = AVQueuePlayer(playerItem: playerItem)
        queuePlayer.isMuted = true // Shorts loop muted in catalog previews
        
        self.looper = AVPlayerLooper(player: queuePlayer, templateItem: playerItem)
        self.player = queuePlayer
        queuePlayer.play()
    }
}
