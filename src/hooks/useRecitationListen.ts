import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  getWebSpeechRecognitionCtor,
  hasWebSpeechRecognition,
  isSpeechRecognitionContextOk,
  requestMicrophoneAccess,
} from '@/lib/webSpeechSupport';

type Options = {
  enabled: boolean;
  lang?: string;
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
};

/** Continuous Arabic speech recognition for live recitation checking (native app + web browsers). */
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
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const networkRetryRef = useRef(0);
  const isNative = Capacitor.isNativePlatform();

  enabledRef.current = enabled;
  onTranscriptRef.current = onTranscript;
  onErrorRef.current = onError;

  useEffect(() => {
    if (isNative) {
      setIsSupported(true);
      return;
    }
    setIsSupported(hasWebSpeechRecognition() && isSpeechRecognitionContextOk());
  }, [isNative]);

  const stopWeb = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    networkRetryRef.current = 0;
    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const startWebRef = useRef<() => void>(() => {});

  startWebRef.current = () => {
    void (async () => {
      const WebSpeechRecognition = getWebSpeechRecognitionCtor();
      if (!WebSpeechRecognition) {
        onErrorRef.current?.('Speech recognition not supported in this browser.');
        return;
      }

      if (!isSpeechRecognitionContextOk()) {
        onErrorRef.current?.('Mistake check needs HTTPS. Open the site in Chrome, Edge, or Safari.');
        return;
      }

      const micOk = await requestMicrophoneAccess();
      if (!micOk) {
        onErrorRef.current?.('Microphone permission denied. Allow mic access in browser settings.');
        return;
      }

      stopWeb();
      const recognition = new WebSpeechRecognition();
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        networkRetryRef.current = 0;
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
        if (enabledRef.current) {
          restartTimerRef.current = setTimeout(() => {
            if (enabledRef.current) startWebRef.current();
          }, 300);
        }
      };

      recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
        if (e.error === 'aborted' || e.error === 'no-speech') return;

        if (e.error === 'network' && networkRetryRef.current < 2 && enabledRef.current) {
          networkRetryRef.current += 1;
          restartTimerRef.current = setTimeout(() => {
            if (enabledRef.current) startWebRef.current();
          }, 500 * networkRetryRef.current);
          return;
        }

        if (e.error === 'network') {
          onErrorRef.current?.('Voice service unavailable. Check connection and mic permissions.');
          return;
        }
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          onErrorRef.current?.('Microphone permission denied.');
          return;
        }
        if (e.error === 'audio-capture') {
          onErrorRef.current?.('No microphone found.');
          return;
        }
        onErrorRef.current?.(e.error || 'Voice error');
      };

      recognition.onresult = (e: SpeechRecognitionEvent) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const result = e.results[i];
          const text = result[0]?.transcript?.trim() ?? '';
          if (!text) continue;
          if (result.isFinal) {
            onTranscriptRef.current(text, true);
          } else {
            interim += (interim ? ' ' : '') + text;
          }
        }
        if (interim) onTranscriptRef.current(interim, false);
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        onErrorRef.current?.('Could not start microphone — allow mic access and retry.');
      }
    })();
  };

  const startNative = useCallback(async () => {
    try {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
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
        void import('@capacitor-community/speech-recognition').then(({ SpeechRecognition }) =>
          SpeechRecognition.stop()
        );
      } else {
        stopWeb();
      }
      return;
    }

    if (isNative) {
      void startNative();
    } else {
      startWebRef.current();
    }

    return () => {
      if (isNative) {
        void import('@capacitor-community/speech-recognition').then(({ SpeechRecognition }) =>
          SpeechRecognition.stop()
        );
      } else {
        stopWeb();
      }
    };
  }, [enabled, isNative, startNative, stopWeb]);

  return { isListening, isSupported };
}
