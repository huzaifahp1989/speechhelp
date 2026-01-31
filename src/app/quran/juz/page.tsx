import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export default function JuzIndexPage() {
  const juzs = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Juz Index</h1>
          <p className="text-lg text-slate-600">Select a Juz to read and listen.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {juzs.map((juz) => (
            <Link
              key={juz}
              href={`/quran/juz/${juz}`}
              className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-lg transition-all group text-center"
            >
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <span className="font-bold text-2xl">{juz}</span>
              </div>
              <h3 className="font-bold text-slate-900 group-hover:text-emerald-700">Juz {juz}</h3>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
