import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

interface UseVoiceSearchProps {
    onResult: (text: string, isFinal: boolean) => void;
    lang?: string;
    onStart?: () => void;
    onError?: (error: string) => void;
}

export function useVoiceSearch({ onResult, lang = 'en-US', onStart, onError }: UseVoiceSearchProps) {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const retryCountRef = useRef(0);
    const isNative = Capacitor.isNativePlatform();

    useEffect(() => {
        if (!isNative && typeof window !== 'undefined') {
            const hasSupport = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
            setIsSupported(hasSupport);
        } else if (isNative) {
            // Assume native support via plugin, or check permission status if needed
            setIsSupported(true);
        }
    }, [isNative]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (isNative) {
                SpeechRecognition.stop();
            } else {
                recognitionRef.current?.abort();
            }
        };
    }, [isNative]);

    const startListening = useCallback(async () => {
        if (isListening) return;

        retryCountRef.current = 0; // Reset retry count
        if (onStart) onStart();

        if (isNative) {
            try {
                const { speechRecognition } = await SpeechRecognition.requestPermissions();
                if (speechRecognition !== 'granted') throw new Error('Permission denied');
                
                setIsListening(true);
                const { matches } = await SpeechRecognition.start({
                    language: lang,
                    maxResults: 1,
                    prompt: 'Speak now...',
                    partialResults: false,
                    popup: false,
                });
                
                if (matches && matches.length > 0) {
                    onResult(matches[0], true);
                }
                setIsListening(false);
            } catch (e) {
                if (onError) onError((e as Error).message || 'Voice error');
                setIsListening(false);
            }
        } else {
            // Check for Secure Context (HTTPS or localhost)
            // Note: localhost is considered secure context by browsers, but some setups might flag it incorrectly.
            // We can add a more explicit check for localhost if needed, but window.isSecureContext should cover it.
            // If the user is getting "Network error" on localhost, it might be a browser quirk with the Speech API.
            // However, the error handling below specifically catches 'network' errors which can be misleading.
            
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

            if (!isLocalhost && window.isSecureContext === false) {
                if (onError) onError('Voice search requires HTTPS or localhost. Please use a secure connection.');
                return;
            }

            const WebSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!WebSpeechRecognition) {
                if (onError) onError('Voice search not supported in this browser');
                return;
            }

            const recognition = new WebSpeechRecognition();
            recognition.lang = lang;
            recognition.continuous = false;
            recognition.interimResults = true;
            
            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
                // Retry logic for network errors (common in Web Speech API)
                if (e.error === 'network' && retryCountRef.current < 2) {
                    retryCountRef.current++;
                    console.warn(`Voice network error, retrying (${retryCountRef.current}/2)...`);
                    setTimeout(() => {
                        try {
                            recognition.start();
                        } catch (err) {
                            // Already started or other error, just stop
                            setIsListening(false);
                        }
                    }, 500 * retryCountRef.current);
                    return;
                }

                setIsListening(false);
                let msg = e.error || 'Voice error';
                
                // On localhost, 'network' errors from Speech API are often misleading permissions/config issues
                // rather than actual network problems.
                if (e.error === 'network') {
                     msg = 'Voice service unavailable. Check connection or mic permissions.';
                } else if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                     msg = 'Microphone permission denied. Please allow access in settings.';
                } else if (e.error === 'no-speech') {
                     msg = 'No speech detected. Please try again.';
                } else if (e.error === 'audio-capture') {
                     msg = 'No microphone found.';
                } else if (e.error === 'aborted') {
                    return; // Ignore aborted
                }
                
                if (onError) onError(msg);
            };
            recognition.onresult = (e: SpeechRecognitionEvent) => {
                const result = e.results[e.resultIndex];
                const text = result[0].transcript;
                const isFinal = result.isFinal;
                onResult(text, isFinal);
            };

            recognitionRef.current = recognition;
            recognition.start();
        }
    }, [isListening, isNative, lang, onResult, onStart, onError]);

    const stopListening = useCallback(async () => {
        if (isNative) {
            await SpeechRecognition.stop();
        } else {
            recognitionRef.current?.abort();
        }
        setIsListening(false);
    }, [isNative]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    return {
        isListening,
        isSupported,
        toggleListening,
        startListening,
        stopListening
    };
}
