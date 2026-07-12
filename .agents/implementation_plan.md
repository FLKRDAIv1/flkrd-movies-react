# TV Fullscreen Player Controls Visibility and Interactions Plan

This plan details the changes required to ensure that the TV player's top control buttons ("ئەڵقەکان" / Episodes, "STUDIO" / CC, "RELINK") and their associated overlays (Episodes Portal, Subtitle Manager Panel, Source Switcher Drawer) work correctly and are fully visible under native/Tauri fullscreen in both `UniversalVideoPlayer` and `PremiumVidLinkPlayer`.

## User Review Required

> [!IMPORTANT]
> 1. **Positioning Fix**: Overlays that use `position: fixed` (like `SubtitleManagerPanel`) are hidden or mispositioned by the browser under native fullscreen mode because of stacking context overrides. We will change the outer container of `SubtitleManagerPanel` to use `position: absolute`. Since both player containers are `relative` (or `fixed` when simulated), `absolute` behaves identically to `fixed` but remains perfectly visible in native fullscreen.
> 2. **Nesting Correction**: In `UniversalVideoPlayer.tsx`, the `SubtitleManagerPanel` is nested inside the top-right settings button container (`absolute top-4 right-4 flex-row`). This distorts the panel's layout when positioned `absolute`. We will move it to be a direct child of the player root container, matching `PremiumVidLinkPlayer.tsx`.
> 3. **Search & Studio Button Access**: In `UniversalVideoPlayer.tsx`, the Studio button is disabled when `availableSubs.length === 0`. We will remove this restriction so that clicking it triggers a subtitle search/upload, matching `PremiumVidLinkPlayer.tsx`.
> 4. **Always-On Relink**: We will remove the `isFullscreen` requirement for showing the Relink button in both players' top controls. This ensures users can always access the premium glassmorphic source switcher drawer.

## Proposed Changes

### Subtitle Manager Panel

#### [MODIFY] [SubtitleManagerPanel.tsx](file:///Users/zanafaroqhado/Downloads/flkrd-movies%20(27)%202/components/SubtitleManagerPanel.tsx)

* Change the outer div's class name from `fixed inset-0` to `absolute inset-0` so it renders correctly inside native fullscreen stacking contexts:
```diff
-      className="fixed inset-0 z-[200] flex items-end justify-center md:items-center md:justify-end p-0 md:p-6 pointer-events-none"
+      className="absolute inset-0 z-[200] flex items-end justify-center md:items-center md:justify-end p-0 md:p-6 pointer-events-none"
```

---

### Universal Video Player

#### [MODIFY] [UniversalVideoPlayer.tsx](file:///Users/zanafaroqhado/Downloads/flkrd-movies%20(27)%202/components/UniversalVideoPlayer.tsx)

* **Refactor Settings Menu Layout**:
  * Move `SubtitleManagerPanel`'s `<AnimatePresence>` rendering block out of the top-right settings container (`absolute top-4 right-4`) and place it as a sibling child near `showEpisodesPortal` and `showSourceSwitcher` at the bottom of the component.
  * Enable the Studio button unconditionally (remove `disabled={availableSubs.length === 0}`).
  * Remove the `isFullscreen` condition for rendering the `RefreshCcw` (Relink) button.
  * Update classes to be consistent with `PremiumVidLinkPlayer.tsx`'s styling and hover effects.
  * Sync Tauri fullscreen state inside `toggleFullscreen` manually (`setIsFullscreen(!f)`).

---

### Premium Video Player

#### [MODIFY] [PremiumVidLinkPlayer.tsx](file:///Users/zanafaroqhado/Downloads/flkrd-movies%20(27)%202/components/PremiumVidLinkPlayer.tsx)

* **Refactor Top Controls**:
  * Remove the `isFullscreen` condition from the `RefreshCcw` (Relink) button inside the top controls bar.
  * Add hover effects (`hover:bg-white/20 hover:text-white transition-all`) and micro-animations to all controls buttons.
  * Remove `isFullscreen` condition check for rendering the `showSourceSwitcher` drawer.
  * Sync Tauri fullscreen state inside `toggleFullscreen` manually (`setIsFullscreen(!f)`).

## Verification Plan

### Automated Tests
* Validate compilation and type safety:
  ```bash
  npx tsc --noEmit
  ```

### Manual Verification
1. Run local development server:
   ```bash
   npm run dev
   ```
2. Open a TV Show episode to start playback.
3. Test native fullscreen mode by clicking the fullscreen icon.
4. Verify that:
   * The top controls header bar remains visible.
   * Clicking "ئەڵقەکان" (Episodes) opens the episodes list drawer.
   * Clicking "STUDIO" (CC) opens the subtitle studio settings.
   * Clicking "RELINK" opens the media source switcher drawer.
   * Clicking different seasons/episodes and switching streaming servers works perfectly in native fullscreen.
