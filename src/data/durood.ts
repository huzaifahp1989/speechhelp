export type DuroodType = {
  id: string;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  virtue: string;
  reference: string;
  category: 'Hadith' | 'Traditional';
};

export const DUROOD_LIST: DuroodType[] = [
  {
    id: 'durood-ibrahim',
    title: 'Durood-e-Ibrahim',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ . اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ',
    transliteration: 'Allahumma salli ala Muhammadin wa ala aali Muhammadin kama sallaita ala Ibrahima wa ala aali Ibrahima innaka Hamidum Majid. Allahumma barik ala Muhammadin wa ala aali Muhammadin kama barakta ala Ibrahima wa ala aali Ibrahima innaka Hamidum Majid.',
    translation: 'O Allah, send Your Mercy upon Muhammad and upon the family of Muhammad, as You sent Your Mercy upon Ibrahim and upon the family of Ibrahim; indeed, You are Praiseworthy and Glorious. O Allah, send Your Blessings upon Muhammad and upon the family of Muhammad, as You sent Your Blessings upon Ibrahim and upon the family of Ibrahim; indeed, You are Praiseworthy and Glorious.',
    virtue: 'The most authentic and excellent form of Durood, recited in Salah. The Prophet (ﷺ) said: "Whoever sends blessings upon me once, Allah will send blessings upon him tenfold." (Sahih Muslim 408)',
    reference: 'Sahih Al-Bukhari 3370',
    category: 'Hadith'
  },
  {
    id: 'durood-short-authentic',
    title: 'Short Authentic',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى أَزْوَاجِهِ وَذُرِّيَّتِهِ، كَمَا صَلَّيْتَ عَلَى آلِ إِبْرَاهِيمَ، وَبَارِكْ عَلَى مُحَمَّدٍ وَعَلَى أَزْوَاجِهِ وَذُرِّيَّتِهِ، كَمَا بَارَكْتَ عَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ',
    transliteration: "Allahumma salli 'ala Muhammadin wa 'ala azwajihi wa dhurriyyatihi, kama sallayta 'ala ali Ibrahima, wa barik 'ala Muhammadin wa 'ala azwajihi wa dhurriyyatihi, kama barakta 'ala ali Ibrahima, innaka Hamidun Majid.",
    translation: "O Allah, send Your Mercy upon Muhammad and upon his wives and his offspring, as You sent Your Mercy upon the family of Ibrahim; and send Your Blessings upon Muhammad and upon his wives and his offspring, as You sent Your Blessings upon the family of Ibrahim. Indeed, You are Praiseworthy and Glorious.",
    virtue: "Abu Humaid As-Sa'idi reported: The people asked, 'O Allah's Messenger (ﷺ)! How shall we send blessings upon you?' He replied using these words.",
    reference: 'Sahih Al-Bukhari 3369',
    category: 'Hadith'
  },
  {
    id: 'durood-muslim',
    title: 'Sahih Muslim Version',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى آلِ إِبْرَاهِيمَ وَبَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى آلِ إِبْرَاهِيمَ فِي الْعَالَمِينَ إِنَّكَ حَمِيدٌ مَجِيدٌ',
    transliteration: "Allahumma salli 'ala Muhammadin wa 'ala ali Muhammadin kama sallayta 'ala ali Ibrahima wa barik 'ala Muhammadin wa 'ala ali Muhammadin kama barakta 'ala ali Ibrahima fil-'alamina innaka Hamidun Majid.",
    translation: "O Allah, send Your Mercy upon Muhammad and upon the family of Muhammad, as You sent Your Mercy upon the family of Ibrahim. And send Your Blessings upon Muhammad and upon the family of Muhammad, as You sent Your Blessings upon the family of Ibrahim among the nations. Indeed, You are Praiseworthy and Glorious.",
    virtue: "A concise and comprehensive form of sending blessings taught by the Prophet (ﷺ).",
    reference: 'Sahih Muslim 405',
    category: 'Hadith'
  },
  {
    id: 'durood-nabiyy',
    title: 'Prophetic Prayer',
    arabic: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    transliteration: "Allahumma salli wa sallim 'ala Nabiyyina Muhammad",
    translation: "O Allah, send Your Mercy and Peace upon our Prophet Muhammad.",
    virtue: "The Prophet (ﷺ) said: 'Whoever sends blessings upon me ten times in the morning and ten times in the evening will receive my intercession on the Day of Resurrection.' (Tabarani)",
    reference: 'Hasan (Al-Albani)',
    category: 'Hadith'
  },
  {
    id: 'durood-reward',
    title: 'Immense Reward',
    arabic: 'جَزَى اللَّهُ عَنَّا مُحَمَّدً مَّا هُوَ اَهْلُه',
    transliteration: "Jazallahu 'anna Muhammadan ma huwa ahluh",
    translation: "May Allah reward Muhammad (ﷺ) on our behalf as he deserves.",
    virtue: "It is narrated that whoever recites this, it will tire 70 angels for 1000 days (to write the reward).",
    reference: 'Tabarani (Al-Mu’jam al-Kabir)',
    category: 'Hadith'
  },
  {
    id: 'durood-maqad',
    title: 'Station of Proximity',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَأَنْزِلْهُ الْمَقْعَدَ الْمُقَرَّبَ عِنْدَكَ يَوْمَ الْقِيَامَةِ',
    transliteration: "Allahumma salli 'ala Muhammadin wa anzilhul maq'adal muqarraba 'indaka yawmal qiyamah",
    translation: "O Allah, send blessings upon Muhammad and grant him the seat of nearness to You on the Day of Resurrection.",
    virtue: "Whoever recites this, my intercession will be guaranteed for him. (Tabarani)",
    reference: 'Al-Tabarani / Al-Bazzar',
    category: 'Hadith'
  },
  {
    id: 'durood-tashahhud',
    title: 'Tashahhud Salawat',
    arabic: 'السَّلاَمُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ',
    transliteration: "As-salamu 'alayka ayyuhan-nabiyyu wa rahmatullahi wa barakatuh",
    translation: "Peace be upon you, O Prophet, and the mercy of Allah and His blessings.",
    virtue: "Recited in every Salah during Tashahhud.",
    reference: 'Bukhari / Muslim',
    category: 'Hadith'
  },
  {
    id: 'durood-ali',
    title: 'Durood of Ali (RA)',
    arabic: 'صَلَوَاتُ اللهِ الْبَرِّ الرَّحِيمِ وَالْمَلَائِكَةِ الْمُقَرَّبِينَ وَالنَّبِيِّينَ وَالصِّدِّيقِينَ وَالشُّهَدَاءِ وَالصَّالِحِينَ وَمَا سَبَّحَ لَكَ مِنْ شَيْءٍ يَا رَبَّ الْعَالَمِينَ عَلَى مُحَمَّدٍ بْنِ عَبْدِ اللهِ خَاتَمِ النَّبِيِّينَ',
    transliteration: "Salawatullahi al-barrir-rahim wal-mala'ikatil-muqarrabin wan-nabiyyin was-siddiqin wash-shuhada'i was-salihin wa ma sabbaha laka min shay'in ya Rabbal-'alamin 'ala Muhammadibni 'Abdillah khatamin-nabiyyin.",
    translation: "May the blessings of Allah, the Beneficent, the Merciful, and of the drawn-near angels, the prophets, the truthful, the martyrs, the righteous, and whatever glorifies You, O Lord of the worlds, be upon Muhammad, son of Abdullah, the Seal of the Prophets.",
    virtue: "Narrated by Ali (RA) as a comprehensive form of blessing.",
    reference: 'Ibn Majah / Traditional',
    category: 'Hadith'
  },
  {
    id: 'durood-friday',
    title: 'Friday Special',
    arabic: 'اَللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ النَّبِيِّ الأُمِّيِّ وَعَلَى آلِهِ وَسَلِّمْ تَسْلِيمًا',
    transliteration: "Allahumma salli 'ala Muhammadin an-Nabiyyil ummiyyi wa 'ala alihi wa sallim taslima",
    translation: "O Allah, send blessings upon Muhammad, the Unlettered Prophet, and upon his family, and send peace upon them completely.",
    virtue: "Reciting this 80 times on Friday after Asr is said to forgive 80 years of sins (based on various narrations and scholarly practice).",
    reference: 'Daraqutni / Traditional',
    category: 'Hadith'
  },
  {
    id: 'durood-shafi',
    title: 'Durood of Imam Shafi',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ كُلَّمَا ذَكَرَهُ الذَّاكِرُونَ وَغَفَلَ عَنْ ذِكْرِهِ الْغَافِلُونَ',
    transliteration: "Allahumma salli 'ala Muhammadin kullama zakarahudh-dhakirun wa ghafala 'an dhikrihil-ghafilun",
    translation: "O Allah, send blessings upon Muhammad whenever those who remember him remember him, and whenever those who neglect to remember him neglect him.",
    virtue: "Imam Shafi'i (RA) saw the Prophet (ﷺ) in a dream and was told he was forgiven because of this constant Salawat in his book (Al-Risalah).",
    reference: 'Dala\'il al-Khayrat',
    category: 'Traditional'
  },
  {
    id: 'durood-kamila',
    title: 'Salatul Kamila (Nariya)',
    arabic: 'اللَّهُمَّ صَلِّ صَلاَةً كَامِلَةً وَسَلِّمْ سَلاَماً تَامّاً عَلَى سَيِّدِنَا مُحَمَّدٍ الَذِي تَنْحَلُّ بِهِ الْعُقَدُ وَتَنْفَرِجُ بِهِ الْكُرَبُ وَتُقْضَى بِهِ الْحَوَائِجُ وَتُنَالُ بِهِ الرَّغَائِبُ وَحُسْنُ الْخَوَاتِمِ وَيُسْتَسْقَى الْغَمَامُ بِوَجْهِهِ الْكَرِيمِ وَعَلَى آلِهِ وَصَحْبِهِ فِي كُلِّ لَمْحَةٍ وَنَفَسٍ بِعَدَدِ كُلِّ مَعْلُومٍ لَكَ',
    transliteration: "Allahumma salli salaatan kaamilatan wa sallim salaaman taamman 'ala sayyidina Muhammadinilladhi tanhallu bihil 'uqadu wa tanfariju bihil kurabu wa tuqdaa bihil hawaaiju wa tunaalu bihir raghaaibu wa husnul khawaatimi wa yustasqal ghamaamu biwajhihil kareemi wa 'ala aalihi wa sahbihi fee kulli lamhatin wa nafasin bi'adadi kulli ma'lumin lak.",
    translation: "O Allah, send perfect blessings and complete peace upon our Master Muhammad, by whom knots are untied, distress is relieved, needs are fulfilled, desires and good endings are attained, and by whose noble face the clouds are asked for rain; and upon his family and companions in every glance and breath, by the number of everything known to You.",
    virtue: "Known for relief from distress and fulfilling needs. Recited for protection and ease in difficulties.",
    reference: 'Traditional / Dala\'il',
    category: 'Traditional'
  },
  {
    id: 'durood-tunjina',
    title: 'Salatul Tunjina',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ صَلاَةً تُنْجِينَا بِهَا مِنْ جَمِيعِ الأَهْوَالِ وَالآفَاتِ وَتَقْضِي لَنَا بِهَا جَمِيعَ الْحَاجَاتِ وَتُطَهِّرُنَا بِهَا مِنْ جَمِيعِ السَّيِّئَاتِ وَتَرْفَعُنَا بِهَا عِنْدَكَ أَعْلَى الدَّرَجَاتِ وَتُبَلِّغُنَا بِهَا أَقْصَى الْغَايَاتِ مِنْ جَمِيعِ الْخَيْرَاتِ فِي الْحَيَاةِ وَبَعْدَ الْمَمَاتِ',
    transliteration: "Allahumma salli 'ala sayyidina Muhammadin salatan tunjina biha min jami'il-ahwali wal-afat wa taqdi lana biha jami'al-hajat wa tutahhiruna biha min jami'is-sayyi'at wa tarfa'una biha 'indaka a'lad-darajat wa tuballighuna biha aqsal-ghayat min jami'il-khayrat fil-hayati wa ba'dal-mamat.",
    translation: "O Allah, send such blessings upon our Master Muhammad by which You deliver us from all terrors and calamities, satisfy for us all needs, cleanse us from all evils, raise us to the highest ranks with You, and enable us to reach the furthest goals of all goodness in this life and after death.",
    virtue: "A famous prayer for protection and deliverance from calamities.",
    reference: 'Traditional / Dala\'il',
    category: 'Traditional'
  },
  {
    id: 'durood-fatih',
    title: 'Salatul Fatih',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ الْفَاتِحِ لِمَا أُغْلِقَ وَالْخَاتِمِ لِمَا سَبَقَ نَاصِرِ الْحَقِّ بِالْحَقِّ وَالْهَادِي إِلَى صِرَاطِكَ الْمُسْتَقِيمِ وَعَلَى آلِهِ حَقَّ قَدْرِهِ وَمِقْدَارِهِ الْعَظِيمِ',
    transliteration: "Allahumma salli 'ala sayyidina Muhammadinil-fatihi lima ughliqa wal-khatimi lima sabaqa nasiril-haqqi bil-haqqi wal-hadi ila siratikal-mustaqim wa 'ala alihi haqqa qadrihi wa miqdarihil-'azim.",
    translation: "O Allah, send blessings upon our Master Muhammad, the Opener of what was closed, the Seal of what preceded, the Helper of the Truth by the Truth, and the Guide to Your Straight Path, and upon his family as befits his worth and his immense magnitude.",
    virtue: "A highly revered Salawat known for opening doors of mercy and knowledge.",
    reference: 'Traditional (Sheikh Ahmad Tijani)',
    category: 'Traditional'
  },
  {
    id: 'durood-ghausia',
    title: 'Durood Ghausia',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ السَّابِقِ لِلْخَلْقِ نُورُهُ وَرَحْمَةٌ لِلْعَالَمِينَ ظُهُورُهُ عَدَدَ مَنْ مَضَى مِنْ خَلْقِكَ وَمَنْ بَقِيَ وَمَنْ سَعِدَ مِنْهُمْ وَمَنْ شَقِيَ صَلاَةً تَسْتَغْرِقُ الْعَدَّ وَتُحِيطُ بِالْحَدِّ صَلاَةً لَا غَايَةَ لَهَا وَلَا مُنْتَهَى وَلَا انْقِضَاءَ صَلاَةً دَائِمَةً بِدَوَامِكَ وَعَلَى آلِهِ وَصَحْبِهِ وَسَلِّمْ تَسْلِيمًا مِثْلَ ذَلِكَ',
    transliteration: "Allahumma salli 'ala sayyidina Muhammadinis-sabiqi lil-khalqi nuruhu wa rahmatun lil-'alamina zuhuruhu 'adada man mada min khalqika wa man baqiya wa man sa'ida minhum wa man shaqiya salatan tastaghriqul-'adda wa tuhitu bil-haddi salatan la ghayata laha wa la muntaha wa lanqida'a salatan da'imatan bidawamika wa 'ala alihi wa sahbihi wa sallim tasliman mithla dhalik.",
    translation: "O Allah, send blessings upon our Master Muhammad, whose light preceded all creation and whose appearance is a mercy to the worlds, by the number of Your creation who have passed and who remain, those who are fortunate and those who are wretched—blessings that exceed all count and encompass all limits, blessings that have no end, no finish, and no expiration, blessings that are eternal as You are Eternal, and upon his family and companions, and send peace upon them in like manner.",
    virtue: "Attributed to Sheikh Abdul Qadir Jilani (RA).",
    reference: 'Traditional',
    category: 'Traditional'
  },
  {
    id: 'durood-awais',
    title: 'Durood Awais Qarni',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ وَآلِهِ وَعِتْرَتِهِ بِعَدَدِ كُلِّ مَعْلُومٍ لَكَ',
    transliteration: "Allahumma salli 'ala sayyidina Muhammadin wa alihi wa 'itratihi bi'adadi kulli ma'lumin lak.",
    translation: "O Allah, send blessings upon our Master Muhammad and his family and his progeny by the number of everything known to You.",
    virtue: "Attributed to Awais Al-Qarni (RA).",
    reference: 'Traditional',
    category: 'Traditional'
  },
  {
    id: 'durood-kawthar',
    title: 'Salawat al-Kawthar',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ فِي الْأَوَّلِينَ وَصَلِّ عَلَى مُحَمَّدٍ فِي الْآخِرِينَ وَصَلِّ عَلَى مُحَمَّدٍ فِي النَّبِيِّينَ وَصَلِّ عَلَى مُحَمَّدٍ فِي الْمُرْسَلِينَ وَصَلِّ عَلَى مُحَمَّدٍ فِي الْمَلَأِ الْأَعْلَى إِلَى يَوْمِ الدِّينِ',
    transliteration: "Allahumma salli 'ala Muhammadin fil-awwalina wa salli 'ala Muhammadin fil-akhirina wa salli 'ala Muhammadin fin-nabiyyina wa salli 'ala Muhammadin fil-mursalina wa salli 'ala Muhammadin fil-mala'il-a'la ila yawmid-din.",
    translation: "O Allah, send blessings upon Muhammad among the first generations, and send blessings upon Muhammad among the last generations, and send blessings upon Muhammad among the prophets, and send blessings upon Muhammad among the messengers, and send blessings upon Muhammad in the Highest Assembly until the Day of Judgment.",
    virtue: "A comprehensive prayer for the Prophet (ﷺ) across all times.",
    reference: 'Traditional / Dala\'il',
    category: 'Traditional'
  }
];
