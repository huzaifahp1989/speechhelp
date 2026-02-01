import { useState, useEffect } from 'react';

export type JuzProgress = {
  toMemorize: string;
  weakParts: string;
  notes: string;
};

export type JuzProgressMap = {
  [juzId: number]: JuzProgress;
};

export function useJuzProgress() {
  const [progress, setProgress] = useState<JuzProgressMap>({});

  useEffect(() => {
    const saved = localStorage.getItem('juz_progress');
    if (saved) {
      try {
        setProgress(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse juz progress", e);
      }
    }
  }, []);

  const saveProgress = (newProgress: JuzProgressMap) => {
    setProgress(newProgress);
    localStorage.setItem('juz_progress', JSON.stringify(newProgress));
  };

  const updateJuzProgress = (juzId: number, data: Partial<JuzProgress>) => {
    const current = progress[juzId] || { toMemorize: '', weakParts: '', notes: '' };
    const updated = { ...current, ...data };
    saveProgress({ ...progress, [juzId]: updated });
  };

  const getJuzProgress = (juzId: number): JuzProgress => {
    return progress[juzId] || { toMemorize: '', weakParts: '', notes: '' };
  };

  return { progress, updateJuzProgress, getJuzProgress };
}
