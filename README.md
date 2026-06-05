<div align="center">
  <img src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" width="100%" alt="FKURD MOVIES Banner" style="border-radius: 2rem; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 2rem;" />
  
  # 🎬 FKURD MOVIES (`fkurd.pro`)
  
  [![Production Portal](https://img.shields.io/badge/Production-fkurd.pro-E50914?style=for-the-badge&logo=vercel&logoColor=white)](https://fkurd.pro)
  [![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](#)
  [![React](https://img.shields.io/badge/React-19.1.0-61DAFB?style=for-the-badge&logo=react&logoColor=white)](#)
  [![Supabase](https://img.shields.io/badge/Supabase-Realtime-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](#)
  [![Tauri](https://img.shields.io/badge/Tauri-Desktop-24C6C1?style=for-the-badge&logo=tauri&logoColor=white)](#)

  **FKURD MOVIES** is a proprietary, hardware-optimized synchronized cinema application designed to stream Kurdish dubbed and subtitled media. Leveraging state-of-the-art web performance patterns, it delivers a native-like cinema experience across desktop, mobile platforms, and Tauri-based desktop shells.
</div>

---

## 🔒 Proprietary Application Overview

This repository contains the source code for the private deployment of **FKURD MOVIES**. It is hosted and distributed under strict licensing, and is not open for public modification, cloning, or redistribution.

### 🖥️ 1. Multi-Device Native Shells
*   **iOS Config Profile Engine**: Generates and packages Apple configuration profiles (`.mobileconfig`) on-the-fly, allowing mobile users to install the application as a standalone, native-behaving iOS web clip.
*   **Tauri Desktop Shell**: Native integration with the Tauri runtime for desktop distribution, featuring custom drag regions, custom windows controls, and full-screen hardware-accelerated presentation modes.
*   **Spatial Navigation Engine**: Console-style focus navigation mapping standard keyboard arrow keys, gamepads, and remote controls with an animated focus glow.

### 🔄 2. Synchronized Co-Watching
*   **Real-Time Playback Synchronization**: Automatic syncing of play, pause, and seek events. Host commands are broadcasted to guest clients over Supabase Realtime Channels.
*   **No-Auth Guest Access**: Anonymous guest users join rooms securely using 4-digit PIN codes generated dynamically for each session.
*   **Chat Subsystem**: Dynamic room conversation list driven by real-time publications.

### 🌐 3. Multi-Server Smart Routing
*   **Dynamic Priority Balancing**: Evaluates and routes media streams through ranked server priorities (e.g. `Videasy` / `FKURD SERVER 1`, `VidLink Pro` / `FKURD SERVER 2`, `SuperEmbed`).
*   **Autoplay & Custom Subtitle Injection**: Automated discovery and loading of custom Kurdish subtitles with full query parameters passed to compliant media players.

---

## 📊 System Architecture & Data Flow

Below is the architectural flow diagram showing how **FKURD MOVIES** coordinates media streaming, client routing, and Supabase real-time synchronization:

```mermaid
sequenceDiagram
    autonumber
    actor Host as Host Client
    actor Guest as Guest Client
    participant App as FKURD Frontend (React)
    participant SB as Supabase Realtime
    participant Server as Streaming Nodes (Videasy/VidLink)

    Note over Host, Guest: 1. Co-Watch Initiation
    Host->>App: Clicks "CO-WATCH" button
    App->>SB: Inserts Watch Ticket into database
    SB-->>Host: Returns Room Code (UUID) & 4-Digit PIN
    Host->>Guest: Shares Room URL (fkurd.pro/watch/ticket_id)
    Guest->>App: Enters 4-Digit PIN
    App->>SB: Authenticates and updates Guest ID in session

    Note over Host, Guest: 2. Playback Synchronization Loop
    Host->>App: Presses PLAY / SEEKS Video
    App->>SB: Broadcasts playState & progress (host_id, progressSeconds, status)
    SB-->>Guest: Pushes Realtime payload update
    App->>Server: Hydrates Iframe URL with progress/start params
    Server->>Guest: Renders synchronized stream at matching timestamp

    Note over Host, Guest: 3. Realtime Conversation
    Host->>App: Sends message in Chat Panel
    App->>SB: Inserts message into database
    SB-->>Guest: Realtime broadcasts new message
    Guest->>App: Renders message in conversation list
```

---

## 🛠️ Technology Stack

*   **Frontend Engine**: React 19 (StrictMode)
*   **Router Control**: React Router DOM v7 (View Transitions API enabled)
*   **Layout & Styling**: Tailwind CSS & Vanilla CSS Design Tokens
*   **Animations**: Framer Motion & CSS hardware-accelerated keyframe composite layers
*   **Desktop Shell**: Tauri v2
*   **Database & Real-Time Sync**: Supabase (PostgreSQL + Realtime Publications)
*   **AI Integration**: Powered by Google AI Studio (Gemini Pro models) for underlying catalog metadata enrichment and language translation processing.

---

## 📄 License & Terms of Use

All rights reserved. The source code, assets, configurations, and documentation within this project are proprietary property. Authorized access only.
