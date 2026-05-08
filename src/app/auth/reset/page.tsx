import { Suspense } from 'react';
import ResetClient from './ResetClient';

export default function AuthResetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <ResetClient />
    </Suspense>
  );
}

