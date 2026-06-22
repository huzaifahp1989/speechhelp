import { useCallback, useEffect, useState } from 'react';
import {
  addHifzBookmark,
  deleteHifzBookmark,
  getHifzBookmarks,
  updateHifzBookmark,
  recordBookmarkRevision,
  HIFZ_BOOKMARKS_UPDATED,
} from '@/lib/hifzBookmarks';
import type { HifzBookmark } from '@/types/hifzBookmark';

export function useHifzBookmarks() {
  const [bookmarks, setBookmarks] = useState<HifzBookmark[]>([]);

  const refresh = useCallback(() => {
    setBookmarks(getHifzBookmarks());
  }, []);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener(HIFZ_BOOKMARKS_UPDATED, onUpdate);
    window.addEventListener('storage', onUpdate);
    return () => {
      window.removeEventListener(HIFZ_BOOKMARKS_UPDATED, onUpdate);
      window.removeEventListener('storage', onUpdate);
    };
  }, [refresh]);

  return {
    bookmarks,
    addBookmark: (input: Omit<HifzBookmark, 'id' | 'createdAt'>) => addHifzBookmark(input),
    updateBookmark: (id: string, patch: Partial<HifzBookmark>) => updateHifzBookmark(id, patch),
    removeBookmark: deleteHifzBookmark,
    recordRevision: recordBookmarkRevision,
    refresh,
  };
}
