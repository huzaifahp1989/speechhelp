'use client';

import { Calendar, MapPin, Swords, Scroll, Heart, Star, Moon, Sun, Award, BookOpen } from 'lucide-react';

type SeerahEvent = {
  id: string;
  year: string;
  title: string;
  description: string;
  icon: any;
  period: 'Makkan' | 'Madinan';
  age: number;
};

const SEERAH_EVENTS: SeerahEvent[] = [
  {
    id: 'birth',
    year: '570 CE',
    title: 'The Blessed Birth',
    description: 'Prophet Muhammad (SAW) was born in Makkah in the Year of the Elephant.',
    icon: Star,
    period: 'Makkan',
    age: 0,
  },
  {
    id: 'marriage',
    year: '595 CE',
    title: 'Marriage to Khadijah (RA)',
    description: 'He married Khadijah bint Khuwaylid (RA), beginning a partnership of love and support.',
    icon: Heart,
    period: 'Makkan',
    age: 25,
  },
  {
    id: 'revelation',
    year: '610 CE',
    title: 'The First Revelation',
    description: 'Jibreel (AS) appeared to him in the Cave of Hira with the first verses of Surah Al-Alaq.',
    icon: BookOpen,
    period: 'Makkan',
    age: 40,
  },
  {
    id: 'preaching',
    year: '613 CE',
    title: 'Public Preaching Begins',
    description: 'After three years of private invitation, the command came to preach openly.',
    icon: Sun,
    period: 'Makkan',
    age: 43,
  },
  {
    id: 'sorrow',
    year: '619 CE',
    title: 'The Year of Sorrow',
    description: 'The Prophet lost his beloved wife Khadijah (RA) and his uncle Abu Talib.',
    icon: Moon,
    period: 'Makkan',
    age: 49,
  },
  {
    id: 'isra',
    year: '620 CE',
    title: 'Isra and Mi\'raj',
    description: 'The miraculous Night Journey to Jerusalem and Ascension to the Heavens.',
    icon: Star,
    period: 'Makkan',
    age: 50,
  },
  {
    id: 'hijrah',
    year: '622 CE',
    title: 'The Hijrah to Madinah',
    description: 'Migration to Madinah, marking the beginning of the Islamic Calendar (1 AH).',
    icon: MapPin,
    period: 'Madinan',
    age: 53,
  },
  {
    id: 'badr',
    year: '624 CE',
    title: 'Battle of Badr',
    description: 'The first major battle and a decisive victory for the Muslims.',
    icon: Swords,
    period: 'Madinan',
    age: 55,
  },
  {
    id: 'hudaybiyyah',
    year: '628 CE',
    title: 'Treaty of Hudaybiyyah',
    description: 'A peace treaty that paved the way for the spread of Islam and the Conquest of Makkah.',
    icon: Scroll,
    period: 'Madinan',
    age: 59,
  },
  {
    id: 'conquest',
    year: '630 CE',
    title: 'Conquest of Makkah',
    description: 'A peaceful entry into Makkah, ending idolatry in the Kaaba forever.',
    icon: Award,
    period: 'Madinan',
    age: 61,
  },
  {
    id: 'farewell',
    year: '632 CE',
    title: 'The Farewell Pilgrimage',
    description: 'The Prophet (SAW) delivered his final sermon, emphasizing equality and justice.',
    icon: MapPin,
    period: 'Madinan',
    age: 63,
  },
  {
    id: 'death',
    year: '632 CE',
    title: 'The Departure',
    description: 'The Prophet (SAW) passed away in Madinah, leaving behind the Quran and Sunnah.',
    icon: Moon,
    period: 'Madinan',
    age: 63,
  },
];

import { SIRAT_CHAPTERS } from '@/data/seerah';
import { useState } from 'react';

