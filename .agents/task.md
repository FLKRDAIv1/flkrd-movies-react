# TV Fullscreen Player Controls Checklist

- [x] Change outer container styling of `SubtitleManagerPanel.tsx` from `fixed` to `absolute`.
- [x] Refactor Settings Menu and overlays layout inside `UniversalVideoPlayer.tsx`.
  - [x] Move `SubtitleManagerPanel` outside the settings menu flex container.
  - [x] Enable the Studio button unconditionally (remove `disabled` check).
  - [x] Remove `isFullscreen` condition from the local Relink button.
  - [x] Add Tauri fullscreen state synchronization to `toggleFullscreen`.
- [x] Refactor controls and drawers inside `PremiumVidLinkPlayer.tsx`.
  - [x] Remove `isFullscreen` condition from the local Relink button.
  - [x] Add hover/active states and micro-animations to top controls.
  - [x] Remove `isFullscreen` check from the local source switcher drawer rendering.
  - [x] Add Tauri fullscreen state synchronization to `toggleFullscreen`.
- [x] Verify type-safety with `npx tsc --noEmit`.
- [x] Deploy changes to production using Vercel.
