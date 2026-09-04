import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.atlasTHOUGHT.Bridge',
  appName: 'Bridge',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
