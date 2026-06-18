const page = Number(process.argv[2] || 50);
const url = `https://qul.tarteel.ai/mushaf_layouts/17?page_number=${page}`;
const html = await (await fetch(url)).text();

// Find mushaf line container
const mushafMatch = html.match(/class="mushaf-preview[\s\S]*?<\/section>/i);
if (mushafMatch) {
  const block = mushafMatch[0];
  const lines = [...block.matchAll(/class="[^"]*line[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)];
  console.log('lines in mushaf block', lines.length);
  lines.forEach((m, i) => {
    const inner = m[1];
    const words = [...inner.matchAll(/class="[^"]*word[^"]*"[^>]*>([^<]*)</gi)].map((w) => w[1].trim());
    const plain = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(String(i + 1).padStart(2), words.length ? words.join(' ') : plain.slice(0, 120));
  });
} else {
  console.log('no mushaf block');
}

// Save snippet for inspection
import fs from 'fs';
const idx = html.indexOf('mushaf-preview');
if (idx > 0) fs.writeFileSync(`scripts/qul-page-${page}-snippet.html`, html.slice(idx, idx + 8000));
