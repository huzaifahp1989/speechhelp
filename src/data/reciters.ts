export type ReciterSource = 'quran.com' | 'everyayah';

export type Reciter = {
  id: number;
  name: string;
  urlPrefix?: string;
  /** Short label for compact UI */
  shortName?: string;
  source: ReciterSource;
};

/** Quran.com recitation IDs + EveryAyah CDN (ayah-per-file, matches verse keys). */
export const RECITERS: Reciter[] = [
  // —— Quran.com (word timestamps + ayah audio from same reciter) ——
  { id: 7, name: 'Mishary Rashid Alafasy', shortName: 'Alafasy', source: 'quran.com' },
  { id: 6, name: 'Mahmoud Khalil Al-Husary', shortName: 'Husary', source: 'quran.com' },
  { id: 3, name: 'Abdur-Rahman as-Sudais', shortName: 'Sudais', source: 'quran.com' },
  { id: 10, name: 'Saud Al-Shuraim', shortName: 'Shuraim', source: 'quran.com' },
  { id: 2, name: 'AbdulBaset AbdulSamad (Murattal)', shortName: 'AbdulBaset Mur.', source: 'quran.com' },
  { id: 1, name: 'AbdulBaset AbdulSamad (Mujawwad)', shortName: 'AbdulBaset Muj.', source: 'quran.com' },
  { id: 9, name: 'Mohamed Siddiq al-Minshawi (Murattal)', shortName: 'Minshawi Mur.', source: 'quran.com' },
  { id: 8, name: 'Mohamed Siddiq al-Minshawi (Mujawwad)', shortName: 'Minshawi Muj.', source: 'quran.com' },
  { id: 4, name: 'Abu Bakr al-Shatri', shortName: 'Shatri', source: 'quran.com' },
  { id: 5, name: 'Hani ar-Rifai', shortName: 'Rifai', source: 'quran.com' },
  { id: 11, name: 'Mohamed al-Tablawi', shortName: 'Tablawi', source: 'quran.com' },
  { id: 12, name: 'Mahmoud Khalil Al-Husary (Muallim)', shortName: 'Husary Muallim', source: 'quran.com' },

  // —— EveryAyah (clear per-ayah files; word taps use wbw clips tied to Uthmani text) ——
  { id: 101, name: 'Mishary Alafasy (EveryAyah)', shortName: 'Alafasy EA', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Alafasy_128kbps' },
  { id: 121, name: 'Mishary Alafasy 64kbps', shortName: 'Alafasy 64', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Alafasy_64kbps' },
  { id: 102, name: 'Saad Al-Ghamdi', shortName: 'Ghamdi', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Ghamadi_40kbps' },
  { id: 103, name: 'Maher Al-Muaiqly', shortName: 'Muaiqly', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Maher_AlMuaiqly_64kbps' },
  { id: 122, name: 'Mahmoud Khalil Al-Husary (EveryAyah)', shortName: 'Husary EA', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Husary_128kbps' },
  { id: 123, name: 'Husary Muallim (EveryAyah)', shortName: 'Husary Muallim EA', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Husary_Muallim_128kbps' },
  { id: 107, name: 'Abdur-Rahman as-Sudais (EveryAyah)', shortName: 'Sudais EA', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Abdurrahmaan_As-Sudais_192kbps' },
  { id: 124, name: 'AbdulBaset Murattal (EveryAyah)', shortName: 'AbdulBaset Mur. EA', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Abdul_Basit_Murattal_192kbps' },
  { id: 116, name: 'AbdulBaset Mujawwad (EveryAyah)', shortName: 'AbdulBaset Muj. EA', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Abdul_Basit_Mujawwad_128kbps' },
  { id: 125, name: 'Abu Bakr Ash-Shaatree (EveryAyah)', shortName: 'Shaatree EA', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Abu_Bakr_Ash-Shaatree_128kbps' },
  { id: 117, name: 'Minshawy Murattal (EveryAyah)', shortName: 'Minshawi EA', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Minshawy_Murattal_128kbps' },
  { id: 106, name: 'Ali Al-Hudhaify', shortName: 'Hudhaify', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Hudhaify_128kbps' },
  { id: 130, name: 'Ali Al-Hudhaify 64kbps', shortName: 'Hudhaify 64', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Hudhaify_64kbps' },
  { id: 104, name: 'Salah Al-Budair', shortName: 'Budair', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Salah_Al_Budair_128kbps' },
  { id: 105, name: 'Yasser Al-Dosari', shortName: 'Dosari', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps' },
  { id: 108, name: 'Muhammad Ayyub', shortName: 'Ayyub', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Muhammad_Ayyoub_128kbps' },
  { id: 131, name: 'Muhammad Ayyub 64kbps', shortName: 'Ayyub 64', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Muhammad_Ayyoub_64kbps' },
  { id: 109, name: 'Nasser Al-Qatami', shortName: 'Qatami', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Nasser_Alqatami_128kbps' },
  { id: 110, name: 'Fares Abbad', shortName: 'Abbad', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Fares_Abbad_64kbps' },
  { id: 111, name: 'Muhammad Jibreel', shortName: 'Jibreel', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Muhammad_Jibreel_128kbps' },
  { id: 112, name: 'Abdullah Basfar', shortName: 'Basfar', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Abdullah_Basfar_192kbps' },
  { id: 115, name: 'Abdullah Al-Juhany', shortName: 'Juhany', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Abdullaah_3awwaad_Al-Juhaynee_128kbps' },
  { id: 118, name: 'Hani ar-Rifai (EveryAyah)', shortName: 'Rifai EA', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Hani_Rifai_192kbps' },
  { id: 126, name: 'Aziz Alili', shortName: 'Alili', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Aziz_Alili_128kbps' },
  { id: 127, name: 'Akram Al-Aalaqmi', shortName: 'Aalaqmi', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Akram_AlAlaqimy_128kbps' },
  { id: 128, name: 'Ali Hajjaj Al-Suesy', shortName: 'Al-Suesy', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Ali_Hajjaj_AlSuesy_128kbps' },
  { id: 129, name: 'Ali Jaber', shortName: 'Jaber', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Ali_Jaber_64kbps' },
  { id: 113, name: 'Ahmed Neana', shortName: 'Neana', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Ahmed_Neana_128kbps' },
  { id: 114, name: 'Ibrahim Akhdar', shortName: 'Akhdar', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Ibrahim_Akhdar_32kbps' },
  { id: 119, name: 'Mustafa Ismail', shortName: 'Ismail', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/Mustafa_Ismail_48kbps' },
  { id: 120, name: 'Mahmoud Ali Al-Banna', shortName: 'Banna', source: 'everyayah', urlPrefix: 'https://everyayah.com/data/mahmoud_ali_al_banna_32kbps' },
];

export const RECITER_GROUPS: { label: string; ids: number[] }[] = [
  {
    label: 'Quran.com',
    ids: RECITERS.filter((r) => r.source === 'quran.com').map((r) => r.id),
  },
  {
    label: 'EveryAyah',
    ids: RECITERS.filter((r) => r.source === 'everyayah').map((r) => r.id),
  },
];

export function getReciterById(id: number): Reciter | undefined {
  return RECITERS.find((r) => r.id === id);
}

export function isCustomReciter(id: number): boolean {
  return getReciterById(id)?.source === 'everyayah';
}

export function supportsReciterWordTimestamps(id: number): boolean {
  return getReciterById(id)?.source === 'quran.com';
}
