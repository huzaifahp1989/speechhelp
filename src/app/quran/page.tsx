'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Search,
  ChevronRight,
  Brain,
  Headphones,
  Repeat,
  Eye,
  LayoutGrid,
  Play,
  Mic,
  Star,
  Palette,
} from 'lucide-react';
import { getAllJuzBoundaries } from '@/lib/juzBoundaries';
import { RECITERS } from '@/data/reciters';
import ReciterBrowser from '@/components/quran/ReciterBrowser';
import ContinueReadingBanner from '@/components/quran/ContinueReadingBanner';
import QuranLearningHub from '@/components/quran/QuranLearningHub';
import { useQuranReadingProgress } from '@/hooks/useQuranReadingProgress';
import { stopGlobalQuranAudio } from '@/lib/quranAudio';

type Surah = {
  id: number;
  name_simple: string;
  name_arabic: string;
  verses_count: number;
  revelation_place: string;
  translated_name: { name: string };
};

type Tab = 'juz' | 'surahs' | 'reciters';

export default function QuranPage() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('juz');
  const [hifzRangeCount, setHifzRangeCount] = useState(0);
  const [juzNotes, setJuzNotes] = useState<Record<number, { weakParts?: string; toMemorize?: string }>>({});
  const { progress } = useQuranReadingProgress();

  const juzList = getAllJuzBoundaries();

  useEffect(() => {
    stopGlobalQuranAudio();
    fetch('https://api.quran.com/api/v4/chapters?language=en')
      .then((r) => r.json())
      .then((d) => setSurahs(d.chapters || []))
      .catch(console.error)
      .finally(() => setLoading(false));

    try {
      const ranges = localStorage.getItem('hifz_ranges');
      if (ranges) setHifzRangeCount(JSON.parse(ranges).length);
      const notes = localStorage.getItem('juz_progress');
      if (notes) setJuzNotes(JSON.parse(notes));
    } catch { /* ignore */ }
  }, []);

  const filteredSurahs = surahs.filter(
    (s) =>
      s.name_simple.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name_arabic.includes(searchQuery) ||
      s.translated_name.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toString() === searchQuery
  );

  const filteredJuz = juzList.filter(
    (j) =>
      !searchQuery.trim() ||
      j.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.startVerse.includes(searchQuery) ||
      j.endVerse.includes(searchQuery) ||
      String(j.juz) === searchQuery
  );

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Hero */}
      <div className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
                <Brain className="w-4 h-4" />
                Hifz Assistant
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-3 leading-tight">
                Memorize the Qur&apos;an{' '}
                <span className="text-primary">with ease</span>
              </h1>
              <p className="text-base sm:text-lg text-muted max-w-xl mx-auto lg:mx-0 mb-6">
                Listen with {RECITERS.length}+ reciters, practice by Juz, repeat ayahs, colour-coded Tajweed for the full Qur&apos;an, and hide translations — all on the Quran reader.
              </p>

              <ContinueReadingBanner variant="hero" className="max-w-xl mx-auto lg:mx-0 mb-6" />

              <div className="flex flex-wrap gap-2 sm:gap-3 justify-center lg:justify-start">
                <button
                  type="button"
                  onClick={() => setActiveTab('reciters')}
                  className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-light shadow-md"
                >
                  <Headphones className="w-4 h-4" />
                  Browse Reciters
                </button>
                <Link
                  href="/hifz-planner"
                  className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 border border-border bg-surface rounded-xl font-semibold text-foreground hover:bg-primary/5"
                >
                  <Brain className="w-4 h-4" />
                  Hifz Companion
                  {hifzRangeCount > 0 && (
                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs">{hifzRangeCount}</span>
                  )}
                </Link>
              </div>
            </div>

            {/* Hifz tools grid */}
            <div className="w-full lg:w-auto grid grid-cols-2 gap-2 sm:gap-3 min-w-0 lg:min-w-[320px]">
              {[
                { href: '/quran/mushaf', icon: BookOpen, label: '13-Line Mushaf', sub: 'Full page salah' },
                { href: '/hifz-planner', icon: LayoutGrid, label: 'Daily Plan', sub: 'Verse-by-verse' },
                { href: '/voice-search', icon: Mic, label: 'Voice Search', sub: 'Find any ayah' },
                { href: '/quran/juz', icon: Star, label: 'All 30 Juz', sub: 'Accurate bounds' },
              ].map(({ href, icon: Icon, label, sub }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col gap-1 p-3 sm:p-4 rounded-xl border border-border bg-background hover:border-primary hover:bg-primary/5 transition-colors min-h-[80px]"
                >
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="font-bold text-sm text-foreground">{label}</span>
                  <span className="text-[11px] text-muted">{sub}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Hifz features strip */}
          <QuranLearningHub />

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            {[
              { icon: Headphones, text: `${RECITERS.length}+ reciters` },
              { icon: Palette, text: 'Colour-coded Tajweed' },
              { icon: Repeat, text: 'Ayah repeat & loop' },
              { icon: Eye, text: 'Hide translation mode' },
              { icon: Play, text: 'Tap ayah to play' },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/10 text-xs sm:text-sm font-medium text-foreground"
              >
                <Icon className="w-4 h-4 text-primary shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Search */}
        <div className="sticky top-16 z-30 pt-2 pb-4 bg-background/95 backdrop-blur-md -mx-4 px-4 sm:-mx-6 sm:px-6">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="search"
              placeholder="Search Juz, Surah, or verse (e.g. 2:255)…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-border bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted"
            />
          </div>

          {/* Tabs */}
          <div className="flex justify-center mt-4 overflow-x-auto">
            <div className="inline-flex p-1 rounded-xl bg-surface border border-border shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('juz')}
                className={`min-h-[40px] px-4 sm:px-5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'juz' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
                }`}
              >
                By Juz
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('surahs')}
                className={`min-h-[40px] px-4 sm:px-5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'surahs' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
                }`}
              >
                By Surah
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reciters')}
                className={`min-h-[40px] px-4 sm:px-5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'reciters' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
                }`}
              >
                Reciters ({RECITERS.length})
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : activeTab === 'reciters' ? (
          <ReciterBrowser
            lastReadSurahId={progress?.mode === 'surah' ? progress.surahId : null}
            lastJuz={progress?.mode === 'juz' ? progress.juzId : null}
          />
        ) : activeTab === 'juz' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredJuz.map((juz) => (
              <article
                key={juz.juz}
                className="bg-surface rounded-2xl border border-border overflow-hidden hover:border-primary/40 hover:shadow-md transition-all"
              >
                <Link
                  href={`/quran/juz/${juz.juz}`}
                  className="block p-4 sm:p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-lg">
                      {juz.juz}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-foreground">{juz.label}</h3>
                      <p className="text-xs text-muted mt-1 leading-relaxed">
                        <span className="font-semibold text-primary">{juz.startVerse}</span>
                        {' → '}
                        <span className="font-semibold text-primary">{juz.endVerse}</span>
                      </p>
                      <p className="text-[11px] text-muted/80 mt-1 truncate hidden sm:block">
                        {juz.startDescription} → {juz.endDescription}
                      </p>
                      {(juzNotes[juz.juz]?.weakParts?.trim() || juzNotes[juz.juz]?.toMemorize?.trim()) && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {juzNotes[juz.juz]?.toMemorize?.trim() && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                              To memorize
                            </span>
                          )}
                          {juzNotes[juz.juz]?.weakParts?.trim() && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                              Weak parts
                            </span>
                          )}
                        </div>
                      )}
                      {progress?.mode === 'juz' && progress.juzId === juz.juz && (
                        <span className="inline-block mt-2 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          Last read
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted shrink-0 mt-1" />
                  </div>
                </Link>
                <div className="flex border-t border-border/60">
                  <Link
                    href={`/quran/juz/${juz.juz}`}
                    className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] text-xs sm:text-sm font-semibold text-primary hover:bg-primary/5"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    Listen
                  </Link>
                  <div className="w-px bg-border/60" />
                  <Link
                    href={`/hifz-planner?juz=${juz.juz}`}
                    className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] text-xs sm:text-sm font-semibold text-muted hover:bg-background hover:text-foreground"
                  >
                    <Brain className="w-3.5 h-3.5" />
                    Plan Hifz
                  </Link>
                </div>
              </article>
            ))}
            {filteredJuz.length === 0 && (
              <p className="col-span-full text-center py-12 text-muted">No Juz matches your search.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredSurahs.map((surah) => (
              <Link
                key={surah.id}
                href={`/quran/${surah.id}`}
                className="group bg-surface rounded-xl border border-border p-4 sm:p-5 hover:border-primary hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center font-bold text-muted group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors shrink-0">
                    {surah.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-foreground group-hover:text-primary truncate">
                        {surah.name_simple}
                      </h3>
                      <span className="font-arabic text-lg text-primary leading-none shrink-0">
                        {surah.name_arabic}
                      </span>
                    </div>
                    <p className="text-sm text-muted truncate">{surah.translated_name.name}</p>
                    <p className="text-xs text-muted/70 mt-1 uppercase tracking-wide">
                      {surah.revelation_place} · {surah.verses_count} ayahs
                    </p>
                  </div>
                </div>
              </Link>
            ))}
            {filteredSurahs.length === 0 && (
              <p className="col-span-full text-center py-12 text-muted">No Surahs found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
