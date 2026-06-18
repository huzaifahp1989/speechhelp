const LAYOUT = 'indopak-13-lines-layout-qudratullah';

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

for (const page of [1, 2, 582]) {
  const segs = await getSegmentsForPage(page, 1, 80000);
  console.log('\npage', page, 'segments', segs.size);
  for (const [ln, seg] of [...segs.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  line ${ln}: ${seg.fromWord}-${seg.toWord} type=${seg.lineType || '?'}`);
  }
}
