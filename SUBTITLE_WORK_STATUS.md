# Subtitle Studio & Translation Work Status

This file serves as a memory sync to remember the context, setup details, and accomplished tasks for the Subtitle & Translation feature across coding sessions.

---

## 🔗 Key Endpoints & Target Codes

* **Google Apps Script URL**: 
  `https://script.google.com/macros/s/AKfycbzt-Bus8kvLiywcXX16pnPLbvcbAGSf7euGm3hw0pB4xbrb7CzlddQspR1pLg22MRbCSQ/exec`
  * *Purpose*: Direct translation of English/foreign `.vtt`/`.srt` subtitle lines to Kurdish.
* **Kurdish Translation Language Target**: `ckb` (Kurdish Sorani)
  * *Standard Mapping*: The pipeline sends `targetLang: 'ckb'`. The Apps Script endpoint translates using standard translation engines.

---

## 🛠️ Work Accomplished

### 1. Swipe Down to Dismiss (Mobile)
* **File**: [components/SubtitleManagerPanel.tsx](file:///Users/zanafaroqhado/Downloads/flkrd-movies%20(27)%202/components/SubtitleManagerPanel.tsx)
* **Details**: Integrated Framer Motion drag gestures. Swiping down on mobile slides the panel down and triggers `onClose`.
* **Gesture Conflict Fix**: Leveraged `useDragControls` and bound it only to the top visual handle, preventing drag gestures from blocking scrollable subtitle tracks inside the modal.

### 2. Parent Player Integration & Click Block Fix
* **Files**:
  * [components/UniversalVideoPlayer.tsx](file:///Users/zanafaroqhado/Downloads/flkrd-movies%20(27)%202/components/UniversalVideoPlayer.tsx)
  * [components/PremiumVidLinkPlayer.tsx](file:///Users/zanafaroqhado/Downloads/flkrd-movies%20(27)%202/components/PremiumVidLinkPlayer.tsx)
* **Details**: Wrapped `<SubtitleManagerPanel>` with `<AnimatePresence>` and `{showSubSettings && ( ... )}` in both players. This ensures the backdrop overlay and drawer completely unmount when closed, removing the backdrop's active pointer events from blocking clicks on player controls (like Relink, TV icon, play buttons).

### 3. Subtitle Search Bypass Fix
* **File**: [components/PremiumVidLinkPlayer.tsx](file:///Users/zanafaroqhado/Downloads/flkrd-movies%20(27)%202/components/PremiumVidLinkPlayer.tsx)
* **Details**: Replaced the local check `if (availableSubs.length > 0) return;` with a state-tracked `hasSearchedCloud` flag. This allows the player to fetch cloud subtitle options from OpenSubtitles/SubDL even if local or pre-established Kurdish tracks are already injected.

### 4. Layout Refresh & Larger Track List
* **File**: [components/SubtitleManagerPanel.tsx](file:///Users/zanafaroqhado/Downloads/flkrd-movies%20(27)%202/components/SubtitleManagerPanel.tsx)
* **Details**: Cleaned up the Subtitles tab by migrating styling adjusters (**Font Size**, **Color Swatches**, **Sync Delay**) to the Display/Lighting tab. Increased the maximum height of the subtitle track list scroll container to `max-h-[55vh]` for a taller, cleaner, and more professional list display.

---

## 🚀 How to Validate

1. Run the local development server:
   ```bash
   npm run dev
   ```
2. Check type compiler correctness:
   ```bash
   npx tsc --noEmit
   ```
3. Open a video link in either the native/universal player or the Premium VidLink player.
4. Toggle subtitle settings, verify search results pop up, and that clicking outside or swiping down closes the menu and restores page clicks immediately.
