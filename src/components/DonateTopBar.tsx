'use client';

import { Heart } from 'lucide-react';
import { AnalyticsEvents } from '@/lib/analytics';

const DONATE_URL = 'https://islam-media-donate.vercel.app/';

/** Slim top bar — help grow SpeechHelp with a small donation. */
export default function DonateTopBar() {
  return (
    <div className="relative z-[60] border-b border-[#d4c4a0]/50 bg-[#0d4f4f] text-[#fffef9]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-1.5 sm:px-6 lg:px-8">
        <p className="min-w-0 truncate text-[11px] leading-tight text-[#fffef9]/90 sm:text-xs">
          Help grow the app with a little donation
        </p>
        <a
          href={DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void AnalyticsEvents.featureClick('donate', 'top_bar')}
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#fffef9] px-2.5 py-1 text-[11px] font-semibold text-[#0d4f4f] transition-colors hover:bg-[#f5f0e6] sm:text-xs"
        >
          <Heart className="h-3 w-3 fill-current" aria-hidden />
          Donate
        </a>
      </div>
    </div>
  );
}
