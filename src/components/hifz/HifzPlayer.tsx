
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Play, Pause, ChevronLeft, ChevronRight, Repeat, FileText, X
} from 'lucide-react';
import { useQuranAudio } from '@/hooks/useQuranAudio';
import { RECITERS } from '@/data/reciters';

type Ayah = {
    id: number;
    verse_key: string;
    text_uthmani: string;
    translations: { text: string }[];
    audio: { url: string };
};

type HifzRange = {
    id: string;
    juz: number;
    surah: { id: number; name_simple: string; verses_count?: number };
    startAyah: number;
    endAyah: number;
};

type HifzPlayerProps = {
    range: HifzRange;
    onBack: () => void;
};

export default function HifzPlayer({ range, onBack }: HifzPlayerProps) {
    const [ayahs, setAyahs] = useState<Ayah[]>([]);
    const [loading, setLoading] = useState(true);
    const [reciterId, setReciterId] = useState(7); // Mishary default
    const [autoPlayKey, setAutoPlayKey] = useState<string | null>(null);
    const [selectedAyahForTafseer, setSelectedAyahForTafseer] = useState<string | null>(null);
    const [selectedTafsirId, setSelectedTafsirId] = useState<number>(168);
    const [tafsirContent, setTafsirContent] = useState<string>('');
    const [tafsirLoading, setTafsirLoading] = useState(false);

    // Fetch Ayahs
    useEffect(() => {
        setLoading(true);
        const start = range.startAyah;
        const end = range.endAyah;
        
        // Use verses_count if available, otherwise default to standard page size or safe max
        const limit = range.surah.verses_count || 300;
        
        fetch(`https://api.quran.com/api/v4/verses/by_chapter/${range.surah.id}?language=en&words=false&translations=20&fields=text_uthmani&per_page=${limit}`)
            .then(res => res.json())
            .then(data => {
                if (data.verses) {
                    const filtered = data.verses.filter((v: any) => {
                        const num = parseInt(v.verse_key.split(':')[1]);
                        return num >= start && num <= end;
                    });
                    return filtered;
                }
                return [];
            })
            .then(async (mappedVerses) => {
                // Fetch audio urls for these verses
                const reciter = RECITERS.find(r => r.id === reciterId);
                const audioMap = new Map();
                const backupMap = new Map();

                if (reciter?.urlPrefix) {
                    // Custom Reciter Logic (EveryAyah format)
                    mappedVerses.forEach((v: any) => {
                        const [surahNum, ayahNum] = v.verse_key.split(':');
                        const s = String(surahNum).padStart(3, '0');
                        const a = String(ayahNum).padStart(3, '0');
                        const url = `${reciter.urlPrefix}/${s}${a}.mp3`;
                        audioMap.set(v.verse_key, url);
                    });
                    try {
                        const res = await fetch(`https://api.quran.com/api/v4/recitations/7/by_chapter/${range.surah.id}?per_page=${limit}`);
                        if (res.ok) {
                            const audioData = await res.json();
                            if (audioData.audio_files) {
                                audioData.audio_files.forEach((a: any) => {
                                    backupMap.set(a.verse_key, a.url);
                                });
                            }
                        }
                    } catch {}
                } else {
                    // Standard API Reciter Logic
                    try {
                        const res = await fetch(`https://api.quran.com/api/v4/recitations/${reciterId}/by_chapter/${range.surah.id}?per_page=${limit}`);
                        if (res.ok) {
                            const audioData = await res.json();
                            if (audioData.audio_files) {
                                audioData.audio_files.forEach((a: any) => {
                                    audioMap.set(a.verse_key, a.url);
                                });
                            }
                        }
                    } catch (e) {
                        console.error("Failed to fetch audio", e);
                    }
                }
                
                const finalAyahs = mappedVerses.map((v: any) => {
                    const primary = audioMap.get(v.verse_key) || '';
                    const backup = backupMap.get(v.verse_key) || '';
                    return {
                        ...v,
                        audio: { url: primary, backupUrl: backup }
                    };
                });
                
                setAyahs(finalAyahs);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load ayahs", err);
                setLoading(false);
            });

    }, [range, reciterId]);

    // Audio Hook
    const { 
        playingAyahKey, 
        isPlaying, 
        play, 
        pause, 
        playNext, 
        playPrevious,
        settings, 
        setSettings 
    } = useQuranAudio({ 
        ayahs, 
        range: { start: `${range.surah.id}:${range.startAyah}`, end: `${range.surah.id}:${range.endAyah}` }
    });

    // Pause audio when unmounting HifzPlayer (prevent lingering playback on navigation)
    useEffect(() => {
        return () => {
            pause();
        };
    }, [pause]);

    // Autoplay when sources refreshed (e.g., reciter change)
    useEffect(() => {
        if (autoPlayKey && ayahs.length > 0) {
            play(autoPlayKey);
            setAutoPlayKey(null);
        }
    }, [ayahs, autoPlayKey, play]);

    const openTafseer = (verseKey: string) => {
        setSelectedAyahForTafseer(verseKey);
        fetchTafsir(verseKey, selectedTafsirId);
    };

    const fetchTafsir = async (verseKey: string, tafsirId: number) => {
        try {
            setTafsirLoading(true);
            setTafsirContent('');
            const res = await fetch(`https://api.quran.com/api/v4/tafsirs/${tafsirId}/by_ayah/${verseKey}`);
            if (!res.ok) {
                throw new Error('Failed to fetch tafseer');
            }
            const data = await res.json();
            if (data.tafsir && data.tafsir.text) {
                setTafsirContent(data.tafsir.text);
            } else {
                setTafsirContent('');
            }
        } catch (e) {
            console.error('Error fetching tafsir:', e);
            setTafsirContent('');
        } finally {
            setTafsirLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Ayahs...</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-100px)]">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            pause();
                            onBack();
                        }}
                        className="p-2 hover:bg-slate-200 rounded-full"
                    >
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <h3 className="font-bold text-slate-800">
                            Surah {range.surah.name_simple}
                        </h3>
                        <p className="text-xs text-slate-500">
                            Ayah {range.startAyah} - {range.endAyah}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <select 
                        value={reciterId}
                        onChange={(e) => {
                            const nextId = Number(e.target.value);
                            const resumeKey = playingAyahKey || ayahs[0]?.verse_key || null;
                            if (resumeKey) {
                                pause();
                                setAutoPlayKey(resumeKey);
                            }
                            setReciterId(nextId);
                        }}
                        className="text-xs border-none bg-transparent font-medium text-slate-600 focus:ring-0 cursor-pointer"
                    >
                        {RECITERS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Ayah Display (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
                {ayahs.map(ayah => {
                    const isActive = playingAyahKey === ayah.verse_key;
                    
                    return (
                        <div 
                            key={ayah.id}
                            id={`verse-${ayah.verse_key}`}
                            className={`p-6 rounded-2xl transition-all cursor-pointer select-none ${
                                isActive 
                                    ? 'bg-white shadow-md border-l-4 border-emerald-500 ring-1 ring-black/5' 
                                    : 'bg-white/50 border border-transparent hover:bg-white hover:shadow-sm'
                            }`}
                            onClick={() => {
                                if (playingAyahKey === ayah.verse_key) {
                                    isPlaying ? pause() : play(ayah.verse_key);
                                } else {
                                    play(ayah.verse_key);
                                }
                            }}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-md">
                                    {ayah.verse_key}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openTafseer(ayah.verse_key);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100"
                                >
                                    <FileText className="w-3 h-3" />
                                    Tafseer
                                </button>
                            </div>

                            <p className="text-right font-arabic text-2xl md:text-3xl leading-loose text-slate-800 mb-4" dir="rtl">
                                {ayah.text_uthmani}
                            </p>
                            
                            <p className="text-slate-500 text-sm italic">
                                {ayah.translations?.[0]?.text.replace(/<[^>]*>/g, '')}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Controls (Sticky Bottom) */}
            <div className="bg-white border-t border-slate-200 p-4 pb-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex flex-col gap-4 max-w-md mx-auto">
                    {/* Progress / Title */}
                    <div className="flex justify-between text-xs text-slate-400 px-1">
                        <span>{playingAyahKey || "Ready"}</span>
                        <span>{isPlaying ? "Playing" : "Paused"}</span>
                    </div>

                    {/* Main Buttons */}
                    <div className="flex items-center justify-between gap-4">
                        <button 
                            onClick={() => {
                                const cycle = [1, 3, 5, Infinity] as const;
                                const idx = cycle.findIndex(c => c === (settings.repeatCount || 1));
                                const next = cycle[(idx + 1) % cycle.length];
                                setSettings(s => ({ ...s, repeatCount: next }));
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                                (settings.repeatCount || 1) !== 1 
                                    ? 'bg-emerald-100 text-emerald-600' 
                                    : 'text-slate-400 hover:bg-slate-50'
                            }`}
                            title={(settings.repeatCount || 1) === Infinity ? 'Loop' : `${settings.repeatCount || 1}x`}
                        >
                            <Repeat className="w-5 h-5" />
                            <span className="ml-1 text-xs font-bold">
                                {(settings.repeatCount || 1) === Infinity ? '∞' : settings.repeatCount || 1}
                            </span>
                        </button>

                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => playPrevious()}
                                className="p-3 text-slate-600 hover:bg-slate-100 rounded-full"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>

                            <button 
                                onClick={() => {
                                    if (playingAyahKey) {
                                        isPlaying ? pause() : play(playingAyahKey);
                                    } else {
                                        play(ayahs[0]?.verse_key);
                                    }
                                }}
                                className="w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-lg transform hover:scale-105 transition-all"
                            >
                                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                            </button>

                            <button 
                                onClick={() => playNext()}
                                className="p-3 text-slate-600 hover:bg-slate-100 rounded-full"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>

                        <button 
                            onClick={() => setSettings(s => ({ ...s, playbackSpeed: s.playbackSpeed === 1 ? 0.75 : s.playbackSpeed === 0.75 ? 1.25 : 1 }))}
                            className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg font-bold text-xs w-10"
                        >
                            {settings.playbackSpeed}x
                        </button>
                    </div>
                </div>
            </div>

            {selectedAyahForTafseer && (
                <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/50">
                    <div className="mt-6 sm:mt-0 bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 relative max-h-[90vh] flex flex-col">
                        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Tafseer
                                    </span>
                                    <span className="text-sm font-bold text-slate-900">
                                        {selectedAyahForTafseer}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedAyahForTafseer(null)}
                                className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 shadow-sm border border-slate-200 transition-all flex-shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 flex gap-2 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => {
                                    if (!selectedAyahForTafseer) return;
                                    setSelectedTafsirId(168);
                                    fetchTafsir(selectedAyahForTafseer, 168);
                                }}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${selectedTafsirId === 168 ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
                            >
                                Ma&apos;arif al-Qur&apos;an
                            </button>
                            <button
                                onClick={() => {
                                    if (!selectedAyahForTafseer) return;
                                    setSelectedTafsirId(169);
                                    fetchTafsir(selectedAyahForTafseer, 169);
                                }}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${selectedTafsirId === 169 ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
                            >
                                Ibn Kathir
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-white custom-scrollbar">
                            {tafsirLoading ? (
                                <div className="flex justify-center py-16">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
                                </div>
                            ) : (
                                <div className="text-sm sm:text-base text-slate-800 leading-relaxed [&_p]:mb-3 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-2">
                                    {tafsirContent ? (
                                        <div dangerouslySetInnerHTML={{ __html: tafsirContent }} />
                                    ) : (
                                        <p className="text-center text-slate-500 italic">
                                            No Tafseer available for this Ayah.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
