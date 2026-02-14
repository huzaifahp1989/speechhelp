
const https = require('https');

function test(url) {
    console.log('Testing:', url);
    const opts = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    };
    
    https.get(url, opts, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log(`[${res.statusCode}] Body length: ${data.length}`);
            if (data.length > 0) console.log('Snippet:', data.substring(0, 100));
        });
    }).on('error', (err) => {
        console.error('Error:', err.message);
    });
}

test("https://api.quran.com/api/v4/search?q=quran&size=1&language=en");
test("https://api.quran.com/api/v4/chapters/1");
