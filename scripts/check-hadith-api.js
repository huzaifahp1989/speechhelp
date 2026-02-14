async function check() {
    try {
        const res = await fetch('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/info.json');
        const data = await res.json();
        console.log('Info Data:', JSON.stringify(data, null, 2).substring(0, 1000));
    } catch (e) {
        console.error(e);
    }
}
check();