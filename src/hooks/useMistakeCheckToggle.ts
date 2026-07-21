import { useCallback } from 'react';
import type { useRecitationCheck } from '@/hooks/useRecitationCheck';

type RecitationApi = ReturnType<typeof useRecitationCheck>;

export function useMistakeCheckToggle(
  recitation: RecitationApi,
  practiceVerseKey: string | null,
  onStartPractice?: (verseKey: string) => void
) {
  return useCallback(() => {
    if (!recitation.enabled) {
      if (practiceVerseKey && onStartPractice) {
        onStartPractice(practiceVerseKey);
        return;
      }
      recitation.toggle();
      return;
    }
    recitation.toggle();
  }, [recitation, practiceVerseKey, onStartPractice]);
}
