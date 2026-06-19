
import { useState, useEffect } from 'react';
import {
    Play, Pause, ChevronLeft, ChevronRight, Repeat, FileText, X, Check, Eye, EyeOff
} from 'lucide-react';
import { useQuranAudio } from '@/hooks/useQuranAudio';
import { RECITERS } from '@/data/reciters';
import { mapApiAudioFiles, normalizeQuranAudioUrl, resolveAyahAudio } from '@/lib/quranAudioUrls';
import {
    getRangeMemorizedPercent,
    isAyahMemorized,
    recordRangePractice,
    toggleAyahMemorized,
} from '@/lib/hifzRangeProgress';

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
    const [reciterId, setReciterId] = useState(7);
    const [autoPlayKey, setAutoPlayKey] = useState<string | null>(null);
    const [selectedAyahForTafseer, setSelectedAyahForTafseer] = useState<string | null>(null);
    const [selectedTafsirId, setSelectedTafsirId] = useState<number>(168);
    const [tafsirContent, setTafsirContent] = useState<string>('');
    const [tafsirLoading, setTafsirLoading] = useState(false);
    const [memorizeMode, setMemorizeMode] = useState(true);
    const [memorizedTick, setMemorizedTick] = useState(0);

    useEffect(() => {
        recordRangePractice(range.id);
    }, [range.id]);

    const totalAyahs = range.endAyah - range.startAyah + 1;
    const memorizedPct = getRangeMemorizedPercent(range.id, totalAyahs);

    useEffect(() => {
        setLoading(true);
        const start = range.startAyah;
        const end = range.endAyah;
        const limit = range.surah.verses_count || 300;

        fetch(`https://api.quran.com/api/v4/verses/by_chapter/${range.surah.id}?language=en&words=false&translations=20&fields=text_uthmani&per_page=${limit}`)
            .then(res => res.json())
            .then(data => {
                if (data.verses) {
                    return data.verses.filter((v: { verse_key: string }) => {
                        const num = parseInt(v.verse_key.split(':')[1]);
                        return num >= start && num <= end;
                    });
                }
                return [];
            })
            .then(async (mappedVerses) => {
                const reciter = RECITERS.find(r => r.id === reciterId);
                let audioMap = new Map<string, string>();
                const backupMap = new Map<string, string>();

                if (reciter?.urlPrefix) {
                    try {
                        const res = await fetch(`https://api.quran.com/api/v4/recitations/7/by_chapter/${range.surah.id}?per_page=${limit}`);
                        if (res.ok) {
                            const audioData = await res.json();
                            mapApiAudioFiles(audioData.audio_files).forEach((url, key) => {
                                backupMap.set(key, url);
                            });
                        }
                    } catch { /* ignore */ }
                } else {
                    try {
                        const res = await fetch(`https://api.quran.com/api/v4/recitations/${reciterId}/by_chapter/${range.surah.id}?per_page=${limit}`);
                        if (res.ok) {
                            const audioData = await res.json();
                            audioMap = mapApiAudioFiles(audioData.audio_files);
                        }
                    } catch (e) {
                        console.error('Failed to fetch audio', e);
                    }
                }

                setAyahs(mappedVerses.map((v: Ayah) => {
                    const audio = resolveAyahAudio(v.verse_key, reciter, audioMap.get(v.verse_key));
                    const backup = backupMap.get(v.verse_key);
                    return {
                        ...v,
                        audio: {
                            url: audio.url,
                            backupUrl: backup ? normalizeQuranAudioUrl(backup) : audio.backupUrl,
                        },
                    };
                }));
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to load ayahs', err);
                setLoading(false);
            });
    }, [range, reciterId]);

    const {
        playingAyahKey,
        isPlaying,
        play,
        pause,
        playNext,
        playPrevious,
        settings,
        setSettings,
    } = useQuranAudio({
        ayahs,
        range: { start: `${range.surah.id}:${range.startAyah}`, end: `${range.surah.id}:${range.endAyah}` },
    });

    useEffect(() => () => { pause(); }, [pause]);

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
            if (!res.ok) throw new Error('Failed to fetch tafseer');
            const data = await res.json();
            setTafsirContent(data.tafsir?.text || '');
        } catch (e) {
            console.error('Error fetching tafsir:', e);
            setTafsirContent('');
        } finally {
            setTafsirLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted">Loading ayahs…</p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
            {/* Header */}
            <header className="shrink-0 border-b border-border bg-surface px-3 sm:px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => { pause(); onBack(); }}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-background"
                        aria-label="Back to ranges"
                    >
                        <ChevronLeft className="w-6 h-6 text-foreground" />
                    </button>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-foreground truncate">{range.surah.name_simple}</h3>
                        <p className="text-xs text-muted">
                            Juz {range.juz} · Ayah {range.startAyah}–{range.endAyah}
                            <span className="text-primary font-semibold"> · {memorizedPct}% memorized</span>
                        </p>
                        <div className="mt-1.5 h-1.5 rounded-full bg-border overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${memorizedPct}%` }}
                            />
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setMemorizeMode((m) => !m)}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                            memorizeMode
                                ? 'bg-primary/10 border-primary/30 text-primary'
                                : 'border-border text-muted'
                        }`}
                        title={memorizeMode ? 'Hifz mode on (translation hidden)' : 'Show translation'}
                    >
                        {memorizeMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
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
                    className="mt-2 w-full min-h-[44px] rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                    {RECITERS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
            </header>

            {/* Ayah list */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-4 py-4 space-y-3">
                {ayahs.map(ayah => {
                    const isActive = playingAyahKey === ayah.verse_key;
                    const memorized = isAyahMemorized(range.id, ayah.verse_key);
                    void memorizedTick;
                    return (
                        <div
                            key={ayah.id}
                            id={`verse-${ayah.verse_key}`}
                            className={`rounded-2xl p-4 sm:p-5 transition-all cursor-pointer select-none active:scale-[0.995] ${
                                isActive
                                    ? 'bg-surface shadow-md border-l-4 border-primary ring-1 ring-primary/10'
                                    : 'bg-surface/80 border border-border/60'
                            }`}
                            onClick={() => {
                                if (playingAyahKey === ayah.verse_key) {
                                    isPlaying ? pause() : play(ayah.verse_key);
                                } else {
                                    play(ayah.verse_key);
                                }
                            }}
                        >
                            <div className="flex justify-between items-center gap-2 mb-3">
                                <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-lg">
                                    {ayah.verse_key}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleAyahMemorized(range.id, ayah.verse_key);
                                            setMemorizedTick((t) => t + 1);
                                        }}
                                        className={`min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                                            memorized
                                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                : 'bg-background text-muted border-border'
                                        }`}
                                        title={memorized ? 'Marked memorized' : 'Mark as memorized'}
                                    >
                                        <Check className={`w-3.5 h-3.5 ${memorized ? 'opacity-100' : 'opacity-40'}`} />
                                        {memorized ? 'Done' : 'Learn'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); openTafseer(ayah.verse_key); }}
                                        className="min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/5 text-primary border border-primary/15"
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                        Tafseer
                                    </button>
                                </div>
                            </div>
                            <p className="text-right font-arabic text-[clamp(1.35rem,5vw,1.875rem)] leading-[1.9] text-foreground mb-3" dir="rtl">
                                {ayah.text_uthmani}
                            </p>
                            <p className={`text-muted text-sm leading-relaxed transition-all duration-300 ${
                                memorizeMode ? 'blur-md select-none opacity-60 hover:blur-none hover:opacity-100' : ''
                            }`}>
                                {ayah.translations?.[0]?.text.replace(/<[^>]*>/g, '')}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Sticky controls */}
            <div className="shrink-0 border-t border-border bg-surface px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
                <div className="flex flex-col gap-3 max-w-md mx-auto">
                    <div className="flex justify-between text-xs text-muted px-1">
                        <span className="truncate max-w-[45%]">{playingAyahKey || 'Tap an ayah to play'}</span>
                        <span>{isPlaying ? 'Playing' : 'Paused'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                const cycle = [1, 3, 5, Infinity] as const;
                                const idx = cycle.findIndex(c => c === (settings.repeatCount || 1));
                                setSettings(s => ({ ...s, repeatCount: cycle[(idx + 1) % cycle.length] }));
                            }}
                            className={`flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-xl px-2 ${
                                (settings.repeatCount || 1) !== 1
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted hover:bg-background'
                            }`}
                        >
                            <Repeat className="w-5 h-5" />
                            <span className="text-xs font-bold">
                                {(settings.repeatCount || 1) === Infinity ? '∞' : settings.repeatCount || 1}
                            </span>
                        </button>

                        <div className="flex items-center gap-1 sm:gap-2">
                            <button
                                type="button"
                                onClick={() => playPrevious()}
                                className="flex h-12 w-12 items-center justify-center rounded-full text-foreground hover:bg-background"
                                aria-label="Previous ayah"
                            >
                                <ChevronLeft className="w-7 h-7" />
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (playingAyahKey) {
                                        isPlaying ? pause() : play(playingAyahKey);
                                    } else {
                                        play(ayahs[0]?.verse_key);
                                    }
                                }}
                                className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-lg active:scale-95 transition-transform"
                                aria-label={isPlaying ? 'Pause' : 'Play'}
                            >
                                {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5 fill-current" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => playNext()}
                                className="flex h-12 w-12 items-center justify-center rounded-full text-foreground hover:bg-background"
                                aria-label="Next ayah"
                            >
                                <ChevronRight className="w-7 h-7" />
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => setSettings(s => ({
                                ...s,
                                playbackSpeed: s.playbackSpeed === 1 ? 0.75 : s.playbackSpeed === 0.75 ? 1.25 : 1,
                            }))}
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-sm font-bold text-muted hover:bg-background"
                        >
                            {settings.playbackSpeed}x
                        </button>
                    </div>
                </div>
            </div>

            {selectedAyahForTafseer && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
                    <div className="bg-surface rounded-t-2xl sm:rounded-2xl max-w-2xl w-full shadow-2xl border border-border max-h-[92dvh] sm:max-h-[90vh] flex flex-col">
                        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="p-2 rounded-full bg-primary/10 text-primary shrink-0">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-muted">Tafseer</span>
                                    <span className="block text-sm font-bold text-foreground truncate">{selectedAyahForTafseer}</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedAyahForTafseer(null)}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted hover:bg-background"
                                aria-label="Close tafseer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="px-4 py-3 border-b border-border flex gap-2 overflow-x-auto shrink-0">
                            {[168, 169].map(id => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => {
                                        if (!selectedAyahForTafseer) return;
                                        setSelectedTafsirId(id);
                                        fetchTafsir(selectedAyahForTafseer, id);
                                    }}
                                    className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border ${
                                        selectedTafsirId === id
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-background text-muted border-border'
                                    }`}
                                >
                                    {id === 168 ? "Ma'arif al-Qur'an" : 'Ibn Kathir'}
                                </button>
                            ))}
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            {tafsirLoading ? (
                                <div className="flex justify-center py-16">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                                </div>
                            ) : tafsirContent ? (
                                <div
                                    className="text-sm sm:text-base text-foreground leading-relaxed [&_p]:mb-3"
                                    dangerouslySetInnerHTML={{ __html: tafsirContent }}
                                />
                            ) : (
                                <p className="text-center text-muted italic py-8">No Tafseer available for this ayah.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
