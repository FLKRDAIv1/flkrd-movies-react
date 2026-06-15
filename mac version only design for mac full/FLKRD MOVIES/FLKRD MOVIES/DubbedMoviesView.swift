//
//  DubbedMoviesView.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import SwiftUI
import Combine
import AppKit
import UniformTypeIdentifiers

// MARK: - High Performance Base64 / Remote Image View Component
struct Base64Image: View {
    let base64String: String?
    let placeholderSystemName: String
    
    var body: some View {
        if let base64String = base64String, !base64String.isEmpty {
            if base64String.starts(with: "http") {
                AsyncImage(url: URL(string: base64String)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure, .empty:
                        fallbackView
                    @unknown default:
                        fallbackView
                    }
                }
            } else {
                let cleanBase64 = cleanBase64String(base64String)
                if let data = Data(base64Encoded: cleanBase64),
                   let nsImage = NSImage(data: data) {
                    Image(nsImage: nsImage)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } else {
                    fallbackView
                }
            }
        } else {
            fallbackView
        }
    }
    
    private var fallbackView: some View {
        ZStack {
            Color.white.opacity(0.04)
            Image(systemName: placeholderSystemName)
                .font(.system(size: 24))
                .foregroundColor(.white.opacity(0.12))
        }
    }
    
    private func cleanBase64String(_ str: String) -> String {
        if let range = str.range(of: ";base64,") {
            return String(str[range.upperBound...])
        }
        return str
    }
}

// MARK: - Main Kurdish Dubbed Movies View
struct DubbedMoviesView: View {
    @ObservedObject var langService = LocalizationService.shared
    
    // Core data states
    @State private var movies: [DubbedMovie] = []
    @State private var filteredMovies: [DubbedMovie] = []
    @State private var searchText = ""
    @State private var selectedLevel = "ALL"
    @State private var loading = true
    @State private var selectedMovie: DubbedMovie? = nil
    
    // Auto-rotating Hero Carousel states
    @State private var currentHeroIndex = 0
    let rotationTimer = Timer.publish(every: 8, on: .main, in: .common).autoconnect()
    
    // Administrative Portal states
    @State private var isAdmin = false
    @State private var showLoginModal = false
    @State private var showAdminDashboard = false
    @State private var adminEmail = ""
    @State private var adminPassword = ""
    
    // Upload New Movie states
    @State private var uploadTitle = ""
    @State private var uploadDescription = ""
    @State private var uploadVideoUrl = ""
    @State private var uploadImageBase64 = ""
    @State private var uploadBannerBase64 = ""
    @State private var uploadLevel = "NEW"
    @State private var uploadImdbId = ""
    @State private var uploadTmdbId = ""
    @State private var isSyncingTMDB = false
    @State private var isUploading = false
    @State private var activeAdminTab = "UPLOAD" // UPLOAD or ARCHIVE
    @State private var archiveSearchQuery = ""
    
    // Edit Movie states
    @State private var showEditModal = false
    @State private var editingMovie: DubbedMovie? = nil
    @State private var editTitle = ""
    @State private var editDescription = ""
    @State private var editVideoUrl = ""
    @State private var editImageBase64 = ""
    @State private var editBannerBase64 = ""
    @State private var editLevel = "NEW"
    @State private var editImdbId = ""
    @State private var editTmdbId = ""
    @State private var isEditingSyncing = false
    @State private var isUpdating = false
    
    // Global Toast Notification
    @State private var toastMessage: String? = nil
    @State private var isToastError = false
    @State private var showToast = false
    
    let levels = ["ALL", "NEW", "TRENDING", "CLASSIC", "KING"]
    
    var body: some View {
        ZStack {
            // Main page contents
            VStack(spacing: 0) {
                // Header Panel
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(langService.t("dubbedMovies"))
                                .font(.system(size: 24, weight: .black, design: .rounded))
                                .foregroundColor(.white)
                            
                            Text("Exclusively curated Kurdish dubbed cinema portal synchronized with Supabase backend.")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.white.opacity(0.45))
                        }
                        
                        Spacer()
                        
                        // Live refresh heartbeat indicator
                        Button {
                            loadDubbedMovies()
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "arrow.clockwise")
                                    .font(.system(size: 11, weight: .bold))
                                Text("Live Database Sync")
                                    .font(.system(size: 10, weight: .bold))
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .glassPanel(cornerRadius: 12)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 24)
                    
