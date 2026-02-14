## What’s failing
- Build fails because [UnifiedSearch.tsx](file:///c:/Users/huzai/Documents/trae_projects/speechhelp/src/components/UnifiedSearch.tsx) checks `match.action === 'scroll'` inside the `match.type === 'surah'` branch.
- After tightening `SearchResult` typing, `surah` matches can only be `action: 'navigate'`, so comparing against `'scroll'` is a TypeScript error.
- Also, calling `onAyahFound(match.target, true)` for a `surah` match is logically wrong because `match.target` is a surah id string (not a verse_key).

## Minimal code change
- Edit [UnifiedSearch.tsx](file:///c:/Users/huzai/Documents/trae_projects/speechhelp/src/components/UnifiedSearch.tsx#L247-L255):
  - Replace the `surah` block with a single navigation:
    - Always `router.push(`/quran/${match.result.id}?autoplay=true&reciter=${selectedReciterId}&t=${Date.now()}`)`.
  - Remove the `match.action === 'scroll'` conditional and the invalid `onAyahFound(match.target, true)` call.

## Verification
- Run `npm run build` to confirm the deploy TypeScript error is gone.
- Quick sanity check: voice “surah …” still navigates correctly; voice “ayah …” still scrolls/plays locally when `onAyahFound` is provided.