import { useCallback, useEffect, useRef, useState } from 'react';
import {
  alignRecitation,
  expectedWordTexts,
  tokenizeArabicSpeech,
} from '@/lib/arabicRecitationMatch';
import { countSpeakableWords, getSpeakableWordIndex } from '@/lib/quranWords';
import type { QuranWord } from '@/types/quranWord';
import { useRecitationListen } from '@/hooks/useRecitationListen';

type PlayWordFn = (
  word: QuranWord,
  options?: { wordIndex?: number; speakableWordCount?: number; ayahAudioUrl?: string }
) => void;

type Options = {
  playWord: PlayWordFn;
};

export type RecitationCheckState = {
  enabled: boolean;
  activeVerseKey: string | null;
  currentWordIndex: number;
  mistakeWordIds: number[];
  correctionWordId: number | null;
  completedCount: number;
  totalWords: number;
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
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

  const spokenBufferRef = useRef<string[]>([]);
  const lastMistakeIndexRef = useRef<number | null>(null);
  const lastCorrectionAtRef = useRef(0);
  const wordsRef = useRef(words);
  wordsRef.current = words;

  const speakableWords = words.filter((w) => w.char_type_name !== 'end');
  const totalWords = speakableWords.length;

  const resetSession = useCallback(() => {
    spokenBufferRef.current = [];
    lastMistakeIndexRef.current = null;
    setCurrentWordIndex(0);
    setMistakeWordIds([]);
    setCorrectionWordId(null);
    setError(null);
  }, []);

  const startAyah = useCallback(
    (verseKey: string, ayahWords: QuranWord[], audioUrl?: string) => {
      setActiveVerseKey(verseKey);
      setWords(ayahWords);
      setAyahAudioUrl(audioUrl);
      resetSession();
      if (!enabled) setEnabled(true);
    },
    [enabled, resetSession]
  );

  const stop = useCallback(() => {
    setEnabled(false);
    setActiveVerseKey(null);
    setWords([]);
    resetSession();
  }, [resetSession]);

  const toggle = useCallback(() => {
    if (enabled) {
      stop();
    } else {
      setEnabled(true);
      setError(null);
    }
  }, [enabled, stop]);

  const handleTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      const ayahWords = wordsRef.current;
      const speakable = ayahWords.filter((w) => w.char_type_name !== 'end');
      if (!speakable.length) return;

      const tokens = tokenizeArabicSpeech(text);
      if (!tokens.length) return;

      if (isFinal) {
        spokenBufferRef.current = [...spokenBufferRef.current, ...tokens];
      } else {
        // Interim: merge with buffer for live feedback
        const combined = [...spokenBufferRef.current, ...tokens];
        const expected = expectedWordTexts(speakable);
        const { matchedCount, mistakeIndex } = alignRecitation(expected, combined);

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

          const now = Date.now();
          if (now - lastCorrectionAtRef.current > 1200) {
            lastCorrectionAtRef.current = now;
            setCorrectionWordId(wrongWord.id);
            const wordIndex = getSpeakableWordIndex(ayahWords, wrongWord);
            void playWord(wrongWord, {
              wordIndex,
              speakableWordCount: countSpeakableWords(ayahWords),
              ayahAudioUrl,
            });
          }
        }
        return;
      }

      const expected = expectedWordTexts(speakable);
      const { matchedCount, mistakeIndex } = alignRecitation(
        expected,
        spokenBufferRef.current
      );

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

        const now = Date.now();
        if (now - lastCorrectionAtRef.current > 1200) {
          lastCorrectionAtRef.current = now;
          setCorrectionWordId(wrongWord.id);
          const wordIndex = getSpeakableWordIndex(ayahWords, wrongWord);
          void playWord(wrongWord, {
            wordIndex,
            speakableWordCount: countSpeakableWords(ayahWords),
            ayahAudioUrl,
          });
        }
      }

      if (matchedCount >= speakable.length) {
        spokenBufferRef.current = [];
        lastMistakeIndexRef.current = null;
      }
    },
    [ayahAudioUrl, playWord]
  );

  const { isListening, isSupported } = useRecitationListen({
    enabled: enabled && !!activeVerseKey && !listeningPaused,
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
    startAyah,
    stop,
    toggle,
    setEnabled,
    pauseListening: () => setListeningPaused(true),
    resumeListening: () => setListeningPaused(false),
    listeningPaused,
  };
}
