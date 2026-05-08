import { Suspense } from 'react';
import TrackerClient from './TrackerClient';

export default function TrackerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <TrackerClient />
    </Suspense>
  );
}

