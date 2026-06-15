//
//  SettingsView.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import SwiftUI

struct SettingsView: View {
    @ObservedObject var lang = LocalizationService.shared
    
    @State private var selectedTab = "Playback"
    @State private var settings = PlaybackSettings()
    
    // Dropdown selectors lists
    let presets = ["Auto (Recommended)", "High Quality", "Medium Balance", "Low Bandwidth"]
    let resolutions = ["Native (Match Display)", "4K UHD (2160p)", "Full HD (1080p)", "HD Ready (720p)"]
    let framerates = ["Auto (Match Source)", "120 FPS Limit", "60 FPS Limit", "30 FPS Limit"]
    
    var body: some View {
        VStack(spacing: 0) {
            
            // 1. Settings Window Mock Header Toolbar
            HStack(spacing: 20) {
                Spacer()
                
                ToolbarTabButton(title: "General", icon: "gearshape", selectedTab: $selectedTab)
                ToolbarTabButton(title: "Playback", icon: "play.circle", selectedTab: $selectedTab)
                ToolbarTabButton(title: "Liquid Glass", icon: "sparkles", selectedTab: $selectedTab)
                ToolbarTabButton(title: "Storage", icon: "opticaldisc", selectedTab: $selectedTab)
                ToolbarTabButton(title: "Displays", icon: "desktopcomputer", selectedTab: $selectedTab)
                ToolbarTabButton(title: "Devices", icon: "laptopcomputer.and.ipad", selectedTab: $selectedTab)
                ToolbarTabButton(title: "License", icon: "key", selectedTab: $selectedTab)
                ToolbarTabButton(title: "Support", icon: "help.circle", selectedTab: $selectedTab)
                
                Spacer()
            }
            .padding(.vertical, 16)
            .background(Color.black.opacity(0.2))
            
            Divider().background(Color.white.opacity(0.1))
            
            // 2. Tab Content (Replicating "Playback" tab from user's image)
            ScrollView {
                if selectedTab == "Playback" {
                    VStack(alignment: .leading, spacing: 22) {
                        
                        // --- SECTION A: VIDEO QUALITY ---
                        VStack(alignment: .leading, spacing: 14) {
                            Text("Video Quality")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.white.opacity(0.9))
                            
                            // 1. Video Quality Preset Dropdown
                            HStack {
                                Text(lang.t("videoQualityPreset"))
                                    .font(.system(size: 12))
                                    .foregroundColor(.white.opacity(0.7))
                                Spacer()
                                Menu {
                                    ForEach(presets, id: \.self) { preset in
                                        Button(preset) { settings.videoQualityPreset = preset }
                                    }
                                } label: {
                                    HStack {
                                        Text(settings.videoQualityPreset)
                                        Image(systemName: "chevron.up.chevron.down")
                                    }
                                    .font(.system(size: 11))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 4)
                                    .glassPanel(cornerRadius: 6)
                                }
                            }
                            
                            // 2. Maximum Resolution Dropdown
                            HStack {
                                Text(lang.t("maxResolution"))
                                    .font(.system(size: 12))
                                    .foregroundColor(.white.opacity(0.7))
                                Spacer()
                                Menu {
                                    ForEach(resolutions, id: \.self) { res in
                                        Button(res) { settings.maxResolution = res }
                                    }
                                } label: {
                                    HStack {
                                        Text(settings.maxResolution)
                                        Image(systemName: "chevron.up.chevron.down")
                                    }
                                    .font(.system(size: 11))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 4)
                                    .glassPanel(cornerRadius: 6)
                                }
                            }
                            
                            // 3. Frame Rate Limit Dropdown
                            HStack {
                                Text(lang.t("frameRateLimit"))
                                    .font(.system(size: 12))
                                    .foregroundColor(.white.opacity(0.7))
                                Spacer()
                                Menu {
                                    ForEach(framerates, id: \.self) { rate in
                                        Button(rate) { settings.frameRateLimit = rate }
                                    }
                                } label: {
                                    HStack {
                                        Text(settings.frameRateLimit)
                                        Image(systemName: "chevron.up.chevron.down")
                                    }
                                    .font(.system(size: 11))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 4)
                                    .glassPanel(cornerRadius: 6)
                                }
                            }
                            
                            Text("These settings optimize GPU rendering. Changes apply instantly without reloading the wallpaper.")
                                .font(.system(size: 10))
                                .foregroundColor(.white.opacity(0.4))
                                .lineSpacing(2)
                        }
                        
                        // --- SECTION B: PERFORMANCE ---
                        VStack(alignment: .leading, spacing: 14) {
                            Text("Performance")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.white.opacity(0.9))
                            
                            // Option 1: Reduce Quality on Battery
                            Toggle(isOn: $settings.reduceQualityOnBattery) {
                                HStack(spacing: 10) {
                                    Image(systemName: "bolt.fill")
                                        .font(.system(size: 10))
                                        .foregroundColor(.white)
                                        .frame(width: 20, height: 20)
                                        .background(Color.yellow)
                                        .clipShape(Circle())
                                    
                                    Text("Reduce Quality on Battery")
                                        .font(.system(size: 12))
                                        .foregroundColor(.white.opacity(0.8))
                                }
                            }
                            .toggleStyle(GlassToggleStyle(activeColor: lang.accentColor))
                            
                            // Option 2: Pause When App is Fullscreen
                            Toggle(isOn: $settings.pauseWhenFullscreen) {
                                HStack(spacing: 10) {
                                    Image(systemName: "play.rectangle.fill")
                                        .font(.system(size: 10))
                                        .foregroundColor(.white)
                                        .frame(width: 20, height: 20)
                                        .background(Color.blue)
                                        .clipShape(Circle())
                                    
                                    Text("Pause When App is Fullscreen")
                                        .font(.system(size: 12))
                                        .foregroundColor(.white.opacity(0.8))
                                }
                            }
                            .toggleStyle(GlassToggleStyle(activeColor: lang.accentColor))
                            
                            // Option 3: Pause on High CPU Usage
                            Toggle(isOn: $settings.pauseOnHighCPU) {
                                HStack(spacing: 10) {
                                    Image(systemName: "cpu.fill")
                                        .font(.system(size: 10))
                                        .foregroundColor(.white)
                                        .frame(width: 20, height: 20)
                                        .background(Color.red)
                                        .clipShape(Circle())
                                    
                                    Text("Pause on High CPU Usage")
                                        .font(.system(size: 12))
                                        .foregroundColor(.white.opacity(0.8))
                                }
                            }
                            .toggleStyle(GlassToggleStyle(activeColor: lang.accentColor))
                            
                            Text("These options help preserve battery life and system performance when needed.")
                                .font(.system(size: 10))
                                .foregroundColor(.white.opacity(0.4))
                                .lineSpacing(2)
                        }
                        
