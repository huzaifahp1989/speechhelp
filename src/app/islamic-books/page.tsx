'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ExternalLink, FileUp, Loader2, PenLine, Search, Trash2 } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { BookCategory } from '@/data/books';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { getSupabasePublicConfig } from '@/lib/supabaseConfig';

type StoredPdf = {
  name: string;
  title: string;
  path: string;
  size: number;
  updatedAtMs: number;
  category?: BookCategory;
  thumbnailPath?: string | null;
  isPublic?: boolean;
  source: 'uploaded' | 'saved';
};

type UploadStage = 'queued' | 'validating' | 'uploading' | 'thumbnail' | 'saving' | 'done' | 'error';

type UploadItem = {
  id: string;
  file: File;
  title: string;
  category: BookCategory;
  publish: boolean;
  stage: UploadStage;
  progress: number;
  path?: string;
  error?: string;
};

const BUCKET = 'islamic-books';
const DEFAULT_CATEGORIES: BookCategory[] = ['Aqeedah', 'Fiqh', 'Seerah', 'Tafsir', 'Hadith', 'Kids', 'General'];
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function readStringField(obj: unknown, key: string) {
  if (!obj || typeof obj !== 'object') return '';
  const value = (obj as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, idx);
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function safeFileName(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return `book-${Date.now()}.pdf`;
  const normalized = trimmed.replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '_');
  const lower = normalized.toLowerCase().endsWith('.pdf') ? normalized : `${normalized}.pdf`;
  return lower.length > 160 ? `${lower.slice(0, 160)}.pdf` : lower;
}

function defaultTitleFromFileName(fileName: string) {
  const noExt = fileName.toLowerCase().endsWith('.pdf') ? fileName.slice(0, -4) : fileName;
  return noExt.replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Untitled';
}

function safeCategorySlug(category: string) {
  const trimmed = category.trim().toLowerCase();
  const slug = trimmed.replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-').replace(/\-+/g, '-');
  return slug || 'general';
}

type PdfJsModule = typeof import('pdfjs-dist/build/pdf.mjs');
type PdfDoc = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<unknown>;
  destroy?: () => void;
};
type PdfPage = {
  getViewport: (args: { scale: number }) => { width: number; height: number };
  render: (args: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { cancel?: () => void; promise?: Promise<unknown> };
};

let pdfJsPromise: Promise<PdfJsModule> | null = null;
function getPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = import('pdfjs-dist/build/pdf.mjs').then((m) => {
      const anyM = m as unknown as { GlobalWorkerOptions?: { workerSrc?: string } };
      if (anyM.GlobalWorkerOptions) {
        anyM.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      }
      return m;
    });
  }
  return pdfJsPromise;
}

