import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

type Options = {
  enabled: boolean;
  lang?: string;
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
};

/** Continuous Arabic speech recognition for live recitation checking. */
export function useRecitationListen({
  enabled,
  lang = 'ar-SA',
  onTranscript,
  onError,
}: Options) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const enabledRef = useRef(enabled);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const isNative = Capacitor.isNativePlatform();

  enabledRef.current = enabled;
  onTranscriptRef.current = onTranscript;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!isNative && typeof window !== 'undefined') {
      setIsSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
    } else if (isNative) {
      setIsSupported(true);
    }
  }, [isNative]);

  const stopWeb = useCallback(() => {
    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const startWeb = useCallback(() => {
    const WebSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!WebSpeechRecognition) {
      onErrorRef.current?.('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new WebSpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      if (enabledRef.current) {
        setTimeout(() => {
          if (!enabledRef.current) return;
          try {
            recognition.start();
          } catch {
            /* already started */
          }
        }, 200);
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === 'aborted' || e.error === 'no-speech') return;
      if (e.error === 'network') {
        onErrorRef.current?.('Voice service unavailable. Check microphone permissions.');
        return;
      }
      if (e.error === 'not-allowed') {
        onErrorRef.current?.('Microphone permission denied.');
        return;
      }
      onErrorRef.current?.(e.error || 'Voice error');
    };

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const result = e.results[e.resultIndex];
      const text = result[0]?.transcript ?? '';
      if (text) onTranscriptRef.current(text, result.isFinal);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      onErrorRef.current?.('Could not start microphone');
    }
  }, [lang]);

  const startNative = useCallback(async () => {
    try {
      const { speechRecognition } = await SpeechRecognition.requestPermissions();
      if (speechRecognition !== 'granted') throw new Error('Microphone permission denied');
      setIsListening(true);

      const loop = async () => {
        while (enabledRef.current) {
          const { matches } = await SpeechRecognition.start({
            language: lang,
            maxResults: 1,
            partialResults: true,
            popup: false,
          });
          if (matches?.[0]) onTranscriptRef.current(matches[0], true);
          if (!enabledRef.current) break;
        }
        setIsListening(false);
      };
      void loop();
    } catch (e) {
      onErrorRef.current?.((e as Error).message || 'Voice error');
      setIsListening(false);
    }
  }, [lang]);

  useEffect(() => {
    if (!enabled) {
      if (isNative) {
        void SpeechRecognition.stop();
      } else {
        stopWeb();
      }
      return;
    }

    if (isNative) {
      void startNative();
    } else {
      startWeb();
    }

    return () => {
      if (isNative) {
        void SpeechRecognition.stop();
      } else {
        stopWeb();
      }
    };
  }, [enabled, isNative, startNative, startWeb, stopWeb]);

  return { isListening, isSupported };
}
