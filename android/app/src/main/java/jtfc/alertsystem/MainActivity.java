package jtfc.alertsystem;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ContentResolver;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createEmergencyNotificationChannels();
    }

    private void createEmergencyNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager == null) return;

            Uri soundUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + getPackageName() + "/raw/alarm");
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .build();

            long[] vibrationPattern = new long[]{0, 500, 250, 500, 250, 1000, 500, 500};

            // 1. Primary emergency siren channel
            NotificationChannel sirenChannel = new NotificationChannel(
                    "emergency_siren_channel",
                    "🚨 Emergency Siren Alerts",
                    NotificationManager.IMPORTANCE_HIGH
            );
            sirenChannel.setDescription("Critical emergency siren alarm notifications");
            sirenChannel.enableVibration(true);
            sirenChannel.setVibrationPattern(vibrationPattern);
            sirenChannel.enableLights(true);
            sirenChannel.setSound(soundUri, audioAttributes);
            notificationManager.createNotificationChannel(sirenChannel);

            // 2. Also register emergency_alerts channel with the siren sound for backward compatibility
            NotificationChannel legacyChannel = new NotificationChannel(
                    "emergency_alerts",
                    "Emergency Alerts",
                    NotificationManager.IMPORTANCE_HIGH
            );
            legacyChannel.setDescription("Emergency alerts");
            legacyChannel.enableVibration(true);
            legacyChannel.setVibrationPattern(vibrationPattern);
            legacyChannel.setSound(soundUri, audioAttributes);
            notificationManager.createNotificationChannel(legacyChannel);
        }
    }
}
