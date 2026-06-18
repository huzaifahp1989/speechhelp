export type Reciter = {
  id: number;
  name: string;
  urlPrefix?: string;
  /** Short label for compact UI */
  shortName?: string;
};

/** Quran.com recitation IDs + EveryAyah CDN reciters (urlPrefix) */
export const RECITERS: Reciter[] = [
  // —— Quran.com API ——
  { id: 7, name: 'Mishary Rashid Alafasy', shortName: 'Alafasy' },
  { id: 1, name: 'AbdulBaset AbdulSamad (Mujawwad)', shortName: 'AbdulBaset Muj.' },
  { id: 2, name: 'AbdulBaset AbdulSamad (Murattal)', shortName: 'AbdulBaset Mur.' },
  { id: 3, name: 'Abdur-Rahman as-Sudais', shortName: 'Sudais' },
  { id: 4, name: 'Abu Bakr al-Shatri', shortName: 'Shatri' },
  { id: 5, name: 'Hani ar-Rifai', shortName: 'Rifai' },
  { id: 6, name: 'Mahmoud Khalil Al-Husary', shortName: 'Husary' },
  { id: 8, name: 'Mohamed Siddiq al-Minshawi (Mujawwad)', shortName: 'Minshawi Muj.' },
  { id: 9, name: 'Mohamed Siddiq al-Minshawi (Murattal)', shortName: 'Minshawi Mur.' },
  { id: 10, name: 'Saud Al-Shuraim', shortName: 'Shuraim' },
  { id: 11, name: 'Mohamed al-Tablawi', shortName: 'Tablawi' },
  { id: 12, name: 'Mahmoud Khalil Al-Husary (Muallim)', shortName: 'Husary Muallim' },

  // —— EveryAyah (great for Hifz — clear murattal) ——
  { id: 101, name: 'Mishary Alafasy (EveryAyah)', shortName: 'Alafasy EA', urlPrefix: 'https://everyayah.com/data/Alafasy_128kbps' },
  { id: 102, name: 'Saad Al-Ghamdi', shortName: 'Ghamdi', urlPrefix: 'https://everyayah.com/data/Ghamadi_40kbps' },
  { id: 103, name: 'Maher Al-Muaiqly', shortName: 'Muaiqly', urlPrefix: 'https://everyayah.com/data/Maher_AlMuaiqly_64kbps' },
  { id: 104, name: 'Salah Al-Budair', shortName: 'Budair', urlPrefix: 'https://everyayah.com/data/Salah_Al_Budair_128kbps' },
  { id: 105, name: 'Yasser Al-Dosari', shortName: 'Dosari', urlPrefix: 'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps' },
  { id: 106, name: 'Ali Al-Hudhaify', shortName: 'Hudhaify', urlPrefix: 'https://everyayah.com/data/Hudhaify_128kbps' },
  { id: 107, name: 'Abdur-Rahman as-Sudais (EveryAyah)', shortName: 'Sudais EA', urlPrefix: 'https://everyayah.com/data/Abdurrahmaan_As-Sudais_192kbps' },
  { id: 108, name: 'Muhammad Ayyub', shortName: 'Ayyub', urlPrefix: 'https://everyayah.com/data/Muhammad_Ayyoub_128kbps' },
  { id: 109, name: 'Nasser Al-Qatami', shortName: 'Qatami', urlPrefix: 'https://everyayah.com/data/Nasser_Alqatami_128kbps' },
  { id: 110, name: 'Fares Abbad', shortName: 'Abbad', urlPrefix: 'https://everyayah.com/data/Fares_Abbad_64kbps' },
  { id: 111, name: 'Muhammad Jibreel', shortName: 'Jibreel', urlPrefix: 'https://everyayah.com/data/Muhammad_Jibreel_128kbps' },
  { id: 112, name: 'Abdullah Basfar', shortName: 'Basfar', urlPrefix: 'https://everyayah.com/data/Abdullah_Basfar_192kbps' },
  { id: 113, name: 'Ahmed Neana', shortName: 'Neana', urlPrefix: 'https://everyayah.com/data/Ahmed_Neana_128kbps' },
  { id: 114, name: 'Ibrahim Akhdar', shortName: 'Akhdar', urlPrefix: 'https://everyayah.com/data/Ibrahim_Akhdar_64kbps' },
  { id: 115, name: 'Abdullah Al-Juhany', shortName: 'Juhany', urlPrefix: 'https://everyayah.com/data/Abdullaah_3awwaad_Al-Juhaynee_128kbps' },
  { id: 116, name: 'AbdulBaset Mujawwad (EveryAyah)', shortName: 'AbdulBaset EA', urlPrefix: 'https://everyayah.com/data/Abdul_Basit_Mujawwad_128kbps' },
  { id: 117, name: 'Minshawy Murattal (EveryAyah)', shortName: 'Minshawi EA', urlPrefix: 'https://everyayah.com/data/Minshawy_Murattal_128kbps' },
  { id: 118, name: 'Hani ar-Rifai (EveryAyah)', shortName: 'Rifai EA', urlPrefix: 'https://everyayah.com/data/Hani_Rifai_192kbps' },
  { id: 119, name: 'Mustafa Ismail', shortName: 'Ismail', urlPrefix: 'https://everyayah.com/data/Mustafa_Ismail_48kbps' },
  { id: 120, name: 'Mahmoud Ali Al-Banna', shortName: 'Banna', urlPrefix: 'https://everyayah.com/data/mahmoud_ali_al_banna_32kbps' },
];

export function getReciterById(id: number): Reciter | undefined {
  return RECITERS.find((r) => r.id === id);
}

export function isCustomReciter(id: number): boolean {
  return Boolean(getReciterById(id)?.urlPrefix);
}
