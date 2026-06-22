'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Play, Trash2, Share2, Loader2 } from 'lucide-react';
import MobileBottomSheet from '@/components/ui/MobileBottomSheet';
import type { HifzRecordingMeta } from '@/types/hifzRecording';
import { HIFZ_RECORDINGS_UPDATED } from '@/types/hifzRecording';
import {
  deleteHifzRecording,
  formatRecordingDuration,
  getHifzRecordingBlob,
  listHifzRecordings,
  shareHifzRecording,
} from '@/lib/hifzRecordingStore';

type Props = {
  open: boolean;
  onClose: () => void;
  filterVerseKey?: string;
};

export default function HifzRecordingsSheet({ open, onClose, filterVerseKey }: Props) {
  const [recordings, setRecordings] = useState<HifzRecordingMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await listHifzRecordings(filterVerseKey);
    setRecordings(list);
    setLoading(false);
  }, [filterVerseKey]);

  useEffect(() => {
    if (!open) return;
    void refresh();
    const onUpdate = () => void refresh();
    window.addEventListener(HIFZ_RECORDINGS_UPDATED, onUpdate);
    return () => window.removeEventListener(HIFZ_RECORDINGS_UPDATED, onUpdate);
  }, [open, refresh]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const playRecording = async (meta: HifzRecordingMeta) => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const blob = await getHifzRecordingBlob(meta.id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    setPlayingId(meta.id);
    const audio = new Audio(url);
    audio.onended = () => setPlayingId(null);
    void audio.play();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this recording?')) return;
    setBusyId(id);
    await deleteHifzRecording(id);
    if (playingId === id) setPlayingId(null);
    setBusyId(null);
    void refresh();
  };

  const handleShare = async (meta: HifzRecordingMeta) => {
    setBusyId(meta.id);
    try {
      const blob = await getHifzRecordingBlob(meta.id);
      if (blob) await shareHifzRecording(meta, blob);
    } catch {
      /* user cancelled */
    }
    setBusyId(null);
  };

  const content = (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : recordings.length === 0 ? (
        <p className="text-sm text-muted text-center py-10">
          {filterVerseKey
            ? `No recordings for ayah ${filterVerseKey} yet.`
            : 'No saved recitations yet. Record while practicing an ayah.'}
        </p>
      ) : (
        recordings.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-foreground truncate">
                {r.surahName ? `${r.surahName} · ` : ''}
                {r.verseKey}
              </p>
              <p className="text-xs text-muted">
                {new Date(r.createdAt).toLocaleString()} · {formatRecordingDuration(r.durationSec)}
                {r.mistakeCount > 0 ? ` · ${r.mistakeCount} mistakes` : ' · clean'}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => playRecording(r)}
                className="p-2 rounded-lg border border-border hover:bg-primary/5"
                aria-label="Play"
              >
                <Play className={`h-4 w-4 ${playingId === r.id ? 'text-primary' : ''}`} />
              </button>
              <button
                type="button"
                disabled={busyId === r.id}
                onClick={() => handleShare(r)}
                className="p-2 rounded-lg border border-border hover:bg-primary/5"
                aria-label="Share"
              >
                <Share2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={busyId === r.id}
                onClick={() => handleDelete(r.id)}
                className="p-2 rounded-lg border border-border text-red-600 hover:bg-red-50"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <>
      {/* Desktop modal */}
      {open && (
        <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 bg-black/50" onClick={onClose}>
          <div
            className="bg-surface rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold">My Hifz recordings</h2>
              <button type="button" onClick={onClose} className="p-2 rounded-lg border border-border">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-hidden">{content}</div>
          </div>
        </div>
      )}

      {/* Mobile sheet */}
      <div className="md:hidden">
        <MobileBottomSheet open={open} onClose={onClose} title="My Hifz recordings">
          {content}
        </MobileBottomSheet>
      </div>
    </>
  );
}
