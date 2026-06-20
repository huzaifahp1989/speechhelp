'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import QuickLinksMenu from '@/components/QuickLinksMenu';
import WhatsNewJune2026Popup from '@/components/WhatsNewJune2026Popup';
import { initQuranAutoplayGuard, stopGlobalQuranAudio } from '@/lib/quranAudio';

function isQuranReaderPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    /^\/quran\/juz\/\d+/.test(pathname) ||
    /^\/quran\/\d+/.test(pathname) ||
    (pathname.startsWith('/quran/mushaf/') && pathname !== '/quran/mushaf')
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMushafReader = pathname?.startsWith('/quran/mushaf/') && pathname !== '/quran/mushaf';
  const isReader = isQuranReaderPath(pathname);

  useEffect(() => {
    initQuranAutoplayGuard();
  }, []);

  useEffect(() => {
    if (!isQuranReaderPath(pathname)) {
      stopGlobalQuranAudio();
    }
  }, [pathname]);

  if (isMushafReader) {
    return (
      <>
        {children}
        <WhatsNewJune2026Popup />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className={`flex-grow min-w-0 ${isReader ? 'overflow-x-hidden' : ''}`}>{children}</main>
      {!isReader && <Footer />}
      {!isReader && <QuickLinksMenu />}
      <WhatsNewJune2026Popup />
    </>
  );
}
