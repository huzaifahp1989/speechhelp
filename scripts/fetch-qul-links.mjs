async function dump(url) {
  const html = await (await fetch(url)).text();
  const patterns = [
    /download[^"']{0,80}/gi,
    /\.json[^"']*/gi,
    /\.sqlite[^"']*/gi,
    /data-url="[^"]+"/gi,
    /turbo[^"]*"/gi,
  ];
  console.log('\n===', url, 'size', html.length, '===');
  for (const p of patterns) {
    const m = [...html.matchAll(p)].slice(0, 10);
    if (m.length) console.log(p, m.map((x) => x[0]));
  }
  const actionLinks = [...html.matchAll(/<a[^>]+>/gi)].map((m) => m[0]).filter((a) => /download|json|sqlite/i.test(a));
  console.log('anchor tags', actionLinks.slice(0, 5));
}

await dump('https://qul.tarteel.ai/resources/mushaf-layout/17');
await dump('https://qul.tarteel.ai/resources/quran-script/55');
