'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Loader2, ArrowRight, Volume2, Globe, BookOpen, AlertCircle, Sparkles } from 'lucide-react';
import { cleanSpeechText, extractKeywords, findBestMatch, AyahItem } from '@/utils/voiceSearchLogic';
import { fetchQuranSearchResults as fetchSearchResults } from '@/utils/quranSearch';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import { RECITERS } from '@/data/reciters';

export default function VoiceSearchStandalone() {
    const router = useRouter();
    const [voiceLang, setVoiceLang] = useState<'ar-SA' | 'en-US'>('ar-SA'); // Default to Arabic for recitation
    const [query, setQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<any>(null);
    const [candidates, setCandidates] = useState<any[]>([]);
    
    // Reciter State
    const [selectedReciterId, setSelectedReciterId] = useState(7); // Mishary

    // Load persisted language
    useEffect(() => {
        const saved = localStorage.getItem('voice_search_lang');
        if (saved === 'ar-SA' || saved === 'en-US') {
            setVoiceLang(saved);
        }
    }, []);

    const handleVoiceLangChange = (lang: 'ar-SA' | 'en-US') => {
        setVoiceLang(lang);
        localStorage.setItem('voice_search_lang', lang);
    };

    const { isListening, isSupported, toggleListening } = useVoiceSearch({
        lang: voiceLang,
        onStart: () => {
            setError(null);
            setCandidates([]);
            setDebugInfo(null);
        },
        onResult: async (text, isFinal) => {
            setQuery(text);

            const isArabic = /[\u0600-\u06FF]/.test(text);
            const cleaned = cleanSpeechText(text, isArabic);
            
            setDebugInfo({
                original: text,
                cleaned,
                status: isFinal ? 'Final processing...' : 'Listening...'
            });

            if (!isFinal) return;

            // 1. Local Auto-navigate (Surah/Juz/Ayah key)
            // Note: We don't have the full 'ayahs' list here locally unless passed as prop.
            // For a standalone page, we might not want to fetch ALL ayahs (6236).
            // Instead, we'll rely on the API for specific ayah search, OR we can support Surah/Juz navigation.
            // voiceSearchLogic's findBestMatch works best with a list of ayahs for "Ayah" matching.
            // But for "Surah X" or "Juz Y", it works without the big list if we pass an empty list or minimal context.
            // Let's rely on API for text search and local logic for Surah/Juz.
            
            const match = findBestMatch(text, []); // Empty array for ayahs means only Surah/Juz/Key matching
            
            if (match && (match.type === 'surah' || match.type === 'juz' || match.type === 'juz_ayah')) {
                 if ((match.score || 0) >= 80) {
                    // Navigate
                    if (match.type === 'surah') {
                        router.push(`/quran/${match.result.id}?autoplay=true&reciter=${selectedReciterId}`);
                    } else if (match.type === 'juz') {
                        router.push(`/quran/juz/${match.target}?reciter=${selectedReciterId}`);
                    } else if (match.type === 'juz_ayah') {
                        const [juzId, ayahIndex] = (match.target as string).split(':');
                        router.push(`/quran/juz/${juzId}?ayahIndex=${ayahIndex}&reciter=${selectedReciterId}&autoplay=true`);
                    }
                    return;
                 }
            }

            // 2. Global API Search (for Recitation/Text)
            try {
                setDebugInfo(prev => ({ ...prev, status: 'Searching Quran...' }));
                const data = await fetchSearchResults(text, 20);
                
                if (data.search && data.search.results && data.search.results.length > 0) {
                    const topResult = data.search.results[0];
                    // If high confidence, navigate immediately?
                    // For "praying any ayaat", immediate navigation is best.
                    
                    // Logic: If user is in "Arabic" mode and we get a result, it's likely a recitation.
                    // Let's navigate to the first result if it's a good match.
                    
                    setCandidates(data.search.results);
                    setDebugInfo(prev => ({ ...prev, status: `Found ${data.search.results.length} matches` }));
                    
                    // Auto-navigate to first result if confidence is high-ish or it's the only logic
                    if (data.search.results.length > 0) {
                         const targetKey = topResult.verse_key;
                         const [surahId] = targetKey.split(':');
                         router.push(`/quran/${surahId}?autoplay=true&startingVerse=${targetKey}&reciter=${selectedReciterId}#verse-${targetKey}`);
                    }
                } else {
                    setError('No matches found in Quran.');
                    setDebugInfo(prev => ({ ...prev, status: 'No matches' }));
                }
            } catch (e) {
                console.error("Voice search failed", e);
                setError('Network error or API unavailable.');
            }
        },
        onError: (msg) => setError(msg)
    });

    if (!isSupported) {
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl">
                <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-lg font-bold">Voice Search Not Supported</h3>
                <p>Your browser does not support the Web Speech API. Please use Chrome or Edge.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 max-w-4xl mx-auto">
            
            {/* Header / Mode Selection */}
            <div className="flex gap-4 mb-12">
                <button
                    onClick={() => handleVoiceLangChange('ar-SA')}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all w-40 ${
                        voiceLang === 'ar-SA'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-lg scale-105'
                        : 'border-slate-200 text-slate-500 hover:border-emerald-200 hover:bg-slate-50'
                    }`}
                >
                    <BookOpen className="w-8 h-8" />
                    <span className="font-bold">Quran / Arabic</span>
                    <span className="text-xs opacity-70">Recite Ayah</span>
                </button>

                <button
                    onClick={() => handleVoiceLangChange('en-US')}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all w-40 ${
                        voiceLang === 'en-US'
                        ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-lg scale-105'
                        : 'border-slate-200 text-slate-500 hover:border-blue-200 hover:bg-slate-50'
                    }`}
                >
                    <Globe className="w-8 h-8" />
                    <span className="font-bold">English</span>
                    <span className="text-xs opacity-70">Command / Search</span>
                </button>
            </div>

            {/* Main Microphone Button */}
            <div className="relative mb-12 group">
                {/* Ripples */}
                {isListening && (
                    <>
                        <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20"></div>
                        <div className="absolute inset-[-12px] bg-emerald-500 rounded-full animate-pulse opacity-10"></div>
                    </>
                )}
                
                <button
                    onClick={toggleListening}
                    className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                        isListening 
                        ? 'bg-gradient-to-br from-red-500 to-pink-600 scale-110' 
                        : 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:scale-105'
                    }`}
                >
                    <Mic className={`w-12 h-12 text-white ${isListening ? 'animate-pulse' : ''}`} />
                </button>
                
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
                    <p className={`font-medium transition-colors ${isListening ? 'text-red-500' : 'text-slate-400'}`}>
                        {isListening ? 'Listening...' : 'Tap to Speak'}
                    </p>
                </div>
            </div>

            {/* Feedback Area */}
            <div className="w-full max-w-2xl text-center min-h-[100px] mb-8">
                {query ? (
                    <div className="space-y-2">
                        <p className="text-2xl font-medium text-slate-800 animate-in fade-in slide-in-from-bottom-4">
                            "{query}"
                        </p>
                        {debugInfo?.status && (
                            <p className="text-sm text-slate-400 flex items-center justify-center gap-2">
                                {isListening && <Loader2 className="w-3 h-3 animate-spin" />}
                                {debugInfo.status}
                            </p>
                        )}
                    </div>
                ) : (
                    <p className="text-slate-400 text-lg">
                        {voiceLang === 'ar-SA' 
                            ? "Try reciting: \"Al-Fatiha\" or any verse..." 
                            : "Try saying: \"Surah Yasin\" or \"Juz 30\"..."}
                    </p>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 text-red-600 px-6 py-3 rounded-full mb-8 flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Results Preview (if not auto-navigated) */}
            {candidates.length > 0 && !isListening && (
                <div className="w-full max-w-2xl space-y-4">
                    <h3 className="text-slate-500 font-medium px-2">Matches</h3>
                    {candidates.slice(0, 3).map((result, idx) => (
                        <div 
                            key={result.verse_key}
                            onClick={() => {
                                const [surahId] = result.verse_key.split(':');
                                router.push(`/quran/${surahId}?autoplay=true&startingVerse=${result.verse_key}&reciter=${selectedReciterId}#verse-${result.verse_key}`);
                            }}
                            className="bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
                        >
                            <div>
                                <div className="font-bold text-slate-800 mb-1">{result.verse_key}</div>
                                <div className="text-slate-600 text-right font-amiri text-lg dir-rtl" dir="rtl">
                                    {result.text}
                                </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
