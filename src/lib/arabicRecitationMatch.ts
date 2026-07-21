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

export function normalizeLatin(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z']/g, '')
    .trim();
}

export function tokenizeArabicSpeech(text: string): string[] {
  const cleaned = text
    .replace(/[.,/#!$%^&*;:{}=\-_`~()؟،؛]/g, ' ')
    .trim();
  if (!cleaned) return [];
  return cleaned.split(/\s+/).map(normalizeArabic).filter((t) => t.length > 0);
}

/** Tokenize speech — Arabic script or Latin transliteration (Chrome ar-SA often returns Latin). */
export function tokenizeSpeech(text: string): string[] {
  const arabic = tokenizeArabicSpeech(text);
  if (arabic.length > 0) return arabic;
  return text
    .toLowerCase()
    .replace(/[^a-zA-Z'\u0600-\u06FF\s]/g, ' ')
    .split(/\s+/)
    .map((t) => {
      const ar = normalizeArabic(t);
      if (ar.length > 0) return ar;
      return normalizeLatin(t);
    })
    .filter((t) => t.length > 1);
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

function fuzzyMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const minLen = Math.min(a.length, b.length);
  if (minLen >= 2 && (b.startsWith(a) || a.startsWith(b))) return true;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen > 0 && dist / maxLen <= 0.42;
}

export type WordMatchTarget = {
  arabic: string;
  imlaei?: string;
  latin?: string;
};

export function wordMatchTargets(word: {
  text_uthmani: string;
  transliteration?: string;
  text_imlaei?: string;
}): WordMatchTarget {
  const latinRaw = word.transliteration?.replace(/[()]/g, ' ').split(/[\s-]+/)[0];
  return {
    arabic: normalizeArabic(word.text_uthmani),
    imlaei: word.text_imlaei ? normalizeArabic(word.text_imlaei) : undefined,
    latin: latinRaw ? normalizeLatin(latinRaw) : undefined,
  };
}

/** Match spoken token against Arabic text and/or Latin transliteration. */
export function spokenMatchesWord(spoken: string, target: WordMatchTarget): boolean {
  const sAr = normalizeArabic(spoken);
  const sLat = normalizeLatin(spoken);

  if (sAr) {
    if (fuzzyMatch(sAr, target.arabic)) return true;
    if (target.imlaei && fuzzyMatch(sAr, target.imlaei)) return true;
  }
  if (sLat && target.latin && fuzzyMatch(sLat, target.latin)) return true;

  // Spoken Latin vs first syllable of transliteration variants
  if (sLat && target.latin && target.latin.length >= 3 && sLat.length >= 3) {
    if (target.latin.startsWith(sLat) || sLat.startsWith(target.latin)) return true;
  }

  return false;
}

export type RecitationAlignResult = {
  matchedCount: number;
  mistakeIndex: number | null;
  spokenIndex: number | null;
};

export function alignRecitation(
  expected: WordMatchTarget[],
  spokenTokens: string[]
): RecitationAlignResult {
  let ei = 0;
  let si = 0;
  let mistakeIndex: number | null = null;
  let spokenIndex: number | null = null;

  while (ei < expected.length && si < spokenTokens.length) {
    if (spokenMatchesWord(spokenTokens[si], expected[ei])) {
      ei++;
      si++;
      continue;
    }

    if (ei + 1 < expected.length && spokenMatchesWord(spokenTokens[si], expected[ei + 1])) {
      mistakeIndex = ei;
      spokenIndex = si;
      ei += 2;
      si++;
      continue;
    }

    mistakeIndex = ei;
    spokenIndex = si;
    si++;
  }

  return { matchedCount: ei, mistakeIndex, spokenIndex };
}

export function expectedWordTargets(
  words: { char_type_name: string; text_uthmani: string; transliteration?: string; text_imlaei?: string }[]
): WordMatchTarget[] {
  return words
    .filter((w) => w.char_type_name !== 'end')
    .map(wordMatchTargets);
}

/** @deprecated use tokenizeSpeech */
export function wordsMatch(spoken: string, expected: string): boolean {
  return fuzzyMatch(normalizeArabic(spoken) || normalizeLatin(spoken), normalizeArabic(expected));
}

export function expectedWordTexts(
  words: { char_type_name: string; text_uthmani: string }[]
): string[] {
  return words
    .filter((w) => w.char_type_name !== 'end')
    .map((w) => w.text_uthmani);
}
