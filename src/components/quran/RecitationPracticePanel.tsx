'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { Circle, Square, Share2, FolderOpen, Loader2 } from 'lucide-react';
import RecitationCheckBar from '@/components/quran/RecitationCheckBar';
import HifzRecordingsSheet from '@/components/quran/HifzRecordingsSheet';
import { useHifzVoiceRecorder } from '@/hooks/useHifzVoiceRecorder';
import { useMistakeCheckToggle } from '@/hooks/useMistakeCheckToggle';
import {
  formatRecordingDuration,
  getHifzRecordingBlob,
  shareHifzRecording,
} from '@/lib/hifzRecordingStore';
import type { useRecitationCheck } from '@/hooks/useRecitationCheck';

type RecitationApi = ReturnType<typeof useRecitationCheck>;

type Props = {
  recitation: RecitationApi;
  practiceVerseKey: string | null;
  surahId?: number;
  surahName?: string;
  juz?: number;
  onStartPractice?: (verseKey: string) => void;
  className?: string;
};

export default function RecitationPracticePanel({
  recitation,
  practiceVerseKey,
  surahId,
  surahName,
  juz,
  onStartPractice,
  className,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const recorder = useHifzVoiceRecorder({
    onRecordingStart: () => recitation.pauseListening(),
    onRecordingStop: () => recitation.resumeListening(),
  });

  const activeKey = recitation.activeVerseKey ?? practiceVerseKey;

  const buildContext = () => ({
    verseKey: activeKey!,
    surahId,
    surahName,
    juz,
    mistakeCount: recitation.mistakeWordIds.length,
    wordsCompleted: recitation.completedCount,
    wordsTotal: recitation.totalWords,
  });

  const handleRecordToggle = () => {
    if (!activeKey) return;
    if (recorder.isRecording) {
      recorder.stopRecording({
        mistakeCount: recitation.mistakeWordIds.length,
        wordsCompleted: recitation.completedCount,
        wordsTotal: recitation.totalWords,
      });
    } else {
      void recorder.startRecording(buildContext());
    }
  };

  const handleShare = async () => {
    if (!recorder.lastSaved) return;
    try {
      const blob = await getHifzRecordingBlob(recorder.lastSaved.id);
      if (!blob) return;
      const result = await shareHifzRecording(recorder.lastSaved, blob);
      setShareStatus(result === 'shared' ? 'Shared with teacher!' : 'Downloaded — send the file to your teacher.');
      setTimeout(() => setShareStatus(null), 4000);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setShareStatus('Could not share. Try again.');
      }
    }
  };

  const handleMistakeToggle = useMistakeCheckToggle(recitation, practiceVerseKey, onStartPractice);

  return (
    <div className={clsx('space-y-3', className)}>
      <RecitationCheckBar
        enabled={recitation.enabled}
        isListening={recitation.isListening}
        isSupported={recitation.isSupported}
        activeVerseKey={recitation.activeVerseKey}
        practiceVerseKey={practiceVerseKey}
        completedCount={recitation.completedCount}
        totalWords={recitation.totalWords}
        error={recitation.error}
        lastHeard={recitation.lastHeard}
        onToggle={handleMistakeToggle}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Record recitation</p>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            My recordings
          </button>
        </div>

        {!recorder.isSupported ? (
          <p className="text-[11px] text-amber-700">Recording not supported in this browser.</p>
        ) : (
          <>
            <p className="text-[11px] text-slate-500">
              {activeKey
                ? `Recording for ayah ${activeKey}${recorder.isRecording ? ` · ${formatRecordingDuration(recorder.durationSec)}` : ''}`
                : 'Tap an ayah first, then record your recitation to save and share.'}
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!activeKey || recorder.isSaving}
                onClick={handleRecordToggle}
                className={clsx(
                  'inline-flex items-center gap-2 min-h-[40px] px-4 rounded-xl text-sm font-bold border transition-all',
                  recorder.isRecording
                    ? 'bg-rose-600 border-rose-600 text-white animate-pulse'
                    : 'bg-slate-900 border-slate-900 text-white disabled:opacity-40'
                )}
              >
                {recorder.isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : recorder.isRecording ? (
                  <Square className="h-4 w-4 fill-current" />
                ) : (
                  <Circle className="h-4 w-4 fill-current text-rose-400" />
                )}
                {recorder.isSaving ? 'Saving…' : recorder.isRecording ? 'Stop & save' : 'Record'}
              </button>

              {recorder.previewUrl && recorder.lastSaved && (
                <>
                  <audio src={recorder.previewUrl} controls className="h-10 max-w-[200px]" />
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-primary text-primary text-sm font-bold"
                  >
                    <Share2 className="h-4 w-4" />
                    Share with teacher
                  </button>
                </>
              )}
            </div>

            {recorder.lastSaved && (
              <p className="text-[11px] text-emerald-700">
                Saved · {formatRecordingDuration(recorder.lastSaved.durationSec)}
                {recorder.lastSaved.mistakeCount > 0
                  ? ` · ${recorder.lastSaved.mistakeCount} mistake${recorder.lastSaved.mistakeCount !== 1 ? 's' : ''}`
                  : ' · no mistakes detected'}
              </p>
            )}

            {recorder.error && <p className="text-[11px] text-red-600">{recorder.error}</p>}
            {shareStatus && <p className="text-[11px] text-primary font-medium">{shareStatus}</p>}
          </>
        )}
      </div>

      <HifzRecordingsSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filterVerseKey={activeKey ?? undefined}
      />
    </div>
  );
}
