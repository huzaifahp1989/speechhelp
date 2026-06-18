/** Build global IndoPak word index from Quran.com (reading order). */
const words = ['']; // 1-indexed

for (let chapter = 1; chapter <= 114; chapter += 1) {
  const res = await fetch(
    `https://api.quran.com/api/v4/verses/by_chapter/${chapter}?words=true&word_fields=text_indopak&per_page=300`
  );
  if (!res.ok) throw new Error(`chapter ${chapter} failed`);
  const data = await res.json();
  for (const verse of data.verses || []) {
    for (const word of verse.words || []) {
      words.push(word.text_indopak || word.text_uthmani || '');
    }
  }
  process.stdout.write(`\rchapter ${chapter}/114 words ${words.length - 1}`);
}

console.log('\ntotal words', words.length - 1);

// Page 50 line 1 from Qurani: words 4538-4544
const sample = words.slice(4538, 4545).join(' ');
console.log('page50 line1 sample:', sample);
