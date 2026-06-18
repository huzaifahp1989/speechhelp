import MushafReader from '@/components/mushaf/MushafReader';

type Props = {
  params: Promise<{ page: string }>;
};

export default async function MushafPageRoute({ params }: Props) {
  const { page } = await params;
  const pageNum = Math.max(1, Math.min(604, Number(page) || 1));

  return <MushafReader initialPage={pageNum} />;
}
