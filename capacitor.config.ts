import type { CapacitorConfig } from '@capacitor/cli';

const productionAppUrl = (process.env.CAPACITOR_SERVER_URL || 'https://traespeechhelpbe6b.vercel.app').trim();

const config: CapacitorConfig = {
  appId: 'com.speechhelp.app',
  appName: 'speechhelp',
  webDir: 'out',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
  server: {
    url: productionAppUrl,
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: ['*']
  }
};

export default config;
