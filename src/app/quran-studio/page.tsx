'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { surahs } from '@/data/surahs';
import { getAllJuzBoundaries } from '@/lib/juzBoundaries';
import {
  Mic,
  Pause,
  Square,
  Play,
  Upload,
  Save,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  Clock,
  Gauge,
  Waves,
  BookmarkPlus,
  Download,
  Settings,
  Loader2,
  Wifi,
  WifiOff,
  ShieldCheck,
} from 'lucide-react';

type VerseMarker = {
  verseKey: string; // "S:A"
  timestamp: number; // seconds
  label: string;
};

type StudioDraft = {
  id: string;
  createdAt: number;
  title: string;
  description?: string;
  scope: string; // surah id or juz id label
  audioBlobUrl?: string;
  audioDataUrl?: string;
  durationSeconds: number;
  markers: VerseMarker[];
  surahFrom?: number;
  surahTo?: number;
  juz?: number;
  status: 'draft' | 'uploading' | 'synced' | 'failed';
};

const SURAHS_PER_PAGE = 20;
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const DRAFT_KEY = 'quran-studio-drafts-v1';

function formatDuration(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function buildVerseKeysForScope(
  mode: 'surah' | 'juz',
  surahId?: number,
  juzId?: number
): { verseKey: string; label: string }[] {
  const out: { verseKey: string; label: string }[] = [];

  if (mode === 'surah' && surahId) {
    const fallbackCounts: Record<number, number> = {
      1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165, 7: 206, 8: 75, 9: 129, 10: 109,
      11: 123, 12: 111, 13: 43, 14: 52, 15: 99, 16: 128, 17: 111, 18: 110, 19: 98, 20: 135,
      36: 83, 55: 78, 56: 96, 67: 30, 78: 40, 112: 4, 113: 5, 114: 6,
    };
    const count = fallbackCounts[surahId] ?? 40;
    for (let a = 1; a <= count; a++) {
      const verseKey = `${surahId}:${a}`;
      out.push({ verseKey, label: verseKey });
    }
    return out;
  }

  if (mode === 'juz' && juzId) {
    const all = getAllJuzBoundaries();
    const found = all.find((j) => j.juz === juzId);
    if (!found) return out;

    const [startS, startA] = found.startVerse.split(':').map(Number);
    const [endS, endA] = found.endVerse.split(':').map(Number);
    for (let s = startS; s <= endS; s++) {
      const firstAyah = s === startS ? startA : 1;
      const lastAyah = s === endS ? endA : 300;
      for (let a = firstAyah; a <= lastAyah; a++) {
        const verseKey = `${s}:${a}`;
        out.push({ verseKey, label: verseKey });
        if (s === endS && a === lastAyah) break;
      }
    }
  }
  return out;
}

export default function QuranStudioPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  // Auth
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Scope / verse picker
  const [scopeMode, setScopeMode] = useState<'surah' | 'juz'>('surah');
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [selectedJuz, setSelectedJuz] = useState<number>(1);
  const [surahPage, setSurahPage] = useState(0);

  const verseList = useMemo(
    () => buildVerseKeysForScope(scopeMode, selectedSurah, selectedJuz),
    [scopeMode, selectedSurah, selectedJuz]
  );

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [currentVerseIdx, setCurrentVerseIdx] = useState(0);
  const [markers, setMarkers] = useState<VerseMarker[]>([]);

  // Waveform
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const waveformLevelsRef = useRef<number[]>(new Array(160).fill(0));

  // Audio media
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopMicrophoneStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  // Playback
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loopVerseA, setLoopVerseA] = useState<number | null>(null);
  const [loopVerseB, setLoopVerseB] = useState<number | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Drafts + offline
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [drafts, setDrafts] = useState<StudioDraft[]>([]);
  const [draftsLoaded, setDraftsLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    (async () => {
      if (!supabase) {
        setAuthChecked(true);
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push('/auth?redirect=/quran-studio');
        return;
      }
      setUser(data.user);
      setAuthChecked(true);
    })();
  }, [supabase, router]);

  // Online / offline
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Load drafts
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        setDrafts(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
    setDraftsLoaded(true);
  }, []);

  const persistDrafts = (next: StudioDraft[]) => {
    setDrafts(next);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    } catch {
      // ignore quota errors
    }
  };

  // Reset scope when mode changes
  useEffect(() => {
    setCurrentVerseIdx(0);
    setMarkers([]);
  }, [scopeMode, selectedSurah, selectedJuz]);

  // Recording timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = window.setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  // Waveform render loop (runs continuously if analyser is attached, else decays from playback)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const analyser = analyserRef.current;
      if (analyser && isRecording && !isPaused) {
        const arr = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(arr);
        // Aggregate a single amplitude
        let sumSq = 0;
        for (let i = 0; i < arr.length; i++) {
          const v = (arr[i] - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / arr.length);
        waveformLevelsRef.current.shift();
        waveformLevelsRef.current.push(Math.min(1, rms * 2.5));
      } else {
        // Slowly decay visualization when not recording
        const last = waveformLevelsRef.current[waveformLevelsRef.current.length - 1] ?? 0;
        waveformLevelsRef.current.shift();
        waveformLevelsRef.current.push(last * 0.9);
      }

      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Baseline
      const midY = rect.height / 2;
      const levels = waveformLevelsRef.current;
      const step = rect.width / levels.length;

      // Draw filled waveform (mirror top & bottom)
      const grad = ctx.createLinearGradient(0, 0, 0, rect.height);
      grad.addColorStop(0, 'rgba(16, 185, 129, 0.9)');
      grad.addColorStop(0.5, 'rgba(20, 184, 166, 0.9)');
      grad.addColorStop(1, 'rgba(16, 185, 129, 0.9)');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(0, midY);
      levels.forEach((lv, i) => {
        const x = i * step;
        const h = lv * (rect.height / 2 - 4);
        ctx.lineTo(x, midY - h);
      });
      ctx.lineTo(rect.width, midY);
      levels.slice().reverse().forEach((lv, i) => {
        const x = rect.width - i * step;
        const h = lv * (rect.height / 2 - 4);
        ctx.lineTo(x, midY + h);
      });
      ctx.closePath();
      ctx.fill();

      // Current verse marker overlay as playhead
      const playheadX = audioBlob && audioElRef.current
        ? (audioElRef.current.currentTime / Math.max(0.01, audioElRef.current.duration || 1)) * rect.width
        : isRecording
          ? (elapsed / Math.max(1, elapsed + 30)) * rect.width
          : 0;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, rect.height);
      ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRecording, isPaused, elapsed, audioBlob]);

  const ensureAudioContextStarted = (stream: MediaStream) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    if (!sourceRef.current) {
      sourceRef.current = audioCtxRef.current.createMediaStreamSource(stream);
      const analyser = audioCtxRef.current.createAnalyser();
      analyser.fftSize = 512;
      sourceRef.current.connect(analyser);
      analyserRef.current = analyser;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      ensureAudioContextStarted(stream);

      audioChunksRef.current = [];
      let mime = 'audio/webm';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mime = 'audio/webm;codecs=opus';
      }
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mime || 'audio/webm' });
        audioChunksRef.current = [];
        stopMicrophoneStream();
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          setAudioBlob(blob);
          setAudioUrl(url);
          setSaveMsg(null);
        } else {
          setAudioBlob(null);
          setAudioUrl(null);
          setSaveMsg('No audio was captured. Please record again.');
        }
        setIsRecording(false);
        setIsPaused(false);
      };
      rec.onerror = () => {
        stopMicrophoneStream();
        setIsRecording(false);
        setIsPaused(false);
        setSaveMsg('Recording failed. Please try again.');
      };
      mediaRecorderRef.current = rec;
      rec.start(250);

      setIsRecording(true);
      setIsPaused(false);
      setElapsed(0);
      setMarkers([]);
      setCurrentVerseIdx(0);
      setSaveMsg(null);
    } catch (err: any) {
      setSaveMsg('Could not access microphone: ' + (err?.message || 'permission denied'));
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    } else if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
    } else {
      stopMicrophoneStream();
    }
    if (analyserRef.current) analyserRef.current.disconnect();
    if (sourceRef.current) sourceRef.current.disconnect();
    analyserRef.current = null;
    sourceRef.current = null;
  };

  const stampCurrentVerse = () => {
    if (!isRecording) return;
    const verse = verseList[currentVerseIdx];
    if (!verse) return;
    setMarkers((m) => [
      ...m,
      { verseKey: verse.verseKey, timestamp: elapsed, label: verse.label },
    ]);
    if (currentVerseIdx < verseList.length - 1) {
      setCurrentVerseIdx(currentVerseIdx + 1);
    }
  };

  const manualStampVerse = (idx: number) => {
    if (!isRecording) return;
    const verse = verseList[idx];
    if (!verse) return;
    setMarkers((m) => [
      ...m,
      { verseKey: verse.verseKey, timestamp: elapsed, label: verse.label },
    ]);
  };

  // Playback helpers
  const onPlayPause = () => {
    const el = audioElRef.current;
    if (!el || !audioUrl) return;
    if (el.paused) {
      el.play();
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioElRef.current;
    if (!el) return;
    const t = Number(e.target.value);
    el.currentTime = t;
    setPlaybackTime(t);
  };

  // Loop enforcement
  useEffect(() => {
    const el = audioElRef.current;
    if (!el) return;
    const handleTime = () => {
      setPlaybackTime(el.currentTime);
      if (loopVerseA !== null && loopVerseB !== null && loopVerseB > loopVerseA) {
        if (el.currentTime >= loopVerseB) {
          el.currentTime = loopVerseA;
        }
      }
    };
    el.addEventListener('timeupdate', handleTime);
    return () => el.removeEventListener('timeupdate', handleTime);
  }, [loopVerseA, loopVerseB]);

  const setLoopFromMarkers = (aIdx: number, bIdx: number) => {
    const a = markers[aIdx];
    const b = markers[bIdx];
    if (!a || !b || aIdx === bIdx) return;
    setLoopVerseA(a.timestamp);
    setLoopVerseB(b.timestamp);
  };

  const clearLoop = () => {
    setLoopVerseA(null);
    setLoopVerseB(null);
  };

  // Save / submit
  function buildDraftCore(): StudioDraft {
    const finalTitle =
      title.trim() ||
      `Hifz Session — ${
        scopeMode === 'surah'
          ? `Surah ${selectedSurah}`
          : `Juz ${selectedJuz}`
      } — ${new Date().toLocaleString()}`;
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      title: finalTitle,
      description: description.trim() || undefined,
      scope:
        scopeMode === 'surah'
          ? `Surah ${selectedSurah}`
          : `Juz ${selectedJuz}`,
      durationSeconds: elapsed,
      markers,
      surahFrom: scopeMode === 'surah' ? selectedSurah : undefined,
      surahTo: scopeMode === 'surah' ? selectedSurah : undefined,
      juz: scopeMode === 'juz' ? selectedJuz : undefined,
      status: 'draft',
    };
  }

  const saveOfflineDraft = () => {
    if (!audioBlob) {
      setSaveMsg('Record something first, then save.');
      return;
    }
    const draft = buildDraftCore();
    const reader = new FileReader();
    reader.onload = () => {
      draft.audioDataUrl = reader.result as string;
      persistDrafts([draft, ...drafts]);
      setSaveMsg('Draft saved locally.');
    };
    reader.readAsDataURL(audioBlob);
  };

  const submitDirect = async () => {
    if (!audioBlob || audioBlob.size === 0) {
      setSaveMsg('Record something first, then submit.');
      return;
    }
    if (!user) {
      setSaveMsg('Please sign in to submit recordings.');
      return;
    }
    const draft = buildDraftCore();

    try {
      setSaving(true);
      draft.status = 'uploading';
      // Add a placeholder entry to drafts (without base64 audio yet) for UX
      persistDrafts([draft, ...drafts]);

      // Upload via server API — uses service role + inline fallback
      const formData = new FormData();
      const extension = audioBlob.type.includes('ogg') ? 'ogg' : audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
      formData.append('file', audioBlob, `${draft.id}-recording.${extension}`);
      const uploadRes = await fetch('/api/quran-recordings/upload', {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) {
        const body = await uploadRes.json().catch(() => ({}));
        throw new Error(body.error || body.storageError || 'Upload failed');
      }
      const uploadData = await uploadRes.json();

      // Persist recording row
      const res = await fetch('/api/quran-recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description,
          surah_from: draft.surahFrom,
          surah_to: draft.surahTo,
          juz: draft.juz,
          audio_url: uploadData.publicUrl,
          audio_path: uploadData.filePath,
          duration_seconds: draft.durationSeconds,
          file_size_bytes: audioBlob.size,
          mistakes_details: draft.markers,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Submit failed');
      }

      // Now persist base64 to localStorage in background (for offline record)
      const reader = new FileReader();
      reader.onload = () => {
        draft.audioDataUrl = reader.result as string;
        draft.status = 'synced';
        persistDrafts([draft, ...drafts.filter((d) => d.id !== draft.id)]);
      };
      reader.readAsDataURL(audioBlob);

      setSaveMsg('Recording submitted for review!');
    } catch (err: any) {
      console.error(err);
      draft.status = 'failed';
      persistDrafts([draft, ...drafts.filter((d) => d.id !== draft.id)]);
      setSaveMsg('Upload failed: ' + (err?.message || 'unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const syncDraft = async (draft: StudioDraft) => {
    if (!user) {
      setSaveMsg('Please sign in to submit recordings.');
      return;
    }
    if (!draft.audioDataUrl) {
      setSaveMsg('Draft has no audio data.');
      return;
    }
    try {
      setSaving(true);
      persistDrafts(drafts.map((d) => (d.id === draft.id ? { ...d, status: 'uploading' } : d)));

      // Rebuild audio blob from data URL
      const binStr = atob(draft.audioDataUrl.split(',')[1]);
      const arr = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) arr[i] = binStr.charCodeAt(i);
      const blob = new Blob([arr], { type: 'audio/webm' });

      // Upload via server API — uses service role + inline fallback so it never fails
      const formData = new FormData();
      formData.append('file', blob, `${draft.id}-recording.webm`);
      const uploadRes = await fetch('/api/quran-recordings/upload', {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) {
        const body = await uploadRes.json().catch(() => ({}));
        throw new Error(body.error || body.storageError || 'Upload failed');
      }
      const uploadData = await uploadRes.json();

      // Persist recording row
      const res = await fetch('/api/quran-recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description,
          surah_from: draft.surahFrom,
          surah_to: draft.surahTo,
          juz: draft.juz,
          audio_url: uploadData.publicUrl,
          audio_path: uploadData.filePath,
          duration_seconds: draft.durationSeconds,
          file_size_bytes: blob.size,
          mistakes_details: draft.markers,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Submit failed');
      }

      persistDrafts(drafts.map((d) => (d.id === draft.id ? { ...d, status: 'synced' } : d)));
      setSaveMsg('Recording submitted for review!');
    } catch (err: any) {
      console.error(err);
      persistDrafts(drafts.map((d) => (d.id === draft.id ? { ...d, status: 'failed' } : d)));
      setSaveMsg('Upload failed: ' + (err?.message || 'unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const deleteDraft = (id: string) => {
    persistDrafts(drafts.filter((d) => d.id !== id));
  };

  // Auto-sync all offline drafts when back online
  useEffect(() => {
    if (!online || !draftsLoaded) return;
    const stillPending = drafts.filter((d) => d.status === 'draft' || d.status === 'failed');
    if (stillPending.length === 0 || !user) return;
    stillPending.forEach((d) => syncDraft(d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, draftsLoaded, user]);

  const exportAudio = () => {
    if (!audioBlob || !audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `quran-recording-${Date.now()}.webm`;
    a.click();
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const surahPageStart = surahPage * SURAHS_PER_PAGE;
  const surahPageEnd = Math.min(surahs.length, surahPageStart + SURAHS_PER_PAGE);
  const totalSurahPages = Math.ceil(surahs.length / SURAHS_PER_PAGE);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <Link
              href="/quran-recording"
              className="text-sm text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 mb-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back to recordings
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Waves className="w-6 h-6 text-emerald-600" />
              Hifz Recording Studio
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Record ayat-by-ayat with live waveform, speed control, and offline drafts.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Link
              href="/admin/quran-recordings"
              title="Admin panel — review recordings, send announcements, push notifications"
              className="group inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 text-indigo-950 border-2 border-indigo-300 shadow-md hover:from-indigo-100 hover:via-violet-100 hover:to-fuchsia-100 transition-colors ring-1 ring-white font-bold text-xs sm:text-sm"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-700" strokeWidth={2.3} />
              <span>Admin</span>
              <span className="inline-flex items-center rounded-full bg-indigo-600 border border-indigo-700 text-white text-[9px] font-black tracking-[0.18em] px-2 py-0.5 uppercase shadow-sm">
                STAFF
              </span>
            </Link>
            {online ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <Wifi className="w-3.5 h-3.5" /> Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                <WifiOff className="w-3.5 h-3.5" /> Offline (drafts saved locally)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Left: Scope + verse list */}
        <aside className="space-y-4">
          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Recording Scope
            </h2>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
              <button
                className={`flex-1 py-2 font-medium transition-colors ${
                  scopeMode === 'surah' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => setScopeMode('surah')}
              >
                By Surah
              </button>
              <button
                className={`flex-1 py-2 font-medium transition-colors ${
                  scopeMode === 'juz' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => setScopeMode('juz')}
              >
                By Juz
              </button>
            </div>

            {scopeMode === 'surah' ? (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Surah</label>
                  <div className="flex items-center gap-1">
                    <button
                      className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-40"
                      disabled={surahPage === 0}
                      onClick={() => setSurahPage(Math.max(0, surahPage - 1))}
                    >
                      Prev
                    </button>
                    <span className="text-xs text-slate-500 px-1">
                      {surahPage + 1}/{totalSurahPages}
                    </span>
                    <button
                      className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-40"
                      disabled={surahPage + 1 >= totalSurahPages}
                      onClick={() => setSurahPage(Math.min(totalSurahPages - 1, surahPage + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5 max-h-72 overflow-y-auto p-1 border border-slate-100 rounded-lg">
                  {surahs.slice(surahPageStart, surahPageEnd).map((s) => (
                    <button
                      key={s.id}
                      className={`py-2 px-1 rounded text-xs text-left truncate transition-colors ${
                        selectedSurah === s.id
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                      onClick={() => setSelectedSurah(s.id)}
                    >
                      <div className="font-bold">{s.id}</div>
                      <div className="truncate">{s.name_simple}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <label className="text-sm font-medium text-slate-700 block mb-2">Juz</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={selectedJuz}
                  onChange={(e) => setSelectedJuz(Number(e.target.value))}
                >
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                    <option key={j} value={j}>
                      Juz {j}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Verse Timeline
              </h2>
              <div className="text-xs text-slate-500">
                {markers.length}/{verseList.length} marked
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
              {verseList.map((v, idx) => {
                const marker = markers.find((m) => m.verseKey === v.verseKey);
                const isCurrent = idx === currentVerseIdx && isRecording;
                return (
                  <button
                    key={v.verseKey}
                    onClick={() => {
                      if (isRecording) manualStampVerse(idx);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-sm transition-colors ${
                      isCurrent
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : marker
                        ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    } ${!isRecording ? 'cursor-default' : ''}`}
                  >
                    <span className="font-mono text-xs">{v.label}</span>
                    <span className="text-xs opacity-80">
                      {marker ? formatDuration(marker.timestamp) : isRecording ? 'Tap to mark' : '—'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        {/* Right: Studio */}
        <main className="space-y-6">
          {/* Waveform */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Gauge className="w-5 h-5 text-emerald-600" />
                Live Waveform
              </h2>
              <div className="text-right">
                <div className="text-3xl font-mono font-bold text-slate-800">
                  {formatDuration(elapsed)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {isRecording ? (isPaused ? 'Paused' : 'Recording') : audioBlob ? 'Ready to review' : 'Idle'}
                </div>
              </div>
            </div>
            <canvas
              ref={canvasRef}
              className="w-full h-36 rounded-lg bg-slate-50 border border-slate-100"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                >
                  <Mic className="w-5 h-5" /> Start Recording
                </button>
              ) : (
                <>
                  <button
                    onClick={pauseRecording}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium transition-colors"
                  >
                    {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={stampCurrentVerse}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors"
                  >
                    <BookmarkPlus className="w-5 h-5" />
                    Mark Verse{' '}
                    <span className="opacity-80 font-mono">
                      ({verseList[currentVerseIdx]?.label || 'done'})
                    </span>
                  </button>
                  <button
                    onClick={stopRecording}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium transition-colors"
                  >
                    <Square className="w-5 h-5" /> Stop
                  </button>
                </>
              )}

              {audioBlob && (
                <>
                  <button
                    onClick={exportAudio}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                  >
                    <Download className="w-5 h-5" /> Export
                  </button>
                  <button
                    onClick={saveOfflineDraft}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                  >
                    <Save className="w-5 h-5" /> Save Draft
                  </button>
                </>
              )}
            </div>
          </section>

          {/* Playback */}
          {audioUrl && (
            <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Play className="w-5 h-5 text-emerald-600" />
                  Playback & Review
                </h2>
                <div className="flex items-center gap-1">
                  <Settings className="w-4 h-4 text-slate-400" />
                  <select
                    className="text-sm px-2 py-1.5 rounded-lg border border-slate-200"
                    value={playbackRate}
                    onChange={(e) => {
                      const rate = Number(e.target.value);
                      setPlaybackRate(rate);
                      if (audioElRef.current) audioElRef.current.playbackRate = rate;
                    }}
                  >
                    {PLAYBACK_RATES.map((r) => (
                      <option key={r} value={r}>
                        {r}x speed
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={onPlayPause}
                  className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-600 w-12 text-right">
                    {formatDuration(playbackTime)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={audioElRef.current?.duration || 0}
                    step={0.1}
                    value={playbackTime}
                    onChange={onSeek}
                    className="flex-1 accent-emerald-600"
                  />
                  <span className="text-xs font-mono text-slate-600 w-12">
                    {formatDuration(audioElRef.current?.duration || 0)}
                  </span>
                </div>
              </div>

              <audio
                ref={audioElRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              {markers.length >= 2 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Loop a verse range (for tajweed practice)
                    </h3>
                    {loopVerseA !== null && (
                      <button
                        onClick={clearLoop}
                        className="text-xs text-slate-500 hover:text-slate-800"
                      >
                        Clear loop
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="text-sm px-2 py-2 rounded-lg border border-slate-200"
                      defaultValue=""
                      onChange={(e) => {
                        if (loopVerseB !== null && Number(e.target.value) >= loopVerseB) return;
                        setLoopFromMarkers(Number(e.target.value), markers.length - 1);
                      }}
                    >
                      <option value="" disabled>
                        Pick start verse...
                      </option>
                      {markers.map((m, i) => (
                        <option key={i} value={i}>
                          {m.verseKey} @ {formatDuration(m.timestamp)}
                        </option>
                      ))}
                    </select>
                    <select
                      className="text-sm px-2 py-2 rounded-lg border border-slate-200"
                      defaultValue=""
                      onChange={(e) => {
                        const a = Number(e.target.value);
                        if (a > 0) setLoopFromMarkers(a - 1, a);
                      }}
                    >
                      <option value="" disabled>
                        Quick-pick end verse...
                      </option>
                      {markers.slice(1).map((m, i) => (
                        <option key={i + 1} value={i + 1}>
                          {m.verseKey} @ {formatDuration(m.timestamp)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {loopVerseA !== null && loopVerseB !== null && (
                    <div className="mt-2 text-xs text-slate-600 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                      Looping {formatDuration(loopVerseA)} → {formatDuration(loopVerseB)}. Switch
                      off with "Clear loop" when ready to continue.
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Submit card */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600" />
              Submit for Review
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Juz 1 — Evening Practice"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Notes for instructor (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <button
                disabled={!audioBlob || saving}
                onClick={submitDirect}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                {saving ? 'Submitting...' : 'Submit Now'}
              </button>
              <button
                onClick={saveOfflineDraft}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
              >
                <Save className="w-5 h-5" /> Save Draft
              </button>
              {saveMsg && (
                <span className="text-sm text-slate-600 flex items-center gap-1">
                  {saveMsg.startsWith('Recording') || saveMsg.startsWith('Draft') ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  )}
                  {saveMsg}
                </span>
              )}
            </div>
          </section>

          {/* Drafts */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                Offline Drafts ({drafts.length})
              </h2>
            </div>
            {drafts.length === 0 ? (
              <p className="text-sm text-slate-500">
                No drafts yet. Record and click <strong>Save Draft</strong> to save recordings
                offline — they'll auto-sync when you reconnect.
              </p>
            ) : (
              <div className="space-y-2">
                {drafts.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/60"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{d.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {d.scope} • {formatDuration(d.durationSeconds)} • {d.markers.length} markers •{' '}
                        {new Date(d.createdAt).toLocaleString()}
                      </p>
                      <div className="mt-2">
                        <span
                          className={`text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                            d.status === 'synced'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : d.status === 'uploading'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : d.status === 'failed'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {d.status === 'synced'
                            ? '✓ Submitted'
                            : d.status === 'uploading'
                            ? 'Uploading…'
                            : d.status === 'failed'
                            ? 'Failed (retry)'
                            : 'Draft'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => syncDraft(d)}
                        disabled={saving || d.status === 'synced'}
                        className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-slate-300 transition-colors"
                      >
                        Submit
                      </button>
                      <button
                        onClick={() => deleteDraft(d.id)}
                        className="text-xs px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
