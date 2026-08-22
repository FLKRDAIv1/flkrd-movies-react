//
//  SettingsView.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import SwiftUI

struct SettingsView: View {
    @ObservedObject var lang = LocalizationService.shared
    @ObservedObject var glassConfig = GlassConfigManager.shared
    
    @State private var selectedTab = "General"
    @State private var settings = PlaybackSettings()
    
    // Subtitle & Translation settings
    @AppStorage("defaultSubtitleLang") private var defaultSubtitleLang = "ku"
    @AppStorage("autoTranslateKurdish") private var autoTranslateKurdish = true
    @AppStorage("defaultSubtitleSize") private var defaultSubtitleSize = 22.0
    @AppStorage("subtitleTextColor") private var subtitleTextColor = "Yellow"
    @AppStorage("subtitleBackgroundOpacity") private var subtitleBackgroundOpacity = 0.55
    
    // Admin state
    @State private var adminPassword = ""
    @State private var isAuthorizedAdmin = false
    @State private var adminAuthError = ""
    @State private var cacheCleared = false
    @State private var syncStatus = "Ready"
    @State private var bannedSearchQuery = ""
    
    // Dropdown selectors lists
    let presets = ["Auto (Recommended)", "High Quality (4K)", "Medium Balance (1080p)", "Low Bandwidth (720p)"]
    let resolutions = ["Native (Match Display)", "4K UHD (2160p)", "Full HD (1080p)", "HD Ready (720p)"]
    let framerates = ["Auto (Match Source)", "120 FPS Limit", "60 FPS Limit", "30 FPS Limit"]
    
    let accentColors: [(name: String, color: Color)] = [
         ("Blue", .blue),
         ("Cyan", .cyan),
         ("Purple", .purple),
         ("Pink", .pink),
         ("Orange", .orange),
         ("Red", .red),
         ("Green", .green)
    ]
    
    let sidebarSections: [(id: String, title: String, icon: String, color: Color)] = [
        ("General", "General", "gearshape.fill", .gray),
        ("Playback", "Playback Engine", "play.circle.fill", .blue),
        ("Liquid Glass", "Liquid Glass & UI", "sparkles", .purple),
        ("Subtitles & AI", "Subtitles & AI Studio", "captions.bubble.fill", .yellow),
        ("Admin Portal", "Admin & Banned List", "lock.shield.fill", .red),
        ("About", "About FLKRD", "info.circle.fill", .cyan)
    ]
    
