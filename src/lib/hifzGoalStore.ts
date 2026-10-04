import { getSupabaseClient } from '@/lib/supabaseClient';

export type HifzGoalPlan = {
  id: string;
  goalType?: 'full_quran' | 'juz';
  targetJuz?: number;
  startSurah: number;
  startAyah: number;
  endSurah?: number;
  endAyah?: number;
  dailyAmount: number;
  currentSurah: number;
  currentAyah: number;
  createdAt: string;
  lastPracticed: string | null;
  streak: number;
  dailyMinutes?: number;
  studyDays?: number[];
  targetDate?: string;
  goalCompleted?: boolean;
};

const STORAGE_KEY = 'hifz_plan';

function isHifzGoalPlan(value: unknown): value is HifzGoalPlan {
  if (!value || typeof value !== 'object') return false;
  const plan = value as Partial<HifzGoalPlan>;
  return typeof plan.id === 'string'
    && typeof plan.startSurah === 'number'
    && typeof plan.startAyah === 'number'
    && typeof plan.dailyAmount === 'number'
    && typeof plan.currentSurah === 'number'
    && typeof plan.currentAyah === 'number'
    && typeof plan.createdAt === 'string'
    && typeof plan.streak === 'number';
}

function saveLocalGoal(plan: HifzGoalPlan): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  }
}

function readLocalGoal(): HifzGoalPlan | null {
  if (typeof window === 'undefined') return null;
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    return isHifzGoalPlan(value) ? value : null;
  } catch {
    return null;
  }
}

export async function loadHifzGoal(): Promise<{ plan: HifzGoalPlan | null; synced: boolean }> {
  const localPlan = readLocalGoal();
  const supabase = getSupabaseClient();
  if (!supabase) return { plan: localPlan, synced: false };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { plan: localPlan, synced: false };

    const { data, error } = await supabase
      .from('hifz_goals')
      .select('plan')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) return { plan: localPlan, synced: false };
    if (isHifzGoalPlan(data?.plan)) {
      saveLocalGoal(data.plan);
      return { plan: data.plan, synced: true };
    }
    if (!localPlan) return { plan: null, synced: true };

    const synced = await saveHifzGoal(localPlan);
    return { plan: localPlan, synced: synced === 'synced' };
  } catch {
    return { plan: localPlan, synced: false };
  }
}

export async function saveHifzGoal(plan: HifzGoalPlan): Promise<'synced' | 'local'> {
  saveLocalGoal(plan);
  const supabase = getSupabaseClient();
  if (!supabase) return 'local';

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return 'local';

    const { error } = await supabase.from('hifz_goals').upsert({
      user_id: session.user.id,
      goal_id: plan.id,
      goal_type: plan.goalType ?? 'full_quran',
      target_juz: plan.targetJuz ?? null,
      start_surah: plan.startSurah,
      start_ayah: plan.startAyah,
      end_surah: plan.endSurah ?? null,
      end_ayah: plan.endAyah ?? null,
      daily_ayah_target: plan.dailyAmount,
      daily_minutes: plan.dailyMinutes ?? 20,
      study_days: plan.studyDays ?? [1, 2, 3, 4, 5, 6],
      target_date: plan.targetDate || null,
      status: plan.goalCompleted ? 'completed' : 'active',
      plan,
    }, { onConflict: 'user_id' });

    return error ? 'local' : 'synced';
  } catch {
    return 'local';
  }
}

export async function deleteHifzGoal(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
    return true;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { error } = await supabase.from('hifz_goals').delete().eq('user_id', session.user.id);
      if (error) return false;
    }
    if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}