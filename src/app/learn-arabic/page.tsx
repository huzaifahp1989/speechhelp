'use client';

import { useState } from 'react';
import { BookOpen, GraduationCap, Languages, ScrollText, PlayCircle, Mic, LayoutGrid, CheckCircle2 } from 'lucide-react';

// Data Structures

type ArabicLetter = {
  letter: string;
  name: string;
  transliteration: string;
  type: 'Sun' | 'Moon';
};

const ARABIC_ALPHABET: ArabicLetter[] = [
  { letter: 'ا', name: 'Alif', transliteration: 'ā', type: 'Moon' },
  { letter: 'b', name: 'Ba', transliteration: 'b', type: 'Moon' },
  { letter: 'ت', name: 'Ta', transliteration: 't', type: 'Sun' },
  { letter: 'ث', name: 'Tha', transliteration: 'th', type: 'Sun' },
  { letter: 'ج', name: 'Jim', transliteration: 'j', type: 'Moon' },
  { letter: 'ح', name: 'Ha', transliteration: 'ḥ', type: 'Moon' },
  { letter: 'خ', name: 'Kha', transliteration: 'kh', type: 'Moon' },
  { letter: 'د', name: 'Dal', transliteration: 'd', type: 'Sun' },
  { letter: 'ذ', name: 'Dhal', transliteration: 'dh', type: 'Sun' },
  { letter: 'ر', name: 'Ra', transliteration: 'r', type: 'Sun' },
  { letter: 'ز', name: 'Zay', transliteration: 'z', type: 'Sun' },
  { letter: 'س', name: 'Seen', transliteration: 's', type: 'Sun' },
  { letter: 'ش', name: 'Sheen', transliteration: 'sh', type: 'Sun' },
  { letter: 'ص', name: 'Sad', transliteration: 'ṣ', type: 'Sun' },
  { letter: 'ض', name: 'Dad', transliteration: 'ḍ', type: 'Sun' },
  { letter: 'ط', name: 'Ta', transliteration: 'ṭ', type: 'Sun' },
  { letter: 'ظ', name: 'Zha', transliteration: 'ẓ', type: 'Sun' },
  { letter: 'ع', name: 'Ayn', transliteration: 'ʿ', type: 'Moon' },
  { letter: 'غ', name: 'Ghayn', transliteration: 'gh', type: 'Moon' },
  { letter: 'ف', name: 'Fa', transliteration: 'f', type: 'Moon' },
  { letter: 'ق', name: 'Qaf', transliteration: 'q', type: 'Moon' },
  { letter: 'ك', name: 'Kaf', transliteration: 'k', type: 'Moon' },
  { letter: 'ل', name: 'Lam', transliteration: 'l', type: 'Sun' },
  { letter: 'م', name: 'Meem', transliteration: 'm', type: 'Moon' },
  { letter: 'ن', name: 'Noon', transliteration: 'n', type: 'Sun' },
  { letter: 'ه', name: 'Ha', transliteration: 'h', type: 'Moon' },
  { letter: 'و', name: 'Waw', transliteration: 'w', type: 'Moon' },
  { letter: 'ي', name: 'Ya', transliteration: 'y', type: 'Moon' },
];

const GRAMMAR_LESSONS = [
  {
    id: 'parts-of-speech',
    title: 'The Three Parts of Speech (Kalimah)',
    content: `In Arabic, all words fall into three categories:
    1. **Ism (Noun):** Names of people, places, things, adjectives, and ideas. (e.g., Kitab, Muslim)
    2. **Fi'l (Verb):** Action words confined to a tense (Past, Present/Future, Command). (e.g., Kataba - he wrote)
    3. **Harf (Particle):** Words that don't make sense alone but connect others. (e.g., Fi - in, Ala - upon)`,
    level: 'Beginner'
  },
  {
    id: 'gender',
    title: 'Gender (Jins)',
    content: `Arabic nouns are either Masculine (Mudhakkar) or Feminine (Mu'annath).
    - **Default:** Words are masculine unless proven feminine.
    - **Signs of Femininity:**
      1. Taa Marbuta (ة) at the end (e.g., Jannah).
      2. Alif Maqsura (ى) (e.g., Kubra).
      3. Alif Mamduda (اء) (e.g., Hamra).`,
    level: 'Beginner'
  },
  {
    id: 'sentence-structure',
    title: 'The Nominal Sentence (Jumlah Ismiyyah)',
    content: `A sentence that starts with a noun. It has two parts:
    1. **Mubtada (Subject):** The starting noun (usually definite).
    2. **Khabar (Predicate):** Information about the subject (usually indefinite).
    
    *Example:* Al-Waladu Salihun (The boy is pious).`,
    level: 'Intermediate'
  }
];

