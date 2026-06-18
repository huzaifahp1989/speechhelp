/** Parse surah:ayah from location hash (#verse-2:255 or #2:255). */
export function parseVerseKeyFromHash(hash: string): string | null {
  const raw = hash.replace(/^#/, '').trim();
  if (/^\d+:\d+$/.test(raw)) return raw;
  if (raw.startsWith('verse-')) {
    const key = raw.slice('verse-'.length);
    if (/^\d+:\d+$/.test(key)) return key;
  }
  return null;
}

export function scrollToAyahElement(verseKey: string, highlight = true): boolean {
  const element = document.getElementById(`verse-${verseKey}`);
  if (!element) return false;
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (highlight) {
    element.classList.add('ring-2', 'ring-emerald-500');
    setTimeout(() => element.classList.remove('ring-2', 'ring-emerald-500'), 2000);
  }
  return true;
}

/** Scroll to ayah (retry until DOM ready), optionally play and update hash. */
export function navigateToAyah(
  verseKey: string,
  options: {
    shouldPlay?: boolean;
    updateHash?: boolean;
    play?: (key: string) => void;
    maxAttempts?: number;
  } = {}
): void {
  const { shouldPlay = true, updateHash = true, play, maxAttempts = 25 } = options;
  if (!verseKey || !/^\d+:\d+$/.test(verseKey)) return;

  if (updateHash && typeof window !== 'undefined') {
    try {
      const url = new URL(window.location.href);
      url.hash = `verse-${verseKey}`;
      window.history.replaceState(null, '', url.toString());
    } catch { /* ignore */ }
  }

  // Play synchronously while still inside the user click gesture (setTimeout breaks autoplay policy).
  if (shouldPlay && play) {
    play(verseKey);
  }

  let attempts = 0;
  const tryNavigate = () => {
    scrollToAyahElement(verseKey, true);
    if (attempts < maxAttempts && !document.getElementById(`verse-${verseKey}`)) {
      attempts += 1;
      setTimeout(tryNavigate, 100);
    }
  };

  setTimeout(tryNavigate, 50);
}
