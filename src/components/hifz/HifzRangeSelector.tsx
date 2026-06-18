
import { useState, useEffect } from 'react';
import { ChevronRight, Plus, AlertCircle, ChevronLeft } from 'lucide-react';

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
    const [loading, setLoading] = useState(() => Boolean(initialJuz));
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (step >= 2 && selectedJuz) {
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
    }, [selectedJuz, step]);

    useEffect(() => {
        if (step === 3 && selectedSurah) {
            const fetchText = async () => {
                try {
                    const startRes = await fetch(`https://api.quran.com/api/v4/verses/by_key/${selectedSurah.id}:${startAyah}?fields=text_uthmani`);
                    const startData = await startRes.json();
                    if (startData.verse) setStartAyahText(startData.verse.text_uthmani);

                    if (startAyah !== endAyah) {
                        const endRes = await fetch(`https://api.quran.com/api/v4/verses/by_key/${selectedSurah.id}:${endAyah}?fields=text_uthmani`);
                        const endData = await endRes.json();
                        if (endData.verse) setEndAyahText(endData.verse.text_uthmani);
                    } else {
                        setEndAyahText('');
                    }
                } catch (e) {
                    console.error('Failed to fetch ayah preview', e);
                }
            };
            const timer = setTimeout(fetchText, 500);
            return () => clearTimeout(timer);
        }
    }, [step, selectedSurah, startAyah, endAyah]);

    const handleJuzSelect = (juz: number) => {
        setLoading(true);
        setSelectedJuz(juz);
        setStep(2);
    };

    const handleSurahSelect = (surah: Surah) => {
        setSelectedSurah(surah);
        setStartAyah(1);
        setEndAyah(surah.verses_count);
        setStep(3);
    };

    const validateAndAdd = () => {
        if (!selectedSurah) return;
        if (startAyah > endAyah) {
            setError('Start ayah must be before end ayah');
            return;
        }
        if (startAyah < 1 || endAyah > selectedSurah.verses_count) {
            setError(`Ayahs must be between 1 and ${selectedSurah.verses_count}`);
            return;
        }
        onRangeAdd({
            juz: selectedJuz,
            surah: selectedSurah,
            startAyah,
            endAyah,
        });
    };

    const stepLabels = ['Juz', 'Surah', 'Range'];

    return (
        <div className="bg-surface rounded-2xl shadow-sm border border-border overflow-hidden">
            {/* Progress steps */}
            <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-border/60 bg-background/50">
                <div className="flex items-center justify-center gap-1 sm:gap-2 mb-3">
                    {stepLabels.map((label, i) => {
                        const stepNum = (i + 1) as 1 | 2 | 3;
                        const active = step >= stepNum;
                        return (
                            <div key={label} className="flex items-center gap-1 sm:gap-2">
                                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted/50 shrink-0" />}
                                <span className={`text-xs sm:text-sm font-semibold ${active ? 'text-primary' : 'text-muted'}`}>
                                    {label}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground text-center">
                    {step === 1 && 'Select Juz'}
                    {step === 2 && `Surahs in Juz ${selectedJuz}`}
                    {step === 3 && 'Choose Ayah Range'}
                </h3>
            </div>

            <div className="p-4 sm:p-6">
                {step === 1 && (
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                        {Array.from({ length: 30 }, (_, i) => i + 1).map(num => (
                            <button
                                key={num}
                                type="button"
                                onClick={() => handleJuzSelect(num)}
                                className="min-h-[48px] p-2 rounded-xl border border-border font-bold text-foreground hover:border-primary hover:bg-primary/5 hover:text-primary active:scale-95 transition-all"
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-2">
                        {loading ? (
                            <div className="text-center py-12 text-muted text-sm">Loading surahs…</div>
                        ) : (
                            surahsInJuz.map(surah => (
                                <button
                                    key={surah.id}
                                    type="button"
                                    onClick={() => handleSurahSelect(surah)}
                                    className="w-full min-h-[52px] p-4 flex justify-between items-center gap-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 group transition-all active:scale-[0.99]"
                                >
                                    <span className="font-bold text-foreground group-hover:text-primary text-left">
                                        {surah.id}. {surah.name_simple}
                                    </span>
                                    <span className="text-xs text-muted bg-background px-2.5 py-1 rounded-full shrink-0">
                                        {surah.verses_count} ayahs
                                    </span>
                                </button>
                            ))
                        )}
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="w-full min-h-[44px] mt-2 flex items-center justify-center gap-1 text-sm font-medium text-muted hover:text-foreground"
                        >
                            <ChevronLeft className="w-4 h-4" /> Back to Juz
                        </button>
                    </div>
                )}

                {step === 3 && selectedSurah && (
                    <div className="space-y-5">
                        <div className="bg-primary/5 p-4 rounded-xl border border-primary/15 text-center sm:text-left">
                            <span className="text-primary font-bold">{selectedSurah.name_simple}</span>
                            <span className="text-muted text-sm"> · Juz {selectedJuz}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Start Ayah</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min="1"
                                    max={selectedSurah.verses_count}
                                    value={startAyah}
                                    onChange={(e) => setStartAyah(Number(e.target.value))}
                                    className="w-full min-h-[48px] p-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">End Ayah</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min="1"
                                    max={selectedSurah.verses_count}
                                    value={endAyah}
                                    onChange={(e) => setEndAyah(Number(e.target.value))}
                                    className="w-full min-h-[48px] p-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>
                        </div>

                        {(startAyahText || endAyahText) && (
                            <div className="bg-background p-4 sm:p-5 rounded-xl border border-border space-y-5">
                                <div>
                                    <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Start preview</span>
                                    <p className="text-right font-arabic text-[clamp(1.25rem,4vw,1.75rem)] text-foreground leading-[1.85] mt-2" dir="rtl">
                                        {startAyahText}
                                    </p>
                                </div>
                                {endAyahText && (
                                    <div>
                                        <span className="text-[11px] font-bold text-muted uppercase tracking-wider">End preview</span>
                                        <p className="text-right font-arabic text-[clamp(1.25rem,4vw,1.75rem)] text-foreground leading-[1.85] mt-2" dir="rtl">
                                            {endAyahText}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2 sticky bottom-0 bg-surface pb-[env(safe-area-inset-bottom,0px)]">
                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                className="flex-1 min-h-[52px] border border-border text-muted font-bold rounded-xl hover:bg-background"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={validateAndAdd}
                                className="flex-1 min-h-[52px] bg-primary text-white font-bold rounded-xl hover:bg-primary-light shadow-md flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
                            >
                                <Plus className="w-5 h-5" />
                                Add Range
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
