//
//  FLKRD_MOVIESApp.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import SwiftUI

@main
struct FLKRD_MOVIESApp: App {
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
