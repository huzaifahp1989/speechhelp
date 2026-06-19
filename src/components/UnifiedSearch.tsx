"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, ArrowRight, ChevronDown, Bug } from 'lucide-react';
import { normalizePhonetic } from '@/utils/arabic';
import { findBestMatch, AyahItem } from '@/utils/voiceSearchLogic';
import { fetchQuranSearchResults, SearchResultApiItem } from '@/utils/quranSearch';
import { searchHadithChapters, HadithSectionResult } from '@/utils/hadithSearch';
import { RECITERS } from '@/data/reciters';
import clsx from 'clsx';

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
    const [internalReciterId, setInternalReciterId] = useState(7); // Default to Mishary (ID 7)
    const selectedReciterId = currentReciterId ?? internalReciterId;
    const selectedReciter = useMemo(() => RECITERS.find(r => r.id === selectedReciterId), [selectedReciterId]);

    const handleReciterSelect = (id: number) => {
        setShowReciters(false);
        if (onReciterChange) {
            onReciterChange(id);
            return;
        }
        setInternalReciterId(id);
    };

    const navAction = useMemo(() => {
        const q = query.trim();
        if (!q) return null;

        const match = findBestMatch(q, ayahs);
        if (!match) return null;

        if (match.type === 'surah' && candidates.length === 0) {
            const label = `Go to Surah ${match.result.name_simple}`;
            return {
                label,
                action: () => {
                    router.push(`/quran/${match.result.id}?autoplay=true&reciter=${selectedReciterId}&t=${Date.now()}`);
                    setQuery('');
                    setCandidates([]);
                    setHadithCandidates([]);
                },
            };
        }

        if (match.type === 'juz' && candidates.length === 0) {
            const label = `Go to Juz ${match.target}`;
            return {
                label,
                action: () => {
                    router.push(`/quran/juz/${match.target}?reciter=${selectedReciterId}`);
                    setQuery('');
                    setCandidates([]);
                    setHadithCandidates([]);
                },
            };
        }

        if (match.type === 'juz_ayah' && candidates.length === 0) {
            const target = match.target as string;
            const label = /^\d+:\d+$/.test(target) ? `Go to Verse ${target}` : `Go to Juz ${target.split(':')[0]}`;
            return {
                label,
                action: () => {
                    if (/^\d+:\d+$/.test(target)) {
                      const [surahId] = target.split(':');
                      router.push(`/quran/${surahId}?autoplay=true&startingVerse=${target}&reciter=${selectedReciterId}&t=${Date.now()}#verse-${target}`);
                    } else {
                      const [juzId, idx] = target.split(':');
                      router.push(`/quran/juz/${juzId}?ayahIndex=${idx}&reciter=${selectedReciterId}&autoplay=true&t=${Date.now()}`);
                    }
                    setQuery('');
                    setCandidates([]);
                    setHadithCandidates([]);
                },
            };
        }

        if (match.type === 'ayah' && match.target) {
            const target = match.target as string;
            const label = `Go to Verse ${target}`;
            return {
                label,
                action: () => {
                    if (onAyahFound) onAyahFound(target, true);
                    else {
                        const surahId = target.split(':')[0];
                        router.push(`/quran/${surahId}?autoplay=true&startingVerse=${target}&reciter=${selectedReciterId}&t=${Date.now()}#verse-${target}`);
                    }
                    setQuery('');
                    setCandidates([]);
                    setHadithCandidates([]);
                },
            };
        }

        return null;
    }, [ayahs, candidates.length, onAyahFound, query, router, selectedReciterId]);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) return;

        const timeoutId = setTimeout(async () => {
            try {
                const data = await fetchQuranSearchResults(q, 50);
                if (data.search && data.search.results) {
                    setCandidates(data.search.results);
                }

                const hResults = await searchHadithChapters(q);
                setHadithCandidates(hResults.slice(0, 3));
            } catch (e) {
                console.error('Live Search API error', e);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [query]);

    

    const handleSearch = async (text: string) => {
        setQuery(text);
        setError(null);
        // For global queries like "fire", take user to the full results page
        const q = encodeURIComponent(text.trim());
        if (q) {
            router.push(`/search?q=${q}`);
            return;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            // If we have ayah candidates, go to full results page to let user pick
            const q = encodeURIComponent(query.trim());
            if (candidates.length > 0 && q) {
                router.push(`/search?q=${q}`);
                return;
            }
            // Otherwise, use the suggested navigation action if present
            if (navAction) navAction.action();
            else if (q) router.push(`/search?q=${q}`);
        }
    };

    const hasDropdown = candidates.length > 0 || hadithCandidates.length > 0;

    const clearResults = () => {
        setCandidates([]);
        setHadithCandidates([]);
    };

    const pickQuranResult = (result: SearchResultApiItem) => {
        if (onAyahFound) {
            onAyahFound(result.verse_key, true);
            setQuery('');
        } else {
            const [surahId] = result.verse_key.split(':');
            router.push(`/quran/${surahId}?autoplay=true&startingVerse=${result.verse_key}&reciter=${selectedReciterId}#verse-${result.verse_key}`);
        }
        clearResults();
    };

    const resultsPanel = hasDropdown ? (
        <div className="divide-y divide-slate-100">
            {candidates.length > 0 && (
                <div>
                    <div className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0">
                        Quran Matches
                    </div>
                    {candidates.map((result) => (
                        <div
                            key={result.verse_key}
                            onClick={() => pickQuranResult(result)}
                            className="p-3 hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-colors group touch-manipulation"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-slate-700 text-sm bg-slate-100 px-2 py-0.5 rounded-md group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                                    {result.verse_key}
                                </span>
                                {result._score && showDebug && (
                                    <span className="text-[10px] text-slate-400">{(result._score * 100).toFixed(0)}%</span>
                                )}
                            </div>
                            <div className="text-right font-arabic text-base sm:text-lg text-slate-800 leading-[1.85] break-words whitespace-normal mb-1" dir="rtl">
                                {result.text.replace(/<\/?em>/g, '')}
                            </div>
                            {result.translations && result.translations[0] && (
                                <div className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                                    {result.translations[0].text.replace(/<\/?em>/g, '')}
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="p-3 border-t border-slate-100 bg-white sticky bottom-0">
                        <button
                            onClick={() => {
                                if (!query.trim()) return;
                                const q = encodeURIComponent(query);
                                router.push(`/search?q=${q}`);
                            }}
                            className="w-full text-center py-3 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors touch-manipulation min-h-[44px]"
                            title="See all Quran results"
                        >
                            View all results for “{query}”
                        </button>
                    </div>
                </div>
            )}

            {(hadithCandidates?.length || 0) > 0 && (
                <div>
                    <div className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 border-t border-slate-100">
                        Hadith Chapters
                    </div>
                    {hadithCandidates?.map((h, idx) => (
                        <div
                            key={`${h.book || h.collection || "hadith"}-${h.chapterId || idx}-${idx}`}
                            onClick={() => router.push(`/hadith/${h.book || h.collection || h.bookSlug || "bukhari"}?chapter=${h.chapterId || h.sectionId || idx}`)}
                            className="p-3 hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-colors touch-manipulation"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-slate-600 capitalize bg-slate-100 px-1.5 py-0.5 rounded">
                                    {h.book || h.collection || h.bookSlug || "bukhari"}
                                </span>
                                <span className="text-sm font-medium text-slate-800 line-clamp-1">
                                    {h.title || h.sectionName || "Chapter"}
                                </span>
                            </div>
                            <div className="text-xs text-slate-500 line-clamp-1 pl-1 border-l-2 border-slate-200">
                                {h.bookName || h.collection || h.bookSlug || ""}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    ) : null;

    return (
        <div className={clsx('relative w-full max-w-xl mx-auto min-w-0', className)}>
            <div className="flex flex-col gap-2 sm:block sm:relative">
                <input
                    type="search"
                    enterKeyHint="search"
                    value={query}
                    onChange={(e) => {
                        const value = e.target.value;
                        setQuery(value);
                        if (!value) {
                            clearResults();
                        }
                    }}
                    onFocus={() => {
                        if (typeof window === 'undefined') return;
                        try {
                            const el = document.getElementById('unified-search-root');
                            if (!el) return;
                            const scrollToEl = () => {
                                const rect = el.getBoundingClientRect();
                                const top = rect.top + window.scrollY - 16;
                                window.scrollTo({ top: top < 0 ? 0 : top, behavior: 'smooth' });
                            };
                            scrollToEl();
                            setTimeout(scrollToEl, 350);
                        } catch {}
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search Quran (Yasin, Musa, 2:255…)"
                    className="w-full min-w-0 px-4 py-3 sm:py-2.5 sm:pr-28 rounded-full border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all shadow-sm text-base min-h-[48px] sm:min-h-0 sm:text-lg"
                    dir="auto"
                    aria-label="Search Quran"
                />

                <div className="flex items-center gap-2 sm:absolute sm:right-2 sm:top-1/2 sm:-translate-y-1/2">
                    <div className="relative flex-1 sm:flex-none min-w-0">
                         <button
                            type="button"
                            onClick={() => setShowReciters(!showReciters)}
                            className="flex w-full sm:w-auto items-center justify-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 px-3 py-2.5 sm:py-1 rounded-full text-slate-600 transition-colors touch-manipulation min-h-[44px] sm:min-h-0"
                            title="Select Reciter for Playback"
                         >
                            <span className="truncate max-w-[8rem] sm:max-w-[4rem]">{selectedReciter?.name.split(' ')[0]}</span>
                            <ChevronDown className="w-3 h-3 shrink-0" />
                         </button>

                         {showReciters && (
                            <div className="absolute left-0 right-0 sm:left-auto sm:right-0 top-full mt-2 w-full sm:w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50 max-h-60 overflow-y-auto">
                                {RECITERS.map(reciter => (
                                    <button
                                        key={reciter.id}
                                        type="button"
                                        onClick={() => handleReciterSelect(reciter.id)}
                                        className={`w-full text-left px-4 py-2.5 sm:py-2 text-sm hover:bg-slate-50 touch-manipulation ${selectedReciterId === reciter.id ? 'text-emerald-600 font-medium bg-emerald-50' : 'text-slate-600'}`}
                                    >
                                        {reciter.name}
                                    </button>
                                ))}
                            </div>
                         )}
                    </div>

                    <button
                        type="button"
                        onClick={() => handleSearch(query)}
                        className="shrink-0 flex h-11 w-11 sm:p-2 items-center justify-center bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors shadow-sm disabled:opacity-50 touch-manipulation"
                        disabled={isSearching || !query.trim()}
                        aria-label="Search"
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
                    className="mt-2 sm:absolute sm:top-full sm:left-0 sm:right-0 sm:mt-2 bg-emerald-50 border border-emerald-100 rounded-xl p-3 shadow-lg cursor-pointer hover:bg-emerald-100 transition-colors z-20 flex items-center justify-between group touch-manipulation"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-emerald-200 p-2 rounded-full text-emerald-700 shrink-0">
                            <ArrowRight className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-emerald-900 truncate">{navAction.label}</span>
                    </div>
                    <span className="text-xs text-emerald-600 font-medium group-hover:underline shrink-0 ml-2">Enter</span>
                </div>
            )}

            {/* Inline results — flows below the bar, no popup */}
            {hasDropdown && (
                <div className="mt-2 bg-white rounded-xl shadow-md border border-slate-100 z-10">
                    {resultsPanel}
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
