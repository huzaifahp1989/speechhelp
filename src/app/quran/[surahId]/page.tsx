import SurahClient from './SurahClient';

export function generateStaticParams() {
  return Array.from({ length: 114 }, (_, i) => ({
    surahId: (i + 1).toString(),
  }));
}

export default async function SurahPage({ params }: { params: Promise<{ surahId: string }> }) {
  const { surahId } = await params;
  return <SurahClient surahId={surahId} />;
}
