
import fs from 'fs';

// IndoPak Juz Start Verses (Surah:Ayah)
const INDOPAK_JUZ_STARTS = {
  1: '1:1',
  2: '2:142',
  3: '2:253',
  4: '3:92',
  5: '4:24',
  6: '4:148',
  7: '5:83',
  8: '6:111',
  9: '7:88',
  10: '8:41',
  11: '9:94',
  12: '11:6',
  13: '12:53',
  14: '15:1',
  15: '17:1',
  16: '18:75',
  17: '21:1',
  18: '23:1',
  19: '25:21',
  20: '27:60',
  21: '29:45',
  22: '33:31',
  23: '36:22',
  24: '39:32',
  25: '41:47',
  26: '46:1',
  27: '51:31',
  28: '58:1',
  29: '67:1',
  30: '78:1'
};

async function generateQuarters() {
  console.log('Fetching Quran data...');
  const response = await fetch('http://api.alquran.cloud/v1/quran/quran-uthmani');
  const data = await response.json();
  const surahs = data.data.surahs;

  // Flatten to list of ayahs with metadata
  let allAyahs = [];
  surahs.forEach(surah => {
    surah.ayahs.forEach(ayah => {
      allAyahs.push({
        surah: surah.number,
        ayah: ayah.numberInSurah,
        hizbQuarter: ayah.hizbQuarter
      });
    });
  });

  // Assign IndoPak Juz
  console.log('Assigning IndoPak Juz...');
  let currentJuz = 1;
  let ayahsByJuz = {};
  
  // Initialize ayahsByJuz
  for (let i = 1; i <= 30; i++) {
    ayahsByJuz[i] = [];
  }

  for (let i = 0; i < allAyahs.length; i++) {
    const ayah = allAyahs[i];
    const ayahKey = `${ayah.surah}:${ayah.ayah}`;
    
    // Check if we need to switch to next Juz
    if (currentJuz < 30) {
      const nextJuzStart = INDOPAK_JUZ_STARTS[currentJuz + 1];
      if (ayahKey === nextJuzStart) {
        currentJuz++;
      }
    }
    
    ayahsByJuz[currentJuz].push(ayah);
  }

  // Generate Quarters based on Hizb Quarter distribution (Rub al-Hizb)
  const juzQuarters = {};

  console.log('Calculating Quarters...');
  for (let j = 1; j <= 30; j++) {
    const juzAyahs = ayahsByJuz[j];
    if (juzAyahs.length === 0) continue;

    // Identify Hizb Quarter changes
    let quarterBoundaries = []; // List of end indices
    let currentHQ = juzAyahs[0].hizbQuarter;
    
    for (let i = 0; i < juzAyahs.length; i++) {
      if (juzAyahs[i].hizbQuarter !== currentHQ) {
        quarterBoundaries.push(i - 1); // End of previous quarter
        currentHQ = juzAyahs[i].hizbQuarter;
      }
    }
    // Add end of Juz
    quarterBoundaries.push(juzAyahs.length - 1);

    // We expect roughly 8 segments
    const totalSegments = quarterBoundaries.length;
    
    let split1, split2, split3;
    
    if (totalSegments >= 8) {
      split1 = quarterBoundaries[1]; // End of 2nd segment
      split2 = quarterBoundaries[3]; // End of 4th segment
      split3 = quarterBoundaries[5]; // End of 6th segment
    } else {
      const qSize = Math.floor(totalSegments / 4) || 1;
      split1 = quarterBoundaries[qSize - 1];
      split2 = quarterBoundaries[qSize * 2 - 1];
      split3 = quarterBoundaries[qSize * 3 - 1];
    }
    
    // Define Quarters
    // Q1
    const q1Start = juzAyahs[0];
    const q1End = juzAyahs[split1];
    
    // Q2
    const q2Start = juzAyahs[split1 + 1];
    const q2End = juzAyahs[split2];
    
    // Q3
    const q3Start = juzAyahs[split2 + 1];
    const q3End = juzAyahs[split3];
    
    // Q4
    const q4Start = juzAyahs[split3 + 1];
    const q4End = juzAyahs[juzAyahs.length - 1];

    juzQuarters[`juz_${j}`] = {
      quarter_1: { start: [q1Start.surah, q1Start.ayah], end: [q1End.surah, q1End.ayah] },
      quarter_2: { start: [q2Start.surah, q2Start.ayah], end: [q2End.surah, q2End.ayah] },
      quarter_3: { start: [q3Start.surah, q3Start.ayah], end: [q3End.surah, q3End.ayah] },
      quarter_4: { start: [q4Start.surah, q4Start.ayah], end: [q4End.surah, q4End.ayah] }
    };
  }

  fs.writeFileSync('src/data/juz-quarters.json', JSON.stringify(juzQuarters, null, 2));
  console.log('Successfully generated src/data/juz-quarters.json');
}

generateQuarters();
