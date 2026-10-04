'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, ArrowLeft, Search, User, BookOpen, Headphones, Mic, FileText, Bookmark, GraduationCap, Library, PenTool, LogOut, Languages, Quote, Star, Calendar, Activity, Heart, Trophy, MessageCircle, AlarmClock, ShieldCheck, Radio, Megaphone, LayoutGrid } from 'lucide-react';
import clsx from 'clsx';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { AnalyticsEvents, trackUserId } from '@/lib/analytics';
import { isSiteAdmin as isSiteAdminClient } from '@/lib/siteAdmin';
import { GlobalNoticeBell } from '@/components/GlobalNoticeBell';

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
  { name: 'Listen to Qur’an', href: '/quran/listen', icon: Headphones, highlight: true },
  { name: 'Hifz Studio', href: '/quran-studio', icon: Radio, highlight: true },
  { name: 'My Hifz', href: '/quran-recording', icon: Trophy, highlight: true },
  { name: 'Home', href: '/', icon: Library },
  { name: 'Full Menu', href: '/menu', icon: LayoutGrid },
  { name: 'Qur’an', href: '/quran', icon: BookOpen },
  { name: 'Kids Zone', href: '/kids-zone', icon: Trophy },
  { name: 'Tafseer', href: '/tafseer', icon: FileText },
  { name: 'Hadith', href: '/hadith', icon: Bookmark },
  { name: 'Seerah', href: '/seerah', icon: GraduationCap },
  { name: 'Stories', href: '/stories', icon: Star },
  { name: 'Durood', href: '/durood', icon: Heart },
  { name: 'Khatam', href: '/khatam', icon: Calendar },
  { name: 'Salah Alarms', href: '/salah-alarms', icon: AlarmClock },
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

const desktopNavItems = navItems.filter((item) =>
  ['/quran-studio', '/quran-recording', '/menu'].includes(item.href)
);

