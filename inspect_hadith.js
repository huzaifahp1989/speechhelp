
const https = require('https');

const url = "https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/eng-bukhari.min.json";

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { 
      data += chunk; 
  });
  res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.hadiths && json.hadiths.length > 0) {
            console.log(JSON.stringify(json.hadiths[0], null, 2));
        } else {
            console.log("No hadiths found or empty array");
        }
      } catch (e) {
          console.log("Error parsing JSON (might be incomplete if large): " + e.message);
      }
  });
}).on('error', (err) => {
  console.error("Error: " + err.message);
});
