/** Shared Quran recitation audio element (persists across reader pages). */
export function stopGlobalQuranAudio(): void {
  if (typeof window === 'undefined') return;
  const g = globalThis as typeof globalThis & { __SPEECHHELP_AUDIO__?: HTMLAudioElement };
  const audio = g.__SPEECHHELP_AUDIO__;
  if (!audio) return;
  try {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    window.dispatchEvent(new Event('speechhelp:quran-audio-stop'));
  } catch {
    /* ignore */
  }
}

/** Remove autoplay from URL so browser back does not restart audio. */
export function stripAutoplayFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('autoplay')) return;
    url.searchParams.delete('autoplay');
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    /* ignore */
  }
}

let skipAutoplayOnce = false;
let autoplayGuardReady = false;

/** Call once on client — back/forward must not trigger autoplay. */
export function initQuranAutoplayGuard(): void {
  if (typeof window === 'undefined' || autoplayGuardReady) return;
  autoplayGuardReady = true;
  window.addEventListener('popstate', () => {
    skipAutoplayOnce = true;
    stopGlobalQuranAudio();
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      skipAutoplayOnce = true;
      stopGlobalQuranAudio();
    }
  });
}

/** True only for fresh navigations with ?autoplay=true — not browser back/forward. */
export function shouldAutoplayFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  initQuranAutoplayGuard();
  if (skipAutoplayOnce) {
    skipAutoplayOnce = false;
    return false;
  }
  const url = new URL(window.location.href);
  return url.searchParams.get('autoplay') === 'true';
}
