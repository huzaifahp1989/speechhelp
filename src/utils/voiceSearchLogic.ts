
import Fuse from 'fuse.js';
import { surahs } from '../data/surahs';

// Types
export type SurahItem = {
    id: number;
    name_arabic: string;
    name_simple: string;
    aliases?: string[];
};

type DebugInfo = {
    keywords: string[];
    matchedKeywords: number;
};

type BaseSearchResult = {
    score?: number;
    action?: 'scroll' | 'navigate';
    target?: string; // verse_key or surah_id or juz_id:ayah_index
    debugInfo?: DebugInfo;
};

export type SearchResult =
    | (BaseSearchResult & {
          type: 'surah';
          result: SurahItem;
          action: 'navigate';
          target: string;
      })
    | (BaseSearchResult & {
          type: 'ayah';
          result: SurahItem | AyahItem | { id: number };
          action: 'scroll' | 'navigate';
          target: string;
      })
    | (BaseSearchResult & {
          type: 'global';
          result: { id: number };
      })
    | (BaseSearchResult & {
          type: 'juz';
          target: string;
      })
    | (BaseSearchResult & {
          type: 'juz_ayah';
          target: string;
      });

export interface AyahItem {
    verse_key: string;
    text_imlaei_simple?: string;
    text_uthmani?: string;
    [key: string]: unknown;
}

// Step 1: Clean detected speech text
export function cleanSpeechText(text: string, isArabic: boolean): string {
    if (!text) return '';

    let processed = text.toLowerCase();

    // Remove punctuation
    processed = processed.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');

    // Remove filler words
    if (isArabic) {
        processed = processed.replace(/\b(اقرأ|شغل|افتح|اذهب الى|اريد|هات|عايز|تلاوة|استماع|بحث عن|سورة|سوره|آية|ايه|في|من|عن)\b/g, '');
    } else {
        processed = processed.replace(/\b(please|read|surah|ayah|verse|chapter|play|recite|open|show|find|search|for|listen|to|go|start)\b/g, '');
    }

    // Remove extra spaces
    processed = processed.replace(/\s+/g, ' ').trim();

    return processed;
}

// Step 2: Break speech into keywords
export function extractKeywords(text: string): string[] {
    // Split by space
    const words = text.split(' ');
    // Filter out small connector words if needed (optional, keeping it simple for now as per prompt)
    // The prompt says "Ignore very small connector words if needed (like wa, min, fi)"
    const stopWords = ['wa', 'min', 'fi', 'in', 'of', 'the', 'and', 'or', 'a', 'an'];
    return words.filter(w => w.length > 1 && !stopWords.includes(w));
}

// Helper to convert Eastern Arabic numerals to Western
const convertArabicNumerals = (str: string) => {
    return str.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
};

// Fuse.js Options for Surah Search
const surahFuseOptions = {
    includeScore: true,
    keys: ['name_simple', 'name_arabic', 'aliases', 'id'],
    threshold: 0.3, // Step 4: Fuzzy search tolerance around 70-80% (0.3 threshold is approx 70% match requirement)
    distance: 100,
};

const surahFuse = new Fuse(surahs, surahFuseOptions);

// Fuse.js Options for Local Ayah Search (if available)
const createAyahFuse = (ayahs: AyahItem[]) => new Fuse(ayahs, {
    includeScore: true,
    keys: ['text_imlaei_simple', 'text_uthmani'],
    threshold: 0.3,
    ignoreLocation: true, // Search anywhere in the string
});

export function findBestMatch(
    text: string,
    ayahs: AyahItem[] = [] // Optional for global context
): SearchResult | null {
    if (!text) return null;

    // Convert Arabic Numerals first
    const inputWithWesternNumerals = convertArabicNumerals(text);
    const isArabicInput = /[\u0600-\u06FF]/.test(inputWithWesternNumerals);

    // Step 1: Clean Text
    const cleanedText = cleanSpeechText(inputWithWesternNumerals, isArabicInput);
    
    // Step 2: Extract Keywords
    const keywords = extractKeywords(cleanedText);
    
    // If no meaningful keywords, return null
    if (keywords.length === 0 && !/\d/.test(cleanedText)) return null;

    // 0. Check for explicit navigation commands (Numbers)
    // "2 255" or "Baqarah 255"
    // Regex for "Number Number" or "Word Number"
    const simpleNavMatch = inputWithWesternNumerals.match(/(\d+)[\s:]+(\d+)/);
    if (simpleNavMatch) {
        const p1 = parseInt(simpleNavMatch[1]);
        const p2 = parseInt(simpleNavMatch[2]);
        // Check if p1 is surah (1-114)
        if (p1 >= 1 && p1 <= 114) {
            return {
                type: 'ayah',
                result: { id: p1 }, // Minimal result
                score: 100,
                action: 'navigate',
                target: `${p1}:${p2}`
            };
        }
    }

    // 1. Surah Search using Fuse.js
    const surahResults = surahFuse.search(cleanedText);
    if (surahResults.length > 0) {
        const topSurah = surahResults[0];
        // Fuse score: 0 is perfect, 1 is mismatch.
        // We want > 70% match (score < 0.3)
        if (topSurah.score !== undefined && topSurah.score < 0.3) {
             // Check if user said "Surah Name Ayah X"
             // Extract number from original text
             const verseMatch = inputWithWesternNumerals.match(/(\d+)$/);
             if (verseMatch) {
                 const verseNum = parseInt(verseMatch[1]);
                 return {
                    type: 'ayah',
                    result: topSurah.item,
                    score: (1 - topSurah.score) * 100,
                    action: 'navigate',
                    target: `${topSurah.item.id}:${verseNum}`
                 };
             }

             return {
                type: 'surah',
                result: topSurah.item,
                score: (1 - topSurah.score) * 100,
                action: 'navigate',
                target: String(topSurah.item.id)
            };
        }
    }

    // 2. Local Ayah Search (if ayahs provided)
    if (ayahs.length > 0) {
        const ayahFuse = createAyahFuse(ayahs);
        // Step 3: Keyword based search locally
        // We search for the full cleaned text first
        const localResults = ayahFuse.search(cleanedText);
        
        if (localResults.length > 0) {
            const topAyah = localResults[0];
            if (topAyah.score !== undefined && topAyah.score < 0.4) {
                return {
                    type: 'ayah',
                    result: topAyah.item,
                    score: (1 - topAyah.score) * 100,
                    action: 'scroll',
                    target: topAyah.item.verse_key
                };
            }
        }
    }

    // 3. Juz Search
    // Simple regex for "Juz X" or "Part X" or "Juz' X"
    const juzMatch = cleanedText.match(/(?:juz|para|part|جزء)\s*(\d+)/);
    if (juzMatch) {
        return {
            type: 'juz',
            score: 100,
            target: juzMatch[1]
        };
    }

    return null;
}

// Export levenshtein for other uses if needed, or remove if fully replaced by Fuse
export function levenshteinDistance(a: string, b: string): number {
    // ... (Keep existing implementation if needed by UnifiedSearch or just remove)
    // The user didn't ask to remove it, but UnifiedSearch uses it.
    // I'll keep it for now as UnifiedSearch might still use it for API result ranking if I don't replace that logic too.
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                );
            }
        }
    }
    return matrix[b.length][a.length];
}
