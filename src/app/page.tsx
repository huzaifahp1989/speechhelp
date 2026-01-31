'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search, BookOpen, Mic, GraduationCap, FileText, Bookmark, ArrowRight, Clock, Star, Home as HomeIcon } from 'lucide-react';

type DailyAyah = {
  id: string;
  label: string;
  arabic: string;
  translation: string;
};

type DailyHadith = {
  id: string;
  label: string;
  text: string;
  narrator: string;
};

const DAILY_AYAHS: DailyAyah[] = [
  {
    id: '29:69',
    label: 'Surah Al-Ankabut 29:69',
    arabic: 'وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا ۚ وَإِنَّ اللَّهَ لَمَعَ الْمُحْسِنِينَ',
    translation:
      '“And those who strive for Us – We will surely guide them to Our ways. And indeed, Allah is with the doers of good.”',
  },
  {
    id: '94:5',
    label: 'Surah Ash-Sharh 94:5',
    arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا',
    translation: '“For indeed, with hardship [will be] ease.”',
  },
  {
    id: '3:139',
    label: 'Surah Aal Imran 3:139',
    arabic: 'وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنتُمُ الْأَعْلَوْنَ إِن كُنتُم مُّؤْمِنِينَ',
    translation: '“So do not weaken and do not grieve, and you will be superior if you are [true] believers.”',
  },
  {
    id: '2:286',
    label: 'Surah Al-Baqarah 2:286',
    arabic: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا',
    translation: '“Allah does not burden a soul beyond that it can bear.”',
  },
];

const DAILY_HADITHS: DailyHadith[] = [
  {
    id: 'bukhari-1',
    label: 'Sahih al-Bukhari 1',
    text: 'The reward of deeds depends upon the intentions and every person will get the reward according to what he has intended.',
    narrator: 'Umar ibn al-Khattab (RA)',
  },
  {
    id: 'bukhari-13',
    label: 'Sahih al-Bukhari 13',
    text: 'None of you will truly believe until he loves for his brother what he loves for himself.',
    narrator: 'Anas ibn Malik (RA)',
  },
  {
    id: 'muslim-55',
    label: 'Sahih Muslim 55',
    text: 'The strong person is not the one who can wrestle others, but the strong person is the one who controls himself when he is angry.',
    narrator: 'Abu Hurairah (RA)',
  },
  {
    id: 'tirmidhi-2516',
    label: 'Jami at-Tirmidhi 2516',
    text: 'The best among you are those who have the best manners and character.',
    narrator: 'Abdullah ibn Amr (RA)',
  },
];

