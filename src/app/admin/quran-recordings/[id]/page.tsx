'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminGateClient from '@/components/AdminGateClient';
import { 
  ChevronLeft,
  Play, 
  Pause, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Hourglass,
  Star,
  User,
  MessageSquare,
  Plus,
  X,
  Mic,
  Send,
  Award,
  AlertTriangle,
  ThumbsUp
} from 'lucide-react';

interface Recording {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'reviewing' | 'approved' | 'needs_improvement';
  surah_from?: number;
  ayah_from?: number;
  surah_to?: number;
  ayah_to?: number;
  juz?: number;
  audio_url: string;
  duration_seconds?: number;
  file_size_bytes?: number;
  admin_rating?: number;
  admin_feedback?: string;
  points_awarded?: number;
  mistakes_count?: number;
  mistakes_details?: any;
  created_at: string;
  reviewed_at?: string;
  user: {
    id: string;
    email: string;
    raw_user_meta_data?: { name?: string };
  };
  reviewed_by?: {
    id: string;
    email: string;
  };
  comments?: Comment[];
}

interface Comment {
  id: string;
  comment: string;
  audio_timestamp_seconds?: number;
  is_admin_comment: boolean;
  created_at: string;
  user?: {
    id: string;
    email: string;
  };
}

interface Mistake {
  type: string;
  description: string;
  timestamp?: number;
}

const FEEDBACK_TEMPLATES: { label: string; items: { label: string; template: string }[] }[] = [
  {
    label: 'Strengths',
    items: [
      { label: 'Excellent tajweed', template: '✅ MashaAllah — excellent tajweed in this section. Keep applying these rules consistently.' },
      { label: 'Clear makhraj', template: '✅ Makhraj (letter articulation points) are very clear here. Beautiful recitation.' },
      { label: 'Good tartil', template: '✅ Great tartil (proper measured pace). Calm, deliberate, and easy to follow.' },
      { label: 'Beautiful tone', template: '✅ Very beautiful tone and tajweed — heart-touching recitation.' },
      { label: 'Strong memorization', template: '✅ Memorization is strong here — smooth flow, no hesitations. BarakAllah!' },
    ],
  },
  {
    label: 'Tajweed Corrections',
    items: [
      { label: 'Ghunnah missed', template: '⚠️ Please apply ghunnah here (nasalization on noon sakinah / tanween / meem sakinah). Extend slightly with proper nasal resonance.' },
      { label: 'Idgham rule', template: '⚠️ Idgham rule applies here — merge the following letters properly with ghunnah where applicable.' },
      { label: 'Ikhfa rule', template: '⚠️ Ikhfa rule applies here — nasalize the noon/tanween sound subtly while keeping the mouth closed properly.' },
      { label: 'Izhar rule', template: '⚠️ Izhar rule applies here — pronounce the noon/tanween clearly without merging, and without ghunnah.' },
      { label: 'Qalqalah', template: '⚠️ Remember to apply qalqalah (bouncing vibration) on these qalqalah letters when they have sukoon.' },
      { label: 'Madood too short', template: '⚠️ Madd is held too short — extend this madd to the proper count (2, 4, 5, or 6 beats as applicable).' },
      { label: 'Madood too long', template: '⚠️ Madd is held too long — shorten it to the proper count for this madd type.' },
      { label: 'Tasheel / Tafkheem', template: '⚠️ Watch for tafkheem (heaviness) vs. tasheel (lightness) on the letters here to apply the proper tone.' },
      { label: 'Lam shamsiyya vs. qamariyya', template: '⚠️ Please check laam shamsiyyah (sun letters) vs. laam qamariyyah (moon letters) here.' },
    ],
  },
  {
    label: 'Memorization & Fluency',
    items: [
      { label: 'Verse order mix-up', template: '⚠️ Minor mix-up in the order of verses here. Please review the sequence for this passage.' },
      { label: 'Word skipped', template: '⚠️ A word was skipped in this ayah. Please review and re-record after memorizing it carefully.' },
      { label: 'Word added', template: '⚠️ An extra word was added here not part of the ayah. Please review the exact text.' },
      { label: 'Hesitation', template: '⚠️ Long hesitation here — consider reviewing this ayah more thoroughly to achieve smoother flow.' },
      { label: 'Pace too fast', template: '⚠️ Pace is too fast in this section — slow down slightly so the tajweed rules become apparent and the meaning is absorbed.' },
      { label: 'Needs more revision', template: '⚠️ This section needs more memorization revision. Please revisit it daily for the next few days.' },
    ],
  },
  {
    label: 'Encouragements',
    items: [
      { label: 'Keep going', template: '💪 Great work overall! Keep practicing daily — consistency is the key to mastery, and you are clearly on the right path.' },
      { label: 'Improvement seen', template: '📈 Clear improvement compared to previous submissions — this is exactly the kind of progress we love to see!' },
      { label: 'Next action plan', template: '🎯 Recommended plan: (1) Review the specific ayat flagged above 10x each, (2) Record the section again, (3) Compare with your reference recitation side-by-side.' },
    ],
  },
];

