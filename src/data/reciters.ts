export type Reciter = {
  id: number;
  name: string;
  urlPrefix?: string;
};

export const RECITERS: Reciter[] = [
  { id: 7, name: 'Mishary Rashid Alafasy' },
  { id: 3, name: 'Abdur-Rahman as-Sudais' },
  { id: 2, name: 'AbdulBaset AbdulSamad (Murattal)' },
  { id: 4, name: 'Abu Bakr al-Shatri' },
  { id: 5, name: 'Hani ar-Rifai' },
  { id: 6, name: 'Mahmoud Khalil Al-Husary' },
  { id: 9, name: 'Mohamed Siddiq al-Minshawi (Murattal)' },
  { id: 10, name: 'Saud Al-Shuraim' },
  // Custom Reciters
  { id: 101, name: 'Yasser Al-Dosari', urlPrefix: 'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps' },
  { id: 102, name: 'Saad Al-Ghamdi', urlPrefix: 'https://everyayah.com/data/Ghamadi_40kbps' },
  { id: 103, name: 'Maher Al-Muaiqly', urlPrefix: 'https://everyayah.com/data/Maher_AlMuaiqly_64kbps' },
  { id: 104, name: 'Salah Al-Budair', urlPrefix: 'https://everyayah.com/data/Salah_Al_Budair_128kbps' },
];
