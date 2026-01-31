import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-bold text-slate-900">Lecture Hub</h3>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">Islam Media Central</p>
            <p className="text-slate-600 text-sm max-w-md">
              A comprehensive tool for preparing Khutbahs, lectures, and Islamic lessons. 
              Search Qur’an, Hadith, and Seerah with ease.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase">Resources</h3>
            <ul className="mt-4 space-y-4">
              <li><Link href="/quran" className="text-base text-slate-500 hover:text-slate-900">Qur’an</Link></li>
              <li><Link href="/hadith" className="text-base text-slate-500 hover:text-slate-900">Hadith</Link></li>
              <li><Link href="/seerah" className="text-base text-slate-500 hover:text-slate-900">Seerah</Link></li>
              <li><Link href="/names" className="text-base text-slate-500 hover:text-slate-900">99 Names</Link></li>
              <li><Link href="/topics" className="text-base text-slate-500 hover:text-slate-900">Topics</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase">Tools</h3>
            <ul className="mt-4 space-y-4">
              <li><Link href="/lecture-builder" className="text-base text-slate-500 hover:text-slate-900">Lecture Builder</Link></li>
              <li><Link href="/dictionary" className="text-base text-slate-500 hover:text-slate-900">Dictionary</Link></li>
              <li><Link href="/notes" className="text-base text-slate-500 hover:text-slate-900">Notes</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-200 pt-8 flex items-center justify-between">
          <p className="text-base text-slate-400">&copy; {new Date().getFullYear()} Islam Media Central. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
