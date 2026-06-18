const LAYOUT = 'indopak-13-lines-layout-qudratullah';

async function getPageLines(page) {
  const r = await fetch(
    `https://api.qurani.ai/gw/qh/v1/mushaf-layouts/${LAYOUT}/pages/${page}`
  );
  return (await r.json()).data;
}

async function getSegmentsForPage(page, min, max) {
  const map = new Map();
  for (let start = min; start <= max; start += 20) {
    const end = Math.min(start + 20, max);
    const r = await fetch(
      `https://api.qurani.ai/gw/qh/v1/mushaf-layouts/${LAYOUT}/word/${start}/${end}`
    );
    const data = (await r.json()).data || [];
    for (const seg of data) {
      if (seg.pageNumber !== page || seg.fromWord == null) continue;
      const existing = map.get(seg.lineNumber);
      if (!existing || seg.fromWord < existing.fromWord) {
        map.set(seg.lineNumber, seg);
      }
    }
  }
  return map;
}

async function tryWordText(id) {
  const endpoints = [
    `https://api.qurani.ai/gw/qh/v1/morphology/word/${id}`,
    `https://api.qurani.ai/gw/qh/v1/words/${id}`,
    `https://api.qurani.ai/gw/qh/v1/word/${id}`,
  ];
  for (const url of endpoints) {
    const r = await fetch(url);
    if (!r.ok) continue;
    const d = await r.json();
    const text =
      d.data?.word?.text ??
      d.data?.text ??
      d.word?.text ??
      d.text;
    if (text) return { url, text };
  }
  return null;
}

const page = Number(process.argv[2] || 50);
const lines = await getPageLines(page);
console.log('layout lines', lines.length);

const segs = await getSegmentsForPage(page, 4500, 4700);
console.log('segments found', segs.size);
for (const [ln, seg] of [...segs.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`line ${ln}: words ${seg.fromWord}-${seg.toWord}`);
}

const first = segs.get(1);
if (first) {
  const sample = await tryWordText(first.fromWord);
  console.log('word text sample', sample);
}
