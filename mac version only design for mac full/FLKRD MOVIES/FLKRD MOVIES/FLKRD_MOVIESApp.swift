//
//  FLKRD_MOVIESApp.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import SwiftUI

@main
struct FLKRD_MOVIESApp: App {
    init() {
        // High-Speed In-Memory & Disk Image & API Cache for 60/120fps Silky Smooth Scrolling
        let memoryCapacity = 512 * 1024 * 1024 // 512 MB RAM
        let diskCapacity = 1024 * 1024 * 1024 // 1 GB High-Speed Disk Cache
        let cache = URLCache(memoryCapacity: memoryCapacity, diskCapacity: diskCapacity, diskPath: "flkrd_turbo_cache")
        URLCache.shared = cache
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .frame(minWidth: 960, minHeight: 620)
                .background(VisualEffectView(material: .hudWindow).edgesIgnoringSafeArea(.all))
        }
        .windowStyle(.hiddenTitleBar) // Hides default top titlebar text for an elegant unified header look
        .windowToolbarStyle(.unifiedCompact) // Compact toolbar integrated directly with window controls
    }
}
