//
//  Models.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import Foundation
import Combine
import SwiftUI

// MARK: - TMDB Media Models
struct MovieResponse: Codable {
    let results: [MediaItem]
}

struct MediaItem: Identifiable, Codable, Hashable {
    let id: Int
    let title: String?
    let name: String?
    let originalTitle: String?
    let originalName: String?
    let posterPath: String?
    let backdropPath: String?
    let overview: String?
    let voteAverage: Double?
    let releaseDate: String?
    let firstAirDate: String?
    let mediaType: String?
    let adult: Bool?
    let genreIds: [Int]?
    
    init(id: Int, title: String? = nil, name: String? = nil, originalTitle: String? = nil, originalName: String? = nil, posterPath: String? = nil, backdropPath: String? = nil, overview: String? = nil, voteAverage: Double? = nil, releaseDate: String? = nil, firstAirDate: String? = nil, mediaType: String? = nil, adult: Bool? = nil, genreIds: [Int]? = nil) {
        self.id = id
        self.title = title
        self.name = name
        self.originalTitle = originalTitle
        self.originalName = originalName
        self.posterPath = posterPath
        self.backdropPath = backdropPath
        self.overview = overview
        self.voteAverage = voteAverage
        self.releaseDate = releaseDate
        self.firstAirDate = firstAirDate
        self.mediaType = mediaType
        self.adult = adult
        self.genreIds = genreIds
    }
    
    var computedTitle: String {
        title ?? name ?? originalTitle ?? originalName ?? "Unknown Title"
    }
    
    var posterURL: String {
        guard let path = posterPath else { return "" }
        return "https://image.tmdb.org/t/p/w500\(path)"
    }
    
    var backdropURL: String {
        guard let path = backdropPath else { return "" }
        return "https://image.tmdb.org/t/p/w1280\(path)"
    }
    
    var computedMediaType: String {
        if let type = mediaType, !type.isEmpty {
            return type
        }
        if firstAirDate != nil || name != nil {
            return "tv"
        }
        return "movie"
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case name
        case originalTitle = "original_title"
        case originalName = "original_name"
        case posterPath = "poster_path"
        case backdropPath = "backdrop_path"
        case overview
        case voteAverage = "vote_average"
        case releaseDate = "release_date"
        case firstAirDate = "first_air_date"
        case mediaType = "media_type"
        case adult
        case genreIds = "genre_ids"
    }
}

struct GenreResponse: Codable {
    let genres: [Genre]
}

struct Genre: Identifiable, Codable, Hashable {
    let id: Int
    let name: String
}

struct CreditResponse: Codable {
    let cast: [CastMember]
}

struct CastMember: Identifiable, Codable, Hashable {
    let id: Int
    let name: String
    let character: String
    let profilePath: String?
    
    var profileURL: String {
        guard let path = profilePath else { return "" }
        return "https://image.tmdb.org/t/p/w300\(path)"
    }
    
    enum CodingKeys: String, CodingKey {
        case id, name, character
        case profilePath = "profile_path"
    }
}

// MARK: - TV Show Seasons & Episodes
struct TVDetails: Codable {
    let seasons: [Season]?
    let numberOfSeasons: Int?
    let numberOfEpisodes: Int?
    
    enum CodingKeys: String, CodingKey {
        case seasons
        case numberOfSeasons = "number_of_seasons"
        case numberOfEpisodes = "number_of_episodes"
    }
}

struct Season: Identifiable, Codable, Hashable {
    let id: Int
    let name: String
    let seasonNumber: Int
    let episodeCount: Int
    let posterPath: String?
    
    var posterURL: String {
        guard let path = posterPath else { return "" }
        return "https://image.tmdb.org/t/p/w500\(path)"
    }
    
    enum CodingKeys: String, CodingKey {
        case id, name
        case seasonNumber = "season_number"
        case episodeCount = "episode_count"
        case posterPath = "poster_path"
    }
}

struct SeasonDetailsResponse: Codable {
    let episodes: [Episode]
}

