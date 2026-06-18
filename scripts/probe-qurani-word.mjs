const r = await fetch(
  'https://api.qurani.ai/gw/qh/v1/mushaf-layouts/indopak-13-lines-layout-qudratullah/word/1/100'
);
const d = await r.json();
console.log('keys', Object.keys(d));
console.log(JSON.stringify(d, null, 2).slice(0, 2000));