                        // --- SECTION C: PLAYBACK BEHAVIOR ---
                        VStack(alignment: .leading, spacing: 14) {
                            Text("Playback Behavior")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.white.opacity(0.9))
                            
                            // 1. Video Volume Slider
                            HStack {
                                Text(lang.t("videoVolume"))
                                    .font(.system(size: 12))
                                    .foregroundColor(.white.opacity(0.7))
                                Spacer()
                                Text(settings.muted ? "Muted" : String(format: "%.0f%%", settings.videoVolume * 100))
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.white.opacity(0.6))
                            }
                            
                            GlassSlider(
                                value: Binding(
                                    get: { settings.muted ? 0.0 : settings.videoVolume },
                                    set: { val in
                                        settings.videoVolume = val
                                        settings.muted = val == 0
                                    }
                                ),
                                bounds: 0...1,
                                step: 0.05,
                                activeColor: lang.accentColor
                            )
                            
                            // 2. Transition Duration Slider with ruler
                            HStack {
                                Text(lang.t("transitionDuration"))
                                    .font(.system(size: 12))
                                    .foregroundColor(.white.opacity(0.7))
                                Spacer()
                                Text(String(format: "%.1fs", settings.transitionDuration))
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.white.opacity(0.6))
                            }
                            .padding(.top, 8)
                            
                            GlassSlider(
                                value: $settings.transitionDuration,
                                bounds: 0.0...2.0,
                                step: 0.1,
                                activeColor: lang.accentColor
                            )
                        }
                        
                    }
                    .padding(24)
                } else if selectedTab == "Liquid Glass" {
                    LiquidGlassSettingsView()
                } else if selectedTab == "General" {
                    VStack(alignment: .leading, spacing: 22) {
                        
                        // --- SECTION A: LANGUAGE ---
                        VStack(alignment: .leading, spacing: 14) {
                            Text(lang.t("language"))
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.white.opacity(0.9))
                            
                            HStack {
                                Text("App Interface Language")
                                    .font(.system(size: 12))
                                    .foregroundColor(.white.opacity(0.7))
                                Spacer()
                                Menu {
                                    Button("English") { lang.selectedLanguage = "en" }
                                    Button("کوردی (سۆرانی)") { lang.selectedLanguage = "ku" }
                                    Button("کوردی (بادینی)") { lang.selectedLanguage = "badini" }
                                } label: {
                                    HStack {
                                        Text(lang.selectedLanguage == "en" ? "English" : (lang.selectedLanguage == "ku" ? "کوردی (سۆرانی)" : "کوردی (بادینی)"))
                                        Image(systemName: "chevron.up.chevron.down")
                                    }
                                    .font(.system(size: 11))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 4)
                                    .glassPanel(cornerRadius: 6)
                                }
                            }
                        }
                        
                        // --- SECTION B: THEME & ACCENT COLOR ---
                        VStack(alignment: .leading, spacing: 14) {
                            Text(lang.t("designSettings"))
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.white.opacity(0.9))
                            
                            HStack {
                                Text(lang.t("appColor"))
                                    .font(.system(size: 12))
                                    .foregroundColor(.white.opacity(0.7))
                                Spacer()
                                Menu {
                                    Button("Blue") { lang.selectedAccentColor = "Blue" }
                                    Button("Red") { lang.selectedAccentColor = "Red" }
                                    Button("Purple") { lang.selectedAccentColor = "Purple" }
                                    Button("Green") { lang.selectedAccentColor = "Green" }
                                    Button("Yellow") { lang.selectedAccentColor = "Yellow" }
                                    Button("Orange") { lang.selectedAccentColor = "Orange" }
                                } label: {
                                    HStack {
                                        Text(lang.selectedAccentColor)
                                        Image(systemName: "chevron.up.chevron.down")
                                    }
                                    .font(.system(size: 11))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 4)
                                    .glassPanel(cornerRadius: 6)
                                }
                            }
                        }
                        
                        // --- SECTION C: ABOUT / CREATOR ---
                        VStack(alignment: .leading, spacing: 10) {
                            Text("About")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.white.opacity(0.9))
                            
                            HStack(spacing: 12) {
                                Image("flkrd-logo")
                                    .resizable()
                                    .aspectRatio(contentMode: .fit)
                                    .frame(width: 48, height: 48)
                                    .cornerRadius(8)
                                    .glassPanel(cornerRadius: 8)
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("FLKRD MOVIES")
                                        .font(.system(size: 13, weight: .black))
                                        .foregroundColor(.white)
                                    Text("Created by Zana Faroq")
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundColor(lang.accentColor)
                                    Text("Version 1.8.1 (macOS native)")
                                        .font(.system(size: 9))
                                        .foregroundColor(.white.opacity(0.4))
                                }
                            }
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .glassPanel()
                        }
                    }
                    .padding(24)
                } else {
                    // Standard other placeholder tabs
                    VStack(spacing: 12) {
                        Spacer(minLength: 80)
                        Image(systemName: "gearshape.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.white.opacity(0.12))
                        Text("\(selectedTab) Configuration Screen")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white.opacity(0.6))
                        Spacer()
                    }
                }
            }
        }
        .frame(width: 460, height: 600)
        .background(VisualEffectView(material: .hudWindow).edgesIgnoringSafeArea(.all))
    }
}