struct Episode: Identifiable, Codable, Hashable {
    let id: Int
    let name: String
    let overview: String?
    let stillPath: String?
    let episodeNumber: Int
    let seasonNumber: Int
    let voteAverage: Double?
    
    var stillURL: String {
        guard let path = stillPath else { return "" }
        return "https://image.tmdb.org/t/p/w500\(path)"
    }
    
    enum CodingKeys: String, CodingKey {
        case id, name, overview
        case stillPath = "still_path"
        case episodeNumber = "episode_number"
        case seasonNumber = "season_number"
        case voteAverage = "vote_average"
    }
}

// MARK: - Dubbed Movie Model for Supabase Integration
struct DubbedMovie: Identifiable, Codable, Hashable {
    let id: String
    let title: String
    let kurdishTitle: String
    let description: String?
    let videoUrl: String
    let mediaType: String?
    let imdbId: String?
    let tmdbId: Int?
    let imageBase64: String?
    let bannerBase64: String?
    let level: String?
    let createdAt: String?
    
    var posterURL: String {
        let candidate = imageBase64 ?? bannerBase64 ?? ""
        if candidate.isEmpty {
            return "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=500"
        }
        if candidate.starts(with: "/") {
            return "https://image.tmdb.org/t/p/w500\(candidate)"
        }
        return candidate
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case kurdishTitle = "kurdishTitle"
        case kurdishTitleSnake = "kurdish_title"
        case description
        case videoUrl = "videoUrl"
        case videoUrlSnake = "video_url"
        case mediaType = "media_type"
        case imdbId = "imdb_id"
        case tmdbId = "tmdb_id"
        case imageBase64 = "imageBase64"
        case imageBase64Snake = "image_base64"
        case bannerBase64 = "bannerBase64"
        case bannerBase64Snake = "banner_base64"
        case posterPath = "poster_path"
        case backdropPath = "backdrop_path"
        case level
        case createdAt = "created_at"
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Handle id being integer or string
        if let intId = try? container.decode(Int.self, forKey: .id) {
            self.id = String(intId)
        } else if let stringId = try? container.decode(String.self, forKey: .id) {
            self.id = stringId
        } else {
            self.id = UUID().uuidString
        }
        
        self.title = (try? container.decodeIfPresent(String.self, forKey: .title)) ?? ""
        self.kurdishTitle = (try? container.decodeIfPresent(String.self, forKey: .kurdishTitle)) ?? 
                            (try? container.decodeIfPresent(String.self, forKey: .kurdishTitleSnake)) ?? self.title
        self.description = try? container.decodeIfPresent(String.self, forKey: .description)
        self.videoUrl = (try? container.decodeIfPresent(String.self, forKey: .videoUrl)) ?? 
                        (try? container.decodeIfPresent(String.self, forKey: .videoUrlSnake)) ?? ""
        self.mediaType = (try? container.decodeIfPresent(String.self, forKey: .mediaType)) ?? "dubbed"
        self.imdbId = try? container.decodeIfPresent(String.self, forKey: .imdbId)
        self.tmdbId = try? container.decodeIfPresent(Int.self, forKey: .tmdbId)
        
        let rawImg = (try? container.decodeIfPresent(String.self, forKey: .imageBase64)) ?? 
                     (try? container.decodeIfPresent(String.self, forKey: .imageBase64Snake)) ?? 
                     (try? container.decodeIfPresent(String.self, forKey: .posterPath))
        self.imageBase64 = rawImg
        
        let rawBanner = (try? container.decodeIfPresent(String.self, forKey: .bannerBase64)) ?? 
                        (try? container.decodeIfPresent(String.self, forKey: .bannerBase64Snake)) ?? 
                        (try? container.decodeIfPresent(String.self, forKey: .backdropPath))
        self.bannerBase64 = rawBanner
        
        self.level = (try? container.decodeIfPresent(String.self, forKey: .level)) ?? "NEW"
        self.createdAt = try? container.decodeIfPresent(String.self, forKey: .createdAt)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(title, forKey: .title)
        try container.encode(kurdishTitle, forKey: .kurdishTitle)
        try container.encode(description, forKey: .description)
        try container.encode(videoUrl, forKey: .videoUrl)
        try container.encode(mediaType, forKey: .mediaType)
        try container.encode(imdbId, forKey: .imdbId)
        try container.encode(tmdbId, forKey: .tmdbId)
        try container.encode(imageBase64, forKey: .imageBase64)
        try container.encode(bannerBase64, forKey: .bannerBase64)
        try container.encode(level, forKey: .level)
        try container.encode(createdAt, forKey: .createdAt)
    }
    
