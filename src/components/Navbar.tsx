'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X, Search, User, BookOpen, Mic, FileText, Bookmark, GraduationCap, Library, PenTool, LogOut, Languages, Quote, Star, Calendar, Activity, Heart, Trophy, MessageCircle } from 'lucide-react';
import clsx from 'clsx';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';

function pad2(v: number) {
  return String(v).padStart(2, '0');
}

function getIsoWeekKey(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${pad2(weekNo)}`;
}

function getMonthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function clampPct(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

const navItems = [
  { name: 'Home', href: '/', icon: Library },
  { name: 'Qur’an', href: '/quran', icon: BookOpen },
  { name: 'Tafseer', href: '/tafseer', icon: FileText },
  { name: 'Hadith', href: '/hadith', icon: Bookmark },
  { name: 'Seerah', href: '/seerah', icon: GraduationCap },
  { name: 'Stories', href: '/stories', icon: Star },
  { name: 'Durood', href: '/durood', icon: Heart },
  { name: 'Khatam', href: '/khatam', icon: Calendar },
  { name: 'Tasbeeh', href: '/tasbeeh', icon: Activity },
  { name: 'Duas', href: '/duas', icon: BookOpen },
  { name: 'Tracker', href: '/tracker', icon: Trophy },
  { name: 'Haramain Live', href: '/haramain', icon: Heart },
  { name: 'Ask Mufti', href: '/ask-mufti', icon: MessageCircle },
  { name: '99 Names', href: '/names', icon: Star },
  { name: 'Quotes', href: '/quotes', icon: Quote },
  { name: 'Books', href: '/books', icon: BookOpen },
  { name: 'Recipes', href: '/recipes', icon: BookOpen },
  { name: 'PDF Library', href: '/islamic-books', icon: Library },
  { name: 'Topics', href: '/topics', icon: Search },
  { name: 'Voice Search', href: '/voice-search', icon: Mic },
  { name: 'Lecture Builder', href: '/lecture-builder', icon: FileText },
  { name: 'Learn Arabic', href: '/learn-arabic', icon: Languages },
  { name: 'Dictionary', href: '/dictionary', icon: BookOpen },
  { name: 'Notes', href: '/notes', icon: PenTool },
  { name: 'Hifz Planner', href: '/hifz-planner', icon: Calendar },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [progress, setProgress] = useState<{ weekPct: number; monthPct: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState<string | null>(null);
  const displayName = ((user?.user_metadata as any)?.display_name || user?.email || '').trim();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) {
      setProgress(null);
      return;
    }

    let cancelled = false;
    const now = new Date();
    const weekKey = getIsoWeekKey(now);
    const monthKey = getMonthKey(now);
    const goals = {
      week: { durood: 1000, tasbeeh: 5000, quran_juz: 7 },
      month: { durood: 5000, tasbeeh: 20000, quran_juz: 30 },
    };

    const run = async () => {
      const [w, m] = await Promise.all([
        supabase
          .from('user_weekly_activity')
          .select('activity,count')
          .eq('user_id', user.id)
          .eq('week', weekKey)
          .in('activity', ['durood', 'tasbeeh', 'quran_juz']),
        supabase
          .from('user_monthly_activity')
          .select('activity,count')
          .eq('user_id', user.id)
          .eq('month', monthKey)
          .in('activity', ['durood', 'tasbeeh', 'quran_juz']),
      ]);

      if (cancelled) return;

      const weekCounts = { durood: 0, tasbeeh: 0, quran_juz: 0 };
      (w.data ?? []).forEach((r: any) => {
        const activity = String(r?.activity || '');
        const count = Number(r?.count || 0);
        if (activity === 'durood') weekCounts.durood = count;
        if (activity === 'tasbeeh') weekCounts.tasbeeh = count;
        if (activity === 'quran_juz') weekCounts.quran_juz = count;
      });

      const monthCounts = { durood: 0, tasbeeh: 0, quran_juz: 0 };
      (m.data ?? []).forEach((r: any) => {
        const activity = String(r?.activity || '');
        const count = Number(r?.count || 0);
        if (activity === 'durood') monthCounts.durood = count;
        if (activity === 'tasbeeh') monthCounts.tasbeeh = count;
        if (activity === 'quran_juz') monthCounts.quran_juz = count;
      });

      const safeRatio = (count: number, goal: number) => (goal > 0 ? count / goal : 0);
      const weekAvg =
        (safeRatio(weekCounts.durood, goals.week.durood) +
          safeRatio(weekCounts.tasbeeh, goals.week.tasbeeh) +
          safeRatio(weekCounts.quran_juz, goals.week.quran_juz)) /
        3;
      const monthAvg =
        (safeRatio(monthCounts.durood, goals.month.durood) +
          safeRatio(monthCounts.tasbeeh, goals.month.tasbeeh) +
          safeRatio(monthCounts.quran_juz, goals.month.quran_juz)) /
        3;

      setProgress({
        weekPct: clampPct(weekAvg * 100),
        monthPct: clampPct(monthAvg * 100),
      });
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (lastPath !== null && lastPath !== pathname) {
      const g = globalThis as typeof globalThis & { __SPEECHHELP_AUDIO__?: HTMLAudioElement };
      if (g.__SPEECHHELP_AUDIO__) {
        g.__SPEECHHELP_AUDIO__.pause();
        g.__SPEECHHELP_AUDIO__.src = '';
      }
    }
    setLastPath(pathname);
  }, [pathname, lastPath]);

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return (
    !mounted ? (
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex flex-col">
                <span className="font-bold text-xl text-slate-800">Lecture Hub</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Islam Media Central</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>
    ) : (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex flex-col">
                <span className="font-bold text-xl text-slate-800">Lecture Hub</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Islam Media Central</span>
              </Link>
            </div>
          </div>
          
          
          {/* Desktop Menu */}
          <div className="hidden lg:flex lg:space-x-4 lg:items-center">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <item.icon className="w-4 h-4" />
                {item.name}
                {item.href === '/tracker' && progress && (
                  <span className="ml-2 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    W {progress.weekPct}% • M {progress.monthPct}%
                  </span>
                )}
              </Link>
            ))}
            <div className="ml-4 border-l pl-4 flex items-center gap-2">
               {user ? (
                 <div className="flex items-center gap-3">
                    <Link href="/tracker" className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 hover:bg-slate-100">
                      <User className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-semibold text-slate-700 max-w-48 truncate">{displayName}</span>
                    </Link>
                    <button 
                      onClick={handleSignOut}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                      title="Sign Out"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                 </div>
               ) : (
                 <div className="flex items-center gap-2">
                   <Link href="/auth" className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600 px-3 py-2 rounded-md hover:bg-slate-50">
                      <User className="w-5 h-5" />
                      <span>Sign In</span>
                   </Link>
                   <Link href="/auth?mode=signup" className="flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-md">
                      <span>Sign Up</span>
                   </Link>
                 </div>
               )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 lg:hidden">
            {user ? (
              <Link
                href="/tracker"
                className="inline-flex items-center justify-center p-2 rounded-md text-slate-600 hover:text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                title={displayName || 'Profile'}
              >
                <User className="block h-6 w-6" />
              </Link>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="inline-flex items-center justify-center p-2 rounded-md text-slate-600 hover:text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  title="Sign In"
                >
                  <User className="block h-6 w-6" />
                </Link>
                <Link
                  href="/auth?mode=signup"
                  className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                  title="Sign Up"
                >
                  Sign Up
                </Link>
              </>
            )}
            <Link
              href="/tracker"
              className="relative inline-flex items-center justify-center p-2 rounded-md text-amber-700 hover:text-amber-800 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-400"
              title="Tracker"
            >
              <Trophy className="block h-6 w-6" />
              {progress && (
                <span className="absolute -top-1 -right-1 text-[10px] font-extrabold bg-amber-600 text-white rounded-full px-1.5 py-0.5 leading-none">
                  {progress.weekPct}%
                </span>
              )}
            </Link>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={clsx('lg:hidden', isOpen ? 'block' : 'hidden')}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-b border-slate-200 shadow-lg">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 block px-3 py-2 rounded-md text-base font-medium flex items-center gap-3"
            >
              <item.icon className="w-5 h-5" />
              {item.name}
              {item.href === '/tracker' && progress && (
                <span className="ml-auto text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  W {progress.weekPct}% • M {progress.monthPct}%
                </span>
              )}
            </Link>
          ))}
          <div className="border-t border-slate-200 pt-4 pb-3">
             {user ? (
               <div className="flex items-center px-5 justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <User className="h-10 w-10 rounded-full bg-slate-100 p-2 text-slate-500" />
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium leading-none text-slate-800 max-w-52 truncate">{displayName || 'User'}</div>
                      <div className="text-sm font-medium leading-none text-slate-500">{user.email}</div>
                    </div>
                  </div>
                  <button 
                    onClick={handleSignOut}
                    className="p-2 text-slate-400 hover:text-red-600"
                  >
                    <LogOut className="w-6 h-6" />
                  </button>
               </div>
             ) : (
               <div className="px-3 space-y-2">
                 <Link 
                   href="/auth" 
                   onClick={() => setIsOpen(false)}
                   className="flex items-center justify-center gap-2 w-full px-5 py-3 text-base font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                 >
                   <User className="w-5 h-5" />
                   Sign In
                 </Link>
                 <Link 
                   href="/auth?mode=signup" 
                   onClick={() => setIsOpen(false)}
                   className="flex items-center justify-center gap-2 w-full px-5 py-3 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                 >
                   Sign Up
                 </Link>
               </div>
             )}
          </div>
        </div>
      </div>
    </nav>
    )
  );
}