export default function SeerahPage() {
  const [viewMode, setViewMode] = useState<'timeline' | 'book'>('timeline');
  const [activeVolume, setActiveVolume] = useState(1);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      <div className="text-center space-y-4 mb-10">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Seerah of the Prophet (SAW)
        </h1>
        <p className="text-lg text-slate-600">
          Study the life of the Final Messenger based on authentic sources like <strong>Sirat-ul-Mustafa</strong>.
        </p>
        
        {/* Toggle */}
        <div className="flex justify-center mt-6">
           <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
              <button 
                onClick={() => setViewMode('timeline')}
                className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
                  viewMode === 'timeline' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Timeline View
              </button>
              <button 
                onClick={() => setViewMode('book')}
                className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
                  viewMode === 'book' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Read Book (Sirat-ul-Mustafa)
              </button>
           </div>
        </div>
      </div>

      {viewMode === 'timeline' ? (
      <div className="relative max-w-4xl mx-auto">
        {/* Vertical Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200" />

        <div className="space-y-12">
          {SEERAH_EVENTS.map((event) => (
            <div key={event.id} className="relative flex gap-8 group">
              
              {/* Timeline Dot */}
              <div className={`absolute left-8 -translate-x-1/2 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 ${
                event.period === 'Makkan' ? 'bg-emerald-500' : 'bg-blue-600'
              }`} />

              {/* Icon Bubble */}
              <div className={`shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 z-10 bg-white`}>
                <event.icon className={`w-8 h-8 ${
                  event.period === 'Makkan' ? 'text-emerald-600' : 'text-blue-600'
                }`} />
              </div>

              {/* Content Card */}
              <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition-all duration-300">
                <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-2 ${
                      event.period === 'Makkan' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {event.period} Phase
                    </span>
                    <h3 className="text-xl font-bold text-slate-900">{event.title}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-900 font-bold">{event.year}</div>
                    <div className="text-sm text-slate-500">Age: {event.age}</div>
                  </div>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {event.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
           {/* Sidebar / Volume Selector */}
           <div className="lg:w-1/3 space-y-6">
              {SIRAT_CHAPTERS.map((vol) => (
                 <div key={vol.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div 
                      className={`p-4 cursor-pointer font-bold text-lg flex justify-between items-center ${
                        activeVolume === vol.id ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-800'
                      }`}
                      onClick={() => setActiveVolume(vol.id)}
                    >
                       {vol.title}
                    </div>
                    {activeVolume === vol.id && (
                       <div className="divide-y divide-slate-100">
                          {vol.chapters.map((chapter) => (
                             <button 
                               key={chapter.id}
                               onClick={() => setActiveChapter(chapter.id)}
                               className={`w-full text-left p-4 hover:bg-slate-50 transition-colors text-sm font-medium ${
                                 activeChapter === chapter.id ? 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-500' : 'text-slate-600'
                               }`}
                             >
                               {chapter.title}
                             </button>
                          ))}
                       </div>
                    )}
                 </div>
              ))}
           </div>

           {/* Content Reader */}
           <div className="lg:w-2/3">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 min-h-[500px]">
                 {activeChapter ? (
                    <div className="animate-fadeIn">
                       {(() => {
                          const vol = SIRAT_CHAPTERS.find(v => v.id === activeVolume);
                          const chap = vol?.chapters.find(c => c.id === activeChapter);
                          return (
                             <>
                                <span className="text-emerald-600 font-bold text-xs uppercase tracking-wider mb-2 block">{vol?.title}</span>
                                <h2 className="text-3xl font-bold text-slate-900 mb-6">{chap?.title}</h2>
                                <div 
                                  className="prose prose-slate max-w-none prose-lg text-slate-700 leading-relaxed"
                                  dangerouslySetInnerHTML={{ __html: chap?.content || '' }} 
                                />
                                <div className="text-sm italic text-slate-500 mt-8 border-t pt-4">
                                   (Note: This is a summarized extract. The full text of Seerah books like <em>The Sealed Nectar</em> or <em>Sirat-ul-Mustafa</em> spans multiple volumes and covers these events in even greater detail.)
                                </div>
                             </>
                          );
                       })()}
                    </div>
                 ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                       <BookOpen className="w-16 h-16 mb-4 opacity-20" />
                       <p className="text-lg">Select a chapter from the left to begin reading.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
