'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Calendar,
  MessageCircle,
  Mic,
  Trophy,
} from 'lucide-react';

type FeatureSlide = {
  title: string;
  description: string;
  href: string;
  cta: string;
  eyebrow: string;
  statLabel: string;
  statValue: string;
  bullets: string[];
  icon: LucideIcon;
  accentClass: string;
  panelClass: string;
};

const featureSlides: FeatureSlide[] = [
  {
    title: 'Find ayat fast with focused Qur’an search',
    description:
      'Jump from a topic to the right surah, juz, or verse without digging through long lists. Built for study circles, khutbah prep, and daily revision.',
    href: '/quran',
    cta: 'Open Qur’an',
    eyebrow: 'Feature 01',
    statLabel: 'Search path',
    statValue: 'Surah + Juz',
    bullets: ['Topic-led lookup', 'Quick navigation by surah', 'Useful for lesson prep'],
    icon: BookOpen,
    accentClass: 'from-emerald-300/30 via-teal-200/10 to-cyan-300/20',
    panelClass: 'border-emerald-300/30 bg-emerald-400/10',
  },
  {
    title: 'Pull hadith references without losing context',
    description:
      'Move from key concepts to searchable hadith collections, then keep reliable references in reach while building talks or notes.',
    href: '/hadith',
    cta: 'Browse Hadith',
    eyebrow: 'Feature 02',
    statLabel: 'Best for',
    statValue: 'Evidence-first notes',
    bullets: ['Collection browsing', 'Topic-driven discovery', 'Pairs with lecture building'],
    icon: Bookmark,
    accentClass: 'from-amber-300/30 via-orange-200/10 to-yellow-300/20',
    panelClass: 'border-amber-300/30 bg-amber-400/10',
  },
  {
    title: 'Use voice search when typing slows you down',
    description:
      'Open the mic, speak your query, and get to the right content faster on mobile when you are walking, teaching, or switching tasks.',
    href: '/voice-search',
    cta: 'Try Voice Search',
    eyebrow: 'Feature 03',
    statLabel: 'Mobile mode',
    statValue: 'Hands-light lookup',
    bullets: ['Built for phones', 'Fast spoken queries', 'Useful during review sessions'],
    icon: Mic,
    accentClass: 'from-sky-300/30 via-blue-200/10 to-indigo-300/20',
    panelClass: 'border-sky-300/30 bg-sky-400/10',
  },
  {
    title: 'Ask Mufti when a search result is not enough',
    description:
      'Search trusted sources by topic first, then escalate to a real question flow when you need clarity on fiqh or practical issues.',
    href: '/ask-mufti',
    cta: 'Ask a Mufti',
    eyebrow: 'Feature 04',
    statLabel: 'Trusted flow',
    statValue: 'Search then ask',
    bullets: ['Topic shortcuts', 'Trusted source links', 'Useful for sensitive questions'],
    icon: MessageCircle,
    accentClass: 'from-blue-300/30 via-cyan-200/10 to-teal-300/20',
    panelClass: 'border-blue-300/30 bg-blue-400/10',
  },
  {
    title: 'Keep hifz targets visible and practical',
    description:
      'Break memorisation into a plan you can actually follow on mobile, with structure that supports consistency instead of overwhelm.',
    href: '/hifz-planner',
    cta: 'Open Planner',
    eyebrow: 'Feature 05',
    statLabel: 'Planning style',
    statValue: 'Daily cadence',
    bullets: ['Revision-friendly', 'Designed for regular pace', 'Easy to revisit on phone'],
    icon: Calendar,
    accentClass: 'from-fuchsia-300/30 via-pink-200/10 to-rose-300/20',
    panelClass: 'border-fuchsia-300/30 bg-fuchsia-400/10',
  },
  {
    title: 'Track worship goals without a cluttered dashboard',
    description:
      'Move between tasbeeh, tracker, and khatam-style habits from one place and keep momentum visible with simple progress cues.',
    href: '/tracker',
    cta: 'View Tracker',
    eyebrow: 'Feature 06',
    statLabel: 'Daily focus',
    statValue: 'Habit momentum',
    bullets: ['Clear progress cues', 'Built for repeat use', 'Works well with tasbeeh tools'],
    icon: Trophy,
    accentClass: 'from-lime-300/30 via-emerald-200/10 to-green-300/20',
    panelClass: 'border-lime-300/30 bg-lime-400/10',
  },
];