export default function IslamicBooksPage() {
  const supabase = getSupabaseClient();
  const [user, setUser] = useState<SupabaseUser | null>(null);

  const [view, setView] = useState<'my' | 'public'>('my');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<BookCategory | 'All'>('All');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'size'>('recent');
  const [layout, setLayout] = useState<'list' | 'grid'>('list');
  const [files, setFiles] = useState<StoredPdf[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<BookCategory>('General');
  const [uploadPublish, setUploadPublish] = useState(true);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const uploadWorkerRunningRef = useRef(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<BookCategory[]>(DEFAULT_CATEGORIES);
  const [categoryDraft, setCategoryDraft] = useState('');

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [pdfExternalUrl, setPdfExternalUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfNumPages, setPdfNumPages] = useState(0);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.2);
  const [pdfRenderError, setPdfRenderError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<unknown>(null);
  const renderTaskRef = useRef<{ cancel?: () => void; promise?: Promise<unknown> } | null>(null);

  const [publicCategory, setPublicCategory] = useState<BookCategory | 'All'>('All');
  const [publicQuery, setPublicQuery] = useState('');
  const [publicFiles, setPublicFiles] = useState<Array<{ path: string; title: string; category: BookCategory; sizeBytes: number; createdAtMs: number; thumbnailPath: string | null }>>([]);
  const [loadingPublic, setLoadingPublic] = useState(false);
  const [savedFiles, setSavedFiles] = useState<StoredPdf[]>([]);
  const [savedPaths, setSavedPaths] = useState<Set<string>>(new Set());
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});

  const signedIn = Boolean(user?.id);
  const userId = user?.id ?? null;
  const prefix = userId ? `${userId}/` : null;

  const refreshCategories = useCallback(async () => {
    if (!supabase || !userId) {
      setCategories(DEFAULT_CATEGORIES);
      return;
    }

    try {
      const res = await supabase
        .from('islamic_book_categories')
        .select('name')
        .eq('user_id', userId)
        .limit(200);
      if (res.error) {
        setCategories(DEFAULT_CATEGORIES);
        return;
      }
      const fromDb = (res.data ?? []).map((r) => String((r as { name?: unknown }).name || '').trim()).filter(Boolean);
      const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...fromDb]));
      setCategories(merged);
    } catch {
      setCategories(DEFAULT_CATEGORIES);
    }
  }, [supabase, userId]);

  const addCategory = useCallback(async () => {
    const name = categoryDraft.trim();
    if (!name) return;
    if (!supabase || !userId) {
      setCategories((prev) => Array.from(new Set([...prev, name])));
      setCategoryDraft('');
      return;
    }

    setError(null);
    try {
      const res = await supabase.from('islamic_book_categories').insert({ user_id: userId, name }).select('id').maybeSingle();
      if (res.error) {
        setError('Could not create category. Create the "islamic_book_categories" table and enable RLS policies.');
        return;
      }
      setCategoryDraft('');
      await refreshCategories();
    } catch {
      setError('Unexpected error while creating category.');
    }
  }, [categoryDraft, refreshCategories, supabase, userId]);

  const deleteCategory = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (DEFAULT_CATEGORIES.includes(trimmed)) return;
      if (!supabase || !userId) {
        setCategories((prev) => prev.filter((c) => c !== trimmed));
        return;
      }
      setError(null);
      try {
        const res = await supabase.from('islamic_book_categories').delete().eq('user_id', userId).eq('name', trimmed);
        if (res.error) {
          setError('Could not delete category. Check RLS policies.');
          return;
        }
        await refreshCategories();
      } catch {
        setError('Unexpected error while deleting category.');
      }
    },
    [refreshCategories, supabase, userId]
  );

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    void refreshCategories();
  }, [refreshCategories]);

  useEffect(() => {
    return () => {
      try {
        renderTaskRef.current?.cancel?.();
      } catch {}
      renderTaskRef.current = null;
      if (pdfDocRef.current) {
        try {
          (pdfDocRef.current as PdfDoc).destroy?.();
        } catch {}
      }
      pdfDocRef.current = null;
    };
  }, []);

  const refreshList = useCallback(async () => {
    if (!supabase) {
      setFiles([]);
      return;
    }
    if (!userId || !prefix) {
      setFiles([]);
      return;
    }

    setLoadingList(true);
    setError(null);
    try {
      const titleByPath = new Map<string, string>();
      const categoryByPath = new Map<string, BookCategory>();
      const isPublicByPath = new Map<string, boolean>();
      const thumbnailByPath = new Map<string, string>();
      try {
        const metaRes = await supabase
          .from('islamic_books')
          .select('path,title,category,is_public,thumbnail_path')
          .eq('user_id', userId)
          .limit(500);
        if (!metaRes.error && metaRes.data) {
          (metaRes.data as unknown as Array<{ path: string; title: string; category?: string | null; is_public?: boolean | null; thumbnail_path?: string | null }>).forEach((r) => {
            const p = String(r.path || '');
            const t = String(r.title || '').trim();
            if (p && t) titleByPath.set(p, t);
            const c = String(r.category || '').trim();
            if (p && c) categoryByPath.set(p, c);
            if (p && typeof r.is_public === 'boolean') isPublicByPath.set(p, r.is_public);
            const thumb = String(r.thumbnail_path || '').trim();
            if (p && thumb) thumbnailByPath.set(p, thumb);
          });
        }
      } catch {}

      const { data, error: listError } = await supabase.storage.from(BUCKET).list(prefix, { limit: 200 });
      if (listError) {
        setError(`Could not load your library. Check Supabase storage bucket "${BUCKET}".`);
        setFiles([]);
        return;
      }

      const mapped: StoredPdf[] = (data ?? [])
        .filter((x) => String(x.name || '').toLowerCase().endsWith('.pdf'))
        .map((x) => {
          const fileObj = x as unknown as {
            updated_at?: string;
            created_at?: string;
            metadata?: { size?: number };
            size?: number;
          };
          const updatedAt = Date.parse(fileObj.updated_at || fileObj.created_at || '') || 0;
          const metaSize = fileObj.metadata?.size;
          const size = typeof metaSize === 'number' ? metaSize : typeof fileObj.size === 'number' ? fileObj.size : 0;
          const fullPath = `${prefix}${String(x.name || '')}`;
          return {
            name: String(x.name || ''),
            title: titleByPath.get(fullPath) || defaultTitleFromFileName(String(x.name || '')),
            path: fullPath,
            size,
            updatedAtMs: updatedAt,
            category: categoryByPath.get(fullPath),
            thumbnailPath: thumbnailByPath.get(fullPath) ?? null,
            isPublic: isPublicByPath.get(fullPath),
            source: 'uploaded' as const,
          };
        })
        .sort((a, b) => b.updatedAtMs - a.updatedAtMs);

      setFiles(mapped);
    } catch {
      setError('Unexpected error while loading your library.');
      setFiles([]);
    } finally {
      setLoadingList(false);
    }
  }, [prefix, supabase, userId]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const refreshSavedList = useCallback(async () => {
    if (!supabase || !user?.id) {
      setSavedFiles([]);
      setSavedPaths(new Set());
      return;
    }

    setLoadingSaved(true);
    setError(null);
    try {
      const savedRes = await supabase
        .from('islamic_books_saved')
        .select('path,created_at')
        .eq('user_id', user.id)
        .limit(500);

      if (savedRes.error) {
        setSavedFiles([]);
        setSavedPaths(new Set());
        return;
      }

      const savedRows = (savedRes.data ?? []) as unknown as Array<{ path: string; created_at?: string | null }>;
      const paths = savedRows.map((r) => String(r.path || '')).filter(Boolean);
      setSavedPaths(new Set(paths));

      if (paths.length === 0) {
        setSavedFiles([]);
        return;
      }

      const metaRes = await supabase
        .from('islamic_books')
        .select('path,title,category,size_bytes,created_at,thumbnail_path')
        .in('path', paths)
        .limit(500);

      const metaByPath = new Map<string, { title: string; category: BookCategory; sizeBytes: number; createdAtMs: number; thumbnailPath: string | null }>();
      if (!metaRes.error && metaRes.data) {
        (metaRes.data as unknown as Array<{ path: string; title?: string | null; category?: string | null; size_bytes?: number | null; created_at?: string | null; thumbnail_path?: string | null }>)
          .forEach((r) => {
            const p = String(r.path || '');
            const title = String(r.title || '').trim() || defaultTitleFromFileName(p.split('/').pop() || 'Untitled');
            const category = String(r.category || 'General').trim() || 'General';
            const sizeBytes = Number(r.size_bytes || 0) || 0;
            const createdAtMs = Date.parse(String(r.created_at || '')) || 0;
            const thumbnailPath = String(r.thumbnail_path || '').trim() || null;
            if (p) metaByPath.set(p, { title, category, sizeBytes, createdAtMs, thumbnailPath });
          });
      }

      const mapped: StoredPdf[] = paths
        .map((p) => {
          const meta = metaByPath.get(p);
          const fileName = p.split('/').pop() || '';
          const createdFromSave = Date.parse(savedRows.find((x) => x.path === p)?.created_at || '') || 0;
          return {
            name: fileName,
            title: meta?.title || defaultTitleFromFileName(fileName),
            path: p,
            size: meta?.sizeBytes || 0,
            updatedAtMs: meta?.createdAtMs || createdFromSave,
            category: meta?.category || 'General',
            thumbnailPath: meta?.thumbnailPath ?? null,
            isPublic: true,
            source: 'saved' as const,
          };
        })
        .sort((a, b) => b.updatedAtMs - a.updatedAtMs);

      setSavedFiles(mapped);
    } catch {
      setSavedFiles([]);
      setSavedPaths(new Set());
    } finally {
      setLoadingSaved(false);
    }
  }, [supabase, user?.id]);

  const refreshPublicList = useCallback(async () => {
    if (!supabase) {
      setPublicFiles([]);
      return;
    }

    setLoadingPublic(true);
    setError(null);
    try {
      let q = supabase
        .from('islamic_books')
        .select('path,title,category,size_bytes,created_at,thumbnail_path')
        .eq('is_public', true)
        .limit(200);

      if (publicCategory !== 'All') {
        q = q.eq('category', publicCategory);
      }

      const res = await q;
      if (res.error) {
        setPublicFiles([]);
        setError(
          'Public Library needs the "islamic_books" database table with an RLS policy that allows selecting rows where is_public=true.'
        );
        return;
      }

      const mapped = (res.data ?? [])
        .map((r) => {
          const path = String((r as { path?: unknown }).path || '');
          const title = String((r as { title?: unknown }).title || '').trim() || 'Untitled';
          const category = String((r as { category?: unknown }).category || 'General').trim() || 'General';
          const sizeBytes = Number((r as { size_bytes?: unknown }).size_bytes || 0) || 0;
          const createdAtMs = Date.parse(String((r as { created_at?: unknown }).created_at || '')) || 0;
          const thumbnailPath = String((r as { thumbnail_path?: unknown }).thumbnail_path || '').trim() || null;
          if (!path) return null;
          return { path, title, category, sizeBytes, createdAtMs, thumbnailPath };
        })
        .filter(Boolean) as Array<{ path: string; title: string; category: BookCategory; sizeBytes: number; createdAtMs: number; thumbnailPath: string | null }>;

      setPublicFiles(mapped);
    } catch {
      setPublicFiles([]);
      setError('Unexpected error while loading public library.');
    } finally {
      setLoadingPublic(false);
    }
  }, [publicCategory, supabase, user?.id]);

  useEffect(() => {
    if (view !== 'public') return;
    refreshPublicList();
  }, [refreshPublicList, view]);

  useEffect(() => {
    if (!user?.id) return;
    if (view !== 'my' && view !== 'public') return;
    refreshSavedList();
  }, [refreshSavedList, user?.id, view]);

  useEffect(() => {
    if (!supabase) return;

    const allThumbs = [
      ...files.map((f) => f.thumbnailPath).filter(Boolean),
      ...savedFiles.map((f) => f.thumbnailPath).filter(Boolean),
      ...publicFiles.map((f) => f.thumbnailPath).filter(Boolean),
    ] as string[];
    const unique = Array.from(new Set(allThumbs));
    const missing = unique.filter((p) => !thumbnailUrls[p]);
    if (missing.length === 0) return;

    let cancelled = false;
    void (async () => {
      for (const path of missing.slice(0, 50)) {
        if (cancelled) return;
        let url: string | null = null;

        if (user?.id) {
          const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
          if (!error && data?.signedUrl) url = data.signedUrl;
        }

        if (!url) {
          const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
          url = data?.publicUrl || null;
        }

        if (url) {
          setThumbnailUrls((prev) => (prev[path] ? prev : { ...prev, [path]: url as string }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [files, publicFiles, savedFiles, supabase, thumbnailUrls, user?.id]);

  useEffect(() => {
    const doc = pdfDocRef.current as PdfDoc | null;
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;

    let cancelled = false;
    void (async () => {
      setPdfRenderError(null);
      try {
        const clamped = Math.max(1, Math.min(pdfNumPages || 1, pdfPage));
        if (clamped !== pdfPage) setPdfPage(clamped);

        const page = (await doc.getPage(clamped)) as PdfPage;
        if (cancelled) return;

        const viewport = page.getViewport({ scale: pdfScale });
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');

        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        try {
          renderTaskRef.current?.cancel?.();
        } catch {}

        const task = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch (e) {
        if (!cancelled) setPdfRenderError(e instanceof Error ? e.message : 'Could not render PDF');
      }
    })();

    return () => {
      cancelled = true;
      try {
        renderTaskRef.current?.cancel?.();
      } catch {}
    };
  }, [pdfNumPages, pdfPage, pdfScale]);

  const openPdf = async (path: string, name: string) => {
    if (!supabase) return;
    setSelectedPath(path);
    setSelectedName(name);
    setLoadingPdf(true);
    setError(null);
    try {
      try {
        renderTaskRef.current?.cancel?.();
      } catch {}
      renderTaskRef.current = null;
      if (pdfDocRef.current) {
        try {
          (pdfDocRef.current as PdfDoc).destroy?.();
        } catch {}
      }
      pdfDocRef.current = null;
      setPdfData(null);
      setPdfNumPages(0);
      setPdfPage(1);
      setPdfRenderError(null);

      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = publicData?.publicUrl || null;
      let remoteUrl: string | null = publicUrl;
      if (user?.id) {
        const { data: signedData, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
        if (!signedError && signedData?.signedUrl) remoteUrl = signedData.signedUrl;
      }

      if (!remoteUrl) {
        setError('Could not open this PDF. Check your bucket permissions.');
        setPdfExternalUrl(null);
        return;
      }

      setPdfExternalUrl(remoteUrl);

      const pdfjs = await getPdfJs();
      try {
        const task = pdfjs.getDocument({ url: remoteUrl });
        const doc = await task.promise;
        pdfDocRef.current = doc;
        setPdfNumPages(Number((doc as PdfDoc).numPages || 0));
        setPdfPage(1);
      } catch {
        const res = await fetch(remoteUrl, { method: 'GET' });
        if (!res.ok) {
          setError(`Could not download the PDF for reading (HTTP ${res.status}). Try "Open in new tab" or "Download".`);
          return;
        }
        const buf = await res.arrayBuffer();
        if (!buf || buf.byteLength === 0) {
          setError('PDF download was empty. Try again.');
          return;
        }
        const task = pdfjs.getDocument({ data: buf });
        const doc = await task.promise;
        pdfDocRef.current = doc;
        setPdfData(buf);
        setPdfNumPages(Number((doc as PdfDoc).numPages || 0));
        setPdfPage(1);
      }
    } catch {
      setError('Unexpected error while opening the PDF.');
      setPdfExternalUrl(null);
      setPdfData(null);
      setPdfNumPages(0);
      setPdfPage(1);
      setPdfRenderError(null);
    } finally {
      setLoadingPdf(false);
    }
  };

  function encodeStoragePath(path: string) {
    return path
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
  }

  async function isLikelyPdf(file: File) {
    if (file.type === 'application/pdf') return true;
    if (file.name.toLowerCase().endsWith('.pdf')) return true;
    try {
      const buf = await file.slice(0, 5).arrayBuffer();
      const head = new TextDecoder().decode(buf);
      return head.startsWith('%PDF');
    } catch {
      return false;
    }
  }

  async function uploadToStorageWithProgress(args: {
    accessToken: string;
    path: string;
    body: Blob;
    contentType: string;
    onProgress: (pct: number) => void;
  }) {
    const { url: supabaseUrl, publicKey: supabasePublicKey } = getSupabasePublicConfig();
    if (!supabaseUrl || !supabasePublicKey) throw new Error('Supabase is not configured.');

    const url = `${supabaseUrl}/storage/v1/object/${BUCKET}/${encodeStoragePath(args.path)}`;

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.setRequestHeader('Authorization', `Bearer ${args.accessToken}`);
      xhr.setRequestHeader('apikey', supabasePublicKey);
      xhr.setRequestHeader('Content-Type', args.contentType);
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const pct = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
        args.onProgress(pct);
      };
      xhr.onerror = () => reject(new Error('Upload failed.'));
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed (HTTP ${xhr.status}).`));
      };
      xhr.send(args.body);
    });
  }

  async function generatePdfThumbnail(file: File) {
    try {
      const pdfjs = await getPdfJs();
      const buf = await file.arrayBuffer();
      const task = pdfjs.getDocument({ data: buf });
      const doc = await task.promise;
      const page = (await (doc as unknown as PdfDoc).getPage(1)) as PdfPage;
      const viewport = page.getViewport({ scale: 0.25 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const renderTask = page.render({ canvasContext: ctx, viewport });
      await renderTask.promise;
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
      try {
        (doc as unknown as PdfDoc).destroy?.();
      } catch {}
      return blob;
    } catch {
      return null;
    }
  }

  const enqueueUploads = useCallback(
    (incoming: File[]) => {
      if (!incoming.length) return;
      if (!supabase) {
        setError('Supabase is not configured. Uploads are disabled.');
        return;
      }
      if (!userId || !prefix) {
        setError('Please sign in to upload and store PDFs.');
        return;
      }
      const nextCategory = uploadCategory || 'General';
      const nextPublish = Boolean(uploadPublish);
      const singleTitle = uploadTitle.trim();
      const now = Date.now();

      const nextItems: UploadItem[] = incoming.map((file, idx) => {
        const title =
          incoming.length === 1 && singleTitle
            ? singleTitle
            : defaultTitleFromFileName(file.name);
        return {
          id: `${now}-${idx}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`,
          file,
          title,
          category: nextCategory,
          publish: nextPublish,
          stage: 'queued',
          progress: 0,
        };
      });

      setUploads((prev) => [...nextItems, ...prev]);
      if (incoming.length === 1 && singleTitle) setUploadTitle('');
    },
    [prefix, supabase, uploadCategory, uploadPublish, uploadTitle, userId]
  );

  useEffect(() => {
    const anyActive = uploads.some((u) => u.stage === 'validating' || u.stage === 'uploading' || u.stage === 'thumbnail' || u.stage === 'saving');
    setUploading(anyActive);
  }, [uploads]);

  useEffect(() => {
    if (!supabase || !user || !prefix) return;
    if (uploadWorkerRunningRef.current) return;
    const next = uploads.find((u) => u.stage === 'queued');
    if (!next) return;

    uploadWorkerRunningRef.current = true;
    void (async () => {
      const update = (id: string, patch: Partial<UploadItem>) => {
        setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
      };

      update(next.id, { stage: 'validating', progress: 0, error: undefined });
      if (next.file.size > MAX_UPLOAD_BYTES) {
        update(next.id, { stage: 'error', progress: 0, error: `File too large (${formatBytes(next.file.size)}). Max is ${formatBytes(MAX_UPLOAD_BYTES)}.` });
        return;
      }

      const okPdf = await isLikelyPdf(next.file);
      if (!okPdf) {
        update(next.id, { stage: 'error', progress: 0, error: 'Only PDF files are supported.' });
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        update(next.id, { stage: 'error', progress: 0, error: 'Please sign in again to upload.' });
        return;
      }

      setError(null);

      const baseId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const pdfPath = `${prefix}${baseId}-${safeFileName(next.file.name)}`;
      const thumbnailPath = `${prefix}thumbnails/${baseId}.png`;
      update(next.id, { stage: 'uploading', progress: 1, path: pdfPath });

      try {
        await uploadToStorageWithProgress({
          accessToken,
          path: pdfPath,
          body: next.file,
          contentType: 'application/pdf',
          onProgress: (pct) => update(next.id, { progress: Math.round(pct * 0.8) }),
        });
      } catch (e: any) {
        update(next.id, { stage: 'error', progress: 0, error: e?.message || 'Upload failed.' });
        return;
      }

      update(next.id, { stage: 'thumbnail', progress: 80 });
      const thumb = await generatePdfThumbnail(next.file);
      let savedThumbnailPath: string | null = null;
      if (thumb) {
        try {
          await uploadToStorageWithProgress({
            accessToken,
            path: thumbnailPath,
            body: thumb,
            contentType: 'image/png',
            onProgress: (pct) => update(next.id, { progress: 80 + Math.round(pct * 0.15) }),
          });
          savedThumbnailPath = thumbnailPath;
        } catch {}
      }

      update(next.id, { stage: 'saving', progress: 96 });
      const title = next.title.trim() || defaultTitleFromFileName(next.file.name);
      const category = String(next.category || 'General').trim() || 'General';

      try {
        const metaRes = await supabase.from('islamic_books').insert({
          user_id: user.id,
          path: pdfPath,
          title,
          original_name: next.file.name,
          size_bytes: next.file.size,
          category,
          is_public: next.publish,
          thumbnail_path: savedThumbnailPath,
        });
        if (metaRes.error) {
          update(next.id, { stage: 'error', progress: 0, error: 'PDF uploaded, but metadata could not be saved. Create the "islamic_books" table and enable RLS policies.' });
          return;
        }
      } catch {
        update(next.id, { stage: 'error', progress: 0, error: 'Unexpected error while saving metadata.' });
        return;
      }

      update(next.id, { stage: 'done', progress: 100 });
      await refreshList();
      if (user?.id) await refreshSavedList();
      await openPdf(pdfPath, title);
    })()
      .catch(() => {})
      .finally(() => {
        uploadWorkerRunningRef.current = false;
      });
  }, [openPdf, prefix, refreshList, refreshSavedList, supabase, uploads, user]);

  const handleEditTitle = async (path: string, currentTitle: string) => {
    if (!supabase || !user) return;
    const next = prompt('Book title:', currentTitle);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed) return;

    setError(null);
    try {
      const updateRes = await supabase
        .from('islamic_books')
        .update({ title: trimmed })
        .eq('user_id', user.id)
        .eq('path', path)
        .select('path');

      if (updateRes.error) {
        setError('Could not save the title. Make sure the "islamic_books" table exists and RLS policies are enabled.');
        return;
      }

      const updatedCount = Array.isArray(updateRes.data) ? updateRes.data.length : 0;
      if (updatedCount === 0) {
        const insertRes = await supabase.from('islamic_books').insert({ user_id: user.id, path, title: trimmed });
        if (insertRes.error) {
          setError('Could not save the title. Make sure the "islamic_books" table exists and RLS policies are enabled.');
          return;
        }
      }

      setFiles((prev) => prev.map((f) => (f.path === path ? { ...f, title: trimmed } : f)));
      if (selectedPath === path) setSelectedName(trimmed);
    } catch {
      setError('Unexpected error while saving the title.');
    }
  };

  const handleDelete = async (path: string) => {
    if (!supabase || !user) return;
    if (!confirm('Delete this PDF from your library?')) return;

    setError(null);
    try {
      const { error: removeError } = await supabase.storage.from(BUCKET).remove([path]);
      if (removeError) {
        setError('Could not delete the PDF. Check permissions.');
        return;
      }

      try {
        await supabase.from('islamic_books').delete().eq('user_id', user.id).eq('path', path);
      } catch {}

      if (selectedPath === path) {
        setSelectedPath(null);
        setSelectedName(null);
        setPdfExternalUrl(null);
        setPdfData(null);
        setPdfNumPages(0);
        setPdfPage(1);
        setPdfRenderError(null);
        try {
          renderTaskRef.current?.cancel?.();
        } catch {}
        renderTaskRef.current = null;
        if (pdfDocRef.current) {
          try {
            (pdfDocRef.current as PdfDoc).destroy?.();
          } catch {}
        }
        pdfDocRef.current = null;
      }

      await refreshList();
    } catch {
      setError('Unexpected error while deleting.');
    }
  };

  const addToMyLibrary = useCallback(async (path: string) => {
    if (!supabase || !user?.id) {
      setError('Please sign in to save books.');
      return;
    }
    setError(null);
    try {
      const res = await supabase.from('islamic_books_saved').insert({ user_id: user.id, path });
      if (res.error) {
        await refreshSavedList();
        return;
      }
      await refreshSavedList();
    } catch {
      setError('Unexpected error while saving.');
    }
  }, [refreshSavedList, supabase, user?.id]);

  const removeFromMyLibrary = useCallback(async (path: string) => {
    if (!supabase || !user?.id) return;
    setError(null);
    try {
      await supabase.from('islamic_books_saved').delete().eq('user_id', user.id).eq('path', path);
      await refreshSavedList();
      setFiles((prev) => prev);
    } catch {
      setError('Unexpected error while removing.');
    }
  }, [refreshSavedList, supabase, user?.id]);

  const publishAllMyBooks = useCallback(async () => {
    if (!supabase || !user?.id) {
      setError('Please sign in.');
      return;
    }
    setError(null);
    try {
      const res = await supabase.from('islamic_books').update({ is_public: true }).eq('user_id', user.id);
      if (res.error) {
        setError('Could not publish your books. Check RLS policies on "islamic_books".');
        return;
      }
      await refreshList();
      await refreshPublicList();
    } catch {
      setError('Unexpected error while publishing.');
    }
  }, [refreshList, refreshPublicList, supabase, user?.id]);

  const combinedMyFiles = useMemo(() => {
    const byPath = new Map<string, StoredPdf>();
    savedFiles.forEach((f) => byPath.set(f.path, f));
    files.forEach((f) => {
      if (!byPath.has(f.path)) byPath.set(f.path, f);
    });
    return Array.from(byPath.values()).sort((a, b) => b.updatedAtMs - a.updatedAtMs);
  }, [files, savedFiles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = combinedMyFiles;
    if (categoryFilter !== 'All') {
      base = base.filter((f) => String(f.category || 'General') === categoryFilter);
    }
    if (q) {
      base = base.filter((f) => {
        const title = f.title.toLowerCase();
        const name = f.name.toLowerCase();
        const cat = String(f.category || '').toLowerCase();
        return title.includes(q) || name.includes(q) || cat.includes(q);
      });
    }

    const sorted = [...base];
    if (sortBy === 'title') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'size') {
      sorted.sort((a, b) => (b.size || 0) - (a.size || 0));
    } else {
      sorted.sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0));
    }
    return sorted;
  }, [categoryFilter, combinedMyFiles, query, sortBy]);

  const filteredPublic = useMemo(() => {
    const q = publicQuery.trim().toLowerCase();
    let base = publicFiles;
    if (q) {
      base = base.filter((f) => f.title.toLowerCase().includes(q) || String(f.category || '').toLowerCase().includes(q));
    }

    const sorted = [...base];
    if (sortBy === 'title') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'size') {
      sorted.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
    } else {
      sorted.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
    }
    return sorted;
  }, [publicFiles, publicQuery, sortBy]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-emerald-600" />
              Islamic <span className="text-emerald-600">PDF Library</span>
            </h1>
            <p className="mt-2 text-slate-600">
              Upload your PDFs, store them in your account, and read them in the browser.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Storage bucket: <span className="font-semibold text-slate-700">{BUCKET}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!signedIn ? (
              <>
                <Link href="/auth" className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100">
                  Sign in
                </Link>
                <Link href="/auth?mode=signup" className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700">
                  Sign up
                </Link>
              </>
            ) : (
              <span className="text-sm text-slate-600">
                Signed in as <span className="font-semibold text-slate-900">{readStringField(user?.user_metadata, 'display_name') || user?.email || 'User'}</span>
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm font-semibold">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView('my')}
            className={`px-4 py-2 rounded-lg font-semibold border ${view === 'my' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
          >
            My Library
          </button>
          <button
            type="button"
            onClick={() => setView('public')}
            className={`px-4 py-2 rounded-lg font-semibold border ${view === 'public' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
          >
            Public Library
          </button>
        </div>

        {!supabase && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm font-semibold">
            Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). Uploading/storing PDFs is disabled.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900">{view === 'public' ? 'Public Books' : 'Your Books'}</h2>
                <div className="flex items-center gap-2">
                  {view === 'my' && signedIn ? (
                    <button
                      type="button"
                      onClick={publishAllMyBooks}
                      disabled={!supabase}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white text-sm font-semibold"
                      title="Make all your uploaded books public"
                    >
                      Publish all
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={view === 'public' ? refreshPublicList : refreshList}
                    disabled={!supabase || (view === 'public' ? loadingPublic : !signedIn || loadingList)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-400 text-slate-700 text-sm font-semibold"
                  >
                    {view === 'public' ? (loadingPublic ? 'Loading…' : 'Refresh') : (loadingList ? 'Loading…' : 'Refresh')}
                  </button>
                </div>
              </div>

              {view === 'public' ? (
                <>
                  <select
                    value={publicCategory}
                    onChange={(e) => setPublicCategory(e.target.value as BookCategory | 'All')}
                    disabled={!supabase || loadingPublic}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none disabled:opacity-60"
                  >
                    <option value="All">All categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={publicQuery}
                      onChange={(e) => setPublicQuery(e.target.value)}
                      placeholder="Search public PDFs…"
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'recent' | 'title' | 'size')}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                    >
                      <option value="recent">Sort: Newest</option>
                      <option value="title">Sort: Title</option>
                      <option value="size">Sort: Size</option>
                    </select>
                    <div className="sm:col-span-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLayout('list')}
                        className={`flex-1 px-3 py-2 rounded-lg font-semibold border ${layout === 'list' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                      >
                        List
                      </button>
                      <button
                        type="button"
                        onClick={() => setLayout('grid')}
                        className={`flex-1 px-3 py-2 rounded-lg font-semibold border ${layout === 'grid' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                      >
                        Grid
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search your PDFs…"
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value as BookCategory | 'All')}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                    >
                      <option value="All">All categories</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'recent' | 'title' | 'size')}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                    >
                      <option value="recent">Sort: Newest</option>
                      <option value="title">Sort: Title</option>
                      <option value="size">Sort: Size</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLayout('list')}
                        className={`flex-1 px-3 py-2 rounded-lg font-semibold border ${layout === 'list' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                      >
                        List
                      </button>
                      <button
                        type="button"
                        onClick={() => setLayout('grid')}
                        className={`flex-1 px-3 py-2 rounded-lg font-semibold border ${layout === 'grid' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                      >
                        Grid
                      </button>
                    </div>
                  </div>
                </>
              )}

              {view === 'my' ? (
                <div
                  className={`rounded-xl border border-dashed p-4 ${dragActive ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-300 bg-slate-50'}`}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragActive(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragActive(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragActive(false);
                    const incoming = Array.from(e.dataTransfer.files || []).filter(Boolean);
                    enqueueUploads(incoming);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <FileUp className="w-5 h-5 text-slate-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">Upload a PDF</p>
                      <p className="text-sm text-slate-600 mt-1">Drop one or more PDFs here, or choose files. Max file size: {formatBytes(MAX_UPLOAD_BYTES)}.</p>
                      <p className="text-xs text-slate-500 mt-1">
                        “Publish to public library” controls who can see the book in the Public Library tab. The file is still uploaded under your own folder.
                      </p>
                      <div className="mt-3">
                        <input
                          value={uploadTitle}
                          onChange={(e) => setUploadTitle(e.target.value)}
                          placeholder="Default title (optional; single file)"
                          disabled={!signedIn || !supabase || uploading}
                          className="mb-2 w-full px-3 py-2 rounded-lg bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none disabled:opacity-60"
                        />
                        <select
                          value={uploadCategory}
                          onChange={(e) => setUploadCategory(e.target.value as BookCategory)}
                          disabled={!signedIn || !supabase || uploading}
                          className="mb-2 w-full px-3 py-2 rounded-lg bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none disabled:opacity-60"
                        >
                          {categories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <div className="mb-2 flex items-center gap-2">
                          <input
                            value={categoryDraft}
                            onChange={(e) => setCategoryDraft(e.target.value)}
                            placeholder="New category"
                            disabled={!signedIn || !supabase || uploading}
                            className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none disabled:opacity-60"
                          />
                          <button
                            type="button"
                            onClick={addCategory}
                            disabled={!signedIn || !supabase || uploading || !categoryDraft.trim()}
                            className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-400 text-slate-700 text-sm font-semibold"
                          >
                            Add
                          </button>
                        </div>
                        <div className="mb-3 flex flex-wrap gap-2">
                          {categories.map((c) => {
                            const isDefault = DEFAULT_CATEGORIES.includes(c);
                            return (
                              <div key={c} className="flex items-center gap-1 rounded-full bg-white border border-slate-200 px-3 py-1">
                                <button
                                  type="button"
                                  onClick={() => setUploadCategory(c)}
                                  disabled={!signedIn || !supabase || uploading}
                                  className="text-xs font-semibold text-slate-700 hover:text-slate-900"
                                >
                                  {c}
                                </button>
                                {!isDefault && (
                                  <button
                                    type="button"
                                    onClick={() => deleteCategory(c)}
                                    disabled={!signedIn || !supabase || uploading}
                                    className="text-xs text-slate-400 hover:text-red-600"
                                    title="Delete category"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <label className="mb-2 flex items-center gap-2 text-sm text-slate-700 font-semibold">
                          <input
                            type="checkbox"
                            checked={uploadPublish}
                            onChange={(e) => setUploadPublish(e.target.checked)}
                            disabled={!signedIn || !supabase || uploading}
                          />
                          Publish to public library
                        </label>
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          multiple
                          disabled={!signedIn || !supabase || uploading}
                          onChange={(e) => {
                            const incoming = Array.from(e.target.files || []).filter(Boolean);
                            e.target.value = '';
                            enqueueUploads(incoming);
                          }}
                          className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 disabled:opacity-60"
                        />
                        {uploads.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {uploads.slice(0, 5).map((u) => (
                              <div key={u.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate">{u.title || defaultTitleFromFileName(u.file.name)}</p>
                                    <p className="text-xs text-slate-500 truncate">
                                      {u.category} • {formatBytes(u.file.size)} • {u.stage}
                                    </p>
                                  </div>
                                  <div className="text-xs font-semibold text-slate-600 tabular-nums">{u.progress}%</div>
                                </div>
                                <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                  <div className="h-full bg-emerald-600" style={{ width: `${Math.max(0, Math.min(100, u.progress))}%` }} />
                                </div>
                                {u.error && <div className="mt-2 text-xs font-semibold text-red-700">{u.error}</div>}
                              </div>
                            ))}
                            {uploads.length > 5 && (
                              <div className="text-xs text-slate-500">+ {uploads.length - 5} more</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                {view === 'public' ? (
                  filteredPublic.length === 0 ? (
                    <div className="p-4 text-sm text-slate-600">
                      {loadingPublic ? 'Loading…' : 'No public PDFs found.'}
                    </div>
                  ) : layout === 'grid' ? (
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {filteredPublic.map((f) => {
                        const active = f.path === selectedPath;
                        const added = savedPaths.has(f.path);
                        const thumbUrl = f.thumbnailPath ? thumbnailUrls[f.thumbnailPath] : null;
                        return (
                          <div key={f.path} className={`rounded-xl border overflow-hidden ${active ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-white'}`}>
                            <button type="button" onClick={() => openPdf(f.path, f.title)} className="w-full text-left">
                              <div className="aspect-[3/4] bg-slate-100 flex items-center justify-center">
                                {thumbUrl ? (
                                  <img src={thumbUrl} alt={f.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="text-xs font-bold text-slate-500">PDF</div>
                                )}
                              </div>
                              <div className="p-3">
                                <p className="font-semibold text-slate-900 truncate">{f.title}</p>
                                <p className="text-xs text-slate-500 mt-1 truncate">{f.category}</p>
                              </div>
                            </button>
                            <div className="px-3 pb-3 flex items-center justify-between gap-2">
                              {signedIn ? (
                                <button
                                  type="button"
                                  onClick={() => (added ? removeFromMyLibrary(f.path) : addToMyLibrary(f.path))}
                                  disabled={loadingSaved}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${added ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-emerald-600 text-white hover:bg-emerald-700'} disabled:opacity-60`}
                                >
                                  {added ? 'Added' : 'Add'}
                                </button>
                              ) : (
                                <span className="text-xs text-slate-500" />
                              )}
                              <button
                                type="button"
                                onClick={() => openPdf(f.path, f.title)}
                                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                                title="Open"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredPublic.map((f) => {
                        const active = f.path === selectedPath;
                        const added = savedPaths.has(f.path);
                        const thumbUrl = f.thumbnailPath ? thumbnailUrls[f.thumbnailPath] : null;
                        return (
                          <div key={f.path} className={`p-4 flex items-center justify-between gap-3 ${active ? 'bg-emerald-50/40' : ''}`}>
                            <button type="button" onClick={() => openPdf(f.path, f.title)} className="min-w-0 flex-1 text-left flex items-center gap-3">
                              <div className="w-12 h-16 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                                {thumbUrl ? <img src={thumbUrl} alt="" className="w-full h-full object-cover" /> : <div className="text-[10px] font-bold text-slate-500">PDF</div>}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 truncate">{f.title}</p>
                                <p className="text-xs text-slate-500 mt-1 truncate">
                                  {f.category} • {formatBytes(f.sizeBytes)}{f.createdAtMs ? ` • ${new Date(f.createdAtMs).toLocaleDateString()}` : ''}
                                </p>
                              </div>
                            </button>
                            <div className="flex items-center gap-2">
                              {signedIn ? (
                                <button
                                  type="button"
                                  onClick={() => (added ? removeFromMyLibrary(f.path) : addToMyLibrary(f.path))}
                                  disabled={loadingSaved}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${added ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-emerald-600 text-white hover:bg-emerald-700'} disabled:opacity-60`}
                                  title={added ? 'Remove from My Library' : 'Add to My Library'}
                                >
                                  {added ? 'Added' : 'Add'}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => openPdf(f.path, f.title)}
                                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                                title="Open"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : filtered.length === 0 ? (
                  <div className="p-4 text-sm text-slate-600">
                    {signedIn ? 'No PDFs yet. Upload one to start.' : 'Sign in to see and store your PDFs.'}
                  </div>
                ) : layout === 'grid' ? (
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filtered.map((f) => {
                      const active = f.path === selectedPath;
                      const thumbUrl = f.thumbnailPath ? thumbnailUrls[f.thumbnailPath] : null;
                      return (
                        <div key={f.path} className={`rounded-xl border overflow-hidden ${active ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-white'}`}>
                          <button type="button" onClick={() => openPdf(f.path, f.title)} className="w-full text-left">
                            <div className="aspect-[3/4] bg-slate-100 flex items-center justify-center">
                              {thumbUrl ? (
                                <img src={thumbUrl} alt={f.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="text-xs font-bold text-slate-500">PDF</div>
                              )}
                            </div>
                            <div className="p-3">
                              <p className="font-semibold text-slate-900 truncate">{f.title}</p>
                              <p className="text-xs text-slate-500 mt-1 truncate">
                                {f.category ? f.category : 'General'}{f.source === 'saved' ? ' • Saved' : ''}{f.isPublic ? ' • Public' : ''}
                              </p>
                            </div>
                          </button>
                          <div className="px-3 pb-3 flex items-center justify-between gap-2">
                            {f.source === 'uploaded' ? (
                              <button
                                type="button"
                                onClick={() => handleEditTitle(f.path, f.title)}
                                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                                title="Edit title"
                              >
                                <PenLine className="w-4 h-4" />
                              </button>
                            ) : (
                              <span />
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openPdf(f.path, f.title)}
                                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                                title="Open"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => (f.source === 'saved' ? removeFromMyLibrary(f.path) : handleDelete(f.path))}
                                className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                                title={f.source === 'saved' ? 'Remove' : 'Delete'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filtered.map((f) => {
                      const active = f.path === selectedPath;
                      const thumbUrl = f.thumbnailPath ? thumbnailUrls[f.thumbnailPath] : null;
                      return (
                        <div key={f.path} className={`p-4 flex items-center justify-between gap-3 ${active ? 'bg-emerald-50/40' : ''}`}>
                          <button type="button" onClick={() => openPdf(f.path, f.title)} className="min-w-0 flex-1 text-left flex items-center gap-3">
                            <div className="w-12 h-16 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                              {thumbUrl ? <img src={thumbUrl} alt="" className="w-full h-full object-cover" /> : <div className="text-[10px] font-bold text-slate-500">PDF</div>}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">{f.title}</p>
                              <p className="text-xs text-slate-500 mt-1 truncate">
                                {f.name} • {formatBytes(f.size)}{f.category ? ` • ${f.category}` : ''}{f.source === 'saved' ? ' • Saved' : ''}{f.isPublic ? ' • Public' : ''}{f.updatedAtMs ? ` • ${new Date(f.updatedAtMs).toLocaleDateString()}` : ''}
                              </p>
                            </div>
                          </button>
                          <div className="flex items-center gap-2">
                            {f.source === 'uploaded' ? (
                              <button
                                type="button"
                                onClick={() => handleEditTitle(f.path, f.title)}
                                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                                title="Edit title"
                              >
                                <PenLine className="w-4 h-4" />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => openPdf(f.path, f.title)}
                              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                              title="Open"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => (f.source === 'saved' ? removeFromMyLibrary(f.path) : handleDelete(f.path))}
                              className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                              title={f.source === 'saved' ? 'Remove' : 'Delete'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">Reader</p>
                  <p className="text-xs text-slate-500 truncate">{selectedName || 'Select a PDF to read'}</p>
                </div>
                {pdfExternalUrl && (
                  <div className="flex items-center gap-2">
                    <a
                      href={pdfExternalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
                    >
                      Open in new tab
                    </a>
                    <a
                      href={pdfExternalUrl}
                      download
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
                    >
                      Download
                    </a>
                  </div>
                )}
              </div>

              <div className="h-[70vh] bg-slate-50">
                {loadingPdf ? (
                  <div className="h-full flex items-center justify-center text-slate-600 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Opening…
                  </div>
                ) : pdfNumPages > 0 ? (
                  <div className="h-full flex flex-col">
                    <div className="px-4 py-2 border-b border-slate-200 bg-white flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPdfPage((p) => Math.max(1, p - 1))}
                          disabled={pdfPage <= 1}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-400 text-slate-700 text-sm font-semibold"
                        >
                          Prev
                        </button>
                        <span className="text-xs font-semibold text-slate-600">
                          Page {pdfPage} / {pdfNumPages || 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPdfPage((p) => Math.min(Math.max(1, pdfNumPages || 1), p + 1))}
                          disabled={pdfNumPages > 0 ? pdfPage >= pdfNumPages : true}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-400 text-slate-700 text-sm font-semibold"
                        >
                          Next
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPdfScale((s) => Math.max(0.6, Math.round((s - 0.15) * 100) / 100))}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
                        >
                          -
                        </button>
                        <span className="text-xs font-semibold text-slate-600 w-12 text-center">
                          {Math.round(pdfScale * 100)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => setPdfScale((s) => Math.min(3, Math.round((s + 0.15) * 100) / 100))}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {pdfRenderError ? (
                      <div className="flex-1 flex items-center justify-center px-6 text-center text-sm text-slate-700">
                        <div className="space-y-3">
                          <p className="font-semibold">Could not render this PDF in the app WebView.</p>
                          <p className="text-slate-600">{pdfRenderError}</p>
                          {pdfExternalUrl ? (
                            <div className="flex items-center justify-center gap-2">
                              <a
                                href={pdfExternalUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                              >
                                Open in new tab
                              </a>
                              <a
                                href={pdfExternalUrl}
                                download
                                className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                              >
                                Download
                              </a>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-auto flex justify-center p-4">
                        <canvas ref={canvasRef} className="bg-white shadow-sm border border-slate-200 rounded-lg" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600 text-sm">
                    Choose a book from the left to start reading.
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-500">
              If uploads/listing fail, create a Supabase Storage bucket named <span className="font-semibold text-slate-700">{BUCKET}</span> and allow signed-in users to list/upload/read their own folder.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
