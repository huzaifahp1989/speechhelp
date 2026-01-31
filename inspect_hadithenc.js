
const https = require('https');

// Trying a sample ID, usually they are large integers
const url = "https://hadithenc.com/api/v1/hadith/2962";

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(data);
  });
}).on('error', (err) => {
  console.error("Error: " + err.message);
});
