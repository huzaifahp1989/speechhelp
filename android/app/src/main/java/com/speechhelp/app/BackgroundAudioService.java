package com.speechhelp.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;

public class BackgroundAudioService extends Service {
    public static final String ACTION_START = "com.speechhelp.app.BACKGROUND_AUDIO_START";
    public static final String ACTION_STOP = "com.speechhelp.app.BACKGROUND_AUDIO_STOP";

    private static final String CHANNEL_ID = "speechhelp_audio";
    private static final int NOTIFICATION_ID = 4107;

    private PowerManager.WakeLock wakeLock;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        final String action = intent != null ? intent.getAction() : null;
        if (ACTION_STOP.equals(action)) {
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        ensureChannel();
        acquireWakeLock();

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("SpeechHelp")
                .setContentText("Playing Quran audio")
                .setSmallIcon(R.drawable.ic_launcher_foreground)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .build();

        startForeground(NOTIFICATION_ID, notification);
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        releaseWakeLock();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "SpeechHelp Audio",
                NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Keeps Quran audio playing in background");
        nm.createNotificationChannel(channel);
    }

    private void acquireWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) return;
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm == null) return;
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SpeechHelp:AudioWakeLock");
        wakeLock.setReferenceCounted(false);
        wakeLock.acquire();
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        wakeLock = null;
    }
}

