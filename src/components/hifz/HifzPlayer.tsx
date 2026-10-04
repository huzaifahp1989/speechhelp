
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Play, Pause, ChevronLeft, ChevronRight, Repeat, FileText, X, Check, Eye, EyeOff
} from 'lucide-react';
import { useQuranAudio } from '@/hooks/useQuranAudio';
import { getDefaultHifzReciterId, setDefaultHifzReciterId } from '@/lib/hifzReciters';
import { RECITERS, getReciterById } from '@/data/reciters';
import RecitationPracticePanel from '@/components/quran/RecitationPracticePanel';
import { useRecitationCheck } from '@/hooks/useRecitationCheck';
import { useQuranWordAudio } from '@/hooks/useQuranWordAudio';
import { recordHifzSession } from '@/lib/hifzSessions';
import { mapApiAudioFiles, normalizeQuranAudioUrl, resolveAyahAudio } from '@/lib/quranAudioUrls';
import {
    getRangeMemorizedPercent,
    recordAyahRecall,
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
    displayName?: string;
};

type HifzPlayerProps = {
    range: HifzRange;
    onBack: () => void;
    testMode?: boolean;
    autoPlay?: boolean;
    fullRepeatMode?: boolean;
    initialRepeatCount?: number;
    initialSectionRepeatCount?: number;
    initialPlaybackSpeed?: number;
    initialTranslationMode?: 'arabic' | 'both' | 'translation';
    initialVerseKeys?: string[];
};

