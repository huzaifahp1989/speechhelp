'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IslamicBook, SAMPLE_BOOKS } from '@/data/books';
import { ArrowLeft, Maximize2, ZoomIn, ZoomOut, BookOpen } from 'lucide-react';

type Props = {
  bookId: string;
};

export default function BookReaderClient({ bookId }: Props) {
  const router = useRouter();
  const [book, setBook] = useState<IslamicBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const viewerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fallback = SAMPLE_BOOKS.find((b) => b.id === bookId) || null;
    setBook(fallback);
    setLoading(false);
  }, [bookId]);

  const pdfSrc = book ? `${book.pdfUrl}#page=${page}&zoom=${zoom}` : '';

  const handleFullscreen = () => {
    if (viewerRef.current && viewerRef.current.requestFullscreen) {
      viewerRef.current.requestFullscreen();
    }
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(z + 10, 200));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(z - 10, 50));
  };

  const handleNextPage = () => {
    setPage((p) => p + 1);
  };

  const handlePrevPage = () => {
    setPage((p) => Math.max(1, p - 1));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/books')}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Library</span>
            </button>
            <div className="hidden sm:block h-6 w-px bg-slate-200" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-slate-900">
                  {book?.title || 'Loading book...'}
                </span>
              </div>
              {book && (
                <span className="text-xs text-slate-500 mt-0.5">
                  {book.author} • {book.category}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1 border border-slate-200">
              <button
                onClick={handleZoomOut}
                className="p-1 rounded hover:bg-white"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4 text-slate-600" />
              </button>
              <span className="text-xs font-semibold text-slate-600 w-10 text-center">
                {zoom}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 rounded hover:bg-white"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1 border border-slate-200">
              <button
                onClick={handlePrevPage}
                className="px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white rounded"
              >
                -
              </button>
              <span className="text-xs font-semibold text-slate-700 w-8 text-center">
                {page}
              </span>
              <button
                onClick={handleNextPage}
                className="px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white rounded"
              >
                +
              </button>
            </div>

            {book && (
              <>
                <a
                  href={book.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Open PDF</span>
                </a>
                <button
                  onClick={handleFullscreen}
                  className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Fullscreen</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 p-3 sm:p-4 lg:p-6">
        <div
          ref={viewerRef}
          className="w-full h-full bg-slate-900 rounded-xl overflow-hidden shadow-lg flex items-stretch justify-center"
        >
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400" />
                <p className="text-sm text-slate-200">Loading book...</p>
              </div>
            </div>
          ) : !book ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-100 text-sm sm:text-base">
                Book not found. Please return to the library.
              </p>
            </div>
          ) : (
            <object data={pdfSrc} type="application/pdf" className="w-full h-full">
              <div className="flex-1 flex items-center justify-center px-6 text-center">
                <p className="text-slate-100 text-sm sm:text-base">
                  Your browser does not support inline PDF viewing. You can{' '}
                  <a
                    href={book.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-300 underline"
                  >
                    open the PDF in a new tab
                  </a>
                  .
                </p>
              </div>
            </object>
          )}
        </div>
      </div>
    </div>
  );
}
