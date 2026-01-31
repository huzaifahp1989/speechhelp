
export type BookCategory =
  | 'Aqeedah'
  | 'Fiqh'
  | 'Seerah'
  | 'Tafsir'
  | 'Hadith'
  | 'Kids'
  | 'General';

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
    pdfUrl: 'https://d1.islamhouse.com/data/en/ih_books/single2/en-hadith-nawawy-sahih.pdf',
  },
  {
    id: 'hisnul-muslim',
    title: 'Hisnul Muslim (Fortress of the Muslim)',
    author: 'Sa\'id bin Ali bin Wahf Al-Qahtani',
    description: 'Authentic supplications from the Qur\'an and Sunnah for daily life.',
    category: 'General',
    coverImageUrl: 'https://placehold.co/600x900/0891b2/ffffff?text=Hisnul+Muslim',
    pdfUrl: 'https://ahadith.co.uk/downloads/en_hisn_al-muslim.pdf',
  },
  {
    id: 'stories-of-prophets',
    title: 'Stories of the Prophets',
    author: 'Imam Ibn Kathir',
    description: 'The classic work on the lives of the Prophets based on Qur\'an and Hadith.',
    category: 'Seerah',
    coverImageUrl: 'https://placehold.co/600x900/b45309/ffffff?text=Stories+of+Prophets',
    pdfUrl: 'https://www.kalamullah.com/Books/Stories%20Of%20The%20Prophets%20By%20Ibn%20Kathir.pdf',
  },
  {
    id: 'riyad-us-saliheen',
    title: 'Riyad us Saliheen',
    author: 'Imam An-Nawawi',
    description: 'The Gardens of the Righteous: A selection of hadith on manners and character.',
    category: 'Hadith',
    coverImageUrl: 'https://placehold.co/600x900/4f46e5/ffffff?text=Riyad+us+Saliheen',
    pdfUrl: 'https://tawheedcenter.org/pdf/riyad_us_saliheen.pdf',
  },
  {
    id: 'fundamentals-of-tawheed',
    title: 'The Fundamentals of Tawheed',
    author: 'Dr. Abu Ameenah Bilal Philips',
    description: 'A clear explanation of Islamic monotheism and the categories of Shirk.',
    category: 'Aqeedah',
    coverImageUrl: 'https://placehold.co/600x900/dc2626/ffffff?text=Tawheed',
    pdfUrl: 'https://cdn.bookey.app/files/pdf/book/en/the-fundamentals-of-tawheed.pdf',
  },
];
