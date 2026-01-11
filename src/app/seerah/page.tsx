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

export default function SeerahPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      <div className="text-center space-y-4 mb-16">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Seerah Timeline
        </h1>
        <p className="text-lg text-slate-600">
          A chronological journey through the life of Prophet Muhammad (SAW).
        </p>
      </div>

      <div className="relative">
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
    </div>
  );
}