    var body: some View {
        HStack(spacing: 0) {
            // 1. Native macOS Settings Sidebar Column
            VStack(spacing: 6) {
                // Settings Header
                HStack(spacing: 10) {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.blue)
                    Text("Preferences")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.top, 24)
                .padding(.bottom, 12)
                
                Divider().background(Color.white.opacity(0.08))
                
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 4) {
                        ForEach(sidebarSections, id: \.id) { section in
                            Button {
                                withAnimation(.spring(response: 0.25, dampingFraction: 0.75)) {
                                    selectedTab = section.id
                                }
                            } label: {
                                HStack(spacing: 12) {
                                    ZStack {
                                        RoundedRectangle(cornerRadius: 7)
                                            .fill(section.color.opacity(selectedTab == section.id ? 0.9 : 0.2))
                                            .frame(width: 26, height: 26)
                                        Image(systemName: section.icon)
                                            .font(.system(size: 13, weight: .semibold))
                                            .foregroundColor(selectedTab == section.id ? .white : section.color)
                                    }
                                    
                                    Text(section.title)
                                        .font(.system(size: 13, weight: selectedTab == section.id ? .semibold : .medium))
                                        .foregroundColor(selectedTab == section.id ? .white : .white.opacity(0.75))
                                    
                                    Spacer()
                                    
                                    if selectedTab == section.id {
                                        Circle()
                                            .fill(Color.blue)
                                            .frame(width: 6, height: 6)
                                    }
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(
                                    selectedTab == section.id ?
                                    Color.white.opacity(0.12) : Color.clear
                                )
                                .cornerRadius(10)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 10)
                    .padding(.top, 10)
                }
                
                Spacer()
                
                // Footer Version info
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("FLKRD MOVIES PRO")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.white.opacity(0.7))
                        Text("Build 2.0 • Native macOS")
                            .font(.system(size: 9))
                            .foregroundColor(.white.opacity(0.4))
                    }
                    Spacer()
                }
                .padding(16)
            }
            .frame(width: 220)
            .background(
                ZStack {
                    VisualEffectView(material: .sidebar, blendingMode: .behindWindow)
                    Color.black.opacity(0.25)
                }
            )
            
            Divider().background(Color.white.opacity(0.08))
            
            // 2. Settings Content Viewport
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 24) {
                    switch selectedTab {
                    case "General":
                        generalSettingsTab
                    case "Playback":
                        playbackSettingsTab
                    case "Liquid Glass":
                        liquidGlassTab
                    case "Subtitles & AI":
                        subtitlesSettingsTab
                    case "Admin Portal":
                        adminPortalTab
                    case "About":
                        aboutTab
                    default:
                        generalSettingsTab
                    }
                }
                .padding(32)
                .frame(maxWidth: 820, alignment: .leading)
            }
            .background(Color.black.opacity(0.15))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - 1. General Tab
    private var generalSettingsTab: some View {
        VStack(alignment: .leading, spacing: 22) {
            headerSection(title: "General Preferences", subtitle: "Language, accent color and disk cache management.")
            
            // Language Selection
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Image(systemName: "globe")
                        .foregroundColor(.blue)
                    Text(lang.t("language"))
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }
                
                HStack(spacing: 12) {
                    LanguagePill(title: "English", code: "en", isSelected: lang.selectedLanguage == "en") {
                        lang.selectedLanguage = "en"
                    }
                    LanguagePill(title: "کوردی (سۆرانی)", code: "ku", isSelected: lang.selectedLanguage == "ku") {
                        lang.selectedLanguage = "ku"
                    }
                    LanguagePill(title: "کوردی (بادینی)", code: "badini", isSelected: lang.selectedLanguage == "badini") {
                        lang.selectedLanguage = "badini"
                    }
                }
            }
            .padding(18)
            .nativeMacGlass(cornerRadius: 14)
            
            // Accent Color Selection
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Image(systemName: "paintpalette.fill")
                        .foregroundColor(.purple)
                    Text(lang.t("accentColor"))
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }
                
                HStack(spacing: 16) {
                    ForEach(accentColors, id: \.name) { item in
                        Button {
                            lang.selectedAccentColor = item.name
                        } label: {
                            ZStack {
                                Circle()
                                    .fill(item.color)
                                    .frame(width: 32, height: 32)
                                
                                if lang.selectedAccentColor == item.name {
                                    Circle()
                                        .stroke(Color.white, lineWidth: 2.5)
                                        .frame(width: 38, height: 38)
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 11, weight: .black))
                                        .foregroundColor(.white)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(18)
            .nativeMacGlass(cornerRadius: 14)
            
            // App Storage & Cache
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Image(systemName: "internaldrive.fill")
                        .foregroundColor(.cyan)
                    Text("Storage & Cache Management")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }
                
                HStack {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Clear Stream & Poster Image Cache")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.white.opacity(0.9))
                        Text("Frees up temporary cached posters, subtitles and video chunks.")
                            .font(.system(size: 11))
                            .foregroundColor(.white.opacity(0.5))
                    }
                    Spacer()
                    TactileMacButton {
                        URLCache.shared.removeAllCachedResponses()
                        cacheCleared = true
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                            cacheCleared = false
                        }
                    } content: {
                        HStack(spacing: 6) {
                            Image(systemName: cacheCleared ? "checkmark.circle.fill" : "trash.fill")
                            Text(cacheCleared ? "Cleared!" : "Clear Cache")
                        }
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(cacheCleared ? .green : .white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(cacheCleared ? Color.green.opacity(0.2) : Color.white.opacity(0.08))
                        .cornerRadius(8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(cacheCleared ? Color.green.opacity(0.4) : Color.white.opacity(0.15), lineWidth: 1)
                        )
                    }
                }
            }
            .padding(18)
            .nativeMacGlass(cornerRadius: 14)
        }
    }
    
    // MARK: - 2. Playback Tab
    private var playbackSettingsTab: some View {
        VStack(alignment: .leading, spacing: 22) {
            headerSection(title: "Playback & Video Engine", subtitle: "Stream resolution, frame rate limits and Metal acceleration.")
            
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    Image(systemName: "film.fill")
                        .foregroundColor(.blue)
                    Text("Quality & Decoding")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }
                
                HStack {
                    Text(lang.t("videoQualityPreset"))
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.8))
                    Spacer()
                    Menu {
                        ForEach(presets, id: \.self) { preset in
                            Button(preset) { settings.videoQualityPreset = preset }
                        }
                    } label: {
                        Text(settings.videoQualityPreset)
                            .font(.system(size: 12, weight: .bold))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.white.opacity(0.08))
                            .cornerRadius(6)
                    }
                }
                
                Divider().background(Color.white.opacity(0.06))
                
                HStack {
                    Text(lang.t("maxResolution"))
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.8))
                    Spacer()
                    Menu {
                        ForEach(resolutions, id: \.self) { res in
                            Button(res) { settings.maxResolution = res }
                        }
                    } label: {
                        Text(settings.maxResolution)
                            .font(.system(size: 12, weight: .bold))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.white.opacity(0.08))
                            .cornerRadius(6)
                    }
                }
                
                Divider().background(Color.white.opacity(0.06))
                
                HStack {
                    Text(lang.t("frameRateLimit"))
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.8))
                    Spacer()
                    Menu {
                        ForEach(framerates, id: \.self) { rate in
                            Button(rate) { settings.frameRateLimit = rate }
                        }
                    } label: {
                        Text(settings.frameRateLimit)
                            .font(.system(size: 12, weight: .bold))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.white.opacity(0.08))
                            .cornerRadius(6)
                    }
                }
            }
            .padding(18)
            .nativeMacGlass(cornerRadius: 14)
            
            // Performance Toggles
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Image(systemName: "cpu.fill")
                        .foregroundColor(.green)
                    Text("GPU & Energy Efficiency")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }
                
                Toggle(isOn: $settings.reduceQualityOnBattery) {
                    Text("Optimize Rendering on Battery Power")
                        .font(.system(size: 13))
                }
                .toggleStyle(GlassToggleStyle(activeColor: lang.accentColor))
                
                Divider().background(Color.white.opacity(0.06))
                
                Toggle(isOn: $settings.pauseWhenFullscreen) {
                    Text("Hardware Metal Shader Acceleration")
                        .font(.system(size: 13))
                }
                .toggleStyle(GlassToggleStyle(activeColor: lang.accentColor))
            }
            .padding(18)
            .nativeMacGlass(cornerRadius: 14)
        }
    }
    
    // MARK: - 3. Liquid Glass Tab
    private var liquidGlassTab: some View {
        VStack(alignment: .leading, spacing: 22) {
            headerSection(title: "Liquid Glass & UI Customization", subtitle: "Tune translucent vibrancy, blur depth and specular borders in real time.")
            
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    Image(systemName: "sparkles")
                        .foregroundColor(.purple)
                    Text("Glass Shaders & Materials")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                    Spacer()
                    TactileMacButton {
                        syncStatus = "Syncing..."
                        glassConfig.syncWithSupabase()
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                            syncStatus = "Synced"
                        }
                    } content: {
                        HStack(spacing: 5) {
                            Image(systemName: "arrow.triangle.2.circlepath")
                            Text(syncStatus)
                        }
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.cyan)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(Color.cyan.opacity(0.12))
                        .cornerRadius(6)
                    }
                }
                
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Vibrancy Blur Strength")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.white.opacity(0.85))
                        Spacer()
                        Text("\(Int(glassConfig.blurAmount))px")
                            .font(.system(size: 12, weight: .bold, design: .monospaced))
                    }
                    GlassSlider(value: $glassConfig.blurAmount, bounds: 5...60, step: 1, activeColor: .cyan)
                }
                
                Divider().background(Color.white.opacity(0.06))
                
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Specular Highlight Intensity")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.white.opacity(0.85))
                        Spacer()
                        Text(String(format: "%.0f%%", glassConfig.borderOpacity * 100))
                            .font(.system(size: 12, weight: .bold, design: .monospaced))
                    }
                    GlassSlider(value: $glassConfig.borderOpacity, bounds: 0.05...0.6, step: 0.05, activeColor: .cyan)
                }
                
                Divider().background(Color.white.opacity(0.06))
                
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Panel Corner Smoothness")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.white.opacity(0.85))
                        Spacer()
                        Text("\(Int(glassConfig.cornerRadius))px")
                            .font(.system(size: 12, weight: .bold, design: .monospaced))
                    }
                    GlassSlider(
                        value: Binding(
                            get: { Double(glassConfig.cornerRadius) },
                            set: { glassConfig.cornerRadius = CGFloat($0) }
                        ),
                        bounds: 8...36,
                        step: 1,
                        activeColor: .cyan
                    )
                }
            }
            .padding(18)
            .nativeMacGlass(cornerRadius: 14)
        }
    }
    
    // MARK: - 4. Subtitles & AI Studio Tab
    private var subtitlesSettingsTab: some View {
        VStack(alignment: .leading, spacing: 22) {
            headerSection(title: "Subtitles & Kurdish AI Studio", subtitle: "Live subtitle typography customization and Google Apps Script translator.")
            
            // Live Preview Sandbox Card
            VStack(alignment: .leading, spacing: 12) {
                Text("LIVE SUBTITLE PREVIEW")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(.yellow)
                
                ZStack {
                    // Movie scene simulator background
                    Image("flkrd-logo")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 80, height: 80)
                        .opacity(0.15)
                    
                    VStack {
                        Spacer()
                        // Subtitle sample
                        Text("ژێرنووسکراوە لەلایەن: زانا فاروق • zana.fkurd.pro")
                            .font(.system(size: CGFloat(defaultSubtitleSize), weight: .bold, design: .rounded))
                            .foregroundColor(subtitleTextColor == "Yellow" ? .yellow : .white)
                            .shadow(color: .black, radius: 4, x: 0, y: 2)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.black.opacity(subtitleBackgroundOpacity))
                            .cornerRadius(8)
                            .padding(.bottom, 12)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 140)
                .background(Color(red: 0.08, green: 0.09, blue: 0.12))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.white.opacity(0.12), lineWidth: 1)
                )
            }
            .padding(18)
            .nativeMacGlass(cornerRadius: 14)
            
            // Subtitle Controls
            VStack(alignment: .leading, spacing: 18) {
                // Translation Engine Status
                HStack(spacing: 10) {
                    Image(systemName: "sparkles")
                        .foregroundColor(.yellow)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Google Apps Script Neural Translation Engine")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                        Text("Connected to FLKRD PRO macro servers • High Precision Kurdish Translation")
                            .font(.system(size: 11))
                            .foregroundColor(.green)
                    }
                    Spacer()
                    Circle().fill(Color.green).frame(width: 8, height: 8)
                }
                .padding(12)
                .background(Color.green.opacity(0.12))
                .cornerRadius(10)
                
                Toggle(isOn: $autoTranslateKurdish) {
                    Text("Auto-Translate English Subtitles to Kurdish")
                        .font(.system(size: 13, weight: .semibold))
                }
                .toggleStyle(GlassToggleStyle(activeColor: .red))
                
                Divider().background(Color.white.opacity(0.06))
                
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Subtitle Font Size")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.white.opacity(0.85))
                        Spacer()
                        Text("\(Int(defaultSubtitleSize))pt")
                            .font(.system(size: 12, weight: .bold, design: .monospaced))
                    }
                    GlassSlider(value: $defaultSubtitleSize, bounds: 14...36, step: 1, activeColor: .blue)
                }
                
                Divider().background(Color.white.opacity(0.06))
                
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Background Box Opacity")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.white.opacity(0.85))
                        Spacer()
                        Text(String(format: "%.0f%%", subtitleBackgroundOpacity * 100))
                            .font(.system(size: 12, weight: .bold, design: .monospaced))
                    }
                    GlassSlider(value: $subtitleBackgroundOpacity, bounds: 0.0...1.0, step: 0.05, activeColor: .yellow)
                }
            }
            .padding(18)
            .nativeMacGlass(cornerRadius: 14)
        }
    }
    
    // MARK: - 5. Admin & Banned List Tab
    private var adminPortalTab: some View {
        VStack(alignment: .leading, spacing: 22) {
            headerSection(title: "Admin Portal & Content Blocking", subtitle: "Manage permanent blacklist database and remove movies across all user apps.")
            
            if !isAuthorizedAdmin {
                VStack(alignment: .leading, spacing: 16) {
                    HStack(spacing: 12) {
                        Image(systemName: "lock.shield.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.red)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Administrator Authentication")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                            Text("Enter passkey to manage Supabase database entries and banned movies.")
                                .font(.system(size: 11))
                                .foregroundColor(.white.opacity(0.6))
                        }
                    }
                    
                    SecureField("Admin Password (e.g. zana123)", text: $adminPassword)
                        .textFieldStyle(.plain)
                        .padding(12)
                        .background(Color.white.opacity(0.06))
                        .cornerRadius(10)
                        .foregroundColor(.white)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Color.white.opacity(0.15), lineWidth: 1)
                        )
                    
                    if !adminAuthError.isEmpty {
                        Text(adminAuthError)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.red)
                    }
                    
                    TactileMacButton {
                        let pass = adminPassword.trimmingCharacters(in: .whitespacesAndNewlines)
                        if pass == "Zanabarzani1919@" || pass == "zana123" || pass == "admin" || pass == "flkrd" {
                            isAuthorizedAdmin = true
                            adminAuthError = ""
                        } else {
                            adminAuthError = "Incorrect admin password."
                        }
                    } content: {
                        Text("Authorize Portal Access")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 10)
                            .background(Color.blue)
                            .cornerRadius(8)
                    }
                }
                .padding(20)
                .nativeMacGlass(cornerRadius: 14)
            } else {
                VStack(alignment: .leading, spacing: 18) {
                    HStack {
                        Image(systemName: "checkmark.seal.fill")
                            .foregroundColor(.green)
                        Text("Authenticated as Administrator")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.green)
                        Spacer()
                    }
                    
                    Text("Currently Banned Content (Synced with Supabase):")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white.opacity(0.8))
                    
                    let bannedIds = Array(NetworkService.shared.bannedContentIds)
                    if bannedIds.isEmpty {
                        HStack {
                            Image(systemName: "film")
                                .foregroundColor(.white.opacity(0.3))
                            Text("No banned movies currently in the database.")
                                .font(.system(size: 12))
                                .foregroundColor(.white.opacity(0.5))
                        }
                        .padding(.vertical, 12)
                    } else {
                        VStack(spacing: 8) {
                            ForEach(bannedIds, id: \.self) { bannedId in
                                HStack {
                                    Image(systemName: "nosign")
                                        .foregroundColor(.red)
                                        .font(.system(size: 12))
                                    Text("Banned ID: \(bannedId)")
                                        .font(.system(size: 12, weight: .medium, design: .monospaced))
                                        .foregroundColor(.white)
                                    Spacer()
                                    TactileMacButton {
                                        Task {
                                            _ = try? await NetworkService.shared.unbanContent(contentId: bannedId)
                                        }
                                    } content: {
                                        Text("Unban")
                                            .font(.system(size: 10, weight: .bold))
                                            .foregroundColor(.yellow)
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 4)
                                            .background(Color.yellow.opacity(0.15))
                                            .cornerRadius(6)
                                    }
                                }
                                .padding(10)
                                .background(Color.white.opacity(0.04))
                                .cornerRadius(8)
                            }
                        }
                    }
                }
                .padding(20)
                .nativeMacGlass(cornerRadius: 14)
            }
        }
    }
    
    // MARK: - 6. About Tab
    private var aboutTab: some View {
        VStack(alignment: .leading, spacing: 22) {
            headerSection(title: "About FLKRD MOVIES", subtitle: "Crafted exclusively for macOS and Kurdish cinema streaming.")
            
            VStack(alignment: .leading, spacing: 16) {
                HStack(spacing: 16) {
                    Image("flkrd-logo")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 56, height: 56)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("FLKRD MOVIES PRO")
                            .font(.system(size: 18, weight: .black, design: .rounded))
                            .foregroundColor(.white)
                        Text("Native macOS Edition • Liquid Glass 2.0")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.blue)
                    }
                }
                
                Divider().background(Color.white.opacity(0.1))
                
                Text("Designed and engineered exclusively for macOS with Apple VisionOS aesthetics, real-time Kurdish subtitle translations, multi-server 4K streaming, and Co-Watching watch parties.")
                    .font(.system(size: 13))
                    .foregroundColor(.white.opacity(0.75))
                    .lineSpacing(4)
                
                // Zana Faroq official branding
                HStack(spacing: 10) {
                    Image(systemName: "sparkles.tv.fill")
                        .foregroundColor(.yellow)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Curated by Zana Faroq • Powered by FLKRD Studio")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white)
                        Link("Visit: zana.fkurd.pro", destination: URL(string: "https://zana.fkurd.pro")!)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.cyan)
                    }
                }
                .padding(12)
                .background(Color.blue.opacity(0.12))
                .cornerRadius(10)
            }
            .padding(20)
            .nativeMacGlass(cornerRadius: 14)
        }
    }
    
    private func headerSection(title: String, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 22, weight: .bold, design: .rounded))
                .foregroundColor(.white)
            Text(subtitle)
                .font(.system(size: 13))
                .foregroundColor(.white.opacity(0.5))
        }
    }
}

// MARK: - Subcomponents
struct LanguagePill: View {
    let title: String
    let code: String
    let isSelected: Bool
    var action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                .foregroundColor(isSelected ? .white : .white.opacity(0.7))
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(isSelected ? Color.blue : Color.white.opacity(0.06))
                .clipShape(Capsule())
                .overlay(
                    Capsule().stroke(isSelected ? Color.blue : Color.white.opacity(0.12), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
}
