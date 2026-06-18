import Link from 'next/link';
import { BookOpen, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0d4f4f] text-[#e8dcc8] mt-auto">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-6 h-6 text-[#c9a227]" />
              <h3 className="text-xl font-bold text-white">SpeechHelp</h3>
            </div>
            <p className="text-[#a8c4b8] text-sm max-w-md leading-relaxed">
              Your companion for reading the Qur&apos;an in 13-line mushaf format,
              memorization, dhikr, and Islamic learning — all in one place.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[#c9a227] tracking-wider uppercase mb-4">Qur&apos;an</h3>
            <ul className="space-y-3">
              <li><Link href="/quran/mushaf" className="text-sm text-[#a8c4b8] hover:text-white transition-colors">13-Line Mushaf</Link></li>
              <li><Link href="/quran" className="text-sm text-[#a8c4b8] hover:text-white transition-colors">Surah Index</Link></li>
              <li><Link href="/quran/juz" className="text-sm text-[#a8c4b8] hover:text-white transition-colors">Browse by Juz</Link></li>
              <li><Link href="/tafseer" className="text-sm text-[#a8c4b8] hover:text-white transition-colors">Tafseer</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[#c9a227] tracking-wider uppercase mb-4">Tools</h3>
            <ul className="space-y-3">
              <li><Link href="/hifz-planner" className="text-sm text-[#a8c4b8] hover:text-white transition-colors">Hifz Planner</Link></li>
              <li><Link href="/tasbeeh" className="text-sm text-[#a8c4b8] hover:text-white transition-colors">Tasbeeh</Link></li>
              <li><Link href="/tracker" className="text-sm text-[#a8c4b8] hover:text-white transition-colors">Tracker</Link></li>
              <li><Link href="/voice-search" className="text-sm text-[#a8c4b8] hover:text-white transition-colors">Voice Search</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-8 border-t border-[#1e3d30] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#a8c4b8]">&copy; {new Date().getFullYear()} SpeechHelp. All rights reserved.</p>
          <p className="text-xs text-[#a8c4b8] flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-[#c9a227]" /> for the Ummah
          </p>
        </div>
      </div>
    </footer>
  );
}
