//
//  WhatsNewModalView.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 22/08/2026.
//

import SwiftUI

struct WhatsNewStep: Identifiable {
    let id: Int
    let badge: String
    let iconName: String
    let iconGradient: [Color]
    let titleEn: String
    let titleKu: String
    let subtitleEn: String
    let subtitleKu: String
    let bulletsEn: [String]
    let bulletsKu: [String]
}

struct WhatsNewModalView: View {
    @Binding var isPresented: Bool
    @ObservedObject var lang = LocalizationService.shared
    @State private var currentStepIndex: Int = 0
    
    let currentAppVersion = "2.5.0"
    
    let steps: [WhatsNewStep] = [
        WhatsNewStep(
            id: 0,
            badge: "⚡ ULTRA-FAST STREAMING",
            iconName: "play.tv.fill",
            iconGradient: [Color.blue, Color.cyan],
            titleEn: "Ultra-Fast 4K Multi-Server CDN",
            titleKu: "خێراترین سێرڤەری لایڤ و 4K بێ کێشە",
            subtitleEn: "8 Verified high-speed direct stream servers with zero captchas and instant 0-second server switching.",
            subtitleKu: "٨ سێرڤەری خێرای ڕاستەوخۆ بەبێ کاپچا، بەبێ وەستان و بە گۆڕینی یەکسەری سێرڤەرەکان.",
            bulletsEn: [
                "New fast CDN endpoints: AutoEmbed, Embed.su, VidSrc VIP, MoviesAPI & VidKing.",
                "Instant server switching: changing servers reconnects immediately without freezes.",
                "Third-party caption suppressor ensuring clean native player subtitles only."
            ],
            bulletsKu: [
                "سێرڤەرە نوێیە بەهێزەکان: AutoEmbed، Embed.su، VidSrc VIP، MoviesAPI و VidKing.",
                "گۆڕینی یەکسەری سێرڤەر: دەستبەجێ سێرڤەر دەگۆڕێت بەبێ بەستن و بەبێ ڕاگرتن.",
                "شاردنەوەی تەواوی نووسین و ڕیکلامە دەرەکییەکان بۆ بینینێکی خاوێن."
            ]
        ),
        WhatsNewStep(
            id: 1,
            badge: "🌐 100% KURDISH SUBTITLES",
            iconName: "captions.bubble.fill",
            iconGradient: [Color.yellow, Color.orange],
            titleEn: "100% Complete Kurdish Subtitle AI",
            titleKu: "ژێرنووسی ١٠٠٪ تەواوی کوردی و ڕەوان",
            subtitleEn: "Intelligent progressive subtitle engine translating 100% of dialogue lines into natural Sorani & Badini.",
            subtitleKu: "وەرگێڕانی زیرەکی ١٠٠٪ی دێڕەکان بە شێوازێکی زۆر ڕەوان و ڕێزمانی بۆ سۆرانی و بادینی.",
            bulletsEn: [
                "Zero skipped cues: parallel concurrent processing translates 100% of subtitle dialogue.",
                "Context-aware grammar polisher: natural colloquial phrasing instead of robotic literal translations.",
                "Accurate IMDb & TMDB auto-resolver matching Stremio & OpenSubtitles registries for all movies and TV shows."
            ],
            bulletsKu: [
                "هیچ دێڕێک لەبیر ناکرێت: هەموو قسە و دەنگەکان بە تەواوی وەردەگێڕدرێنە سەر کوردی.",
                "ڕێزمانی ڕەوان: چاککردنی وشەکان بۆ دەستەواژەی سروشتی کوردی لەجیاتی وەرگێڕانی ڕۆبۆتی.",
                "دۆزینەوەی ئۆتۆماتیکی ئایدی هەموو فیلم و زنجیرەکان لە سەرچاوە جیهانییەکان."
            ]
        ),
        WhatsNewStep(
            id: 2,
            badge: "♾️ INFINITE SAFE DISCOVERY",
            iconName: "safari.fill",
            iconGradient: [Color.green, Color.mint],
            titleEn: "Infinite Family-Safe Discovery Feeds",
            titleKu: "گەڕانی بێ‌کۆتایی و فلتەری پارێزراو بۆ خێزان",
            subtitleEn: "Infinite scroll loading all TMDB titles across Hollywood, Bollywood, Animations & Countries with strict safe filters.",
            subtitleKu: "سکڕۆڵی بێ‌کۆتایی بۆ بینینی سەرجەم داتای هۆڵیوود، بۆڵیوود، ئەنیمەیشن و وڵاتەکان بە فلتەری پارێزراو.",
            bulletsEn: [
                "Continuous infinite scrolling across Hollywood, Bollywood, Animations & 8+ countries.",
                "Strict family-safe filter: blocks 100% of romance/adult/erotic genres and keywords.",
                "Universal Year Filter selector (1970 - 2026) integrated across all Explore & Discovery categories."
            ],
            bulletsKu: [
                "سکڕۆڵی بەردەوام و بێ‌کۆتایی بۆ هۆڵیوود، بۆڵیوود، ئەنیمەیشن و وڵاتەکان.",
                "فلتەری توندی خێزانی: بلۆککردنی تەواوی فیلمە ڕۆمانسی و نەشیاوەکان.",
                "فلتەری ساڵەکان (١٩٧٠ - ٢٠٢٦) لە هەموو بەشەکانی دیسکەڤەری و بەشەکاندا."
            ]
        ),
        WhatsNewStep(
            id: 3,
            badge: "💧 LIQUID GLASS MACOS 27",
            iconName: "sparkles.tv.fill",
            iconGradient: [Color.purple, Color.indigo],
            titleEn: "Native Liquid Glass macOS Architecture",
            titleKu: "دیزاینی پرۆفیشناڵی شوشەیی و پارێزراو",
            subtitleEn: "Ultra-fluid 60/120fps hardware rendering, refined navigation, and complete crash prevention.",
            subtitleKu: "خێرایی لەڕادەبەدەر بە ٦٠/١٢٠ فریم، سڕینەوەی بەشە ناپێویستەکان و جێگیری تەواو.",
            bulletsEn: [
                "Complete removal of Shorts page eliminating unexpected crashes.",
                "High-performance 1.5GB Turbo URL Cache for zero-stutter scrolling.",
                "Co-Watch Room synchronization, smart aspect zoom, and custom Kurdish cinema presets."
            ],
            bulletsKu: [
                "سڕینەوەی تەواوەتی بەشی کورتە ڤیدیۆ (Shorts) بۆ ڕێگری لە هەر کراش و کێشەیەک.",
                "کاشی بەهێزی ناوەکی بۆ کردنەوەی خێرای وێنە و پۆستەرەکان بەبێ خاوبوونەوە.",
                "ژووری هاوبەشی سەیرکردنی فیلم لەگەڵ هاوڕێیان و کۆنتڕۆڵی ڕووناکی و ژێرنووس."
            ]
        )
    ]
    
