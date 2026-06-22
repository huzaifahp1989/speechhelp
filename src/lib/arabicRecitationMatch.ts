/** Strip harakat, normalize Arabic letters for recitation comparison. */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u08F0-\u08FF]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\u0600-\u06FF]/g, '')
    .trim();
}

export function tokenizeArabicSpeech(text: string): string[] {
  const cleaned = text
    .replace(/[.,/#!$%^&*;:{}=\-_`~()؟،؛]/g, ' ')
    .trim();
  if (!cleaned) return [];
  return cleaned.split(/\s+/).map(normalizeArabic).filter((t) => t.length > 0);
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/** Fuzzy match for spoken vs expected Quranic word. */
export function wordsMatch(spoken: string, expected: string): boolean {
  const s = normalizeArabic(spoken);
  const e = normalizeArabic(expected);
  if (!s || !e) return false;
  if (s === e) return true;

  const minLen = Math.min(s.length, e.length);
  if (minLen >= 2 && (e.startsWith(s) || s.startsWith(e))) return true;

  const dist = levenshtein(s, e);
  const maxLen = Math.max(s.length, e.length);
  return maxLen > 0 && dist / maxLen <= 0.38;
}

export type RecitationAlignResult = {
  /** How many expected words matched from the start */
  matchedCount: number;
  /** Index of latest mistake in expected words, if any */
  mistakeIndex: number | null;
  /** Spoken token index where mismatch occurred */
  spokenIndex: number | null;
};

/**
 * Greedy align spoken tokens to expected words (left-to-right).
 * Returns progress and the most recent mistake position.
 */
export function alignRecitation(
  expectedWords: string[],
  spokenTokens: string[]
): RecitationAlignResult {
  let ei = 0;
  let si = 0;
  let mistakeIndex: number | null = null;
  let spokenIndex: number | null = null;

  while (ei < expectedWords.length && si < spokenTokens.length) {
    if (wordsMatch(spokenTokens[si], expectedWords[ei])) {
      ei++;
      si++;
      continue;
    }

    // Look-ahead: skipped expected word
    if (ei + 1 < expectedWords.length && wordsMatch(spokenTokens[si], expectedWords[ei + 1])) {
      mistakeIndex = ei;
      spokenIndex = si;
      ei += 2;
      si++;
      continue;
    }

    // Extra spoken word or wrong pronunciation
    mistakeIndex = ei;
    spokenIndex = si;
    si++;
  }

  return {
    matchedCount: ei,
    mistakeIndex,
    spokenIndex,
  };
}

export function expectedWordTexts(
  words: { char_type_name: string; text_uthmani: string }[]
): string[] {
  return words
    .filter((w) => w.char_type_name !== 'end')
    .map((w) => w.text_uthmani);
}
