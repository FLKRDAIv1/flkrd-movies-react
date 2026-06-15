//
//  WatchProgressManager.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 03/06/2026.
//

import Foundation
import Combine

class WatchProgressManager: ObservableObject {
    static let shared = WatchProgressManager()
    
    @Published var continueWatchingList: [WatchProgress] = []
    
    private init() {
        loadProgressList()
    }
    
    func loadProgressList() {
        if let data = UserDefaults.standard.data(forKey: "watchProgress") {
            do {
                let list = try JSONDecoder().decode([WatchProgress].self, from: data)
                // Filter out completed ones or sort by last watched descending
                self.continueWatchingList = list.sorted(by: { $0.lastWatched > $1.lastWatched })
            } catch {
                print("Failed decoding watch progress list: \(error)")
            }
        }
    }
    
    func getProgress(id: String, type: String) -> WatchProgress? {
        let cleanId = id.replacingOccurrences(of: "custom_", with: "")
        return continueWatchingList.first(where: {
            $0.id.replacingOccurrences(of: "custom_", with: "") == cleanId && $0.type == type
        })
    }
    
    func saveProgress(
        id: String,
        type: String,
        title: String,
        posterPath: String,
        backdropPath: String?,
        progress: Double,
        duration: Double,
        season: Int?,
        episode: Int?
    ) {
        let cleanId = id.replacingOccurrences(of: "custom_", with: "")
        let isCompleted = duration > 0 && (progress / duration) >= 0.95
        let finalProgress = isCompleted ? 0 : progress
        
        let newProgress = WatchProgress(
            id: cleanId,
            type: type,
            title: title,
            posterPath: posterPath,
            backdropPath: backdropPath,
            progress: finalProgress,
            duration: duration,
            lastWatched: Date().timeIntervalSince1970,
            season: season,
            episode: episode
        )
        
        var currentList = continueWatchingList
        
        // Remove existing item to avoid duplicates
        currentList.removeAll(where: {
            $0.id.replacingOccurrences(of: "custom_", with: "") == cleanId && $0.type == type
        })
        
        // Only append if it's not completed
        if !isCompleted {
            currentList.append(newProgress)
        }
        
        // Keep the continue watching list clean (e.g. limit to last 20 items to save space)
        let sortedList = currentList.sorted(by: { $0.lastWatched > $1.lastWatched })
        let truncatedList = Array(sortedList.prefix(20))
        
        do {
            let data = try JSONEncoder().encode(truncatedList)
            UserDefaults.standard.set(data, forKey: "watchProgress")
            
            DispatchQueue.main.async {
                self.continueWatchingList = truncatedList
            }
        } catch {
            print("Failed encoding watch progress item: \(error)")
        }
    }
}
