
const INFO_URL = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/info.json';

export type HadithSectionResult = {
    id?: string | number;
    book?: string;
    collection?: string;
    bookSlug?: string;
    chapterId?: string | number;
    title?: string;
    bookId?: string;
    bookName?: string;
    sectionId?: string;
    sectionName?: string;
    [key: string]: any;
};

interface HadithInfo {
    [key: string]: {
        metadata?: {
            name?: string;
            sections?: Record<string, string>;
        };
    };
}

let cachedInfo: HadithInfo | null = null;

export const HADITH_BOOKS = [
    { id: 'bukhari', name: 'Sahih al-Bukhari' },
    { id: 'muslim', name: 'Sahih Muslim' },
    { id: 'abudawud', name: 'Sunan Abu Dawud' },
    { id: 'tirmidhi', name: 'Jami` at-Tirmidhi' },
    { id: 'nasai', name: 'Sunan an-Nasa\'i' },
    { id: 'ibnmajah', name: 'Sunan Ibn Majah' },
    { id: 'malik', name: 'Muwatta Malik' },
    { id: 'ahmad', name: 'Musnad Ahmad' },
    { id: 'darimi', name: 'Sunan al-Darimi' }
];

export async function searchHadithChapters(query: string): Promise<HadithSectionResult[]> {
    if (!cachedInfo) {
        try {
            const res = await fetch(INFO_URL);
            cachedInfo = await res.json();
        } catch (e) {
            console.error('Failed to fetch hadith info', e);
            return [];
        }
    }

    if (!cachedInfo) return [];

    const results: HadithSectionResult[] = [];
    const normalizedQuery = query.toLowerCase().trim();
    
    // Iterate over known books
    for (const book of HADITH_BOOKS) {
        const bookInfo = cachedInfo[book.id];
        if (!bookInfo || !bookInfo.metadata || !bookInfo.metadata.sections) continue;

        const sections = bookInfo.metadata.sections;
        Object.entries(sections).forEach(([id, name]) => {
            const sectionName = name;
            if (sectionName.toLowerCase().includes(normalizedQuery)) {
                results.push({
                    id,
                    book: book.id,
                    collection: book.id,
                    bookSlug: book.id,
                    chapterId: id,
                    title: sectionName,
                    bookId: book.id,
                    bookName: bookInfo.metadata?.name || book.name,
                    sectionId: id,
                    sectionName: sectionName
                });
            }
        });
    }

    return results;
}
