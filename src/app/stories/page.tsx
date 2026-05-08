
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { STORIES, Story } from '@/data/stories';
import { BookOpen, Mic, Play, Clock, Filter, Search } from 'lucide-react';

export default function StoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);

  const filteredStories = STORIES.filter((story) => {
    const matchesSearch = story.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          story.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? story.category === selectedCategory : true;
    const matchesDifficulty = selectedDifficulty ? story.difficulty === selectedDifficulty : true;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const categories = Array.from(new Set(STORIES.map(s => s.category)));
  const difficulties = Array.from(new Set(STORIES.map(s => s.difficulty)));

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Islamic Stories for Kids</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Discover authentic stories from the Quran and Hadith. Read, listen, and even record your own voice!
          </p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-12">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            
            {/* Search */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search stories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
               <select 
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
               >
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
               </select>

               <select 
                  value={selectedDifficulty || ''}
                  onChange={(e) => setSelectedDifficulty(e.target.value || null)}
                  className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
               >
                  <option value="">All Levels</option>
                  {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
               </select>
            </div>
          </div>
        </div>

        {/* Stories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredStories.map((story) => (
            <Link key={story.id} href={`/stories/${story.id}`} className="group">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                
                {/* Card Header (Color coded by category) */}
                <div className={`h-24 ${
                    story.category === 'Prophets' ? 'bg-emerald-100' :
                    story.category === 'Companions' ? 'bg-blue-100' :
                    story.category === 'Animals' ? 'bg-amber-100' : 'bg-purple-100'
                } relative overflow-hidden flex items-center justify-center`}>
                    <BookOpen className={`w-12 h-12 ${
                        story.category === 'Prophets' ? 'text-emerald-500' :
                        story.category === 'Companions' ? 'text-blue-500' :
                        story.category === 'Animals' ? 'text-amber-500' : 'text-purple-500'
                    } opacity-50`} />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-700 shadow-sm">
                        {story.category}
                    </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
                    {story.title}
                  </h3>
                  <p className="text-slate-600 text-sm mb-4 line-clamp-3 flex-1">
                    {story.summary}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500 mt-auto pt-4 border-t border-slate-100">
                     <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" /> {story.duration}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md ${
                            story.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                            story.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                            {story.difficulty}
                        </span>
                     </div>
                     <div className="flex items-center gap-1 text-emerald-600">
                        <span>Read</span>
                        <Play className="w-4 h-4 fill-current" />
                     </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredStories.length === 0 && (
            <div className="text-center py-20">
                <p className="text-slate-500 text-lg">No stories found matching your criteria.</p>
                <button 
                    onClick={() => {setSearchQuery(''); setSelectedCategory(null); setSelectedDifficulty(null);}}
                    className="mt-4 text-emerald-600 font-bold hover:underline"
                >
                    Clear Filters
                </button>
            </div>
        )}

      </div>
    </div>
  );
}