    init(id: String, title: String, kurdishTitle: String?, description: String?, videoUrl: String, mediaType: String?, imdbId: String?, tmdbId: Int?, imageBase64: String?, bannerBase64: String?, level: String?, createdAt: String?) {
        self.id = id
        self.title = title
        self.kurdishTitle = kurdishTitle ?? title
        self.description = description
        self.videoUrl = videoUrl
        self.mediaType = mediaType ?? "dubbed"
        self.imdbId = imdbId
        self.tmdbId = tmdbId
        self.imageBase64 = imageBase64
        self.bannerBase64 = bannerBase64
        self.level = level ?? "NEW"
        self.createdAt = createdAt
    }
}

// MARK: - Supabase Watch Room & Tickets
struct WatchTicket: Identifiable, Codable, Hashable {
    let id: String
    let movieId: String
    let hostId: String
    var guestId: String?
    let pinCode: String
    var status: String // 'waiting', 'active', 'finished'
    let createdAt: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case movieId = "movie_id"
        case hostId = "host_id"
        case guestId = "guest_id"
        case pinCode = "pin_code"
        case status
        case createdAt = "created_at"
    }
}

struct RoomMessage: Identifiable, Codable, Hashable {
    let id: String
    let ticketId: String
    let userId: String
    let message: String
    let createdAt: String
    
    var senderName: String {
        userId == "host" ? "Host" : "Guest"
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case ticketId = "ticket_id"
        case userId = "user_id"
        case message
        case createdAt = "created_at"
    }
}

// MARK: - Watch Progress & Playback Configuration
struct WatchProgress: Identifiable, Codable, Hashable {
    let id: String
    let type: String // 'movie', 'tv', 'dubbed'
    let title: String
    let posterPath: String
    let backdropPath: String?
    let progress: Double // current seconds
    let duration: Double // total seconds
    let lastWatched: Double // timestamp
    let season: Int?
    let episode: Int?
}

struct PlaybackSettings: Codable, Hashable {
    var videoQualityPreset: String = "Auto (Recommended)"
    var maxResolution: String = "Native (Match Display)"
    var frameRateLimit: String = "Auto (Match Source)"
    
    var reduceQualityOnBattery: Bool = true
    var pauseWhenFullscreen: Bool = true
    var pauseOnHighCPU: Bool = false
    
    var videoVolume: Double = 0.8
    var transitionDuration: Double = 0.8
    var muted: Bool = false
}

// MARK: - Supabase Server Config Model
struct ServerConfigRow: Codable, Hashable {
    let id: Int
    let server_name: String
    let priority: Int
}

// MARK: - OpenSubtitles & Kurdish CC Models
struct OpenSubtitlesSearchResult: Codable {
    let data: [OpenSubtitlesData]?
}

struct OpenSubtitlesData: Codable {
    let id: String?
    let attributes: OpenSubtitlesAttributes?
}

struct OpenSubtitlesAttributes: Codable {
    let language: String?
    let release: String?
    let files: [OpenSubtitlesFileItem]?
}

struct OpenSubtitlesFileItem: Codable {
    let file_id: Int?
    let cd_number: Int?
    let file_name: String?
}

struct OpenSubtitlesDownloadResponse: Codable {
    let link: String?
    let file_name: String?
    let requests: Int?
}

