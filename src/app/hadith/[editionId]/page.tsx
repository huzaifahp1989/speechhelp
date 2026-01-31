import CollectionClient from './CollectionClient';

const COLLECTION_NAMES: Record<string, string> = {
  bukhari: 'Sahih al-Bukhari',
  muslim: 'Sahih Muslim',
  abudawud: 'Sunan Abu Dawud',
  tirmidhi: 'Jami` at-Tirmidhi',
  nasai: 'Sunan an-Nasa\'i',
  ibnmajah: 'Sunan Ibn Majah',
  riyadussalihin: 'Riyad as-Salihin',
  nawawi: '40 Hadith Nawawi',
  qudsi: '40 Hadith Qudsi',
  malik: 'Muwatta Malik',
  ahmed: 'Musnad Ahmad',
  darimi: 'Sunan al-Darimi',
  adab: 'Al-Adab Al-Mufrad',
};

export function generateStaticParams() {
  return Object.keys(COLLECTION_NAMES).map((editionId) => ({
    editionId,
  }));
}

export default function EditionPage() {
  return <CollectionClient />;
}
