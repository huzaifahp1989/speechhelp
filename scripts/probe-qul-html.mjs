const urls = [
  'https://qul.tarteel.ai/resources/mushaf-layout/17',
  'https://qul.tarteel.ai/mushaf_layouts/17?page_number=1',
  'https://qul.tarteel.ai/mushaf_layouts/17?page_number=50',
];

for (const url of urls) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    redirect: 'follow',
  });
  const html = await res.text();
  console.log('\n', url, 'status', res.status, 'len', html.length);
  const wordData = html.match(/wordData\s*=\s*(\{[\s\S]*?\});/);
  const pageData = html.match(/pageData\s*=\s*(\[[\s\S]*?\]);/);
  const download = [...html.matchAll(/href="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((h) => /download|\.json|\.sqlite|export|storage/i.test(h));
  console.log('wordData', wordData ? 'yes len ' + wordData[1].length : 'no');
  console.log('pageData', pageData ? 'yes len ' + pageData[1].length : 'no');
  console.log('downloads', download.slice(0, 10));
}
