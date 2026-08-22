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

// MARK: - Dynamic Fluid Mesh Ambient Background (Apple Crystal Liquid Glass)
struct AmbientBackgroundView: View {
    @State private var animateCircles = false
    
    var body: some View {
        ZStack {
            // Dynamic Native macOS Under-Window Material
            VisualEffectView(material: .underWindowBackground, blendingMode: .behindWindow, state: .active)
            
            Color.black.opacity(0.18)
            
            // Dynamic colorful glowing fluid spheres
            ZStack {
                // Sphere 1: Electric Cobalt
                Circle()
                    .fill(Color(red: 0.0, green: 0.45, blue: 0.95).opacity(0.18))
                    .frame(width: 550, height: 550)
                    .offset(x: animateCircles ? -180 : 180, y: animateCircles ? -120 : 120)
                
                // Sphere 2: Deep Violet / Indigo
                Circle()
                    .fill(Color(red: 0.45, green: 0.2, blue: 0.95).opacity(0.16))
                    .frame(width: 600, height: 600)
                    .offset(x: animateCircles ? 220 : -220, y: animateCircles ? 160 : -160)
                
                // Sphere 3: Warm Amber Glow
                Circle()
                    .fill(Color(red: 0.95, green: 0.55, blue: 0.15).opacity(0.12))
                    .frame(width: 480, height: 480)
                    .offset(x: animateCircles ? -80 : 140, y: animateCircles ? 220 : -120)
                
                // Sphere 4: Cyan Highlight
                Circle()
                    .fill(Color(red: 0.0, green: 0.8, blue: 0.9).opacity(0.12))
                    .frame(width: 420, height: 420)
                    .offset(x: animateCircles ? 150 : -150, y: animateCircles ? -180 : 180)
            }
            .blur(radius: 90)
            .animation(.easeInOut(duration: 16).repeatForever(autoreverses: true), value: animateCircles)
            .onAppear {
                animateCircles = true
            }
        }
    }
}

// MARK: - Native Apple macOS Glass Refraction Modifier
struct NativeMacGlassModifier: ViewModifier {
    var cornerRadius: CGFloat = 14
    var isHovered: Bool = false
    var shadowRadius: CGFloat = 12

    func body(content: Content) -> some View {
        content
            .background(
                ZStack {
                    VisualEffectView(material: .hudWindow, blendingMode: .behindWindow, state: .active)
                    Color.black.opacity(0.22)
                    LinearGradient(
                        colors: [Color.white.opacity(isHovered ? 0.10 : 0.04), Color.clear],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                }
            )
            .cornerRadius(cornerRadius)
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(
                        LinearGradient(
                            stops: [
                                .init(color: .white.opacity(isHovered ? 0.38 : 0.20), location: 0.0),
                                .init(color: .white.opacity(isHovered ? 0.12 : 0.05), location: 0.35),
                                .init(color: .clear, location: 1.0)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        ),
                        lineWidth: isHovered ? 1.5 : 1.0
                    )
            )
            .shadow(
                color: isHovered ? Color.blue.opacity(0.3) : Color.black.opacity(0.25),
                radius: isHovered ? shadowRadius * 1.3 : shadowRadius,
                y: isHovered ? 6 : 3
            )
    }
}

// MARK: - Glass Modifier for Panels (Default macOS Liquid Glass)
struct GlassBackground: ViewModifier {
    var cornerRadius: CGFloat?
    