// MARK: - Toolbar Tab button Helper
struct ToolbarTabButton: View {
    let title: String
    let icon: String
    @Binding var selectedTab: String
    
    var body: some View {
        Button {
            selectedTab = title
        } label: {
            VStack(spacing: 6) {
                Image(systemName: icon + (selectedTab == title ? ".fill" : ""))
                    .font(.system(size: 16))
                    .foregroundColor(selectedTab == title ? .blue : .white.opacity(0.4))
                
                Text(title)
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(selectedTab == title ? .white : .white.opacity(0.5))
            }
            .frame(width: 52, height: 44)
            .padding(.horizontal, 4)
            .background(selectedTab == title ? Color.blue.opacity(0.12) : Color.clear)
            .cornerRadius(6)
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .stroke(selectedTab == title ? Color.blue.opacity(0.25) : Color.clear, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Liquid Glass Customizer View
struct LiquidGlassSettingsView: View {
    @ObservedObject var glass = GlassConfigManager.shared
    @State private var showSuccessMessage = false
    @State private var showErrorMessage = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Header Info
            VStack(alignment: .leading, spacing: 6) {
                Text("Liquid Glass Settings (Glassmorphism)")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white.opacity(0.9))
                Text("Customize the transparency, blur, and styling of the application. Changes are synced with Supabase and apply to all users in real time.")
                    .font(.system(size: 10))
                    .foregroundColor(.white.opacity(0.5))
                    .lineSpacing(2)
            }
            .padding(.bottom, 6)
            
            // Sliders
            VStack(spacing: 16) {
                // 1. Blur
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Blur Radius")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.white.opacity(0.7))
                        Spacer()
                        Text("\(Int(glass.blurAmount))px")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(.blue)
                    }
                    GlassSlider(value: $glass.blurAmount, bounds: 5...60, step: 1, activeColor: .blue)
                }
                
                // 2. Saturation
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Saturation")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.white.opacity(0.7))
                        Spacer()
                        Text("\(Int(glass.saturation))%")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(.blue)
                    }
                    GlassSlider(value: $glass.saturation, bounds: 50...250, step: 5, activeColor: .blue)
                }
                
