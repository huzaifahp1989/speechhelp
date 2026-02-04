
// import fetch from 'node-fetch'; // Remove this line

async function checkJuz1Quarters() {
  const response = await fetch('http://api.alquran.cloud/v1/juz/1/quran-uthmani');
  const data = await response.json();
  const ayahs = data.data.ayahs;

  let currentHizbQuarter = 0;
  let quarters = {};

  ayahs.forEach(ayah => {
    if (ayah.hizbQuarter !== currentHizbQuarter) {
      currentHizbQuarter = ayah.hizbQuarter;
      quarters[currentHizbQuarter] = {
        start: `${ayah.surah.number}:${ayah.numberInSurah}`,
        ayah: ayah,
        val: currentHizbQuarter
      };
    }
    // Update end
    if (quarters[currentHizbQuarter]) {
      quarters[currentHizbQuarter].end = `${ayah.surah.number}:${ayah.numberInSurah}`;
    }
  });

  console.log('Juz 1 Hizb Quarters (Standard/Uthmani):');
  for (const [q, range] of Object.entries(quarters)) {
    console.log(`Quarter Value ${range.val}: ${range.start} - ${range.end}`);
  }
}

checkJuz1Quarters();
