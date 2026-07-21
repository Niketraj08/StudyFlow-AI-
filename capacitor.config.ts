import type { CapacitorConfig } from '@capacitor/cli';

// StudyFlow AI - Android wrapper configuration
//
// The APK loads the live published PWA at server.url, so publishing in Lovable
// updates installed apps instantly. You only rebuild the APK when you change
// native settings, icons, splash, or the app version below.
const config: CapacitorConfig = {
  appId: 'app.lovable.studyflowai',
  appName: 'StudyFlow AI',
  webDir: 'dist',
  server: {
    url: 'https://a4eda28d-590c-4514-a76d-80efce2317c6.lovable.app',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#0a0a0a',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#0a0a0a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0a',
      overlaysWebView: false,
    },
  },
};

export default config;
