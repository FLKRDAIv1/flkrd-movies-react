
# FLKRD Subtitle Translation Pipeline — 5-Issue Fix Plan

## Issue 1: Translated subtitles sometimes don't load in the video player

**Root cause analysis:**
There are **3 redundant `flkrd-subtitle-translated` dispatchers** (UIContext live progressive, UIContext final, and pipeline final). The problem is a **type mismatch on `tmdbId`**:
- `UIContext.startGlobalTranslation()` dispatches `tmdbId` as **string|number** (whatever was passed)
- `subtitleTranslationService.ts` dispatches `tmdbId: String(tmdbId)` (always string)
- The **PremiumVidLinkPlayer** event handler at line 1050 does NOT validate `tmdbId` — it applies subtitles from ANY tmdbId
- The **UniversalVideoPlayer** event handler at line 1015 uses `e.detail?.tmdbId || tmdbId || imdbId` — it applies even cross-movie events

This means: if a user has two tabs open (movie A and movie B), events from one tab can overwrite the other. Also, the triple dispatch creates race conditions where a partial-progress data URI (85% complete) can arrive AFTER the final 100% URL, overwriting it.

**Fix (3 files):**

### `contexts/UIContext.tsx` (line 769-772, 789-792):
1. Add `srtContent` field to the live progressive event (currently missing — only `subtitleUrl` is sent, which is a base64 data URI)
2. Remove the final completion event dispatch at line 789-792 — it's redundant since `subtitleTranslationService.ts` already dispatches at line 588 with the full `srtContent` field
3. Keep the live progressive dispatch but add a `progress: progress` field so players can distinguish partial vs final events

### `services/subtitleTranslationService.ts` (line 586-600):
1. Add `progress: 100` and `isFinal: true` fields to the detail payload so listeners can distinguish the completion event from partial updates

### `components/PremiumVidLinkPlayer.tsx` (line 1048-1100):
1. Add `tmdbId` guard — only process events where `e.detail.tmdbId` matches the current player's `resolvedTmdbId || tmdbId || imdbId` (coerced to string)
2. Add `isFinal` guard — when a final event arrives, always apply it even if `resolvedSubUrl` already matches (to ensure cues are parsed for data URIs)

### `components/UniversalVideoPlayer.tsx` (line 1014-1067):
1. Same `tmdbId` guard — only process events matching current content
2. Add `isFinal` handling to always force-apply completion events

---

## Issue 2: Translation speed — raise concurrency 8→12 with adaptive backoff

**File: `services/subtitleTranslationService.ts` lines 274-321**

**Changes:**
1. Raise `concurrency` from `8` to `12` (line 281)
2. Add adaptive backoff: track consecutive errors per batch; if any chunk in a batch fails, add a 200ms delay before the next batch (up to 800ms max backoff)
3. Keep `chunkSize` at 25 (12 × 25 = 300 lines translating simultaneously)

This is a minimal, safe change — the existing recursive fallback splitting already handles individual chunk failures, so higher concurrency won't lose accuracy.

---

## Issue 3: Expand Persian→Kurdish regex correction table

**Both `api/translate.js` (lines 126-171) and `services/subtitleTranslationService.ts` (lines 14-59)** need identical additions.

**New entries to add (40+ new patterns covering common Farsi verb/noun forms):**

