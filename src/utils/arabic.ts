
// Normalizes Arabic text by removing tashkeel and unifying characters
export function normalizeArabic(text: string): string {
    if (!text) return "";
    return text
        // Remove Tashkeel (Diacritics)
        .replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '')
        // Normalize Aleph
        .replace(/[أإآ]/g, 'ا')
        // Normalize Ya / Aleph Maqsura (often interchangeable in search)
        .replace(/ى/g, 'ي')
        // Normalize Ta Marbuta to Ha (often silent) or Ta
        .replace(/ة/g, 'ه')
        .trim();
}
