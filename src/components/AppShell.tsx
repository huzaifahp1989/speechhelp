'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import QuickLinksMenu from '@/components/QuickLinksMenu';
import { initQuranAutoplayGuard, stopGlobalQuranAudio } from '@/lib/quranAudio';

function isQuranReaderPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return /^\/quran\/juz\/\d+/.test(pathname) || /^\/quran\/\d+/.test(pathname);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMushafReader = pathname?.startsWith('/quran/mushaf/') && pathname !== '/quran/mushaf';

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
        <QuickLinksMenu />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
      <QuickLinksMenu />
    </>
  );
}
