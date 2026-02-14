
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Play, Pause, Mic, Square, ChevronLeft, ChevronRight, 
    RotateCcw, Repeat, Settings, Check, Volume2, User, Mic2, FileAudio, Trash2
} from 'lucide-react';
import { useQuranAudio } from '@/hooks/useQuranAudio';
import { RECITERS } from '@/data/reciters';
import { saveRecording, getRecording, deleteRecording } from '@/utils/audioStorage';

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
    const [compareMode, setCompareMode] = useState(false);
    
    // User Audio State
    const [userAudioBlob, setUserAudioBlob] = useState<Blob | null>(null);
    const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
    const [isUserPlaying, setIsUserPlaying] = useState(false);
    const userAudioRef = useRef<HTMLAudioElement | null>(null);

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch existing recordings map
    const [hasRecordingMap, setHasRecordingMap] = useState<Record<string, boolean>>({});

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

                if (reciter?.urlPrefix) {
                    // Custom Reciter Logic (EveryAyah format)
                    mappedVerses.forEach((v: any) => {
                        const [surahNum, ayahNum] = v.verse_key.split(':');
                        const s = String(surahNum).padStart(3, '0');
                        const a = String(ayahNum).padStart(3, '0');
                        const url = `${reciter.urlPrefix}/${s}${a}.mp3`;
                        audioMap.set(v.verse_key, url);
                    });
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
                
                const finalAyahs = mappedVerses.map((v: any) => ({
                    ...v,
                    audio: { url: audioMap.get(v.verse_key) || '' }
                }));
                
                setAyahs(finalAyahs);
                setLoading(false);
                checkRecordings(finalAyahs);
            })
            .catch(err => {
                console.error("Failed to load ayahs", err);
                setLoading(false);
            });

    }, [range, reciterId]);

    const checkRecordings = async (currentAyahs: Ayah[]) => {
        const map: Record<string, boolean> = {};
        for (const ayah of currentAyahs) {
            const blob = await getRecording(`${range.id}_${ayah.verse_key}`);
            if (blob) map[ayah.verse_key] = true;
        }
        setHasRecordingMap(map);
    };

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
        range: { start: `${range.surah.id}:${range.startAyah}`, end: `${range.surah.id}:${range.endAyah}` },
        onAyahEnd: (key) => {
            if (compareMode) {
                handleCompareSequence(key);
                return false; // Stop auto-next
            }
            return true; // Continue normal
        }
    });

    const handleCompareSequence = async (finishedKey: string) => {
        // Reciter finished. Now check for user recording.
        const blob = await getRecording(`${range.id}_${finishedKey}`);
        if (blob) {
            const url = URL.createObjectURL(blob);
            if (userAudioRef.current) {
                userAudioRef.current.src = url;
                userAudioRef.current.play();
                setIsUserPlaying(true);
                
                userAudioRef.current.onended = () => {
                    setIsUserPlaying(false);
                    URL.revokeObjectURL(url);
                    // Continue to next ayah
                    playNext(finishedKey);
                };
            }
        } else {
            // No recording, just move on
            playNext(finishedKey);
        }
    };

    // Recording Logic
    const startRecording = async () => {
        if (!playingAyahKey) {
            alert("Please select an ayah to record for.");
            return;
        }
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                await saveRecording(`${range.id}_${playingAyahKey}`, blob);
                setHasRecordingMap(prev => ({ ...prev, [playingAyahKey]: true }));
                
                // Load for immediate playback if needed
                const url = URL.createObjectURL(blob);
                setUserAudioUrl(url);
                setUserAudioBlob(blob);
                
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            
            // Timer
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(t => t + 1);
            }, 1000);
            
            // Pause reciter if playing
            if (isPlaying) pause();

        } catch (err) {
            console.error(err);
            alert("Microphone access denied or not available.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const playUserRecording = async (verseKey: string) => {
        const blob = await getRecording(`${range.id}_${verseKey}`);
        if (blob) {
            const url = URL.createObjectURL(blob);
            setUserAudioUrl(url);
            if (userAudioRef.current) {
                userAudioRef.current.src = url;
                userAudioRef.current.play();
                setIsUserPlaying(true);
                userAudioRef.current.onended = () => setIsUserPlaying(false);
            }
        }
    };
    
    const deleteUserRecording = async (verseKey: string) => {
        if (confirm("Delete your recording for this ayah?")) {
            await deleteRecording(`${range.id}_${verseKey}`);
            setHasRecordingMap(prev => {
                const next = { ...prev };
                delete next[verseKey];
                return next;
            });
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Ayahs...</div>;

    const currentAyah = ayahs.find(a => a.verse_key === playingAyahKey) || ayahs[0];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-100px)]">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full">
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
                    <button 
                        onClick={() => setCompareMode(!compareMode)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                            compareMode 
                                ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-500' 
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <User className="w-3 h-3" />
                        Compare
                    </button>
                    
                    <select 
                        value={reciterId}
                        onChange={(e) => setReciterId(Number(e.target.value))}
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
                    const hasRecording = hasRecordingMap[ayah.verse_key];
                    
                    return (
                        <div 
                            key={ayah.id}
                            id={`verse-${ayah.verse_key}`}
                            className={`p-6 rounded-2xl transition-all ${
                                isActive 
                                    ? 'bg-white shadow-md border-l-4 border-emerald-500 ring-1 ring-black/5' 
                                    : 'bg-white/50 border border-transparent hover:bg-white hover:shadow-sm'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-md">
                                    {ayah.verse_key}
                                </span>
                                <div className="flex gap-2">
                                    {hasRecording && (
                                        <button 
                                            onClick={() => playUserRecording(ayah.verse_key)}
                                            className="p-1.5 text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100"
                                            title="Play your recording"
                                        >
                                            <User className="w-3 h-3" />
                                        </button>
                                    )}
                                    {isActive && (
                                        isRecording ? (
                                            <button 
                                                onClick={stopRecording}
                                                className="p-1.5 text-red-600 bg-red-50 rounded-full hover:bg-red-100 animate-pulse"
                                            >
                                                <Square className="w-3 h-3" />
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={startRecording}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                                title="Record yourself"
                                            >
                                                <Mic className="w-3 h-3" />
                                            </button>
                                        )
                                    )}
                                    {hasRecording && (
                                        <button 
                                            onClick={() => deleteUserRecording(ayah.verse_key)}
                                            className="p-1.5 text-slate-300 hover:text-red-500 rounded-full"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <p className="text-right font-amiri text-2xl md:text-3xl leading-loose text-slate-800 mb-4" dir="rtl">
                                {ayah.text_uthmani}
                            </p>
                            
                            <p className="text-slate-500 text-sm italic">
                                {ayah.translations?.[0]?.text.replace(/<[^>]*>/g, '')}
                            </p>
                            
                            {isActive && isRecording && (
                                <div className="mt-4 flex items-center justify-center gap-2 text-red-600 text-sm font-mono bg-red-50 py-1 rounded-lg">
                                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                                    Recording... {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Controls (Sticky Bottom) */}
            <div className="bg-white border-t border-slate-200 p-4 pb-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                {/* User Audio Player (Hidden but functional) */}
                <audio ref={userAudioRef} className="hidden" />

                <div className="flex flex-col gap-4 max-w-md mx-auto">
                    {/* Progress / Title */}
                    <div className="flex justify-between text-xs text-slate-400 px-1">
                        <span>{playingAyahKey || "Ready"}</span>
                        <span>{isPlaying ? "Playing" : isUserPlaying ? "Playing Recording" : "Paused"}</span>
                    </div>

                    {/* Main Buttons */}
                    <div className="flex items-center justify-between gap-4">
                        <button 
                            onClick={() => setSettings(s => ({ ...s, repeatCount: s.repeatCount === Infinity ? 1 : Infinity }))}
                            className={`p-2 rounded-lg transition-colors ${
                                settings.repeatCount === Infinity 
                                    ? 'bg-emerald-100 text-emerald-600' 
                                    : 'text-slate-400 hover:bg-slate-50'
                            }`}
                        >
                            <Repeat className="w-5 h-5" />
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
        </div>
    );
}
