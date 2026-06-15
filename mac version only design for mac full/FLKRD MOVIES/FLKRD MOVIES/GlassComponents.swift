//
//  GlassComponents.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import SwiftUI
import AppKit
import Combine

// MARK: - Native macOS Vibrancy/Blur Wrapper
struct VisualEffectView: NSViewRepresentable {
    var material: NSVisualEffectView.Material = .hudWindow
    var blendingMode: NSVisualEffectView.BlendingMode = .behindWindow
    var state: NSVisualEffectView.State = .active

    func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        view.material = material
        view.blendingMode = blendingMode
        view.state = state
        return view
    }

    func updateNSView(_ nsView: NSVisualEffectView, context: Context) {
        nsView.material = material
        nsView.blendingMode = blendingMode
        nsView.state = state
    }
}

// MARK: - Moving Liquid Background Spheres
struct AmbientBackgroundView: View {
    @State private var animateCircles = false
    
    var body: some View {
        ZStack {
            Color.black // Base background
            
            // Dynamic colorful spheres
            ZStack {
                // Sphere 1: Ocean Cyan
                Circle()
                    .fill(Color(red: 0.0, green: 0.6, blue: 0.8).opacity(0.15))
                    .frame(width: 400, height: 400)
                    .offset(x: animateCircles ? -150 : 150, y: animateCircles ? -100 : 100)
                
                // Sphere 2: Coral Red
                Circle()
                    .fill(Color(red: 0.9, green: 0.25, blue: 0.25).opacity(0.15))
                    .frame(width: 500, height: 500)
                    .offset(x: animateCircles ? 200 : -200, y: animateCircles ? 150 : -150)
                
                // Sphere 3: Deep Royal Purple
                Circle()
                    .fill(Color(red: 0.4, green: 0.2, blue: 0.9).opacity(0.18))
                    .frame(width: 450, height: 450)
                    .offset(x: animateCircles ? -50 : 100, y: animateCircles ? 200 : -100)
            }
            .blur(radius: 90)
            .animation(.easeInOut(duration: 15).repeatForever(autoreverses: true), value: animateCircles)
            .onAppear {
                animateCircles = true
            }
        }
    }
}

// MARK: - Glass Modifier for Panels
struct GlassBackground: ViewModifier {
    @ObservedObject var glass = GlassConfigManager.shared
    var cornerRadius: CGFloat? = nil
    var shadowColor: Color = Color.black.opacity(0.3)
    var shadowRadius: CGFloat = 15

    func body(content: Content) -> some View {
        let finalRadius = cornerRadius ?? glass.cornerRadius
        content
            .background(
                ZStack {
                    VisualEffectView(material: .hudWindow, blendingMode: .behindWindow, state: .active)
                    Color.black.opacity(glass.darkOpacity)
                    RadialGradient(
                        colors: [Color.red.opacity(glass.redOpacity), Color.clear],
                        center: .top,
                        startRadius: 0,
                        endRadius: 300
                    )
                }
            )
            .cornerRadius(finalRadius)
            .overlay(
                RoundedRectangle(cornerRadius: finalRadius)
                    .stroke(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(glass.borderOpacity),
                                Color.white.opacity(glass.borderOpacity * 0.2),
                                Color.black.opacity(0.1),
                                Color.white.opacity(glass.borderOpacity * 0.4)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
            .shadow(color: shadowColor, radius: shadowRadius, x: 0, y: 8)
    }
}

extension View {
    func glassPanel(cornerRadius: CGFloat? = nil) -> some View {
        self.modifier(GlassBackground(cornerRadius: cornerRadius))
    }
}

// MARK: - Custom Premium Glass Button Style
struct GlassButtonStyle: ButtonStyle {
    var activeColor: Color = .blue
    @State private var isHovered = false
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: .semibold, design: .rounded))
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(
                ZStack {
                    if configuration.isPressed {
                        activeColor.opacity(0.3)
                    } else if isHovered {
                        Color.white.opacity(0.1)
                    } else {
                        Color.white.opacity(0.04)
                    }
                }
            )
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(
                        LinearGradient(
                            colors: [
                                .white.opacity(configuration.isPressed ? 0.3 : 0.15),
                                .white.opacity(0.05)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        ),
                        lineWidth: 1
                    )
            )
            .scaleEffect(configuration.isPressed ? 0.96 : (isHovered ? 1.03 : 1.0))
            .animation(.easeOut(duration: 0.2), value: isHovered)
            .onHover { hover in
                isHovered = hover
            }
    }
}

