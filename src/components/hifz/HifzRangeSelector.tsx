
import { useState, useEffect } from 'react';
import { ChevronRight, Plus, AlertCircle } from 'lucide-react';

type Surah = {
    id: number;
    name_simple: string;
    verses_count: number;
};

type HifzRangeSelectorProps = {
    initialJuz?: number;
    onRangeAdd: (range: {
        juz: number;
        surah: Surah;
        startAyah: number;
        endAyah: number;
    }) => void;
    onCancel: () => void;
};

export default function HifzRangeSelector({ initialJuz, onRangeAdd, onCancel }: HifzRangeSelectorProps) {
    const [step, setStep] = useState<1 | 2 | 3>(initialJuz ? 2 : 1);
    const [selectedJuz, setSelectedJuz] = useState<number>(initialJuz || 1);
    const [surahsInJuz, setSurahsInJuz] = useState<Surah[]>([]);
    const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
    const [startAyah, setStartAyah] = useState<number>(1);
    const [endAyah, setEndAyah] = useState<number>(1);
    const [startAyahText, setStartAyahText] = useState<string>('');
    const [endAyahText, setEndAyahText] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch Surahs when Juz is selected
    useEffect(() => {
        if (selectedJuz) {
            setLoading(true);
            // Fetch surahs in this Juz
            fetch(`https://api.quran.com/api/v4/chapters?juz=${selectedJuz}`)
                .then(res => res.json())
                .then(data => {
                    setSurahsInJuz(data.chapters);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        }
    }, [selectedJuz]);

    // Fetch ayah text previews
    useEffect(() => {
        if (step === 3 && selectedSurah) {
            const fetchText = async () => {
                try {
                    // Fetch Start Ayah
                    const startRes = await fetch(`https://api.quran.com/api/v4/verses/by_key/${selectedSurah.id}:${startAyah}?fields=text_uthmani`);
                    const startData = await startRes.json();
                    if (startData.verse) setStartAyahText(startData.verse.text_uthmani);

                    // Fetch End Ayah (only if different)
                    if (startAyah !== endAyah) {
                        const endRes = await fetch(`https://api.quran.com/api/v4/verses/by_key/${selectedSurah.id}:${endAyah}?fields=text_uthmani`);
                        const endData = await endRes.json();
                        if (endData.verse) setEndAyahText(endData.verse.text_uthmani);
                    } else {
                        setEndAyahText('');
                    }
                } catch (e) {
                    console.error("Failed to fetch ayah preview", e);
                }
            };
            
            const timer = setTimeout(fetchText, 500);
            return () => clearTimeout(timer);
        }
    }, [step, selectedSurah, startAyah, endAyah]);

    const handleJuzSelect = (juz: number) => {
        setSelectedJuz(juz);
        setStep(2);
    };

    const handleSurahSelect = (surah: Surah) => {
        setSelectedSurah(surah);
        setStartAyah(1);
        setEndAyah(surah.verses_count); // Default to full surah or reasonable range
        setStep(3);
    };

    const validateAndAdd = () => {
        if (!selectedSurah) return;

        if (startAyah > endAyah) {
            setError("Start ayah must be before end ayah");
            return;
        }
        if (startAyah < 1 || endAyah > selectedSurah.verses_count) {
            setError(`Ayahs must be between 1 and ${selectedSurah.verses_count}`);
            return;
        }

        // Additional check: Ensure ayahs are actually in this Juz (simplified: most users trust the Juz filter)
        // But strict API check would be complex. For now rely on Surah being in Juz list.
        
        onRangeAdd({
            juz: selectedJuz,
            surah: selectedSurah,
            startAyah,
            endAyah
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 animate-in slide-in-from-bottom-4">
            <div className="mb-6">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 mb-2">
                    <span className={step >= 1 ? "text-emerald-600 font-bold" : ""}>Juz</span>
                    <ChevronRight className="w-4 h-4" />
                    <span className={step >= 2 ? "text-emerald-600 font-bold" : ""}>Surah</span>
                    <ChevronRight className="w-4 h-4" />
                    <span className={step >= 3 ? "text-emerald-600 font-bold" : ""}>Range</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                    {step === 1 && "Select Juz"}
                    {step === 2 && "Select Surah"}
                    {step === 3 && "Select Ayah Range"}
                </h3>
            </div>

            {/* Step 1: Juz Selector */}
            {step === 1 && (
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                    {Array.from({ length: 30 }, (_, i) => i + 1).map(num => (
                        <button
                            key={num}
                            onClick={() => handleJuzSelect(num)}
                            className="p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 font-bold transition-all"
                        >
                            {num}
                        </button>
                    ))}
                </div>
            )}

            {/* Step 2: Surah Selector */}
            {step === 2 && (
                <div className="space-y-2">
                    {loading ? (
                        <div className="text-center py-8 text-slate-500 text-sm sm:text-base">Loading Surahs...</div>
                    ) : (
                        surahsInJuz.map(surah => (
                            <button
                                key={surah.id}
                                onClick={() => handleSurahSelect(surah)}
                                className="w-full p-4 flex justify-between items-center rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 group transition-all"
                            >
                                <span className="font-bold text-slate-700 group-hover:text-emerald-700">
                                    {surah.id}. {surah.name_simple}
                                </span>
                                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full group-hover:bg-emerald-200 group-hover:text-emerald-800">
                                    {surah.verses_count} Ayahs
                                </span>
                            </button>
                        ))
                    )}
                    <button 
                        onClick={() => setStep(1)}
                        className="w-full mt-4 text-slate-400 hover:text-slate-600 text-sm"
                    >
                        Back to Juz Selection
                    </button>
                </div>
            )}

            {/* Step 3: Ayah Range */}
            {step === 3 && selectedSurah && (
                <div className="space-y-6">
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <span className="text-emerald-800 font-medium">Selected: </span>
                        <span className="text-emerald-900 font-bold">Surah {selectedSurah.name_simple}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Start Ayah</label>
                            <input
                                type="number"
                                min="1"
                                max={selectedSurah.verses_count}
                                value={startAyah}
                                onChange={(e) => setStartAyah(Number(e.target.value))}
                                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">End Ayah</label>
                            <input
                                type="number"
                                min="1"
                                max={selectedSurah.verses_count}
                                value={endAyah}
                                onChange={(e) => setEndAyah(Number(e.target.value))}
                                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Preview Section */}
                    {(startAyahText || endAyahText) && (
                        <div className="bg-slate-50 p-4 sm:p-6 rounded-xl border border-slate-200 space-y-6">
                            <div className="space-y-3">
                                <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-200 pb-2">Start Ayah Preview</span>
                                <p className="text-right font-arabic text-2xl sm:text-3xl text-slate-800 leading-loose" dir="rtl">
                                    {startAyahText}
                                </p>
                            </div>
                            {endAyahText && (
                                <div className="space-y-3">
                                    <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-200 pb-2">End Ayah Preview</span>
                                    <p className="text-right font-arabic text-2xl sm:text-3xl text-slate-800 leading-loose" dir="rtl">
                                        {endAyahText}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => setStep(2)}
                            className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50"
                        >
                            Back
                        </button>
                        <button
                            onClick={validateAndAdd}
                            className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg flex items-center justify-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Add Range
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
