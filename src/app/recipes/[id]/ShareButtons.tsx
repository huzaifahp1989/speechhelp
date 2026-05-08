'use client';

import { useMemo, useState } from 'react';
import { Copy, ExternalLink, Facebook, Loader2, Pin, Share2, Twitter } from 'lucide-react';

type Props = {
  title: string;
  imageUrl?: string | null;
};

function encode(s: string) {
  return encodeURIComponent(s);
}

export default function ShareButtons({ title, imageUrl }: Props) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const href = typeof window === 'undefined' ? '' : window.location.href;

  const links = useMemo(() => {
    const text = `${title} (Halal recipe)`;
    const twitter = `https://twitter.com/intent/tweet?text=${encode(text)}&url=${encode(href)}`;
    const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encode(href)}`;
    const pinterest = `https://pinterest.com/pin/create/button/?url=${encode(href)}&description=${encode(text)}${imageUrl ? `&media=${encode(imageUrl)}` : ''}`;
    return { twitter, facebook, pinterest };
  }, [href, imageUrl, title]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  async function shareNative() {
    if (!href) return;
    const nav = navigator as any;
    if (!nav?.share) return;
    setSharing(true);
    try {
      await nav.share({ title, text: `${title} (Halal recipe)`, url: href });
    } catch {
    } finally {
      setSharing(false);
    }
  }

  const canNativeShare = typeof window !== 'undefined' && typeof (navigator as any)?.share === 'function';

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
        <Share2 className="h-4 w-4 text-emerald-700" />
        Share
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={links.facebook}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <Facebook className="h-4 w-4 text-slate-500" />
          Facebook
          <ExternalLink className="h-3 w-3 text-slate-400" />
        </a>
        <a
          href={links.twitter}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <Twitter className="h-4 w-4 text-slate-500" />
          Twitter
          <ExternalLink className="h-3 w-3 text-slate-400" />
        </a>
        <a
          href={links.pinterest}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <Pin className="h-4 w-4 text-slate-500" />
          Pinterest
          <ExternalLink className="h-3 w-3 text-slate-400" />
        </a>
        {canNativeShare && (
          <button
            type="button"
            onClick={shareNative}
            disabled={sharing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {sharing ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : <Share2 className="h-4 w-4 text-slate-500" />}
            Share (Instagram)
          </button>
        )}
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <Copy className="h-4 w-4 text-slate-500" />
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>

      <div className="text-xs text-slate-500">
        Instagram does not support pre-filled captions/links via URL. Use Share (Instagram) on mobile, or Copy link.
      </div>
    </div>
  );
}