    var isKurdish: Bool {
        lang.selectedLanguage == "ku" || lang.selectedLanguage == "badini"
    }
    
    var body: some View {
        ZStack {
            // Dark Backdrop with blur
            Color.black.opacity(0.75)
                .edgesIgnoringSafeArea(.all)
                .onTapGesture {
                    dismissModal()
                }
            
            // Liquid Glass Modal Card
            VStack(spacing: 0) {
                // Header Bar
                HStack {
                    HStack(spacing: 8) {
                        ZStack {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [Color.blue.opacity(0.8), Color.purple.opacity(0.8)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 32, height: 32)
                            
                            Image(systemName: "sparkles")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                        }
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("FLKRD MOVIES")
                                .font(.system(size: 13, weight: .black, design: .rounded))
                                .foregroundColor(.white)
                            Text("VERSION \(currentAppVersion) • WHAT'S NEW")
                                .font(.system(size: 9, weight: .bold, design: .monospaced))
                                .foregroundColor(.blue)
                        }
                    }
                    
                    Spacer()
                    
                    Button {
                        dismissModal()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 20))
                            .foregroundColor(.white.opacity(0.4))
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 24)
                .padding(.top, 20)
                .padding(.bottom, 16)
                
                Divider()
                    .background(Color.white.opacity(0.1))
                
                // Step Indicator Pills
                HStack(spacing: 8) {
                    ForEach(0..<steps.count, id: \.self) { idx in
                        Button {
                            withAnimation(.spring(response: 0.4, dampingFraction: 0.75)) {
                                currentStepIndex = idx
                            }
                        } label: {
                            HStack(spacing: 6) {
                                Circle()
                                    .fill(currentStepIndex == idx ? Color.white : Color.white.opacity(0.3))
                                    .frame(width: 6, height: 6)
                                
                                Text("0\(idx + 1)")
                                    .font(.system(size: 10, weight: .black, design: .monospaced))
                                    .foregroundColor(currentStepIndex == idx ? .white : .white.opacity(0.4))
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(
                                currentStepIndex == idx ?
                                AnyView(LinearGradient(colors: steps[idx].iconGradient, startPoint: .leading, endPoint: .trailing).opacity(0.35)) :
                                AnyView(Color.white.opacity(0.04))
                            )
                            .cornerRadius(20)
                            .overlay(
                                RoundedRectangle(cornerRadius: 20)
                                    .stroke(currentStepIndex == idx ? steps[idx].iconGradient.first ?? .blue : Color.white.opacity(0.1), lineWidth: 1)
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.top, 16)
                .padding(.horizontal, 24)
                
                // Active Slide Content with Smooth Framer-Motion style animation
                let step = steps[currentStepIndex]
                
                VStack(spacing: 16) {
                    // Feature Icon Banner
                    ZStack {
                        RoundedRectangle(cornerRadius: 20)
                            .fill(
                                LinearGradient(
                                    colors: step.iconGradient.map { $0.opacity(0.25) },
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(height: 100)
                            .overlay(
                                RoundedRectangle(cornerRadius: 20)
                                    .stroke(
                                        LinearGradient(
                                            colors: step.iconGradient.map { $0.opacity(0.5) },
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        ),
                                        lineWidth: 1
                                    )
                            )
                        
                        HStack(spacing: 16) {
                            ZStack {
                                Circle()
                                    .fill(LinearGradient(colors: step.iconGradient, startPoint: .topLeading, endPoint: .bottomTrailing))
                                    .frame(width: 60, height: 60)
                                    .shadow(color: step.iconGradient.first?.opacity(0.6) ?? .blue, radius: 12, x: 0, y: 4)
                                
                                Image(systemName: step.iconName)
                                    .font(.system(size: 28, weight: .bold))
                                    .foregroundColor(.white)
                            }
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text(step.badge)
                                    .font(.system(size: 9, weight: .black, design: .monospaced))
                                    .foregroundColor(step.iconGradient.first ?? .blue)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.black.opacity(0.3))
                                    .cornerRadius(4)
                                
                                Text(isKurdish ? step.titleKu : step.titleEn)
                                    .font(.system(size: 16, weight: .bold, design: .rounded))
                                    .foregroundColor(.white)
                                    .lineLimit(1)
                                
                                Text(isKurdish ? step.subtitleKu : step.subtitleEn)
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundColor(.white.opacity(0.7))
                                    .lineLimit(2)
                            }
                            
                            Spacer()
                        }
                        .padding(.horizontal, 20)
                    }
                    .padding(.horizontal, 24)
                    
                    // Feature Bullets List
                    VStack(alignment: .leading, spacing: 10) {
                        let bullets = isKurdish ? step.bulletsKu : step.bulletsEn
                        ForEach(bullets, id: \.self) { bullet in
                            HStack(alignment: .top, spacing: 10) {
                                Image(systemName: "checkmark.seal.fill")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(step.iconGradient.first ?? .blue)
                                    .padding(.top, 2)
                                
                                Text(bullet)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(.white.opacity(0.9))
                                    .fixedSize(horizontal: false, vertical: true)
                                
                                Spacer()
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color.white.opacity(0.04))
                            .cornerRadius(10)
                        }
                    }
                    .padding(.horizontal, 24)
                }
                .padding(.top, 16)
                .transition(.asymmetric(insertion: .opacity.combined(with: .scale(scale: 0.98)), removal: .opacity))
                .id(currentStepIndex)
                
                Spacer()
                
                Divider()
                    .background(Color.white.opacity(0.1))
                
                // Bottom Navigation Footer
                HStack {
                    if currentStepIndex > 0 {
                        Button {
                            withAnimation(.spring(response: 0.4, dampingFraction: 0.75)) {
                                currentStepIndex -= 1
                            }
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "chevron.left")
                                    .font(.system(size: 11, weight: .bold))
                                Text(isKurdish ? "پێشوو" : "Previous")
                                    .font(.system(size: 12, weight: .bold))
                            }
                            .foregroundColor(.white.opacity(0.7))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(Color.white.opacity(0.08))
                            .cornerRadius(10)
                        }
                        .buttonStyle(.plain)
                    } else {
                        Button {
                            dismissModal()
                        } label: {
                            Text(isKurdish ? "داخستن" : "Skip")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.white.opacity(0.4))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                        }
                        .buttonStyle(.plain)
                    }
                    
                    Spacer()
                    
                    if currentStepIndex < steps.count - 1 {
                        Button {
                            withAnimation(.spring(response: 0.4, dampingFraction: 0.75)) {
                                currentStepIndex += 1
                            }
                        } label: {
                            HStack(spacing: 8) {
                                Text(isKurdish ? "دواتر" : "Next Step")
                                    .font(.system(size: 12, weight: .bold))
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 11, weight: .bold))
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 10)
                            .background(
                                LinearGradient(
                                    colors: [Color.blue, Color.purple],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(10)
                            .shadow(color: Color.blue.opacity(0.4), radius: 8, x: 0, y: 4)
                        }
                        .buttonStyle(.plain)
                    } else {
                        Button {
                            dismissModal()
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "play.fill")
                                    .font(.system(size: 11, weight: .black))
                                Text(isKurdish ? "دەستپێکردن و سەیرکردن" : "Start Watching Now")
                                    .font(.system(size: 12, weight: .black))
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 10)
                            .background(
                                LinearGradient(
                                    colors: [Color.green, Color.blue],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(10)
                            .shadow(color: Color.green.opacity(0.4), radius: 8, x: 0, y: 4)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 18)
            }
            .frame(width: 580, height: 500)
            .background(
                VisualEffectView(material: .hudWindow)
            )
            .cornerRadius(24)
            .overlay(
                RoundedRectangle(cornerRadius: 24)
                    .stroke(
                        LinearGradient(
                            colors: [Color.white.opacity(0.3), Color.white.opacity(0.05), Color.blue.opacity(0.2)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1.2
                    )
            )
            .shadow(color: Color.black.opacity(0.85), radius: 30, x: 0, y: 15)
        }
    }
    
    private func dismissModal() {
        UserDefaults.standard.set(currentAppVersion, forKey: "last_seen_app_version")
        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
            isPresented = false
        }
    }
}
