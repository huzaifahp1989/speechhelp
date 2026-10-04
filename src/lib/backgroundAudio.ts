import { Capacitor, registerPlugin } from '@capacitor/core';

type BackgroundAudioPlugin = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
};

const BackgroundAudio = registerPlugin<BackgroundAudioPlugin>('BackgroundAudio');

export async function startBackgroundAudio(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return false;
  await BackgroundAudio.start();
  return true;
}

export async function stopBackgroundAudio(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return false;
  await BackgroundAudio.stop();
  return true;
}
