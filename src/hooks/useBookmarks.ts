
import { useState, useEffect } from 'react';

export type Bookmark = {
  id: string;
  type: 'juz' | 'surah';
  refId: string; // juz number or surah number
  verseKey: string;
  timestamp: number;
};

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('quran_bookmarks');
    if (saved) {
      try {
        setBookmarks(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse bookmarks", e);
      }
    }
  }, []);

  const saveBookmarks = (newBookmarks: Bookmark[]) => {
    setBookmarks(newBookmarks);
    localStorage.setItem('quran_bookmarks', JSON.stringify(newBookmarks));
  };

  const toggleBookmark = (type: 'juz' | 'surah', refId: string, verseKey: string) => {
    const exists = bookmarks.find(b => b.verseKey === verseKey);
    if (exists) {
      const newBookmarks = bookmarks.filter(b => b.verseKey !== verseKey);
      saveBookmarks(newBookmarks);
    } else {
      const newBookmark: Bookmark = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        refId,
        verseKey,
        timestamp: Date.now(),
      };
      saveBookmarks([...bookmarks, newBookmark]);
    }
  };

  const isBookmarked = (verseKey: string) => {
    return bookmarks.some(b => b.verseKey === verseKey);
  };

  return { bookmarks, toggleBookmark, isBookmarked };
}
