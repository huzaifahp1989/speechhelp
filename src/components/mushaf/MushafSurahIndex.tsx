'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchMushafSurahIndex, type MushafSurahEntry } from '@/lib/mushafSurahIndex';

type Props = {
  currentPage: number;
  onSelectPage: (page: number) => void;
  nightMode?: boolean;
};

export default function MushafSurahIndex({ currentPage, onSelectPage, nightMode = false }: Props) {
  const [surahs, setSurahs] = useState<MushafSurahEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchMushafSurahIndex()
      .then(setSurahs)
      .catch(() => setSurahs([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = surahs.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name_simple.toLowerCase().includes(q) ||
      s.name_arabic.includes(query.trim()) ||
      String(s.id) === q
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className={`w-8 h-8 animate-spin ${nightMode ? 'text-[#c9a227]' : 'text-[#0d4f4f]'}`} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search surah…"
        className={`w-full mb-3 px-3 py-2.5 rounded-lg border text-sm ${
          nightMode
            ? 'bg-[#1e3d30] border-[#2d5a48] text-[#e8dcc8] placeholder:text-[#a8b8a8]'
            : 'bg-white border-[#d4c4a0] text-[#1a2e1a]'
        }`}
      />
      <ul className="overflow-y-auto max-h-[55dvh] divide-y divide-[#d4c4a0]/30">
        {filtered.map((s, idx) => {
          const next = filtered[idx + 1];
          const isOnPage =
            currentPage >= s.startPage &&
            (!next || currentPage < next.startPage);

          return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelectPage(s.startPage)}
              className={`w-full flex items-center gap-3 px-2 py-3 text-left transition-colors touch-manipulation ${
                isOnPage
                  ? nightMode
                    ? 'bg-[#1e3d30]'
                    : 'bg-[#0d4f4f]/8'
                  : nightMode
                    ? 'hover:bg-[#1e3d30]/60'
                    : 'hover:bg-[#faf6ef]'
              }`}
            >
              <span
                className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${
                  nightMode ? 'bg-[#2d5a48] text-[#c9a227]' : 'bg-[#0d4f4f]/10 text-[#0d4f4f]'
                }`}
              >
                {s.id}
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block text-sm font-semibold truncate ${nightMode ? 'text-[#e8dcc8]' : 'text-[#1a2e1a]'}`}>
                  {s.name_simple}
                </span>
                <span className={`text-xs ${nightMode ? 'text-[#a8b8a8]' : 'text-[#5a6b5a]'}`}>
                  Page {s.startPage} · {s.verses_count} ayahs
                </span>
              </span>
              <span className={`font-arabic text-base shrink-0 ${nightMode ? 'text-[#c9a227]' : 'text-[#0d4f4f]'}`}>
                {s.name_arabic}
              </span>
            </button>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
