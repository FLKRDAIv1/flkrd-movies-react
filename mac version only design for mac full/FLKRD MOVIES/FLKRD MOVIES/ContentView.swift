//
//  ContentView.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import SwiftUI

struct ContentView: View {
    @ObservedObject var lang = LocalizationService.shared
    
    @State private var selectedMenu: String? = "Home"
    @State private var searchPopoverPresented = false
    @State private var settingsWindowPresented = false
    
    // Header status trackers
    @State private var networkConnected = true
    @State private var backgroundActive = true
    
    var body: some View {
        NavigationSplitView {
            // Sidebar Lists
            List(selection: $selectedMenu) {
                // Header Logo
                HStack {
                    Spacer()
                    Image("flkrd-logo")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(height: 38)
                        .padding(.vertical, 16)
                    Spacer()
                }
                .listRowSeparator(.hidden)
                
                // Section: LIBRARY
                Section(header: Text("LIBRARY").font(.system(size: 10, weight: .bold)).foregroundColor(.white.opacity(0.4))) {
                    NavigationLink(value: "Home") {
                        Label(lang.t("home"), systemImage: "popcorn.fill")
                    }
                    
                    NavigationLink(value: "Explore") {
                        Label(lang.t("explore"), systemImage: "sparkles")
                    }
                    
                    NavigationLink(value: "Discover") {
                        Label(lang.t("discover"), systemImage: "safari.fill")
                    }
                    
                    NavigationLink(value: "TV Series") {
                        Label(lang.t("tvShows"), systemImage: "play.rectangle.fill")
                    }
                    
                    NavigationLink(value: "Movie Dubbed") {
                        Label(lang.t("dubbedMovies"), systemImage: "rectangle.grid.2x2.fill")
                    }
                    
                    NavigationLink(value: "Kurdish CC") {
                        Label(lang.t("kurdishCC"), systemImage: "captions.bubble.fill")
                            .foregroundColor(.red)
                    }
                    
                    NavigationLink(value: "Shorts") {
                        Label(lang.t("shorts"), systemImage: "play.tv.fill")
                            .foregroundColor(.pink)
                    }
                }
                
                // Section: MY SPACE
                Section(header: Text("MY SPACE").font(.system(size: 10, weight: .bold)).foregroundColor(.white.opacity(0.4))) {
                    NavigationLink(value: "Favorites") {
                        Label(lang.t("favorites"), systemImage: "heart.fill")
                            .foregroundColor(.red)
                    }
                    
                    NavigationLink(value: "Co-Watch") {
                        Label(lang.t("watchParty"), systemImage: "ticket.fill")
                            .foregroundColor(.yellow)
                    }
                }
                
                // Section: SYSTEM
                Section(header: Text("SYSTEM").font(.system(size: 10, weight: .bold)).foregroundColor(.white.opacity(0.4))) {
                    NavigationLink(value: "Settings") {
                        Label(lang.t("settings"), systemImage: "gearshape.fill")
                    }
                }
            }
            .listStyle(SidebarListStyle())
            .navigationSplitViewColumnWidth(min: 200, ideal: 220, max: 250)
            
        } detail: {
            // Main dynamic content pane styled in Frosted glassmorphism
            ZStack {
                // Color spheres background
                AmbientBackgroundView()
                    .edgesIgnoringSafeArea(.all)
                
                // Active Subview Selection
                Group {
                    switch selectedMenu {
                    case "Home":
                        HomeView()
                    case "Explore":
                        ExploreView()
                    case "Discover":
                        DiscoverView()
                    case "TV Series":
                        TVShowsView()
                    case "Movie Dubbed":
                        DubbedMoviesView()
                    case "Kurdish CC":
                        KurdishCCView()
                    case "Shorts":
                        ShortsView()
                    case "Co-Watch":
                        CoWatchView(movieId: "custom_watchroom", movieTitle: "Lobby Room")
                    case "Settings":
                        SettingsView()
                    case "Favorites":
                        DubbedMoviesView()
                    default:
                        HomeView()
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.black.opacity(0.15))
            }
            .toolbar {
                // Toolbar status badges (top right of window)
                ToolbarItemGroup(placement: .automatic) {
                    // Status Badge 1: Works in background
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 6, height: 6)
                        Text("Works in background")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.white.opacity(0.6))
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .glassPanel(cornerRadius: 6)
                    
                    // Status Badge 2: Network
                    Image(systemName: networkConnected ? "wifi" : "wifi.slash")
                        .font(.system(size: 11))
                        .foregroundColor(networkConnected ? lang.accentColor : .red)
                    
                    // Quick launch Settings shortcut
                    Button {
                        selectedMenu = "Settings"
                    } label: {
                        Image(systemName: "gearshape")
                            .font(.system(size: 12))
                    }
                    .buttonStyle(.plain)
                }
            }
            .navigationTitle(selectedMenu != nil ? lang.t(selectedMenu!.lowercased() == "tv series" ? "tvShows" : (selectedMenu!.lowercased() == "movie dubbed" ? "dubbedMovies" : (selectedMenu!.lowercased() == "kurdish cc" ? "kurdishCC" : (selectedMenu!.lowercased() == "co-watch" ? "watchParty" : selectedMenu!.lowercased())))) : "FLKRD MOVIES")
        }
        .preferredColorScheme(.dark)
    }
}

#Preview {
    ContentView()
}