                // 3. Red Tint Opacity
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Red Tint Opacity")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.white.opacity(0.7))
                        Spacer()
                        Text("\(Int(round(glass.redOpacity * 100)))%")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(.blue)
                    }
                    GlassSlider(value: $glass.redOpacity, bounds: 0...0.8, step: 0.01, activeColor: .blue)
                }
                
                // 4. Dark Base Opacity
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Dark Base Opacity")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.white.opacity(0.7))
                        Spacer()
                        Text("\(Int(round(glass.darkOpacity * 100)))%")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(.blue)
                    }
                    GlassSlider(value: $glass.darkOpacity, bounds: 0.1...0.95, step: 0.01, activeColor: .blue)
                }
                
                // 5. Border Opacity
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Border Opacity")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.white.opacity(0.7))
                        Spacer()
                        Text("\(Int(round(glass.borderOpacity * 100)))%")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(.blue)
                    }
                    GlassSlider(value: $glass.borderOpacity, bounds: 0...0.9, step: 0.01, activeColor: .blue)
                }
                
                // 6. Displacement Scale
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Displacement Scale")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.white.opacity(0.7))
                        Spacer()
                        Text("\(Int(glass.displacementScale))")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(.blue)
                    }
                    GlassSlider(value: $glass.displacementScale, bounds: 0...120, step: 1, activeColor: .blue)
                }
                
                // 7. Aberration Intensity
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Aberration Intensity")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.white.opacity(0.7))
                        Spacer()
                        Text("\(Int(glass.aberrationIntensity))")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(.blue)
                    }
                    GlassSlider(value: $glass.aberrationIntensity, bounds: 0...15, step: 0.5, activeColor: .blue)
                }
                
                // 8. Elasticity
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Elasticity")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.white.opacity(0.7))
                        Spacer()
                        Text("\(Int(round(glass.elasticity * 100)))%")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(.blue)
                    }
                    GlassSlider(value: $glass.elasticity, bounds: 0.1...0.9, step: 0.01, activeColor: .blue)
                }
                
                // 9. Corner Radius
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Corner Radius")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.white.opacity(0.7))
                        Spacer()
                        Text("\(Int(glass.cornerRadius))px")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(.blue)
                    }
                    GlassSlider(value: Binding(
                        get: { Double(glass.cornerRadius) },
                        set: { val in glass.cornerRadius = CGFloat(val) }
                    ), bounds: 0...50, step: 1, activeColor: .blue)
                }
            }
            .padding(16)
            .glassPanel()
            
            // Live Preview Card
            VStack(alignment: .leading, spacing: 8) {
                Text("Live Preview")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.white.opacity(0.6))
                
                HStack(spacing: 12) {
                    // Simulating a movie card or panel using the live configs
                    ZStack {
                        Color.white.opacity(0.04)
                        VStack(spacing: 8) {
                            Image(systemName: "film.fill")
                                .font(.system(size: 24))
                                .foregroundColor(.white.opacity(0.5))
                            Text("Sample Card")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.white)
                        }
                    }
                    .frame(width: 120, height: 160)
                    .glassPanel() // Note: uses the live values from glassConfig!
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("FLKRD Premium UI")
                            .font(.system(size: 13, weight: .black))
                            .foregroundColor(.white)
                        Text("This panel dynamically updates to show opacity, gradients, and corner radius live.")
                            .font(.system(size: 10))
                            .foregroundColor(.white.opacity(0.5))
                            .lineSpacing(2)
                        
                        Spacer()
                    }
                    .padding(.vertical, 8)
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .glassPanel()
            }
            
            // Sync & Actions
            VStack(spacing: 12) {
                if showSuccessMessage {
                    Text("Successfully updated database configurations!")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.green)
                }
                if showErrorMessage {
                    Text("Failed to save to database. Check network or server connection.")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.red)
                }
                
                Button {
                    Task {
                        let ok = await glass.pushToSupabase()
                        DispatchQueue.main.async {
                            if ok {
                                self.showSuccessMessage = true
                                self.showErrorMessage = false
                                DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                                    self.showSuccessMessage = false
                                }
                            } else {
                                self.showSuccessMessage = false
                                self.showErrorMessage = true
                                DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                                    self.showErrorMessage = false
                                }
                            }
                        }
                    }
                } label: {
                    HStack(spacing: 8) {
                        if glass.isSaving {
                            ProgressView()
                                .scaleEffect(0.6)
                        } else {
                            Image(systemName: "icloud.and.arrow.up.fill")
                        }
                        Text(glass.isSaving ? "Saving..." : "Save & Sync to Supabase")
                    }
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 38)
                    .background(Color.blue)
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
                .disabled(glass.isSaving)
            }
            .padding(.top, 8)
        }
        .padding(24)
    }
}
