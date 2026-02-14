
'use client';

import { Suspense, useState, useEffect } from 'react';
import { Brain, Calendar, Layout, BookOpen, Plus, Play, Trash2, Clock } from 'lucide-react';
import InteractivePlanner from '@/components/hifz/InteractivePlanner';
import AiPromptGenerator from '@/components/hifz/AiPromptGenerator';
import HifzRangeSelector from '@/components/hifz/HifzRangeSelector';
import HifzPlayer from '@/components/hifz/HifzPlayer';
import clsx from 'clsx';
import { useSearchParams } from 'next/navigation';

type HifzRange = {
    id: string;
    juz: number;
    surah: { id: number; name_simple: string };
    startAyah: number;
    endAyah: number;
    createdAt: number;
};

function HifzPlannerContent() {
  const searchParams = useSearchParams();
  const initialJuz = searchParams.get('juz');
  
  const [activeTab, setActiveTab] = useState<'ranges' | 'daily' | 'ai'>('ranges');
  const [ranges, setRanges] = useState<HifzRange[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [playingRange, setPlayingRange] = useState<HifzRange | null>(null);

  // Load ranges
  useEffect(() => {
    const saved = localStorage.getItem('hifz_ranges');
    if (saved) {
      try {
        setRanges(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
    
    if (initialJuz) {
        setActiveTab('ranges');
        setIsAdding(true);
    }
  }, [initialJuz]);

  const addRange = (rangeData: Omit<HifzRange, 'id' | 'createdAt'>) => {
    const newRange: HifzRange = {
        ...rangeData,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: Date.now()
    };
    const updated = [newRange, ...ranges];
    setRanges(updated);
    localStorage.setItem('hifz_ranges', JSON.stringify(updated));
    setIsAdding(false);
  };

  const deleteRange = (id: string) => {
    if (confirm("Delete this bookmark?")) {
        const updated = ranges.filter(r => r.id !== id);
        setRanges(updated);
        localStorage.setItem('hifz_ranges', JSON.stringify(updated));
    }
  };

  if (playingRange) {
      return <HifzPlayer range={playingRange} onBack={() => setPlayingRange(null)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        {!isAdding && (
            <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center p-3 bg-emerald-100 rounded-full mb-4">
                <BookOpen className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                Hifz Companion
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Your advanced memorization toolkit.
            </p>
            </div>
        )}

        {/* Tab Navigation */}
        {!isAdding && (
            <div className="flex justify-center overflow-x-auto pb-2">
                <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm inline-flex">
                    <button
                        onClick={() => setActiveTab('ranges')}
                        className={clsx(
                            "flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                            activeTab === 'ranges' 
                                ? "bg-emerald-600 text-white shadow-md" 
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                    >
                        <BookOpen className="w-4 h-4" />
                        My Ranges
                    </button>
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={clsx(
                            "flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                            activeTab === 'daily' 
                                ? "bg-blue-600 text-white shadow-md" 
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                    >
                        <Layout className="w-4 h-4" />
                        Daily Plan
                    </button>
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={clsx(
                            "flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                            activeTab === 'ai' 
                                ? "bg-purple-600 text-white shadow-md" 
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                    >
                        <Brain className="w-4 h-4" />
                        AI Generator
                    </button>
                </div>
            </div>
        )}

        {/* Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'daily' && <InteractivePlanner />}
            {activeTab === 'ai' && <AiPromptGenerator />}
            
            {activeTab === 'ranges' && (
                <div className="space-y-6">
                    {isAdding ? (
                        <div className="max-w-2xl mx-auto">
                            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Add New Hifz Range</h2>
                            <HifzRangeSelector 
                                initialJuz={initialJuz ? parseInt(initialJuz) : undefined}
                                onRangeAdd={addRange}
                                onCancel={() => setIsAdding(false)}
                            />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <button 
                                onClick={() => setIsAdding(true)}
                                className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center gap-2 text-slate-500 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all group"
                            >
                                <div className="bg-slate-100 group-hover:bg-emerald-100 p-2 rounded-full">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <span className="font-bold">Add New Range</span>
                            </button>

                            {ranges.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>No ranges saved yet. Start by adding one!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {ranges.map(range => (
                                        <div key={range.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                                                    Juz {range.juz}
                                                </div>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteRange(range.id);
                                                    }}
                                                    className="text-slate-300 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            
                                            <h3 className="text-xl font-bold text-slate-800 mb-1">
                                                {range.surah.name_simple}
                                            </h3>
                                            <p className="text-slate-500 text-sm mb-4">
                                                Ayah {range.startAyah} - {range.endAyah}
                                            </p>
                                            
                                            <div className="flex items-center justify-between mt-auto">
                                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(range.createdAt).toLocaleDateString()}
                                                </div>
                                                <button 
                                                    onClick={() => setPlayingRange(range)}
                                                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm"
                                                >
                                                    <Play className="w-4 h-4" />
                                                    Practice
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default function HifzPlannerPage() {
    return (
        <Suspense fallback={<div>Loading planner...</div>}>
            <HifzPlannerContent />
        </Suspense>
    );
}
