import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.42695cb72fb64deea48058b10234af70',
  appName: 'whispr-owl',
  webDir: 'dist',
  server: {
    url: 'https://42695cb7-2fb6-4dee-a480-58b10234af70.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;