struct OpenSubtitleTrack: Identifiable, Hashable {
    let id: Int
    let language: String
    let languageCode: String
    let releaseName: String
    let isKurdish: Bool
    var directUrl: String? = nil
    var sourceName: String = "OpenSubtitles"
}

// MARK: - Universal Player Sources & Persistence Manager
struct PlayerSourceItem: Identifiable, Hashable {
    let id: String
    let name: String
    let description: String
    let badge: String
    let kurdishName: String
}

class PlayerSourceManager {
    static let shared = PlayerSourceManager()
    
    let allSources: [PlayerSourceItem] = [
        PlayerSourceItem(id: "FLKRD SERVER", name: "111Movies Ultra (Server 1)", description: "Direct Clean 4K BluRay / WEB-DL Stream", badge: "⚡ 4K BLURAY", kurdishName: "١١١ موڤیز (111Movies Ultra)"),
        PlayerSourceItem(id: "FLKRD SERVER 1", name: "VidLove 4K Pro (Server 2)", description: "NextGen 4K Player · Custom Theme & Download", badge: "💎 4K PRO", kurdishName: "ڤید لۆڤ پرۆ (VidLove 4K Pro)"),
        PlayerSourceItem(id: "FLKRD SERVER 2", name: "VidLink Pro 4K (Server 3)", description: "Ultra-Fast 4K HDR Player · Instant Load", badge: "👑 4K HDR", kurdishName: "ڤید لینک پرۆ (VidLink Pro 4K)"),
        PlayerSourceItem(id: "FLKRD SERVER 3", name: "Videasy HD (Server 4)", description: "Adaptive Multi-Bitrate · HD 1080p · Ultra Fast", badge: "⚡ TOP HD", kurdishName: "ڤید ئیزی (Videasy HD)"),
        PlayerSourceItem(id: "FLKRD SERVER 4", name: "VidKing 4K (Server 5)", description: "Universal Direct Streaming · 4K UHD", badge: "🚀 4K DIRECT", kurdishName: "ڤید کینگ (VidKing 4K)"),
        PlayerSourceItem(id: "FLKRD SERVER 5", name: "AutoEmbed VIP (Server 6)", description: "Ultra-Fast Multi-Cloud Failover CDN", badge: "🛡️ FAILOVER", kurdishName: "ئۆتۆ ئیمبێد (AutoEmbed VIP)"),
        PlayerSourceItem(id: "FLKRD SERVER 6", name: "VidSrc VIP (Server 7)", description: "Deep Global Fast Movie & Series Archive", badge: "🌐 CLOUD VIP", kurdishName: "ڤید سۆرس ڤی ئای پی (VidSrc VIP)"),
        PlayerSourceItem(id: "FLKRD SERVER 7", name: "SuperEmbed (Server 8)", description: "Multi-Source Mirror Backup Stream", badge: "🎬 MIRROR", kurdishName: "سوپەر ئیمبێد (SuperEmbed)")
    ]
    
    var defaultSource: String {
        get {
            UserDefaults.standard.string(forKey: "flkrd_default_player_source") ?? "FLKRD SERVER"
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "flkrd_default_player_source")
        }
    }
}

// MARK: - Global Admin Manager
class AdminAuthManager: ObservableObject {
    static let shared = AdminAuthManager()
    
    @Published var isAdmin: Bool {
        didSet {
            UserDefaults.standard.set(isAdmin, forKey: "flkrd_is_admin_logged_in")
        }
    }
    
    init() {
        self.isAdmin = UserDefaults.standard.bool(forKey: "flkrd_is_admin_logged_in")
    }
    
    func login(password: String) -> Bool {
        let clean = password.trimmingCharacters(in: .whitespacesAndNewlines)
        if clean == "Admin123" || clean == "admin123" || clean == "admin" || clean == "flkrdadmin" {
            self.isAdmin = true
            return true
        }
        return false
    }
    
    func logout() {
        self.isAdmin = false
    }
}




