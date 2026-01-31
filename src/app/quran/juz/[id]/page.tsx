import JuzClient from './JuzClient';

export function generateStaticParams() {
  return Array.from({ length: 30 }, (_, i) => ({
    id: (i + 1).toString(),
  }));
}

export default async function JuzPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JuzClient id={id} />;
}
