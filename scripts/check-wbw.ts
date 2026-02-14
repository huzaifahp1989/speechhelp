


async function checkWordByWord() {
  // Fetch Al-Fatiha Verse 1 with words
  const url = 'https://api.quran.com/api/v4/verses/by_key/1:1?language=en&words=true&fields=text_uthmani';
  console.log('Fetching:', url);
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.verse && data.verse.words) {
      console.log('✅ Words found:', data.verse.words.length);
      console.log('Sample word:', data.verse.words[0]);
    } else {
      console.log('❌ No words found', data);
    }
  } catch (e) {
    console.error(e);
  }
}

checkWordByWord();
