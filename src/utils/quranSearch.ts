
import { cleanSpeechText, extractKeywords, levenshteinDistance } from './voiceSearchLogic';
import { normalizePhonetic } from './arabic';

export interface SearchResultApiItem {
    verse_key: string;
    text: string;
    translations?: { text: string }[];
    _score?: number;
    [key: string]: unknown;
}

// Helper to calculate match score based on keywords and order
export const calculateMatchScore = (targetText: string, queryKeywords: string[]) => {
    if (!targetText || queryKeywords.length === 0) return 0;

    // Normalize target text for better matching
    const normalizedTarget = normalizePhonetic(targetText).toLowerCase();
    const targetWords = normalizedTarget.split(' ');
    
    let matchedKeywords = 0;
    let orderScore = 0;
    let lastIndex = -1;

    queryKeywords.forEach(keyword => {
        // Find best match for this keyword in target
        let bestWordMatch = false;
        let bestWordIndex = -1;
        
        targetWords.some((word, index) => {
            // Exact or substring match
            if (word.includes(keyword)) {
                bestWordMatch = true;
                bestWordIndex = index;
                return true;
            }
            
            // Levenshtein match for longer words
            if (keyword.length > 3 && word.length > 3) {
                const dist = levenshteinDistance(keyword, word);
                if (dist <= 2) { // Allow 2 typos
                    bestWordMatch = true;
                    bestWordIndex = index;
                    return true;
                }
            }
            return false;
        });

        if (bestWordMatch) {
            matchedKeywords++;
            // Check order
            if (bestWordIndex > lastIndex) {
                orderScore++;
                lastIndex = bestWordIndex;
            }
        }
    });

    const keywordCoverage = matchedKeywords / queryKeywords.length;
    // Order score is ratio of keywords in correct relative order
    const orderSimilarity = queryKeywords.length > 1 ? orderScore / queryKeywords.length : 1;

    // Weight: 70% keyword coverage, 30% order
    return (keywordCoverage * 0.7) + (orderSimilarity * 0.3);
};

// Helper for robust API fetching
export const fetchQuranSearchResults = async (searchText: string, size: number = 10) => {
    const isArabic = /[\u0600-\u06FF]/.test(searchText);
    const lang = isArabic ? 'ar' : 'en';
    
    // Use shared cleaning logic
    let sanitizedText = cleanSpeechText(searchText, isArabic);
    
    // Extract keywords for scoring
    const queryKeywords = extractKeywords(sanitizedText);
    
    if (queryKeywords.length === 0) return { search: { results: [] } };

    // Reconstruct query from keywords for API search
    sanitizedText = queryKeywords.join(' ');

    // Smart Truncation: Cut at word boundary before 150 chars
    if (sanitizedText.length > 150) {
        const lastSpace = sanitizedText.lastIndexOf(' ', 150);
        sanitizedText = lastSpace > 0 ? sanitizedText.substring(0, lastSpace) : sanitizedText.substring(0, 150);
    }
    
    const callApi = async (query: string, limit: number) => {
        const url = `https://api.quran.com/api/v4/search?q=${encodeURIComponent(query)}&size=${limit}&page=1&language=${lang}`;
        try {
            const res = await fetch(url);
            if (res.status === 204) return [];
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            const rawText = await res.text();
            if (!rawText.trim()) return [];
            const data = JSON.parse(rawText);
            return data.search?.results || [];
        } catch (e) {
            console.error('Search API call failed', e);
            return [];
        }
    };

    // Phase 1: Full Query Search
    let results = await callApi(sanitizedText, Math.max(size, 20));

    // Calculate confidence for Phase 1 results using improved scoring
    results = results.map((r: SearchResultApiItem) => {
        const resultText = (r.text || '').replace(/<\/?em>/g, '');
        return { ...r, _score: calculateMatchScore(resultText, queryKeywords) };
    }).sort((a: SearchResultApiItem, b: SearchResultApiItem) => (b._score || 0) - (a._score || 0));

    const topScore = results.length > 0 ? results[0]._score : 0;
    
    // Phase 2: Fallback (Prefix Search) if no results or low confidence
    if ((results.length === 0 || (topScore !== undefined && topScore < 0.6)) && queryKeywords.length >= 3) {
        // Search for just the first 2 keywords
        const prefixQuery = queryKeywords.slice(0, 2).join(' ');
        
        const fallbackResults = await callApi(prefixQuery, 50);
        
        if (fallbackResults.length > 0) {
            const scoredFallback = fallbackResults.map((r: SearchResultApiItem) => {
                const resultText = (r.text || '').replace(/<\/?em>/g, '');
                return { ...r, _score: calculateMatchScore(resultText, queryKeywords) };
            })
            .filter((r: SearchResultApiItem) => (r._score || 0) > 0.3)
            .sort((a: SearchResultApiItem, b: SearchResultApiItem) => (b._score || 0) - (a._score || 0));
            
            const mergedMap = new Map();
            [...results, ...scoredFallback].forEach((r: SearchResultApiItem) => {
                if (!mergedMap.has(r.verse_key) || (mergedMap.get(r.verse_key)._score || 0) < (r._score || 0)) {
                    mergedMap.set(r.verse_key, r);
                }
            });
            
            results = Array.from(mergedMap.values()).sort((a: SearchResultApiItem, b: SearchResultApiItem) => (b._score || 0) - (a._score || 0));
            results = results.slice(0, 10);
        }
    }

    return { search: { results } };
};
