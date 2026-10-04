import { buildWordTajweedMap, stripTajweedTags } from '../src/lib/verseTajweedWords.ts';

const res = await fetch(
  'https://api.quran.com/api/v4/verses/by_key/2:143?words=true&word_fields=text_uthmani,text_uthmani_tajweed&fields=text_uthmani,text_uthmani_tajweed'
);
const { verse: v } = await res.json();
const words = v.words.map((w) => ({
  id: w.id,
  char_type_name: w.char_type_name,
  text_uthmani: w.text_uthmani,
  text_uthmani_tajweed: w.text_uthmani_tajweed,
}));

const map = buildWordTajweedMap(v.text_uthmani_tajweed, words);
const speak = words.filter((w) => w.char_type_name !== 'end');
const withColor = [...map.values()].filter((h) => h.includes('tajweed') || h.includes('rule'));
console.log('plain length', stripTajweedTags(v.text_uthmani_tajweed).length);
console.log('mapped', map.size, 'with color', withColor.length, 'of', speak.length);

const miss = speak.filter((w) => {
  const h = map.get(w.id) || '';
  return !h.includes('tajweed') && !h.includes('rule');
});
console.log('plain-only words (no rules in slice):', miss.length);
console.log('sample colored:', [...map.entries()].find(([, h]) => h.includes('ghunnah'))?.[1]);
