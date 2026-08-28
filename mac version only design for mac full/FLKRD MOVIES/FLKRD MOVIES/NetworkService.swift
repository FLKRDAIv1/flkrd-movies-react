//
//  NetworkService.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import Foundation
import Combine

class NetworkService: ObservableObject {
    static let shared = NetworkService()
    
    // API Configurations
    private let tmdbApiKey = "452d84f48c4e43c5a4c7331a7de3954f"
    private let tmdbBaseURL = "https://api.themoviedb.org/3"
    
    private let supabaseURL = "https://ofddaeofptotnxeoxfko.supabase.co"
    private let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZGRhZW9mcHRvdG54ZW94ZmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDk1NDIsImV4cCI6MjEwMDMyNTU0Mn0.Y502Vk2zlev9d4Hbkjt6VniV_xFXjl41YW4EE26wCNc"
    
    // MARK: - FLKRD Protection System Blocklists (Strict Family Safe Mode)
    private let forbiddenContentIDs: Set<Int> = [
        1249764, 1216223, 1184000, 1238968, 574043, 1244301, 1214309, 1205315,
        1184000, 1159844, 1145325, 1131758, 1121087, 1083862, 1177691, 1063877,
        1100099, 1156593, 1167451, 1192534, 1222461, 1226578, 1231063, 1235882,
        1250239, 1256088, 1261494, 1267439, 1272093, 1280311, 1285092, 1290344
    ]
    
    private let forbiddenKeywords: [String] = [
        "porn", "porno", "pornography", "sex", "erotic", "erotica", "lust", "naked", "sexy", "nude", "nudity",
        "explicit", "sensual", "sexual", "hardcore", "softcore", "xxx", "hentai", "stripper", "striptease",
        "ejaculation", "orgasm", "bdsm", "gay porn", "lesbian porn", "fetish", "voyeur", "escort",
        "hot scene", "bikini body", "naked woman", "naked man", "uncensored", "playboy", "penthouse",
        "vivamax", "scandal", "sensuous", "passion play", "intimacy", "seduction", "taboo", "incest",
        "پۆرن", "سێکس", "ئیرۆتیک", "ڕووت", "سێکسی", "ڕووتی", "ڕووتکراو", "سێکسیبوون",
        "بێ پەردە", "کاری سێکسی", "ڕووتکردنەوە", "لەشفرۆش", "داوێنپیسی", "فاحیشە",
        "إباحي", "جنس", "إباحية", "عاري", "سكس", "شهواني", "مثير", "عري", "مكشوف"
    ]
    
    // MARK: - Global Banned Content (Admin Movie Blocking via Supabase)
    var bannedContentIds: Set<String> = {
        if let cached = UserDefaults.standard.stringArray(forKey: "flkrd_banned_content_ids") {
            return Set(cached)
        }
        return Set<String>()
    }() {
        didSet {
            UserDefaults.standard.set(Array(bannedContentIds), forKey: "flkrd_banned_content_ids")
        }
    }
    
    init() {
        if let cached = UserDefaults.standard.stringArray(forKey: "flkrd_banned_content_ids") {
            self.bannedContentIds = Set(cached)
        }
        Task {
            _ = await self.fetchBannedContentIds()
        }
    }
    
