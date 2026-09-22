import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uz.oquvmarkaz.app',
  appName: "O'quv Markaz",
  webDir: 'public',
  server: {
    url: 'https://oquv-markaz-ycx1.vercel.app',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#ffffff',
  },
};

export default config;
