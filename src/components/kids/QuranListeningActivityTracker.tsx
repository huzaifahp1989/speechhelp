'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

type ListeningMode = 'surah' | 'juz' | 'quran';

type Props = {
  audioRef: RefObject<HTMLAudioElement | null>;
  childProfileId: string | null;
  mode: ListeningMode;
  surahNumber: number | null;
  juzNumber: number | null;
  ayahStart: number | null;
  ayahEnd: number | null;
  reciterId: string;
  reciterName: string;
  trackIdentity: string;
  completeJuzOnEnded: boolean;
};

type ActiveSession = {
  id: string;
  identity: string;
};

async function sendSessionRequest(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch('/api/quran-listening', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result: unknown = await response.json();
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('The listening service returned an invalid response.');
  }
  const record = result as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(typeof record.error === 'string' ? record.error : 'Listening progress could not be saved.');
  }
  return record;
}

export default function QuranListeningActivityTracker(props: Props) {
  const latest = useRef(props);
  const session = useRef<ActiveSession | null>(null);
  const [status, setStatus] = useState('');
  const operation = useRef(Promise.resolve());

  useEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    const audio = props.audioRef.current;
    if (!audio) return;

    const queue = (action: () => Promise<void>) => {
      operation.current = operation.current
        .catch((error: unknown) => {
          console.error('Previous Quran listening update failed.', error);
        })
        .then(action)
        .catch((error: unknown) => {
          console.error('Quran listening activity could not be saved.', error);
          setStatus(error instanceof Error ? error.message : 'Listening points could not be saved.');
        });
    };

    const heartbeat = async (isPlaying: boolean) => {
      const activeSession = session.current;
      if (!activeSession) return;
      await sendSessionRequest({
        action: 'heartbeat',
        sessionId: activeSession.id,
        isPlaying,
      });
      setStatus(isPlaying ? 'Listening activity is being recorded.' : 'Listening paused.');
    };

    const endSession = async (completion?: 'surah' | 'juz') => {
      const activeSession = session.current;
      if (!activeSession) return;
      try {
        await sendSessionRequest({
          action: 'heartbeat',
          sessionId: activeSession.id,
          isPlaying: false,
        });
        await sendSessionRequest({ action: 'end', sessionId: activeSession.id });
      } catch (error) {
        session.current = activeSession;
        throw error;
      }
      session.current = null;
      if (completion) {
        await sendSessionRequest({
          action: completion === 'surah' ? 'completeSurah' : 'completeJuz',
          sessionId: activeSession.id,
        });
      }
    };

    const startSession = async () => {
      const current = latest.current;
      if (!current.childProfileId || audio.paused || audio.seeking || audio.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return;
      }
      const identity = `${current.childProfileId}:${current.trackIdentity}:${current.reciterId}`;
      if (session.current?.identity === identity) {
        await heartbeat(true);
        return;
      }
      if (session.current) await endSession();
      const clientSessionId = crypto.randomUUID();
      const result = await sendSessionRequest({
        action: 'start',
        childProfileId: current.childProfileId,
        clientSessionId,
        mode: current.mode,
        surahNumber: current.surahNumber,
        juzNumber: current.juzNumber,
        ayahStart: current.ayahStart,
        ayahEnd: current.ayahEnd,
        reciterId: current.reciterId,
        reciterName: current.reciterName,
      });
      if (typeof result.sessionId !== 'string') {
        throw new Error('The listening service did not return a session ID.');
      }
      session.current = { id: result.sessionId, identity };
      setStatus('Listening activity is being recorded.');
    };

    const onPlay = () => queue(startSession);
    const onPause = () => queue(() => heartbeat(false));
    const onEnded = () => {
      const current = latest.current;
      const reachedTrackEnd = Number.isFinite(audio.duration)
        && audio.duration > 0
        && audio.currentTime >= audio.duration - 2;
      if (current.mode === 'juz' && !current.completeJuzOnEnded) {
        queue(() => heartbeat(false));
        return;
      }
      const completion = reachedTrackEnd
        ? current.mode === 'juz'
          ? 'juz'
          : current.surahNumber ? 'surah' : undefined
        : undefined;
      queue(() => endSession(completion));
    };
    const onSeeking = () => queue(() => heartbeat(false));
    const onSeeked = () => {
      if (!audio.paused) queue(() => heartbeat(true));
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('seeking', onSeeking);
    audio.addEventListener('seeked', onSeeked);

    const timer = window.setInterval(() => {
      if (!audio.paused && !audio.seeking && audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        queue(() => session.current ? heartbeat(true) : startSession());
      }
    }, 15000);

    if (!audio.paused) queue(startSession);
    return () => {
      window.clearInterval(timer);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('seeking', onSeeking);
      audio.removeEventListener('seeked', onSeeked);
      queue(endSession);
    };
  }, [props.audioRef]);

  const identity = `${props.childProfileId || ''}:${props.trackIdentity}:${props.reciterId}`;
  const previousIdentity = useRef(identity);
  useEffect(() => {
    if (previousIdentity.current === identity) return;
    previousIdentity.current = identity;
    const audio = props.audioRef.current;
    if (!audio) return;
    operation.current = operation.current
      .catch((error: unknown) => console.error('Previous Quran session update failed.', error))
      .then(async () => {
        const activeSession = session.current;
        if (activeSession) {
          session.current = null;
          try {
            await sendSessionRequest({ action: 'heartbeat', sessionId: activeSession.id, isPlaying: false });
            await sendSessionRequest({ action: 'end', sessionId: activeSession.id });
          } catch (error) {
            session.current = activeSession;
            throw error;
          }
        }
        if (!props.childProfileId) {
          setStatus('');
          return;
        }
        if (!audio.paused && !audio.seeking) {
          const current = latest.current;
          const result = await sendSessionRequest({
            action: 'start',
            childProfileId: current.childProfileId,
            clientSessionId: crypto.randomUUID(),
            mode: current.mode,
            surahNumber: current.surahNumber,
            juzNumber: current.juzNumber,
            ayahStart: current.ayahStart,
            ayahEnd: current.ayahEnd,
            reciterId: current.reciterId,
            reciterName: current.reciterName,
          });
          if (typeof result.sessionId !== 'string') throw new Error('The listening service did not return a session ID.');
          session.current = { id: result.sessionId, identity };
        }
      })
      .catch((error: unknown) => {
        console.error('Quran listening session could not be switched.', error);
        setStatus(error instanceof Error ? error.message : 'Listening activity could not be saved.');
      });
  }, [identity, props.audioRef, props.childProfileId]);

  return (
    <p className="sr-only" aria-live="polite">
      {props.childProfileId ? status : 'Sign in and select a child profile to save Quran listening progress.'}
    </p>
  );
}
