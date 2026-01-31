'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, Save, Download, FileText, Mic, BookOpen, Clock, Users, Bookmark, GraduationCap } from 'lucide-react';

type Section = {
  id: string;
  title: string;
  content: string;
  type: 'intro' | 'point' | 'story' | 'practical' | 'dua';
  evidences: string[];
};

export default function LectureBuilder() {
  const [title, setTitle] = useState('');
  const [audience, setAudience] = useState('Adults');
  const [duration, setDuration] = useState('30');
  
  const [sections, setSections] = useState<Section[]>([
    { id: '1', title: 'Introduction', content: '', type: 'intro', evidences: [] },
    { id: '2', title: 'Main Point 1', content: '', type: 'point', evidences: [] },
    { id: '3', title: 'Closing Dua', content: '', type: 'dua', evidences: [] },
  ]);

  const [activeModal, setActiveModal] = useState<'verse' | 'hadith' | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      if (activeModal === 'verse') {
        const res = await fetch(`https://api.quran.com/api/v4/search?q=${encodeURIComponent(searchQuery)}&size=10&language=en`);
        const data = await res.json();
        setSearchResults(data.search?.results || []);
      } else if (activeModal === 'hadith') {
        // Mock search or redirect instructions since we don't have a full search API
        // For now, we'll simulate some results or just provide a manual entry form
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const addContentToSection = (text: string, ref: string) => {
    if (!activeSectionId) return;
    
    const newSections = sections.map(s => {
      if (s.id === activeSectionId) {
        return {
          ...s,
          content: s.content + `\n\n[${ref}]\n"${text}"\n`
        };
      }
      return s;
    });
    
    setSections(newSections);
    setActiveModal(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const openModal = (type: 'verse' | 'hadith', sectionId: string) => {
    setActiveModal(type);
    setActiveSectionId(sectionId);
    setSearchQuery('');
    setSearchResults([]);
  };

  const addSection = (type: Section['type']) => {
    const newSection: Section = {
      id: Math.random().toString(36).substr(2, 9),
      title: type === 'point' ? `Main Point ${sections.filter(s => s.type === 'point').length + 1}` : 
             type === 'story' ? 'Story / Analogy' : 
             type === 'practical' ? 'Action Items' : 'New Section',
      content: '',
      type,
      evidences: [],
    };
    // Insert before the last item (Dua) usually, but for now just push
    const duaIndex = sections.findIndex(s => s.type === 'dua');
    if (duaIndex !== -1) {
       const newSections = [...sections];
       newSections.splice(duaIndex, 0, newSection);
       setSections(newSections);
    } else {
       setSections([...sections, newSection]);
    }
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 relative">
      
      {/* Modal */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">
                {activeModal === 'verse' ? 'Add Quran Verse' : 'Add Hadith Reference'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <Trash2 className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {activeModal === 'verse' ? (
                <div className="space-y-6">
                  <form onSubmit={handleSearch} className="flex gap-2">
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Quran (e.g. 'patience', '2:255')..."
                      className="flex-1 px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 font-medium"
                      autoFocus
                    />
                    <button type="submit" disabled={isSearching} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50">
                      {isSearching ? '...' : 'Search'}
                    </button>
                  </form>

                  <div className="space-y-3">
                    {searchResults.map((result: any) => (
                      <button 
                        key={result.verse_key}
                        onClick={() => addContentToSection(result.text, `Quran ${result.verse_key}`)}
                        className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-slate-700 group-hover:text-blue-700">Surah {result.verse_key}</span>
                        </div>
                        <p className="text-slate-600 line-clamp-2">{result.text}</p>
                      </button>
                    ))}
                    {searchResults.length === 0 && !isSearching && searchQuery && (
                      <p className="text-center text-slate-500 py-4">No results found.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                   <div className="bg-amber-50 p-4 rounded-xl text-amber-800 text-sm mb-4">
                      hadith search API is currently limited. Please paste your hadith manually below.
                   </div>
                   <textarea
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Paste the Hadith text here..."
                      className="w-full h-32 p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-50 focus:border-amber-500 font-medium"
                      autoFocus
                   />
                   <div className="flex justify-end">
                      <button 
                        onClick={() => addContentToSection(searchQuery, 'Hadith Reference')}
                        disabled={!searchQuery.trim()}
                        className="px-6 py-2 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 disabled:opacity-50"
                      >
                        Add to Lecture
                      </button>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center border-b border-slate-200 pb-6">
        <div>
           <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Lecture Builder</h1>
           <p className="text-slate-700 font-medium mt-1">Draft your Khutbah or Lesson structure</p>
        </div>
        <div className="flex gap-3">
           <button className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-slate-800 hover:bg-slate-50 hover:border-slate-300 font-semibold transition-all">
              <Save className="w-5 h-5" /> Save Draft
           </button>
           <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold shadow-md transition-all">
              <Download className="w-5 h-5" /> Export Script
           </button>
        </div>
      </div>

      {/* Meta Data */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="md:col-span-3">
            <label className="block text-base font-bold text-slate-900 mb-2">Lecture Title</label>
            <input 
               type="text" 
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 text-lg font-medium placeholder-slate-400"
               placeholder="e.g. The Importance of Patience"
            />
         </div>
         <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
               <Users className="w-4 h-4 text-blue-600" /> Target Audience
            </label>
            <select 
               value={audience}
               onChange={(e) => setAudience(e.target.value)}
               className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 font-medium"
            >
               <option value="Adults">Adults (General)</option>
               <option value="Youth">Youth / Teens</option>
               <option value="Kids">Kids</option>
               <option value="New Muslims">New Muslims</option>
            </select>
         </div>
         <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
               <Clock className="w-4 h-4 text-blue-600" /> Duration
            </label>
            <select 
               value={duration}
               onChange={(e) => setDuration(e.target.value)}
               className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 font-medium"
            >
               <option value="15">15 Minutes</option>
               <option value="30">30 Minutes</option>
               <option value="45">45 Minutes</option>
               <option value="60">60 Minutes</option>
            </select>
         </div>
         <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
               <GraduationCap className="w-4 h-4 text-blue-600" /> Tone
            </label>
            <select 
               className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 font-medium"
            >
               <option value="Inspirational">Inspirational</option>
               <option value="Educational">Educational</option>
               <option value="Reminder">Reminder (Soft)</option>
               <option value="Serious">Serious / Warning</option>
            </select>
         </div>
      </div>

      {/* Builder Canvas */}
      <div className="space-y-6">
         {sections.map((section, index) => (
            <div key={section.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-shadow">
               <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                     <GripVertical className="text-slate-400 cursor-move" />
                     <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                        section.type === 'intro' ? 'bg-blue-100 text-blue-700' :
                        section.type === 'dua' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-200 text-slate-700'
                     }`}>
                        {section.type}
                     </span>
                     <input 
                        type="text" 
                        value={section.title}
                        onChange={(e) => {
                           const newSections = [...sections];
                           newSections[index].title = e.target.value;
                           setSections(newSections);
                        }}
                        className="bg-transparent font-bold text-slate-900 focus:outline-none focus:underline"
                     />
                  </div>
                  <button onClick={() => removeSection(section.id)} className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors">
                     <Trash2 className="w-5 h-5" />
                  </button>
               </div>
               <div className="p-6">
                  <textarea 
                     className="w-full h-32 p-4 bg-slate-50 rounded-xl border-0 focus:ring-2 focus:ring-blue-200 text-slate-800 placeholder-slate-400 resize-none font-medium"
                     placeholder="Write your points here... Drag & Drop verses or hadith from the sidebar."
                     value={section.content}
                     onChange={(e) => {
                        const newSections = [...sections];
                        newSections[index].content = e.target.value;
                        setSections(newSections);
                     }}
                  />
                  <div className="mt-4 flex gap-3">
                     <button 
                        onClick={() => openModal('verse', section.id)}
                        className="text-xs flex items-center gap-1.5 text-blue-600 font-bold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                     >
                        <BookOpen className="w-3.5 h-3.5" /> Add Verse
                     </button>
                     <button 
                        onClick={() => openModal('hadith', section.id)}
                        className="text-xs flex items-center gap-1.5 text-amber-600 font-bold bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                     >
                        <Bookmark className="w-3.5 h-3.5" /> Add Hadith
                     </button>
                  </div>
               </div>
            </div>
         ))}

         {/* Add Section Buttons */}
         <div className="flex gap-4 justify-center py-8 border-t-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <button onClick={() => addSection('point')} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-700 font-bold hover:border-blue-300 hover:text-blue-600 transition-all">
               <Plus className="w-5 h-5" /> Add Point
            </button>
            <button onClick={() => addSection('story')} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-700 font-bold hover:border-purple-300 hover:text-purple-600 transition-all">
               <Plus className="w-5 h-5" /> Add Story
            </button>
            <button onClick={() => addSection('practical')} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-700 font-bold hover:border-emerald-300 hover:text-emerald-600 transition-all">
               <Plus className="w-5 h-5" /> Add Action Item
            </button>
         </div>
      </div>

    </div>
  );
}
