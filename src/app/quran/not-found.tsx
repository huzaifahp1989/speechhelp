import Link from 'next/link';
import { BookOpen, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Surah or Juz Not Found</h2>
        <p className="text-slate-600 mb-8">
          The Surah or Juz you are looking for does not exist or could not be loaded.
        </p>
        <div className="flex gap-4 justify-center">
          <Link 
            href="/quran"
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            Browse Quran
          </Link>
          <Link 
            href="/"
            className="px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <Home className="w-5 h-5" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
