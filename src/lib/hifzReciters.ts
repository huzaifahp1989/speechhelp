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
      if (RECITERS.some((reciter) => reciter.id === id)) return id;
    }
  }
  return 103;
}

export function setDefaultHifzReciterId(id: number): void {
  if (typeof window !== 'undefined' && RECITERS.some((reciter) => reciter.id === id)) {
    localStorage.setItem('hifz_preferred_reciter', String(id));
  }
}

export function getDefaultHifzSpeed(): number {
  if (typeof window !== 'undefined') {
    const speed = Number(localStorage.getItem('hifz_preferred_speed'));
    if ((HIFZ_SPEED_OPTIONS as readonly number[]).includes(speed)) return speed;
  }
  return 1;
}

export function setDefaultHifzSpeed(speed: number): void {
  if (typeof window !== 'undefined' && (HIFZ_SPEED_OPTIONS as readonly number[]).includes(speed)) {
    localStorage.setItem('hifz_preferred_speed', String(speed));
  }
}

export const HIFZ_REPEAT_OPTIONS = [
  { value: 1, label: 'Once' },
  { value: 3, label: '3×' },
  { value: 6, label: '6×' },
  { value: 10, label: '10×' },
  { value: 20, label: '20×' },
  { value: 50, label: '50×' },
  { value: 100, label: '100×' },
  { value: Infinity, label: 'Continuous' },
] as const;

export const HIFZ_SPEED_OPTIONS = [0.5, 0.75, 1, 1.25] as const;

export function repeatCountToNumber(count: number | 'continuous'): number {
  return count === 'continuous' || count === Infinity ? Infinity : count;
}