    func fetchBannedContentIds(force: Bool = false) async -> Set<String> {
        do {
            let request = try makeSupabaseRequest(path: "banned_content", queryItems: [
                URLQueryItem(name: "select", value: "content_id")
            ])
            let (data, _) = try await URLSession.shared.data(for: request)
            if let json = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                let ids = json.compactMap { $0["content_id"] as? String }
                let combined = self.bannedContentIds.union(ids)
                self.bannedContentIds = combined
                UserDefaults.standard.set(Array(combined), forKey: "flkrd_banned_content_ids")
            }
        } catch {
            print("[BANNED SERVICE] Failed to fetch banned content: \(error)")
        }
        return self.bannedContentIds
    }
    
    func banContent(contentId: String, mediaType: String, title: String? = nil) async throws {
        let cleanId = contentId.replacingOccurrences(of: "custom_", with: "")
        bannedContentIds.insert(contentId)
        bannedContentIds.insert(cleanId)
        bannedContentIds.insert("custom_\(cleanId)")
        UserDefaults.standard.set(Array(bannedContentIds), forKey: "flkrd_banned_content_ids")
        
        let payload: [String: Any] = [
            "content_id": cleanId,
            "media_type": mediaType,
            "title": title ?? ""
        ]
        let body = try JSONSerialization.data(withJSONObject: payload)
        let request = try makeSupabaseRequest(path: "banned_content", method: "POST", body: body)
        _ = try await URLSession.shared.data(for: request)
        NotificationCenter.default.post(name: NSNotification.Name("BannedContentUpdated"), object: nil)
    }
    
    func unbanContent(contentId: String) async throws {
        let cleanId = contentId.replacingOccurrences(of: "custom_", with: "")
        bannedContentIds.remove(contentId)
        bannedContentIds.remove(cleanId)
        bannedContentIds.remove("custom_\(cleanId)")
        UserDefaults.standard.set(Array(bannedContentIds), forKey: "flkrd_banned_content_ids")
        
        let query = [URLQueryItem(name: "content_id", value: "eq.\(cleanId)")]
        let request = try makeSupabaseRequest(path: "banned_content", method: "DELETE", queryItems: query)
        _ = try await URLSession.shared.data(for: request)
        NotificationCenter.default.post(name: NSNotification.Name("BannedContentUpdated"), object: nil)
    }
    
    private var activeLanguageCode: String {
        let lang = UserDefaults.standard.string(forKey: "selected_language") ?? "en"
        return lang == "en" ? "en-US" : "ku"
    }
    
    func isContentAllowed(_ item: MediaItem) -> Bool {
        let idStr = String(item.id)
        if bannedContentIds.contains(idStr) || bannedContentIds.contains("custom_\(idStr)") {
            return false
        }
        if item.adult == true { return false }
        if let gIds = item.genreIds, gIds.contains(10749) { return false }
        
        let titleText = item.computedTitle.lowercased()
        let originalTitle = (item.originalTitle ?? "").lowercased()
        let originalName = (item.originalName ?? "").lowercased()
        let overviewText = (item.overview ?? "").lowercased()
        
        let combined = "\(titleText) \(originalTitle) \(originalName) \(overviewText)"
        
        for word in forbiddenKeywords {
            if combined.contains(word) {
                return false
            }
        }
        return true
    }
    
    func isDubbedMovieAllowed(_ movie: DubbedMovie) -> Bool {
        let cleanId = movie.id.replacingOccurrences(of: "custom_", with: "")
        if bannedContentIds.contains(movie.id) ||
           bannedContentIds.contains(cleanId) ||
           bannedContentIds.contains("custom_\(cleanId)") ||
           (movie.tmdbId != nil && bannedContentIds.contains(String(movie.tmdbId!))) {
            return false
        }
        
        let title = movie.title.lowercased()
        let kurdishTitle = movie.kurdishTitle.lowercased()
        let desc = (movie.description ?? "").lowercased()
        let combined = "\(title) \(kurdishTitle) \(desc)"
        
        for word in forbiddenKeywords {
            if combined.contains(word) {
                return false
            }
        }
        return true
    }

    // MARK: - In-Memory High-Speed Cache
    private var mediaItemCache: [String: (items: [MediaItem], timestamp: Date)] = [:]
    private var dubbedMovieCache: (movies: [DubbedMovie], timestamp: Date)? = nil
    private let cacheQueue = DispatchQueue(label: "com.flkrd.networkCache", attributes: .concurrent)
    
    func getCachedMedia(key: String, maxAge: TimeInterval = 900) -> [MediaItem]? {
        cacheQueue.sync {
            guard let entry = mediaItemCache[key] else { return nil }
            if Date().timeIntervalSince(entry.timestamp) < maxAge {
                return entry.items
            }
            return nil
        }
    }
    
    func setCachedMedia(key: String, items: [MediaItem]) {
        cacheQueue.async(flags: .barrier) {
            self.mediaItemCache[key] = (items: items, timestamp: Date())
        }
    }

    // MARK: - TMDB Services
    
    func fetchTrending(mediaType: String = "all", timeWindow: String = "week", forceRefresh: Bool = false) async throws -> [MediaItem] {
        let cacheKey = "trending_\(mediaType)_\(timeWindow)_\(activeLanguageCode)"
        if !forceRefresh, let cached = getCachedMedia(key: cacheKey) {
            return cached
        }
        
        if bannedContentIds.isEmpty {
            _ = await fetchBannedContentIds()
        }
        let urlString = "\(tmdbBaseURL)/trending/\(mediaType)/\(timeWindow)?api_key=\(tmdbApiKey)&language=\(activeLanguageCode)&without_genres=10749"
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        let response = try JSONDecoder().decode(MovieResponse.self, from: data)
        let filtered = response.results.filter { isContentAllowed($0) }
        setCachedMedia(key: cacheKey, items: filtered)
        return filtered
    }
    
    func fetchDiscover(mediaType: String = "movie", genreId: Int? = nil, companyId: Int? = nil, originCountry: String? = nil, originalLanguage: String? = nil, year: Int? = nil, page: Int = 1, forceRefresh: Bool = false) async throws -> [MediaItem] {
        let cacheKey = "discover_\(mediaType)_\(genreId ?? 0)_\(companyId ?? 0)_\(originCountry ?? "")_\(originalLanguage ?? "")_\(year ?? 0)_\(page)_\(activeLanguageCode)"
        if !forceRefresh, let cached = getCachedMedia(key: cacheKey) {
            return cached
        }
        
        var urlString = "\(tmdbBaseURL)/discover/\(mediaType)?api_key=\(tmdbApiKey)&language=\(activeLanguageCode)&sort_by=popularity.desc&include_adult=false&without_genres=10749&page=\(page)"
        if let gid = genreId {
            urlString += "&with_genres=\(gid)"
            if gid == 10749 { return [] } // Hard blocks pure Romance genre ID 10749
        }
        if let cid = companyId {
            urlString += "&with_companies=\(cid)"
        }
        if let country = originCountry, !country.isEmpty {
            urlString += "&with_origin_country=\(country)"
        }
        if let lang = originalLanguage, !lang.isEmpty {
            urlString += "&with_original_language=\(lang)"
        }
        if let yr = year, yr > 1900 {
            if mediaType == "tv" {
                urlString += "&first_air_date_year=\(yr)"
            } else {
                urlString += "&primary_release_year=\(yr)"
            }
        }
        
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        let (data, _) = try await URLSession.shared.data(from: url)
        let response = try JSONDecoder().decode(MovieResponse.self, from: data)
        let filtered = response.results.filter { isContentAllowed($0) }
        setCachedMedia(key: cacheKey, items: filtered)
        return filtered
    }
    
    func fetchSearch(query: String) async throws -> [MediaItem] {
        let cacheKey = "search_\(query.lowercased())_\(activeLanguageCode)"
        if let cached = getCachedMedia(key: cacheKey, maxAge: 300) {
            return cached
        }
        
        guard let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else { return [] }
        let urlString = "\(tmdbBaseURL)/search/multi?api_key=\(tmdbApiKey)&language=\(activeLanguageCode)&query=\(encodedQuery)&include_adult=false"
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        let response = try JSONDecoder().decode(MovieResponse.self, from: data)
        let filtered = response.results.filter { isContentAllowed($0) }
        setCachedMedia(key: cacheKey, items: filtered)
        return filtered
    }
    
    func fetchCredits(mediaType: String, id: Int) async throws -> [CastMember] {
        let path = mediaType == "tv" ? "tv" : "movie"
        let urlString = "\(tmdbBaseURL)/\(path)/\(id)/credits?api_key=\(tmdbApiKey)&language=en-US"
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        let response = try JSONDecoder().decode(CreditResponse.self, from: data)
        return response.cast
    }
    
    func fetchTVDetails(id: Int) async throws -> TVDetails {
        let urlString = "\(tmdbBaseURL)/tv/\(id)?api_key=\(tmdbApiKey)&language=en-US"
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(TVDetails.self, from: data)
    }
    
    func fetchSeasonDetails(tvId: Int, seasonNumber: Int) async throws -> [Episode] {
        let urlString = "\(tmdbBaseURL)/tv/\(tvId)/season/\(seasonNumber)?api_key=\(tmdbApiKey)&language=en-US"
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        let response = try JSONDecoder().decode(SeasonDetailsResponse.self, from: data)
        return response.episodes
    }
    
    // MARK: - TMDB Movie Details Autocomplete API
    func fetchTMDBMovieDetails(id: Int) async throws -> MediaItem {
        let urlString = "\(tmdbBaseURL)/movie/\(id)?api_key=\(tmdbApiKey)&language=en-US"
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(MediaItem.self, from: data)
    }
    
    func fetchTMDBMovieExternalIds(id: Int, mediaType: String = "movie") async throws -> String? {
        let typePath = (mediaType == "tv") ? "tv" : "movie"
        let urlString = "\(tmdbBaseURL)/\(typePath)/\(id)/external_ids?api_key=\(tmdbApiKey)"
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let imdbId = json["imdb_id"] as? String, !imdbId.isEmpty {
            return imdbId
        }
        return nil
    }
    
    // MARK: - Supabase API Calls (Rest API)
    
    private func makeSupabaseRequest(path: String, method: String = "GET", body: Data? = nil, queryItems: [URLQueryItem]? = nil) throws -> URLRequest {
        var urlComponents = URLComponents(string: "\(supabaseURL)/rest/v1/\(path)")
        if let qi = queryItems {
            urlComponents?.queryItems = qi
        }
        guard let url = urlComponents?.url else { throw URLError(.badURL) }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=representation", forHTTPHeaderField: "Prefer")
        request.httpBody = body
        return request
    }
    
    // 1. Fetch Dubbed Movies from Supabase Backend (Optimized Real-Time Stream + In-Memory Cache)
    func fetchDubbedMovies(forceRefresh: Bool = false) async throws -> [DubbedMovie] {
        if !forceRefresh, let cached = dubbedMovieCache, Date().timeIntervalSince(cached.timestamp) < 600 {
            return cached.movies
        }
        
        let request = try makeSupabaseRequest(path: "dubbed_movies", queryItems: [
            URLQueryItem(name: "select", value: "id,title,kurdishTitle,description,videoUrl,imageBase64,created_at,level,media_type,imdb_id,tmdb_id"),
            URLQueryItem(name: "order", value: "created_at.desc"),
            URLQueryItem(name: "limit", value: "80")
        ])
        
        let (data, response) = try await URLSession.shared.data(for: request)
        if let httpResp = response as? HTTPURLResponse, !(200...299).contains(httpResp.statusCode) {
            let errStr = String(data: data, encoding: .utf8) ?? "HTTP \(httpResp.statusCode)"
            throw NSError(domain: "SupabaseError", code: httpResp.statusCode, userInfo: [NSLocalizedDescriptionKey: errStr])
        }
        let movies = try JSONDecoder().decode([DubbedMovie].self, from: data)
        let filtered = movies.filter { isDubbedMovieAllowed($0) }
        dubbedMovieCache = (movies: filtered, timestamp: Date())
        return filtered
    }
    
    // 1e. Fetch Single Dubbed Movie (including bannerBase64)
    func fetchSingleDubbedMovie(id: String) async throws -> DubbedMovie? {
        let cleanId = id.replacingOccurrences(of: "custom_", with: "")
        let request = try makeSupabaseRequest(path: "dubbed_movies", queryItems: [
            URLQueryItem(name: "select", value: "*"),
            URLQueryItem(name: "id", value: "eq.\(cleanId)"),
            URLQueryItem(name: "limit", value: "1")
        ])
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let movies = try JSONDecoder().decode([DubbedMovie].self, from: data)
        return movies.first
    }
    
    // 1b. Insert Dubbed Movie
    func insertDubbedMovie(
        title: String,
        description: String,
        videoUrl: String,
        imageBase64: String,
        bannerBase64: String?,
        level: String,
        imdbId: String?,
        tmdbId: Int?
    ) async throws -> DubbedMovie {
        var payload: [String: Any] = [
            "title": title,
            "description": description.isEmpty ? "No description provided." : description,
            "videoUrl": videoUrl,
            "imageBase64": imageBase64,
            "level": level
        ]
        
        if let banner = bannerBase64, !banner.isEmpty {
            payload["bannerBase64"] = banner
        }
        if let imdb = imdbId, !imdb.isEmpty {
            payload["imdb_id"] = imdb
        }
        if let tmdb = tmdbId {
            payload["tmdb_id"] = tmdb
        }
        
        let bodyData = try JSONSerialization.data(withJSONObject: payload)
        let request = try makeSupabaseRequest(path: "dubbed_movies", method: "POST", body: bodyData)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        if let httpResponse = response as? HTTPURLResponse, !(200...299).contains(httpResponse.statusCode) {
            let errorStr = String(data: data, encoding: .utf8) ?? "Unknown DB error"
            throw NSError(domain: "SupabaseError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: errorStr])
        }
        
        let movies = try JSONDecoder().decode([DubbedMovie].self, from: data)
        guard let first = movies.first else { throw URLError(.cannotParseResponse) }
        return first
    }
    
    // 1c. Update Dubbed Movie
    func updateDubbedMovie(
        id: String,
        title: String,
        description: String,
        videoUrl: String,
        imageBase64: String,
        bannerBase64: String?,
        level: String,
        imdbId: String?,
        tmdbId: Int?
    ) async throws {
        var payload: [String: Any?] = [
            "title": title,
            "description": description,
            "videoUrl": videoUrl,
            "imageBase64": imageBase64,
            "level": level,
            "imdb_id": (imdbId != nil && !imdbId!.isEmpty) ? imdbId : nil,
            "tmdb_id": tmdbId
        ]
        
        if let banner = bannerBase64, !banner.isEmpty {
            payload["bannerBase64"] = banner
        } else {
            payload["bannerBase64"] = nil
        }
        
        let cleanId = id.replacingOccurrences(of: "custom_", with: "")
        
        let bodyData = try JSONSerialization.data(withJSONObject: payload)
        let request = try makeSupabaseRequest(
            path: "dubbed_movies",
            method: "PATCH",
            body: bodyData,
            queryItems: [URLQueryItem(name: "id", value: "eq.\(cleanId)")]
        )
        
        let (data, response) = try await URLSession.shared.data(for: request)
        if let httpResponse = response as? HTTPURLResponse, !(200...299).contains(httpResponse.statusCode) {
            let errorStr = String(data: data, encoding: .utf8) ?? "Unknown DB error"
            throw NSError(domain: "SupabaseError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: errorStr])
        }
    }
    
    // 1d. Delete Dubbed Movie (RPC first, fallback to direct delete)
    func deleteDubbedMovie(id: String) async throws {
        let cleanId = id.replacingOccurrences(of: "custom_", with: "")
        let numericId = Int(cleanId) ?? 0
        
        // Instantly mark as banned locally and in Supabase banned_content
        bannedContentIds.insert(id)
        bannedContentIds.insert(cleanId)
        bannedContentIds.insert("custom_\(cleanId)")
        UserDefaults.standard.set(Array(bannedContentIds), forKey: "flkrd_banned_content_ids")
        
        try? await banContent(contentId: cleanId, mediaType: "dubbed", title: nil)
        
        // Try RPC first
        do {
            let rpcPayload: [String: Any] = ["target_id": numericId]
            let rpcBody = try JSONSerialization.data(withJSONObject: rpcPayload)
            let rpcRequest = try makeSupabaseRequest(path: "rpc/delete_dubbed_movie", method: "POST", body: rpcBody)
            
            let (data, response) = try await URLSession.shared.data(for: rpcRequest)
            if let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) {
                print("Deleted successfully via RPC")
                NotificationCenter.default.post(name: NSNotification.Name("DubbedMoviesUpdated"), object: nil)
                NotificationCenter.default.post(name: NSNotification.Name("BannedContentUpdated"), object: nil)
                return
            } else {
                let errorStr = String(data: data, encoding: .utf8) ?? ""
                print("RPC delete failed or was not found: \(errorStr). Falling back to direct table deletion...")
            }
        } catch {
            print("RPC delete exception: \(error). Falling back to direct table deletion...")
        }
        
        // Fallback: Direct Table DELETE
        let directRequest = try makeSupabaseRequest(
            path: "dubbed_movies",
            method: "DELETE",
            queryItems: [URLQueryItem(name: "id", value: "eq.\(cleanId)")]
        )
        
        let (data, response) = try await URLSession.shared.data(for: directRequest)
        if let httpResponse = response as? HTTPURLResponse, !(200...299).contains(httpResponse.statusCode) {
            let errorStr = String(data: data, encoding: .utf8) ?? "Unknown DB error"
            throw NSError(domain: "SupabaseError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: errorStr])
        }
        
        NotificationCenter.default.post(name: NSNotification.Name("DubbedMoviesUpdated"), object: nil)
        NotificationCenter.default.post(name: NSNotification.Name("BannedContentUpdated"), object: nil)
    }
    
    // 2. CoWatch Ticket: Create
    func createWatchTicket(movieId: String, hostId: String, pinCode: String) async throws -> WatchTicket {
        let payload: [String: String] = [
            "movie_id": movieId,
            "host_id": hostId,
            "pin_code": pinCode,
            "status": "waiting"
        ]
        let bodyData = try JSONSerialization.data(withJSONObject: payload)
        let request = try makeSupabaseRequest(path: "watch_tickets", method: "POST", body: bodyData)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let tickets = try JSONDecoder().decode([WatchTicket].self, from: data)
        guard let first = tickets.first else { throw URLError(.cannotParseResponse) }
        return first
    }
    
    // 3. CoWatch Ticket: Join (by Pin Code)
    func joinWatchTicket(pinCode: String, guestId: String) async throws -> WatchTicket? {
        let queryItems = [
            URLQueryItem(name: "pin_code", value: "eq.\(pinCode)"),
            URLQueryItem(name: "status", value: "eq.waiting"),
            URLQueryItem(name: "limit", value: "1")
        ]
        let selectReq = try makeSupabaseRequest(path: "watch_tickets", queryItems: queryItems)
        let (data, _) = try await URLSession.shared.data(for: selectReq)
        let tickets = try JSONDecoder().decode([WatchTicket].self, from: data)
        
        guard let ticket = tickets.first else { return nil }
        
        // Update ticket with guest ID
        let updatePayload: [String: String] = [
            "guest_id": guestId,
            "status": "active"
        ]
        let bodyData = try JSONSerialization.data(withJSONObject: updatePayload)
        
        let patchQuery = [URLQueryItem(name: "id", value: "eq.\(ticket.id)")]
        let updateReq = try makeSupabaseRequest(path: "watch_tickets", method: "PATCH", body: bodyData, queryItems: patchQuery)
        
        let (updatedData, _) = try await URLSession.shared.data(for: updateReq)
        let updatedTickets = try JSONDecoder().decode([WatchTicket].self, from: updatedData)
        return updatedTickets.first
    }
    
    // 4. Ticket Status check
    func fetchTicket(ticketId: String) async throws -> WatchTicket? {
        let query = [URLQueryItem(name: "id", value: "eq.\(ticketId)")]
        let request = try makeSupabaseRequest(path: "watch_tickets", queryItems: query)
        let (data, _) = try await URLSession.shared.data(for: request)
        let tickets = try JSONDecoder().decode([WatchTicket].self, from: data)
        return tickets.first
    }
    
    // 5. Update Ticket Status
    func updateTicketStatus(ticketId: String, status: String) async throws {
        let payload = ["status": status]
        let body = try JSONSerialization.data(withJSONObject: payload)
        let query = [URLQueryItem(name: "id", value: "eq.\(ticketId)")]
        let request = try makeSupabaseRequest(path: "watch_tickets", method: "PATCH", body: body, queryItems: query)
        _ = try await URLSession.shared.data(for: request)
    }
    
    // 6. Fetch Room Messages
    func fetchRoomMessages(ticketId: String) async throws -> [RoomMessage] {
        let query = [
            URLQueryItem(name: "ticket_id", value: "eq.\(ticketId)"),
            URLQueryItem(name: "order", value: "created_at.asc")
        ]
        let request = try makeSupabaseRequest(path: "room_messages", queryItems: query)
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode([RoomMessage].self, from: data)
    }
    
    // 7. Send Room Message
    func sendRoomMessage(ticketId: String, userId: String, message: String) async throws -> RoomMessage {
        let payload: [String: String] = [
            "ticket_id": ticketId,
            "user_id": userId,
            "message": message
        ]
        let body = try JSONSerialization.data(withJSONObject: payload)
        let request = try makeSupabaseRequest(path: "room_messages", method: "POST", body: body)
        let (data, _) = try await URLSession.shared.data(for: request)
        let msgs = try JSONDecoder().decode([RoomMessage].self, from: data)
        guard let first = msgs.first else { throw URLError(.cannotParseResponse) }
        return first
    }
    
    // 8. Fetch Server Configs for Liquid Glass Settings
    func fetchServerConfigs() async throws -> [ServerConfigRow] {
        let request = try makeSupabaseRequest(path: "server_config", queryItems: [
            URLQueryItem(name: "select", value: "*")
        ])
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode([ServerConfigRow].self, from: data)
    }
    
    // 9. Upsert Server Configs for Liquid Glass Settings
    func upsertServerConfigs(_ rows: [[String: Any]]) async throws {
        let bodyData = try JSONSerialization.data(withJSONObject: rows)
        var request = try makeSupabaseRequest(path: "server_config", method: "POST", body: bodyData)
        request.setValue("resolution=merge-duplicates,return=representation", forHTTPHeaderField: "Prefer")
        let (data, response) = try await URLSession.shared.data(for: request)
        if let httpResponse = response as? HTTPURLResponse, !(200...299).contains(httpResponse.statusCode) {
            let errorStr = String(data: data, encoding: .utf8) ?? "Unknown DB error"
            throw NSError(domain: "SupabaseError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: errorStr])
        }
    }
    
    // MARK: - 10. Kurdish High-Performance AI Translation System
    private let gasEndpoints = [
        "https://script.google.com/macros/s/AKfycbzt-Bus8kvLiywcXX16pnPLbvcbAGSf7euGm3hw0pB4xbrb7CzlddQspR1pLg22MRbCSQ/exec",
        "https://script.google.com/macros/s/AKfycbyt0rFOvzrUCYcczcR2fBVvG0aRYgajFr55FHv3-qHZkeN0O54_UtMfZPOz3SUpsqtzXg/exec",
        "https://script.google.com/macros/s/AKfycbzCTsm3ez5RPANs8NbrGRZxeWN1XNGUy8IBM1wie_zDEygekQoY6GXvuJu7oyFxW48v8w/exec"
    ]
    
    func translateWithGoogleAppsScript(text: String, source: String = "auto", target: String = "ckb") async -> String {
        let list = await batchTranslate(texts: [text], source: source, target: target)
        return list.first ?? text
    }
    
    func batchTranslate(texts: [String], source: String = "auto", target: String = "ckb") async -> [String] {
        guard !texts.isEmpty else { return [] }
        let targetLang = (target == "ku" || target == "ckb" || target == "sorani") ? "ckb" : (target == "badini" ? "ku" : target)
        let isBadini = (target == "badini" || target == "kmr")
        
        // 1. Direct High-Speed Google GTX Batch Translation with Clean Delimiters
        let joinedText = texts.joined(separator: "\n")
        if let encoded = joinedText.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
           let gtxUrl = URL(string: "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=\(targetLang)&dt=t&q=\(encoded)") {
            var req = URLRequest(url: gtxUrl)
            req.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", forHTTPHeaderField: "User-Agent")
            req.timeoutInterval = 4.0
            if let (data, _) = try? await URLSession.shared.data(for: req),
               let json = try? JSONSerialization.jsonObject(with: data) as? [Any],
               let parts = json.first as? [[Any]] {
                let fullTranslated = parts.compactMap { $0.first as? String }.joined()
                let splitLines = fullTranslated.components(separatedBy: "\n")
                if splitLines.count == texts.count {
                    return splitLines.map { self.polishKurdish($0, isBadini: isBadini) }
                }
            }
        }
        
        // 2. Try FKURD Fast Translation Proxy
        if let url = URL(string: "https://fkurd.pro/api/translate") {
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            let payload: [String: Any] = ["text": texts, "source": source, "target": targetLang]
            if let body = try? JSONSerialization.data(withJSONObject: payload) {
                req.httpBody = body
                req.timeoutInterval = 3.5
                if let (data, response) = try? await URLSession.shared.data(for: req),
                   let httpResp = response as? HTTPURLResponse, (200...299).contains(httpResp.statusCode) {
                    if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let transList = json["translation"] as? [String], transList.count == texts.count {
                        return transList.map { self.polishKurdish($0, isBadini: isBadini) }
                    }
                }
            }
        }
        
        // 3. Fallback: Google Apps Script Endpoints
        for gasUrlString in gasEndpoints {
            guard let gasUrl = URL(string: gasUrlString) else { continue }
            var req = URLRequest(url: gasUrl)
            req.httpMethod = "POST"
            req.setValue("text/plain;charset=utf-8", forHTTPHeaderField: "Content-Type")
            let payload: [String: Any] = ["text": texts, "source": source, "target": targetLang]
            if let body = try? JSONSerialization.data(withJSONObject: payload) {
                req.httpBody = body
                req.timeoutInterval = 3.5
                if let (data, response) = try? await URLSession.shared.data(for: req),
                   let httpResp = response as? HTTPURLResponse, (200...299).contains(httpResp.statusCode) {
                    if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let transList = json["translation"] as? [String], transList.count == texts.count {
                        return transList.map { self.polishKurdish($0, isBadini: isBadini) }
                    }
                }
            }
        }
        
        // 4. Ultimate Guaranteed Concurrent Per-Line Translation (Never drops or skips any cue)
        var individualResults: [String] = Array(repeating: "", count: texts.count)
        await withTaskGroup(of: (Int, String).self) { singleGroup in
            for (idx, text) in texts.enumerated() {
                singleGroup.addTask {
                    let single = await self.translateSingleGTX(text: text, target: targetLang)
                    return (idx, self.polishKurdish(single, isBadini: isBadini))
                }
            }
            for await (idx, res) in singleGroup {
                individualResults[idx] = res
            }
        }
        return individualResults
    }
    
    private func translateSingleGTX(text: String, target: String) async -> String {
        let clean = cleanSubtitleText(text)
        guard !clean.isEmpty else { return text }
        guard let encoded = clean.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=\(target)&dt=t&q=\(encoded)") else {
            return text
        }
        var req = URLRequest(url: url)
        req.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", forHTTPHeaderField: "User-Agent")
        req.timeoutInterval = 3.0
        if let (data, _) = try? await URLSession.shared.data(for: req),
           let json = try? JSONSerialization.jsonObject(with: data) as? [Any],
           let parts = json.first as? [[Any]] {
            let combined = parts.compactMap { $0.first as? String }.joined()
            return combined.isEmpty ? text : combined
        }
        return text
    }
    
    func cleanSubtitleText(_ text: String) -> String {
        var str = text
        // Strip HTML tags like <i>, </i>, <b>, </b>, <u>, </u>, <font...>, etc.
        str = str.replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
        // Strip ASS/SSA style tags like {\an8}, {\pos(1,2)}, etc.
        str = str.replacingOccurrences(of: "\\{\\\\[^}]*\\}", with: "", options: .regularExpression)
        // Decode HTML entities
        str = str.replacingOccurrences(of: "&amp;", with: "&")
        str = str.replacingOccurrences(of: "&quot;", with: "\"")
        str = str.replacingOccurrences(of: "&#39;", with: "'")
        str = str.replacingOccurrences(of: "&lt;", with: "<")
        str = str.replacingOccurrences(of: "&gt;", with: ">")
        str = str.replacingOccurrences(of: "&nbsp;", with: " ")
        // Strip zero-width & directional isolate characters
        str = str.replacingOccurrences(of: "\u{FEFF}", with: "")
        str = str.replacingOccurrences(of: "\u{200E}", with: "")
        str = str.replacingOccurrences(of: "\u{200F}", with: "")
        str = str.replacingOccurrences(of: "\u{202A}", with: "")
        str = str.replacingOccurrences(of: "\u{202B}", with: "")
        str = str.replacingOccurrences(of: "\u{202C}", with: "")
        str = str.replacingOccurrences(of: "\u{202D}", with: "")
        str = str.replacingOccurrences(of: "\u{202E}", with: "")
        // Clean double spaces
        str = str.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
        return str.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    
    func translateCuesProgressive(
        cues: [SubtitleCue],
        targetLang: String,
        onProgress: @escaping (Double, [SubtitleCue]) -> Void
    ) async -> [SubtitleCue] {
        guard !cues.isEmpty else { return cues }
        var resultCues = cues
        let chunkSize = 25
        let totalCount = cues.count
        
        // Prepare chunk ranges
        var ranges: [(startIndex: Int, endIndex: Int, texts: [String])] = []
        for startIndex in stride(from: 0, to: totalCount, by: chunkSize) {
            let endIndex = min(startIndex + chunkSize, totalCount)
            let chunkTexts = cues[startIndex..<endIndex].map { cleanSubtitleText($0.text) }
            ranges.append((startIndex: startIndex, endIndex: endIndex, texts: chunkTexts))
        }
        
        var completedCount = 0
        let concurrency = 4
        
        for batchSlice in ranges.chunked(into: concurrency) {
            await withTaskGroup(of: (Int, Int, [String]).self) { group in
                for r in batchSlice {
                    group.addTask {
                        let translated = await self.batchTranslate(texts: r.texts, target: targetLang)
                        return (r.startIndex, r.endIndex, translated)
                    }
                }
                
                for await (sIdx, eIdx, transList) in group {
                    for (i, transText) in transList.enumerated() {
                        let cueIdx = sIdx + i
                        if cueIdx < resultCues.count {
                            resultCues[cueIdx] = SubtitleCue(
                                start: cues[cueIdx].start,
                                end: cues[cueIdx].end,
                                text: transText
                            )
                        }
                    }
                    completedCount += (eIdx - sIdx)
                    let progress = min(1.0, Double(completedCount) / Double(totalCount))
                    onProgress(progress, resultCues)
                }
            }
        }
        
        var finalCues = resultCues
        
        // Inject Custom Kurdish Intro & Outro Brand Cues
        if targetLang == "ckb" || targetLang == "ku" || targetLang == "badini" {
            let introCue = SubtitleCue(
                start: 3.0,
                end: 9.5,
                text: "ژێرنووسکراوە لەلایەن: زانا فاروق\nPowered by FLKRD Studio • zana.fkurd.pro"
            )
            let lastEnd = finalCues.last?.end ?? 120.0
            let outroCue = SubtitleCue(
                start: lastEnd + 1.0,
                end: lastEnd + 14.0,
                text: "سوپاس بۆ سەیرکردنی ئەم بەرهەمە لە FLKRD MOVIES\nبۆ هەر پرسیار یان کێشەیەک لە ژێرنووس: zana.fkurd.pro"
            )
            finalCues.insert(introCue, at: 0)
            finalCues.append(outroCue)
        }
        
        return finalCues
    }
    
    private func polishKurdish(_ text: String, isBadini: Bool = false) -> String {
        var str = cleanSubtitleText(text)
        
        // 1. Natural Kurdish Grammar & Colloquial Enhancements (Sorani & Badini)
        let replacements: [(String, String)] = [
            ("دۆزینەوە فیلم", "ئەم فیلمە بدۆزەرەوە"),
            ("تەماشاکردن فیلم", "سەیرکردنی ئەم فیلمە"),
            ("دۆزینەوەی فیلم", "دۆزینەوەی ئەم فیلمە"),
            ("تەماشای فیلم بکە", "تەماشای ئەم فیلمە بکە"),
            ("سەیری فیلم بکە", "سەیری ئەم فیلمە بکە"),
            ("ئەوان بوون", "ئەوان بوون"),
            ("ئەوە باشە بۆ", "ئەوە گونجاوە بۆ"),
            ("سوپاس بۆ تۆ", "سوپاس بۆ تۆ"),
            ("من دەڕۆم بۆ", "دەچم بۆ"),
            ("من دەمەوێت", "دەمەوێت"),
            ("ئەو وتی", "گوتی"),
            ("تكایە", "تکایە"),
            ("ئيستا", "ئێستا"),
            ("ئيمە", "ئێمە"),
            ("ئيوە", "ئێوە"),
            ("ليكۆڵینەوە", "لێکۆڵینەوە"),
            ("پێكەوە", "پێکەوە"),
            ("؟ ?", "؟"),
            (" ?", "؟"),
            ("? ", "؟ "),
            ("  ", " ")
        ]
        
        for (pattern, replacement) in replacements {
            str = str.replacingOccurrences(of: pattern, with: replacement)
        }
        
        if isBadini {
            let badiniReplacements: [(String, String)] = [
                ("هاوڕێ", "هەڤال"),
                ("هاوڕێم", "هەڤالێ من"),
                ("دەمەوێت", "دڤێت"),
                ("دەچم", "دێ چم"),
                ("ئێمە", "ئەم"),
                ("ئێوە", "هوین"),
                ("ئەمە", "ئەڤە"),
                ("ئەم فیلمە", "ئەڤ فیلمە"),
                ("سوپاس", "سوپاس"),
                ("بەڵێ", "بەلێ"),
                ("نەخێر", "نەخێر"),
                ("باشە", "باشە"),
                ("چۆنی", "چەوانی"),
                ("تەماشابکە", "سەحکێ"),
                ("بزانە", "بزانە")
            ]
            for (p, r) in badiniReplacements {
                str = str.replacingOccurrences(of: p, with: r)
            }
        }
        
        return str.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    
    // MARK: - 11. Fetch Extra Discovery Categories (Multi-Page Rich Feeds)
    func fetchTop10Today(mediaType: String = "movie") async -> [MediaItem] {
        let items = (try? await fetchTrending(mediaType: mediaType, timeWindow: "day")) ?? []
        return Array(items.prefix(10))
    }
    
    func fetchCategoryMovies(genreId: Int, year: Int? = nil, pages: Int = 3) async -> [MediaItem] {
        await withTaskGroup(of: (Int, [MediaItem]).self) { group in
            for p in 1...pages {
                group.addTask {
                    let items = (try? await self.fetchDiscover(mediaType: "movie", genreId: genreId, year: year, page: p)) ?? []
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
    
    // MARK: - 12. Multi-Engine Subtitle Search & Retrieval (Stremio + OpenSubtitles + FKURD Proxy)
    private let openSubtitlesKeys = [
        "N1Hq6LTYcC9cLTjzcHttVkbyJGQ78flM",
        "u0BJ2jQuKUc2I9VoF05coihDWVxPSCE",
        "rtE5fiHBZkNXtQBEOjvfTewIAn7h3uvG",
        "R8BV8NgnEluM08prbj5IofSk5GdqYrox",
        "ncslNiOTz4Te942T9jWSFSwncDOiinUq"
    ]
    
    func searchAllSubtitles(tmdbId: Int, mediaType: String, seasonNumber: Int? = nil, episodeNumber: Int? = nil, queryTitle: String? = nil, year: Int? = nil) async -> [OpenSubtitleTrack] {
        var aggregatedTracks: [OpenSubtitleTrack] = []
        var seenKeys = Set<String>()
        
        // Step 1: Auto-resolve IMDb ID from TMDB for Movie or TV series
        let imdbId = try? await fetchTMDBMovieExternalIds(id: tmdbId, mediaType: mediaType)
        let isTv = (mediaType == "tv")
        
        // --- Source A: FKURD PRO High-Performance Aggregated Subtitle API ---
        let cleanTitleParam = queryTitle?.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let fkurdQuery = "https://fkurd.pro/api/subtitle?tmdb_id=\(tmdbId)&type=\(isTv ? "tv" : "movie")\(imdbId != nil ? "&imdb_id=\(imdbId!)" : "")\(seasonNumber != nil ? "&season_number=\(seasonNumber!)" : "")\(episodeNumber != nil ? "&episode_number=\(episodeNumber!)" : "")\(!cleanTitleParam.isEmpty ? "&title=\(cleanTitleParam)" : "")&languages=all"
        if let fkurdUrl = URL(string: fkurdQuery) {
            var request = URLRequest(url: fkurdUrl)
            request.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", forHTTPHeaderField: "User-Agent")
            request.timeoutInterval = 4.5
            
            if let (data, response) = try? await URLSession.shared.data(for: request),
               let httpResp = response as? HTTPURLResponse, (200...299).contains(httpResp.statusCode) {
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let list = json["data"] as? [[String: Any]] {
                    for item in list {
                        let attrs = item["attributes"] as? [String: Any] ?? [:]
                        let langCode = (attrs["language"] as? String ?? "en").lowercased()
                        let isKurd = (langCode == "ku" || langCode == "ckb" || langCode == "kur" || langCode.contains("kurd"))
                        let displayName = attrs["display_name"] as? String ?? attrs["release"] as? String ?? "\(langCode.uppercased()) Subtitle (FKURD)"
                        let directUrl = attrs["url"] as? String
                        
                        var fileId = attrs["file_id"] as? Int ?? 0
                        if fileId == 0, let files = attrs["files"] as? [[String: Any]], let firstFile = files.first {
                            fileId = firstFile["file_id"] as? Int ?? 0
                        }
                        
                        let trackId = fileId > 0 ? fileId : (item["id"] as? Int ?? Int.random(in: 1000000...9999999))
                        let key = "\(langCode)_\(displayName)"
                        if !seenKeys.contains(key) {
                            seenKeys.insert(key)
                            let langTitle = isKurd ? "کوردی (سۆرانی / بادینی)" : (langCode == "en" ? "English" : (langCode == "ar" ? "العربية" : langCode.uppercased()))
                            aggregatedTracks.append(OpenSubtitleTrack(
                                id: trackId,
                                language: langTitle,
                                languageCode: langCode,
                                releaseName: displayName,
                                isKurdish: isKurd,
                                directUrl: directUrl,
                                sourceName: isKurd ? "Kurdish CC" : "FKURD Registry"
                            ))
                        }
                    }
                }
            }
        }
        
        // --- Source B: Stremio OpenSubtitles v3 Addon ---
        if let cleanImdb = imdbId, cleanImdb.starts(with: "tt") {
            let stremioPath = (isTv && seasonNumber != nil && episodeNumber != nil) ? "\(cleanImdb):\(seasonNumber!):\(episodeNumber!)" : cleanImdb
            let stremioUrlStr = "https://opensubtitles-v3.strem.io/subtitles/\(isTv ? "series" : "movie")/\(stremioPath).json"
            if let stremioUrl = URL(string: stremioUrlStr) {
                var request = URLRequest(url: stremioUrl)
                request.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", forHTTPHeaderField: "User-Agent")
                request.timeoutInterval = 4.0
                
                if let (data, response) = try? await URLSession.shared.data(for: request),
                   let httpResp = response as? HTTPURLResponse, (200...299).contains(httpResp.statusCode) {
                    if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let subList = json["subtitles"] as? [[String: Any]] {
                        for sub in subList {
                            let langCode = (sub["lang"] as? String ?? "en").lowercased()
                            let urlStr = sub["url"] as? String
                            let name = sub["name"] as? String ?? "\(langCode.uppercased()) Subtitle (Stremio)"
                            let isKurd = (langCode == "ku" || langCode == "ckb" || langCode == "kur")
                            
                            let key = "\(langCode)_\(name)"
                            if !seenKeys.contains(key) {
                                seenKeys.insert(key)
                                let langTitle = isKurd ? "کوردی (Stremio CC)" : (langCode == "en" ? "English (Stremio)" : (langCode == "ar" ? "العربية (Stremio)" : "\(langCode.uppercased()) (Stremio)"))
                                aggregatedTracks.append(OpenSubtitleTrack(
                                    id: Int.random(in: 1000000...9999999),
                                    language: langTitle,
                                    languageCode: langCode,
                                    releaseName: name,
                                    isKurdish: isKurd,
                                    directUrl: urlStr,
                                    sourceName: "Stremio"
                                ))
                            }
                        }
                    }
                }
            }
        }
        
        // --- Source C: Direct OpenSubtitles API with Key Rotation ---
        if aggregatedTracks.isEmpty {
            for key in openSubtitlesKeys {
                var openSubUrlStr = ""
                if let imdb = imdbId, !imdb.isEmpty {
                    let cleanId = imdb.replacingOccurrences(of: "tt", with: "")
                    openSubUrlStr = "https://api.opensubtitles.com/api/v1/subtitles?imdb_id=\(cleanId)&type=\(isTv ? "episode" : "movie")\(seasonNumber != nil ? "&season_number=\(seasonNumber!)" : "")\(episodeNumber != nil ? "&episode_number=\(episodeNumber!)" : "")"
                } else {
                    openSubUrlStr = "https://api.opensubtitles.com/api/v1/subtitles?tmdb_id=\(tmdbId)&type=\(isTv ? "episode" : "movie")\(seasonNumber != nil ? "&season_number=\(seasonNumber!)" : "")\(episodeNumber != nil ? "&episode_number=\(episodeNumber!)" : "")"
                }
                
                guard let openSubUrl = URL(string: openSubUrlStr) else { continue }
                
                var request = URLRequest(url: openSubUrl)
                request.setValue(key, forHTTPHeaderField: "Api-Key")
                request.setValue("application/json", forHTTPHeaderField: "Accept")
                request.setValue("FLKRD_Streaming_App_v1.0.0", forHTTPHeaderField: "User-Agent")
                request.timeoutInterval = 4.0
                
                if let (data, response) = try? await URLSession.shared.data(for: request),
                   let httpResp = response as? HTTPURLResponse, (200...299).contains(httpResp.statusCode) {
                    if let decoded = try? JSONDecoder().decode(OpenSubtitlesSearchResult.self, from: data),
                       let list = decoded.data {
                        for item in list {
                            guard let attr = item.attributes, let files = attr.files, let firstFile = files.first, let fileId = firstFile.file_id else { continue }
                            let langCode = (attr.language ?? "en").lowercased()
                            let isKurd = (langCode == "ckb" || langCode == "ku")
                            let rel = attr.release ?? firstFile.file_name ?? "Standard Subtitle Track"
                            let key = "\(langCode)_\(rel)"
                            if !seenKeys.contains(key) {
                                seenKeys.insert(key)
                                aggregatedTracks.append(OpenSubtitleTrack(
                                    id: fileId,
                                    language: isKurd ? "کوردی (OpenSubtitles)" : (langCode == "en" ? "English" : langCode.uppercased()),
                                    languageCode: langCode,
                                    releaseName: rel,
                                    isKurdish: isKurd,
                                    directUrl: nil,
                                    sourceName: "OpenSubtitles"
                                ))
                            }
                        }
                        if !aggregatedTracks.isEmpty { break }
                    }
                }
            }
        }
        
        // --- Source D: Search by Title & Year Fallback (For rare foreign titles) ---
        if aggregatedTracks.isEmpty, let qTitle = queryTitle, !qTitle.isEmpty {
            if let enc = qTitle.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
                for key in openSubtitlesKeys {
                    let searchUrlStr = "https://api.opensubtitles.com/api/v1/subtitles?query=\(enc)\(year != nil ? "&year=\(year!)" : "")&type=\(isTv ? "episode" : "movie")"
                    guard let searchUrl = URL(string: searchUrlStr) else { continue }
                    var request = URLRequest(url: searchUrl)
                    request.setValue(key, forHTTPHeaderField: "Api-Key")
                    request.setValue("application/json", forHTTPHeaderField: "Accept")
                    request.setValue("FLKRD_Streaming_App_v1.0.0", forHTTPHeaderField: "User-Agent")
                    request.timeoutInterval = 4.0
                    
                    if let (data, response) = try? await URLSession.shared.data(for: request),
                       let httpResp = response as? HTTPURLResponse, (200...299).contains(httpResp.statusCode) {
                        if let decoded = try? JSONDecoder().decode(OpenSubtitlesSearchResult.self, from: data),
                           let list = decoded.data {
                            for item in list {
                                guard let attr = item.attributes, let files = attr.files, let firstFile = files.first, let fileId = firstFile.file_id else { continue }
                                let langCode = (attr.language ?? "en").lowercased()
                                let isKurd = (langCode == "ckb" || langCode == "ku")
                                let rel = attr.release ?? firstFile.file_name ?? "Standard Subtitle Track"
                                let key = "\(langCode)_\(rel)"
                                if !seenKeys.contains(key) {
                                    seenKeys.insert(key)
                                    aggregatedTracks.append(OpenSubtitleTrack(
                                        id: fileId,
                                        language: isKurd ? "کوردی (OpenSubtitles)" : (langCode == "en" ? "English" : langCode.uppercased()),
                                        languageCode: langCode,
                                        releaseName: rel,
                                        isKurdish: isKurd,
                                        directUrl: nil,
                                        sourceName: "OpenSubtitles Search"
                                    ))
                                }
                            }
                            if !aggregatedTracks.isEmpty { break }
                        }
                    }
                }
            }
        }
        
        // Sort: Kurdish tracks always at the top, then English, then Others
        return aggregatedTracks.sorted {
            if $0.isKurdish != $1.isKurdish { return $0.isKurdish }
            if ($0.languageCode == "en") != ($1.languageCode == "en") { return $0.languageCode == "en" }
            return $0.language < $1.language
        }
    }
    
    func downloadAndParseSubtitle(track: OpenSubtitleTrack) async -> [SubtitleCue] {
        // Option 1: Direct URL Download (Stremio / FKURD / KurdSubtitle)
        if let directUrlStr = track.directUrl, !directUrlStr.isEmpty, let directUrl = URL(string: directUrlStr) {
            var request = URLRequest(url: directUrl)
            request.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", forHTTPHeaderField: "User-Agent")
            request.setValue("*/*", forHTTPHeaderField: "Accept")
            request.timeoutInterval = 8.0
            
            if let (data, response) = try? await URLSession.shared.data(for: request),
               let httpResp = response as? HTTPURLResponse, (200...299).contains(httpResp.statusCode) {
                if let rawText = String(data: data, encoding: .utf8) ?? String(data: data, encoding: .isoLatin1) {
                    let parsed = parseSRTContent(rawText)
                    if !parsed.isEmpty { return parsed }
                }
            }
        }
        
        // Option 2: OpenSubtitles API Download Link
        let urlString = "https://api.opensubtitles.com/api/v1/download"
        guard let url = URL(string: urlString) else { return [] }
        let payload: [String: Any] = ["file_id": track.id]
        guard let bodyData = try? JSONSerialization.data(withJSONObject: payload) else { return [] }
        
        for key in openSubtitlesKeys {
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue(key, forHTTPHeaderField: "Api-Key")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("application/json", forHTTPHeaderField: "Accept")
            request.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", forHTTPHeaderField: "User-Agent")
            request.httpBody = bodyData
            request.timeoutInterval = 6.0
            
            do {
                let (data, response) = try await URLSession.shared.data(for: request)
                if let httpResp = response as? HTTPURLResponse, (200...299).contains(httpResp.statusCode) {
                    let decoded = try JSONDecoder().decode(OpenSubtitlesDownloadResponse.self, from: data)
                    if let link = decoded.link, let fileUrl = URL(string: link) {
                        var fileReq = URLRequest(url: fileUrl)
                        fileReq.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", forHTTPHeaderField: "User-Agent")
                        fileReq.setValue("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", forHTTPHeaderField: "Accept")
                        
                        let (contentData, _) = try await URLSession.shared.data(for: fileReq)
                        if let srtText = String(data: contentData, encoding: .utf8) ?? String(data: contentData, encoding: .isoLatin1) {
                            let cues = parseSRTContent(srtText)
                            if !cues.isEmpty { return cues }
                        }
                    }
                }
            } catch {
                continue
            }
        }
        return []
    }
    
    func parseSRTContent(_ text: String) -> [SubtitleCue] {
        var cues: [SubtitleCue] = []
        let rawBlocks = text.components(separatedBy: "\r\n\r\n").count > 1 ? text.components(separatedBy: "\r\n\r\n") : text.components(separatedBy: "\n\n")
        
        for block in rawBlocks {
            let lines = block.components(separatedBy: .newlines).map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
            guard lines.count >= 2 else { continue }
            
            guard let timeLine = lines.first(where: { $0.contains("-->") }) else { continue }
            let timeParts = timeLine.components(separatedBy: "-->")
            guard timeParts.count == 2 else { continue }
            
            let startSec = parseSRTTimestamp(timeParts[0].trimmingCharacters(in: .whitespaces))
            let endSec = parseSRTTimestamp(timeParts[1].trimmingCharacters(in: .whitespaces))
            
            guard let timeIndex = lines.firstIndex(of: timeLine) else { continue }
            let textLines = lines[(timeIndex + 1)...]
            var content = textLines.joined(separator: " ")
            content = cleanSubtitleText(content)
            
            if !content.isEmpty && endSec > startSec {
                cues.append(SubtitleCue(start: startSec, end: endSec, text: content))
            }
        }
        return cues
    }
    
    private func parseSRTTimestamp(_ timeStr: String) -> Double {
        let clean = timeStr.replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespaces)
        let parts = clean.components(separatedBy: ":")
        if parts.count == 3 {
            let hours = Double(parts[0]) ?? 0
            let minutes = Double(parts[1]) ?? 0
            let seconds = Double(parts[2]) ?? 0
            return (hours * 3600) + (minutes * 60) + seconds
        } else if parts.count == 2 {
            let minutes = Double(parts[0]) ?? 0
            let seconds = Double(parts[1]) ?? 0
            return (minutes * 60) + seconds
        }
        return 0
    }
}

extension Array {
    func chunked(into size: Int) -> [[Element]] {
        guard size > 0 else { return [] }
        return stride(from: 0, to: count, by: size).map {
            Array(self[$0 ..< Swift.min($0 + size, count)])
        }
    }
}



