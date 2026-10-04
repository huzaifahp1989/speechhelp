const more = [
  'Ibrahim_Akhdar_128kbps',
  'Ibrahim_Akhdar_32kbps',
  'Parhizgar_128kbps',
  'parhizgar_128kbps',
  'Kamil_Jlil_128kbps',
  'Ahmad_Al-Ajmi_128kbps',
  'Ahmad_Alnufais_128kbps',
  'Akram_AlAlaqimy_128kbps',
  'Bandar_Balila_128kbps',
  'Khalid_Al-Jalil_64kbps',
  'Mansour_Al-Salimi_64kbps',
  'Mohammad_al-Tablawi_64kbps',
  'Saad_Al-Ghamdi_64kbps',
  'Waleed_Alnaehi_128kbps',
  'Yasser_Salamah_64kbps',
  'Sahl_Yaseen_128kbps',
  'Ali_Hajjaj_AlSuesy_128kbps',
  'Ali_Jaber_64kbps',
  'Emad_Al-Mansary_128kbps',
  'Fouad_Al-Khamiri_128kbps',
  'Khalid_Al-Qahtani_128kbps',
  'Mohammed_Al-Minshawi_Murattal_128kbps',
  'Mohammed_Siddiq_Al-Minshawi_128kbps',
  'Mohammad_al-Tablawi_128kbps',
  'Rasheed_As-Sufi_128kbps',
  'Tawfeeq_As-Sayegh_128kbps',
  'Yahya_Hawa_128kbps',
  'Zaki_Daghistani_128kbps',
  'AbdulSamad_Murattal_64kbps',
  'AbdulSamad_Mujawwad_64kbps',
];

for (const folder of more) {
  const url = `https://everyayah.com/data/${folder}/001001.mp3`;
  try {
    const r = await fetch(url, { method: 'HEAD' });
    if (r.status === 200) console.log('OK', folder);
  } catch {}
}
