'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { normalizeArabic } from '@/utils/arabic';

type Props = {
    ayahs: any[];
    onAyahFound: (verseKey: string) => void;
};

// Add Web Speech API types
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export default function VoiceSearch({ ayahs, onAyahFound }: Props) {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    const handleSearch = (text: string) => {
        const normalizedInput = normalizeArabic(text);
        console.log('Searching for:', normalizedInput);

        // Try matching against Imlaei Simple script first (better for search)
        let found = ayahs.find(ayah => {
            if (!ayah.text_imlaei_simple) return false;
            const normalizedAyah = normalizeArabic(ayah.text_imlaei_simple);
            return normalizedAyah.includes(normalizedInput);
        });

        // Fallback to Uthmani script if not found
        if (!found) {
            found = ayahs.find(ayah => {
                const normalizedAyah = normalizeArabic(ayah.text_uthmani);
                return normalizedAyah.includes(normalizedInput);
            });
        }

        if (found) {
            console.log('Found ayah:', found.verse_key);
            onAyahFound(found.verse_key);
            setTranscript(`Found: Ayah ${found.verse_key.split(':')[1]}`);
        } else {
            setError('Ayah not found in this Juz.');
        }
    };

    const startRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('Voice search not supported in this browser.');
            return;
        }

        // Always create a new instance to avoid stale state
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'ar-SA';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
            setTranscript('');
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            if (event.error === 'not-allowed') {
                setError('Microphone access denied. Please allow permission.');
            } else if (event.error === 'no-speech') {
                setError('No speech detected. Please try again.');
            } else if (event.error === 'network') {
                setError('Network error. Check your connection or try Chrome/Edge.');
            } else if (event.error === 'aborted') {
                setError(null);
            } else {
                setError(`Voice search failed: ${event.error}`);
            }
            setIsListening(false);
        };

        recognition.onresult = (event: any) => {
            const result = event.results[0][0].transcript;
            setTranscript(result);
            handleSearch(result);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const toggleListening = async () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setError('You appear to be offline. Internet is required for voice search.');
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            setError(null);
            
            try {
                // Request permission first
                await navigator.mediaDevices.getUserMedia({ audio: true });
                
                // Stop any previous instance
                if (recognitionRef.current) {
                    recognitionRef.current.abort();
                }

                // Start fresh
                setTimeout(startRecognition, 100);
            } catch (err) {
                console.error("Microphone permission error:", err);
                setError("Microphone access denied. Please allow permission.");
            }
        }
    };

    if (error === 'Voice search not supported in this browser.') {
        return null;
    }

    return (
        <div className="flex flex-col items-center gap-2">
            <button
                onClick={toggleListening}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all ${
                    isListening 
                        ? 'bg-red-100 text-red-600 animate-pulse border border-red-200' 
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200'
                }`}
                title="Tap to recite an Ayah"
            >
                {isListening ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Listening...
                    </>
                ) : (
                    <>
                        <Mic className="w-4 h-4" />
                        Voice Search
                    </>
                )}
            </button>
            
            {/* Feedback / Transcript */}
            {(transcript || error) && (
                <div className="text-xs text-center max-w-xs">
                    {transcript && <p className="text-slate-600 font-arabic mb-1">"{transcript}"</p>}
                    {error && <p className="text-red-500 font-medium">{error}</p>}
                </div>
            )}
        </div>
    );
}
