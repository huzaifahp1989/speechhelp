import { useCallback, useEffect, useRef, useState } from 'react';
import {
  alignRecitation,
  expectedWordTargets,
  tokenizeSpeech,
} from '@/lib/arabicRecitationMatch';
import { countSpeakableWords, getSpeakableWordIndex } from '@/lib/quranWords';
import type { QuranWord } from '@/types/quranWord';
import { useRecitationListen } from '@/hooks/useRecitationListen';
import { AnalyticsEvents } from '@/lib/analytics';

type PlayWordFn = (
  word: QuranWord,
  options?: { wordIndex?: number; speakableWordCount?: number; ayahAudioUrl?: string }
) => void;

type Options = {
  playWord: PlayWordFn;
};

export function useRecitationCheck({ playWord }: Options) {
  const [enabled, setEnabled] = useState(false);
  const [activeVerseKey, setActiveVerseKey] = useState<string | null>(null);
  const [words, setWords] = useState<QuranWord[]>([]);
  const [ayahAudioUrl, setAyahAudioUrl] = useState<string | undefined>();
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [mistakeWordIds, setMistakeWordIds] = useState<number[]>([]);
  const [correctionWordId, setCorrectionWordId] = useState<number | null>(null);
  const [listeningPaused, setListeningPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastHeard, setLastHeard] = useState<string | null>(null);

  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const lastMistakeIndexRef = useRef<number | null>(null);
  const lastCorrectionAtRef = useRef(0);
  const wordsRef = useRef(words);
  const ayahAudioUrlRef = useRef(ayahAudioUrl);
  const activeVerseKeyRef = useRef(activeVerseKey);
  wordsRef.current = words;
  ayahAudioUrlRef.current = ayahAudioUrl;
  activeVerseKeyRef.current = activeVerseKey;

  const speakableWords = words.filter((w) => w.char_type_name !== 'end');
  const totalWords = speakableWords.length;

  const resetSession = useCallback(() => {
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    lastMistakeIndexRef.current = null;
    setCurrentWordIndex(0);
    setMistakeWordIds([]);
    setCorrectionWordId(null);
    setLastHeard(null);
    setError(null);
  }, []);

  const processTranscript = useCallback(
    (fullText: string) => {
      const ayahWords = wordsRef.current;
      const speakable = ayahWords.filter((w) => w.char_type_name !== 'end');
      if (!speakable.length || !fullText.trim()) return;

      const tokens = tokenizeSpeech(fullText);
      if (!tokens.length) return;

      setLastHeard(fullText.trim());

      const expected = expectedWordTargets(speakable);
      const { matchedCount, mistakeIndex } = alignRecitation(expected, tokens);

      setCurrentWordIndex(matchedCount);

      if (
        mistakeIndex !== null &&
        mistakeIndex !== lastMistakeIndexRef.current &&
        mistakeIndex < speakable.length
      ) {
        const wrongWord = speakable[mistakeIndex];
        lastMistakeIndexRef.current = mistakeIndex;
        setMistakeWordIds((prev) =>
          prev.includes(wrongWord.id) ? prev : [...prev, wrongWord.id]
        );
        void AnalyticsEvents.mistakeDetected(
          activeVerseKeyRef.current ?? wrongWord.verse_key ?? 'unknown',
          mistakeIndex + 1
        );

        const now = Date.now();
        if (now - lastCorrectionAtRef.current > 1200) {
          lastCorrectionAtRef.current = now;
          setCorrectionWordId(wrongWord.id);
          const wordIndex = getSpeakableWordIndex(ayahWords, wrongWord);
          void playWord(wrongWord, {
            wordIndex,
            speakableWordCount: countSpeakableWords(ayahWords),
            ayahAudioUrl: ayahAudioUrlRef.current,
          });
        }
      }

      if (matchedCount >= speakable.length) {
        finalTranscriptRef.current = '';
        interimTranscriptRef.current = '';
        lastMistakeIndexRef.current = null;
      }
    },
    [playWord]
  );

  const handleTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      if (isFinal) {
        finalTranscriptRef.current = `${finalTranscriptRef.current} ${text}`.trim();
        interimTranscriptRef.current = '';
      } else {
        interimTranscriptRef.current = text;
      }

      const fullText = `${finalTranscriptRef.current} ${interimTranscriptRef.current}`.trim();
      processTranscript(fullText);
    },
    [processTranscript]
  );

  const startAyah = useCallback(
    (verseKey: string, ayahWords: QuranWord[], audioUrl?: string) => {
      setActiveVerseKey(verseKey);
      setWords(ayahWords);
      setAyahAudioUrl(audioUrl);
      resetSession();
      setEnabled(true);
      void AnalyticsEvents.mistakeCheckToggle(true, verseKey);
    },
    [resetSession]
  );

  const stop = useCallback(() => {
    setEnabled(false);
    setActiveVerseKey(null);
    setWords([]);
    resetSession();
    void AnalyticsEvents.mistakeCheckToggle(false);
  }, [resetSession]);

  const toggle = useCallback(() => {
    if (enabled) {
      stop();
    } else {
      setEnabled(true);
      setError(null);
      void AnalyticsEvents.mistakeCheckToggle(true);
    }
  }, [enabled, stop]);

  const { isListening, isSupported } = useRecitationListen({
    enabled: enabled && !!activeVerseKey && !listeningPaused && totalWords > 0,
    onTranscript: handleTranscript,
    onError: setError,
  });

  useEffect(() => {
    if (!correctionWordId) return;
    const t = setTimeout(() => setCorrectionWordId(null), 1500);
    return () => clearTimeout(t);
  }, [correctionWordId]);

  const currentWordId =
    currentWordIndex < speakableWords.length ? speakableWords[currentWordIndex]?.id ?? null : null;

  return {
    enabled,
    activeVerseKey,
    currentWordIndex,
    currentWordId,
    mistakeWordIds,
    correctionWordId,
    completedCount: currentWordIndex,
    totalWords,
    isListening,
    isSupported,
    error,
    lastHeard,
    startAyah,
    stop,
    toggle,
    setEnabled,
    pauseListening: () => setListeningPaused(true),
    resumeListening: () => setListeningPaused(false),
    listeningPaused,
  };
}
