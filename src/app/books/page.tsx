'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Search, Filter } from 'lucide-react';
import { SAMPLE_BOOKS, BookCategory, IslamicBook } from '@/data/books';

const CATEGORIES: (BookCategory | 'All')[] = [
  'All',
  'Aqeedah',
  'Fiqh',
  'Seerah',
  'Tafsir',
  'Hadith',
  'Kids',
  'General',
];

export default function IslamicBooksLibraryPage() {
  const [books] = useState<IslamicBook[]>(SAMPLE_BOOKS);
  const [activeCategory, setActiveCategory] = useState<(BookCategory | 'All')>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBooks = useMemo(() => {
    return SAMPLE_BOOKS.filter((book) => {
      const matchesCategory = activeCategory === 'All' || book.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.description.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [books, activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2">
              Islamic Books Library
            </h1>
            <p className="text-slate-600 max-w-2xl text-sm sm:text-base">
              Browse authentic Islamic books on Aqeedah, Fiqh, Seerah, Tafsir, Hadith, and more.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1 shadow-sm">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>Read directly inside the app</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex gap-3 items-center">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search books..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="hidden sm:flex items-center gap-1 text-slate-400 text-xs sm:text-sm">
                <Filter className="w-4 h-4" />
                <span>Filter</span>
              </div>
            </div>
        </div>
        </div>

        {filteredBooks.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-200">
            <p className="text-slate-500 text-base sm:text-lg">
              No books found. Try a different search or category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBooks.map((book) => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all flex flex-col"
              >
                <div className="relative w-full pt-[140%] bg-slate-100 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100">
                    <img
                      src={book.coverImageUrl}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-600 text-white shadow-sm">
                      {book.category}
                    </span>
                  </div>
                </div>
                <div className="p-4 sm:p-5 flex flex-col flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1 line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mb-2">
                    {book.author}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 mb-3 flex-1">
                    {book.description}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
                    <span className="text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
                      Read book
                    </span>
                    <BookOpen className="w-4 h-4 text-emerald-500 group-hover:text-emerald-700" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
