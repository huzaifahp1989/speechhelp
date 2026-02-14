
// Normalizes Arabic text by removing tashkeel, tatweel, punctuation and unifying characters
export function normalizeArabic(text: string): string {
    if (!text) return "";
    return text
        // Remove Tashkeel (Diacritics) including Quranic marks
        .replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '')
        // Remove Tatweel (Kashida)
        .replace(/\u0640/g, '')
        // Remove common punctuation (Arabic and Latin)
        .replace(/[.,;:!?"'’”“\-–—\u060C\u061B\u061F،؟]/g, ' ')
        // Normalize Aleph
        .replace(/[أإآ]/g, 'ا')
        // Normalize Ya / Aleph Maqsura (often interchangeable in search)
        .replace(/[ىيئ]/g, 'ي')
        // Normalize Waw variations
        .replace(/[ؤ]/g, 'و')
        // Normalize Ta Marbuta to Ha (often silent) or Ta
        .replace(/ة/g, 'ه')
        // Collapse multiple spaces
        .replace(/\s+/g, ' ')
        .trim();
}

// Phonetic normalization for fuzzy search (handles common pronunciation variations)
// Useful for non-native speakers or dialect differences
export function normalizePhonetic(text: string): string {
    return normalizeArabic(text)
        .replace(/[ذظض]/g, 'ز') // Dhal, Dha, Dad -> Zain (common substitution)
        .replace(/[ثص]/g, 'س')  // Tha, Sad -> Seen
        .replace(/[ط]/g, 'ت')   // Ta (emphatic) -> Ta
        .replace(/[ق]/g, 'ك')   // Qaf -> Kaf
        .replace(/[غ]/g, 'خ')   // Ghain -> Kha (sometimes)
        .replace(/[هح]/g, 'ه')  // Ha (emphatic) -> Ha
        .replace(/[ع]/g, 'ا');  // Ain -> Alif (sometimes dropped or sounded as vowel)
}
