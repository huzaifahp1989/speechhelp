const LAYOUT = 'indopak-13-lines-layout-qudratullah';

async function getSegmentsForPage(page) {
  const map = new Map();
  // Binary search for word range on page
  let lo = 1;
  let hi = 80000;
  let minW = hi;
  let maxW = 0;

  // coarse scan: find min/max word ids on page via stepping
  for (let start = 1; start <= 80000; start += 500) {
    const end = Math.min(start + 500, 80000);
    const r = await fetch(
      `https://api.qurani.ai/gw/qh/v1/mushaf-layouts/${LAYOUT}/word/${start}/${end}`
    );
    const data = (await r.json()).data || [];
    for (const seg of data) {
      if (seg.pageNumber !== page || seg.fromWord == null) continue;
      minW = Math.min(minW, seg.fromWord);
      maxW = Math.max(maxW, seg.toWord);
      const existing = map.get(seg.lineNumber);
      if (!existing || seg.fromWord < existing.fromWord) {
        map.set(seg.lineNumber, seg);
      }
    }
  }

  // fine scan around range
  if (maxW > 0) {
    const pad = 50;
    const fineMin = Math.max(1, minW - pad);
    const fineMax = maxW + pad;
    for (let start = fineMin; start <= fineMax; start += 20) {
      const end = Math.min(start + 20, fineMax);
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
  }

  return map;
}

const page = Number(process.argv[2] || 1);
const layoutRes = await fetch(
  `https://api.qurani.ai/gw/qh/v1/mushaf-layouts/${LAYOUT}/pages/${page}`
);
const layout = (await layoutRes.json()).data;
const segs = await getSegmentsForPage(page);
console.log('page', page, 'layout lines', layout.length, 'segments', segs.size);
for (const line of layout) {
  const seg = segs.get(line.lineNumber);
  console.log(
    line.lineNumber,
    line.lineType,
    line.isCentered ? 'center' : 'justify',
    seg ? `${seg.fromWord}-${seg.toWord}` : '(no words)'
  );
}