// MARK: - Custom Glass Slider
struct GlassSlider: View {
    @Binding var value: Double
    var bounds: ClosedRange<Double> = 0...1
    var step: Double = 0.05
    var title: String = ""
    var activeColor: Color = .blue
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if !title.isEmpty {
                Text(title)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.white.opacity(0.6))
            }
            
            GeometryReader { geometry in
                let width = geometry.size.width
                let percent = CGFloat((value - bounds.lowerBound) / (bounds.upperBound - bounds.lowerBound))
                
                ZStack(alignment: .leading) {
                    // Track Background
                    Capsule()
                        .fill(Color.white.opacity(0.08))
                        .frame(height: 6)
                        .overlay(
                            Capsule()
                                .stroke(Color.white.opacity(0.05), lineWidth: 0.5)
                        )
                    
                    // Ruler tick marks (subtle microticks)
                    HStack(spacing: 0) {
                        ForEach(0..<13) { i in
                            Spacer()
                            Rectangle()
                                .fill(Color.white.opacity(0.12))
                                .frame(width: 1, height: i % 4 == 0 ? 5 : 3)
                            Spacer()
                        }
                    }
                    .frame(height: 6)
                    
                    // Active filled portion
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [activeColor, activeColor.opacity(0.8)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: max(0, percent * width), height: 6)
                        .shadow(color: activeColor.opacity(0.4), radius: 4, x: 0, y: 0)
                    
                    // Handle/Thumb
                    Circle()
                        .fill(Color.white)
                        .frame(width: 14, height: 14)
                        .shadow(color: Color.black.opacity(0.5), radius: 3, x: 0, y: 1)
                        .offset(x: max(0, percent * width) - 7)
                        .gesture(
                            DragGesture(minimumDistance: 0)
                                .onChanged { drag in
                                    let dragX = drag.location.x
                                    let rawPercent = Double(dragX / width)
                                    let boundedPercent = min(max(rawPercent, 0.0), 1.0)
                                    let newValue = bounds.lowerBound + boundedPercent * (bounds.upperBound - bounds.lowerBound)
                                    // Align to step
                                    let steppedValue = round(newValue / step) * step
                                    self.value = min(max(steppedValue, bounds.lowerBound), bounds.upperBound)
                                }
                        )
                }
                .frame(maxHeight: .infinity)
            }
            .frame(height: 14)
        }
    }
}

// MARK: - Premium Glass Toggle Style
struct GlassToggleStyle: ToggleStyle {
    var activeColor: Color = .blue
    
    func makeBody(configuration: Configuration) -> some View {
        HStack {
            configuration.label
            Spacer()
            Button {
                withAnimation(.spring(response: 0.25, dampingFraction: 0.65)) {
                    configuration.isOn.toggle()
                }
            } label: {
                Capsule()
                    .fill(configuration.isOn ? activeColor : Color.black.opacity(0.3))
                    .frame(width: 38, height: 20)
                    .overlay(
                        Circle()
                            .fill(Color.white)
                            .padding(2)
                            .shadow(color: Color.black.opacity(0.2), radius: 1, x: 0, y: 1)
                            .offset(x: configuration.isOn ? 9 : -9)
                    )
            }
            .buttonStyle(.plain)
        }
    }
}

// MARK: - Glass Customizer Configuration Manager
class GlassConfigManager: ObservableObject {
    static let shared = GlassConfigManager()
    
    @Published var blurAmount: Double = 20
    @Published var saturation: Double = 130
    @Published var redOpacity: Double = 0.18
    @Published var darkOpacity: Double = 0.65
    @Published var borderOpacity: Double = 0.20
    @Published var displacementScale: Double = 30
    @Published var aberrationIntensity: Double = 2
    @Published var elasticity: Double = 0.35
    @Published var cornerRadius: CGFloat = 28
    
    @Published var isLoading = false
    @Published var isSaving = false
    
    private init() {
        loadLocalConfig()
        syncWithSupabase()
    }
    
