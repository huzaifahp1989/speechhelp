const more = [
  'Ahmad_Al-Ajmi_128kbps',
  'Ahmad_Nafees_128kbps',
  'Bandar_Balila_128kbps',
  'Bandar_Baleelah_128kbps',
  'Khalid_Al-Jalil_128kbps',
  'Khalid_Al-Jalil_64kbps',
  'Mansour_Al-Salimi_128kbps',
  'Mohammad_al-Tablawi_128kbps',
  'Mohammad_al-Tablawi_64kbps',
  'Saad_Al-Ghamdi_128kbps',
  'Saad_Al-Ghamdi_64kbps',
  'Waleed_Alnaehi_128kbps',
  'Yasser_Salamah_128kbps',
  'Yasser_Salamah_64kbps',
  'Khalid_Al-Qahtani_128kbps',
  'Emad_Al-Mansary_128kbps',
  'Fouad_Al-Khamiri_128kbps',
  'Sahl_Yaseen_128kbps',
  'Tawfeeq_As-Sayegh_128kbps',
  'Yahya_Hawa_128kbps',
  'Zaki_Daghistani_128kbps',
  'Parhizgar_128kbps',
  'Kamil_Jlil_128kbps',
  'AbdulSamad_Murattal_128kbps',
  'AbdulSamad_Murattal_64kbps',
  'AbdulSamad_Mujawwad_128kbps',
  'Mohammed_Al-Minshawi_Murattal_128kbps',
  'Mohammed_Siddiq_Al-Minshawi_128kbps',
  'Rasheed_As-Sufi_128kbps',
  'Sudais_128kbps',
  'Shuraym_128kbps',
  'Hudhaify_64kbps',
  'Maher_AlMuaiqly_128kbps',
  'Nasser_Alqatami_64kbps',
  'Muhammad_Ayyoub_64kbps',
  'Abdullah_Basfar_128kbps',
  'Abdullaah_3awwaad_Al-Juhaynee_64kbps',
];

for (const folder of more) {
  const url = `https://everyayah.com/data/${folder}/001001.mp3`;
  try {
    const r = await fetch(url, { method: 'HEAD' });
    if (r.status === 200) console.log('OK', folder);
  } catch {}
}
