
export type Story = {
  id: string;
  title: string;
  summary: string;
  content: string;
  source: string;
  audioUrl?: string; // URL for the official narration
  duration: string;
  category: 'Prophets' | 'Companions' | 'Animals' | 'Morals';
  difficulty: 'Easy' | 'Medium' | 'Hard';
};

export const STORIES: Story[] = [
  {
    id: 'prophet-yunus-whale',
    title: 'Prophet Yunus and the Whale',
    summary: 'The story of Prophet Yunus (Jonah) and how he was swallowed by a giant whale, teaching us about patience and repentance.',
    content: `Long ago, Prophet Yunus (AS) was sent to the people of Nineveh to call them to worship Allah alone. But the people were stubborn and refused to listen. Yunus (AS) became frustrated and left the city without Allah's permission.
    
    He boarded a ship to sail away. While at sea, a terrible storm hit the ship. The waves were huge, and the ship was about to sink! The sailors decided to draw lots to see who should be thrown overboard to lighten the load. Prophet Yunus's name was drawn three times!
    
    Reluctantly, they threw him into the raging sea. But Allah had a plan. A huge whale swallowed Yunus (AS) whole! Inside the whale's belly, it was dark and scary. Prophet Yunus realized his mistake and called out to Allah: "La ilaha illa Anta, Subhanaka, inni kuntu minaz-zalimin" (There is no god but You; glory be to You! Indeed, I have been of the wrongdoers).
    
    Allah heard his sincere prayer and commanded the whale to spit him out onto the shore. Yunus (AS) was weak, but Allah caused a gourd plant to grow over him for shade and food. When he recovered, he returned to Nineveh and found that all the people had believed in Allah!
    
    Lesson: Never give up on people, and always turn to Allah when you make a mistake.`,
    source: 'Quran: Surah As-Saffat (37:139-148) & Surah Al-Anbiya (21:87-88)',
    duration: '3 mins',
    category: 'Prophets',
    difficulty: 'Easy',
  },
  {
    id: 'ants-sulaiman',
    title: 'The Ant and Prophet Sulaiman',
    summary: 'A tiny ant warns its community about the approaching army of Prophet Sulaiman, showing us the importance of leadership and mercy.',
    content: `Prophet Sulaiman (AS) was a great king and a prophet. Allah gave him special powers, like understanding the language of animals and controlling the wind. One day, he was marching with his huge army of humans, jinn, and birds.
    
    As they approached a valley of ants, a tiny ant queen saw the army coming. She cried out to her fellow ants: "O ants! Enter your dwellings, lest Sulaiman and his soldiers crush you while they perceive not."
    
    Prophet Sulaiman (AS) heard the ant's warning and smiled. He was amazed by the ant's concern for her community and her understanding that Sulaiman would not hurt them intentionally. He ordered his army to stop and change their path to avoid harming the tiny creatures.
    
    He then prayed to Allah, thanking Him for his blessings and for the ability to show mercy to even the smallest of creatures.
    
    Lesson: Be merciful to all creatures, no matter how small. Leaders must protect those under their care.`,
    source: 'Quran: Surah An-Naml (27:18-19)',
    duration: '2 mins',
    category: 'Animals',
    difficulty: 'Easy',
  },
  {
    id: 'boy-and-king',
    title: 'The Boy and the King',
    summary: 'A young boy stands up for his faith against a tyrant king, showing incredible bravery and trust in Allah.',
    content: `There was once a powerful king who had a magician. As the magician grew old, he asked the king for a boy to teach magic to. The king sent a smart young boy.
    
    On his way to the magician, the boy met a monk who taught him about Allah. The boy realized the monk's way was the truth. One day, a huge beast blocked the people's path. The boy prayed, "O Allah, if the monk's affair is more beloved to You than the magician's, then kill this beast so the people can pass." He threw a stone, and the beast died. The boy knew then that Allah was with him.
    
    The boy began to heal the blind and the lepers by Allah's permission. The king found out and tried to kill the boy. He sent soldiers to throw him off a mountain, but the mountain shook and the soldiers fell, while the boy returned safely. The king tried to drown him in the sea, but the soldiers drowned, and the boy returned walking.
    
    The boy told the king, "You cannot kill me unless you do as I say. Gather the people, take an arrow from my quiver, and say 'In the name of Allah, the Lord of the boy,' then shoot me." The king did this, and the boy died. But upon seeing this, all the people cried out, "We believe in the Lord of the boy!"
    
    The king was furious, but the boy's sacrifice had brought the whole nation to the truth.
    
    Lesson: Faith in Allah gives us courage. Sometimes, sacrifice is necessary for the greater good.`,
    source: 'Sahih Muslim (Book 55, Hadith 7148)',
    duration: '5 mins',
    category: 'Companions', // Loosely categorized as righteous people/companions of truth
    difficulty: 'Medium',
  },
  {
    id: 'crying-camel',
    title: 'The Prophet and the Crying Camel',
    summary: 'The Prophet Muhammad (SAW) comforts a camel that was being mistreated, teaching us kindness to animals.',
    content: `One day, the Prophet Muhammad (SAW) entered the garden of a man from the Ansar (Helpers). There, he saw a camel. When the camel saw the Prophet (SAW), it started to make a sound and tears flowed from its eyes.
    
    The Prophet (SAW) went to the camel and gently wiped its tears and rubbed behind its ears until it calmed down. He then asked, "Who is the owner of this camel?"
    
    A young man from the Ansar came and said, "It belongs to me, O Messenger of Allah."
    
    The Prophet (SAW) said to him, "Do you not fear Allah regarding this animal which Allah has placed in your possession? It has complained to me that you starve it and overwork it."
    
    The young man realized his mistake and promised to treat the camel better.
    
    Lesson: Animals have feelings too. We must treat them with kindness and not overwork or starve them.`,
    source: 'Sunan Abi Dawood (Hadith 2549)',
    duration: '2 mins',
    category: 'Animals',
    difficulty: 'Easy',
  },
    {
    id: 'prophet-nuh-ark',
    title: 'Prophet Nuh and the Ark',
    summary: 'Prophet Nuh (Noah) builds a giant ship to save the believers and animals from a great flood.',
    content: `Prophet Nuh (AS) called his people to worship Allah for 950 years! But only a few people listened. Most of them laughed at him and even threw stones.
    
    Allah told Nuh (AS) to build a giant Ark (ship) because a great flood was coming to punish the disbelievers. Nuh (AS) started building the Ark far away from the sea. The people mocked him, saying, "O Nuh! Have you become a carpenter after being a prophet? Where is the water for your ship?"
    
    Nuh (AS) patiently replied, "If you mock us now, we will soon mock you." When the Ark was finished, Allah commanded Nuh (AS) to take a pair (male and female) of every animal, along with the believers and his family (except his wife and son who refused to believe).
    
    Suddenly, water gushed from the ground and rain poured from the sky! The water rose higher and higher, covering even the mountains. The Ark floated safely on the waves. Nuh (AS) called out to his son, "O my son! Come ride with us and do not be with the disbelievers!" But his son refused and climbed a mountain, thinking it would save him. Sadly, the waves swallowed him too.
    
    Finally, the rain stopped, and the Ark landed on Mount Judi. Nuh (AS) and the believers started a new life, thankful to Allah for saving them.
    
    Lesson: Patience is key. Allah always saves those who believe and do good deeds.`,
    source: 'Quran: Surah Hud (11:25-48)',
    duration: '4 mins',
    category: 'Prophets',
    difficulty: 'Medium',
  }
];
