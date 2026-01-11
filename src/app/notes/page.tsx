'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, Search, FileText } from 'lucide-react';

type Note = {
  id: string;
  title: string;
  content: string;
  date: string;
  tags: string[];
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);

  // Load notes from local storage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('speechhelp_notes');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    } else {
      // Seed with sample note if empty
      const sampleNote: Note = {
        id: '1',
        title: 'Welcome to your Notes',
        content: 'This is a place to save your thoughts, reflections on verses, or points for your next Khutbah.',
        date: new Date().toLocaleDateString(),
        tags: ['General']
      };
      setNotes([sampleNote]);
    }
  }, []);

  // Save notes to local storage whenever they change
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem('speechhelp_notes', JSON.stringify(notes));
    }
  }, [notes]);

  const handleSaveNote = () => {
    if (!currentNote) return;

    if (!currentNote.title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (notes.find(n => n.id === currentNote.id)) {
      // Update existing
      setNotes(notes.map(n => n.id === currentNote.id ? { ...currentNote, date: new Date().toLocaleDateString() } : n));
    } else {
      // Create new
      setNotes([{ ...currentNote, date: new Date().toLocaleDateString() }, ...notes]);
    }
    
    setIsEditing(false);
    setCurrentNote(null);
  };

  const handleDeleteNote = (id: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      setNotes(notes.filter(n => n.id !== id));
      if (currentNote?.id === id) {
        setIsEditing(false);
        setCurrentNote(null);
      }
    }
  };

  const startNewNote = () => {
    setCurrentNote({
      id: Date.now().toString(),
      title: '',
      content: '',
      date: new Date().toLocaleDateString(),
      tags: []
    });
    setIsEditing(true);
  };

  const editNote = (note: Note) => {
    setCurrentNote(note);
    setIsEditing(true);
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Notes</h1>
          <p className="text-slate-600">Capture your thoughts, reflections, and study points.</p>
        </div>
        <button 
          onClick={startNewNote}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold shadow-md transition-all"
        >
          <Plus className="w-5 h-5" /> New Note
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sidebar List */}
        <div className={`lg:col-span-1 space-y-4 ${isEditing ? 'hidden lg:block' : 'block'}`}>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search notes..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-shadow"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-3 h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
            {filteredNotes.map(note => (
              <div 
                key={note.id}
                onClick={() => editNote(note)}
                className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                  currentNote?.id === note.id 
                    ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' 
                    : 'bg-white border-slate-200 hover:border-emerald-300'
                }`}
              >
                <h3 className="font-bold text-slate-900 mb-1 line-clamp-1">{note.title || 'Untitled Note'}</h3>
                <p className="text-sm text-slate-500 mb-2 line-clamp-2">{note.content || 'No content...'}</p>
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>{note.date}</span>
                  {currentNote?.id === note.id && <Edit2 className="w-3 h-3 text-emerald-600" />}
                </div>
              </div>
            ))}
            
            {filteredNotes.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No notes found</p>
              </div>
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div className={`lg:col-span-2 ${!isEditing ? 'hidden lg:flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 min-h-[500px]' : 'block'}`}>
          {isEditing && currentNote ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
              
              {/* Editor Toolbar */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <input
                  type="text"
                  value={currentNote.title}
                  onChange={(e) => setCurrentNote({ ...currentNote, title: e.target.value })}
                  placeholder="Note Title"
                  className="bg-transparent text-xl font-bold text-slate-900 placeholder-slate-400 focus:outline-none w-full mr-4"
                />
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleDeleteNote(currentNote.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Note"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleSaveNote}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm transition-all"
                  >
                    <Save className="w-4 h-4" /> Save
                  </button>
                </div>
              </div>

              {/* Editor Content */}
              <textarea
                value={currentNote.content}
                onChange={(e) => setCurrentNote({ ...currentNote, content: e.target.value })}
                placeholder="Start typing your note here..."
                className="flex-1 w-full p-6 resize-none focus:outline-none text-lg text-slate-700 leading-relaxed custom-scrollbar"
              />
            </div>
          ) : (
            <div className="text-center text-slate-400">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a note to view or create a new one</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
