'use client';

import { useMemo } from 'react';

function watchToEmbedUrl(input: string) {
  const raw = String(input || '').trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.replace(/^\//, '').trim();
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (url.hostname.includes('youtube.com')) {
      const id = url.searchParams.get('v')?.trim();
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

function LiveCard(props: { title: string; watchUrl: string }) {
  const embedUrl = useMemo(() => watchToEmbedUrl(props.watchUrl), [props.watchUrl]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900">{props.title}</h2>
        <div className="mt-1 text-sm text-slate-600 break-all">{props.watchUrl}</div>
      </div>
      <div className="relative w-full aspect-video bg-black">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={props.title}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-200">
            Invalid YouTube link
          </div>
        )}
      </div>
    </div>
  );
}

export default function HaramainPage() {
  const MAKKAH_WATCH_URL = 'https://www.youtube.com/watch?v=fZvuHkHYaXk';
  const MADINAH_WATCH_URL = '';

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Haramain Live</h1>
          <p className="mt-2 text-slate-600">Live streams for Masjid al-Haram (Makkah) and Masjid an-Nabawi (Madinah).</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LiveCard title="Makkah Live" watchUrl={MAKKAH_WATCH_URL} />
          {MADINAH_WATCH_URL ? (
            <LiveCard title="Madinah Live" watchUrl={MADINAH_WATCH_URL} />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900">Madinah Live</h2>
              <p className="mt-2 text-sm text-slate-600">Send the Madinah YouTube live link and I’ll add it here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

