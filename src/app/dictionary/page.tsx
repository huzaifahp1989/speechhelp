'use client';

import { useState } from 'react';
import { Search, BookA } from 'lucide-react';

type DictionaryTerm = {
  term: string;
  definition: string;
  category?: string;
};

const DICTIONARY_TERMS: DictionaryTerm[] = [
  { term: 'Adhan', definition: 'The Islamic call to prayer, recited by the muezzin at prescribed times of the day.' },
  { term: 'Aqidah', definition: 'The Islamic creed or articles of faith.' },
  { term: 'Ayah', definition: 'A verse of the Quran; literally means "a sign" or "evidence".' },
  { term: 'Barakah', definition: 'Divine blessing or spiritual presence.' },
  { term: 'Bismillah', definition: 'The phrase "In the name of Allah".' },
  { term: 'Dawah', definition: 'The act of inviting others to Islam.' },
  { term: 'Dua', definition: 'Supplication or prayer made to Allah.' },
  { term: 'Dunya', definition: 'The temporal world or earthly life.' },
  { term: 'Fard', definition: 'A religious duty commanded by Allah (obligatory).' },
  { term: 'Fatwa', definition: 'A formal legal opinion given by a qualified Islamic scholar.' },
  { term: 'Fiqh', definition: 'Islamic jurisprudence; the human understanding of Sharia.' },
  { term: 'Ghusl', definition: 'Full-body ritual purification mandated before certain acts of worship.' },
  { term: 'Hadith', definition: 'A collection of traditions containing sayings of the Prophet Muhammad (SAW).' },
  { term: 'Hajj', definition: 'The annual Islamic pilgrimage to Mecca, mandatory for Muslims who can afford it.' },
  { term: 'Halal', definition: 'Permissible or lawful according to Islamic law.' },
  { term: 'Haram', definition: 'Forbidden or proscribed by Islamic law.' },
  { term: 'Hijab', definition: 'A head covering worn in public by some Muslim women.' },
  { term: 'Ibadah', definition: 'Worship or servitude to Allah.' },
  { term: 'Iftar', definition: 'The evening meal with which Muslims end their daily Ramadan fast at sunset.' },
  { term: 'Imam', definition: 'The person who leads prayers in a mosque.' },
  { term: 'Iman', definition: 'Faith or belief in the six articles of faith.' },
  { term: 'Jahannam', definition: 'Hell-fire; the afterlife place of punishment.' },
  { term: 'Jannah', definition: 'Paradise or Garden; the afterlife place of reward.' },
  { term: 'Jihad', definition: 'Striving or struggling, especially with a praiseworthy aim.' },
  { term: 'Kaaba', definition: 'The building at the center of Islam\'s most important mosque in Mecca.' },
  { term: 'Khutbah', definition: 'The sermon delivered before the Friday prayer or on Eid.' },
  { term: 'Madinah', definition: 'The city of the Prophet (SAW) and the second holiest city in Islam.' },
  { term: 'Makkah', definition: 'The holiest city in Islam, birthplace of the Prophet (SAW).' },
  { term: 'Masjid', definition: 'A mosque; place of worship for Muslims.' },
  { term: 'Niyyah', definition: 'Intention in one\'s heart to do an act for the sake of Allah.' },
  { term: 'Qadr', definition: 'Divine decree or predestination.' },
  { term: 'Qiblah', definition: 'The direction of the Kaaba to which Muslims turn in prayer.' },
  { term: 'Quran', definition: 'The central religious text of Islam, believed to be a revelation from God.' },
  { term: 'Ramadan', definition: 'The ninth month of the Islamic calendar, observed by fasting.' },
  { term: 'Ruku', definition: 'The bowing position during Salah.' },
  { term: 'Sabr', definition: 'Patience, endurance, and perseverance.' },
  { term: 'Sahaba', definition: 'The companions of the Prophet Muhammad (SAW).' },
  { term: 'Salah', definition: 'The five daily ritual prayers.' },
  { term: 'Sawm', definition: 'Fasting from dawn until sunset.' },
  { term: 'Sharia', definition: 'Islamic canonical law based on the teachings of the Quran and the traditions of the Prophet.' },
  { term: 'Sunnah', definition: 'The verbally transmitted record of the teachings, deeds and sayings of the Prophet Muhammad (SAW).' },
  { term: 'Surah', definition: 'A chapter of the Quran.' },
  { term: 'Tafseer', definition: 'Exegesis or interpretation of the Quran.' },
  { term: 'Taqwa', definition: 'God-consciousness or piety.' },
  { term: 'Tawheed', definition: 'The indivisible oneness concept of monotheism in Islam.' },
  { term: 'Ummah', definition: 'The whole community of Muslims bound together by ties of religion.' },
  { term: 'Umrah', definition: 'The non-mandatory lesser pilgrimage made by Muslims to Mecca.' },
  { term: 'Wudu', definition: 'The Islamic procedure for washing parts of the body, a type of ritual purification.' },
  { term: 'Zakat', definition: 'A form of alms-giving treated in Islam as a religious obligation or tax.' },
];

export default function DictionaryPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTerms = DICTIONARY_TERMS.filter(item => 
    item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.definition.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => a.term.localeCompare(b.term));

  const groupedTerms = filteredTerms.reduce((groups, item) => {
    const letter = item.term[0].toUpperCase();
    if (!groups[letter]) {
      groups[letter] = [];
    }
    groups[letter].push(item);
    return groups;
  }, {} as Record<string, DictionaryTerm[]>);

  const letters = Object.keys(groupedTerms).sort();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Islamic Dictionary
        </h1>
        <p className="text-lg text-slate-600">
          Understand key terms and vocabulary used in Islamic literature and daily life.
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
          placeholder="Search for a term..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Terms List */}
      <div className="space-y-12">
        {letters.map((letter) => (
          <div key={letter} className="relative">
            <div className="sticky top-4 z-10 bg-slate-50/90 backdrop-blur-sm py-2 mb-4 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-emerald-600 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm">
                  {letter}
                </span>
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {groupedTerms[letter].map((item) => (
                <div key={item.term} className="bg-white p-6 rounded-xl border border-slate-200 hover:border-emerald-200 hover:shadow-md transition-all group">
                  <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2 group-hover:text-emerald-700 transition-colors">
                    {item.term}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {item.definition}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredTerms.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 text-lg">No terms found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