const MORPHOLOGY_LESSONS = [
  {
    id: 'roots',
    title: 'The Root System',
    content: `Most Arabic words are built from a 3-letter root (e.g., K-T-B).
    - Kataba (He wrote)
    - Kitab (Book)
    - Katib (Writer)
    - Maktab (Desk/Office)
    
    Understanding the root helps you guess the meaning of new words.`
  },
  {
    id: 'past-tense',
    title: 'Past Tense (Fi\'l Madi)',
    content: `The base form is the "He" form (3rd person masculine singular).
    - Fa'ala (He did)
    - Fa'ala (They two did)
    - Fa'alu (They all did)
    - Fa'alat (She did)
    ...and so on.`
  }
];

export default function LearnArabicPage() {
  const [activeTab, setActiveTab] = useState<'alphabet' | 'grammar' | 'morphology' | 'vocabulary'>('alphabet');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      
      {/* Header */}
      <div className="text-center space-y-4 mb-10">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Learn Arabic
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          A comprehensive guide to mastering the language of the Quran. From the alphabet to complex grammar rules.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-4 border-b border-slate-200 pb-8">
        {[
          { id: 'alphabet', label: 'Alphabet', icon: Languages },
          { id: 'grammar', label: 'Grammar (Nahw)', icon: ScrollText },
          { id: 'morphology', label: 'Morphology (Sarf)', icon: LayoutGrid },
          { id: 'vocabulary', label: 'Vocabulary', icon: BookOpen },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 scale-105' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'alphabet' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-8 flex items-start gap-4">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                   <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="font-bold text-blue-900 text-lg">Did you know?</h3>
                   <p className="text-blue-800">Arabic is written from right to left. There are 28 letters. Letters change shape depending on whether they are at the beginning, middle, or end of a word.</p>
                </div>
             </div>

             <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                {ARABIC_ALPHABET.map((l) => (
                   <div key={l.name} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all text-center group cursor-pointer">
                      <div className="text-4xl font-serif text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">{l.letter}</div>
                      <div className="text-sm font-bold text-slate-500 uppercase tracking-wide">{l.name}</div>
                      <div className="text-xs text-slate-400 mt-1">{l.transliteration}</div>
                   </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'grammar' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
             {GRAMMAR_LESSONS.map((lesson, idx) => (
                <div key={lesson.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                   <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-slate-900">Lesson {idx + 1}: {lesson.title}</h3>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase">{lesson.level}</span>
                   </div>
                   <div className="p-6 prose prose-slate max-w-none">
                      <div className="whitespace-pre-line text-slate-700 leading-relaxed">
                         {lesson.content}
                      </div>
                   </div>
                </div>
             ))}
          </div>
        )}

        {activeTab === 'morphology' && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 mb-8">
                <h3 className="font-bold text-amber-900 text-lg mb-2">Why Sarf?</h3>
                <p className="text-amber-800">Sarf (Morphology) is the science of changing the form of a word to get different meanings. It is known as the "Mother of Sciences" in Arabic.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                 {MORPHOLOGY_LESSONS.map((lesson) => (
                    <div key={lesson.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                       <h3 className="font-bold text-xl text-slate-900 mb-4 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          {lesson.title}
                       </h3>
                       <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                          {lesson.content}
                       </p>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'vocabulary' && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
              <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900">Vocabulary Lists Coming Soon</h3>
              <p className="text-slate-500 mt-2">We are compiling high-frequency Quranic vocabulary lists for you.</p>
           </div>
        )}
      </div>
    </div>
  );
}