    func body(content: Content) -> some View {
        let radius = cornerRadius ?? 16
        content
            .background(
                ZStack {
                    VisualEffectView(material: .hudWindow, blendingMode: .behindWindow, state: .active)
                    Color.black.opacity(0.20)
                    LinearGradient(
                        colors: [Color.white.opacity(0.06), Color.clear],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                }
            )
            .cornerRadius(radius)
            .overlay(
                RoundedRectangle(cornerRadius: radius)
                    .stroke(
                        LinearGradient(
                            stops: [
                                .init(color: .white.opacity(0.32), location: 0.0),
                                .init(color: .white.opacity(0.08), location: 0.4),
                                .init(color: .clear, location: 1.0)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1.2
                    )
            )
            .shadow(color: Color.black.opacity(0.25), radius: 12, y: 6)
    }
}

// MARK: - Floating VisionOS Liquid Pill Modifier
struct LiquidPillBackground: ViewModifier {
    var isSelected: Bool = false
    var activeColor: Color = .blue
    
    func body(content: Content) -> some View {
        content
            .background(
                ZStack {
                    VisualEffectView(material: .hudWindow, blendingMode: .behindWindow, state: .active)
                    if isSelected {
                        activeColor.opacity(0.3)
                    } else {
                        Color.white.opacity(0.06)
                    }
                }
            )
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(
                        LinearGradient(
                            colors: [
                                isSelected ? activeColor.opacity(0.8) : Color.white.opacity(0.25),
                                isSelected ? activeColor.opacity(0.3) : Color.white.opacity(0.08)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
            .shadow(color: isSelected ? activeColor.opacity(0.35) : Color.black.opacity(0.25), radius: 8, y: 4)
    }
}

extension View {
    func glassPanel(cornerRadius: CGFloat? = nil) -> some View {
        self.modifier(GlassBackground(cornerRadius: cornerRadius))
    }
    
    func nativeMacGlass(cornerRadius: CGFloat = 14, isHovered: Bool = false) -> some View {
        self.modifier(NativeMacGlassModifier(cornerRadius: cornerRadius, isHovered: isHovered))
    }
    
    func liquidPill(isSelected: Bool = false, activeColor: Color = .blue) -> some View {
        self.modifier(LiquidPillBackground(isSelected: isSelected, activeColor: activeColor))
    }
    
    func framerHover(isHovered: Bool, cornerRadius: CGFloat = 14) -> some View {
        self.modifier(FramerHoverEffectModifier(isHovered: isHovered, cornerRadius: cornerRadius))
    }
    
    func framerEntrance(delay: Double = 0.0) -> some View {
        self.modifier(FramerEntranceModifier(delay: delay))
    }
}

// MARK: - Framer Motion 3D Hover & Sheen Modifier
struct FramerHoverEffectModifier: ViewModifier {
    var isHovered: Bool
    var cornerRadius: CGFloat = 14
    
    func body(content: Content) -> some View {
        content
            .overlay(
                // Animated Specular Light Sheen
                ZStack {
                    if isHovered {
                        LinearGradient(
                            stops: [
                                .init(color: .clear, location: 0.0),
                                .init(color: .white.opacity(0.18), location: 0.5),
                                .init(color: .clear, location: 1.0)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                        .cornerRadius(cornerRadius)
                        .transition(.opacity)
                    }
                }
            )
            .scaleEffect(isHovered ? 1.05 : 1.0)
            .shadow(
                color: isHovered ? Color.blue.opacity(0.45) : Color.black.opacity(0.35),
                radius: isHovered ? 16 : 6,
                x: 0,
                y: isHovered ? 8 : 4
            )
            .animation(.spring(response: 0.28, dampingFraction: 0.70, blendDuration: 0), value: isHovered)
    }
}

// MARK: - Framer Motion Smooth Staggered Entrance Modifier
struct FramerEntranceModifier: ViewModifier {
    var delay: Double = 0.0
    @State private var hasAppeared = false
    
    func body(content: Content) -> some View {
        content
            .opacity(hasAppeared ? 1.0 : 0.0)
            .offset(y: hasAppeared ? 0 : 16)
            .scaleEffect(hasAppeared ? 1.0 : 0.97)
            .onAppear {
                withAnimation(.spring(response: 0.45, dampingFraction: 0.75).delay(delay)) {
                    hasAppeared = true
                }
            }
    }
}

// MARK: - Tactile Apple Spring Physics Button
struct TactileMacButton<Content: View>: View {
    let action: () -> Void
    let content: () -> Content
    
    @State private var isHovered = false
    @State private var isPressed = false
    
    init(action: @escaping () -> Void, @ViewBuilder content: @escaping () -> Content) {
        self.action = action
        self.content = content
    }
    
    var body: some View {
        Button(action: action) {
            content()
                .scaleEffect(isPressed ? 0.96 : (isHovered ? 1.03 : 1.0))
                .animation(.spring(response: 0.26, dampingFraction: 0.75), value: isHovered)
                .animation(.spring(response: 0.18, dampingFraction: 0.85), value: isPressed)
        }
        .buttonStyle(.plain)
        .onHover { hover in
            isHovered = hover
        }
        ._onButtonGesture { pressing in
            isPressed = pressing
        } perform: {
            action()
        }
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
                        activeColor.opacity(0.35)
                    } else if isHovered {
                        Color.white.opacity(0.12)
                    } else {
                        Color.white.opacity(0.05)
                    }
                }
            )
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(
                        LinearGradient(
                            colors: [
                                .white.opacity(configuration.isPressed ? 0.4 : (isHovered ? 0.3 : 0.15)),
                                .white.opacity(0.05)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
            .scaleEffect(configuration.isPressed ? 0.96 : (isHovered ? 1.03 : 1.0))
            .animation(.spring(response: 0.25, dampingFraction: 0.7), value: isHovered)
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

// MARK: - Native Liquid Glass Year Filter Component
struct YearFilterBar: View {
    @ObservedObject var lang = LocalizationService.shared
    @Binding var selectedYear: Int?
    var onSelect: () -> Void
    
    let years: [Int] = [
        2026, 2025, 2024, 2023, 2022, 2021, 2020,
        2019, 2018, 2017, 2016, 2015, 2014, 2012,
        2010, 2008, 2005, 2000, 1995, 1990, 1980
    ]
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                // "All Years" Pill
                Button {
                    withAnimation(.spring(response: 0.25, dampingFraction: 0.75)) {
                        selectedYear = nil
                    }
                    onSelect()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "calendar")
                            .font(.system(size: 10))
                        Text(lang.t("allYears"))
                            .font(.system(size: 11, weight: selectedYear == nil ? .bold : .medium))
                    }
                    .foregroundColor(selectedYear == nil ? .white : .white.opacity(0.65))
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(
                        selectedYear == nil
                        ? AnyView(LinearGradient(colors: [Color.blue, Color.purple], startPoint: .leading, endPoint: .trailing))
                        : AnyView(Color.white.opacity(0.06))
                    )
                    .clipShape(Capsule())
                    .overlay(
                        Capsule()
                            .stroke(selectedYear == nil ? Color.blue.opacity(0.7) : Color.white.opacity(0.12), lineWidth: 1)
                    )
                    .shadow(color: selectedYear == nil ? Color.blue.opacity(0.4) : Color.clear, radius: 6)
                }
                .buttonStyle(.plain)
                
                // Specific Year Pills
                ForEach(years, id: \.self) { year in
                    let isSelected = (selectedYear == year)
                    Button {
                        withAnimation(.spring(response: 0.25, dampingFraction: 0.75)) {
                            selectedYear = year
                        }
                        onSelect()
                    } label: {
                        Text(String(year))
                            .font(.system(size: 11, weight: isSelected ? .bold : .medium))
                            .foregroundColor(isSelected ? .white : .white.opacity(0.65))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(
                                isSelected
                                ? AnyView(LinearGradient(colors: [Color.blue, Color(red: 0.0, green: 0.4, blue: 0.95)], startPoint: .topLeading, endPoint: .bottomTrailing))
                                : AnyView(Color.white.opacity(0.06))
                            )
                            .clipShape(Capsule())
                            .overlay(
                                Capsule()
                                    .stroke(isSelected ? Color.blue.opacity(0.8) : Color.white.opacity(0.12), lineWidth: 1)
                            )
                            .shadow(color: isSelected ? Color.blue.opacity(0.4) : Color.clear, radius: 6)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 6)
        }
    }
}