export default function HomeFeatureSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  const scrollToIndex = (index: number) => {
    const slider = sliderRef.current;
    if (!slider) return;

    const nextIndex = (index + featureSlides.length) % featureSlides.length;
    const nextSlide = slider.children.item(nextIndex) as HTMLElement | null;
    if (!nextSlide) return;

    nextSlide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    setActiveIndex(nextIndex);
  };

  const handleScroll = () => {
    const slider = sliderRef.current;
    if (!slider) return;

    const slideWidth = slider.clientWidth;
    if (slideWidth <= 0) return;

    const nextIndex = Math.round(slider.scrollLeft / slideWidth);
    if (nextIndex !== activeIndex && nextIndex >= 0 && nextIndex < featureSlides.length) {
      setActiveIndex(nextIndex);
    }
  };

  const activeSlide = featureSlides[activeIndex] || featureSlides[0];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-slate-950 text-white shadow-[0_30px_80px_rgba(15,23,42,0.35)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.24),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.18),_transparent_30%)]" />
      <div className="relative grid gap-6 p-4 sm:p-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8 lg:p-8">
        <div className="flex flex-col justify-between rounded-[1.75rem] border border-white/10 bg-white/8 p-5 backdrop-blur-sm sm:p-6">
          <div className="space-y-5">
            <div className="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/75">
              Explore the platform
            </div>
            <div className="space-y-3">
              <h2 className="max-w-md text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-[2.35rem] lg:leading-[1.05]">
                Swipe through the tools that make the home page worth returning to.
              </h2>
              <p className="max-w-lg text-sm leading-6 text-slate-200 sm:text-base">
                Each card highlights one feature only, so mobile users can move quickly without reading a dense landing page.
              </p>
            </div>
          </div>

          <div className={`mt-6 rounded-[1.5rem] border p-4 sm:p-5 ${activeSlide.panelClass}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">Now showing</p>
            <div className="mt-3 flex items-start gap-4">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
                <activeSlide.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/70">{activeSlide.eyebrow}</p>
                <h3 className="mt-1 text-lg font-bold text-white">{activeSlide.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-200">{activeSlide.description}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div
            ref={sliderRef}
            onScroll={handleScroll}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {featureSlides.map((slide, index) => (
              <article
                key={slide.title}
                className="relative min-w-full snap-start overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur-md sm:p-6"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${slide.accentClass}`} />
                <div className="absolute -right-12 top-8 h-28 w-28 rounded-full border border-white/15 bg-white/10 blur-2xl" />
                <div className="relative flex h-full flex-col justify-between gap-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">{slide.eyebrow}</p>
                      <h3 className="mt-3 max-w-md text-2xl font-black leading-tight text-white sm:text-[2rem]">
                        {slide.title}
                      </h3>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-slate-950/25 p-3">
                      <slide.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>

                  <p className="max-w-xl text-sm leading-7 text-slate-100 sm:text-base">{slide.description}</p>

                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/25 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">{slide.statLabel}</p>
                      <p className="mt-2 text-xl font-bold text-white">{slide.statValue}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {slide.bullets.map((bullet) => (
                          <span
                            key={bullet}
                            className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/85"
                          >
                            {bullet}
                          </span>
                        ))}
                      </div>
                    </div>

                    <Link
                      href={slide.href}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
                    >
                      {slide.cta} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="text-right text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
                    0{index + 1} / 0{featureSlides.length}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-3">
            <div className="flex items-center gap-2">
              {featureSlides.map((slide, index) => (
                <button
                  key={slide.title}
                  type="button"
                  onClick={() => scrollToIndex(index)}
                  aria-label={`Show ${slide.title}`}
                  className={`h-2.5 rounded-full transition-all ${index === activeIndex ? 'w-8 bg-white' : 'w-2.5 bg-white/35 hover:bg-white/60'}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollToIndex(activeIndex - 1)}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => scrollToIndex(activeIndex + 1)}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}