export default function Home() {
  const [currentAyah, setCurrentAyah] = useState<DailyAyah>(DAILY_AYAHS[0]);
  const [currentHadith, setCurrentHadith] = useState<DailyHadith>(DAILY_HADITHS[0]);

  useEffect(() => {
    const randomAyah = DAILY_AYAHS[Math.floor(Math.random() * DAILY_AYAHS.length)];
    const randomHadith = DAILY_HADITHS[Math.floor(Math.random() * DAILY_HADITHS.length)];
    setCurrentAyah(randomAyah);
    setCurrentHadith(randomHadith);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      
      {/* Hero Search Section */}
      <div className="text-center space-y-8 py-16 bg-white rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-50 rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-50 rounded-full opacity-50 blur-3xl" />
        
        <div className="relative z-10 px-4">
          <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl lg:text-6xl tracking-tight mb-6">
            Prepare Your Lecture <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600">With Knowledge & Ease</span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-slate-600 font-medium leading-relaxed">
            Search Qur’an, Hadith, Seerah, and Topics to build your Khutbah or Lesson in minutes.
          </p>
          
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const query = formData.get('q');
              if (query) {
                window.location.href = `/search?q=${encodeURIComponent(query.toString())}`;
              }
            }}
            className="max-w-3xl mx-auto mt-10 relative"
          >
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-slate-400" />
            </div>
            <input
              name="q"
              type="text"
              className="block w-full pl-12 pr-4 py-5 border-2 border-slate-200 rounded-2xl leading-5 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 text-lg shadow-sm transition-all"
              placeholder="Search Qur’an, Tafseer, Hadith, Seerah, Topics..."
            />
          </form>
        </div>
      </div>

      {/* Quick Tiles */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {[
            { name: 'Home', href: '/', icon: HomeIcon, color: 'bg-slate-100 text-slate-700', border: 'hover:border-slate-300' },
            { name: 'Qur’an Search', href: '/quran', icon: BookOpen, color: 'bg-emerald-100 text-emerald-700', border: 'hover:border-emerald-300' },
            { name: 'Hadith Search', href: '/hadith', icon: Bookmark, color: 'bg-amber-100 text-amber-700', border: 'hover:border-amber-300' },
            { name: 'Seerah Topics', href: '/seerah', icon: GraduationCap, color: 'bg-purple-100 text-purple-700', border: 'hover:border-purple-300' },
            { name: 'Lecture Builder', href: '/lecture-builder', icon: Mic, color: 'bg-blue-100 text-blue-700', border: 'hover:border-blue-300' },
            { name: 'Dictionary', href: '/dictionary', icon: FileText, color: 'bg-rose-100 text-rose-700', border: 'hover:border-rose-300' },
            { name: '99 Names', href: '/names', icon: Star, color: 'bg-teal-100 text-teal-700', border: 'hover:border-teal-300' },
          ].map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all ${item.border} group`}
            >
              <div className={`p-4 rounded-xl ${item.color} mb-4 group-hover:scale-110 transition-transform shadow-inner`}>
                <item.icon className="w-8 h-8" />
              </div>
              <span className="text-base font-bold text-slate-900 text-center">{item.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Daily Content */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Daily Inspiration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Daily Ayah */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="bg-emerald-50 px-8 py-5 border-b border-emerald-100 flex justify-between items-center">
              <h3 className="font-bold text-emerald-900 flex items-center gap-2 text-lg">
                <BookOpen className="w-5 h-5" /> Daily Ayah
              </h3>
              <span className="text-sm font-semibold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                {currentAyah.label}
              </span>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-right font-arabic text-3xl leading-[2.2] text-slate-900" dir="rtl">
                {currentAyah.arabic}
              </p>
              <p className="text-slate-900 text-lg leading-relaxed font-medium">
                {currentAyah.translation}
              </p>
              <div className="flex gap-4 pt-2 border-t border-slate-100 mt-4">
                 <button className="text-sm font-semibold text-emerald-600 hover:text-emerald-800 hover:underline">View Tafseer</button>
                 <button className="text-sm font-semibold text-emerald-600 hover:text-emerald-800 hover:underline">Add to Lecture</button>
              </div>
            </div>
          </div>

          {/* Daily Hadith */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="bg-amber-50 px-8 py-5 border-b border-amber-100 flex justify-between items-center">
              <h3 className="font-bold text-amber-900 flex items-center gap-2 text-lg">
                <Bookmark className="w-5 h-5" /> Daily Hadith
              </h3>
              <span className="text-sm font-semibold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                {currentHadith.label}
              </span>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-slate-900 italic text-xl leading-relaxed font-medium">
                {`"${currentHadith.text}"`}
              </p>
              <p className="text-base font-semibold text-slate-600">- Narrated by {currentHadith.narrator}</p>
              <div className="flex gap-4 pt-2 border-t border-slate-100 mt-4">
                 <button className="text-sm font-semibold text-amber-600 hover:text-amber-800 hover:underline">Read Full</button>
                 <button className="text-sm font-semibold text-amber-600 hover:text-amber-800 hover:underline">Add to Lecture</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recently Viewed & Bookmarks (Placeholder) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="md:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
               <Clock className="w-5 h-5 text-slate-400" /> Recently Viewed
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
               {[
                  { type: 'Topic', title: 'Preparation for Ramadan', date: '2 hours ago' },
                  { type: 'Hadith', title: 'Sahih Muslim: Book of Faith', date: '5 hours ago' },
                  { type: 'Seerah', title: 'The Hijrah to Madinah', date: 'Yesterday' },
               ].map((item, i) => (
                  <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50 cursor-pointer">
                     <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${item.type === 'Topic' ? 'bg-blue-400' : item.type === 'Hadith' ? 'bg-amber-400' : 'bg-purple-400'}`} />
                        <div>
                           <p className="text-sm font-medium text-slate-900">{item.title}</p>
                           <p className="text-xs text-slate-500">{item.type}</p>
                        </div>
                     </div>
                     <span className="text-xs text-slate-400">{item.date}</span>
                  </div>
               ))}
            </div>
         </div>

         <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
               <Star className="w-5 h-5 text-slate-400" /> Quick Bookmarks
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
               <p className="text-sm text-slate-500 italic text-center py-4">Sign in to see your bookmarks</p>
               <button className="w-full py-2 text-sm text-blue-600 font-medium bg-blue-50 rounded-lg hover:bg-blue-100">
                  View All Bookmarks
               </button>
            </div>
         </div>
      </div>

    </div>
  );
}
