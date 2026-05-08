
'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { STORIES } from '@/data/stories';
import { 
    Play, Pause, Mic, ArrowLeft, 
    Volume2, Upload, CheckCircle 
} from 'lucide-react';

export default function StoryDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;

    const story = STORIES.find(s => s.id === id);

    // Audio Player State
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Recorder State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    useEffect(() => {
        if (!story) {
            // If story not found, could redirect or show 404
             // router.push('/stories'); // simplistic handling
        }
    }, [story, router]);

    if (!story) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-800">Story not found</h2>
                    <Link href="/stories" className="text-emerald-600 hover:underline mt-4 block">
                        Back to Stories
                    </Link>
                </div>
            </div>
        );
    }

    // --- Audio Player Logic ---
    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    // --- Recorder Logic ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setRecordedUrl(url);
                chunksRef.current = [];
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Could not access microphone. Please allow permission.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            // Stop all tracks to release microphone
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const resetRecording = () => {
        setAudioBlob(null);
        setRecordedUrl(null);
        setUploadSuccess(false);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // --- Upload Logic ---
    const handleUpload = async () => {
        if (!audioBlob) return;
        
        setIsUploading(true);

        // TODO: Replace with actual Supabase upload logic
        // 1. Upload Blob to Supabase Storage bucket 'story-recordings'
        // 2. Insert record into 'story_recordings' table (user_id, story_id, url, status='pending')
        
        // Mocking upload delay
        setTimeout(() => {
            setIsUploading(false);
            setUploadSuccess(true);
            alert('Recording saved! It will be reviewed by an admin shortly.');
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                
                {/* Back Button */}
                <Link href="/stories" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Stories
                </Link>

                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                    
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-10 text-white relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl" />
                         <div className="relative z-10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold mb-3 backdrop-blur-sm">
                                        {story.category}
                                    </span>
                                    <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{story.title}</h1>
                                    <p className="text-emerald-50 opacity-90 text-sm md:text-base max-w-2xl">
                                        {story.summary}
                                    </p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center gap-2 min-w-[120px]">
                                    <span className="text-xs font-medium uppercase tracking-wider opacity-75">Duration</span>
                                    <span className="text-2xl font-bold">{story.duration}</span>
                                </div>
                            </div>
                         </div>
                    </div>

                    <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
                        
                        {/* Main Content (Left Column) */}
                        <div className="lg:col-span-2 space-y-8">
                            
                            {/* Audio Player (Narrator) */}
                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex items-center gap-4">
                                <button 
                                    onClick={togglePlay}
                                    className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg hover:bg-emerald-700 transition-all hover:scale-105 active:scale-95"
                                >
                                    {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current pl-1" />}
                                </button>
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-slate-900 mb-1">Listen to Narration</h3>
                                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                        <div className="bg-emerald-500 h-full w-1/3 animate-pulse" /> {/* Mock progress */}
                                    </div>
                                </div>
                                {/* Hidden Audio Element */}
                                <audio ref={audioRef} src={story.audioUrl} onEnded={() => setIsPlaying(false)} />
                            </div>

                            {/* Story Text */}
                            <div className="prose prose-lg prose-slate max-w-none">
                                {story.content.split('\n\n').map((paragraph, idx) => (
                                    <p key={idx} className="text-slate-700 leading-relaxed mb-6">
                                        {paragraph}
                                    </p>
                                ))}
                            </div>

                            {/* Source */}
                            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-xl">
                                <h4 className="font-bold text-amber-900 text-sm uppercase tracking-wide mb-1">Authentic Source</h4>
                                <p className="text-amber-800 text-sm italic">{story.source}</p>
                            </div>

                        </div>

                        {/* Sidebar (Right Column) - Recorder & Community */}
                        <div className="space-y-8">
                            
                            {/* Recorder Widget */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden sticky top-24">
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                        <Mic className="w-5 h-5 text-rose-500" />
                                        Record Your Voice
                                    </h3>
                                </div>
                                
                                <div className="p-6 flex flex-col items-center gap-6 text-center">
                                    {!recordedUrl ? (
                                        <>
                                            <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                                                isRecording ? 'border-rose-200 bg-rose-50 animate-pulse' : 'border-slate-100 bg-slate-50'
                                            }`}>
                                                {isRecording ? (
                                                    <div className="flex gap-1 h-8 items-end">
                                                        <div className="w-1 bg-rose-500 animate-[bounce_1s_infinite] h-4" />
                                                        <div className="w-1 bg-rose-500 animate-[bounce_1.2s_infinite] h-8" />
                                                        <div className="w-1 bg-rose-500 animate-[bounce_0.8s_infinite] h-6" />
                                                    </div>
                                                ) : (
                                                    <Mic className="w-10 h-10 text-slate-400" />
                                                )}
                                            </div>

                                            {isRecording && (
                                                <div className="text-2xl font-mono font-bold text-rose-600">
                                                    {formatTime(recordingTime)}
                                                </div>
                                            )}

                                            <button
                                                onClick={isRecording ? stopRecording : startRecording}
                                                className={`w-full py-3 rounded-xl font-bold text-white transition-all shadow-md active:scale-95 ${
                                                    isRecording 
                                                    ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' 
                                                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                                                }`}
                                            >
                                                {isRecording ? 'Stop Recording' : 'Start Recording'}
                                            </button>
                                            
                                            <p className="text-xs text-slate-500 px-4">
                                                Practice reading the story out loud! Your recording can be shared with others after approval.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            {/* Preview & Save */}
                                            <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-200">
                                                <audio src={recordedUrl} controls className="w-full mb-4" />
                                                
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={resetRecording}
                                                        className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-600 font-semibold hover:bg-slate-100 text-sm"
                                                    >
                                                        Record Again
                                                    </button>
                                                    <button 
                                                        onClick={handleUpload}
                                                        disabled={isUploading || uploadSuccess}
                                                        className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                    >
                                                        {isUploading ? (
                                                            'Saving...'
                                                        ) : uploadSuccess ? (
                                                            <>
                                                                <CheckCircle className="w-4 h-4" /> Saved
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload className="w-4 h-4" /> Save
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            {uploadSuccess && (
                                                <div className="bg-green-50 text-green-700 text-xs p-3 rounded-lg w-full">
                                                    Your recording has been sent for approval!
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Community / Listen to Others (Placeholder) */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-6">
                                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Volume2 className="w-5 h-5 text-blue-500" />
                                    Kids' Narrations
                                </h3>
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                {['A', 'Z', 'Y'][i-1]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">
                                                    {['Ahmed', 'Zainab', 'Yusuf'][i-1]} (Age {7+i})
                                                </p>
                                                <p className="text-xs text-slate-500">2 days ago</p>
                                            </div>
                                            <Play className="w-4 h-4 text-slate-400" />
                                        </div>
                                    ))}
                                </div>
                                <button className="w-full mt-4 text-sm text-blue-600 font-medium hover:underline">
                                    View All Recordings
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
