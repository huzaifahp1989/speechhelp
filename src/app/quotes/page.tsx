'use client';

import { useState, useMemo } from 'react';
import { Quote, ISLAMIC_QUOTES, QuoteCategory } from '@/data/quotes';
import { Search, Filter, Quote as QuoteIcon, Copy, Check, Download, Share2 } from 'lucide-react';

export default function QuotesPage() {
  const [activeCategory, setActiveCategory] = useState<QuoteCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'posters'>('posters');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories: (QuoteCategory | 'All')[] = ['All', 'Wisdom', 'Motivation', 'Spiritual', 'Character', 'Family', 'Repentance'];

  const filteredQuotes = useMemo(() => {
    return ISLAMIC_QUOTES.filter(quote => {
      const matchesCategory = activeCategory === 'All' || quote.category === activeCategory;
      const matchesSearch = quote.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            quote.author.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
            Islamic <span className="text-emerald-600">Wisdom & Quotes</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Beneficial sayings from the Quran, Sunnah, and righteous scholars to inspire your heart and mind.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-20 z-10">
          
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search & View Toggle */}
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search quotes or authors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-lg text-sm transition-all outline-none"
              />
            </div>
            <div className="flex bg-slate-100 rounded-lg p-1">
               <button 
                 onClick={() => setViewMode('cards')}
                 className={`p-2 rounded-md transition-all ${viewMode === 'cards' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                 title="List View"
               >
                 <Filter className="w-4 h-4" />
               </button>
               <button 
                 onClick={() => setViewMode('posters')}
                 className={`p-2 rounded-md transition-all ${viewMode === 'posters' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                 title="Poster View"
               >
                 <QuoteIcon className="w-4 h-4" />
               </button>
            </div>
          </div>
        </div>

        {/* Quotes Grid */}
        {filteredQuotes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg">No quotes found matching your criteria.</p>
          </div>
        ) : (
          <div className={`grid gap-6 ${viewMode === 'posters' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {filteredQuotes.map((quote, index) => (
              viewMode === 'posters' ? (
                // Poster Card
                <div key={quote.id} className="group relative aspect-[4/5] md:aspect-square rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
                  {/* Background Gradient - Randomized slightly based on index */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${getGradient(index)} opacity-90 transition-opacity group-hover:opacity-100`}></div>
                  
                  {/* Pattern Overlay */}
                  <div className="absolute inset-0 opacity-10 bg-[url('/patterns/islamic-geometry.png')] bg-repeat"></div>

                  <div className="absolute inset-0 p-8 flex flex-col justify-between text-white">
                    <QuoteIcon className="w-8 h-8 opacity-50 mb-4" />
                    
                    <div className="flex-1 flex items-center justify-center text-center">
                      <p className="text-xl md:text-2xl font-serif leading-relaxed drop-shadow-md">
                        "{quote.text}"
                      </p>
                    </div>

                    <div className="mt-6 text-center">
                      <p className="font-bold text-lg tracking-wide uppercase border-t border-white/30 pt-4 inline-block">
                        {quote.author}
                      </p>
                    </div>
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                    <button 
                      onClick={() => handleCopy(`${quote.text} - ${quote.author}`, quote.id)}
                      className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/40 text-white transition-colors"
                      title="Copy"
                    >
                      {copiedId === quote.id ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                    {/* Placeholder for download functionality - could use html-to-image later */}
                    <button className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/40 text-white transition-colors" title="Save Image (Coming Soon)">
                       <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                // Simple List Card
                <div key={quote.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div className="flex-1">
                    <p className="text-lg text-slate-800 font-serif leading-relaxed mb-2">"{quote.text}"</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-emerald-700">{quote.author}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full text-xs uppercase tracking-wide">{quote.category}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleCopy(`${quote.text} - ${quote.author}`, quote.id)}
                    className={`p-2 rounded-lg transition-colors ${copiedId === quote.id ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                  >
                    {copiedId === quote.id ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getGradient(index: number) {
  const gradients = [
    'from-emerald-600 to-teal-900',
    'from-slate-700 to-slate-900',
    'from-blue-600 to-indigo-900',
    'from-amber-700 to-orange-900',
    'from-rose-700 to-pink-900',
    'from-cyan-600 to-blue-800',
    'from-violet-600 to-purple-900',
    'from-fuchsia-700 to-purple-900'
  ];
  return gradients[index % gradients.length];
}
