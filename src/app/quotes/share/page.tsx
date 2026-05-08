import { Suspense } from 'react';
import ShareClient from './ShareClient';

export default function QuoteSharePage() {
  return (
    <Suspense>
      <ShareClient />
    </Suspense>
  );
}