export default function HifzPlayer({
        range,
        onBack,
        testMode = false,
        autoPlay = false,
        fullRepeatMode = false,
        initialRepeatCount,
        initialSectionRepeatCount,
        initialPlaybackSpeed,
        initialTranslationMode = 'both',
        initialVerseKeys,
}: HifzPlayerProps) {
    const [ayahs, setAyahs] = useState<Ayah[]>([]);
    const [loading, setLoading] = useState(true);
    const [ayahLoadError, setAyahLoadError] = useState(false);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [audioErrorVerse, setAudioErrorVerse] = useState<string | null>(null);
    const [reciterId, setReciterId] = useState(getDefaultHifzReciterId);
    const initialStartVerseKey = initialVerseKeys?.[0] ?? `${range.surah.id}:${range.startAyah}`;
    const initialEndVerseKey = initialVerseKeys?.[initialVerseKeys.length - 1] ?? `${range.surah.id}:${range.endAyah}`;
    const [autoPlayKey, setAutoPlayKey] = useState<string | null>(autoPlay ? initialStartVerseKey : null);
    const [selectedAyahForTafseer, setSelectedAyahForTafseer] = useState<string | null>(null);
    const [selectedTafsirId, setSelectedTafsirId] = useState<number>(168);
    const [tafsirContent, setTafsirContent] = useState<string>('');
    const [tafsirLoading, setTafsirLoading] = useState(false);
    const [memorizeMode, setMemorizeMode] = useState(!fullRepeatMode);
    const [hideQuranText, setHideQuranText] = useState(testMode);
    const [translationMode] = useState(initialTranslationMode);
    const [practiceVerseKey, setPracticeVerseKey] = useState<string | null>(null);
    const [memorizedTick, setMemorizedTick] = useState(0);
    const [revealedAyahs, setRevealedAyahs] = useState<string[]>([]);
    const [sectionRepeatTarget, setSectionRepeatTarget] = useState<number | undefined>(
        fullRepeatMode ? initialSectionRepeatCount ?? 1 : undefined,
    );
    const [sectionRepeatIteration, setSectionRepeatIteration] = useState(1);
    const [sectionComplete, setSectionComplete] = useState(false);
    const sessionStartedAtRef = useRef<number | null>(null);
    const listeningStartedAtRef = useRef<number | null>(null);
    const listenedMillisecondsRef = useRef(0);
    const sectionRepeatIterationRef = useRef(1);
    const sectionCompleteRef = useRef(false);
    const repeatStartRef = useRef<(verseKey: string) => void>(() => {});

    const { playWord } = useQuranWordAudio(reciterId);
    const recitation = useRecitationCheck({ playWord });

    useEffect(() => {
        recordRangePractice(range.id);
    }, [range.id]);

    const totalAyahs = initialVerseKeys?.length ?? range.endAyah - range.startAyah + 1;
    const memorizedPct = getRangeMemorizedPercent(range.id, totalAyahs);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setAyahLoadError(false);
        const loadAyahs = async () => {
            try {
                const requestedKeys = initialVerseKeys ? new Set(initialVerseKeys) : null;
                const chapterIds = requestedKeys
                    ? Array.from(new Set(initialVerseKeys!.map((verseKey) => Number(verseKey.split(':')[0]))))
                    : [range.surah.id];
                const chapterResults = await Promise.all(chapterIds.map(async (chapterId) => {
                    const response = await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${chapterId}?language=en&words=false&translations=20&fields=text_uthmani&per_page=300`);
                    if (!response.ok) throw new Error('Quran data request failed');
                    const data = await response.json();
                    if (!Array.isArray(data.verses)) throw new Error('Quran data was unavailable');
                    if (requestedKeys) return data.verses.filter((verse: Ayah) => requestedKeys.has(verse.verse_key));
                    return data.verses.filter((verse: Ayah) => {
                        const number = parseInt(verse.verse_key.split(':')[1], 10);
                        return number >= range.startAyah && number <= range.endAyah;
                    });
                }));
                const mappedVerses = chapterResults.flat().sort((a, b) => {
                    const [aSurah, aAyah] = a.verse_key.split(':').map(Number);
                    const [bSurah, bAyah] = b.verse_key.split(':').map(Number);
                    return aSurah - bSurah || aAyah - bAyah;
                });
                if (mappedVerses.length === 0) throw new Error('No ayahs found for this range');

                const reciter = getReciterById(reciterId) ?? RECITERS[0];
                const audioChapterIds = Array.from(new Set(mappedVerses.map((verse) => Number(verse.verse_key.split(':')[0]))));
                const audioMap = new Map<string, string>();
                const backupMap = new Map<string, string>();
                const recitationId = reciter?.urlPrefix ? 7 : reciterId;
                const audioResults = await Promise.all(audioChapterIds.map(async (chapterId) => {
                    try {
                        const response = await fetch(`https://api.quran.com/api/v4/recitations/${recitationId}/by_chapter/${chapterId}?per_page=300`);
                        if (!response.ok) return new Map<string, string>();
                        const data = await response.json();
                        return mapApiAudioFiles(data.audio_files);
                    } catch {
                        return new Map<string, string>();
                    }
                }));
                audioResults.flatMap((audio) => Array.from(audio.entries())).forEach(([key, url]) => {
                    (reciter?.urlPrefix ? backupMap : audioMap).set(key, url);
                });

                if (cancelled) return;
                setAyahs(mappedVerses.map((verse) => {
                    const audio = resolveAyahAudio(verse.verse_key, reciter, audioMap.get(verse.verse_key));
                    const backup = backupMap.get(verse.verse_key);
                    return {
                        ...verse,
                        audio: {
                            url: audio.url,
                            backupUrl: backup ? normalizeQuranAudioUrl(backup) : audio.backupUrl,
                        },
                    };
                }));
                if (sessionStartedAtRef.current === null) sessionStartedAtRef.current = Date.now();
            } catch (error) {
                console.error('Failed to load ayahs', error);
                if (!cancelled) setAyahLoadError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void loadAyahs();
        return () => { cancelled = true; };
    }, [range, reciterId, loadAttempt, initialVerseKeys]);

    const handleSectionEnd = useCallback((verseKey: string) => {
        if (sectionRepeatTarget === undefined || sectionCompleteRef.current) return;
        const endKey = initialEndVerseKey;
        if (verseKey !== endKey) return;

        const nextIteration = sectionRepeatIterationRef.current + 1;
        if (sectionRepeatTarget === Infinity || nextIteration <= sectionRepeatTarget) {
            sectionRepeatIterationRef.current = nextIteration;
            setSectionRepeatIteration(nextIteration);
            repeatStartRef.current(initialStartVerseKey);
            return false;
        }

        sectionCompleteRef.current = true;
        setSectionComplete(true);
    }, [initialEndVerseKey, initialStartVerseKey, sectionRepeatTarget]);

    const handleAudioError = useCallback((verseKey: string) => {
        setAudioErrorVerse(verseKey);
    }, []);

    const {
        playingAyahKey,
        isPlaying,
        repeatIteration,
        play,
        pause,
        playNext,
        playPrevious,
        settings,
        setSettings,
    } = useQuranAudio({
        ayahs,
        range: { start: initialStartVerseKey, end: initialEndVerseKey },
        onAyahEnd: fullRepeatMode ? handleSectionEnd : undefined,
        onAudioError: handleAudioError,
    });

    useEffect(() => {
        if (initialRepeatCount === undefined && initialPlaybackSpeed === undefined) return;
        setSettings((current) => ({
            ...current,
            ...(initialRepeatCount !== undefined ? { repeatCount: initialRepeatCount } : {}),
            ...(initialPlaybackSpeed !== undefined ? { playbackSpeed: initialPlaybackSpeed } : {}),
        }));
    }, [initialRepeatCount, initialPlaybackSpeed, setSettings]);

    repeatStartRef.current = (verseKey) => { void play(verseKey); };

    useEffect(() => {
        if (isPlaying) {
            if (listeningStartedAtRef.current === null) listeningStartedAtRef.current = Date.now();
            return;
        }
        if (listeningStartedAtRef.current !== null) {
            listenedMillisecondsRef.current += Date.now() - listeningStartedAtRef.current;
            listeningStartedAtRef.current = null;
        }
    }, [isPlaying]);

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

    const finishPractice = () => {
        if (fullRepeatMode && !sectionCompleteRef.current) {
            pause();
            sectionCompleteRef.current = true;
            setSectionComplete(true);
            return;
        }

        pause();
        const now = Date.now();
        const minutes = Math.max(1, Math.ceil((now - (sessionStartedAtRef.current ?? now)) / 60_000));
        void recordHifzSession({
            session_type: 'recited',
            minutes,
            ayat_count: ayahs.length,
            coverage_text: `${range.displayName || range.surah.name_simple} ${initialStartVerseKey}–${initialEndVerseKey}`,
            notes: testMode
                ? 'Memory test practice'
                : fullRepeatMode
                    ? `Full Repeat · ayah ${settings.repeatCount}x · section ${sectionRepeatTarget === Infinity ? 'continuous' : `${sectionRepeatTarget ?? 1}x`}`
                    : 'Hifz range practice',
        });
        const listeningMilliseconds = listenedMillisecondsRef.current + (
            listeningStartedAtRef.current === null ? 0 : now - listeningStartedAtRef.current
        );
        listeningStartedAtRef.current = null;
        if (listeningMilliseconds > 0) {
            void recordHifzSession({
                session_type: 'tajweed_listening',
                minutes: Math.max(1, Math.ceil(listeningMilliseconds / 60_000)),
                ayat_count: ayahs.length,
                coverage_text: `${range.displayName || range.surah.name_simple} ${initialStartVerseKey}–${initialEndVerseKey}`,
                notes: 'Audio listened during Hifz range practice',
            });
        }
        onBack();
    };

    const rateCompletedSection = (rating: 'easy' | 'good' | 'needed_help' | 'difficult') => {
        for (const ayah of ayahs) recordAyahRecall(range.id, ayah.verse_key, rating);
        setMemorizedTick((tick) => tick + 1);
        finishPractice();
    };

    const toggleRepeatUntilReady = () => {
        if (sectionRepeatTarget === Infinity) {
            pause();
            sectionCompleteRef.current = true;
            setSectionComplete(true);
            return;
        }
        const nextTarget = Infinity;
        sectionRepeatIterationRef.current = 1;
        setSectionRepeatIteration(1);
        setSectionRepeatTarget(nextTarget);
        sectionCompleteRef.current = false;
        setSectionComplete(false);
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

    if (ayahLoadError) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background px-5 text-center">
                <p role="alert" className="max-w-sm text-sm text-muted">Qur’an text could not load. Check your connection and retry.</p>
                <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="min-h-12 rounded-xl bg-primary px-6 font-bold text-white">
                    Retry loading ayahs
                </button>
                <button type="button" onClick={onBack} className="min-h-10 px-4 text-sm font-semibold text-muted">Back to setup</button>
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
                        onClick={finishPractice}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-background"
                        aria-label="Back to ranges"
                    >
                        <ChevronLeft className="w-6 h-6 text-foreground" />
                    </button>
                    <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-foreground truncate">{range.displayName || range.surah.name_simple}</h3>
                        <p className="text-xs text-muted">
                            {initialStartVerseKey}–{initialEndVerseKey}
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
                        onClick={() => {
                            setHideQuranText((h) => !h);
                            setRevealedAyahs([]);
                        }}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                            hideQuranText
                                ? 'bg-amber-100 border-amber-300 text-amber-800'
                                : 'border-border text-muted'
                        }`}
                        title={hideQuranText ? 'Test mode: Quran text hidden' : 'Show Quran text'}
                    >
                        {hideQuranText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
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
                        setDefaultHifzReciterId(nextId);
                        setAudioErrorVerse(null);
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
                                setPracticeVerseKey(ayah.verse_key);
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
                            {fullRepeatMode && translationMode === 'translation' ? null : hideQuranText && !revealedAyahs.includes(ayah.verse_key) ? (
                                <div className="mb-3 flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/70 px-4 py-3">
                                    <p className="text-sm font-semibold text-muted">Ayah hidden for memory practice</p>
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setRevealedAyahs((current) => [...current, ayah.verse_key]);
                                        }}
                                        className="min-h-[40px] rounded-lg border border-primary/30 px-4 text-sm font-bold text-primary hover:bg-primary/5"
                                    >
                                        Show ayah
                                    </button>
                                </div>
                            ) : (
                                <p className="text-right font-arabic text-[clamp(1.35rem,5vw,1.875rem)] leading-[1.9] text-foreground mb-3" dir="rtl">
                                    {ayah.text_uthmani}
                                </p>
                            )}
                            {(!fullRepeatMode || translationMode !== 'arabic') && (
                                <p className={`text-muted text-sm leading-relaxed transition-all duration-300 ${
                                    !fullRepeatMode && memorizeMode ? 'blur-md select-none opacity-60 hover:blur-none hover:opacity-100' : ''
                                }`}>
                                    {ayah.translations?.[0]?.text.replace(/<[^>]*>/g, '')}
                                </p>
                            )}
                            <details className="mt-3 border-t border-border/60 pt-2" onClick={(event) => event.stopPropagation()}>
                                <summary className="min-h-[36px] cursor-pointer py-2 text-xs font-semibold text-muted">
                                    How well did you remember this ayah?
                                </summary>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {([
                                        ['easy', 'Easy'],
                                        ['good', 'Good'],
                                        ['needed_help', 'Needed help'],
                                        ['difficult', 'Difficult'],
                                    ] as const).map(([rating, label]) => (
                                        <button
                                            key={rating}
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                recordAyahRecall(range.id, ayah.verse_key, rating);
                                                setMemorizedTick((tick) => tick + 1);
                                            }}
                                            className="min-h-[40px] rounded-lg border border-border px-2 text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-primary/5"
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </details>
                        </div>
                    );
                })}
            </div>

            {/* Sticky controls */}
            <div className="shrink-0 border-t border-border bg-surface px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
                <div className="flex flex-col gap-3 max-w-md mx-auto">
                    <RecitationPracticePanel
                        recitation={recitation}
                        practiceVerseKey={practiceVerseKey ?? playingAyahKey}
                        showRecording={!fullRepeatMode}
                        surahId={range.surah.id}
                        surahName={range.surah.name_simple}
                        juz={range.juz}
                    />
                    <div className="flex justify-between text-xs text-muted px-1">
                        <span className="truncate max-w-[45%]">
                            {playingAyahKey || 'Tap an ayah to play'}
                            {fullRepeatMode && playingAyahKey && ` · ayah ${Math.max(0, ayahs.findIndex((ayah) => ayah.verse_key === playingAyahKey) + 1)} of ${ayahs.length}`}
                        </span>
                        <span>
                            {fullRepeatMode && sectionRepeatTarget === Infinity
                                ? 'Continuous repeat on'
                                : fullRepeatMode
                                    ? `Section ${sectionRepeatIteration}/${sectionRepeatTarget ?? 1} · ayah repeat ${repeatIteration}/${settings.repeatCount === Infinity ? '∞' : settings.repeatCount}`
                                    : isPlaying ? 'Playing' : 'Paused'}
                        </span>
                    </div>
                    {audioErrorVerse && (
                        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            <span>Audio for {audioErrorVerse} could not load. Try again or select another reciter.</span>
                            <button
                                type="button"
                                onClick={() => {
                                    const verseKey = audioErrorVerse;
                                    setAudioErrorVerse(null);
                                    void play(verseKey);
                                }}
                                className="min-h-9 rounded-md border border-amber-300 px-3 font-bold"
                            >
                                Retry
                            </button>
                        </div>
                    )}
                    {fullRepeatMode && (
                        <div className="flex items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={toggleRepeatUntilReady}
                                className={`min-h-[40px] rounded-lg border px-3 text-xs font-bold ${
                                    sectionRepeatTarget === Infinity ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted'
                                }`}
                            >
                                {sectionRepeatTarget === Infinity ? 'Stop continuous repeat' : 'Repeat until ready'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    sectionRepeatIterationRef.current = 1;
                                    setSectionRepeatIteration(1);
                                    sectionCompleteRef.current = false;
                                    setSectionComplete(false);
                                    void play(`${range.surah.id}:${range.startAyah}`);
                                }}
                                className="min-h-[40px] rounded-lg border border-border px-3 text-xs font-bold text-muted"
                            >
                                Repeat section
                            </button>
                        </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                const cycle = [1, 3, 6, 10, 20, 50, 100, Infinity] as const;
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
                            onClick={() => {
                                const cycle = [0.5, 0.75, 1, 1.25] as const;
                                const idx = cycle.findIndex(s => s === settings.playbackSpeed);
                                setSettings(s => ({ ...s, playbackSpeed: cycle[(idx + 1) % cycle.length] }));
                            }}
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-sm font-bold text-muted hover:bg-background"
                        >
                            {settings.playbackSpeed}x
                        </button>
                    </div>
                </div>
            </div>

            {fullRepeatMode && sectionComplete && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
                    <section role="dialog" aria-modal="true" aria-labelledby="repeat-complete-title" className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl sm:p-6">
                        <h2 id="repeat-complete-title" className="text-xl font-extrabold text-foreground">Repeat session complete</h2>
                        <p className="mt-2 text-sm text-muted">How well did you remember this section?</p>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {([
                                ['easy', 'Easy'],
                                ['good', 'Good'],
                                ['needed_help', 'Need more practice'],
                                ['difficult', 'Difficult'],
                            ] as const).map(([rating, label]) => (
                                <button
                                    key={rating}
                                    type="button"
                                    onClick={() => rateCompletedSection(rating)}
                                    className="min-h-[46px] rounded-xl border border-border px-3 text-sm font-bold text-foreground hover:border-primary/40 hover:bg-primary/5"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <button type="button" onClick={finishPractice} className="mt-3 min-h-[44px] w-full text-sm font-semibold text-muted hover:text-foreground">
                            Skip rating and finish
                        </button>
                    </section>
                </div>
            )}

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
