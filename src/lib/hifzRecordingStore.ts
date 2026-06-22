import type { HifzRecordingMeta } from '@/types/hifzRecording';
import { HIFZ_RECORDINGS_UPDATED } from '@/types/hifzRecording';

const DB_NAME = 'speechhelp_hifz_recordings';
const DB_VERSION = 1;
const STORE = 'clips';

type StoredClip = {
  id: string;
  meta: HifzRecordingMeta;
  blob: Blob;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('verseKey', 'meta.verseKey', { unique: false });
        store.createIndex('createdAt', 'meta.createdAt', { unique: false });
      }
    };
  });
}

function notifyUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(HIFZ_RECORDINGS_UPDATED));
}

export async function saveHifzRecording(meta: HifzRecordingMeta, blob: Blob): Promise<void> {
  if (!isBrowser()) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const entry: StoredClip = { id: meta.id, meta, blob };
    store.put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  notifyUpdated();
}

export async function getHifzRecordingBlob(id: string): Promise<Blob | null> {
  if (!isBrowser()) return null;
  const db = await openDb();
  const result = await new Promise<StoredClip | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result as StoredClip | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result?.blob ?? null;
}

export async function listHifzRecordings(verseKey?: string): Promise<HifzRecordingMeta[]> {
  if (!isBrowser()) return [];
  const db = await openDb();
  const all = await new Promise<StoredClip[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as StoredClip[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  let metas = all.map((c) => c.meta).sort((a, b) => b.createdAt - a.createdAt);
  if (verseKey) metas = metas.filter((m) => m.verseKey === verseKey);
  return metas;
}

export async function deleteHifzRecording(id: string): Promise<void> {
  if (!isBrowser()) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  notifyUpdated();
}

export async function countHifzRecordings(): Promise<number> {
  const list = await listHifzRecordings();
  return list.length;
}

export function formatRecordingDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export async function shareHifzRecording(meta: HifzRecordingMeta, blob: Blob): Promise<'shared' | 'downloaded'> {
  const filename = `hifz-${meta.verseKey.replace(':', '-')}-${new Date(meta.createdAt).toISOString().slice(0, 10)}.webm`;
  const file = new File([blob], filename, { type: blob.type || 'audio/webm' });
  const shareText = `Hifz recitation: ${meta.surahName ? `Surah ${meta.surahName}` : ''} Ayah ${meta.verseKey}${meta.juz ? ` (Juz ${meta.juz})` : ''} — ${meta.mistakeCount} mistake${meta.mistakeCount !== 1 ? 's' : ''}, ${formatRecordingDuration(meta.durationSec)}`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const payload: ShareData = { title: 'My Hifz recitation', text: shareText };
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ ...payload, files: [file] });
      } else {
        await navigator.share(payload);
      }
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
