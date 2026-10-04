const candidates = [
  'Alafasy_128kbps',
  'Alafasy_64kbps',
  'Ghamadi_40kbps',
  'Maher_AlMuaiqly_64kbps',
  'Salah_Al_Budair_128kbps',
  'Yasser_Ad-Dussary_128kbps',
  'Hudhaify_128kbps',
  'Abdurrahmaan_As-Sudais_192kbps',
  'Muhammad_Ayyoub_128kbps',
  'Nasser_Alqatami_128kbps',
  'Fares_Abbad_64kbps',
  'Muhammad_Jibreel_128kbps',
  'Abdullah_Basfar_192kbps',
  'Ahmed_Neana_128kbps',
  'Ibrahim_Akhdar_64kbps',
  'Abdullaah_3awwaad_Al-Juhaynee_128kbps',
  'Abdul_Basit_Mujawwad_128kbps',
  'Minshawy_Murattal_128kbps',
  'Hani_Rifai_192kbps',
  'Mustafa_Ismail_48kbps',
  'mahmoud_ali_al_banna_32kbps',
  'Husary_128kbps',
  'Husary_Muallim_128kbps',
  'Parhizgar_48Kbps',
  'Kamil_Jlil_192kbps',
  'Abu_Bakr_Ash-Shaatree_128kbps',
  'Ahmad_Al-Ajmy_128kbps',
  'Akram_Al-Aalaqmi_128kbps',
  'AbdulSamad_64kbps_Murattal',
  'Abdul_Basit_Murattal_192kbps',
  'Salaah_Budair_128kbps',
  'Sa3d_Al-Ghamdi_64kbps',
  'Waleed_Alnaehi_128kbps',
  'Yasser_Salamah_128kbps',
  'Aziz_Alili_128kbps',
  'Bandar_Baleela_128kbps',
  'Khalid_Al-Jalil_128kbps',
  'Mansour_Al-Salimi_128kbps',
  'Mohammad_al-Tablawi_128kbps',
  'Mohammad_Ayyub_128kbps',
  'Rashid_Alafasy_128kbps',
  'Shuraym_128kbps',
  'Sudais_192kbps',
];

for (const folder of candidates) {
  const url = `https://everyayah.com/data/${folder}/001001.mp3`;
  try {
    const r = await fetch(url, { method: 'HEAD' });
    console.log(r.status === 200 ? 'OK' : r.status, folder);
  } catch {
    console.log('ERR', folder);
  }
}
