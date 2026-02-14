'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, ArrowRight, ChevronDown, Bug } from 'lucide-react';
import { normalizePhonetic } from '@/utils/arabic';
import { findBestMatch, AyahItem } from '@/utils/voiceSearchLogic';
import { fetchQuranSearchResults, SearchResultApiItem } from '@/utils/quranSearch';
import { searchHadithChapters, HadithSectionResult } from '@/utils/hadithSearch';
import { RECITERS } from '@/data/reciters';

type Props = {
    ayahs?: AyahItem[];
    currentReciterId?: number;
    onAyahFound?: (verseKey: string, shouldPlay?: boolean) => void;
    onReciterChange?: (id: number) => void;
    className?: string;
};

const DEFAULT_AYAHS: AyahItem[] = [];

export default function UnifiedSearch({ ayahs = DEFAULT_AYAHS, currentReciterId, onAyahFound, onReciterChange, className = '' }: Props) {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<SearchResultApiItem[]>([]);
    const [hadithCandidates, setHadithCandidates] = useState<HadithSectionResult[]>([]);
    const [navAction, setNavAction] = useState<{label: string, action: () => void} | null>(null);
    
    // Debug State
    const [showDebug, setShowDebug] = useState(false);
    const [debugInfo, setDebugInfo] = useState<{
        original: string;
        cleaned: string;
        keywords: string[];
        matchType?: string;
        matchTarget?: string;
        score?: number;
    } | null>(null);

    const router = useRouter();
    
    // Reciter Selection State
    const [showReciters, setShowReciters] = useState(false);
    const [selectedReciterId, setSelectedReciterId] = useState(currentReciterId || 7); // Default to Mishary (ID 7)
    const selectedReciter = RECITERS.find(r => r.id === selectedReciterId);

    // Sync with prop if provided
    useEffect(() => {
        if (currentReciterId) {
            setSelectedReciterId(currentReciterId);
        }
    }, [currentReciterId]);

    const handleReciterSelect = (id: number) => {
        setSelectedReciterId(id);
        setShowReciters(false);
        if (onReciterChange) {
            onReciterChange(id);
        }
    };

    // Handle Input Change -> Check for Navigation Commands Locally
    useEffect(() => {
        if (!query) {
            if (navAction !== null) setNavAction(null);
            if (candidates.length > 0) setCandidates([]);
            if (hadithCandidates.length > 0) setHadithCandidates([]);
            return;
        }

        const match = findBestMatch(query, ayahs);
        if (match) {
            // ... existing match logic ...
            if (match.type === 'surah') {
                const label = `Go to Surah ${match.result.name_simple}`;
                if (navAction?.label !== label) {
                    setNavAction({
                        label,
                        action: () => {
                            router.push(`/quran/${match.result.id}?autoplay=true&reciter=${selectedReciterId}&t=${Date.now()}`);
                            setQuery('');
                            setNavAction(null);
                        }
                    });
                }
            } else if (match.type === 'juz') {
                const label = `Go to Juz ${match.target}`;
                if (navAction?.label !== label) {
                    setNavAction({
                        label,
                        action: () => {
                            router.push(`/quran/juz/${match.target}?reciter=${selectedReciterId}`);
                            setQuery('');
                            setNavAction(null);
                        }
                    });
                }
            } else if (match.type === 'juz_ayah') {
                const [juzId, ayahIndex] = (match.target as string).split(':');
                const label = `Go to Juz ${juzId} Ayah ${ayahIndex}`;
                if (navAction?.label !== label) {
                    setNavAction({
                        label,
                        action: () => {
                            router.push(`/quran/juz/${juzId}?ayahIndex=${ayahIndex}&reciter=${selectedReciterId}&autoplay=true&t=${Date.now()}`);
                            setQuery('');
                            setNavAction(null);
                        }
                    });
                }
            } else if (match.type === 'ayah' && match.target) {
                const target = match.target as string;
                const label = `Go to Verse ${target}`;
                if (navAction?.label !== label) {
                    setNavAction({
                        label,
                        action: () => {
                            if (onAyahFound) onAyahFound(target);
                            else {
                                const surahId = target.split(':')[0];
                                router.push(`/quran/${surahId}?autoplay=true&startingVerse=${target}&reciter=${selectedReciterId}&t=${Date.now()}#verse-${target}`);
                            }
                            setQuery('');
                            setNavAction(null);
                        }
                    });
                }
            } else {
                if (navAction !== null) setNavAction(null);
            }
        } else {
            if (navAction !== null) setNavAction(null);
        }

        // Also Trigger Global API Search (Debounced)
        const timeoutId = setTimeout(async () => {
             // 1. Quran Search API
             if (query.length >= 2) {
                 try {
                     const data = await fetchQuranSearchResults(query);
                     if (data.search && data.search.results) {
                         setCandidates(data.search.results);
                     }

                     // 2. Hadith Search
                     const hResults = await searchHadithChapters(query);
                     setHadithCandidates(hResults.slice(0, 3)); 
                 } catch (e) {
                     console.error('Live Search API error', e);
                 }
             }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [query, ayahs, onAyahFound, router, navAction, candidates.length, hadithCandidates.length, selectedReciterId]);

    const handleSearch = async (text: string) => {
        setQuery(text);
        setError(null);
        setIsSearching(true);
        setCandidates([]);

        // 1. Check local nav first
        const match = findBestMatch(text, ayahs);
        if (match && (match.type === 'surah' || match.type === 'ayah' || match.type === 'juz' || match.type === 'juz_ayah')) {
            setIsSearching(false);
            return; 
        }

        // 2. Global Search via API
        try {
            const data = await fetchQuranSearchResults(text);
            if (data.search && data.search.results) {
                setCandidates(data.search.results);
            } else {
                setError('No matches found.');
            }
        } catch (e: unknown) {
            console.error('Search execution error:', e);
            const errorMessage = e instanceof Error ? e.message : 'Check connection';
            setError(`Search failed: ${errorMessage}`);
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (navAction) {
                navAction.action();
            } else {
                handleSearch(query);
            }
        }
    };

    return (
        <div className={`relative w-full max-w-xl mx-auto ${className}`}>
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search Quran (e.g. 'Yasin', 'Musa', '2:255')"
                    className="w-full px-5 py-3 pr-24 rounded-full border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all shadow-sm text-lg"
                    dir="auto"
                />
                
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {/* Reciter Selector */}
                    <div className="relative">
                         <button 
                            onClick={() => setShowReciters(!showReciters)}
                            className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-full text-slate-600 transition-colors"
                            title="Select Reciter for Playback"
                         >
                            <span className="max-w-[60px] truncate">{selectedReciter?.name.split(' ')[0]}</span>
                            <ChevronDown className="w-3 h-3" />
                         </button>
                         
                         {showReciters && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50 max-h-60 overflow-y-auto">
                                {RECITERS.map(reciter => (
                                    <button
                                        key={reciter.id}
                                        onClick={() => handleReciterSelect(reciter.id)}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${selectedReciterId === reciter.id ? 'text-emerald-600 font-medium bg-emerald-50' : 'text-slate-600'}`}
                                    >
                                        {reciter.name}
                                    </button>
                                ))}
                            </div>
                         )}
                    </div>

                    <button 
                        onClick={() => handleSearch(query)}
                        className="p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors shadow-sm disabled:opacity-50"
                        disabled={isSearching || !query.trim()}
                    >
                        {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mt-2 text-center text-red-500 text-sm bg-red-50 py-1 px-3 rounded-full inline-block">
                    {error}
                </div>
            )}

            {/* Navigation Action Suggestion */}
            {navAction && (
                <div 
                    onClick={navAction.action}
                    className="absolute top-full left-0 right-0 mt-2 bg-emerald-50 border border-emerald-100 rounded-xl p-3 shadow-lg cursor-pointer hover:bg-emerald-100 transition-colors z-20 flex items-center justify-between group"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-200 p-2 rounded-full text-emerald-700">
                            <ArrowRight className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-emerald-900">{navAction.label}</span>
                    </div>
                    <span className="text-xs text-emerald-600 font-medium group-hover:underline">Press Enter</span>
                </div>
            )}

            {/* Search Candidates Dropdown */}
            {(candidates.length > 0 || hadithCandidates.length > 0) && !navAction && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-[60vh] overflow-y-auto z-10 divide-y divide-slate-100">
                    
                    {/* Quran Results */}
                    {candidates.length > 0 && (
                        <div>
                            <div className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0">
                                Quran Matches
                            </div>
                            {candidates.map((result) => (
                                <div 
                                    key={result.verse_key}
                                    onClick={() => {
                                        const [surahId] = result.verse_key.split(':');
                                        router.push(`/quran/${surahId}?autoplay=true&startingVerse=${result.verse_key}&reciter=${selectedReciterId}#verse-${result.verse_key}`);
                                    }}
                                    className="p-3 hover:bg-slate-50 cursor-pointer transition-colors group"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-slate-700 text-sm bg-slate-100 px-2 py-0.5 rounded-md group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                                            {result.verse_key}
                                        </span>
                                        {result._score && showDebug && (
                                            <span className="text-[10px] text-slate-400">{(result._score * 100).toFixed(0)}%</span>
                                        )}
                                    </div>
                                    <div className="text-right font-amiri text-lg text-slate-800 dir-rtl mb-1" dir="rtl">
                                        {result.text.replace(/<\/?em>/g, '')}
                                    </div>
                                    {result.translations && result.translations[0] && (
                                        <div className="text-xs text-slate-500 line-clamp-1">
                                            {result.translations[0].text.replace(/<\/?em>/g, '')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Hadith Results */}
                    {hadithCandidates.length > 0 && (
                        <div>
                            <div className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 border-t border-slate-100">
                                Hadith Chapters
                            </div>
                            {hadithCandidates.map((h, idx) => (
                                <div 
                                    key={`${h.book}-${h.chapterId}-${idx}`}
                                    onClick={() => router.push(`/hadith/${h.book}?chapter=${h.chapterId}`)}
                                    className="p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-slate-600 capitalize bg-slate-100 px-1.5 py-0.5 rounded">
                                            {h.book}
                                        </span>
                                        <span className="text-sm font-medium text-slate-800 line-clamp-1">
                                            {h.englishTitle}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500 line-clamp-1 pl-1 border-l-2 border-slate-200">
                                        {h.arabicTitle}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Debug Toggle (Hidden usually) */}
            <div className="absolute -bottom-6 right-0 opacity-0 hover:opacity-100 transition-opacity">
                 <button onClick={() => setShowDebug(!showDebug)} className="text-[10px] text-slate-300 flex items-center gap-1">
                    <Bug className="w-3 h-3" /> Debug
                 </button>
            </div>
            {showDebug && debugInfo && (
                <div className="mt-4 p-2 bg-slate-900 text-slate-200 text-xs rounded font-mono whitespace-pre-wrap">
                    {JSON.stringify(debugInfo, null, 2)}
                </div>
            )}
        </div>
    );
}
