'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Megaphone, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import {
  dismissAnnouncement,
  pickAnnouncementForPath,
} from '@/lib/announcements';
import type { SiteAnnouncement } from '@/types/announcement';

export default function AnnouncementPopup() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [announcement, setAnnouncement] = useState<SiteAnnouncement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (pathname?.startsWith('/admin')) return;

    let cancelled = false;

    async function load() {
      const supabase = getSupabaseClient();
      if (!supabase || !pathname) return;

      const { data, error } = await supabase
        .from('site_announcements')
        .select('*')
        .order('priority', { ascending: false })
        .order('starts_at', { ascending: false });

      if (cancelled || error || !data?.length) {
        if (!cancelled) {
          setAnnouncement(null);
          setOpen(false);
        }
        return;
      }

      const match = pickAnnouncementForPath(data as SiteAnnouncement[], pathname);
      if (!cancelled) {
        setAnnouncement(match);
        setOpen(Boolean(match));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => {
    if (announcement?.show_once) dismissAnnouncement(announcement.id);
    setOpen(false);
  };

  if (!mounted || !open || !announcement) return null;

  return createPortal(
    <>
      <button
        type="button"
        onClick={close}
        aria-label="Close announcement"
        className="fixed inset-0 z-[70] bg-slate-950/55 backdrop-blur-[2px] touch-manipulation"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-announcement-title"
        className="fixed inset-x-0 bottom-0 z-[71] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 flex w-full sm:max-w-lg flex-col max-h-[min(92dvh,720px)] sm:max-h-[min(85dvh,640px)] min-h-0 rounded-t-2xl sm:rounded-2xl bg-[#fffef9] shadow-2xl border border-[#d4c4a0]/60 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-[#d4c4a0]/80" />
        </div>

        <div className="shrink-0 px-4 sm:px-6 pt-2 sm:pt-5 pb-3 border-b border-[#d4c4a0]/40 bg-gradient-to-br from-amber-50/80 to-[#fffef9]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-900 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide">
                <Megaphone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Announcement
              </span>
              <h2
                id="site-announcement-title"
                className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-[#1a2e1a] break-words"
              >
                {announcement.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={close}
              className="shrink-0 p-2 -mr-1 rounded-lg hover:bg-amber-100/60 text-[#5a6b5a] touch-manipulation"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4">
          <p className="text-sm sm:text-base text-[#1a2e1a] leading-relaxed whitespace-pre-wrap break-words">
            {announcement.body}
          </p>
          {announcement.link_url && (
            <Link
              href={announcement.link_url}
              onClick={close}
              className="inline-flex mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
            >
              {announcement.link_label || 'Learn more'}
            </Link>
          )}
        </div>

        <div className="shrink-0 px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:py-4 border-t border-[#d4c4a0]/40 bg-white/95">
          <button
            type="button"
            onClick={close}
            className="w-full rounded-xl bg-[#0d4f4f] hover:bg-[#146356] active:bg-[#0a3d3d] text-white font-semibold py-3 text-sm transition-colors touch-manipulation"
          >
            Got it
          </button>
          {announcement.show_once && (
            <p className="mt-1.5 sm:mt-2 text-center text-[10px] sm:text-[11px] text-[#5a6b5a]">
              Won&apos;t show again after you dismiss.
            </p>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
