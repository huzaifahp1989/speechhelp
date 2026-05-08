'use client';

import { useState, useEffect, useRef } from 'react';
import { BookHeart, Check, RotateCcw, Trophy, ChevronLeft, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';

type Dua = {
  id: string;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  reference: string;
  virtue: string;
  target: number;
};

const DUA_LIST: Dua[] = [
  {
    id: 'morning-dua',
    title: 'Morning Dua',
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
    transliteration: 'Asbahna wa asbahal mulku lillah, walhamdu lillah, la ilaha illallahu wahdahu la sharika lah',
    translation: 'We have reached the morning and the whole kingdom of Allah has reached the morning. Praise be to Allah. None has the right to be worshipped but Allah alone.',
    reference: 'Abu Dawud 5077',
    virtue: 'Recited every morning to begin the day with gratitude and Tawheed.',
    target: 1,
  },
  {
    id: 'evening-dua',
    title: 'Evening Dua',
    arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
    transliteration: 'Amsayna wa amsal mulku lillah, walhamdu lillah, la ilaha illallahu wahdahu la sharika lah',
    translation: 'We have reached the evening and the whole kingdom of Allah has reached the evening. Praise be to Allah. None has the right to be worshipped but Allah alone.',
    reference: 'Abu Dawud 5078',
    virtue: 'Recited every evening to close the day with remembrance of Allah.',
    target: 1,
  },
  {
    id: 'istikhara',
    title: "Dua al-Istikhara",
    arabic: 'اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ، وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ، وَأَسْأَلُكَ مِنْ فَضْلِكَ الْعَظِيمِ',
    transliteration: 'Allahumma inni astakhiruka bi ilmika wa astaqdiruka bi qudratika wa as\'aluka min fadlikal azim',
    translation: 'O Allah, I seek Your guidance by virtue of Your knowledge, and I seek ability by virtue of Your power, and I ask You of Your great bounty.',
    reference: 'Bukhari 1166',
    virtue: 'Recited before making important decisions, seeking Allah\'s guidance and wisdom.',
    target: 1,
  },
  {
    id: 'anxiety',
    title: 'Dua for Anxiety & Grief',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ',
    transliteration: 'Allahumma inni a\'udhu bika minal hammi wal hazan, wal \'ajzi wal kasal, wal bukhli wal jubn, wa dhala\'id-dayn wa ghalabatir-rijal',
    translation: 'O Allah, I seek refuge in You from worry and grief, from incapacity and laziness, from cowardice and miserliness, from being heavily in debt and from being overpowered by men.',
    reference: 'Bukhari 2893',
    virtue: 'The Prophet ﷺ used to frequently recite this dua to overcome anxiety and hardship.',
    target: 3,
  },
  {
    id: 'forgiveness',
    title: 'Sayyid al-Istighfar',
    arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ',
    transliteration: 'Allahumma anta Rabbi la ilaha illa anta, khalaqtani wa ana abduka, wa ana ala ahdika wa wa\'dika mastata\'tu',
    translation: 'O Allah, You are my Lord. None has the right to be worshipped except You. You created me and I am Your slave. I am faithful to my covenant and promise to You to the best of my ability.',
    reference: 'Bukhari 6306',
    virtue: 'The Master of Seeking Forgiveness. Whoever says it in the morning or evening with certainty and dies that day/night enters Paradise.',
    target: 1,
  },
  {
    id: 'entering-home',
    title: 'Dua Entering Home',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ الْمَوْلِجِ وَخَيْرَ الْمَخْرَجِ، بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا',
    transliteration: 'Allahumma inni as\'aluka khayral mawliji wa khayral makhraji, bismillahi walajna wa bismillahi kharajna wa \'alallahi rabbina tawakkalna',
    translation: 'O Allah, I ask You for the good of entering and leaving. In the Name of Allah we enter and in the Name of Allah we leave, and upon Allah our Lord we place our trust.',
    reference: 'Abu Dawud 5096',
    virtue: 'Recited upon entering the home to bring blessings and keep Shaytan out.',
    target: 1,
  },
  {
    id: 'before-sleep',
    title: 'Dua Before Sleep',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: 'Bismika Allahumma amutu wa ahya',
    translation: 'In Your name, O Allah, I die and I live.',
    reference: 'Bukhari 6312',
    virtue: 'The Prophet ﷺ recited this dua every night before sleeping.',
    target: 1,
  },
  {
    id: 'after-wudu',
    title: 'Dua After Wudu',
    arabic: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
    transliteration: 'Ash-hadu an la ilaha illallahu wahdahu la sharika lahu wa ash-hadu anna Muhammadan abduhu wa rasuluh',
    translation: 'I testify that none has the right to be worshipped except Allah alone, and I testify that Muhammad is His slave and Messenger.',
    reference: 'Muslim 234',
    virtue: 'The eight gates of Jannah are opened for the one who says this after wudu.',
    target: 1,
  },
];

function pad2(v: number) { return String(v).padStart(2, '0'); }
function getIsoWeekKey(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${pad2(weekNo)}`;
}
function readLocalInt(key: string) {
  try { const n = Math.floor(Number(localStorage.getItem(key))); return Number.isFinite(n) ? Math.max(0, n) : 0; } catch { return 0; }
}

export default function DuasPage() {
  const [activeDua, setActiveDua] = useState<Dua | null>(null);
  const [count, setCount] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [dayKey] = useState(() => new Date().toISOString().slice(0, 10));
  const [weekKey] = useState(() => getIsoWeekKey(new Date()));
  const [monthKey] = useState(() => new Date().toISOString().slice(0, 7));
  const [duaTotals, setDuaTotals] = useState<Record<string, { today: number; total: number }>>(() => {
    if (typeof window === 'undefined') return {};
    const result: Record<string, { today: number; total: number }> = {};
    DUA_LIST.forEach(d => {
      result[d.id] = {
        today: readLocalInt(`duas_day_${new Date().toISOString().slice(0, 10)}_${d.id}`),
        total: readLocalInt(`duas_total_${d.id}`),
      };
    });
    return result;
  });
  const [dayTotal, setDayTotal] = useState(0);
  const dayTotalRef = useRef(0);
  const weekTotalRef = useRef(0);
  const monthTotalRef = useRef(0);
  const lastSyncedRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    setDayTotal(readLocalInt(`duas_day_total_${dayKey}`));
    dayTotalRef.current = readLocalInt(`duas_day_total_${dayKey}`);
    weekTotalRef.current = readLocalInt(`duas_week_total_${weekKey}`);
    monthTotalRef.current = readLocalInt(`duas_month_total_${monthKey}`);

    const supabase = getSupabaseClient();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, [dayKey, weekKey, monthKey]);

  const playSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioRef.current) audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.setValueAtTime(750, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(); osc.stop(ctx.currentTime + 0.12);
    } catch {}
  };

  const syncToSupabase = async (nextDay: number, nextWeek: number, nextMonth: number) => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    if (lastSyncedRef.current === nextDay) return;
    const payload: Record<string, any> = { user_id: user.id, day: dayKey, activity: 'duas', count: nextDay };
    await Promise.all([
      supabase.from('user_daily_activity').upsert(payload, { onConflict: 'user_id,day,activity' }),
      supabase.from('user_weekly_activity').upsert({ user_id: user.id, week: weekKey, activity: 'duas', count: nextWeek }, { onConflict: 'user_id,week,activity' }),
      supabase.from('user_monthly_activity').upsert({ user_id: user.id, month: monthKey, activity: 'duas', count: nextMonth }, { onConflict: 'user_id,month,activity' }),
    ]);
    lastSyncedRef.current = nextDay;
  };

  const handleIncrement = () => {
    if (!activeDua) return;
    if (activeDua.target > 0 && count >= activeDua.target) return;

    const nextCount = count + 1;
    setCount(nextCount);
    if (activeDua.target > 0 && nextCount >= activeDua.target) setCompleted(true);

    // Update per-dua totals
    setDuaTotals(prev => {
      const cur = prev[activeDua.id] || { today: 0, total: 0 };
      const next = { today: cur.today + 1, total: cur.total + 1 };
      try {
        localStorage.setItem(`duas_day_${dayKey}_${activeDua.id}`, String(next.today));
        localStorage.setItem(`duas_total_${activeDua.id}`, String(next.total));
      } catch {}
      return { ...prev, [activeDua.id]: next };
    });

    // Update day/week/month totals
    const nextDay = dayTotalRef.current + 1;
    const nextWeek = weekTotalRef.current + 1;
    const nextMonth = monthTotalRef.current + 1;
    dayTotalRef.current = nextDay;
    weekTotalRef.current = nextWeek;
    monthTotalRef.current = nextMonth;
    setDayTotal(nextDay);
    try {
      localStorage.setItem(`duas_day_total_${dayKey}`, String(nextDay));
      localStorage.setItem(`duas_week_total_${weekKey}`, String(nextWeek));
      localStorage.setItem(`duas_month_total_${monthKey}`, String(nextMonth));
    } catch {}

    playSound();
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    void syncToSupabase(nextDay, nextWeek, nextMonth);
  };

  if (activeDua) {
    const totals = duaTotals[activeDua.id] || { today: 0, total: 0 };
    const pct = activeDua.target > 0 ? Math.min(1, count / activeDua.target) * 100 : 0;
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex flex-col">
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <button onClick={() => { setActiveDua(null); setCount(0); setCompleted(false); }} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h2 className="font-bold text-slate-800">{activeDua.title}</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Today: {totals.today} • Total: {totals.total}</p>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/tracker" className="p-2 rounded-full text-slate-600 hover:bg-slate-100" title="Tracker">
              <Trophy className="w-5 h-5" />
            </Link>
            <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-2 rounded-full ${soundEnabled ? 'text-teal-600 bg-teal-50' : 'text-slate-400'}`}>
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 max-w-md mx-auto w-full">
          <div className="text-center space-y-3 w-full">
            <p className="text-2xl font-arabic leading-relaxed text-slate-900" dir="rtl">{activeDua.arabic}</p>
            <p className="text-sm text-slate-500 italic">{activeDua.transliteration}</p>
            <p className="text-slate-600">"{activeDua.translation}"</p>
          </div>

          <div className="relative w-56 h-56 flex items-center justify-center">
            {activeDua.target > 0 && (
              <svg className="w-56 h-56 transform -rotate-90 absolute inset-0">
                <circle cx="112" cy="112" r="104" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200" />
                <circle cx="112" cy="112" r="104" stroke="currentColor" strokeWidth="8" fill="transparent"
                  strokeDasharray={2 * Math.PI * 104}
                  strokeDashoffset={2 * Math.PI * 104 - (pct / 100) * 2 * Math.PI * 104}
                  className={`transition-all duration-300 ${completed ? 'text-teal-600' : 'text-teal-400'}`} />
              </svg>
            )}
            <button
              onClick={handleIncrement}
              className={`absolute inset-2 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-10 ${completed ? 'bg-teal-600 text-white' : 'bg-white hover:bg-slate-50'}`}
            >
              <div className="text-center">
                {completed ? (
                  <Check className="w-16 h-16 mx-auto" />
                ) : (
                  <>
                    <span className={`text-5xl font-bold font-mono ${activeDua.target === 0 ? 'text-teal-600' : 'text-slate-800'}`}>{count}</span>
                    {activeDua.target > 0 && <p className="text-slate-400 text-base mt-1">/ {activeDua.target}</p>}
                  </>
                )}
              </div>
            </button>
          </div>

          {!completed && (
            <button onClick={() => { if (confirm('Reset counter?')) { setCount(0); } }} className="flex items-center gap-2 text-slate-400 hover:text-red-500 text-sm px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          )}

          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 text-sm text-teal-900 w-full">
            <p className="font-semibold mb-1">Virtue & Reference:</p>
            <p className="leading-relaxed opacity-90">{activeDua.virtue}</p>
            <p className="mt-2 text-xs font-medium opacity-70">{activeDua.reference}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-sm font-medium">
          <BookHeart className="w-4 h-4" />
          <span>Prophetic Duas</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Duas <span className="text-teal-600">Tracker</span></h1>
        <p className="text-slate-600 max-w-xl mx-auto">Authentic duas from the Sunnah with tracking. Select a dua to begin reciting.</p>
        <div className="flex items-center justify-center gap-3 text-sm">
          <span className="text-slate-500">Today: <span className="font-bold text-teal-700">{dayTotal.toLocaleString()}</span></span>
          {!user ? (
            <span className="text-slate-400 text-xs">
              <Link href="/auth?mode=signup" className="text-teal-700 font-semibold hover:underline">Sign in</Link> to sync
            </span>
          ) : (
            <span className="text-slate-500 text-xs">Saving to your account</span>
          )}
          <Link href="/tracker" className="inline-flex items-center gap-1 text-slate-700 font-semibold hover:underline">
            <Trophy className="w-4 h-4 text-amber-600" /> Tracker
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {DUA_LIST.map((dua) => {
          const totals = duaTotals[dua.id] || { today: 0, total: 0 };
          return (
            <button
              key={dua.id}
              onClick={() => { setActiveDua(dua); setCount(0); setCompleted(false); }}
              className="flex flex-col text-left bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-teal-300 transition-all group"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="bg-teal-50 text-teal-700 font-bold px-3 py-1 rounded-full text-sm">
                  {dua.target > 0 ? `${dua.target}×` : 'Unlimited'}
                </span>
                {totals.today >= dua.target && dua.target > 0 && (
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" /> Done
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-1 group-hover:text-teal-700 transition-colors">{dua.title}</h3>
              <p className="text-slate-500 text-sm flex-1 line-clamp-2 mb-3">"{dua.translation}"</p>
              <p className="text-right font-arabic text-xl text-slate-700 mb-3 leading-loose" dir="rtl">{dua.arabic.slice(0, 40)}…</p>
              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3 mt-auto">
                <span>Today: <span className="font-bold text-slate-600">{totals.today}</span></span>
                <span>Total: <span className="font-bold text-slate-600">{totals.total}</span></span>
                <span className="text-slate-300">{dua.reference}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
