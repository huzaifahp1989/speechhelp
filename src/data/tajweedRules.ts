/** Tajweed rule classes from Quran.com `text_uthmani_tajweed` markup. */
export type TajweedRuleId =
  | 'ham_wasl'
  | 'slnt'
  | 'laam_shamsiyah'
  | 'madda_normal'
  | 'madda_permissible'
  | 'madda_obligatory'
  | 'madda_necessary'
  | 'ghunnah'
  | 'ikhafa'
  | 'ikhafa_shafawi'
  | 'idgham_ghunnah'
  | 'idgham_wo_ghunnah'
  | 'idgham_shafawi'
  | 'idgham_mutajanisayn'
  | 'idgham_mutaqaribayn'
  | 'iqlab'
  | 'qalaqah'
  | 'custom'
  | 'end';

export type TajweedRule = {
  id: TajweedRuleId;
  label: string;
  labelAr?: string;
  color: string;
  description: string;
};

/** Each rule has its own colour (KFGQPC / Quran.com palette, differentiated per rule). */
export const TAJWEED_RULES: TajweedRule[] = [
  {
    id: 'ham_wasl',
    label: 'Hamzat al-Wasl',
    labelAr: 'همزة الوصل',
    color: '#9CA3AF',
    description: 'Connective hamza — not pronounced when continuing.',
  },
  {
    id: 'slnt',
    label: 'Silent',
    labelAr: 'ساكن',
    color: '#6B7280',
    description: 'Silent letter.',
  },
  {
    id: 'laam_shamsiyah',
    label: 'Lam Shamsiyyah',
    labelAr: 'لام شمسية',
    color: '#D1D5DB',
    description: 'Sun letter — lam assimilates into the next letter.',
  },
  {
    id: 'madda_normal',
    label: 'Normal Madd',
    labelAr: 'مد طبيعي',
    color: '#537FFF',
    description: 'Natural lengthening (2 counts).',
  },
  {
    id: 'madda_permissible',
    label: 'Permissible Madd',
    labelAr: 'مد جائز',
    color: '#6366F1',
    description: 'Permissible lengthening (2, 4, or 6 counts).',
  },
  {
    id: 'madda_obligatory',
    label: 'Obligatory Madd',
    labelAr: 'مد واجب',
    color: '#1D4ED8',
    description: 'Required lengthening (4 or 5 counts).',
  },
  {
    id: 'madda_necessary',
    label: 'Necessary Madd',
    labelAr: 'مد لازم',
    color: '#000EBC',
    description: 'Compulsory lengthening (6 counts).',
  },
  {
    id: 'ghunnah',
    label: 'Ghunnah',
    labelAr: 'غنة',
    color: '#FF7E1E',
    description: 'Nasal sound (~2 counts).',
  },
  {
    id: 'ikhafa',
    label: 'Ikhfa',
    labelAr: 'إخفاء',
    color: '#9400A8',
    description: 'Hidden noon/tanween with ghunnah.',
  },
  {
    id: 'ikhafa_shafawi',
    label: 'Ikhfa Shafawi',
    labelAr: 'إخفاء شفوي',
    color: '#C026D3',
    description: 'Hidden meem with ghunnah.',
  },
  {
    id: 'idgham_ghunnah',
    label: 'Idgham with Ghunnah',
    labelAr: 'إدغام بغنة',
    color: '#169777',
    description: 'Merging with nasal sound.',
  },
  {
    id: 'idgham_wo_ghunnah',
    label: 'Idgham without Ghunnah',
    labelAr: 'إدغام بلا غنة',
    color: '#059669',
    description: 'Merging without ghunnah (lam & ra).',
  },
  {
    id: 'idgham_shafawi',
    label: 'Idgham Shafawi',
    labelAr: 'إدغام شفوي',
    color: '#10B981',
    description: 'Labial merging of meem into meem.',
  },
  {
    id: 'idgham_mutajanisayn',
    label: 'Idgham Mutajanisayn',
    labelAr: 'متجانسين',
    color: '#047857',
    description: 'Merging of similar letters.',
  },
  {
    id: 'idgham_mutaqaribayn',
    label: 'Idgham Mutaqaribayn',
    labelAr: 'متقاربين',
    color: '#065F46',
    description: 'Merging of close letters.',
  },
  {
    id: 'iqlab',
    label: 'Iqlab',
    labelAr: 'إقلاب',
    color: '#26BFFD',
    description: 'Noon/tanween becomes meem before ba.',
  },
  {
    id: 'qalaqah',
    label: 'Qalqalah',
    labelAr: 'قلقلة',
    color: '#DD0008',
    description: 'Echo/bounce on qalqalah letters.',
  },
  {
    id: 'custom',
    label: 'Tajweed emphasis',
    labelAr: 'تجويد',
    color: '#7C3AED',
    description: 'Special tajweed marking on this letter.',
  },
  {
    id: 'end',
    label: 'Ayah marker',
    color: '#94a3b8',
    description: 'End of ayah symbol in mushaf.',
  },
];

