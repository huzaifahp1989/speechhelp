'use client';

import { useState } from 'react';
import { Search, Book, Heart, Users, HandCoins, Globe, Shield, Scale, Home, Moon } from 'lucide-react';

type TopicCategory = {
  id: string;
  title: string;
  icon: any;
  topics: string[];
  color: string;
};

const CATEGORIES: TopicCategory[] = [
  {
    id: 'worship',
    title: 'Worship (Ibadah)',
    icon: Moon,
    topics: ['Salah (Prayer)', 'Zakat (Charity)', 'Sawm (Fasting)', 'Hajj (Pilgrimage)', 'Dua (Supplication)', 'Taharah (Purification)'],
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'belief',
    title: 'Belief (Aqidah)',
    icon: Shield,
    topics: ['Tawheed (Oneness of God)', 'Prophethood', 'Angels', 'Divine Books', 'Day of Judgment', 'Divine Decree (Qadar)'],
    color: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'character',
    title: 'Character (Akhlaq)',
    icon: Heart,
    topics: ['Patience (Sabr)', 'Gratitude (Shukr)', 'Honesty', 'Humility', 'Forgiveness', 'Kindness to Parents'],
    color: 'bg-rose-100 text-rose-700',
  },
  {
    id: 'society',
    title: 'Social Life',
    icon: Users,
    topics: ['Family Rights', 'Brotherhood', 'Neighbors', 'Marriage', 'Justice', 'Community Service'],
    color: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'finance',
    title: 'Finance & Business',
    icon: HandCoins,
    topics: ['Halal Earnings', 'Riba (Usury)', 'Contracts', 'Debt Management', 'Inheritance', 'Business Ethics'],
    color: 'bg-violet-100 text-violet-700',
  },
  {
    id: 'contemporary',
    title: 'Contemporary Issues',
    icon: Globe,
    topics: ['Mental Health', 'Technology & Ethics', 'Environment', 'Gender Relations', 'Media Literacy', 'Integration'],
    color: 'bg-cyan-100 text-cyan-700',
  },
];

export default function TopicsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = CATEGORIES.map(cat => ({
    ...cat,
    topics: cat.topics.filter(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  })).filter(cat => cat.topics.length > 0 || cat.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Explore Islamic Topics
        </h1>
        <p className="text-lg text-slate-600">
          A comprehensive guide to key subjects in Islam, categorized for easy study and reference.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-xl mx-auto relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm transition-all text-lg"
          placeholder="Search for a topic..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredCategories.map((category) => (
          <div key={category.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center gap-4 mb-6">
              <div className={`p-3 rounded-xl ${category.color}`}>
                <category.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{category.title}</h3>
            </div>
            
            <div className="space-y-3">
              {category.topics.map((topic, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer group/item transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover/item:bg-emerald-500 transition-colors" />
                  <span className="text-slate-700 font-medium group-hover/item:text-slate-900">{topic}</span>
                  <Book className="w-4 h-4 text-slate-300 ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500 text-lg">No topics found matching your search.</p>
        </div>
      )}
    </div>
  );
}