    func loadLocalConfig() {
        if UserDefaults.standard.object(forKey: "glass_blur_amount") != nil {
            blurAmount = UserDefaults.standard.double(forKey: "glass_blur_amount")
            saturation = UserDefaults.standard.double(forKey: "glass_saturation")
            redOpacity = UserDefaults.standard.double(forKey: "glass_red_opacity")
            darkOpacity = UserDefaults.standard.double(forKey: "glass_dark_opacity")
            borderOpacity = UserDefaults.standard.double(forKey: "glass_border_opacity")
            displacementScale = UserDefaults.standard.double(forKey: "glass_displacement_scale")
            aberrationIntensity = UserDefaults.standard.double(forKey: "glass_aberration_intensity")
            elasticity = UserDefaults.standard.double(forKey: "glass_elasticity")
            cornerRadius = CGFloat(UserDefaults.standard.double(forKey: "glass_corner_radius"))
        }
    }
    
    func saveLocalConfig() {
        UserDefaults.standard.set(blurAmount, forKey: "glass_blur_amount")
        UserDefaults.standard.set(saturation, forKey: "glass_saturation")
        UserDefaults.standard.set(redOpacity, forKey: "glass_red_opacity")
        UserDefaults.standard.set(darkOpacity, forKey: "glass_dark_opacity")
        UserDefaults.standard.set(borderOpacity, forKey: "glass_border_opacity")
        UserDefaults.standard.set(displacementScale, forKey: "glass_displacement_scale")
        UserDefaults.standard.set(aberrationIntensity, forKey: "glass_aberration_intensity")
        UserDefaults.standard.set(elasticity, forKey: "glass_elasticity")
        UserDefaults.standard.set(Double(cornerRadius), forKey: "glass_corner_radius")
    }
    
    func syncWithSupabase() {
        isLoading = true
        Task {
            do {
                let configs = try await NetworkService.shared.fetchServerConfigs()
                DispatchQueue.main.async {
                    for row in configs {
                        switch row.server_name {
                        case "glass_blur_amount": self.blurAmount = Double(row.priority)
                        case "glass_saturation": self.saturation = Double(row.priority)
                        case "glass_red_opacity": self.redOpacity = Double(row.priority) / 100.0
                        case "glass_dark_opacity": self.darkOpacity = Double(row.priority) / 100.0
                        case "glass_border_opacity": self.borderOpacity = Double(row.priority) / 100.0
                        case "glass_displacement_scale": self.displacementScale = Double(row.priority)
                        case "glass_aberration_intensity": self.aberrationIntensity = Double(row.priority)
                        case "glass_elasticity": self.elasticity = Double(row.priority) / 100.0
                        case "glass_corner_radius": self.cornerRadius = CGFloat(row.priority)
                        default: break
                        }
                    }
                    self.saveLocalConfig()
                    self.isLoading = false
                }
            } catch {
                print("[GLASS SYNC] Failed to fetch server config: \(error)")
                DispatchQueue.main.async {
                    self.isLoading = false
                }
            }
        }
    }
    
    func pushToSupabase() async -> Bool {
        DispatchQueue.main.async {
            self.isSaving = true
        }
        
        do {
            let currentConfigs = try await NetworkService.shared.fetchServerConfigs()
            var rowMap: [String: Int] = [:]
            var maxId = 0
            for row in currentConfigs {
                rowMap[row.server_name] = row.id
                if row.id > maxId {
                    maxId = row.id
                }
            }
            
            let keys: [(key: String, val: Int)] = [
                ("glass_blur_amount", Int(blurAmount)),
                ("glass_saturation", Int(saturation)),
                ("glass_red_opacity", Int(round(redOpacity * 100))),
                ("glass_dark_opacity", Int(round(darkOpacity * 100))),
                ("glass_border_opacity", Int(round(borderOpacity * 100))),
                ("glass_displacement_scale", Int(displacementScale)),
                ("glass_aberration_intensity", Int(aberrationIntensity)),
                ("glass_elasticity", Int(round(elasticity * 100))),
                ("glass_corner_radius", Int(cornerRadius))
            ]
            
            var nextId = maxId + 1
            var upserts: [[String: Any]] = []
            for item in keys {
                if let dbId = rowMap[item.key] {
                    upserts.append(["id": dbId, "server_name": item.key, "priority": item.val])
                } else {
                    upserts.append(["id": nextId, "server_name": item.key, "priority": item.val])
                    nextId += 1
                }
            }
            
            try await NetworkService.shared.upsertServerConfigs(upserts)
            saveLocalConfig()
            
            DispatchQueue.main.async {
                self.isSaving = false
            }
            return true
        } catch {
            print("[GLASS SYNC] Failed to push server config: \(error)")
            DispatchQueue.main.async {
                self.isSaving = false
            }
            return false
        }
    }
}
