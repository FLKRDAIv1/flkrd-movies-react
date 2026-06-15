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
    
    private let supabaseURL = "https://fmahzalaxbkmhbpcally.supabase.co"
    private let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtYWh6YWxheGJrbWhicGNhbGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjQ0NDYsImV4cCI6MjA5MzM0MDQ0Nn0.d4y612cjG6bSHL6vNK1YdxFmKjCJ6YpDIV7oG9XFis4"
    
    private init() {}
    
    // MARK: - FLKRD Protection System Blocklists
    private let forbiddenContentIDs: Set<Int> = [
        1249764, // EKS
        1216223, // Risqué
        1184000, // Kulong
        1238968, // Rita
        574043,  // High School of the Dead
        1244301, 1214309, 1205315, 1184000, 1159844, 1145325, 1131758, 1121087, 1083862
    ]
    
    private let forbiddenKeywords: [String] = [
        "porn", "sex", "erotic", "lust", "naked", "sexy", "nude", "nudity",
        "explicit", "sensual", "sexual", "hardcore", "xxx", "hentai", "stripper",
        "ejaculation", "orgasm", "pornography", "bdsm", "gay porn", "lesbian porn",
        "hot scene", "bikini body", "naked woman", "naked man",
        "پۆرن", "سێکس", "ئیرۆتیک", "ڕووت", "سێکسی", "ڕووتی",
        "بێ پەردە", "کاری سێکسی", "ڕووتکردنەوە"
    ]
    
    private var activeLanguageCode: String {
        let lang = UserDefaults.standard.string(forKey: "selected_language") ?? "en"
        return lang == "en" ? "en-US" : "ku"
    }
    
    private func isContentAllowed(_ item: MediaItem) -> Bool {
        if item.adult ?? false { return false }
        if forbiddenContentIDs.contains(item.id) { return false }
        
        let titleText = item.computedTitle.lowercased()
        let overviewText = (item.overview ?? "").lowercased()
        
        for word in forbiddenKeywords {
            if titleText.contains(word) || overviewText.contains(word) {
                return false
            }
        }
        return true
    }

    // MARK: - TMDB Services
    
    func fetchTrending(mediaType: String = "all", timeWindow: String = "week") async throws -> [MediaItem] {
        let urlString = "\(tmdbBaseURL)/trending/\(mediaType)/\(timeWindow)?api_key=\(tmdbApiKey)&language=\(activeLanguageCode)"
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        let response = try JSONDecoder().decode(MovieResponse.self, from: data)
        return response.results.filter { isContentAllowed($0) }
    }
    
    func fetchDiscover(mediaType: String = "movie", genreId: Int? = nil, companyId: Int? = nil, page: Int = 1) async throws -> [MediaItem] {
        var urlString = "\(tmdbBaseURL)/discover/\(mediaType)?api_key=\(tmdbApiKey)&language=\(activeLanguageCode)&sort_by=popularity.desc&include_adult=false&page=\(page)"
        if let gid = genreId {
            urlString += "&with_genres=\(gid)"
            if gid == 10749 { return [] } // Hard blocks pure Romance genre ID 10749
        }
        if let cid = companyId {
            urlString += "&with_companies=\(cid)"
        }
        
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        let (data, _) = try await URLSession.shared.data(from: url)
        let response = try JSONDecoder().decode(MovieResponse.self, from: data)
        return response.results.filter { isContentAllowed($0) }
    }
    
    func fetchSearch(query: String) async throws -> [MediaItem] {
        guard let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else { return [] }
        let urlString = "\(tmdbBaseURL)/search/multi?api_key=\(tmdbApiKey)&language=\(activeLanguageCode)&query=\(encodedQuery)&include_adult=false"
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        let response = try JSONDecoder().decode(MovieResponse.self, from: data)
        return response.results.filter { isContentAllowed($0) }
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
    
    func fetchTMDBMovieExternalIds(id: Int) async throws -> String? {
        let urlString = "\(tmdbBaseURL)/movie/\(id)/external_ids?api_key=\(tmdbApiKey)"
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let imdbId = json["imdb_id"] as? String {
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
    
    // 1. Fetch Dubbed Movies
    func fetchDubbedMovies() async throws -> [DubbedMovie] {
        let request = try makeSupabaseRequest(path: "dubbed_movies", queryItems: [
            URLQueryItem(name: "select", value: "id,title,kurdishTitle,description,videoUrl,media_type,imdb_id,tmdb_id,level,created_at,imageBase64"),
            URLQueryItem(name: "order", value: "created_at.desc")
        ])
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode([DubbedMovie].self, from: data)
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
        
        // Try RPC first
        do {
            let rpcPayload: [String: Any] = ["target_id": numericId]
            let rpcBody = try JSONSerialization.data(withJSONObject: rpcPayload)
            let rpcRequest = try makeSupabaseRequest(path: "rpc/delete_dubbed_movie", method: "POST", body: rpcBody)
            
            let (data, response) = try await URLSession.shared.data(for: rpcRequest)
            if let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) {
                print("Deleted successfully via RPC")
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
}