const staffNavItems = [
  { name: 'Review Recordings', href: '/admin/quran-recordings', icon: ShieldCheck },
  { name: 'Quran Audio Analytics', href: '/admin/kids-zone', icon: Trophy },
  { name: 'Push Notifications', href: '/admin/notifications', icon: MessageCircle },
  { name: 'Announcements', href: '/admin/announcements', icon: Megaphone },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [progress, setProgress] = useState<{ weekPct: number; monthPct: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const previousPathRef = useRef<string | null>(null);
  const [hasInAppBack, setHasInAppBack] = useState(false);
  const [lastPath, setLastPath] = useState<string | null>(null);
  const displayName = ((user?.user_metadata as any)?.display_name || user?.email || '').trim();
  const signedIn = Boolean(user && !user.is_anonymous);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (previousPathRef.current && previousPathRef.current !== pathname) {
      setHasInAppBack(true);
    }
    previousPathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      void trackUserId(session?.user?.id ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      void trackUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !user || user.is_anonymous) {
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
    if (!user || user.is_anonymous) {
      setIsStaff(false);
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let cancelled = false;
    void (async () => {
      const admin = await isSiteAdminClient(supabase, user.id, user.email).catch(() => false);
      if (cancelled) return;
      if (admin) {
        setIsStaff(true);
        return;
      }
      // Fallback instructor role check (best-effort, RPC may not yet exist)
      try {
        const { data } = await supabase.rpc('is_hafiz_instructor');
        if (!cancelled && data) setIsStaff(true);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
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
    void AnalyticsEvents.auth('logout');
    await supabase.auth.signOut();
  };

  const handleGoBack = () => {
    setIsOpen(false);
    if (hasInAppBack) router.back();
    else router.push('/');
  };

  return (
    !mounted ? (
      <nav className="bg-white border-b border-[#d4e0ef] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" aria-label="Home" className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 shrink-0 text-[#12336b]" />
              </Link>
            </div>
          </div>
        </div>
      </nav>
    ) : (
    <nav className="bg-white/95 backdrop-blur-md border-b border-[#d4e0ef] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" aria-label="Home" className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 shrink-0 text-[#12336b]" />
              </Link>
            </div>
          </div>
          
          
          {/* Desktop Menu */}
          <div className="hidden lg:flex lg:space-x-4 lg:items-center">
            <Link
              href="/quran/listen"
              onClick={() => void AnalyticsEvents.navClick('/quran/listen', 'Listen to Qur’an')}
              aria-current={pathname === '/quran/listen' ? 'page' : undefined}
              className={clsx(
                'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold text-white shadow-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700',
                pathname === '/quran/listen'
                  ? 'bg-emerald-800'
                  : 'bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800'
              )}
            >
              <Headphones className="h-4 w-4" strokeWidth={2.5} />
              Listen to Qur’an
            </Link>
            <button
              type="button"
              onClick={handleGoBack}
              aria-label="Go back"
              title="Go back"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#43536a] hover:bg-[#12336b]/8 hover:text-[#12336b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b82c4]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            {desktopNavItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => void AnalyticsEvents.navClick(item.href, item.name)}
                className={clsx(
                  'px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors',
                  (item as any).highlight
                    ? 'text-[#07594f] bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-300 hover:from-emerald-100 hover:to-teal-100 shadow-sm ring-1 ring-emerald-100'
                    : 'text-[#43536a] hover:text-[#12336b] hover:bg-[#12336b]/8'
                )}
              >
                <item.icon className="w-4 h-4" strokeWidth={2.1} />
                {item.name}
                {(item as any).highlight && item.href === '/quran-studio' ? (
                  <span className="ml-0.5 inline-flex items-center text-[10px] font-black tracking-[0.18em] text-white bg-emerald-600 border border-emerald-700 px-2 py-0.5 rounded-full uppercase shadow-sm">
                    NEW
                  </span>
                ) : null}
                {item.href === '/tracker' && progress && (
                  <span className="ml-2 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    W {progress.weekPct}% • M {progress.monthPct}%
                  </span>
                )}
              </Link>
            ))}
            {isStaff && (
              <>
                <div className="h-6 w-px bg-slate-300 mx-1"></div>
                <Link
                  href="/admin/quran-recordings"
                  onClick={() => void AnalyticsEvents.navClick('/admin/quran-recordings', 'Admin Hub')}
                  className="px-3 py-2 rounded-md text-sm font-bold flex items-center gap-2 bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 text-indigo-950 border-2 border-indigo-300 shadow-md hover:from-indigo-100 hover:via-violet-100 hover:to-fuchsia-100 transition-colors ring-1 ring-white"
                  title="Admin & Instructor dashboard"
                >
                  <ShieldCheck className="w-4 h-4" strokeWidth={2.3} />
                  Admin
                  <span className="ml-0.5 inline-flex items-center text-[10px] font-black tracking-[0.18em] text-white bg-indigo-600 border border-indigo-700 px-2 py-0.5 rounded-full uppercase shadow-sm">
                    STAFF
                  </span>
                </Link>
              </>
            )}
            <GlobalNoticeBell />
            <div className="ml-2 border-l pl-4 flex items-center gap-2">
               {signedIn ? (
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
                   <Link href="/auth" className="flex items-center gap-2 text-sm font-semibold text-[#5d7089] hover:text-[#12336b] px-3 py-2 rounded-md hover:bg-[#12336b]/5">
                      <User className="w-5 h-5" />
                      <span>Sign In</span>
                   </Link>
                   <Link href="/auth?mode=signup" className="flex items-center gap-2 text-sm font-semibold text-white bg-[#12336b] hover:bg-[#214f8d] px-3 py-2 rounded-md">
                      <span>Sign Up</span>
                   </Link>
                 </div>
               )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link
              href="/quran/listen"
              aria-label="Listen to Qur’an"
              aria-current={pathname === '/quran/listen' ? 'page' : undefined}
              onClick={() => void AnalyticsEvents.navClick('/quran/listen', 'Listen to Qur’an')}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 px-3 text-xs font-extrabold text-white shadow-sm hover:from-emerald-800 hover:to-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <Headphones className="h-4 w-4" />
              <span className="hidden min-[380px]:inline">Listen</span>
            </Link>
            {signedIn ? (
              <Link
                href="/tracker"
                className="inline-flex items-center justify-center p-2 rounded-md text-slate-600 hover:text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                title={displayName || 'Profile'}
              >
                <User className="block h-6 w-6" />
              </Link>
            ) : (
              <Link
                href="/auth"
                className="inline-flex items-center justify-center p-2 rounded-md text-slate-600 hover:text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                title="Sign in or create an account"
              >
                <User className="block h-6 w-6" />
              </Link>
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
              type="button"
              onClick={handleGoBack}
              aria-label="Go back"
              title="Go back"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#43536a] hover:bg-[#12336b]/8 hover:text-[#12336b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b82c4]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <GlobalNoticeBell compact />
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
        <div className="px-2 pt-2 pb-3 space-y-1.5 sm:px-3 bg-white border-b-2 border-[#d4e0ef] shadow-xl">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => {
                void AnalyticsEvents.navClick(item.href, item.name);
                setIsOpen(false);
              }}
              className={clsx(
                'block px-3 py-3 rounded-xl text-base font-semibold flex items-center gap-3',
                (item as any).highlight
                  ? 'text-[#07594f] bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 shadow-md ring-1 ring-emerald-100'
                  : 'text-[#43536a] hover:text-[#12336b] hover:bg-[#12336b]/8 border border-transparent'
              )}
            >
              <item.icon className="w-5 h-5" strokeWidth={2.2} />
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span className="truncate">{item.name}</span>
                {(item as any).highlight && item.href === '/quran-studio' ? (
                  <span className="inline-flex items-center shrink-0 text-[10px] font-black tracking-[0.18em] text-white bg-emerald-600 border border-emerald-700 px-2 py-0.5 rounded-full uppercase shadow-sm">
                    NEW
                  </span>
                ) : null}
              </div>
              {item.href === '/tracker' && progress && (
                <span className="ml-auto text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  W {progress.weekPct}% • M {progress.monthPct}%
                </span>
              )}
            </Link>
          ))}
          {isStaff && staffNavItems.length > 0 && (
            <div className="pt-4 mt-3 border-t border-slate-200 space-y-1.5">
              <div className="px-2 py-2 rounded-xl bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 ring-1 ring-indigo-200/60">
                <div className="px-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm ring-1 ring-indigo-300/70">
                      <ShieldCheck className="w-4 h-4" strokeWidth={2.4} />
                    </span>
                    <span className="text-[12px] font-black tracking-[0.13em] text-indigo-900 uppercase drop-shadow-[0_0.5px_0_rgba(255,255,255,0.6)]">
                      Staff / Admin
                    </span>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[9px] font-black tracking-[0.14em] px-2.5 py-1 uppercase ring-1 ring-white/70 shadow-sm">
                    Restricted
                  </span>
                </div>
                <p className="px-1.5 mt-1.5 text-[11px] leading-snug text-indigo-900/75 font-medium">
                  Review hifz recordings, send broadcast push notifications, manage site announcements.
                </p>
              </div>
              {staffNavItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => {
                    void AnalyticsEvents.navClick(item.href, item.name);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    'block px-3 py-2 rounded-md text-base font-medium flex items-center gap-3 bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-900 border border-indigo-200/70 hover:from-indigo-100 hover:to-violet-100'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
            </div>
          )}
          <div className="border-t border-slate-200 pt-4 pb-3">
             {signedIn ? (
               <div className="flex items-center px-5 justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <User className="h-10 w-10 rounded-full bg-slate-100 p-2 text-slate-500" />
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium leading-none text-slate-800 max-w-52 truncate">{displayName || 'User'}</div>
                      <div className="text-sm font-medium leading-none text-slate-500">{user?.email}</div>
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
