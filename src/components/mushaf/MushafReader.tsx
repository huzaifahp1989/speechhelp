'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Languages,
  List,
  Maximize2,
  Minimize2,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import {
  fetchMushafPage,
  getSavedShowTranslation,
  LINES_PER_PAGE,
  saveMushafPage,
  saveShowTranslation,
  TOTAL_MUSHAF_PAGES,
  type MushafLine,
  type PageVerse,
} from '@/lib/mushaf';
import { getJuzEndPage, getJuzInfo } from '@/data/mushafJuzPages';
import MushafJuzPicker from '@/components/mushaf/MushafJuzPicker';

type Props = {
  initialPage: number;
};

export default function MushafReader({ initialPage }: Props) {
  const router = useRouter();
  const [page, setPage] = useState(initialPage);
  const [lines, setLines] = useState<MushafLine[]>([]);
  const [pageVerses, setPageVerses] = useState<PageVerse[]>([]);
  const [firstVerse, setFirstVerse] = useState<string | null>(null);
  const [lastVerse, setLastVerse] = useState<string | null>(null);
  const [juzNumber, setJuzNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showJuzPanel, setShowJuzPanel] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [pageInput, setPageInput] = useState(String(initialPage));

  useEffect(() => {
    setShowTranslation(getSavedShowTranslation());
  }, []);

  const loadPage = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError(null);
    setShowJuzPanel(false);
    try {
      const data = await fetchMushafPage(pageNum);
      setLines(data.lines);
      setPageVerses(data.verses);
      setFirstVerse(data.firstVerse);
      setLastVerse(data.lastVerse);
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
  }, [router]);

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
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showJuzPanel && e.key === 'Escape') {
        setShowJuzPanel(false);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToPage(page - 1);
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        goToPage(page + 1);
      }
      if (e.key === 'Escape') setShowControls((v) => !v);
      if (e.key === 't' || e.key === 'T') toggleTranslation();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [page, showJuzPanel]);

  useEffect(() => {
    let touchStartX = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };
    const onTouchEnd = (e: TouchEvent) => {
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
  }, [page]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        setFullscreen(false);
      }
    } catch {
      setFullscreen((v) => !v);
    }
  };

  const juzInfo = getJuzInfo(juzNumber);
  const juzEndPage = getJuzEndPage(juzNumber);

  const shellClass = nightMode
    ? 'bg-[#0a1612] text-[#e8dcc8]'
    : 'bg-[#faf6ef] text-[#1a2e1a]';

  const pageClass = nightMode
    ? 'bg-[#0f1f18] border-[#1e3d30] shadow-[0_0_60px_rgba(0,0,0,0.5)]'
    : 'bg-[#fffef9] border-[#d4c4a0] shadow-[0_4px_40px_rgba(13,79,79,0.08)]';

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col ${shellClass} ${fullscreen ? 'p-0' : ''}`}
      onClick={() => {
        if (!showJuzPanel) setShowControls((v) => !v);
      }}
    >
      {/* Top bar */}
      <div
        className={`absolute top-0 inset-x-0 z-20 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b backdrop-blur-md ${
            nightMode ? 'bg-[#0a1612]/95 border-[#1e3d30]' : 'bg-[#faf6ef]/95 border-[#d4c4a0]/60'
          }`}
        >
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <Link
              href="/quran/mushaf"
              className={`p-2 rounded-lg shrink-0 ${
                nightMode ? 'hover:bg-[#1e3d30] text-[#c9a227]' : 'hover:bg-[#e8dcc8] text-[#0d4f4f]'
              }`}
            >
              <Home className="w-5 h-5" />
            </Link>

            <button
              onClick={() => setShowJuzPanel(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold shrink-0 ${
                nightMode
                  ? 'bg-[#1e3d30] text-[#c9a227] hover:bg-[#2d5a48]'
                  : 'bg-[#0d4f4f]/10 text-[#0d4f4f] hover:bg-[#0d4f4f]/15'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden xs:inline">Juz</span> {juzNumber}
            </button>

            <button
              onClick={toggleTranslation}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold shrink-0 ${
                showTranslation
                  ? nightMode
                    ? 'bg-[#c9a227] text-[#0a1612]'
                    : 'bg-[#0d4f4f] text-white'
                  : nightMode
                    ? 'hover:bg-[#1e3d30] text-[#a8b8a8]'
                    : 'hover:bg-[#e8dcc8] text-[#5a6b5a]'
              }`}
              title="Toggle English translation (T)"
            >
              <Languages className="w-4 h-4" />
              <span className="hidden sm:inline">English</span>
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || loading}
              className={`p-2 rounded-lg disabled:opacity-30 ${
                nightMode ? 'hover:bg-[#1e3d30]' : 'hover:bg-[#e8dcc8]'
              }`}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const num = Number(pageInput);
                if (Number.isFinite(num)) goToPage(num);
              }}
              className="flex items-center gap-1"
            >
              <input
                type="number"
                min={1}
                max={TOTAL_MUSHAF_PAGES}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                className={`w-14 sm:w-16 text-center text-sm font-bold rounded-lg py-1.5 border ${
                  nightMode
                    ? 'bg-[#1e3d30] border-[#2d5a48] text-[#e8dcc8]'
                    : 'bg-white border-[#d4c4a0] text-[#0d4f4f]'
                }`}
              />
              <span className={`text-xs font-medium hidden sm:inline ${nightMode ? 'text-[#a8b8a8]' : 'text-[#5a6b5a]'}`}>
                / {TOTAL_MUSHAF_PAGES}
              </span>
            </form>

            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= TOTAL_MUSHAF_PAGES || loading}
              className={`p-2 rounded-lg disabled:opacity-30 ${
                nightMode ? 'hover:bg-[#1e3d30]' : 'hover:bg-[#e8dcc8]'
              }`}
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setNightMode((v) => !v)}
              className={`p-2 rounded-lg ${nightMode ? 'hover:bg-[#1e3d30]' : 'hover:bg-[#e8dcc8]'}`}
              aria-label="Toggle night mode"
            >
              {nightMode ? <Sun className="w-5 h-5 text-[#c9a227]" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded-lg ${nightMode ? 'hover:bg-[#1e3d30]' : 'hover:bg-[#e8dcc8]'}`}
              aria-label="Toggle fullscreen"
            >
              {fullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Juz picker panel */}
      {showJuzPanel && (
        <div
          className="absolute inset-0 z-30 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowJuzPanel(false)}
        >
          <div
            className={`w-full sm:max-w-2xl max-h-[85dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 ${
              nightMode ? 'bg-[#0f1f18] border border-[#1e3d30]' : 'bg-[#fffef9] border border-[#d4c4a0]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-bold ${nightMode ? 'text-[#e8dcc8]' : 'text-[#1a2e1a]'}`}>
                Choose a Juz
              </h2>
              <button
                onClick={() => setShowJuzPanel(false)}
                className={`p-2 rounded-lg ${nightMode ? 'hover:bg-[#1e3d30]' : 'hover:bg-[#e8dcc8]'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <MushafJuzPicker
              selectedJuz={juzNumber}
              onSelectJuz={(_juz, startPage) => {
                setShowJuzPanel(false);
                goToPage(startPage);
              }}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div
        className={`flex-1 flex flex-col min-h-0 ${
          showControls ? 'pt-14 pb-8' : 'pt-0 pb-0'
        } ${showTranslation ? 'sm:flex-row' : ''}`}
      >
        {/* Mushaf page — 13 lines */}
        <div
          className={`flex items-stretch justify-center min-h-0 ${
            showTranslation ? 'sm:flex-1 sm:min-w-0 p-2' : 'flex-1 p-3 sm:p-5'
          }`}
        >
          <div
            className={`mushaf-page mushaf-frame w-full max-w-[56rem] flex flex-col border-2 rounded-sm ${pageClass} ${
              showTranslation
                ? 'max-h-[50dvh] sm:max-h-[calc(100dvh-4rem)]'
                : showControls
                  ? 'h-[calc(100dvh-4.5rem)]'
                  : 'h-[100dvh]'
            }`}
            data-night={nightMode ? 'true' : 'false'}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Page header */}
            {!loading && !error && showControls && (
              <div
                className={`flex items-center justify-between px-5 sm:px-8 py-2 border-b text-[11px] font-medium tracking-wide shrink-0 ${
                  nightMode ? 'border-[#1e3d30] text-[#a8b8a8]' : 'border-[#d4c4a0]/40 text-[#5a6b5a]'
                }`}
              >
                <span>Juz {juzNumber}{juzInfo ? ` · ${juzInfo.label.split(' — ')[1]}` : ''}</span>
                <span>Page {page} / {TOTAL_MUSHAF_PAGES}</span>
              </div>
            )}

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div
                  className={`w-10 h-10 border-2 border-t-transparent rounded-full animate-spin ${
                    nightMode ? 'border-[#c9a227]' : 'border-[#0d4f4f]'
                  }`}
                />
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
                <p className="text-red-500">{error}</p>
                <button
                  onClick={() => loadPage(page)}
                  className="px-4 py-2 rounded-lg bg-[#0d4f4f] text-white font-medium"
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

            {!loading && !error && showControls && (
              <div
                className={`flex items-center justify-between px-5 sm:px-8 py-2 border-t text-[10px] sm:text-[11px] font-medium tracking-wide shrink-0 ${
                  nightMode ? 'border-[#1e3d30] text-[#a8b8a8]' : 'border-[#d4c4a0]/50 text-[#5a6b5a]'
                }`}
              >
                <span>{firstVerse && lastVerse ? `${firstVerse} – ${lastVerse}` : ''}</span>
                <span>Juz {juzNumber}: pp. {juzInfo?.startPage}–{juzEndPage}</span>
              </div>
            )}
          </div>
        </div>

        {/* English translation panel */}
        {showTranslation && !loading && !error && (
          <div
            className={`flex-1 sm:flex-none sm:w-[min(420px,40%)] overflow-y-auto border-t sm:border-t-0 sm:border-l ${
              nightMode ? 'bg-[#0a1612] border-[#1e3d30]' : 'bg-[#f5f0e6] border-[#d4c4a0]/60'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`sticky top-0 px-4 py-3 border-b text-sm font-bold ${
              nightMode ? 'bg-[#0a1612] border-[#1e3d30] text-[#c9a227]' : 'bg-[#f5f0e6] border-[#d4c4a0]/60 text-[#0d4f4f]'
            }`}>
              English Translation — Sahih International
            </div>
            <div className="p-4 space-y-4">
              {pageVerses.map((verse) => (
                <div key={verse.verseKey} className="space-y-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      nightMode ? 'bg-[#1e3d30] text-[#c9a227]' : 'bg-[#0d4f4f]/10 text-[#0d4f4f]'
                    }`}
                  >
                    {verse.verseKey}
                  </span>
                  <p
                    dir="rtl"
                    className={`font-indopak text-right text-base leading-loose ${
                      nightMode ? 'text-[#a8b8a8]' : 'text-[#5a6b5a]'
                    }`}
                  >
                    {verse.arabic}
                  </p>
                  <p className={`text-sm leading-relaxed tracking-wide ${nightMode ? 'text-[#e8dcc8]' : 'text-[#1a2e1a]'}`}>
                    {verse.translation || 'Translation unavailable.'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom hint */}
      <div
        className={`absolute bottom-0 inset-x-0 text-center py-2 text-[10px] transition-opacity duration-300 ${
          showControls ? 'opacity-60' : 'opacity-0'
        } ${nightMode ? 'text-[#a8b8a8]' : 'text-[#5a6b5a]'}`}
      >
        Swipe · Arrow keys · T for translation · Juz {juzNumber} · {LINES_PER_PAGE} lines
      </div>
    </div>
  );
}
