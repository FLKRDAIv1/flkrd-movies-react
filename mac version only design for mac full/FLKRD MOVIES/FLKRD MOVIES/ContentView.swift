//
//  ContentView.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import SwiftUI

struct NavigationTabItem: Identifiable, Equatable {
    let id: String
    let title: String
    let systemImage: String
    let activeColor: Color
    var badge: String? = nil
    var section: String
}

struct ContentView: View {
    @ObservedObject var lang = LocalizationService.shared
    
    @State private var selectedTab: String = "Home"
    @State private var searchFieldText = ""
    @State private var isSidebarCollapsed = false
    @State private var showWhatsNewModal = false
    
    // Live Global Header Search States
    @State private var isSearchFocused = false
    @State private var liveSearchResults: [MediaItem] = []
    @State private var liveDubbedResults: [DubbedMovie] = []
    @State private var autocorrectSuggestion: String? = nil
    @State private var isSearching = false
    @State private var selectedMediaFromSearch: MediaItem? = nil
    @State private var selectedDubbedFromSearch: DubbedMovie? = nil
    
    private let popularKeywords = [
        "Avatar", "Batman", "Spider-Man", "Oppenheimer", "Inception", "Interstellar",
        "John Wick", "Deadpool", "Avengers", "Harry Potter", "Fast & Furious", "Dune",
        "Breaking Bad", "Game of Thrones", "Stranger Things", "Loki", "The Boys",
        "Kurdish Dubbed", "فیلمی کوردی", "دۆبلاژ", "ئەکشن", "کۆمیدی", "ترسناک"
    ]
    
    var navigationTabs: [NavigationTabItem] {
        [
            // DISCOVER
            NavigationTabItem(id: "Home", title: lang.t("home"), systemImage: "house.fill", activeColor: .blue, badge: nil, section: lang.t("section_discover")),
            NavigationTabItem(id: "Explore", title: lang.t("explore"), systemImage: "sparkles", activeColor: .cyan, badge: "NEW", section: lang.t("section_discover")),
            NavigationTabItem(id: "Discover", title: lang.t("discover"), systemImage: "safari.fill", activeColor: .indigo, badge: nil, section: lang.t("section_discover")),
            
            // LIBRARY
            NavigationTabItem(id: "TV Series", title: lang.t("tvShows"), systemImage: "play.rectangle.fill", activeColor: .purple, badge: nil, section: lang.t("section_library")),
            NavigationTabItem(id: "Movie Dubbed", title: lang.t("dubbedMovies"), systemImage: "rectangle.grid.2x2.fill", activeColor: .blue, badge: "HD", section: lang.t("section_library")),
            NavigationTabItem(id: "Kurdish CC", title: lang.t("kurdishCC"), systemImage: "captions.bubble.fill", activeColor: .red, badge: nil, section: lang.t("section_library")),
            NavigationTabItem(id: "Co-Watch", title: lang.t("watchParty"), systemImage: "ticket.fill", activeColor: .yellow, badge: "LIVE", section: lang.t("section_library")),
            
            // PREFERENCES
            NavigationTabItem(id: "Settings", title: lang.t("settings"), systemImage: "gearshape.fill", activeColor: .gray, badge: nil, section: lang.t("section_preferences"))
        ]
    }
    
    var sections: [String] {
        [lang.t("section_discover"), lang.t("section_library"), lang.t("section_preferences")]
    }
    
