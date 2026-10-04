'use client';

import { Suspense, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import QuickLinksMenu from '@/components/QuickLinksMenu';
import AnnouncementPopup from '@/components/AnnouncementPopup';
import SignupTrackerPopup from '@/components/SignupTrackerPopup';
import FirebaseAnalytics from '@/components/FirebaseAnalytics';
import OneSignalProvider from '@/components/OneSignalProvider';
import PushSubscribeBanner from '@/components/PushSubscribeBanner';
import SalahAlarmRunner from '@/components/SalahAlarmRunner';
import DonateTopBar from '@/components/DonateTopBar';
import WhatsNewPopup from '@/components/WhatsNewPopup';
import { initQuranAutoplayGuard, stopGlobalQuranAudio } from '@/lib/quranAudio';

function isQuranReaderPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    /^\/quran\/juz\/\d+/.test(pathname) ||
    /^\/quran\/\d+/.test(pathname) ||
    pathname === '/quran/mushaf-13'
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isReader = isQuranReaderPath(pathname);
  const isListenPage = pathname === '/quran/listen';

  useEffect(() => {
    initQuranAutoplayGuard();
  }, []);

  useEffect(() => {
    if (!isQuranReaderPath(pathname)) {
      stopGlobalQuranAudio();
    }
  }, [pathname]);

  const analytics = (
    <Suspense fallback={null}>
      <FirebaseAnalytics />
    </Suspense>
  );

  const pushAndAlarms = (
    <>
      <OneSignalProvider />
      <SalahAlarmRunner />
      <PushSubscribeBanner />
    </>
  );

  return (
    <>
      {analytics}
      {pushAndAlarms}
      <DonateTopBar />
      <WhatsNewPopup />
      <Navbar />
      <main className={`flex-grow min-w-0 ${isReader ? 'overflow-x-hidden' : ''}`}>
        <div key={pathname ?? 'app-route'} className="app-route-transition min-w-0">
          {children}
        </div>
      </main>
      {!isReader && <Footer />}
      {!isReader && !isListenPage && <QuickLinksMenu />}
      <AnnouncementPopup />
      <SignupTrackerPopup key={pathname ?? 'app'} />
    </>
  );
}
