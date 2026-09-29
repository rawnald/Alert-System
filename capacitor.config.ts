import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "jtfc.alertsystem",
  appName: "Alert System",
  webDir: "public",
  server: {
    url: "https://alert-system-steel.vercel.app",
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
