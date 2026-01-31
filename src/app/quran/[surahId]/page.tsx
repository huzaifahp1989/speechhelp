import SurahClient from './SurahClient';

export function generateStaticParams() {
  return Array.from({ length: 114 }, (_, i) => ({
    surahId: (i + 1).toString(),
  }));
}

export default function SurahPage() {
  return <SurahClient />;
}
