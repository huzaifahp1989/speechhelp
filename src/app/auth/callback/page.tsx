import { Suspense } from 'react';
import CallbackClient from './CallbackClient';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <CallbackClient />
    </Suspense>
  );
}