function AdminRecordingReviewPageInner() {
  const params = useParams();
  const router = useRouter();
  const recordingId = params.id as string;
  
  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Audio player
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Review form
  const [status, setStatus] = useState('');
  const [rating, setRating] = useState('');
  const [points, setPoints] = useState('');
  const [feedback, setFeedback] = useState('');
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [newMistake, setNewMistake] = useState({ type: '', description: '', timestamp: '' });
  
  // Comments
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadCommentsError, setLoadCommentsError] = useState<string | null>(null);
  const [savingComment, setSavingComment] = useState(false);
  const [composerTime, setComposerTime] = useState(0);
  const [composerTimeStr, setComposerTimeStr] = useState('');

  useEffect(() => {
    fetchRecording();
  }, [recordingId]);

  useEffect(() => {
    if (!recordingId) return;
    let cancelled = false;
    (async () => {
      setLoadingComments(true);
      setLoadCommentsError(null);
      try {
        const res = await fetch(`/api/admin/quran-recordings/comments?recording_id=${encodeURIComponent(recordingId)}`);
        const data = await res.json();
        if (!cancelled) {
          if (res.ok) {
            setComments(data.comments || []);
          } else {
            setLoadCommentsError(data.error || 'Could not load comments.');
            setComments([]);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setLoadCommentsError('Could not load comments.');
          setComments([]);
        }
      } finally {
        if (!cancelled) setLoadingComments(false);
      }
    })();
    return () => { cancelled = true; };
  }, [recordingId]);

  const fetchRecording = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/quran-recordings/${recordingId}`);
      const data = await response.json();
      
      if (response.ok) {
        const rec = data.recording;
        setRecording(rec);
        
        // Initialize form fields
        setStatus(rec.status);
        setRating(rec.admin_rating?.toString() || '');
        setPoints(rec.points_awarded?.toString() || '');
        setFeedback(rec.admin_feedback || '');
        if (rec.mistakes_details && Array.isArray(rec.mistakes_details)) {
          setMistakes(rec.mistakes_details);
        }
        // Fallback comments from detail payload if any (keep list deduplicated)
        if (Array.isArray(rec.comments) && rec.comments.length > 0) {
          setComments((prev) => {
            const seen = new Set(prev.map((c) => c.id));
            const extras = (rec.comments as Comment[]).filter((c) => !seen.has(c.id));
            return [...prev, ...extras].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
        }
      } else {
        if (response.status === 403) {
          setError('Admin access required.');
        } else if (response.status === 404) {
          setError('Recording not found.');
        } else {
          setError(data.error || 'Failed to load recording');
        }
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load recording');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const seekTo = (t: number) => {
    if (!audioRef.current || !isFinite(t) || t < 0) return;
    audioRef.current.pause();
    setIsPlaying(false);
    try {
      audioRef.current.currentTime = t;
      setCurrentTime(t);
    } catch (e) {
      console.warn('seek error', e);
    }
  };

  const parseMmss = (s: string): number => {
    if (!s) return 0;
    const parts = String(s).trim().split(':').map((p) => parseInt(p || '0', 10));
    if (parts.length === 1) return isNaN(parts[0]) ? 0 : parts[0];
    const [m, sec] = parts.slice(-2);
    const val = (isNaN(m) ? 0 : m) * 60 + (isNaN(sec) ? 0 : sec);
    return Math.max(0, val);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds && seconds !== 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const addMistake = () => {
    if (!newMistake.type || !newMistake.description) return;
    setMistakes([
      ...mistakes,
      {
        type: newMistake.type,
        description: newMistake.description,
        timestamp: newMistake.timestamp ? parseInt(newMistake.timestamp) : undefined,
      },
    ]);
    setNewMistake({ type: '', description: '', timestamp: '' });
  };

  const removeMistake = (index: number) => {
    setMistakes(mistakes.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);
      
      const response = await fetch(`/api/admin/quran-recordings/${recordingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: status || undefined,
          admin_rating: rating ? parseInt(rating) : undefined,
          points_awarded: points ? parseInt(points) : undefined,
          admin_feedback: feedback || undefined,
          mistakes_count: mistakes.length,
          mistakes_details: mistakes,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setRecording(data.recording);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);

        // Non-blocking notification trigger for the student
        try {
          await fetch('/api/notifications/triggers/review-saved', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recording_id: recordingId }),
          }).catch(() => null);
        } catch {
          // ignore
        }
      } else {
        setError(data.error || 'Failed to save review');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      setSavingComment(true);
      setLoadCommentsError(null);
      const response = await fetch('/api/admin/quran-recordings/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recording_id: recordingId,
          comment: newComment.trim(),
          is_admin_comment: true,
          audio_timestamp_seconds: composerTime > 0 ? composerTime : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.comment) {
          setComments((prev) =>
            [...prev, data.comment as Comment].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
          );
        } else {
          fetchRecording();
        }
        setNewComment('');
        setComposerTime(0);
        setComposerTimeStr('');
      } else {
        const d = await response.json().catch(() => ({}));
        setLoadCommentsError(d.error || 'Failed to post note.');
      }
    } catch (err) {
      console.error('Error:', err);
      setLoadCommentsError('Failed to post note.');
    } finally {
      setSavingComment(false);
    }
  };

  // Legacy alias (unused) retained for safety; remove if lint complains
  const addComment = handleAddComment;

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 border border-green-200">
            <CheckCircle className="w-4 h-4" /> Approved
          </span>
        );
      case 'needs_improvement':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700 border border-amber-200">
            <AlertCircle className="w-4 h-4" /> Needs Improvement
          </span>
        );
      case 'reviewing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 border border-blue-200">
            <Hourglass className="w-4 h-4" /> Under Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Hourglass className="w-4 h-4" /> Pending Review
          </span>
        );
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Error</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <Link
            href="/admin/quran-recordings"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Recordings
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !recording) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Loading recording...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/quran-recordings"
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-3"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to All Recordings
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Mic className="w-7 h-7 text-emerald-600" />
                Review Recording
              </h1>
              <p className="mt-1 text-slate-600">
                Listen, evaluate, and provide feedback to the student
              </p>
            </div>
            {getStatusBadge(recording.status)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Player and Review Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Audio Player Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Audio Player</h2>
              
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100">
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={handlePlayPause}
                    className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center transition-colors shadow-lg"
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8 text-white" />
                    ) : (
                      <Play className="w-8 h-8 text-white ml-1" />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                      <span className="font-mono">{formatDuration(currentTime)}</span>
                      <span className="font-mono">{formatDuration(recording.duration_seconds)}</span>
                    </div>
                    <div className="w-full bg-white/80 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all"
                        style={{ width: `${recording.duration_seconds ? (currentTime / recording.duration_seconds) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
                <audio
                  ref={audioRef}
                  src={recording.audio_url}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  className="w-full mt-4"
                  controls
                />
                <div className="mt-4 text-sm text-slate-600">
                  Current timestamp: <span className="font-mono font-semibold text-emerald-700">{formatDuration(currentTime)}</span>
                </div>
              </div>
            </div>

            {/* Review Form */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                Review Evaluation
              </h2>

              <div className="space-y-5">
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Status
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { value: 'pending', label: 'Pending', icon: Hourglass, color: 'slate' },
                      { value: 'reviewing', label: 'Reviewing', icon: Hourglass, color: 'blue' },
                      { value: 'approved', label: 'Approved', icon: CheckCircle, color: 'green' },
                      { value: 'needs_improvement', label: 'Needs Improvement', icon: AlertCircle, color: 'amber' },
                    ].map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = status === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setStatus(opt.value)}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                            isSelected
                              ? opt.color === 'green'
                                ? 'bg-green-100 text-green-700 border-green-300'
                                : opt.color === 'amber'
                                  ? 'bg-amber-100 text-amber-700 border-amber-300'
                                  : opt.color === 'blue'
                                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      Rating (1-10)
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n.toString())}
                        className={`w-10 h-10 rounded-lg font-semibold transition-colors ${
                          rating === n.toString()
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Points */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Points Awarded
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    placeholder="Enter points (e.g., 50)"
                    className="w-full sm:w-48 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                {/* Mistakes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Mistakes / Corrections
                    </span>
                  </label>
                  
                  {mistakes.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {mistakes.map((m, i) => (
                        <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs font-semibold rounded">
                                {m.type}
                              </span>
                              {m.timestamp !== undefined && (
                                <span className="text-xs text-amber-600 font-mono">
                                  @ {formatDuration(m.timestamp)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-700">{m.description}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMistake(i)}
                            className="p-1 text-amber-600 hover:text-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <select
                      value={newMistake.type}
                      onChange={(e) => setNewMistake({ ...newMistake, type: e.target.value })}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm sm:col-span-1"
                    >
                      <option value="">Type</option>
                      <option value="Tajweed">Tajweed</option>
                      <option value="Makhraj">Makhraj</option>
                      <option value="Ghunnah">Ghunnah</option>
                      <option value="Madood">Madood</option>
                      <option value="Qalqalah">Qalqalah</option>
                      <option value="Pronunciation">Pronunciation</option>
                      <option value="Tarteel">Tarteel (Tempo)</option>
                      <option value="Memorization">Memorization</option>
                      <option value="Other">Other</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Description (e.g., missed ghunnah on noon sakinah)"
                      value={newMistake.description}
                      onChange={(e) => setNewMistake({ ...newMistake, description: e.target.value })}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm sm:col-span-2"
                    />
                    <input
                      type="text"
                      placeholder="Time (sec)"
                      value={newMistake.timestamp}
                      onChange={(e) => setNewMistake({ ...newMistake, timestamp: e.target.value })}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm sm:col-span-1"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addMistake}
                    className="mt-2 text-sm text-emerald-700 hover:text-emerald-800 font-medium inline-flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Mistake
                  </button>
                </div>

                {/* Quick Feedback Templates */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quick Feedback Templates (Click to insert)
                  </label>
                  <div className="space-y-3">
                    {FEEDBACK_TEMPLATES.map((group) => (
                      <div key={group.label}>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{group.label}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.items.map((tpl, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setFeedback((prev) => {
                                  const sep = prev && !prev.endsWith('\n') ? '\n\n' : '';
                                  return `${prev || ''}${sep}${tpl.template}`;
                                });
                              }}
                              className="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 bg-slate-50 text-slate-600 border-slate-200"
                              title={tpl.template}
                            >
                              {tpl.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feedback */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Written Feedback
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={6}
                    placeholder="Provide detailed feedback to the student. Mention strengths and areas for improvement..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                  />
                </div>

                {/* Messages */}
                {saveSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-green-700">Review saved successfully!</p>
                  </div>
                )}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-red-700">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSubmitReview}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <ThumbsUp className="w-5 h-5" />
                        Save Review
                      </>
                    )}
                  </button>
                  <p className="text-xs text-slate-500">
                    Saving triggers an automated notification to the student.
                  </p>
                </div>
              </div>
            </div>

            {/* Timestamped Comments Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                Timestamped Notes / Comments
                <span className="ml-auto text-xs text-slate-500 font-normal">
                  Pause the player, then drop a note at any time — student can click to jump there.
                </span>
              </h2>

              {loadCommentsError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">{loadCommentsError}</div>
              )}

              {/* Composer */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-5">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setComposerTime(currentTime)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold hover:bg-emerald-200"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Use Current: {formatDuration(currentTime)}
                  </button>
                  <div className="inline-flex items-center gap-1">
                    <label className="text-xs text-slate-500">Custom (mm:ss)</label>
                    <input
                      type="text"
                      value={composerTimeStr}
                      onChange={(e) => {
                        setComposerTimeStr(e.target.value);
                        setComposerTime(parseMmss(e.target.value));
                      }}
                      placeholder="01:23"
                      className="w-20 px-2 py-1 text-xs rounded-md border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono"
                    />
                  </div>
                  {composerTime > 0 && (
                    <button
                      type="button"
                      onClick={() => seekTo(composerTime)}
                      className="text-xs px-2.5 py-1 rounded-full text-slate-600 bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
                    >
                      ▶ Jump to stamp
                    </button>
                  )}
                </div>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  placeholder="Write a note at this timestamp. Use 'Use Current' to capture the playback time. Tip: click a chip in templates above to auto-populate."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none text-sm bg-white"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {FEEDBACK_TEMPLATES.flatMap(g => g.items).slice(0, 10).map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setNewComment(tpl.template)}
                        className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                        title={tpl.template}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddComment}
                    disabled={savingComment || !newComment.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {savingComment ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Posting…
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Post Note
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Feed */}
              {loadingComments ? (
                <div className="text-sm text-slate-500 py-6 text-center">Loading comments…</div>
              ) : comments.length === 0 ? (
                <div className="text-sm text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-xl">
                  No notes yet. Leave timestamped feedback to help the student improve.
                </div>
              ) : (
                <ul className="space-y-3">
                  {comments.map((c) => (
                    <li
                      key={c.id}
                      className="group relative bg-gradient-to-br from-white to-slate-50/60 rounded-xl border border-slate-200 p-4 hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {c.audio_timestamp_seconds !== undefined && c.audio_timestamp_seconds !== null ? (
                          <button
                            type="button"
                            onClick={() => seekTo(c.audio_timestamp_seconds as number)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono font-semibold hover:bg-emerald-200"
                            title="Click to jump to this moment in the recording"
                          >
                            ▶ {formatDuration(c.audio_timestamp_seconds as number)}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-mono font-semibold">
                            📌 General
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {c.user?.email || 'Instructor'} • {new Date(c.created_at).toLocaleString()}
                        </span>
                        {c.is_admin_comment && (
                          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 font-semibold uppercase tracking-wide">
                            Instructor
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{c.comment}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right Column - Info and Comments */}
          <div className="space-y-6">
            {/* Student Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Student Information</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <User className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {recording.user?.raw_user_meta_data?.name || 'Unknown'}
                  </p>
                  <p className="text-sm text-slate-600">{recording.user?.email}</p>
                </div>
              </div>
            </div>

            {/* Recording Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Recording Details</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-slate-500">Title</p>
                  <p className="font-medium text-slate-900">{recording.title}</p>
                </div>
                {recording.description && (
                  <div>
                    <p className="text-slate-500">Notes</p>
                    <p className="text-slate-700">{recording.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {recording.surah_from && (
                    <div>
                      <p className="text-slate-500">From Surah</p>
                      <p className="font-medium text-slate-900">
                        {recording.surah_from}{recording.ayah_from ? `:${recording.ayah_from}` : ''}
                      </p>
                    </div>
                  )}
                  {recording.surah_to && (
                    <div>
                      <p className="text-slate-500">To Surah</p>
                      <p className="font-medium text-slate-900">
                        {recording.surah_to}{recording.ayah_to ? `:${recording.ayah_to}` : ''}
                      </p>
                    </div>
                  )}
                  {recording.juz && (
                    <div>
                      <p className="text-slate-500">Juz</p>
                      <p className="font-medium text-slate-900">{recording.juz}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-500">Duration</p>
                    <p className="font-medium text-slate-900 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDuration(recording.duration_seconds)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-500">Submitted</p>
                  <p className="text-slate-700">
                    {new Date(recording.created_at).toLocaleString()}
                  </p>
                </div>
                {recording.reviewed_at && (
                  <div>
                    <p className="text-slate-500">Last Reviewed</p>
                    <p className="text-slate-700">
                      {new Date(recording.reviewed_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Review Summary */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl p-6 text-white">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5" />
                Review Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="opacity-80">Current Rating</span>
                  <span className="font-bold text-lg">
                    {recording.admin_rating ? (
                      <span className="flex items-center gap-1">
                        {recording.admin_rating}
                        <Star className="w-5 h-5 fill-amber-300 text-amber-300" />
                      </span>
                    ) : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="opacity-80">Points Awarded</span>
                  <span className="font-bold text-lg">
                    {recording.points_awarded !== undefined ? `+${recording.points_awarded}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="opacity-80">Mistakes Noted</span>
                  <span className="font-bold text-lg">
                    {recording.mistakes_count ?? 0}
                  </span>
                </div>
                <div className="h-px bg-white/20 my-2"></div>
                <p className="text-sm opacity-80 italic">
                  Remember to click "Save Review" after making changes!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminRecordingReviewPage() {
  return (
    <AdminGateClient title="Speechhelp — Recording Review (Admin)">
      <AdminRecordingReviewPageInner />
    </AdminGateClient>
  );
}
