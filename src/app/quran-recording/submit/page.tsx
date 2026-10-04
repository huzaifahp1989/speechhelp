'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Mic, 
  Square, 
  Play, 
  Pause,
  Upload,
  ChevronLeft,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

const SURAHS = [
  { number: 1, name: 'Al-Fatiha', arabic: 'الفاتحة' },
  { number: 2, name: 'Al-Baqarah', arabic: 'البقرة' },
  { number: 3, name: "Al-Imran", arabic: 'آل عمران' },
  { number: 36, name: 'Ya-Sin', arabic: 'يس' },
  { number: 55, name: 'Ar-Rahman', arabic: 'الرحمن' },
  { number: 56, name: 'Al-Waqiah', arabic: 'الواقعة' },
  { number: 67, name: 'Al-Mulk', arabic: 'الملك' },
  { number: 78, name: 'An-Naba', arabic: 'النبأ' },
  { number: 112, name: 'Al-Ikhlas', arabic: 'الإخلاص' },
  { number: 113, name: 'Al-Falaq', arabic: 'الفلق' },
  { number: 114, name: 'An-Nas', arabic: 'الناس' },
];

export default function SubmitRecordingPage() {
  const router = useRouter();
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [surahFrom, setSurahFrom] = useState('');
  const [ayahFrom, setAyahFrom] = useState('');
  const [surahTo, setSurahTo] = useState('');
  const [ayahTo, setAyahTo] = useState('');
  const [description, setDescription] = useState('');
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Could not access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioBlob(file);
      setAudioUrl(url);
      setRecordingTime(0);
    }
  };
  
  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!audioBlob) {
      setError('Please record or upload an audio file');
      return;
    }
    
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      
      const uploadResponse = await fetch('/api/quran-recordings/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload audio');
      }
      
      const uploadData = await uploadResponse.json();
      
      const recordingResponse = await fetch('/api/quran-recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          surah_from: surahFrom ? parseInt(surahFrom) : undefined,
          ayah_from: ayahFrom ? parseInt(ayahFrom) : undefined,
          surah_to: surahTo ? parseInt(surahTo) : undefined,
          ayah_to: ayahTo ? parseInt(ayahTo) : undefined,
          audio_url: uploadData.publicUrl,
          audio_path: uploadData.filePath,
          duration_seconds: recordingTime,
          file_size_bytes: audioBlob.size,
        }),
      });
      
      if (!recordingResponse.ok) {
        const errorData = await recordingResponse.json();
        throw new Error(errorData.error || 'Failed to save recording');
      }
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/quran-recording');
      }, 1500);
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to submit recording');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link
            href="/quran-recording"
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Recordings
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Submit New Recording
          </h1>
          <p className="mt-2 text-slate-600">
            Record your Quran recitation and submit it for review
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Surah Al-Fatiha Practice"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  From Surah
                </label>
                <select
                  value={surahFrom}
                  onChange={(e) => setSurahFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Select...</option>
                  {SURAHS.map(s => (
                    <option key={s.number} value={s.number}>
                      {s.number}. {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  To Surah (Optional)
                </label>
                <select
                  value={surahTo}
                  onChange={(e) => setSurahTo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Same as From</option>
                  {SURAHS.map(s => (
                    <option key={s.number} value={s.number}>
                      {s.number}. {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Any notes about your recitation, areas you'd like feedback on..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Audio Recording <span className="text-red-500">*</span>
              </label>
              
              {!audioBlob ? (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mic className="w-8 h-8 text-emerald-600" />
                  </div>
                  
                  {isRecording ? (
                    <div>
                      <div className="text-3xl font-mono font-bold text-red-600 mb-2">
                        {formatTime(recordingTime)}
                      </div>
                      <p className="text-slate-600 mb-4">Recording in progress...</p>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Square className="w-5 h-5" />
                        Stop Recording
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-slate-600 mb-4">
                        Record your Quran recitation directly or upload an audio file
                      </p>
                      <div className="flex flex-wrap justify-center gap-3">
                        <button
                          type="button"
                          onClick={startRecording}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          <Mic className="w-5 h-5" />
                          Start Recording
                        </button>
                        <label className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors cursor-pointer">
                          <Upload className="w-5 h-5" />
                          Upload File
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Audio recorded</p>
                        <p className="text-sm text-slate-600">
                          {formatTime(recordingTime)} • Ready to submit
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={togglePlayback}
                        className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 text-slate-700" />
                        ) : (
                          <Play className="w-5 h-5 text-slate-700" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={resetRecording}
                        className="p-2 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
                      >
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      </button>
                    </div>
                  </div>
                  {audioUrl && (
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onEnded={() => setIsPlaying(false)}
                      className="hidden"
                    />
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-green-700 font-medium">Recording submitted successfully!</p>
                <p className="text-green-600 text-sm mt-1">Redirecting to your recordings...</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-200">
              <Link
                href="/quran-recording"
                className="px-4 py-2 text-slate-600 font-medium hover:text-slate-900 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={!audioBlob || isUploading || success}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Submit Recording
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
