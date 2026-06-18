'use client';

import { useEffect, useState } from 'react';
import {
  Baby,
  BookOpen,
  ExternalLink,
  LayoutGrid,
  Megaphone,
  Music,
  Radio,
  Video,
  X,
} from 'lucide-react';

const LINKS = [
  {
    label: 'Kids Zone',
    href: 'https://islamic-kids-platform.vercel.app/',
    icon: Baby,
    description: 'Islamic learning for children',
  },
  {
    label: 'Advert',
    href: 'https://traeadvert8pia.vercel.app/',
    icon: Megaphone,
    description: 'Promotions & announcements',
  },
  {
    label: 'Media',
    href: 'https://create-me-a-audio.vercel.app/',
    icon: Music,
    description: 'Audio & media library',
  },
  {
    label: 'Stream',
    href: 'https://traet2lhw4m4.vercel.app/',
    icon: Radio,
    description: 'Live streaming',
  },
  {
    label: 'Quran',
    href: 'https://traet2lhw4m4.vercel.app/#quran',
    icon: BookOpen,
    description: 'Quran reading & listening',
  },
  {
    label: 'Videos',
    href: 'https://create-me-videos-website.vercel.app/',
    icon: Video,
    description: 'Islamic video content',
  },
] as const;

export default function QuickLinksMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[110] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-all hover:scale-105 hover:bg-primary-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        aria-label="Open quick links menu"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <LayoutGrid className="h-6 w-6" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center sm:p-6"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-links-title"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/60 bg-primary px-5 py-4">
              <div>
                <h2 id="quick-links-title" className="text-lg font-bold text-white">
                  Quick Links
                </h2>
                <p className="text-xs text-white/75">Explore more Islamic platforms</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-white/90 transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="max-h-[min(70dvh,480px)] overflow-y-auto p-3">
              <ul className="space-y-1">
                {LINKS.map(({ label, href, icon: Icon, description }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setOpen(false)}
                      className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-primary/8 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 font-semibold text-foreground">
                          {label}
                          <ExternalLink className="h-3.5 w-3.5 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                        </span>
                        <span className="block truncate text-xs text-muted">{description}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
