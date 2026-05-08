'use client';

import { useState, useEffect } from 'react';
import { JUZ_DATA } from '@/data/juzData';
import { CheckCircle, User, RefreshCw, BookOpen, Calendar } from 'lucide-react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';

type JuzStatus = {
  reserved: boolean;
  reciterName: string;
};

type KhatamState = Record<number, JuzStatus>;

export default function KhatamPage() {
  const [khatamState, setKhatamState] = useState<KhatamState>({});
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);
  const [reciterName, setReciterName] = useState('');
  const [mounted, setMounted] = useState(false);
  const [monthKey] = useState(() => new Date().toISOString().slice(0, 7));
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [monthReserved, setMonthReserved] = useState(0);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('khatamState');
    if (savedState) {
      setKhatamState(JSON.parse(savedState));
    }
    try {
      const savedMonth = localStorage.getItem(`khatam_month_total_${monthKey}`);
      if (savedMonth) setMonthReserved(Number(savedMonth) || 0);
    } catch {}
    setMounted(true);
  }, [monthKey]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) {
        const displayName = (u.user_metadata as any)?.display_name || u.email || '';
        if (displayName) {
          setReciterName((prev) => (prev.trim().length > 0 ? prev : displayName));
        }
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const displayName = (u.user_metadata as any)?.display_name || u.email || '';
        if (displayName) {
          setReciterName((prev) => (prev.trim().length > 0 ? prev : displayName));
        }
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('khatamState', JSON.stringify(khatamState));
    }
  }, [khatamState, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(`khatam_month_total_${monthKey}`, String(monthReserved));
    } catch {}
  }, [monthKey, monthReserved, mounted]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;

    const run = async () => {
      const { data } = await supabase
        .from('user_monthly_activity')
        .select('count')
        .eq('user_id', user.id)
        .eq('month', monthKey)
        .eq('activity', 'khatam')
        .maybeSingle();

      const remoteCount = Number((data as any)?.count || 0);
      const merged = Math.max(monthReserved, remoteCount);
      setMonthReserved(merged);

      if (merged > remoteCount) {
        await supabase.from('user_monthly_activity').upsert(
          { user_id: user.id, month: monthKey, activity: 'khatam', count: merged },
          { onConflict: 'user_id,month,activity' }
        );
      }
    };

    run();
  }, [monthKey, user?.id]);

  const handleSelect = (juzId: number) => {
    setSelectedJuz(juzId);
    if (user) {
      const displayName = (user.user_metadata as any)?.display_name || user.email || '';
      setReciterName(displayName || '');
    } else {
      setReciterName('');
    }
  };

  const handleSubmit = async (juzId: number) => {
    if (!reciterName.trim()) return;

    setKhatamState(prev => ({
      ...prev,
      [juzId]: {
        reserved: true,
        reciterName: reciterName.trim()
      }
    }));
    setSelectedJuz(null);
    setReciterName('');

    const nextMonthReserved = monthReserved + 1;
    setMonthReserved(nextMonthReserved);

    const supabase = getSupabaseClient();
    if (supabase && user) {
      await supabase.from('user_monthly_activity').upsert(
        { user_id: user.id, month: monthKey, activity: 'khatam', count: nextMonthReserved },
        { onConflict: 'user_id,month,activity' }
      );
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset the entire Khatam list? This cannot be undone.')) {
      setKhatamState({});
      localStorage.removeItem('khatamState');
    }
  };

  const completedCount = Object.values(khatamState).filter(s => s.reserved).length;
  const progressPercentage = Math.round((completedCount / 30) * 100);
  
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <BookOpen className="w-8 h-8 text-emerald-600" />
          <h1 className="text-4xl font-serif font-bold text-slate-800">Monthly Community Khatam</h1>
        </div>
        
        <div className="flex items-center justify-center gap-2 mb-8 text-emerald-700 font-medium text-lg">
          <Calendar className="w-5 h-5" />
          <span>{currentMonth}</span>
        </div>

        {/* Progress Bar */}
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-slate-600">Progress</span>
            <span className="text-sm font-bold text-emerald-600">{progressPercentage}% Completed</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-4 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            {completedCount} of 30 Juz reserved
          </p>
          <div className="mt-4 text-center text-sm text-slate-600">
            Your month: <span className="font-bold text-emerald-700">{monthReserved.toLocaleString()}</span>
            {!user && (
              <div className="mt-1">
                <div className="flex items-center justify-center gap-2">
                  <Link href="/auth?mode=signup" className="text-emerald-700 font-semibold hover:underline">
                    Sign up
                  </Link>
                  <span className="text-slate-300">/</span>
                  <Link href="/auth" className="text-emerald-700 font-semibold hover:underline">
                    Sign in
                  </Link>
                  <span className="text-slate-400">to save</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Section */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {JUZ_DATA.map((juz) => {
          const status = khatamState[juz.id];
          const isReserved = status?.reserved;
          const isSelected = selectedJuz === juz.id;

          return (
            <div 
              key={juz.id}
              className={`
                relative overflow-hidden rounded-xl border transition-all duration-300
                ${isReserved 
                  ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
                  : 'bg-white border-slate-200 hover:shadow-md hover:border-emerald-200'
                }
              `}
            >
              {/* Card Header */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className={`text-xl font-bold ${isReserved ? 'text-emerald-800' : 'text-slate-700'}`}>
                      {juz.label}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Starts: {juz.start}
                    </p>
                  </div>
                  {isReserved ? (
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-serif text-sm">
                      {juz.id}
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="mt-4">
                  {isReserved ? (
                    <div className="bg-white/50 rounded-lg p-3 border border-emerald-100">
                      <div className="flex items-center gap-2 text-emerald-700 mb-1">
                        <User className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Reserved By</span>
                      </div>
                      <p className="text-lg font-medium text-emerald-900 pl-6">
                        {status.reciterName}
                      </p>
                    </div>
                  ) : isSelected ? (
                    <div className="animate-in fade-in zoom-in duration-200">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Enter Reciter Name
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={reciterName}
                          onChange={(e) => setReciterName(e.target.value)}
                          placeholder="Your Name"
                          className="flex-1 rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm p-2 border"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSubmit(juz.id);
                            if (e.key === 'Escape') setSelectedJuz(null);
                          }}
                        />
                        <button
                          onClick={() => handleSubmit(juz.id)}
                          disabled={!reciterName.trim()}
                          className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Confirm
                        </button>
                      </div>
                      <button 
                        onClick={() => setSelectedJuz(null)}
                        className="text-xs text-slate-400 mt-2 hover:text-slate-600 underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelect(juz.id)}
                      className="w-full py-3 px-4 bg-white border border-emerald-600 text-emerald-600 rounded-lg text-sm font-semibold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2 group"
                    >
                      <span>Select for Recitation</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Decorative Gold Accent */}
              <div className={`h-1 w-full ${isReserved ? 'bg-amber-400' : 'bg-slate-100'}`}></div>
            </div>
          );
        })}
      </div>

      {/* Admin Reset Button (Footer) */}
      <div className="max-w-7xl mx-auto mt-16 text-center border-t border-slate-200 pt-8">
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-red-500 text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reset All Data (Admin Only)</span>
        </button>
      </div>
    </div>
  );
}
