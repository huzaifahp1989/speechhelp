'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Bookmark as BookmarkIcon, Edit3, Trash2, Save, X } from 'lucide-react';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useJuzProgress } from '@/hooks/useJuzProgress';

export default function JuzIndexPage() {
  const juzs = Array.from({ length: 30 }, (_, i) => i + 1);
  const { bookmarks, toggleBookmark } = useBookmarks();
  const { getJuzProgress, updateJuzProgress } = useJuzProgress();
  
  const [editingJuz, setEditingJuz] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ toMemorize: '', weakParts: '', notes: '' });

  const handleEditOpen = (juzId: number) => {
    const data = getJuzProgress(juzId);
    setEditForm(data);
    setEditingJuz(juzId);
  };

  const handleSave = (juzId: number) => {
    updateJuzProgress(juzId, editForm);
    setEditingJuz(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Juz Index</h1>
          <p className="text-lg text-slate-600">Select a Juz to read and listen.</p>
        </div>

        {/* Global Bookmarks Section */}
        <div className="mb-16">
            <div className="flex items-center gap-3 mb-6">
                <BookmarkIcon className="w-6 h-6 text-emerald-600" />
                <h2 className="text-2xl font-bold text-slate-800">Your Bookmarks</h2>
            </div>
            
            {bookmarks.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 border-dashed">
                    <p className="text-slate-500">No bookmarks saved yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bookmarks.sort((a, b) => b.timestamp - a.timestamp).map((b) => (
                        <div key={b.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-start justify-between group">
                             <Link
                                href={b.type === 'surah' ? `/quran/${b.refId}#verse-${b.verseKey}` : `/quran/juz/${b.refId}#verse-${b.verseKey}`}
                                className="flex-1"
                             >
                                <div className="flex items-center gap-2 mb-2">
                                   <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${b.type === 'surah' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                      {b.type === 'surah' ? 'Surah' : 'Juz'} {b.refId}
                                   </span>
                                   <span className="text-xs text-slate-400">
                                      {new Date(b.timestamp).toLocaleDateString()}
                                   </span>
                                </div>
                                <div className="font-bold text-slate-800">
                                   Ayah {b.verseKey}
                                </div>
                             </Link>
                             <button
                                onClick={() => toggleBookmark(b.type, b.refId, b.verseKey)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                title="Remove Bookmark"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {juzs.map((juz) => {
            const progress = getJuzProgress(juz);
            const isEditing = editingJuz === juz;
            const hasNotes = progress.toMemorize || progress.weakParts || progress.notes;

            return (
            <div key={juz} className="flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                <Link
                  href={`/quran/juz/${juz}`}
                  className="flex items-center p-6 border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="font-bold text-lg">{juz}</span>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">Juz {juz}</h3>
                </Link>

                {/* Notes / Progress Section */}
                <div className="p-6 bg-slate-50/50 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">My Notes</h4>
                        {!isEditing && (
                            <button 
                                onClick={() => handleEditOpen(juz)}
                                className="text-emerald-600 hover:text-emerald-700 text-xs font-bold flex items-center gap-1"
                            >
                                <Edit3 className="w-3 h-3" /> Edit
                            </button>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">To Memorize</label>
                                <input 
                                    type="text" 
                                    value={editForm.toMemorize}
                                    onChange={(e) => setEditForm({...editForm, toMemorize: e.target.value})}
                                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="e.g. Pages 10-12"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Weak Parts</label>
                                <input 
                                    type="text" 
                                    value={editForm.weakParts}
                                    onChange={(e) => setEditForm({...editForm, weakParts: e.target.value})}
                                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="e.g. Verses 20-25"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">General Notes</label>
                                <textarea 
                                    value={editForm.notes}
                                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                    rows={2}
                                    placeholder="Add notes..."
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <button 
                                    onClick={() => handleSave(juz)}
                                    className="flex-1 bg-emerald-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-1"
                                >
                                    <Save className="w-3 h-3" /> Save
                                </button>
                                <button 
                                    onClick={() => setEditingJuz(null)}
                                    className="px-3 bg-white border border-slate-200 text-slate-600 text-xs font-bold py-2 rounded-lg hover:bg-slate-50"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 text-sm">
                            {hasNotes ? (
                                <>
                                    {progress.toMemorize && (
                                        <div className="flex gap-2">
                                            <span className="w-2 h-2 mt-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
                                            <div>
                                                <span className="text-slate-500 text-xs block">To Memorize</span>
                                                <span className="text-slate-800 font-medium">{progress.toMemorize}</span>
                                            </div>
                                        </div>
                                    )}
                                    {progress.weakParts && (
                                        <div className="flex gap-2">
                                            <span className="w-2 h-2 mt-1.5 rounded-full bg-red-400 flex-shrink-0"></span>
                                            <div>
                                                <span className="text-slate-500 text-xs block">Weak Parts</span>
                                                <span className="text-slate-800 font-medium">{progress.weakParts}</span>
                                            </div>
                                        </div>
                                    )}
                                    {progress.notes && (
                                        <div className="flex gap-2">
                                            <span className="w-2 h-2 mt-1.5 rounded-full bg-slate-300 flex-shrink-0"></span>
                                            <div>
                                                <span className="text-slate-500 text-xs block">Notes</span>
                                                <span className="text-slate-700">{progress.notes}</span>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-slate-400 italic text-xs py-4 text-center">No notes added yet.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
