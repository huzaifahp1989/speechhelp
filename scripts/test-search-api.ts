


async function testSearch(query: string, lang: string = 'en') {
  console.log(`Searching for: "${query}" (${lang})`);
  const url = `https://api.quran.com/api/v4/search?q=${encodeURIComponent(query)}&size=5&page=1&language=${lang}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.search && data.search.results) {
        console.log(`Found ${data.search.total_results} results.`);
        data.search.results.forEach((r: any, i: number) => {
            console.log(`[${i+1}] ${r.verse_key}: ${r.text.substring(0, 50)}...`);
        });
    } else {
        console.log('No results found or error structure.');
        console.log(JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error('Error:', e);
  }
  console.log('---');
}

async function run() {
    await testSearch('patience', 'en');
    await testSearch('صبر', 'ar');
    await testSearch('2:255', 'en'); // See if search handles verse keys
}

run();
