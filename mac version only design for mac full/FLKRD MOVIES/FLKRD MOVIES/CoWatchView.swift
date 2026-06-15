//
//  CoWatchView.swift
//  FLKRD MOVIES
//
//  Created by zanafaroqhado on 02/06/2026.
//

import SwiftUI
import Combine

struct CoWatchView: View {
    let movieId: String
    let movieTitle: String
    
    @Environment(\.presentationMode) var presentationMode
    @State private var pinInput = ""
    @State private var isHost = false
    @State private var activeTicket: WatchTicket? = nil
    
    // Ticket flip animation states
    @State private var isFlipped = false
    @State private var ticketPinCode = ""
    
    // Real-Time Lobby States
    @State private var messages: [RoomMessage] = []
    @State private var chatText = ""
    @State private var guestJoined = false
    
    private let lobbyTimer = Timer.publish(every: 2.0, on: .main, in: .common).autoconnect()

    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "ticket.fill")
                        .foregroundColor(.yellow)
                    Text("Co-Watch Ticket Room")
                        .font(.system(size: 16, weight: .bold))
                }
                Spacer()
                Button {
                    presentationMode.wrappedValue.dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.white.opacity(0.4))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)
            .padding(.bottom, 16)
            
            Divider().background(Color.white.opacity(0.08))
            
            ScrollView {
                VStack(spacing: 28) {
                    if activeTicket == nil {
                        // 1. Initial State: Join or Create Room Options
                        VStack(spacing: 24) {
                            
                            // Join Option
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Join a Watch Party")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.white)
                                
                                HStack(spacing: 12) {
                                    TextField("Enter 4-Digit Room PIN", text: $pinInput)
                                        .textFieldStyle(.plain)
                                        .padding(10)
                                        .glassPanel(cornerRadius: 8)
                                        .font(.system(.body, design: .monospaced))
                                    
                                    Button {
                                        joinRoom()
                                    } label: {
                                        Text("Join Room")
                                            .font(.system(size: 13, weight: .bold))
                                            .foregroundColor(.white)
                                            .padding(.horizontal, 16)
                                            .padding(.vertical, 10)
                                            .background(Color.blue)
                                            .cornerRadius(8)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(20)
                            .glassPanel()
                            
                            // Or Divider
                            HStack {
                                Rectangle().fill(Color.white.opacity(0.12)).frame(height: 1)
                                Text("OR").font(.system(size: 11, weight: .bold)).foregroundColor(.white.opacity(0.4))
                                Rectangle().fill(Color.white.opacity(0.12)).frame(height: 1)
                            }
                            
                            // Create Option
                            VStack(spacing: 16) {
                                Text("Host a New Watch Party")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.white)
                                
                                Text("Generate a premium co-watch ticket for \"\(movieTitle)\" and invite your friend using a secure PIN code.")
                                    .font(.system(size: 12))
                                    .foregroundColor(.white.opacity(0.6))
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal, 16)
                                
                                Button {
                                    generateTicket()
                                } label: {
                                    HStack(spacing: 8) {
                                        Image(systemName: "plus.square.fill.on.square.fill")
                                        Text("Generate Watch Ticket")
                                    }
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(.black)
                                    .padding(.horizontal, 24)
                                    .padding(.vertical, 12)
                                    .background(Color.yellow)
                                    .cornerRadius(8)
                                }
                                .buttonStyle(.plain)
                            }
                            .padding(20)
                            .glassPanel()
                        }
                        .padding(.horizontal, 24)
                        .padding(.top, 16)
                        
                    } else if let ticket = activeTicket {
                        // 2. Active Co-Watch Lobby State (Ticket created/joined)
                        VStack(spacing: 24) {
                            
                            // Beautiful Flippable Ticket Mock
                            ZStack {
                                if !isFlipped {
                                    TicketFrontView(movieTitle: movieTitle, pinCode: ticket.pinCode)
                                } else {
                                    TicketBackView(ticketId: ticket.id)
                                }
                            }
                            .rotation3DEffect(
                                .degrees(isFlipped ? 180 : 0),
                                axis: (x: 0.0, y: 1.0, z: 0.0)
                            )
                            .onTapGesture {
                                withAnimation(.spring(response: 0.45, dampingFraction: 0.7)) {
                                    isFlipped.toggle()
                                }
                            }
                            .frame(height: 180)
                            .padding(.horizontal, 24)
                            
                            // Lobby Controls panel
                            VStack(spacing: 16) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Watch Room Lobby")
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundColor(.white)
                                        Text(guestJoined ? "Guest is connected!" : "Waiting for guest to join...")
                                            .font(.system(size: 11))
                                            .foregroundColor(guestJoined ? .green : .orange)
                                    }
                                    Spacer()
                                    
                                    Button {
                                        launchCinemaPlayer()
                                    } label: {
                                        HStack(spacing: 6) {
                                            Image(systemName: "play.tv.fill")
                                            Text(isHost ? "Launch Cinema (Host)" : "Join Cinema (Guest)")
                                        }
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 16)
                                        .padding(.vertical, 8)
                                        .background(guestJoined ? Color.green : Color.blue)
                                        .cornerRadius(8)
                                    }
                                    .buttonStyle(.plain)
                                }
                                
                                Divider().background(Color.white.opacity(0.12))
                                
                                // Lobby Chat
                                VStack(alignment: .leading, spacing: 10) {
                                    Text("Lobby Chat")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(.white.opacity(0.8))
                                    
                                    ScrollView {
                                        VStack(alignment: .leading, spacing: 8) {
                                            ForEach(messages) { msg in
                                                HStack {
                                                    Text(msg.senderName + ":")
                                                        .font(.system(size: 11, weight: .bold))
                                                        .foregroundColor(msg.userId == "host" ? .yellow : .cyan)
                                                    Text(msg.message)
                                                        .font(.system(size: 11))
                                                        .foregroundColor(.white.opacity(0.9))
                                                    Spacer()
                                                }
                                            }
                                        }
                                    }
                                    .frame(height: 100)
                                    
                                    // Chat input
                                    HStack {
                                        TextField("Send lobby message...", text: $chatText)
                                            .textFieldStyle(.plain)
                                            .padding(8)
                                            .background(Color.black.opacity(0.3))
                                            .cornerRadius(6)
                                        
                                        Button {
                                            sendLobbyChat()
                                        } label: {
                                            Image(systemName: "paperplane.fill")
                                                .foregroundColor(.blue)
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                            .padding(20)
                            .glassPanel()
                            .padding(.horizontal, 24)
                        }
                    }
                }
                .padding(.vertical, 24)
            }
        }
        .frame(width: 480, height: 500)
        .background(VisualEffectView(material: .hudWindow).edgesIgnoringSafeArea(.all))
        .onReceive(lobbyTimer) { _ in
            if let ticket = activeTicket {
                Task {
                    await syncLobby(ticketId: ticket.id)
                }
            }
        }

    }
    
    // MARK: - Room Actions
    private func generateTicket() {
        let pin = String(format: "%04d", Int.random(in: 1000...9999))
        let hostId = UUID().uuidString
        isHost = true
        
        Task {
            do {
                let ticket = try await NetworkService.shared.createWatchTicket(movieId: movieId, hostId: hostId, pinCode: pin)
                DispatchQueue.main.async {
                    self.activeTicket = ticket
                    self.ticketPinCode = pin
                }
            } catch {
                print("Failed generating ticket: \(error)")
            }
        }
    }
    
    private func joinRoom() {
        guard pinInput.count == 4, Int(pinInput) != nil else { return }
        let guestId = UUID().uuidString
        isHost = false
        
        Task {
            do {
                if let ticket = try await NetworkService.shared.joinWatchTicket(pinCode: pinInput, guestId: guestId) {
                    DispatchQueue.main.async {
                        self.activeTicket = ticket
                        self.guestJoined = true
                    }
                } else {
                    print("Lobby room not found or active.")
                }
            } catch {
                print("Failed joining room: \(error)")
            }
        }
    }
    
    private func sendLobbyChat() {
        guard !chatText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        guard let ticket = activeTicket else { return }
        
        let text = chatText
        chatText = ""
        
        Task {
            _ = try? await NetworkService.shared.sendRoomMessage(ticketId: ticket.id, userId: isHost ? "host" : "guest", message: text)
        }
    }
    
    private func syncLobby(ticketId: String) async {
        do {
            let fetchedMsgs = try await NetworkService.shared.fetchRoomMessages(ticketId: ticketId)
            if let ticket = try await NetworkService.shared.fetchTicket(ticketId: ticketId) {
                DispatchQueue.main.async {
                    self.messages = fetchedMsgs
                    self.guestJoined = ticket.guestId != nil
                    
                    // If guest, and host changes status to 'active' (started the movie), guest launches the player!
                    if !self.isHost && ticket.status == "active" {
                        self.presentationMode.wrappedValue.dismiss()
                        PlayerWindowController.show(
                            videoURLString: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
                            movieTitle: self.movieTitle,
                            isCoWatchMode: true,
                            ticketId: ticket.id,
                            isHost: false
                        )
                    }
                }
            }
        } catch {
            print("Lobby sync failed: \(error)")
        }
    }
    
    private func launchCinemaPlayer() {
        guard let ticket = activeTicket else { return }
        
        if isHost {
            Task {
                try? await NetworkService.shared.updateTicketStatus(ticketId: ticket.id, status: "active")
                DispatchQueue.main.async {
                    self.presentationMode.wrappedValue.dismiss()
                    PlayerWindowController.show(
                        videoURLString: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
                        movieTitle: self.movieTitle,
                        isCoWatchMode: true,
                        ticketId: ticket.id,
                        isHost: true
                    )
                }
            }
        } else {
            self.presentationMode.wrappedValue.dismiss()
            PlayerWindowController.show(
                videoURLString: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
                movieTitle: self.movieTitle,
                isCoWatchMode: true,
                ticketId: ticket.id,
                isHost: false
            )
        }
    }
}

