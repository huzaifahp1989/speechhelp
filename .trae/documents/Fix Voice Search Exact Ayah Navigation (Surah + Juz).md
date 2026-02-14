## Goals
- Voice search always navigates to the correct verse_key and starts playback from that exact ayah.
- Works consistently across Surah pages and Juz pages.
- Avoids “wrong ayah plays” even when audio is already playing and user voice-jumps.

## What’s Broken (Root Causes)
- **Audio preloading can play the wrong file**: the preload cache stores only a blob URL (not which verse it belongs to) and has no stale-request protection, so a previous preload can be reused for a different “next” ayah. This explains “wrong ayah when being played”, especially after jumping via voice while something was already playing. ([useQuranAudio.ts](file:///c:/Users/huzai/Documents/trae_projects/speechhelp/src/hooks/useQuranAudio.ts#L50-L224))
- **Juz hash jump is unreliable**: Juz page looks up `document.getElementById(hash)` but verses are rendered with ids like `verse-2:255`, so a hash like `#2:255` won’t be found; Surah page already has a safer fallback, Juz page does not. ([JuzClient.tsx](file:///c:/Users/huzai/Documents/trae_projects/speechhelp/src/app/quran/juz/%5Bid%5D/JuzClient.tsx#L80-L125))

## Fix Plan

## 1) Make Audio Playback Deterministic (Stop Wrong-Ayah Audio)
- Update the preload cache in [useQuranAudio.ts](file:///c:/Users/huzai/Documents/trae_projects/speechhelp/src/hooks/useQuranAudio.ts) to store `{ verseKey, blobUrl }` (not just a blob URL).
- Add a stale-request guard for preloads:
  - Use an `AbortController` per preload, or a monotonically increasing `requestId` ref.
  - Cancel/ignore old preloads when `playingAyahKey` changes or when voice recording starts.
- When `playNext(..., usePreloaded=true)` is called, only use the preload blob if `preloaded.verseKey === computedNextVerseKey`. Otherwise, fall back to the normal URL.
- Clear preload state when:
  - `pause()` is called for voice recording.
  - `play()` switches to a new verse.

## 2) Guarantee “Go Straight to Ayah” Navigation for Surah + Juz
- Standardize all verse navigation to use a single explicit param:
  - `startingVerse=<verse_key>` and an element anchor `#verse-<verse_key>`.
- Update Surah navigation handling in [SurahClient.tsx](file:///c:/Users/huzai/Documents/trae_projects/speechhelp/src/app/quran/%5BsurahId%5D/SurahClient.tsx) to:
  - Prefer `startingVerse` for autoplay/scroll.
  - Fall back to hash only if needed.
- Update Juz navigation handling in [JuzClient.tsx](file:///c:/Users/huzai/Documents/trae_projects/speechhelp/src/app/quran/juz/%5Bid%5D/JuzClient.tsx) to:
  - Add `startingVerse` support (mirrors Surah behavior).
  - Fix hash lookup to try both `id` and `verse-<id>` like Surah does.
  - Keep `ayahIndex` support for backwards compatibility, but prefer `startingVerse` when available.

## 3) Make Voice Matching More Accurate Without “Wrong Jumps”
- In [UnifiedSearch.tsx](file:///c:/Users/huzai/Documents/trae_projects/speechhelp/src/components/UnifiedSearch.tsx):
  - Fetch more candidates for recitation matching (e.g., 50) when voice final is received.
  - Re-rank candidates by phonetic-normalized overlap (Arabic letter confusions) and full-string similarity.
  - Add a **hard confidence threshold**:
    - If score is high → auto navigate + autoplay.
    - If score is low → do NOT auto-jump (prevents wrong verse); instead show top 5 matches user can tap.
- Apply the same navigation URL format everywhere (voice result, typed result click): `?autoplay=true&startingVerse=...#verse-...`.

## 4) Verification
- Manual test matrix (in dev):
  - Voice recite a known ayah (e.g., 3:185) from Surah page and from Juz page; verify it scrolls + highlights + plays correct ayah.
  - Start audio on one ayah, then voice-jump to a different ayah; verify audio plays the new ayah and next ayah progression remains correct.
  - Voice “Juz 30” then recite an ayah from that juz; verify exact verse.
- Add lightweight logging (dev-only) around: recognized text, chosen verse_key, confidence score, and whether preload was used.

## Files Expected to Change
- [useQuranAudio.ts](file:///c:/Users/huzai/Documents/trae_projects/speechhelp/src/hooks/useQuranAudio.ts)
- [UnifiedSearch.tsx](file:///c:/Users/huzai/Documents/trae_projects/speechhelp/src/components/UnifiedSearch.tsx)
- [SurahClient.tsx](file:///c:/Users/huzai/Documents/trae_projects/speechhelp/src/app/quran/%5BsurahId%5D/SurahClient.tsx)
- [JuzClient.tsx](file:///c:/Users/huzai/Documents/trae_projects/speechhelp/src/app/quran/juz/%5Bid%5D/JuzClient.tsx)

## Outcome
- Voice search reliably lands on the exact ayah and plays it.
- Juz + Surah autoplay/jump behavior becomes consistent.
- Wrong-audio playback caused by preload race/mismatch is eliminated.