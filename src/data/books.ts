
export type BookCategory = string;

export interface IslamicBook {
  id: string;
  title: string;
  author: string;
  description: string;
  category: BookCategory;
  coverImageUrl: string;
  pdfUrl: string;
}

export const SAMPLE_BOOKS: IslamicBook[] = [
  {
    id: '40-hadith-nawawi',
    title: 'The 40 Hadith of Imam Nawawi',
    author: 'Imam An-Nawawi',
    description: 'The famous collection of forty-two core hadith that summarize Islamic teachings.',
    category: 'Hadith',
    coverImageUrl: 'https://placehold.co/600x900/059669/ffffff?text=40+Hadith',
    pdfUrl: 'https://ia802805.us.archive.org/24/items/40HadithNawawi_201509/40_hadith_nawawi.pdf',
  },
  {
    id: 'hisnul-muslim',
    title: 'Hisnul Muslim (Fortress of the Muslim)',
    author: 'Sa\'id bin Ali bin Wahf Al-Qahtani',
    description: 'Authentic supplications from the Qur\'an and Sunnah for daily life.',
    category: 'General',
    coverImageUrl: 'https://placehold.co/600x900/0891b2/ffffff?text=Hisnul+Muslim',
    pdfUrl: 'https://ia800203.us.archive.org/31/items/HisnAlMuslim-FortressOfTheMuslim_138/Hisn_al_Muslim.pdf',
  },
  {
    id: 'stories-of-prophets',
    title: 'Stories of the Prophets',
    author: 'Imam Ibn Kathir',
    description: 'The classic work on the lives of the Prophets based on Qur\'an and Hadith.',
    category: 'Seerah',
    coverImageUrl: 'https://placehold.co/600x900/b45309/ffffff?text=Stories+of+Prophets',
    pdfUrl: 'https://ia800204.us.archive.org/16/items/StoriesOfTheProphetsByIbnKathir/Stories_Of_The_Prophets.pdf',
  },
  {
    id: 'riyad-us-saliheen',
    title: 'Riyad us Saliheen',
    author: 'Imam An-Nawawi',
    description: 'The Gardens of the Righteous: A selection of hadith on manners and character.',
    category: 'Hadith',
    coverImageUrl: 'https://placehold.co/600x900/4f46e5/ffffff?text=Riyad+us+Saliheen',
    pdfUrl: 'https://ia801306.us.archive.org/27/items/RiyadUsSaliheen_201306/riyad_us_saliheen_vol1.pdf',
  },
  {
    id: 'fundamentals-of-tawheed',
    title: 'The Fundamentals of Tawheed',
    author: 'Dr. Abu Ameenah Bilal Philips',
    description: 'A clear explanation of Islamic monotheism and the categories of Shirk.',
    category: 'Aqeedah',
    coverImageUrl: 'https://placehold.co/600x900/dc2626/ffffff?text=Tawheed',
    pdfUrl: 'https://ia801607.us.archive.org/4/items/TheFundamentalsOfTawheed/The_Fundamentals_Of_Tawheed.pdf',
  },
  {
    id: 'fazail-e-amaal',
    title: 'Fazail-e-Amaal',
    author: 'Maulana Muhammad Zakariyya Kandhalvi',
    description: 'A vast collection of hadith detailing the virtues of various Islamic practices and good deeds.',
    category: 'Hadith',
    coverImageUrl: 'https://placehold.co/600x900/15803d/ffffff?text=Fazail-e-Amaal',
    pdfUrl: 'https://ia802901.us.archive.org/3/items/fazail-e-amaal-english-new-edition/Fazail-e-Amaal-English-New-Edition.pdf',
  },
  {
    id: 'fazail-e-sadaqat',
    title: 'Fazail-e-Sadaqat',
    author: 'Maulana Muhammad Zakariyya Kandhalvi',
    description: 'A comprehensive collection of stories and hadith regarding the virtues of charity.',
    category: 'General',
    coverImageUrl: 'https://placehold.co/600x900/0369a1/ffffff?text=Fazail-e-Sadaqat',
    pdfUrl: 'https://ia802907.us.archive.org/24/items/Fazail-e-Sadaqaat-Part-1-2-English/Fazail-e-Sadaqaat-Part-1-2-English.pdf',
  },
  {
    id: 'muntakhab-ahadith',
    title: 'Muntakhab Ahadith',
    author: 'Maulana Muhammad Yusuf Kandhalvi',
    description: 'A selection of authentic hadith relating to the Six Qualities of Da\'wah and Tabligh.',
    category: 'Hadith',
    coverImageUrl: 'https://placehold.co/600x900/b91c1c/ffffff?text=Muntakhab+Ahadith',
    pdfUrl: 'https://ia801306.us.archive.org/2/items/muntakhabahadithenglish/MuntakhabAhadithEnglish.pdf',
  },
];
