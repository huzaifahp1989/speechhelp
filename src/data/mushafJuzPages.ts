/** Start page for each juz in IndoPak 13-line mushaf (Quran.com mushaf ID 17) */
export type JuzPageInfo = {
  juz: number;
  startPage: number;
  startVerse: string;
  label: string;
  /** Short English name shown in mushaf header (e.g. Qad-Aflaha) */
  shortName: string;
};

export const MUSHAF_JUZ_PAGES: JuzPageInfo[] = [
  { juz: 1, startPage: 1, startVerse: '1:1', label: 'Juz 1 — Al-Fatiha', shortName: 'Al-Fatiha' },
  { juz: 2, startPage: 22, startVerse: '2:142', label: 'Juz 2 — Al-Baqarah', shortName: 'Sayaqool' },
  { juz: 3, startPage: 42, startVerse: '2:253', label: 'Juz 3 — Al-Baqarah', shortName: 'Tilkal Rusul' },
  { juz: 4, startPage: 62, startVerse: '3:93', label: 'Juz 4 — Aal-E-Imran', shortName: 'Lan Tanaloo' },
  { juz: 5, startPage: 82, startVerse: '4:24', label: 'Juz 5 — An-Nisa', shortName: 'Wal Mohsanat' },
  { juz: 6, startPage: 102, startVerse: '4:148', label: 'Juz 6 — An-Nisa', shortName: 'La Yuhibbullah' },
  { juz: 7, startPage: 121, startVerse: '5:82', label: 'Juz 7 — Al-Ma\'idah', shortName: 'Wa Iza Samiu' },
  { juz: 8, startPage: 142, startVerse: '6:111', label: 'Juz 8 — Al-An\'am', shortName: 'Wa Lau Annana' },
  { juz: 9, startPage: 162, startVerse: '7:88', label: 'Juz 9 — Al-A\'raf', shortName: 'Qalal Malao' },
  { juz: 10, startPage: 182, startVerse: '8:41', label: 'Juz 10 — Al-Anfal', shortName: 'Wa A\'lamu' },
  { juz: 11, startPage: 201, startVerse: '9:93', label: 'Juz 11 — At-Tawbah', shortName: 'Yatazeroon' },
  { juz: 12, startPage: 222, startVerse: '11:6', label: 'Juz 12 — Hud', shortName: 'Wa Mamin Da\'abat' },
  { juz: 13, startPage: 242, startVerse: '12:53', label: 'Juz 13 — Yusuf', shortName: 'Wa Ma Ubarri\'u' },
  { juz: 14, startPage: 262, startVerse: '15:1', label: 'Juz 14 — Al-Hijr', shortName: 'Rubama' },
  { juz: 15, startPage: 282, startVerse: '17:1', label: 'Juz 15 — Al-Isra', shortName: 'Subhanallazi' },
  { juz: 16, startPage: 302, startVerse: '18:75', label: 'Juz 16 — Al-Kahf', shortName: 'Qal Alam' },
  { juz: 17, startPage: 322, startVerse: '21:1', label: 'Juz 17 — Al-Anbiya', shortName: 'Iqtaraba' },
  { juz: 18, startPage: 342, startVerse: '23:1', label: 'Juz 18 — Al-Mu\'minun', shortName: 'Qad-Aflaha' },
  { juz: 19, startPage: 362, startVerse: '25:21', label: 'Juz 19 — Al-Furqan', shortName: 'Wa Qalallazina' },
  { juz: 20, startPage: 382, startVerse: '27:56', label: 'Juz 20 — An-Naml', shortName: 'A\'man Khalaq' },
  { juz: 21, startPage: 402, startVerse: '29:46', label: 'Juz 21 — Al-Ankabut', shortName: 'Utlu Ma Oohi' },
  { juz: 22, startPage: 422, startVerse: '33:31', label: 'Juz 22 — Al-Ahzab', shortName: 'Wa Man Yaqnut' },
  { juz: 23, startPage: 442, startVerse: '36:28', label: 'Juz 23 — Ya-Sin', shortName: 'Wa Maliy' },
  { juz: 24, startPage: 462, startVerse: '39:32', label: 'Juz 24 — Az-Zumar', shortName: 'Faman Azlam' },
  { juz: 25, startPage: 482, startVerse: '41:47', label: 'Juz 25 — Fussilat', shortName: 'Elahayus' },
  { juz: 26, startPage: 502, startVerse: '46:1', label: 'Juz 26 — Al-Ahqaf', shortName: 'Ha\'a Meem' },
  { juz: 27, startPage: 522, startVerse: '51:31', label: 'Juz 27 — Adh-Dhariyat', shortName: 'Qal Fama Khatbukum' },
  { juz: 28, startPage: 542, startVerse: '58:1', label: 'Juz 28 — Al-Mujadila', shortName: 'Qad Sami' },
  { juz: 29, startPage: 562, startVerse: '67:1', label: 'Juz 29 — Al-Mulk', shortName: 'Tabarakallazi' },
  { juz: 30, startPage: 582, startVerse: '78:1', label: 'Juz 30 — An-Naba', shortName: 'Amma Yatasa\'aloon' },
];

export function getJuzForPage(page: number): number {
  let juz = 1;
  for (const entry of MUSHAF_JUZ_PAGES) {
    if (page >= entry.startPage) juz = entry.juz;
    else break;
  }
  return juz;
}

export function getJuzStartPage(juz: number): number {
  const entry = MUSHAF_JUZ_PAGES.find((j) => j.juz === juz);
  return entry?.startPage ?? 1;
}

export function getJuzEndPage(juz: number): number {
  const next = MUSHAF_JUZ_PAGES.find((j) => j.juz === juz + 1);
  if (next) return next.startPage - 1;
  return 604;
}

export function getJuzInfo(juz: number): JuzPageInfo | undefined {
  return MUSHAF_JUZ_PAGES.find((j) => j.juz === juz);
}
