import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlarmClock,
  ArrowRight,
  BookHeart,
  BookOpen,
  Bookmark,
  Calendar,
  FileText,
  Headphones,
  GraduationCap,
  Heart,
  Languages,
  Library,
  MessageCircle,
  Mic,
  PenTool,
  Quote,
  Radio,
  Search,
  Sparkles,
  Star,
  Trophy,
  Utensils,
} from 'lucide-react';
import Link from 'next/link';

type MenuItem = {
  name: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

type MenuSection = {
  title: string;
  description: string;
  accent: string;
  iconStyle: string;
  items: MenuItem[];
};

const menuSections: MenuSection[] = [
  {
    title: 'Qur’an & Hifz',
    description: 'Read, listen, memorize, record, and review your recitation.',
    accent: 'border-emerald-700',
    iconStyle: 'bg-emerald-100 text-emerald-800',
    items: [
      { name: 'Listen to Qur’an', description: 'Listen to Surahs, a Juz, or the full Qur’an with hundreds of reciters.', href: '/quran/listen', icon: Headphones, badge: 'Featured' },
      { name: 'Hifz Studio', description: 'Record verses with live tools and verse stamps.', href: '/quran-studio', icon: Radio, badge: 'New' },
      { name: 'My Hifz', description: 'Review recordings, feedback, streaks, and progress.', href: '/quran-recording', icon: Trophy },
      { name: 'Qur’an', description: 'Browse surahs, ayat, translations, and audio.', href: '/quran', icon: BookOpen },
      { name: 'Tafseer', description: 'Study explanations and meanings of the Qur’an.', href: '/tafseer', icon: FileText },
      { name: 'Hifz Planner', description: 'Plan new memorization and daily revision.', href: '/hifz-planner', icon: Calendar },
      { name: 'Khatam', description: 'Track juz reading and Qur’an completions.', href: '/khatam', icon: Sparkles },
      { name: 'Voice Search', description: 'Find Islamic content using spoken queries.', href: '/voice-search', icon: Mic },
    ],
  },
  {
    title: 'Knowledge & Learning',
    description: 'Explore trusted sources, study tools, and structured learning.',
    accent: 'border-sky-700',
    iconStyle: 'bg-sky-100 text-sky-800',
    items: [
      { name: 'Hadith', description: 'Search and browse hadith collections.', href: '/hadith', icon: Bookmark },
      { name: 'Seerah', description: 'Learn about the life of the Prophet ﷺ.', href: '/seerah', icon: GraduationCap },
      { name: 'Stories', description: 'Read beneficial Islamic stories and lessons.', href: '/stories', icon: Star },
      { name: 'Ask Mufti', description: 'Search trusted answers or submit a question.', href: '/ask-mufti', icon: MessageCircle },
      { name: 'Topics', description: 'Browse Islamic knowledge by subject.', href: '/topics', icon: Search },
      { name: 'Lecture Builder', description: 'Collect references and prepare a talk.', href: '/lecture-builder', icon: FileText },
      { name: 'Learn Arabic', description: 'Build practical Qur’anic Arabic skills.', href: '/learn-arabic', icon: Languages },
      { name: 'Dictionary', description: 'Look up Arabic and Islamic terms.', href: '/dictionary', icon: BookOpen },
    ],
  },
  {
    title: 'Worship & Daily Life',
    description: 'Keep essential worship, reminders, and inspiration within reach.',
    accent: 'border-amber-600',
    iconStyle: 'bg-amber-100 text-amber-800',
    items: [
      { name: 'Duas', description: 'Read and save duas for daily occasions.', href: '/duas', icon: BookHeart },
      { name: 'Durood', description: 'Read and keep count of salawat.', href: '/durood', icon: Heart },
      { name: 'Tasbeeh', description: 'Use a simple digital dhikr counter.', href: '/tasbeeh', icon: Activity },
      { name: 'Salah Alarms', description: 'Set prayer and worship reminders.', href: '/salah-alarms', icon: AlarmClock },
      { name: 'Haramain Live', description: 'Watch live streams from the Haramain.', href: '/haramain', icon: Radio },
      { name: '99 Names', description: 'Learn the beautiful names of Allah.', href: '/names', icon: Star },
      { name: 'Quotes', description: 'Browse short Islamic reminders and wisdom.', href: '/quotes', icon: Quote },
      { name: 'Recipes', description: 'Discover recipes for family and community.', href: '/recipes', icon: Utensils },
    ],
  },
  {
    title: 'Library & Personal Tools',
    description: 'Organize reading, notes, goals, and personal progress.',
    accent: 'border-rose-700',
    iconStyle: 'bg-rose-100 text-rose-800',
    items: [
      { name: 'Tracker', description: 'Track goals, habits, streaks, and reflections.', href: '/tracker', icon: Trophy },
      { name: 'Notes', description: 'Keep personal study notes in one place.', href: '/notes', icon: PenTool },
      { name: 'Books', description: 'Browse the website’s reading collection.', href: '/books', icon: BookOpen },
      { name: 'PDF Library', description: 'Open and read Islamic PDF books.', href: '/islamic-books', icon: Library },
    ],
  },
];

const featureCount = menuSections.reduce((total, section) => total + section.items.length, 0);

export default function MenuPage() {
  return (
    <div className="min-h-screen bg-[#f4f1e8]">
      <header className="border-b border-[#d4c4a0]/70 bg-[#fffef9] pattern-islamic">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 border border-[#0d4f4f]/20 bg-white px-3 py-1.5 text-xs font-bold uppercase text-[#0d4f4f]">
              <Library className="h-4 w-4" /> {featureCount} tools in one place
            </div>
            <h1 className="mt-5 text-4xl font-black text-[#1a2e1a] sm:text-5xl">Explore everything</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[#5a6b5a]">
              Open any feature from the complete menu, from Qur’an study and hifz to daily worship, learning, and personal progress.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/quran/listen" className="inline-flex items-center gap-2 bg-emerald-700 px-5 py-3 font-bold text-white shadow-sm hover:bg-emerald-800">
                <Headphones className="h-5 w-5" /> Listen to the Qur’an
              </Link>
              <Link href="/quran" className="inline-flex items-center gap-2 bg-[#0d4f4f] px-5 py-3 font-bold text-white hover:bg-[#146356]">
                <BookOpen className="h-5 w-5" /> Browse Qur’an
              </Link>
              <Link href="/quran-studio" className="inline-flex items-center gap-2 border-2 border-[#0d4f4f] bg-white px-5 py-3 font-bold text-[#0d4f4f] hover:bg-emerald-50">
                <Radio className="h-5 w-5" /> Start Hifz Studio
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-12 px-4 py-12 sm:px-6 lg:px-8">
        {menuSections.map((section) => (
          <section key={section.title} aria-labelledby={section.title.toLowerCase().replaceAll(' ', '-')}>
            <div className={`border-l-4 ${section.accent} pl-4`}>
              <h2 id={section.title.toLowerCase().replaceAll(' ', '-')} className="text-2xl font-black text-[#1a2e1a]">
                {section.title}
              </h2>
              <p className="mt-1 text-[#5a6b5a]">{section.description}</p>
            </div>

            <div className="mt-6 grid gap-px overflow-hidden border border-[#d4c4a0]/70 bg-[#d4c4a0]/70 sm:grid-cols-2 lg:grid-cols-4">
              {section.items.map((item) => (
                <Link key={item.href} href={item.href} className="group min-w-0 bg-[#fffef9] p-5 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0d4f4f]">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center ${section.iconStyle}`}>
                      <item.icon className="h-5 w-5" strokeWidth={2.2} />
                    </span>
                    <div className="flex items-center gap-2">
                      {item.badge ? <span className="bg-emerald-700 px-2 py-1 text-[10px] font-black uppercase text-white">{item.badge}</span> : null}
                      <ArrowRight className="h-5 w-5 text-[#8a927f] transition-transform group-hover:translate-x-1 group-hover:text-[#0d4f4f]" />
                    </div>
                  </div>
                  <h3 className="mt-4 text-base font-extrabold text-[#1a2e1a]">{item.name}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#5a6b5a]">{item.description}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}