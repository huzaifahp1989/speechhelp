'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { QuoteCategory } from '@/data/quotes';
import { Check, Copy, Quote as QuoteIcon, Share2 } from 'lucide-react';

type ShareQuotePayload = {
  t: string;
  a: string;
  c: QuoteCategory;
  s?: string;
};

function fromBase64Url(value: string) {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function getGradient(category: QuoteCategory) {
  switch (category) {
    case 'Wisdom':
      return 'from-slate-700 to-slate-900';
    case 'Motivation':
      return 'from-emerald-600 to-teal-900';
    case 'Spiritual':
      return 'from-violet-600 to-purple-900';
    case 'Character':
      return 'from-blue-600 to-indigo-900';
    case 'Family':
      return 'from-rose-700 to-pink-900';
    case 'Repentance':
      return 'from-amber-700 to-orange-900';
  }
}

export default function ShareClient() {
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const payload = useMemo(() => {
    const raw = searchParams.get('q');
    if (!raw) return null;
    try {
      const json = fromBase64Url(raw);
      const parsed = JSON.parse(json) as ShareQuotePayload;
      if (!parsed?.t || !parsed?.a || !parsed?.c) return null;
      return parsed;
    } catch {
      return null;
    }
  }, [searchParams]);

  if (!payload) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Invalid Quote Link</h1>
          <p className="mt-2 text-slate-600">This link doesn’t contain a valid quote.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">Shared Quote</h1>
            <div className="mt-1 flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wide">{payload.c}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600 truncate">{payload.a}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(`"${payload.t}" — ${payload.a}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              title="Copy Quote"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={async () => {
                const url = window.location.href;
                try {
                  if (navigator.share) {
                    await navigator.share({
                      title: 'Islamic Quote',
                      text: `"${payload.t}" — ${payload.a}`,
                      url,
                    });
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                    return;
                  }
                } catch {
                }
                await navigator.clipboard.writeText(url);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              title="Share / Copy Link"
            >
              {linkCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200 aspect-[4/5] sm:aspect-[16/9]">
          <div className={`absolute inset-0 bg-gradient-to-br ${getGradient(payload.c)} opacity-95`}></div>
          <div className="absolute inset-0 opacity-10 bg-[url('/patterns/islamic-geometry.png')] bg-repeat"></div>
          <div className="absolute inset-0 p-8 sm:p-10 flex flex-col justify-between text-white">
            <QuoteIcon className="w-10 h-10 opacity-50" />
            <div className="flex-1 flex items-center justify-center text-center">
              <p className="text-xl sm:text-3xl font-serif leading-relaxed drop-shadow-md max-w-3xl">
                &quot;{payload.t}&quot;
              </p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg sm:text-xl tracking-wide uppercase border-t border-white/30 pt-4 inline-block">
                {payload.a}
              </p>
              {payload.s && <p className="mt-2 text-white/80 text-sm">{payload.s}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

