const res = await fetch('https://qul.tarteel.ai/resources/quran-script/59');
const html = await res.text();
const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
console.log(links.filter((l) => /download|json|sqlite|export/i.test(l)).join('\n'));
