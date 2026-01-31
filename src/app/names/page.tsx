'use client';

import { useState, useEffect } from 'react';
import { Star, Search, Info } from 'lucide-react';

interface NameOfAllah {
  name: string;
  transliteration: string;
  number: number;
  en: {
    meaning: string;
  };
}

export default function NamesOfAllah() {
  const [names, setNames] = useState<NameOfAllah[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchNames = async () => {
      try {
        const res = await fetch('https://api.aladhan.com/v1/asmaAlHusna');
        if (!res.ok) {
          throw new Error('Failed to fetch data');
        }
        const data = await res.json();
        setNames(data.data);
      } catch (err) {
        setError('Failed to load the Names of Allah. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNames();
  }, []);

  const filteredNames = names.filter((name) =>
    name.transliteration.toLowerCase().includes(searchQuery.toLowerCase()) ||
    name.en.meaning.toLowerCase().includes(searchQuery.toLowerCase()) ||
    name.name.includes(searchQuery)
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
        <p className="text-slate-500 font-medium">Loading Names of Allah...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="text-red-500 text-xl font-bold mb-2">Error</div>
        <p className="text-slate-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <div className="bg-emerald-600 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4 font-serif">Asma-ul-Husna</h1>
          <p className="text-emerald-100 text-lg max-w-2xl mx-auto">
            The 99 Beautiful Names of Allah. "And to Allah belong the best names, so invoke Him by them." (7:180)
          </p>
          
          {/* Search */}
          <div className="max-w-md mx-auto mt-8 relative">
            <input
              type="text"
              placeholder="Search by name or meaning..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-full bg-emerald-700/50 border border-emerald-500 text-white placeholder-emerald-200 focus:outline-none focus:ring-2 focus:ring-white focus:bg-emerald-700 transition-colors"
            />
            <Search className="w-5 h-5 text-emerald-300 absolute left-4 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNames.map((name) => (
            <div 
              key={name.number}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-1 rounded-bl-xl">
                #{name.number}
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 text-5xl text-emerald-800 font-arabic leading-relaxed py-2">
                  {name.name}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  {name.transliteration}
                </h3>
                <p className="text-slate-500 italic mb-4">
                  {name.en.meaning}
                </p>
                
                <div className="w-12 h-1 bg-emerald-100 rounded-full mb-4 group-hover:bg-emerald-200 transition-colors"></div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredNames.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 text-lg">No names found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
