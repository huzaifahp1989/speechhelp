'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bookmark, Search, Book, ChevronRight } from 'lucide-react';

type Edition = {
  name: string;
  collection: {
    name: string;
    language: string;
    direction: string;
    link: string;
    linkmin: string;
  }[];
};

type EditionsResponse = Record<string, Edition>;

const FEATURED_COLLECTIONS = [
  { id: 'bukhari', name: 'Sahih al-Bukhari', arabic: 'صحيح البخاري', description: 'The most authentic collection of Hadith.' },
  { id: 'muslim', name: 'Sahih Muslim', arabic: 'صحيح مسلم', description: 'Considered the second most authentic collection.' },
  { id: 'abudawud', name: 'Sunan Abu Dawud', arabic: 'سنن أبي داود', description: 'Focuses on legal rulings (Fiqh).' },
  { id: 'tirmidhi', name: 'Jami` at-Tirmidhi', arabic: 'جامع الترمذي', description: 'Known for grading Hadith reliability.' },
  { id: 'nasai', name: 'Sunan an-Nasa\'i', arabic: 'سنن النسائي', description: 'Contains fewer weak Hadiths.' },
  { id: 'ibnmajah', name: 'Sunan Ibn Majah', arabic: 'سنن ابن ماجه', description: 'The last of the six major Hadith collections.' },
  { id: 'riyadussalihin', name: 'Riyad as-Salihin', arabic: 'رياض الصالحين', description: 'Selections from the words of the Prophet (SAW) by Imam Nawawi.' },
  { id: 'nawawi', name: '40 Hadith Nawawi', arabic: 'الأربعون النووية', description: 'A concise collection of fundamental traditions.' },
  { id: 'qudsi', name: '40 Hadith Qudsi', arabic: 'الحديث القدسي', description: 'Direct words of Allah, narrated by the Prophet (SAW).' },
];

export default function HadithPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCollections = FEATURED_COLLECTIONS.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="w-full bg-gradient-to-r from-amber-600 to-orange-700 text-white relative overflow-hidden shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
            <Bookmark className="w-96 h-96" />
          </div>
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 md:mb-6 drop-shadow-sm">Hadith Collections</h1>
            <p className="text-amber-50 text-base sm:text-lg md:text-xl font-medium max-w-2xl mb-6 md:mb-10 leading-relaxed">
              Explore the sayings and actions of Prophet Muhammad (SAW) from the most authentic sources.
            </p>
            
            <div className="relative max-w-xl">
              <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none">
                <Search className="h-5 sm:h-6 w-5 sm:w-6 text-amber-700" />
              </div>
              <input
                type="text"
                className="block w-full pl-12 sm:pl-14 pr-4 sm:pr-5 py-3 sm:py-5 rounded-2xl border-0 text-slate-900 placeholder-slate-500 focus:ring-4 focus:ring-amber-300 shadow-xl text-base sm:text-lg font-medium"
                placeholder="Search collections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Collections Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredCollections.map((collection) => (
            <Link 
              key={collection.id} 
              href={`/hadith/${collection.id}`}
              className="group bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 hover:border-amber-500 hover:shadow-lg transition-all duration-200 flex flex-col justify-between relative overflow-hidden h-full active:scale-95 sm:active:scale-100"
            >
              <div className="absolute right-0 top-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div>
                <div className="flex justify-between items-start mb-3 sm:mb-4 relative z-10">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors flex-shrink-0">
                    <Book className="w-5 sm:w-6 h-5 sm:h-6" />
                  </div>
                  <span className="font-arabic text-lg sm:text-2xl text-slate-800 group-hover:text-amber-700 transition-colors">{collection.arabic}</span>
                </div>
                
                <h3 className="font-bold text-slate-900 text-base sm:text-lg md:text-xl mb-1 sm:mb-2 group-hover:text-amber-700 transition-colors relative z-10">
                  {collection.name}
                </h3>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed relative z-10">
                  {collection.description}
                </p>
              </div>

              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-50 flex items-center text-amber-600 font-semibold text-xs sm:text-sm group-hover:text-amber-700 relative z-10">
                Browse Collection <ChevronRight className="w-3 sm:w-4 h-3 sm:h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
