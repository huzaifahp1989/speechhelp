'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  clearQuranReadingProgress,
  getQuranReadingProgress,
  type QuranReadingProgress,
} from '@/lib/quranReadingProgress';

export function useQuranReadingProgress() {
  const [progress, setProgress] = useState<QuranReadingProgress | null>(null);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(() => {
    setProgress(getQuranReadingProgress());
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();

    const onUpdate = () => refresh();
    window.addEventListener('quran-progress-updated', onUpdate);
    window.addEventListener('storage', onUpdate);

    return () => {
      window.removeEventListener('quran-progress-updated', onUpdate);
      window.removeEventListener('storage', onUpdate);
    };
  }, [refresh]);

  const clear = useCallback(() => {
    clearQuranReadingProgress();
    setProgress(null);
  }, []);

  return { progress: mounted ? progress : null, refresh, clear, mounted };
}
