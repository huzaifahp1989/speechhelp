
async function testFetch() {
    const apiId = 'eng-nawawi';
    const urls = [
        `https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/${apiId}.min.json`,
        `https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/${apiId}.json`,
        `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${apiId}.min.json`,
        `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${apiId}.json`,
    ];

    console.log("Testing fetch for " + apiId);

    for (const url of urls) {
        try {
            console.log(`Fetching ${url}...`);
            const res = await fetch(url);
            console.log(`Status: ${res.status}`);
            if (res.ok) {
                console.log("SUCCESS");
                return;
            }
        } catch (e) {
            console.log(`Error: ${e.message}`);
        }
    }
    console.log("ALL FAILED");
}

testFetch();
