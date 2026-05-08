
export type QuoteCategory = 'Wisdom' | 'Motivation' | 'Spiritual' | 'Character' | 'Family' | 'Repentance';

export interface Quote {
  id: string;
  text: string;
  author: string;
  source?: string;
  category: QuoteCategory;
}

export const ISLAMIC_QUOTES: Quote[] = [
  // Mufti Menk
  {
    id: 'mm-1',
    text: "When you're tempted to lose patience with someone, think of how patient Allah has been with you.",
    author: "Mufti Menk",
    category: 'Character'
  },
  {
    id: 'mm-2',
    text: "Don't let your past blackmail your present to ruin your beautiful future.",
    author: "Mufti Menk",
    category: 'Motivation'
  },

  // Quranic reminders
  {
    id: 'qr-1',
    text: "Indeed, with hardship comes ease.",
    author: 'Quran',
    source: 'Surah Ash-Sharh 94:6',
    category: 'Motivation'
  },
  {
    id: 'qr-2',
    text: "So remember Me; I will remember you.",
    author: 'Quran',
    source: 'Surah Al-Baqarah 2:152',
    category: 'Spiritual'
  },
  {
    id: 'qr-3',
    text: "And whoever relies upon Allah, then He is sufficient for him.",
    author: 'Quran',
    source: 'Surah At-Talaq 65:3',
    category: 'Wisdom'
  },
  {
    id: 'qr-4',
    text: "My mercy encompasses all things.",
    author: 'Quran',
    source: 'Surah Al-Araf 7:156',
    category: 'Repentance'
  },

  // Prophetic sayings (Hadith)
  {
    id: 'hd-1',
    text: "The best among you are those who have the best manners and character.",
    author: 'Prophet Muhammad (peace be upon him)',
    source: 'Sahih al-Bukhari 3559',
    category: 'Character'
  },
  {
    id: 'hd-2',
    text: "Allah does not look at your appearance or wealth, but at your hearts and your deeds.",
    author: 'Prophet Muhammad (peace be upon him)',
    source: 'Sahih Muslim 2564',
    category: 'Spiritual'
  },
  {
    id: 'hd-3',
    text: "Whoever does not show mercy will not be shown mercy.",
    author: 'Prophet Muhammad (peace be upon him)',
    source: 'Sahih al-Bukhari 7376',
    category: 'Character'
  },
  {
    id: 'hd-4',
    text: "The most beloved deeds to Allah are those that are most consistent, even if small.",
    author: 'Prophet Muhammad (peace be upon him)',
    source: 'Sahih al-Bukhari 6464',
    category: 'Motivation'
  },
  {
    id: 'hd-5',
    text: "The strong person is not the one who overcomes others, but the one who controls himself when angry.",
    author: 'Prophet Muhammad (peace be upon him)',
    source: 'Sahih al-Bukhari 6114',
    category: 'Character'
  },

  // Family-focused reminders
  {
    id: 'fm-1',
    text: "The best of you are those who are best to their families.",
    author: 'Prophet Muhammad (peace be upon him)',
    source: 'Jami at-Tirmidhi 3895',
    category: 'Family'
  },
  {
    id: 'fm-2',
    text: "And We have enjoined upon man goodness to parents.",
    author: 'Quran',
    source: 'Surah Al-Ankabut 29:8',
    category: 'Family'
  },
  {
    id: 'fm-3',
    text: "Your Lord has decreed that you worship none but Him, and be excellent to parents.",
    author: 'Quran',
    source: 'Surah Al-Isra 17:23',
    category: 'Family'
  },
  {
    id: 'mm-3',
    text: "Insulting others is never a way of correcting them. Instead, it causes more damage and proves that we need help ourselves.",
    author: "Mufti Menk",
    category: 'Character'
  },
  {
    id: 'mm-4',
    text: "Always leave people better than you found them. Hug them with your words, heal them with your smile, and inspire them with your presence.",
    author: "Mufti Menk",
    category: 'Wisdom'
  },
  {
    id: 'mm-5',
    text: "If you want to be happy, don't dwell on the past, don't worry about the future, focus on living fully in the present.",
    author: "Mufti Menk",
    category: 'Motivation'
  },
  
  // Ibn Taymiyyah
  {
    id: 'it-1',
    text: "Don't depend too much on anyone in this world because even your own shadow leaves you when you are in darkness.",
    author: "Ibn Taymiyyah",
    category: 'Wisdom'
  },
  {
    id: 'it-2',
    text: "The heart was created to know Allah, to love Him, to find peace in Him, and to be pleased with Him.",
    author: "Ibn Taymiyyah",
    category: 'Spiritual'
  },
  
  // Ibn Al-Qayyim
  {
    id: 'iq-1',
    text: "A man sins and enters Paradise, and another does a good deed and enters the Fire. The first one sins, but is constantly afraid of it and regrets it... until he enters Paradise. The second one performs a good deed and is constantly admiring it... until he enters the Fire.",
    author: "Ibn Al-Qayyim",
    category: 'Repentance'
  },
  {
    id: 'iq-2',
    text: "If the heart becomes hardened, the eye becomes dry.",
    author: "Ibn Al-Qayyim",
    category: 'Spiritual'
  },

  // Imam Al-Ghazali
  {
    id: 'ig-1',
    text: "To get what you love, you must first be patient with what you hate.",
    author: "Imam Al-Ghazali",
    category: 'Motivation'
  },
  {
    id: 'ig-2',
    text: "Knowledge without action is wastefulness and action without knowledge is foolishness.",
    author: "Imam Al-Ghazali",
    category: 'Wisdom'
  },

  // Hasan Al-Basri
  {
    id: 'hb-1',
    text: "O Son of Adam! You are nothing but a number of days, whenever each day passes then part of you has gone.",
    author: "Hasan Al-Basri",
    category: 'Wisdom'
  },
  {
    id: 'hb-2',
    text: "Do not sit with the people of innovation, for it will cause sickness in your heart.",
    author: "Hasan Al-Basri",
    category: 'Character'
  },

  // Umar ibn Al-Khattab (RA)
  {
    id: 'uk-1',
    text: "We were the most humiliated people on earth and Allah gave us honor through Islam.",
    author: "Umar ibn Al-Khattab (RA)",
    category: 'Wisdom'
  },
  {
    id: 'uk-2',
    text: "Sit with those who love God, for that enlightens the mind.",
    author: "Umar ibn Al-Khattab (RA)",
    category: 'Spiritual'
  },

  // Ali ibn Abi Talib (RA)
  {
    id: 'at-1',
    text: "Do not let your difficulties fill you with anxiety, after all it is only in the darkest nights that stars shine more brightly.",
    author: "Ali ibn Abi Talib (RA)",
    category: 'Motivation'
  },
  {
    id: 'at-2',
    text: "Beautiful people are not always good, but good people are always beautiful.",
    author: "Ali ibn Abi Talib (RA)",
    category: 'Character'
  },

  // Nouman Ali Khan
  {
    id: 'nak-1',
    text: "Your sin is not greater than God's mercy.",
    author: "Nouman Ali Khan",
    category: 'Repentance'
  },
  
  // Yasir Qadhi
  {
    id: 'yq-1',
    text: "The Quran is a book that will change you, if you let it.",
    author: "Yasir Qadhi",
    category: 'Spiritual'
  },
  
  // Omar Suleiman
  {
    id: 'os-1',
    text: "When you are in a dark place, you sometimes tend to think you've been buried. Perhaps you've been planted. Bloom.",
    author: "Omar Suleiman",
    category: 'Motivation'
  },
  
  // Hamza Yusuf
  {
    id: 'hy-1',
    text: "The more you let go of your lower self, the more your spirit will fly.",
    author: "Hamza Yusuf",
    category: 'Spiritual'
  },

  // Bilal Philips
  {
    id: 'bp-1',
    text: "If you want to destroy any nation without war, make adultery or nudity common in the young generation.",
    author: "Bilal Philips",
    category: 'Wisdom'
  },
  {
    id: 'bp-2',
    text: "A busy life makes prayer harder, but prayer makes a busy life easier.",
    author: "Bilal Philips",
    category: 'Motivation'
  }
];
