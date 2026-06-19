import MushafReader from '@/components/mushaf/MushafReader';
import { TOTAL_MUSHAF_PAGES } from '@/lib/mushaf';

type Props = {
  params: Promise<{ page: string }>;
};

export function generateStaticParams() {
  return Array.from({ length: TOTAL_MUSHAF_PAGES }, (_, i) => ({
    page: String(i + 1),
  }));
}

export default async function MushafPageRoute({ params }: Props) {
  const { page } = await params;
  const pageNum = Math.max(1, Math.min(TOTAL_MUSHAF_PAGES, Number(page) || 1));

  return <MushafReader initialPage={pageNum} />;
}
