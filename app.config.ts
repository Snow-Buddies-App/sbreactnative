import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Snow Buddies',
  slug: 'sbreactnative',
  scheme: 'sb',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.snowbuddies.app',
  },
  android: {
    package: 'com.snowbuddies.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#90BDE1',
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/sblogo.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#90BDE1',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Snow Buddies uses your location to show where you are on the ski map.',
      },
    ],
    [
      'react-native-maps',
      {
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: 'ce00ff74-5750-4062-9985-736df2572fd7',
    },
  },
};

export default config;
