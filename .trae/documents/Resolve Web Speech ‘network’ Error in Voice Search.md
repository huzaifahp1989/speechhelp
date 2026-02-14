## Diagnosis
- Identify environment constraints that cause Web Speech API to emit `network` (service unavailable) even when online.
- Distinguish cases: offline, blocked mic permission, embedded iframe preview, ad-block/VPN/firewall interference, transient service failures.
- Inspect current handling in VoiceSearch for error mapping and preflight permission.

## Implementation
- Add iframe detection: if `window.self !== window.top`, show a clear message and provide an “Open in new tab” button; disable voice search in embedded previews.
- Add preflight mic check: call `getUserMedia({audio:true})`, stop tracks, then delay 100–200ms before `recognition.start()`; already present but make the delay configurable and retry if it fails.
- Implement retry/backoff: on `network` error, automatically retry `recognition.start()` up to 2 times with exponential delays (300ms, 1000ms), then surface guidance.
- Improve guidance: replace generic messages with actionable tips (refresh page, disable VPN/ad-block, grant mic permission, use HTTPS/top-level tab).
- Harden global search fallback: handle 204 (no results) distinctly, show “Please speak clearly” for empty input, and map `Failed to fetch` to network guidance.
- Optional: add Permissions-Policy header to Next.js (`microphone=(self)`) for production/Vercel; this helps top-level pages and documents intent (not effective in embedded iframes without `allow` attribute).

## Verification
- Test in Chrome, Edge, Safari (desktop/mobile) with: normal, VPN on, ad-block on, embedded preview vs new tab.
- Confirm that:
  - Voice search starts and returns results in top-level tabs.
  - Embedded preview shows guidance and opens a new tab when requested.
  - `network` errors auto-retry and then surface targeted guidance.
  - Global search fallback errors display clearly.

## Files to Update
- Voice search logic: [VoiceSearch.tsx](file:///c:/Users/huzai/Documents/trae_projects/speechhelp/src/components/VoiceSearch.tsx)
- Optional headers: next.config.js headers() (Permissions-Policy)