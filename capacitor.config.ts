import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.achariya.ambassador',
  appName: '5-Star Ambassador',
  webDir: 'public',
  server: {
    url: 'https://www.5starambassador.com', // Production Vercel URL
    cleartext: true
  },
  plugins: {
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#DC2626", // Achariya Red
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
