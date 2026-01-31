
const https = require('https');

const editions = [
    'eng-bukhari',
    'eng-muslim',
    'eng-abudawud',
    'eng-tirmidhi',
    'eng-nasai',
    'eng-ibnmajah',
    'eng-riyadussalihin',
    'eng-nawawi',
    'eng-qudsi',
    'eng-malik',
    'eng-darimi',
    'eng-adab'
];

const baseUrl = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/';

function checkUrl(edition) {
    const url = `${baseUrl}${edition}.min.json`;
    https.get(url, (res) => {
        console.log(`${edition}: ${res.statusCode}`);
        if (res.statusCode !== 200) {
            // Try without .min
             const url2 = `${baseUrl}${edition}.json`;
             https.get(url2, (res2) => {
                 console.log(`${edition} (no min): ${res2.statusCode}`);
             });
        }
    }).on('error', (e) => {
        console.error(`${edition}: Error ${e.message}`);
    });
}

editions.forEach(checkUrl);
