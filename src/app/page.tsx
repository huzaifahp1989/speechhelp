import Link from 'next/link';
import { Search, BookOpen, Mic, GraduationCap, FileText, Bookmark, ArrowRight, Clock, Star, Home as HomeIcon, Calendar, Activity, Trophy, MessageCircle } from 'lucide-react';
import UnifiedSearch from '@/components/UnifiedSearch';

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

function hashStringToInt(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickDailyIndex(listLength: number, dayKey: string) {
  if (listLength <= 0) return 0;
  return hashStringToInt(dayKey) % listLength;
}

export default function Home() {
  const dayKey = new Date().toISOString().slice(0, 10);
  const currentAyah = DAILY_AYAHS[pickDailyIndex(DAILY_AYAHS.length, `ayah:${dayKey}`)] || DAILY_AYAHS[0];
  const currentHadith = DAILY_HADITHS[pickDailyIndex(DAILY_HADITHS.length, `hadith:${dayKey}`)] || DAILY_HADITHS[0];

  const topicChips = [
    'Salah (Prayer)',
    'Taharah (Purification)',
    'Zakat',
    'Fasting (Sawm)',
    'Marriage',
    'Divorce',
    'Business & Finance',
    'Inheritance',
    'Aqidah (Belief)',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16">
      
      {/* Hero */}
      <div className="text-center space-y-8 py-12 sm:py-20 bg-[#fffef9] rounded-3xl shadow-sm border border-[#d4c4a0]/40 relative overflow-hidden isolate pattern-islamic">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#0d4f4f] via-[#c9a227] to-[#146356]" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#0d4f4f]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#c9a227]/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 px-4">
          <div className="inline-flex items-center rounded-full border border-[#0d4f4f]/20 bg-[#0d4f4f]/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#0d4f4f]">
            SpeechHelp · Islamic Learning
          </div>
          <h1 className="mt-5 max-w-4xl mx-auto text-3xl font-black tracking-tight text-[#1a2e1a] sm:text-5xl sm:leading-[1.05]">
            Read, memorize, and learn —
            <span className="text-[#0d4f4f]"> the Qur&apos;an your way</span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-[#5a6b5a] font-medium leading-relaxed mt-4">
            Full-screen 13-line mushaf for salah and taraweeh, plus verse search, audio, hifz tools, and more.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link
              href="/quran/mushaf"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#0d4f4f] text-white font-bold text-lg hover:bg-[#146356] transition-colors shadow-lg shadow-[#0d4f4f]/20"
            >
              <BookOpen className="w-5 h-5" />
              Open 13-Line Mushaf
            </Link>
            <Link
              href="/quran"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border-2 border-[#d4c4a0] text-[#0d4f4f] font-semibold hover:bg-white transition-colors"
            >
              Browse Surahs
            </Link>
          </div>
          
          <div id="unified-search-root" className="max-w-3xl mx-auto mt-10 relative z-50">
             <UnifiedSearch className="shadow-xl" />
          </div>
        </div>
      </div>

      {/* Quick Tiles */}
      <div>
        <h2 className="text-2xl font-bold text-[#1a2e1a] mb-6">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {[
            { name: '13-Line Mushaf', href: '/quran/mushaf', icon: BookOpen, color: 'bg-[#0d4f4f]/10 text-[#0d4f4f]', border: 'hover:border-[#0d4f4f]/40' },
            { name: 'Home', href: '/', icon: HomeIcon, color: 'bg-[#5a6b5a]/10 text-[#5a6b5a]', border: 'hover:border-[#5a6b5a]/30' },
            { name: 'Hifz Planner', href: '/hifz-planner', icon: Calendar, color: 'bg-indigo-100 text-indigo-700', border: 'hover:border-indigo-300' },
            { name: 'Tasbeeh', href: '/tasbeeh', icon: Activity, color: 'bg-[#146356]/10 text-[#146356]', border: 'hover:border-[#146356]/30' },
            { name: 'Tracker', href: '/tracker', icon: Trophy, color: 'bg-[#c9a227]/10 text-[#c9a227]', border: 'hover:border-[#c9a227]/40' },
            { name: 'Ask Mufti', href: '/ask-mufti', icon: MessageCircle, color: 'bg-blue-100 text-blue-700', border: 'hover:border-blue-300' },
            { name: 'Qur’an Search', href: '/quran', icon: BookOpen, color: 'bg-[#0d4f4f]/10 text-[#0d4f4f]', border: 'hover:border-[#0d4f4f]/40' },
            { name: 'Hadith Search', href: '/hadith', icon: Bookmark, color: 'bg-amber-100 text-amber-700', border: 'hover:border-amber-300' },
            { name: 'Seerah Topics', href: '/seerah', icon: GraduationCap, color: 'bg-purple-100 text-purple-700', border: 'hover:border-purple-300' },
            { name: 'Lecture Builder', href: '/lecture-builder', icon: Mic, color: 'bg-blue-100 text-blue-700', border: 'hover:border-blue-300' },
            { name: 'Dictionary', href: '/dictionary', icon: FileText, color: 'bg-rose-100 text-rose-700', border: 'hover:border-rose-300' },
            { name: '99 Names', href: '/names', icon: Star, color: 'bg-teal-100 text-teal-700', border: 'hover:border-teal-300' },
          ].map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center p-6 sm:p-8 bg-[#fffef9] rounded-2xl shadow-sm border border-[#d4c4a0]/40 hover:shadow-lg transition-all ${item.border} group`}
            >
              <div className={`p-4 rounded-xl ${item.color} mb-4 group-hover:scale-110 transition-transform`}>
                <item.icon className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <span className="text-sm sm:text-base font-bold text-[#1a2e1a] text-center">{item.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 p-8 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-60" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-60" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Ask a reliable Mufti
              </h2>
              <Link
                href="/ask-mufti"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Ask now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <p className="mt-2 text-slate-600 text-base max-w-2xl">
              Search trusted sources by topic. If you can’t find an answer, WhatsApp your question and we’ll forward it to a reliable Mufti.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {topicChips.map((t) => (
                <Link
                  key={t}
                  href={`/ask-mufti?topic=${encodeURIComponent(t)}`}
                  className="px-3 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold"
                >
                  {t}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Trusted sources</h3>
          <div className="space-y-2 text-sm">
            <a href="https://darulfiqh.com" target="_blank" rel="noreferrer" className="block px-4 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-semibold text-slate-800">
              Darul Fiqh
            </a>
            <a href="https://www.askimam.org" target="_blank" rel="noreferrer" className="block px-4 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-semibold text-slate-800">
              AskImam
            </a>
            <a href="https://ummaharchive.org/p/about" target="_blank" rel="noreferrer" className="block px-4 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-semibold text-slate-800">
              Nur al-Idah (Reference)
            </a>
          </div>
          <Link
            href="/topics"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold"
          >
            Browse topics <Search className="w-4 h-4" />
          </Link>
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