    var body: some View {
        ZStack {
            // Ambient moving liquid glass background
            AmbientBackgroundView()
                .edgesIgnoringSafeArea(.all)
            
            HStack(spacing: 0) {
                // 1. Ultra-Refractive macOS Liquid Glass Sidebar
                VStack(alignment: .leading, spacing: 0) {
                    
                    // Top Logo & Studio Badge
                    HStack(spacing: 10) {
                        if !isSidebarCollapsed {
                            ZStack {
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(
                                        LinearGradient(
                                            colors: [Color.blue, Color.purple],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                                    .frame(width: 32, height: 32)
                                    .shadow(color: Color.blue.opacity(0.5), radius: 6, y: 2)
                                
                                Image(systemName: "film.fill")
                                    .font(.system(size: 15, weight: .black))
                                    .foregroundColor(.white)
                            }
                            
                            VStack(alignment: .leading, spacing: 1) {
                                Text("FLKRD")
                                    .font(.system(size: 15, weight: .heavy, design: .rounded))
                                    .foregroundColor(.white)
                                    .tracking(1.2)
                                Text("STUDIO CINEMA")
                                    .font(.system(size: 8.5, weight: .bold))
                                    .foregroundColor(.cyan)
                                    .tracking(2.0)
                            }
                        } else {
                            ZStack {
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(
                                        LinearGradient(
                                            colors: [Color.blue, Color.purple],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                                    .frame(width: 32, height: 32)
                                
                                Image(systemName: "film.fill")
                                    .font(.system(size: 15, weight: .black))
                                    .foregroundColor(.white)
                            }
                            .frame(maxWidth: .infinity)
                        }
                    }
                    .padding(.horizontal, isSidebarCollapsed ? 8 : 16)
                    .padding(.top, 20)
                    .padding(.bottom, 18)
                    
                    // Navigation Sections & Rows
                    ScrollView(.vertical, showsIndicators: false) {
                        VStack(alignment: .leading, spacing: 18) {
                            ForEach(sections, id: \.self) { sectionName in
                                let tabsInSection = navigationTabs.filter { $0.section == sectionName }
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    if !isSidebarCollapsed {
                                        Text(sectionName)
                                            .font(.system(size: 9.5, weight: .bold))
                                            .foregroundColor(.white.opacity(0.35))
                                            .tracking(1.5)
                                            .padding(.horizontal, 16)
                                            .padding(.bottom, 2)
                                    } else {
                                        Divider()
                                            .background(Color.white.opacity(0.08))
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 4)
                                    }
                                    
                                    ForEach(tabsInSection) { tab in
                                        LiquidGlassSidebarRow(
                                            tab: tab,
                                            isSelected: selectedTab == tab.id,
                                            isCollapsed: isSidebarCollapsed
                                        ) {
                                            withAnimation(.spring(response: 0.28, dampingFraction: 0.74)) {
                                                selectedTab = tab.id
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        .padding(.vertical, 6)
                    }
                    
                    Spacer()
                    
                    // Bottom User Profile & Glass Status
                    VStack(spacing: 8) {
                        Divider().background(Color.white.opacity(0.08))
                        
                        if !isSidebarCollapsed {
                            HStack(spacing: 10) {
                                ZStack {
                                    Circle()
                                        .fill(
                                            LinearGradient(
                                                colors: [Color.cyan, Color.blue],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .frame(width: 30, height: 30)
                                    
                                    Image(systemName: "person.crop.circle.fill")
                                        .font(.system(size: 16))
                                        .foregroundColor(.white)
                                }
                                
                                VStack(alignment: .leading, spacing: 1) {
                                    Text("FLKRD VIP")
                                        .font(.system(size: 11.5, weight: .bold))
                                        .foregroundColor(.white)
                                    HStack(spacing: 4) {
                                        Circle()
                                            .fill(Color.green)
                                            .frame(width: 5, height: 5)
                                        Text("Online")
                                            .font(.system(size: 9.5))
                                            .foregroundColor(.white.opacity(0.5))
                                    }
                                }
                                
                                Spacer()
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.white.opacity(0.03))
                            .cornerRadius(10)
                        } else {
                            Button {
                                selectedTab = "Settings"
                            } label: {
                                Image(systemName: "person.crop.circle.fill")
                                    .font(.system(size: 20))
                                    .foregroundColor(.blue)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 6)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(8)
                }
                .frame(width: isSidebarCollapsed ? 64 : 220)
                .background(
                    ZStack {
                        VisualEffectView(material: .sidebar, blendingMode: .behindWindow, state: .active)
                        Color.black.opacity(0.35)
                    }
                )
                .overlay(
                    LinearGradient(
                        colors: [Color.white.opacity(0.22), Color.white.opacity(0.06), Color.clear],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .frame(width: 1),
                    alignment: .trailing
                )
                .animation(.spring(response: 0.32, dampingFraction: 0.8), value: isSidebarCollapsed)
                
                // 2. Main Workspace
                VStack(spacing: 0) {
                    // Top Bar with Toggle, Breadcrumbs & Interactive Header Search
                    HStack(spacing: 12) {
                        // Toggle Sidebar Button
                        Button {
                            withAnimation(.spring(response: 0.32, dampingFraction: 0.8)) {
                                isSidebarCollapsed.toggle()
                            }
                        } label: {
                            Image(systemName: isSidebarCollapsed ? "sidebar.left" : "sidebar.leading")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.white.opacity(0.85))
                                .padding(7)
                                .background(
                                    ZStack {
                                        VisualEffectView(material: .hudWindow)
                                        Color.white.opacity(0.06)
                                    }
                                )
                                .cornerRadius(7)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 7)
                                        .stroke(Color.white.opacity(0.18), lineWidth: 1)
                                )
                        }
                        .buttonStyle(.plain)
                        .help("Toggle Sidebar (⌘B)")
                        
                        // Breadcrumbs
                        HStack(spacing: 6) {
                            Text("FLKRD")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.white.opacity(0.4))
                            Text("›")
                                .font(.system(size: 11))
                                .foregroundColor(.white.opacity(0.3))
                            Text(selectedTab)
                                .font(.system(size: 11.5, weight: .heavy, design: .rounded))
                                .foregroundColor(.white)
                        }
                        .padding(.leading, 4)
                        
                        Spacer()
                        
                        // Live Global Search Header Pill with Auto-Suggestions
                        ZStack(alignment: .trailing) {
                            HStack(spacing: 7) {
                                Image(systemName: "magnifyingglass")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(isSearchFocused ? .cyan : .white.opacity(0.45))
                                
                                TextField(lang.t("searchPlaceholder"), text: $searchFieldText, onEditingChanged: { focused in
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                        isSearchFocused = focused
                                    }
                                })
                                .textFieldStyle(.plain)
                                .font(.system(size: 11.5, weight: .medium))
                                .foregroundColor(.white)
                                .onChange(of: searchFieldText) { query in
                                    performHeaderSearch(query: query)
                                }
                                .onSubmit {
                                    if !searchFieldText.isEmpty {
                                        isSearchFocused = false
                                        selectedTab = "Explore"
                                    }
                                }
                                
                                if isSearching {
                                    ProgressView()
                                        .scaleEffect(0.6)
                                        .frame(width: 14, height: 14)
                                } else if !searchFieldText.isEmpty {
                                    Button {
                                        searchFieldText = ""
                                        liveSearchResults = []
                                        liveDubbedResults = []
                                        autocorrectSuggestion = nil
                                    } label: {
                                        Image(systemName: "xmark.circle.fill")
                                            .font(.system(size: 11))
                                            .foregroundColor(.white.opacity(0.4))
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 7)
                            .background(isSearchFocused ? Color.white.opacity(0.12) : Color.white.opacity(0.06))
                            .clipShape(Capsule())
                            .overlay(
                                Capsule().stroke(
                                    isSearchFocused ? Color.blue.opacity(0.6) : Color.white.opacity(0.12),
                                    lineWidth: isSearchFocused ? 1.5 : 1
                                )
                            )
                            .shadow(color: isSearchFocused ? Color.blue.opacity(0.3) : Color.clear, radius: 8)
                            .frame(width: 290)
                        }
                        
                        // Quick Category Navigation Pills
                        HStack(spacing: 5) {
                            CategoryNavPill(title: lang.t("movies"), isSelected: selectedTab == "Home") {
                                selectedTab = "Home"
                            }
                            CategoryNavPill(title: lang.t("series"), isSelected: selectedTab == "TV Series") {
                                selectedTab = "TV Series"
                            }
                            CategoryNavPill(title: lang.t("dubbed"), isSelected: selectedTab == "Movie Dubbed") {
                                selectedTab = "Movie Dubbed"
                            }
                        }
                        
                        // Auto-Sync Status Indicator
                        HStack(spacing: 5) {
                            Circle()
                                .fill(Color.green)
                                .frame(width: 5, height: 5)
                                .shadow(color: Color.green.opacity(0.7), radius: 3)
                            Text(lang.t("sync"))
                                .font(.system(size: 9.5, weight: .bold))
                                .foregroundColor(.white.opacity(0.85))
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 5)
                        .background(Color.green.opacity(0.18))
                        .cornerRadius(6)
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(Color.green.opacity(0.35), lineWidth: 1)
                        )
                        
                        // What's New Feature Modal Trigger Button
                        Button {
                            withAnimation(.spring(response: 0.4, dampingFraction: 0.75)) {
                                showWhatsNewModal = true
                            }
                        } label: {
                            HStack(spacing: 5) {
                                Image(systemName: "sparkles")
                                    .font(.system(size: 9, weight: .bold))
                                    .foregroundColor(.yellow)
                                Text("What's New")
                                    .font(.system(size: 9.5, weight: .bold))
                                    .foregroundColor(.white)
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 5)
                            .background(Color.yellow.opacity(0.18))
                            .cornerRadius(6)
                            .overlay(
                                RoundedRectangle(cornerRadius: 6)
                                    .stroke(Color.yellow.opacity(0.35), lineWidth: 1)
                            )
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 12)
                    .padding(.bottom, 10)
                    
                    Divider().background(Color.white.opacity(0.08))
                    
                    // Main Subview Pane with Search Popover Dropdown Overlay
                    ZStack(alignment: .topTrailing) {
                        Group {
                            switch selectedTab {
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
                            case "Co-Watch":
                                CoWatchView(movieId: "custom_watchroom", movieTitle: "Lobby Room")
                            case "Settings":
                                SettingsView()
                            default:
                                HomeView()
                            }
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        
                        // Floating Liquid Glass Search Dropdown
                        if !searchFieldText.isEmpty && isSearchFocused {
                            HeaderSearchDropdownView(
                                searchText: $searchFieldText,
                                autocorrect: autocorrectSuggestion,
                                dubbedResults: liveDubbedResults,
                                tmdbResults: liveSearchResults,
                                onSelectAutocorrect: { corrected in
                                    searchFieldText = corrected
                                    performHeaderSearch(query: corrected)
                                },
                                onSelectDubbed: { dubbed in
                                    isSearchFocused = false
                                    selectedDubbedFromSearch = dubbed
                                },
                                onSelectTMDB: { media in
                                    isSearchFocused = false
                                    selectedMediaFromSearch = media
                                },
                                onViewAll: {
                                    isSearchFocused = false
                                    selectedTab = "Explore"
                                }
                            )
                            .frame(width: 420)
                            .padding(.top, 8)
                            .padding(.trailing, 140)
                            .transition(.asymmetric(
                                insertion: .scale(scale: 0.95, anchor: .topTrailing).combined(with: .opacity),
                                removal: .opacity
                            ))
                            .zIndex(100)
                        }
                    }
                }
            }
            
            // 4-Step Interactive What's New Liquid Glass Modal
            if showWhatsNewModal {
                WhatsNewModalView(isPresented: $showWhatsNewModal)
                    .transition(.opacity)
                    .zIndex(999)
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            let lastSeen = UserDefaults.standard.string(forKey: "last_seen_app_version")
            if lastSeen != "2.5.0" {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
                    withAnimation(.spring(response: 0.45, dampingFraction: 0.8)) {
                        showWhatsNewModal = true
                    }
                }
            }
        }
        // Global Search Selection Detail Sheets
        .sheet(item: $selectedMediaFromSearch) { media in
            DetailView(mediaItem: media)
        }
        .sheet(item: $selectedDubbedFromSearch) { dub in
            DetailView(mediaItem: MediaItem(
                id: Int(dub.id) ?? abs(dub.id.hashValue),
                title: !dub.kurdishTitle.isEmpty ? dub.kurdishTitle : dub.title,
                name: nil,
                originalTitle: dub.title,
                originalName: nil,
                posterPath: dub.imageBase64 ?? dub.bannerBase64,
                backdropPath: dub.bannerBase64 ?? dub.imageBase64,
                overview: dub.description ?? "Kurdish Dubbed",
                voteAverage: 9.0,
                releaseDate: nil,
                firstAirDate: nil,
                mediaType: dub.mediaType
            ), customDubbedMovie: dub)
        }
    }
    
    private func performHeaderSearch(query: String) {
        let clean = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else {
            liveSearchResults = []
            liveDubbedResults = []
            autocorrectSuggestion = nil
            return
        }
        
        // Autocorrect / Fuzzy matching
        let cleanLower = clean.lowercased()
        let bestMatch = popularKeywords.first(where: {
            $0.lowercased().starts(with: cleanLower) ||
            levenshteinDistance($0.lowercased(), cleanLower) <= 2
        })
        if let match = bestMatch, match.lowercased() != cleanLower {
            autocorrectSuggestion = match
        } else {
            autocorrectSuggestion = nil
        }
        
        isSearching = true
        
        Task {
            async let fetchTMDB = NetworkService.shared.fetchSearch(query: clean)
            async let fetchDubbed = NetworkService.shared.fetchDubbedMovies()
            
            let tmdb = (try? await fetchTMDB) ?? []
            let allDubbed = (try? await fetchDubbed) ?? []
            let matchedDubbed = allDubbed.filter {
                $0.title.localizedCaseInsensitiveContains(clean) ||
                $0.kurdishTitle.localizedCaseInsensitiveContains(clean) ||
                ($0.description ?? "").localizedCaseInsensitiveContains(clean)
            }
            
            DispatchQueue.main.async {
                self.liveSearchResults = tmdb
                self.liveDubbedResults = matchedDubbed
                self.isSearching = false
            }
        }
    }
    
    private func levenshteinDistance(_ s1: String, _ s2: String) -> Int {
        let empty = Array(repeating: 0, count: s2.count + 1)
        var last = Array(0...s2.count)
        var current = empty
        
        for (i, char1) in s1.enumerated() {
            current[0] = i + 1
            for (j, char2) in s2.enumerated() {
                current[j + 1] = char1 == char2 ? last[j] : min(last[j], min(last[j + 1], current[j])) + 1
            }
            last = current
            current = empty
        }
        return last[s2.count]
    }
}

// MARK: - Ultra Liquid Glass Sidebar Row Component
struct LiquidGlassSidebarRow: View {
    let tab: NavigationTabItem
    let isSelected: Bool
    let isCollapsed: Bool
    var action: () -> Void
    @State private var isHovered = false
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                // Active Left Specular Pip
                if isSelected && !isCollapsed {
                    Capsule()
                        .fill(tab.activeColor)
                        .frame(width: 3, height: 14)
                        .shadow(color: tab.activeColor, radius: 4)
                }
                
                // Icon with Specular Tint
                Image(systemName: tab.systemImage)
                    .font(.system(size: 13.5, weight: isSelected ? .bold : .medium))
                    .foregroundColor(isSelected ? .white : tab.activeColor)
                    .frame(width: isCollapsed ? 36 : 20, height: 20)
                
                if !isCollapsed {
                    // Label
                    Text(tab.title)
                        .font(.system(size: 12, weight: isSelected ? .bold : .medium, design: .rounded))
                        .foregroundColor(isSelected ? .white : (isHovered ? .white : .white.opacity(0.8)))
                    
                    Spacer()
                    
                    // Optional Refractive Badge
                    if let badge = tab.badge {
                        Text(badge)
                            .font(.system(size: 8, weight: .black))
                            .foregroundColor(isSelected ? .blue : .white.opacity(0.9))
                            .padding(.horizontal, 5.5)
                            .padding(.vertical, 2)
                            .background(
                                ZStack {
                                    if isSelected {
                                        Color.white
                                    } else {
                                        tab.activeColor.opacity(0.25)
                                    }
                                }
                            )
                            .cornerRadius(4)
                            .overlay(
                                RoundedRectangle(cornerRadius: 4)
                                    .stroke(isSelected ? Color.clear : tab.activeColor.opacity(0.4), lineWidth: 0.8)
                            )
                    }
                }
            }
            .padding(.horizontal, isCollapsed ? 6 : 10)
            .padding(.vertical, 6.5)
            .background(
                ZStack {
                    if isSelected {
                        // Liquid Glass Pill
                        VisualEffectView(material: .hudWindow)
                        LinearGradient(
                            colors: [
                                tab.activeColor.opacity(0.35),
                                tab.activeColor.opacity(0.18)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                        .cornerRadius(8)
                        .shadow(color: tab.activeColor.opacity(0.4), radius: 8, y: 2)
                    } else if isHovered {
                        Color.white.opacity(0.08)
                            .cornerRadius(8)
                    }
                }
            )
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(
                        isSelected ?
                        LinearGradient(
                            stops: [
                                .init(color: .white.opacity(0.45), location: 0.0),
                                .init(color: tab.activeColor.opacity(0.6), location: 0.4),
                                .init(color: .clear, location: 1.0)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ) :
                        LinearGradient(
                            colors: [isHovered ? Color.white.opacity(0.15) : Color.clear, Color.clear],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
            .padding(.horizontal, isCollapsed ? 6 : 8)
            .scaleEffect(isHovered && !isSelected ? 1.02 : 1.0)
            .animation(.spring(response: 0.22, dampingFraction: 0.75), value: isHovered)
        }
        .buttonStyle(.plain)
        .onHover { hover in
            isHovered = hover
        }
        .help(isCollapsed ? tab.title : "")
    }
}

// MARK: - Category Navigation Pill
struct CategoryNavPill: View {
    let title: String
    let isSelected: Bool
    var action: () -> Void
    @State private var isHovered = false
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(isSelected ? .white : .white.opacity(0.6))
                .padding(.horizontal, 12)
                .padding(.vertical, 5.5)
                .background(
                    ZStack {
                        if isSelected {
                            Color.blue
                        } else if isHovered {
                            Color.white.opacity(0.1)
                        } else {
                            Color.white.opacity(0.04)
                        }
                    }
                )
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .stroke(isSelected ? Color.blue.opacity(0.8) : Color.white.opacity(0.08), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
        .onHover { hover in
            isHovered = hover
        }
    }
}

// MARK: - Floating Liquid Glass Header Search Dropdown Component
struct HeaderSearchDropdownView: View {
    @ObservedObject var lang = LocalizationService.shared
    @Binding var searchText: String
    let autocorrect: String?
    let dubbedResults: [DubbedMovie]
    let tmdbResults: [MediaItem]
    var onSelectAutocorrect: (String) -> Void
    var onSelectDubbed: (DubbedMovie) -> Void
    var onSelectTMDB: (MediaItem) -> Void
    var onViewAll: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // 1. Did You Mean / Autocorrect Suggestion Banner
            if let suggestion = autocorrect {
                Button {
                    onSelectAutocorrect(suggestion)
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "sparkles")
                            .foregroundColor(.yellow)
                            .font(.system(size: 11))
                        Text(lang.t("didYouMean"))
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.white.opacity(0.7))
                        Text(suggestion)
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.yellow)
                            .underline()
                        Spacer()
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.yellow.opacity(0.12))
                    .cornerRadius(8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.yellow.opacity(0.3), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
            }
            
            // 2. Kurdish Dubbed Matches (If any)
            if !dubbedResults.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 6) {
                        Image(systemName: "waveform.badge.magnifyingglass")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.blue)
                        Text(lang.t("kurdishDubbedTag"))
                            .font(.system(size: 9.5, weight: .black))
                            .foregroundColor(.blue)
                    }
                    .padding(.horizontal, 4)
                    
                    ForEach(dubbedResults.prefix(3), id: \.id) { dubbed in
                        Button {
                            onSelectDubbed(dubbed)
                        } label: {
                            HStack(spacing: 10) {
                                Group {
                                    if let banner = dubbed.bannerBase64 ?? dubbed.imageBase64, !banner.isEmpty {
                                        Base64Image(base64String: banner, placeholderSystemName: "film")
                                    } else {
                                        Color.white.opacity(0.08)
                                    }
                                }
                                .frame(width: 42, height: 56)
                                .cornerRadius(6)
                                .clipped()
                                
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(!dubbed.kurdishTitle.isEmpty ? dubbed.kurdishTitle : dubbed.title)
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(.white)
                                        .lineLimit(1)
                                    
                                    Text(dubbed.title)
                                        .font(.system(size: 10.5))
                                        .foregroundColor(.white.opacity(0.6))
                                        .lineLimit(1)
                                    
                                    HStack(spacing: 5) {
                                        Text("DUBBED HD")
                                            .font(.system(size: 8, weight: .bold))
                                            .foregroundColor(.cyan)
                                            .padding(.horizontal, 4)
                                            .padding(.vertical, 1)
                                            .background(Color.cyan.opacity(0.2))
                                            .cornerRadius(3)
                                        
                                        Text(lang.t("kurdishAudio"))
                                            .font(.system(size: 9))
                                            .foregroundColor(.white.opacity(0.5))
                                    }
                                }
                                
                                Spacer()
                                
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(.white.opacity(0.3))
                            }
                            .padding(8)
                            .background(Color.white.opacity(0.04))
                            .cornerRadius(8)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            
            // 3. TMDB Search Results
            if !tmdbResults.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 6) {
                        Image(systemName: "film.stack")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.cyan)
                        Text(lang.t("cinemaSeriesTag"))
                            .font(.system(size: 9.5, weight: .black))
                            .foregroundColor(.cyan)
                    }
                    .padding(.horizontal, 4)
                    
                    ForEach(tmdbResults.prefix(4), id: \.id) { media in
                        Button {
                            onSelectTMDB(media)
                        } label: {
                            HStack(spacing: 10) {
                                AsyncImage(url: URL(string: media.posterURL)) { img in
                                    img.resizable().aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    Color.white.opacity(0.08)
                                }
                                .frame(width: 42, height: 56)
                                .cornerRadius(6)
                                .clipped()
                                
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(media.computedTitle)
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(.white)
                                        .lineLimit(1)
                                    
                                    HStack(spacing: 6) {
                                        if let vote = media.voteAverage, vote > 0 {
                                            HStack(spacing: 2) {
                                                Image(systemName: "star.fill")
                                                    .foregroundColor(.yellow)
                                                    .font(.system(size: 8))
                                                Text(String(format: "%.1f", vote))
                                                    .font(.system(size: 10, weight: .bold))
                                                    .foregroundColor(.yellow)
                                            }
                                        }
                                        
                                        if let year = media.releaseDate?.prefix(4) {
                                            Text(String(year))
                                                .font(.system(size: 10))
                                                .foregroundColor(.white.opacity(0.5))
                                        }
                                        
                                        Text((media.mediaType ?? "movie").uppercased())
                                            .font(.system(size: 8, weight: .bold))
                                            .foregroundColor(.white.opacity(0.7))
                                            .padding(.horizontal, 4)
                                            .padding(.vertical, 1)
                                            .background(Color.white.opacity(0.1))
                                            .cornerRadius(3)
                                    }
                                }
                                
                                Spacer()
                                
                                Image(systemName: "play.circle.fill")
                                    .font(.system(size: 16))
                                    .foregroundColor(.blue.opacity(0.8))
                            }
                            .padding(8)
                            .background(Color.white.opacity(0.04))
                            .cornerRadius(8)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            
            if dubbedResults.isEmpty && tmdbResults.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 20))
                        .foregroundColor(.white.opacity(0.3))
                    Text("\(lang.t("searchingFor")) \"\(searchText)\"...")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.white.opacity(0.6))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
            }
            
            // Footer: View all results in Explore tab
            Button {
                onViewAll()
            } label: {
                HStack {
                    Text(lang.t("viewAllInExplore"))
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.blue)
                    Spacer()
                    Image(systemName: "arrow.right")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.blue)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(8)
            }
            .buttonStyle(.plain)
        }
        .padding(14)
        .background(
            ZStack {
                VisualEffectView(material: .hudWindow, blendingMode: .withinWindow, state: .active)
                Color.black.opacity(0.75)
            }
        )
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(
                    LinearGradient(
                        colors: [Color.white.opacity(0.35), Color.white.opacity(0.08)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1.5
                )
        )
        .shadow(color: Color.black.opacity(0.7), radius: 24, y: 12)
    }
}
