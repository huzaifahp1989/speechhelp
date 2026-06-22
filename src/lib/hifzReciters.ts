import { RECITERS } from '@/data/reciters';

/** Curated reciters for Hifz memorisation mode */
export const HIFZ_RECITER_IDS = [
  103, // Maher Al-Muaiqly
  105, // Yasser Al-Dosari
  132, // Badr Al-Turki
  3,   // Abdul Rahman Al-Sudais
  10,  // Saud Al-Shuraim
] as const;

export const HIFZ_RECITERS = HIFZ_RECITER_IDS.map((id) => RECITERS.find((r) => r.id === id)!).filter(Boolean);

export function isHifzReciter(id: number): boolean {
  return (HIFZ_RECITER_IDS as readonly number[]).includes(id);
}

export function getDefaultHifzReciterId(): number {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('hifz_preferred_reciter');
    if (stored) {
      const id = parseInt(stored, 10);
      if (isHifzReciter(id)) return id;
    }
  }
  return 103;
}

export function setDefaultHifzReciterId(id: number): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('hifz_preferred_reciter', String(id));
  }
}

export const HIFZ_REPEAT_OPTIONS = [
  { value: 1, label: 'Once' },
  { value: 3, label: '3×' },
  { value: 5, label: '5×' },
  { value: 10, label: '10×' },
  { value: 20, label: '20×' },
  { value: Infinity, label: 'Continuous' },
] as const;

export const HIFZ_SPEED_OPTIONS = [0.5, 0.75, 1, 1.25] as const;

export function repeatCountToNumber(count: number | 'continuous'): number {
  return count === 'continuous' || count === Infinity ? Infinity : count;
}