const ruleMap = new Map<string, TajweedRule>(
  TAJWEED_RULES.map((r) => [r.id, r])
);

/** Rules shown in the legend (excluding ayah marker). */
export const TAJWEED_DISPLAY_RULES = TAJWEED_RULES.filter((r) => r.id !== 'end');

export function getTajweedRule(id: string): TajweedRule | undefined {
  return ruleMap.get(normalizeTajweedRuleId(id)) ?? ruleMap.get(id);
}

export function getTajweedColor(id: string): string {
  return ruleMap.get(normalizeTajweedRuleId(id))?.color ?? ruleMap.get(id)?.color ?? 'inherit';
}

/** Map word-level API rule ids to display rules. */
export function normalizeTajweedRuleId(id: string): string {
  if (id.startsWith('custom')) return 'custom';
  switch (id) {
    case 'madda_obligatory_monfasel':
    case 'madda_obligatory_mottasel':
      return 'madda_obligatory';
    default:
      return id;
  }
}

/** All tajweed rule ids present in word/verse markup. */
export function extractTajweedRulesFromMarkup(html?: string | null): string[] {
  if (!html) return [];
  const ids = new Set<string>();
  const re = /<(?:tajweed|rule) class=([\w-]+)>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    ids.add(normalizeTajweedRuleId(match[1]));
  }
  return [...ids];
}

/** Inline style for coloured tajweed spans (text + subtle highlight). */
export function getTajweedStyle(id: string): { color: string; backgroundColor?: string } {
  const color = getTajweedColor(id);
  if (color === 'inherit') return { color };
  return {
    color,
    backgroundColor: `${color}1A`,
  };
}

/** Rules shown in legend (grouped by category). */
export const TAJWEED_LEGEND_GROUPS = [
  { title: 'Silent / connective', ids: ['ham_wasl', 'slnt', 'laam_shamsiyah'] as TajweedRuleId[] },
  { title: 'Madd (lengthening)', ids: ['madda_normal', 'madda_permissible', 'madda_obligatory', 'madda_necessary'] as TajweedRuleId[] },
  { title: 'Ghunnah & hiding', ids: ['ghunnah', 'ikhafa', 'ikhafa_shafawi'] as TajweedRuleId[] },
  { title: 'Idgham (merging)', ids: ['idgham_ghunnah', 'idgham_wo_ghunnah', 'idgham_shafawi', 'idgham_mutajanisayn', 'idgham_mutaqaribayn'] as TajweedRuleId[] },
  { title: 'Iqlab & Qalqalah', ids: ['iqlab', 'qalaqah'] as TajweedRuleId[] },
];

export const TAJWEED_STORAGE_KEY = 'quran_tajweed_enabled';

export function getStoredTajweedEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = localStorage.getItem(TAJWEED_STORAGE_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

export function storeTajweedEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(TAJWEED_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch { /* ignore */ }
}