                    // Search bar & visual caps filters
                    HStack(spacing: 16) {
                        HStack {
                            Image(systemName: "magnifyingglass")
                                .foregroundColor(.white.opacity(0.4))
                            TextField("Search dubbed titles...", text: $searchText)
                                .textFieldStyle(.plain)
                                .foregroundColor(.white)
                                .onChange(of: searchText) { _, _ in filterContent() }
                        }
                        .padding(10)
                        .glassPanel(cornerRadius: 10)
                        .frame(maxWidth: 320)
                        
                        HStack(spacing: 8) {
                            ForEach(levels, id: \.self) { level in
                                Button {
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                        selectedLevel = level
                                        filterContent()
                                    }
                                } label: {
                                    Text(level == "ALL" ? langService.t("seeMore") : level)
                                        .font(.system(size: 11, weight: .bold))
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 8)
                                        .background(selectedLevel == level ? Color.blue : Color.white.opacity(0.04))
                                        .foregroundColor(.white)
                                        .cornerRadius(8)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    .padding(.horizontal, 24)
                }
                .padding(.bottom, 20)
                
                Divider().background(Color.white.opacity(0.08))
                
                if loading {
                    Spacer()
                    ProgressView("Tuning Signals to Supabase...")
                    Spacer()
                } else {
                    ScrollView {
                        VStack(spacing: 32) {
                            // 1. Asymmetric Spatial Hero Carousel (Top 10 Newest)
                            let heroMovies = movies.prefix(10)
                            if !heroMovies.isEmpty {
                                ZStack(alignment: .bottomLeading) {
                                    // Ambient blurred backing glow
                                    Base64Image(base64String: heroMovies[currentHeroIndex].bannerBase64 ?? heroMovies[currentHeroIndex].imageBase64, placeholderSystemName: "photo")
                                        .blur(radius: 20)
                                        .opacity(0.3)
                                        .scaleEffect(1.1)
                                        .clipped()
                                    
                                    // Main Landscape banner
                                    Base64Image(base64String: heroMovies[currentHeroIndex].bannerBase64 ?? heroMovies[currentHeroIndex].imageBase64, placeholderSystemName: "photo")
                                        .overlay(
                                            LinearGradient(
                                                colors: [.black.opacity(0.9), .black.opacity(0.2), .clear, .black.opacity(0.85)],
                                                startPoint: .leading,
                                                endPoint: .trailing
                                            )
                                        )
                                        .overlay(
                                            LinearGradient(
                                                colors: [.clear, .black.opacity(0.9)],
                                                startPoint: .top,
                                                endPoint: .bottom
                                            )
                                        )
                                    
                                    // Elegant floating metadata card (Asymmetric design)
                                    VStack(alignment: .leading, spacing: 12) {
                                        HStack(spacing: 8) {
                                            if let lvl = heroMovies[currentHeroIndex].level, !lvl.isEmpty {
                                                Text(lvl.uppercased())
                                                    .font(.system(size: 9, weight: .black, design: .rounded))
                                                    .foregroundColor(.black)
                                                    .padding(.horizontal, 8)
                                                    .padding(.vertical, 4)
                                                    .background(lvl == "KING" ? Color.yellow : (lvl == "TRENDING" ? Color.red : Color.blue))
                                                    .cornerRadius(6)
                                            }
                                            
                                            Text("KURDISH DUBBED PORTAL")
                                                .font(.system(size: 9, weight: .bold))
                                                .foregroundColor(.white.opacity(0.6))
                                                .tracking(1.5)
                                        }
                                        
                                        // Bilingual Title Layout
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(heroMovies[currentHeroIndex].title)
                                                .font(.system(size: 26, weight: .bold, design: .rounded))
                                                .foregroundColor(.white)
                                            
                                            Text(heroMovies[currentHeroIndex].kurdishTitle)
                                                .font(.system(size: 20, weight: .medium, design: .rounded))
                                                .foregroundColor(.blue.opacity(0.8))
                                        }
                                        
                                        if let desc = heroMovies[currentHeroIndex].description, !desc.isEmpty {
                                            Text(desc)
                                                .font(.system(size: 12, weight: .medium))
                                                .foregroundColor(.white.opacity(0.6))
                                                .lineLimit(3)
                                                .frame(maxWidth: 550, alignment: .leading)
                                        }
                                        
                                        HStack(spacing: 12) {
                                            Button {
                                                selectedMovie = heroMovies[currentHeroIndex]
                                            } label: {
                                                HStack {
                                                    Image(systemName: "play.fill")
                                                    Text(langService.t("play"))
                                                }
                                                .font(.system(size: 12, weight: .bold))
                                                .foregroundColor(.black)
                                                .padding(.horizontal, 20)
                                                .padding(.vertical, 10)
                                                .background(Color.white)
                                                .cornerRadius(8)
                                            }
                                            .buttonStyle(.plain)
                                            
                                            Button {
                                                copyShareLink(heroMovies[currentHeroIndex])
                                            } label: {
                                                HStack {
                                                    Image(systemName: "square.and.arrow.up")
                                                    Text("Share Portal")
                                                }
                                                .font(.system(size: 12, weight: .semibold))
                                                .foregroundColor(.white)
                                                .padding(.horizontal, 16)
                                                .padding(.vertical, 10)
                                                .glassPanel(cornerRadius: 8)
                                            }
                                            .buttonStyle(.plain)
                                        }
                                        .padding(.top, 8)
                                    }
                                    .padding(32)
                                    
                                    // Custom Page Index capsules (bottom right)
                                    HStack(spacing: 6) {
                                        ForEach(0..<heroMovies.count, id: \.self) { index in
                                            Capsule()
                                                .fill(currentHeroIndex == index ? Color.white : Color.white.opacity(0.25))
                                                .frame(width: currentHeroIndex == index ? 20 : 6, height: 6)
                                                .animation(.spring(), value: currentHeroIndex)
                                        }
                                    }
                                    .padding(32)
                                    .frame(maxWidth: .infinity, alignment: .trailing)
                                }
                                .frame(height: 380)
                                .cornerRadius(20)
                                .padding(.horizontal, 24)
                                .padding(.top, 24)
                            }
                            
                            // 2. Grids of categorized dubbed movie items
                            if filteredMovies.isEmpty {
                                VStack(spacing: 16) {
                                    Image(systemName: "film.stack")
                                        .font(.system(size: 48))
                                        .foregroundColor(.white.opacity(0.12))
                                    Text("No dubbed movies fit your search filters.")
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundColor(.white.opacity(0.4))
                                }
                                .padding(.vertical, 80)
                            } else {
                                LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 24)], spacing: 32) {
                                    ForEach(filteredMovies) { movie in
                                        Button {
                                            selectedMovie = movie
                                        } label: {
                                            VStack(alignment: .leading, spacing: 10) {
                                                ZStack(alignment: .topTrailing) {
                                                    Base64Image(base64String: movie.imageBase64, placeholderSystemName: "film")
                                                        .frame(width: 150, height: 220)
                                                        .cornerRadius(16)
                                                        .overlay(
                                                            RoundedRectangle(cornerRadius: 16)
                                                                .stroke(Color.white.opacity(0.08), lineWidth: 1)
                                                        )
                                                        .shadow(color: Color.black.opacity(0.4), radius: 6, y: 4)
                                                    
                                                    if let lvl = movie.level, !lvl.isEmpty {
                                                        Text(lvl.uppercased())
                                                            .font(.system(size: 8, weight: .black))
                                                            .foregroundColor(.black)
                                                            .padding(.horizontal, 6)
                                                            .padding(.vertical, 3)
                                                            .background(lvl == "KING" ? Color.yellow : (lvl == "TRENDING" ? Color.red : Color.blue))
                                                            .cornerRadius(4)
                                                            .padding(8)
                                                    }
                                                }
                                                
                                                // Bilingual Titles
                                                VStack(alignment: .leading, spacing: 2) {
                                                    Text(movie.title)
                                                        .font(.system(size: 12, weight: .bold, design: .rounded))
                                                        .foregroundColor(.white)
                                                        .lineLimit(1)
                                                    
                                                    Text(movie.kurdishTitle)
                                                        .font(.system(size: 11, weight: .medium, design: .rounded))
                                                        .foregroundColor(.white.opacity(0.4))
                                                        .lineLimit(1)
                                                }
                                                .frame(width: 150, alignment: .leading)
                                            }
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                                .padding(.horizontal, 24)
                            }
                        }
                        .padding(.bottom, 80)
                    }
                }
            }
            
            // --- Premium Floating Admin trigger Button (Matches web FAB bottom corner) ---
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    Button {
                        if isAdmin {
                            showAdminDashboard = true
                        } else {
                            showLoginModal = true
                        }
                    } label: {
                        ZStack {
                            Circle()
                                .fill(LinearGradient(colors: [Color.red, Color(red: 0.8, green: 0.1, blue: 0.2)], startPoint: .top, endPoint: .bottom))
                                .frame(width: 54, height: 54)
                                .shadow(color: Color.red.opacity(0.4), radius: 10, y: 5)
                            
                            Image(systemName: isAdmin ? "slider.horizontal.3" : "lock.shield.fill")
                                .font(.system(size: 20, weight: .bold))
                                .foregroundColor(.white)
                        }
                    }
                    .buttonStyle(.plain)
                    .padding(24)
                }
            }
            
            // --- Toast Banner Notification ---
            if showToast, let toast = toastMessage {
                VStack {
                    HStack(spacing: 12) {
                        Image(systemName: isToastError ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                            .foregroundColor(isToastError ? .red : .green)
                            .font(.system(size: 16, weight: .bold))
                        
                        Text(toast)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white)
                        
                        Spacer()
                    }
                    .padding(14)
                    .background(Color.black.opacity(0.85))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(isToastError ? Color.red.opacity(0.3) : Color.green.opacity(0.3), lineWidth: 1)
                    )
                    .shadow(color: Color.black.opacity(0.5), radius: 12, y: 6)
                    .frame(maxWidth: 360)
                    .padding(.top, 20)
                    
                    Spacer()
                }
                .transition(.move(edge: .top).combined(with: .opacity))
                .zIndex(1000)
            }
            
            // --- Admin Login Sheet Overlay ---
            if showLoginModal {
                Color.black.opacity(0.65)
                    .ignoresSafeArea()
                    .onTapGesture { showLoginModal = false }
                
                VStack(spacing: 20) {
                    VStack(spacing: 8) {
                        Image(systemName: "lock.shield.fill")
                            .font(.system(size: 42))
                            .foregroundColor(.red)
                        
                        Text("Administrative Portal Entry")
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                        
                        Text("Authorize server administrative capabilities.")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.white.opacity(0.5))
                            .multilineTextAlignment(.center)
                    }
                    
                    VStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("ADMIN EMAIL")
                                .font(.system(size: 9, weight: .black))
                                .foregroundColor(.white.opacity(0.4))
                            TextField("flkrdstudio@gmail.com", text: $adminEmail)
                                .textFieldStyle(.plain)
                                .padding(10)
                                .background(Color.white.opacity(0.04))
                                .cornerRadius(8)
                                .foregroundColor(.white)
                        }
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("SECURITY ACCESS CODE")
                                .font(.system(size: 9, weight: .black))
                                .foregroundColor(.white.opacity(0.4))
                            SecureField("Zanabarzani1919@", text: $adminPassword)
                                .textFieldStyle(.plain)
                                .padding(10)
                                .background(Color.white.opacity(0.04))
                                .cornerRadius(8)
                                .foregroundColor(.white)
                        }
                    }
                    .padding(.horizontal, 8)
                    
                    HStack(spacing: 12) {
                        Button {
                            showLoginModal = false
                        } label: {
                            Text("Cancel")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white.opacity(0.6))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(Color.white.opacity(0.04))
                                .cornerRadius(8)
                        }
                        .buttonStyle(.plain)
                        
                        Button {
                            processAdminLogin()
                        } label: {
                            Text("Authorize")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(Color.red)
                                .cornerRadius(8)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 8)
                }
                .padding(24)
                .frame(width: 380)
                .glassPanel(cornerRadius: 24)
                .zIndex(999)
            }
            
            // --- Administrative Management Dashboard Modal ---
            if showAdminDashboard {
                Color.black.opacity(0.65)
                    .ignoresSafeArea()
                    .onTapGesture { showAdminDashboard = false }
                
                VStack(spacing: 0) {
                    // Modal Header
                    HStack {
                        Image(systemName: "slider.horizontal.3")
                            .foregroundColor(.red)
                            .font(.system(size: 18, weight: .bold))
                        Text("FLKRD Dubbed Administration Dashboard")
                            .font(.system(size: 16, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                        
                        Spacer()
                        
                        Button {
                            showAdminDashboard = false
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white.opacity(0.5))
                                .frame(width: 24, height: 24)
                                .background(Color.white.opacity(0.04))
                                .cornerRadius(12)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(20)
                    
                    Divider().background(Color.white.opacity(0.08))
                    
                    // Tab Bar Selector
                    HStack(spacing: 0) {
                        Button {
                            activeAdminTab = "UPLOAD"
                        } label: {
                            VStack(spacing: 8) {
                                Text("Upload New Film")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(activeAdminTab == "UPLOAD" ? .red : .white.opacity(0.5))
                                
                                Rectangle()
                                    .fill(activeAdminTab == "UPLOAD" ? Color.red : Color.clear)
                                    .frame(height: 2)
                            }
                        }
                        .buttonStyle(.plain)
                        .frame(maxWidth: .infinity)
                        
                        Button {
                            activeAdminTab = "ARCHIVE"
                        } label: {
                            VStack(spacing: 8) {
                                Text("Archive Catalog Management")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(activeAdminTab == "ARCHIVE" ? .red : .white.opacity(0.5))
                                
                                Rectangle()
                                    .fill(activeAdminTab == "ARCHIVE" ? Color.red : Color.clear)
                                    .frame(height: 2)
                            }
                        }
                        .buttonStyle(.plain)
                        .frame(maxWidth: .infinity)
                    }
                    
                    if activeAdminTab == "UPLOAD" {
                        // UPLOAD TAB SCREEN
                        ScrollView {
                            VStack(spacing: 16) {
                                // 1. TMDB Sync Autocomplete Section
                                HStack(spacing: 10) {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("TMDB ID AUTOCOMPLETE")
                                            .font(.system(size: 8, weight: .black))
                                            .foregroundColor(.white.opacity(0.4))
                                        TextField("Enter TMDB ID (e.g. 550)...", text: $uploadTmdbId)
                                            .textFieldStyle(.plain)
                                            .padding(10)
                                            .background(Color.white.opacity(0.04))
                                            .cornerRadius(8)
                                    }
                                    
                                    Button {
                                        syncNewMovieFromTMDB()
                                    } label: {
                                        HStack {
                                            if isSyncingTMDB {
                                                ProgressView().controlSize(.small)
                                            } else {
                                                Image(systemName: "sparkles")
                                            }
                                            Text("Sync Details")
                                        }
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 11)
                                        .background(Color.blue)
                                        .cornerRadius(8)
                                    }
                                    .buttonStyle(.plain)
                                    .disabled(isSyncingTMDB)
                                    .padding(.top, 14)
                                }
                                
                                // Titles
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("ENGLISH/ORIGINAL TITLE")
                                        .font(.system(size: 8, weight: .black))
                                        .foregroundColor(.white.opacity(0.4))
                                    TextField("Enter movie title...", text: $uploadTitle)
                                        .textFieldStyle(.plain)
                                        .padding(10)
                                        .background(Color.white.opacity(0.04))
                                        .cornerRadius(8)
                                }
                                
                                // Description
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("SYNOPSIS/DESCRIPTION")
                                        .font(.system(size: 8, weight: .black))
                                        .foregroundColor(.white.opacity(0.4))
                                    TextEditor(text: $uploadDescription)
                                        .frame(height: 70)
                                        .padding(6)
                                        .background(Color.white.opacity(0.04))
                                        .cornerRadius(8)
                                }
                                
                                // Stream link
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("VIDEO SERVER STREAM URL")
                                        .font(.system(size: 8, weight: .black))
                                        .foregroundColor(.white.opacity(0.4))
                                    TextField("Enter stream link (.mp4, .m3u8)...", text: $uploadVideoUrl)
                                        .textFieldStyle(.plain)
                                        .padding(10)
                                        .background(Color.white.opacity(0.04))
                                        .cornerRadius(8)
                                }
                                
                                // Level Picker & IMDB
                                HStack(spacing: 12) {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("CATALOG LEVEL")
                                            .font(.system(size: 8, weight: .black))
                                            .foregroundColor(.white.opacity(0.4))
                                        
                                        Picker("", selection: $uploadLevel) {
                                            Text("NEW").tag("NEW")
                                            Text("TRENDING").tag("TRENDING")
                                            Text("CLASSIC").tag("CLASSIC")
                                            Text("KING").tag("KING")
                                        }
                                        .pickerStyle(.menu)
                                        .labelsHidden()
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("IMDB ID")
                                            .font(.system(size: 8, weight: .black))
                                            .foregroundColor(.white.opacity(0.4))
                                        TextField("tt1234567", text: $uploadImdbId)
                                            .textFieldStyle(.plain)
                                            .padding(10)
                                            .background(Color.white.opacity(0.04))
                                            .cornerRadius(8)
                                    }
                                }
                                
                                // Native macOS Image upload pickers
                                HStack(spacing: 12) {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("POSTER PORTRAIT IMAGE")
                                            .font(.system(size: 8, weight: .black))
                                            .foregroundColor(.white.opacity(0.4))
                                        
                                        Button {
                                            selectAndConvertImage(isBanner: false) { base64 in
                                                uploadImageBase64 = base64
                                                triggerToast(message: "Poster base64 loaded successfully!", isError: false)
                                            }
                                        } label: {
                                            HStack {
                                                Image(systemName: "photo.badge.plus")
                                                Text(uploadImageBase64.isEmpty ? "Select Poster File" : "Poster Uploaded ✓")
                                            }
                                            .font(.system(size: 11, weight: .bold))
                                            .foregroundColor(.white)
                                            .padding(.vertical, 8)
                                            .frame(maxWidth: .infinity)
                                            .background(uploadImageBase64.isEmpty ? Color.white.opacity(0.06) : Color.green.opacity(0.25))
                                            .cornerRadius(8)
                                        }
                                        .buttonStyle(.plain)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("BANNER LANDSCAPE IMAGE")
                                            .font(.system(size: 8, weight: .black))
                                            .foregroundColor(.white.opacity(0.4))
                                        
                                        Button {
                                            selectAndConvertImage(isBanner: true) { base64 in
                                                uploadBannerBase64 = base64
                                                triggerToast(message: "Landscape banner base64 loaded!", isError: false)
                                            }
                                        } label: {
                                            HStack {
                                                Image(systemName: "photo.badge.plus")
                                                Text(uploadBannerBase64.isEmpty ? "Select Banner File" : "Banner Uploaded ✓")
                                            }
                                            .font(.system(size: 11, weight: .bold))
                                            .foregroundColor(.white)
                                            .padding(.vertical, 8)
                                            .frame(maxWidth: .infinity)
                                            .background(uploadBannerBase64.isEmpty ? Color.white.opacity(0.06) : Color.green.opacity(0.25))
                                            .cornerRadius(8)
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                                
                                Button {
                                    uploadMovieToSupabase()
                                } label: {
                                    HStack {
                                        if isUploading {
                                            ProgressView().controlSize(.small)
                                        } else {
                                            Image(systemName: "film.stack.fill")
                                        }
                                        Text("Broadcast Dubbed Movie Live")
                                    }
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.vertical, 12)
                                    .frame(maxWidth: .infinity)
                                    .background(Color.red)
                                    .cornerRadius(8)
                                }
                                .buttonStyle(.plain)
                                .disabled(isUploading)
                                .padding(.top, 8)
                            }
                            .padding(20)
                        }
                    } else {
                        // ARCHIVE CATALOG MANAGER TAB SCREEN
                        VStack(spacing: 0) {
                            // Archive Filter Search bar
                            HStack {
                                Image(systemName: "magnifyingglass")
                                    .foregroundColor(.white.opacity(0.4))
                                TextField("Quick search archive...", text: $archiveSearchQuery)
                                    .textFieldStyle(.plain)
                            }
                            .padding(10)
                            .background(Color.white.opacity(0.04))
                            .cornerRadius(10)
                            .padding(16)
                            
                            ScrollView {
                                let archiveFiltered = movies.filter { movie in
                                    if archiveSearchQuery.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return true }
                                    return movie.title.lowercased().contains(archiveSearchQuery.lowercased()) ||
                                           movie.kurdishTitle.lowercased().contains(archiveSearchQuery.lowercased())
                                }
                                
                                if archiveFiltered.isEmpty {
                                    Text("No matching catalog elements found in archive.")
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(.white.opacity(0.4))
                                        .padding(.vertical, 40)
                                } else {
                                    LazyVStack(spacing: 8) {
                                        ForEach(archiveFiltered) { movie in
                                            HStack(spacing: 12) {
                                                Base64Image(base64String: movie.imageBase64, placeholderSystemName: "film")
                                                    .frame(width: 32, height: 48)
                                                    .cornerRadius(6)
                                                
                                                VStack(alignment: .leading, spacing: 2) {
                                                    Text(movie.title)
                                                        .font(.system(size: 12, weight: .bold))
                                                        .foregroundColor(.white)
                                                    Text(movie.kurdishTitle)
                                                        .font(.system(size: 11))
                                                        .foregroundColor(.white.opacity(0.4))
                                                }
                                                
                                                Spacer()
                                                
                                                Text(movie.level ?? "NEW")
                                                    .font(.system(size: 8, weight: .bold))
                                                    .foregroundColor(.black)
                                                    .padding(.horizontal, 6)
                                                    .padding(.vertical, 2)
                                                    .background(Color.yellow)
                                                    .cornerRadius(4)
                                                
                                                HStack(spacing: 6) {
                                                    Button {
                                                        openMovieForEdit(movie)
                                                    } label: {
                                                        Image(systemName: "pencil")
                                                            .font(.system(size: 10, weight: .bold))
                                                            .foregroundColor(.white)
                                                            .frame(width: 26, height: 26)
                                                            .background(Color.white.opacity(0.06))
                                                            .cornerRadius(6)
                                                    }
                                                    .buttonStyle(.plain)
                                                    
                                                    Button {
                                                        deleteMovieFromSupabase(movie)
                                                    } label: {
                                                        Image(systemName: "trash.fill")
                                                            .font(.system(size: 10, weight: .bold))
                                                            .foregroundColor(.red)
                                                            .frame(width: 26, height: 26)
                                                            .background(Color.red.opacity(0.12))
                                                            .cornerRadius(6)
                                                    }
                                                    .buttonStyle(.plain)
                                                }
                                            }
                                            .padding(.horizontal, 16)
                                            .padding(.vertical, 8)
                                            .background(Color.white.opacity(0.02))
                                            .cornerRadius(10)
                                        }
                                    }
                                    .padding(.horizontal, 16)
                                }
                            }
                        }
                    }
                }
                .frame(width: 580, height: 500)
                .glassPanel(cornerRadius: 24)
                .zIndex(999)
            }
            
            // --- EDIT SUB-MODAL PANEL ---
            if showEditModal, let _ = editingMovie {
                Color.black.opacity(0.65)
                    .ignoresSafeArea()
                    .onTapGesture { showEditModal = false }
                
                VStack(spacing: 0) {
                    HStack {
                        Image(systemName: "pencil")
                            .foregroundColor(.blue)
                            .font(.system(size: 18, weight: .bold))
                        Text("Edit Movie Data Record")
                            .font(.system(size: 16, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                        
                        Spacer()
                        
                        Button {
                            showEditModal = false
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white.opacity(0.5))
                                .frame(width: 24, height: 24)
                                .background(Color.white.opacity(0.04))
                                .cornerRadius(12)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(20)
                    
                    Divider().background(Color.white.opacity(0.08))
                    
                    ScrollView {
                        VStack(spacing: 16) {
                            // TMDB Sync
                            HStack(spacing: 10) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("TMDB ID AUTOCOMPLETE")
                                        .font(.system(size: 8, weight: .black))
                                        .foregroundColor(.white.opacity(0.4))
                                    TextField("Enter TMDB ID...", text: $editTmdbId)
                                        .textFieldStyle(.plain)
                                        .padding(10)
                                        .background(Color.white.opacity(0.04))
                                        .cornerRadius(8)
                                }
                                
                                Button {
                                    syncEditingMovieFromTMDB()
                                } label: {
                                    HStack {
                                        if isEditingSyncing {
                                            ProgressView().controlSize(.small)
                                        } else {
                                            Image(systemName: "sparkles")
                                        }
                                        Text("Sync Details")
                                    }
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 11)
                                    .background(Color.blue)
                                    .cornerRadius(8)
                                }
                                .buttonStyle(.plain)
                                .disabled(isEditingSyncing)
                                .padding(.top, 14)
                            }
                            
                            // Titles
                            VStack(alignment: .leading, spacing: 4) {
                                Text("ENGLISH/ORIGINAL TITLE")
                                    .font(.system(size: 8, weight: .black))
                                    .foregroundColor(.white.opacity(0.4))
                                TextField("Enter movie title...", text: $editTitle)
                                    .textFieldStyle(.plain)
                                    .padding(10)
                                    .background(Color.white.opacity(0.04))
                                    .cornerRadius(8)
                            }
                            
                            // Description
                            VStack(alignment: .leading, spacing: 4) {
                                Text("SYNOPSIS/DESCRIPTION")
                                    .font(.system(size: 8, weight: .black))
                                    .foregroundColor(.white.opacity(0.4))
                                TextEditor(text: $editDescription)
                                    .frame(height: 70)
                                    .padding(6)
                                    .background(Color.white.opacity(0.04))
                                    .cornerRadius(8)
                            }
                            
                            // Stream
                            VStack(alignment: .leading, spacing: 4) {
                                Text("VIDEO SERVER STREAM URL")
                                    .font(.system(size: 8, weight: .black))
                                    .foregroundColor(.white.opacity(0.4))
                                TextField("Enter stream link...", text: $editVideoUrl)
                                    .textFieldStyle(.plain)
                                    .padding(10)
                                    .background(Color.white.opacity(0.04))
                                    .cornerRadius(8)
                            }
                            
                            // Pickers
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("LEVEL")
                                        .font(.system(size: 8, weight: .black))
                                        .foregroundColor(.white.opacity(0.4))
                                    
                                    Picker("", selection: $editLevel) {
                                        Text("NEW").tag("NEW")
                                        Text("TRENDING").tag("TRENDING")
                                        Text("CLASSIC").tag("CLASSIC")
                                        Text("KING").tag("KING")
                                    }
                                    .pickerStyle(.menu)
                                    .labelsHidden()
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                }
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("IMDB ID")
                                        .font(.system(size: 8, weight: .black))
                                        .foregroundColor(.white.opacity(0.4))
                                    TextField("tt1234567", text: $editImdbId)
                                        .textFieldStyle(.plain)
                                        .padding(10)
                                        .background(Color.white.opacity(0.04))
                                        .cornerRadius(8)
                                }
                            }
                            
                            // Base64 pickers
                            HStack(spacing: 12) {
                                Button {
                                    selectAndConvertImage(isBanner: false) { base64 in
                                        editImageBase64 = base64
                                        triggerToast(message: "Poster base64 loaded successfully!", isError: false)
                                    }
                                } label: {
                                    HStack {
                                        Image(systemName: "photo.badge.plus")
                                        Text("Replace Poster File")
                                    }
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.vertical, 8)
                                    .frame(maxWidth: .infinity)
                                    .background(Color.white.opacity(0.06))
                                    .cornerRadius(8)
                                }
                                .buttonStyle(.plain)
                                
                                Button {
                                    selectAndConvertImage(isBanner: true) { base64 in
                                        editBannerBase64 = base64
                                        triggerToast(message: "Landscape banner base64 loaded!", isError: false)
                                    }
                                } label: {
                                    HStack {
                                        Image(systemName: "photo.badge.plus")
                                        Text("Replace Banner File")
                                    }
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.vertical, 8)
                                    .frame(maxWidth: .infinity)
                                    .background(Color.white.opacity(0.06))
                                    .cornerRadius(8)
                                }
                                .buttonStyle(.plain)
                            }
                            
                            Button {
                                updateMovieInSupabase()
                            } label: {
                                HStack {
                                    if isUpdating {
                                        ProgressView().controlSize(.small)
                                    } else {
                                        Image(systemName: "checkmark.circle.fill")
                                    }
                                    Text("Apply Changes and Sync Devices")
                                }
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.vertical, 12)
                                .frame(maxWidth: .infinity)
                                .background(Color.blue)
                                .cornerRadius(8)
                            }
                            .buttonStyle(.plain)
                            .disabled(isUpdating)
                            .padding(.top, 8)
                        }
                        .padding(20)
                    }
                }
                .frame(width: 540, height: 480)
                .glassPanel(cornerRadius: 24)
                .zIndex(1001)
            }
        }
        .onAppear {
            isAdmin = UserDefaults.standard.bool(forKey: "flkrd_is_admin")
            loadDubbedMovies()
        }
        .onReceive(rotationTimer) { _ in
            let heroMoviesCount = movies.prefix(10).count
            if heroMoviesCount > 1 {
                withAnimation(.easeInOut(duration: 1.2)) {
                    currentHeroIndex = (currentHeroIndex + 1) % heroMoviesCount
                }
            }
        }
        .sheet(item: $selectedMovie) { movie in
            DetailView(mediaItem: MediaItem(
                id: Int(movie.id) ?? 999,
                title: movie.title,
                name: nil,
                originalTitle: movie.kurdishTitle,
                originalName: nil,
                posterPath: nil,
                backdropPath: nil,
                overview: movie.description ?? "Kurdish dubbed cinematic content synced from Supabase backend.",
                voteAverage: 8.9,
                releaseDate: nil,
                firstAirDate: nil,
                mediaType: movie.mediaType
            ), customDubbedMovie: movie)
        }
    }
    
    // MARK: - Local database / filter algorithms
    
    private func loadDubbedMovies() {
        loading = true
        Task {
            do {
                let fetched = try await NetworkService.shared.fetchDubbedMovies()
                DispatchQueue.main.async {
                    self.movies = fetched
                    filterContent()
                    self.loading = false
                }
            } catch {
                print("Failed loading dubbed catalog: \(error)")
                DispatchQueue.main.async {
                    self.loading = false
                    triggerToast(message: "Network Sync Failure: Offline cache fallback active.", isError: true)
                }
            }
        }
    }
    
    private func filterContent() {
        var result = movies
        
        // Level filter caps
        if selectedLevel != "ALL" {
            result = result.filter { ($0.level ?? "").uppercased() == selectedLevel }
        }
        
        // Search text
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !query.isEmpty {
            result = result.filter {
                $0.title.lowercased().contains(query) ||
                $0.kurdishTitle.lowercased().contains(query) ||
                ($0.description ?? "").lowercased().contains(query)
            }
        }
        
        self.filteredMovies = result
    }
    
    private func copyShareLink(_ movie: DubbedMovie) {
        let textToCopy = "Exclusively on FLKRD MOVIES: Watch '\(movie.title)' in high-definition Kurdish Dubbing! Stream Server: \(movie.videoUrl)"
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(textToCopy, forType: .string)
        triggerToast(message: "Kurdish share details copied to pasteboard!", isError: false)
    }
    
    private func triggerToast(message: String, isError: Bool) {
        toastMessage = message
        isToastError = isError
        withAnimation(.easeOut(duration: 0.3)) {
            showToast = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.5) {
            withAnimation(.easeIn(duration: 0.3)) {
                showToast = false
            }
        }
    }
    
    // MARK: - Admin Handlers
    
    private func processAdminLogin() {
        if adminEmail == "flkrdstudio@gmail.com" && adminPassword == "Zanabarzani1919@" {
            isAdmin = true
            UserDefaults.standard.set(true, forKey: "flkrd_is_admin")
            showLoginModal = false
            showAdminDashboard = true
            triggerToast(message: "Authentication Succeeded. Welcome, Zana.", isError: false)
        } else {
            triggerToast(message: "Invalid admin credentials. Access denied.", isError: true)
        }
    }
    
    // TMDB Syncer for new uploads
    private func syncNewMovieFromTMDB() {
        guard let tmdbIdNum = Int(uploadTmdbId) else {
            triggerToast(message: "Enter a valid numeric TMDB ID first.", isError: true)
            return
        }
        
        isSyncingTMDB = true
        Task {
            do {
                let movie = try await NetworkService.shared.fetchTMDBMovieDetails(id: tmdbIdNum)
                let imdb = try await NetworkService.shared.fetchTMDBMovieExternalIds(id: tmdbIdNum)
                
                DispatchQueue.main.async {
                    self.uploadTitle = "فیلمی دۆبلاژکراوی کوردی \(movie.computedTitle)"
                    self.uploadDescription = movie.overview ?? "No synopsis provided."
                    self.uploadImdbId = imdb ?? ""
                    
                    if let poster = movie.posterPath, !poster.isEmpty {
                        self.uploadImageBase64 = "https://image.tmdb.org/t/p/w500\(poster)"
                    }
                    if let backdrop = movie.backdropPath, !backdrop.isEmpty {
                        self.uploadBannerBase64 = "https://image.tmdb.org/t/p/original\(backdrop)"
                    }
                    
                    self.isSyncingTMDB = false
                    triggerToast(message: "TMDB Data Synced into fields!", isError: false)
                }
            } catch {
                DispatchQueue.main.async {
                    self.isSyncingTMDB = false
                    triggerToast(message: "TMDB Sync Error: \(error.localizedDescription)", isError: true)
                }
            }
        }
    }
    
    // TMDB Syncer for edits
    private func syncEditingMovieFromTMDB() {
        guard let tmdbIdNum = Int(editTmdbId) else {
            triggerToast(message: "Enter a valid numeric TMDB ID first.", isError: true)
            return
        }
        
        isEditingSyncing = true
        Task {
            do {
                let movie = try await NetworkService.shared.fetchTMDBMovieDetails(id: tmdbIdNum)
                let imdb = try await NetworkService.shared.fetchTMDBMovieExternalIds(id: tmdbIdNum)
                
                DispatchQueue.main.async {
                    self.editTitle = "فیلمی دۆبلاژکراوی کوردی \(movie.computedTitle)"
                    self.editDescription = movie.overview ?? "No synopsis provided."
                    self.editImdbId = imdb ?? ""
                    
                    if let poster = movie.posterPath, !poster.isEmpty {
                        self.editImageBase64 = "https://image.tmdb.org/t/p/w500\(poster)"
                    }
                    if let backdrop = movie.backdropPath, !backdrop.isEmpty {
                        self.editBannerBase64 = "https://image.tmdb.org/t/p/original\(backdrop)"
                    }
                    
                    self.isEditingSyncing = false
                    triggerToast(message: "TMDB details populated!", isError: false)
                }
            } catch {
                DispatchQueue.main.async {
                    self.isEditingSyncing = false
                    triggerToast(message: "TMDB Sync Error: \(error.localizedDescription)", isError: true)
                }
            }
        }
    }
    
    // File Picker and Image Compression Base64 conversion
    private func selectAndConvertImage(isBanner: Bool, completion: @escaping (String) -> Void) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        panel.allowedContentTypes = [.image, .png, .jpeg]
        
        if panel.runModal() == .OK, let url = panel.url {
            if let data = try? Data(contentsOf: url) {
                if let nsImage = NSImage(data: data) {
                    let targetSize = isBanner ? NSSize(width: 1280, height: 720) : NSSize(width: 800, height: 1200)
                    if let resizedImage = resizeNSImage(nsImage, to: targetSize),
                       let tiffRepresentation = resizedImage.tiffRepresentation,
                       let bitmapImage = NSBitmapImageRep(data: tiffRepresentation),
                       let jpegData = bitmapImage.representation(using: .jpeg, properties: [.compressionFactor: 0.7]) {
                        let base64 = "data:image/jpeg;base64," + jpegData.base64EncodedString()
                        completion(base64)
                    } else {
                        let base64 = "data:image/jpeg;base64," + data.base64EncodedString()
                        completion(base64)
                    }
                }
            }
        }
    }
    
    private func resizeNSImage(_ image: NSImage, to newSize: NSSize) -> NSImage? {
        let newImage = NSImage(size: newSize)
        newImage.lockFocus()
        image.draw(in: NSRect(origin: .zero, size: newSize),
                   from: NSRect(origin: .zero, size: image.size),
                   operation: .copy,
                   fraction: 1.0)
        newImage.unlockFocus()
        return newImage
    }
    
    // Upload Action
    private func uploadMovieToSupabase() {
        if uploadTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
            uploadVideoUrl.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            triggerToast(message: "Movie Title and Stream URL are mandatory.", isError: true)
            return
        }
        
        isUploading = true
        Task {
            do {
                let poster = uploadImageBase64.isEmpty ? "https://raw.githubusercontent.com/flkrd/cdn/main/default-poster.webp" : uploadImageBase64
                let tmdb = Int(uploadTmdbId)
                
                let _ = try await NetworkService.shared.insertDubbedMovie(
                    title: uploadTitle,
                    description: uploadDescription,
                    videoUrl: uploadVideoUrl,
                    imageBase64: poster,
                    bannerBase64: uploadBannerBase64.isEmpty ? nil : uploadBannerBase64,
                    level: uploadLevel,
                    imdbId: uploadImdbId.isEmpty ? nil : uploadImdbId,
                    tmdbId: tmdb
                )
                
                let freshMovies = try await NetworkService.shared.fetchDubbedMovies()
                
                DispatchQueue.main.async {
                    self.movies = freshMovies
                    self.filterContent()
                    self.isUploading = false
                    self.showAdminDashboard = false
                    
                    // Reset fields
                    self.uploadTitle = ""
                    self.uploadDescription = ""
                    self.uploadVideoUrl = ""
                    self.uploadImageBase64 = ""
                    self.uploadBannerBase64 = ""
                    self.uploadLevel = "NEW"
                    self.uploadImdbId = ""
                    self.uploadTmdbId = ""
                    
                    self.triggerToast(message: "🎬 Kurdish Dubbed movie uploaded successfully!", isError: false)
                }
            } catch {
                DispatchQueue.main.async {
                    self.isUploading = false
                    self.triggerToast(message: "Upload Failed: \(error.localizedDescription)", isError: true)
                }
            }
        }
    }
    
    // Edit Action
    private func openMovieForEdit(_ movie: DubbedMovie) {
        editingMovie = movie
        editTitle = movie.title
        editDescription = movie.description ?? ""
        editVideoUrl = movie.videoUrl
        editImageBase64 = movie.imageBase64 ?? ""
        editBannerBase64 = movie.bannerBase64 ?? ""
        editLevel = movie.level ?? "NEW"
        editImdbId = movie.imdbId ?? ""
        editTmdbId = movie.tmdbId != nil ? String(movie.tmdbId!) : ""
        
        showEditModal = true
        
        // Fetch full record to get bannerBase64 dynamically since bulk fetch omits it
        Task {
            do {
                if let fullMovie = try await NetworkService.shared.fetchSingleDubbedMovie(id: movie.id) {
                    DispatchQueue.main.async {
                        if self.editingMovie?.id == movie.id {
                            self.editingMovie = fullMovie
                            self.editBannerBase64 = fullMovie.bannerBase64 ?? ""
                            self.editImageBase64 = fullMovie.imageBase64 ?? ""
                            self.editDescription = fullMovie.description ?? ""
                        }
                    }
                }
            } catch {
                print("Failed to fetch full movie details for editing: \(error)")
            }
        }
    }
    
    private func updateMovieInSupabase() {
        guard let movie = editingMovie else { return }
        
        if editTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
            editVideoUrl.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            triggerToast(message: "Movie Title and Stream URL cannot be empty.", isError: true)
            return
        }
        
        isUpdating = true
        Task {
            do {
                let poster = editImageBase64.isEmpty ? "https://raw.githubusercontent.com/flkrd/cdn/main/default-poster.webp" : editImageBase64
                let tmdb = Int(editTmdbId)
                
                try await NetworkService.shared.updateDubbedMovie(
                    id: movie.id,
                    title: editTitle,
                    description: editDescription,
                    videoUrl: editVideoUrl,
                    imageBase64: poster,
                    bannerBase64: editBannerBase64.isEmpty ? nil : editBannerBase64,
                    level: editLevel,
                    imdbId: editImdbId.isEmpty ? nil : editImdbId,
                    tmdbId: tmdb
                )
                
                let freshMovies = try await NetworkService.shared.fetchDubbedMovies()
                
                DispatchQueue.main.async {
                    self.movies = freshMovies
                    self.filterContent()
                    self.isUpdating = false
                    self.showEditModal = false
                    self.editingMovie = nil
                    
                    self.triggerToast(message: "✓ Dubbed movie record successfully updated!", isError: false)
                }
            } catch {
                DispatchQueue.main.async {
                    self.isUpdating = false
                    self.triggerToast(message: "Update Failed: \(error.localizedDescription)", isError: true)
                }
            }
        }
    }
    
    // Delete Action
    private func deleteMovieFromSupabase(_ movie: DubbedMovie) {
        let alert = NSAlert()
        alert.messageText = "Confirm Movie Termination"
        alert.informativeText = "Are you absolutely sure you want to permanently delete '\(movie.title)' from the Supabase database? This action cannot be undone."
        alert.alertStyle = .critical
        alert.addButton(withTitle: "Delete Permanently")
        alert.addButton(withTitle: "Cancel")
        
        if alert.runModal() == .alertFirstButtonReturn {
            Task {
                do {
                    try await NetworkService.shared.deleteDubbedMovie(id: movie.id)
                    let freshMovies = try await NetworkService.shared.fetchDubbedMovies()
                    
                    DispatchQueue.main.async {
                        self.movies = freshMovies
                        self.filterContent()
                        self.triggerToast(message: "Node Terminated: Movie permanently removed.", isError: false)
                    }
                } catch {
                    DispatchQueue.main.async {
                        self.triggerToast(message: "Deletion Failed: \(error.localizedDescription)", isError: true)
                    }
                }
            }
        }
    }
}