| Persian Pattern | Kurdish Replacement |
|---|---|
| `\bنمی\u200Cکند\b` / `\bنمی کند\b` | `ناکات` |
| `\bنمی\u200Cشود\b` / `\bنمی شود\b` | `نابێت` |
| `\bنمی\u200Cتوانم\b` / `\bنمی توانم\b` | `ناتوانم` |
| `\bنمی\u200Cخواهم\b` / `\bنمی خواهم\b` | `نامەوێت` |
| `\bنمی\u200Cدانم\b` / `\bنمی دانم\b` | `نازانم` |
| `\bنمی\u200Cبینم\b` / `\bنمی بینم\b` | `نابینم` |
| `\bخواهد رفت\b` / `\bخواهد آمد\b` | `دەچێت` / `دێت` |
| `\bخواهد شد\b` | `دەبێت` |
| `\bخواهد کرد\b` | `دەکات` |
| `\bباید\b` | `دەبێت` |
| `\bنمی\u200Cتواند\b` / `\bنمی تواند\b` | `ناتوانێت` |
| `\bنمی\u200Cآید\b` / `\bنمی آید\b` | `نایێت` |
| `\bنمی\u200Cروم\b` / `\bنمی روم\b` | `نایچێت` |
| `\bخواهم کرد\b` | `دەکەم` |
| `\bخواهی کرد\b` | `دەکەیت` |
| `\bمی\u200Cخواهم رفت\b` | `دەچێم` |
| `\bمی\u200Cخواهم شد\b` | `دەبێم` |
| `\bمی\u200Cرفتم\b` / `\bرفتم\b` | `چووم` |
| `\bمی\u200Cآمدم\b` / `\bآمدم\b` | `هاتم` |
| `\bمی\u200Cدیدم\b` / `\bدیدم\b` | `دیدم` |
| `\bمی\u200Cگفتم\b` / `\bگفتم\b` | `گوتم` |
| `\bمی\u200Cخوردم\b` | `خواردم` |
| `\bمی\u200Cنشستم\b` | `نیشتم` |
| `\bمی\u200Cخوابیدم\b` | `خەوتم` |
| `\bمی\u200Cایستادم\b` | `وەستام` |
| `\bمی\u200Cدویدم\b` | `ڕاوەدایم` |
| `\bچرا\b` | `بۆچی` |
| `\bچگونه\b` | `چۆن` |
| `\bکجا\b` | `لەکوێ` |
| `\bهنگام\b` | `کاتێک` |
| `\bتا\b` | `هەتا` |
| `\bاز\b` | `لە` |
| `\bبه\b` | `بە` (unbound word) |
| `\bهمچنین\b` / `\bهمچنین\b` | `هەروەها` |
| `\bچه\b` | `چ` / `چی` |
| `\bبسیار\b` | `زۆر` |
| `\bخوب\b` | `باش` |
| `\bبد\b` | `خراپ` |
| `\bبله\b` | `بەڵێ` |
| `\bنه\b` | `نەخێر` |
| `\bخیلی\b` | `زۆر` |

All ZWNJ variants (`می‌` vs `می `) will be included for each verb pattern.

---

## Issue 5: Progress bar freezes at 86% during SRT compilation + upload

**Root cause:** The pipeline jumps from ~85% (last chunk) directly to 86% ("Compiling SRT"), then 90% ("Uploading"), then 94% ("Retrieving URL"), then 100%. The SRT compilation itself is synchronous and fast, but the Supabase storage upload at 90% can take 2-5 seconds with no intermediate updates, appearing frozen.

**File: `services/subtitleTranslationService.ts` lines 485-602**

**Fix:** Add intermediate progress reporting:
1. **86%** → "Compiling translated dialogue to SRT format..." (unchanged)
2. **88%** → "Preparing subtitle file for upload..." (after blob creation)
3. **90%** → "Uploading SRT subtitle to Supabase storage..." (unchanged — but add a `setTimeout(0)` yield to let the UI paint)
4. **92%** → "Upload complete, registering in database..." (after storage success)
5. **94%** → "Retrieving secure public URL..." (unchanged)
6. **97%** → "Broadcasting to all connected viewers..." (after DB registry)
7. **100%** → "Subtitle fully registered and active!" (unchanged)

Also: add `await new Promise(r => setTimeout(r, 0))` before each network call to yield to the browser event loop so the progress UI actually repaints between steps.

---

## Files Modified (summary)

| File | Changes |
|---|---|
| `services/subtitleTranslationService.ts` | Concurrency 8→12 + adaptive backoff, expanded regex table (40+ entries), granular progress steps, `isFinal` + `progress` in event detail |
| `api/translate.js` | Expanded regex table (same 40+ entries, synced with client) |
| `contexts/UIContext.tsx` | Add `srtContent` to live event, remove redundant final dispatch |
| `components/PremiumVidLinkPlayer.tsx` | `tmdbId` guard + `isFinal` handling in event listener |
| `components/UniversalVideoPlayer.tsx` | `tmdbId` guard + `isFinal` handling in event listener |

**Zero breaking changes:** The `onProgress` callback signature `(progress, statusText, partialSubtitleUrl?)` stays identical. The `translateAndSavePipeline` return type `{ success, subtitleUrl?, error? }` stays identical. The `cleanPersianToKurdish()` function signature stays identical. Watermark cues in `compileToSRT()`, `compileToVTT()`, and `parseVtt()` are untouched.