// MARK: - Futuristic Ticket Design views
struct TicketFrontView: View {
    let movieTitle: String
    let pinCode: String
    
    var body: some View {
        VStack(spacing: 0) {
            // Ticket stub upper part
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("FLKRD PREMIUM ADMIT ONE")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.yellow)
                    Text(movieTitle.uppercased())
                        .font(.system(size: 16, weight: .black, design: .rounded))
                        .foregroundColor(.white)
                        .lineLimit(1)
                }
                Spacer()
                Image(systemName: "film.fill")
                    .foregroundColor(.yellow)
                    .font(.system(size: 20))
            }
            .padding(16)
            
            // Ticket jagged dash separator
            HStack(spacing: 4) {
                Circle().fill(Color.black).frame(width: 14, height: 14).offset(x: -7)
                ForEach(0..<18) { _ in
                    Line().stroke(style: StrokeStyle(lineWidth: 1, dash: [4])).foregroundColor(.white.opacity(0.2)).frame(height: 1)
                }
                Circle().fill(Color.black).frame(width: 14, height: 14).offset(x: 7)
            }
            
            // Ticket stub lower part (Barcode & PIN)
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("ROOM SECURE CODE")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(.white.opacity(0.4))
                    Text("PIN: \(pinCode)")
                        .font(.system(size: 20, weight: .black, design: .monospaced))
                        .foregroundColor(.white)
                }
                
                Spacer()
                
                // Barcode simulation
                VStack(spacing: 2) {
                    HStack(spacing: 1.5) {
                        ForEach(0..<20) { i in
                            Rectangle()
                                .fill(Color.white.opacity(0.7))
                                .frame(width: i % 3 == 0 ? 1 : (i % 4 == 0 ? 3 : 2), height: 28)
                        }
                    }
                    Text("*\(pinCode)*")
                        .font(.system(size: 8, design: .monospaced))
                        .foregroundColor(.white.opacity(0.4))
                }
            }
            .padding(16)
        }
        .background(
            LinearGradient(
                colors: [Color(red: 0.1, green: 0.1, blue: 0.15), Color(red: 0.05, green: 0.05, blue: 0.08)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.yellow.opacity(0.3), lineWidth: 1.5)
        )
    }
}

struct TicketBackView: View {
    let ticketId: String
    
    var body: some View {
        VStack(spacing: 12) {
            Text("WATCH PARTY INSTRUCTIONS")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.yellow)
            
            VStack(alignment: .leading, spacing: 6) {
                Text("1. Share the 4-digit PIN with your friend.")
                Text("2. Wait for the Guest status to turn Green.")
                Text("3. Tap Launch Cinema to start synced player.")
                Text("4. Play/Pause/Seek stay synchronized in real-time.")
            }
            .font(.system(size: 10, weight: .medium))
            .foregroundColor(.white.opacity(0.7))
            
            Text("Session ID: \(ticketId.prefix(8))...")
                .font(.system(size: 8, design: .monospaced))
                .foregroundColor(.white.opacity(0.3))
                .padding(.top, 4)
        }
        .padding(20)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(red: 0.05, green: 0.05, blue: 0.08))
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.white.opacity(0.12), lineWidth: 1))
        .rotation3DEffect(.degrees(180), axis: (x: 0, y: 1, z: 0))
    }
}

struct Line: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.midY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.midY))
        return path
    }
}
