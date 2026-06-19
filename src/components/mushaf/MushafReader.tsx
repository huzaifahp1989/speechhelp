'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Languages,
  MoreVertical,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import {
  fetchMushafPage,
  getSavedShowTranslation,
  saveMushafPage,
  saveShowTranslation,
  toArabicNumerals,
  TOTAL_MUSHAF_PAGES,
  type MushafLine,
  type PageVerse,
} from '@/lib/mushaf';
import { getJuzEndPage, getJuzInfo, getJuzStartPage } from '@/data/mushafJuzPages';
import MushafJuzPicker from '@/components/mushaf/MushafJuzPicker';
import MushafSurahIndex from '@/components/mushaf/MushafSurahIndex';

type Props = {
  initialPage: number;
};

type Panel = 'none' | 'index' | 'goto' | 'menu';

export default function MushafReader({ initialPage }: Props) {
  const router = useRouter();
  const [page, setPage] = useState(initialPage);
  const [lines, setLines] = useState<MushafLine[]>([]);
  const [pageVerses, setPageVerses] = useState<PageVerse[]>([]);
  const [surahId, setSurahId] = useState<number | null>(null);
  const [surahNameEn, setSurahNameEn] = useState<string | null>(null);
  const [surahNameAr, setSurahNameAr] = useState<string | null>(null);
  const [juzNumber, setJuzNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [panel, setPanel] = useState<Panel>('none');
  const [pageInput, setPageInput] = useState(String(initialPage));
  const [gotoTab, setGotoTab] = useState<'page' | 'juz'>('page');

  useEffect(() => {
    setShowTranslation(getSavedShowTranslation());
  }, []);

  const loadPage = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      setError(null);
      setPanel('none');
      try {
        const data = await fetchMushafPage(pageNum);
        setLines(data.lines);
        setPageVerses(data.verses);
        setSurahId(data.surahId);
        setSurahNameEn(data.surahNameEn);
        setSurahNameAr(data.surahNameAr);
        setJuzNumber(data.juzNumber);
        setPage(pageNum);
        setPageInput(String(pageNum));
        saveMushafPage(pageNum);
        router.replace(`/quran/mushaf/${pageNum}`, { scroll: false });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load page');
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    loadPage(initialPage);
  }, [initialPage, loadPage]);

  const goToPage = (next: number) => {
    const clamped = Math.max(1, Math.min(TOTAL_MUSHAF_PAGES, next));
    if (clamped !== page) loadPage(clamped);
  };

  const toggleTranslation = () => {
    setShowTranslation((v) => {
      const next = !v;
      saveShowTranslation(next);
      return next;
    });
    setPanel('none');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (panel !== 'none' && e.key === 'Escape') {
        setPanel('none');
        return;
      }
      if (panel !== 'none') return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToPage(page - 1);
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        goToPage(page + 1);
      }
      if (e.key === 't' || e.key === 'T') toggleTranslation();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [page, panel]);

  useEffect(() => {
    let touchStartX = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (panel !== 'none') return;
      const diff = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) < 60) return;
      if (diff > 0) goToPage(page - 1);
      else goToPage(page + 1);
    };
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [page, panel]);

  const juzInfo = getJuzInfo(juzNumber);
  const juzStart = getJuzStartPage(juzNumber);
  const juzEnd = getJuzEndPage(juzNumber);
  const juzProgress =
    juzEnd > juzStart ? Math.min(100, ((page - juzStart) / (juzEnd - juzStart)) * 100) : 100;

  const shellClass = nightMode ? 'mushaf-shell--night' : 'mushaf-shell--day';

  const headerLeft =
    surahId && surahNameEn ? `${surahId} - ${surahNameEn}` : surahNameEn || '…';
  const headerRight = juzInfo ? `${juzNumber} - ${juzInfo.shortName}` : `Juz ${juzNumber}`;

  return (
    <div className={`mushaf-shell fixed inset-0 z-[100] flex flex-col ${shellClass}`}>
      {/* Top bar — like reference app */}
      <header className="mushaf-topbar shrink-0">
        <div className="mushaf-topbar__row">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1 || loading}
            className="mushaf-topbar__nav md:hidden"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="mushaf-topbar__left truncate">{headerLeft}</div>
          <div className="mushaf-topbar__center font-bold tabular-nums">{page}</div>
          <div className="mushaf-topbar__right truncate text-right">{headerRight}</div>

          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= TOTAL_MUSHAF_PAGES || loading}
            className="mushaf-topbar__nav md:hidden"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="mushaf-progress" aria-hidden>
          <div className="mushaf-progress__fill" style={{ width: `${juzProgress}%` }} />
        </div>
      </header>

      {/* Main mushaf page */}
      <main className="mushaf-main flex-1 min-h-0 flex flex-col sm:flex-row">
        <div
          className={`mushaf-main__page-wrap flex-1 min-h-0 flex items-center justify-center p-2 sm:p-4 ${
            showTranslation ? 'sm:max-w-[58%]' : ''
          }`}
        >
          <div
            className="mushaf-page mushaf-frame w-full max-w-[42rem] h-full max-h-full flex flex-col"
            data-night={nightMode ? 'true' : 'false'}
          >
            {/* Inner page header (Arabic) */}
            {!loading && !error && (
              <div className="mushaf-inner-header shrink-0">
                <span className="font-arabic truncate" dir="rtl">
                  {surahNameAr ? `سُورَةُ ${surahNameAr}` : ''}
                  {surahId ? ` ${toArabicNumerals(surahId)}` : ''}
                </span>
                <span className="font-arabic font-bold tabular-nums">
                  {toArabicNumerals(page)}
                </span>
                <span className="font-arabic truncate text-left" dir="rtl">
                  {juzInfo?.shortName ? `جُزْء ${toArabicNumerals(juzNumber)}` : ''}
                </span>
              </div>
            )}

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="mushaf-spinner" />
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
                <p className="text-red-500 text-sm">{error}</p>
                <button
                  type="button"
                  onClick={() => loadPage(page)}
                  className="px-4 py-2 rounded-lg bg-[#0d4f4f] text-white font-medium text-sm"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="mushaf-lines">
                {lines.map((line) => (
                  <div
                    key={line.lineNumber}
                    className={`mushaf-line-row ${
                      line.centered ? 'mushaf-line-row--center' : 'mushaf-line-row--end'
                    }`}
                  >
                    {line.text ? (
                      <p
                        dir="rtl"
                        className={`mushaf-arabic ${
                          line.type === 'surah_name'
                            ? 'mushaf-arabic--surah mushaf-arabic--center'
                            : line.type === 'bismillah'
                              ? 'mushaf-arabic--bismillah mushaf-arabic--center'
                              : 'mushaf-arabic--justified'
                        }`}
                      >
                        {line.text}
                      </p>
                    ) : (
                      <span className="invisible select-none mushaf-arabic" aria-hidden="true">
                        &nbsp;
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {showTranslation && !loading && !error && (
          <aside className="mushaf-translation flex-1 sm:flex-none sm:w-[min(380px,42%)] min-h-0 overflow-y-auto border-t sm:border-t-0 sm:border-l border-[#d4c4a0]/40">
            <div className="sticky top-0 px-3 py-2 text-xs font-bold border-b border-[#d4c4a0]/40 bg-inherit">
              English — Sahih International
            </div>
            <div className="p-3 space-y-3">
              {pageVerses.map((verse) => (
                <div key={verse.verseKey}>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0d4f4f]/10 text-[#0d4f4f]">
                    {verse.verseKey}
                  </span>
                  <p className="text-sm leading-relaxed mt-1">{verse.translation}</p>
                </div>
              ))}
            </div>
          </aside>
        )}
      </main>

      {/* Bottom bar — INDEX / GO TO */}
      <footer className="mushaf-bottombar shrink-0">
        <span className="mushaf-bottombar__brand hidden sm:inline">13 Line Quran</span>
        <span className="mushaf-bottombar__brand sm:hidden">13-Line</span>
        <div className="mushaf-bottombar__actions">
          <button type="button" onClick={() => setPanel(panel === 'index' ? 'none' : 'index')}>
            INDEX
          </button>
          <button type="button" onClick={() => setPanel(panel === 'goto' ? 'none' : 'goto')}>
            GO TO…
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === 'menu' ? 'none' : 'menu')}
            aria-label="More options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
        <div className="hidden md:flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="mushaf-bottombar__nav"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= TOTAL_MUSHAF_PAGES}
            className="mushaf-bottombar__nav"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {/* Panels */}
      {panel !== 'none' && (
        <div
          className="mushaf-overlay"
          onClick={() => setPanel('none')}
          role="presentation"
        >
          <div
            className="mushaf-panel"
            data-night={nightMode ? 'true' : 'false'}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mushaf-panel__header">
              <h2 className="font-bold text-base">
                {panel === 'index' && 'Surah Index'}
                {panel === 'goto' && 'Go to Page or Juz'}
                {panel === 'menu' && 'Options'}
              </h2>
              <button type="button" onClick={() => setPanel('none')} aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mushaf-panel__body">
              {panel === 'index' && (
                <MushafSurahIndex
                  currentPage={page}
                  nightMode={nightMode}
                  onSelectPage={(p) => goToPage(p)}
                />
              )}

              {panel === 'goto' && (
                <div className="space-y-4">
                  <div className="flex rounded-lg border border-[#d4c4a0]/50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setGotoTab('page')}
                      className={`flex-1 py-2 text-sm font-bold ${
                        gotoTab === 'page' ? 'bg-[#0d4f4f] text-white' : ''
                      }`}
                    >
                      Page
                    </button>
                    <button
                      type="button"
                      onClick={() => setGotoTab('juz')}
                      className={`flex-1 py-2 text-sm font-bold ${
                        gotoTab === 'juz' ? 'bg-[#0d4f4f] text-white' : ''
                      }`}
                    >
                      Juz
                    </button>
                  </div>

                  {gotoTab === 'page' ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const num = Number(pageInput);
                        if (Number.isFinite(num)) goToPage(num);
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="number"
                        min={1}
                        max={TOTAL_MUSHAF_PAGES}
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value)}
                        className="flex-1 px-3 py-3 rounded-lg border border-[#d4c4a0] text-center font-bold"
                      />
                      <button
                        type="submit"
                        className="px-5 py-3 rounded-lg bg-[#c9a227] text-white font-bold"
                      >
                        Go
                      </button>
                    </form>
                  ) : (
                    <MushafJuzPicker
                      selectedJuz={juzNumber}
                      compact
                      onSelectJuz={(_j, startPage) => goToPage(startPage)}
                    />
                  )}
                  <p className="text-xs text-center text-[#5a6b5a]">
                    Pages 1–{TOTAL_MUSHAF_PAGES} · IndoPak 13-line mushaf
                  </p>
                </div>
              )}

              {panel === 'menu' && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={toggleTranslation}
                    className="mushaf-menu-btn"
                  >
                    <Languages className="w-5 h-5" />
                    {showTranslation ? 'Hide English' : 'Show English'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNightMode((v) => !v);
                      setPanel('none');
                    }}
                    className="mushaf-menu-btn"
                  >
                    {nightMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    {nightMode ? 'Day mode' : 'Night mode'}
                  </button>
                  <a href="/quran/mushaf" className="mushaf-menu-btn">
                    Home / Choose Juz
                  </a>
                  <a href="/quran" className="mushaf-menu-btn">
                    Verse-by-verse reader
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
