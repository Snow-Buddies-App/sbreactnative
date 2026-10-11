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
          'Snow Buddies shows where you are on the ski map and, when you choose, shares it with the buddies you pick.',
        locationAlwaysAndWhenInUsePermission:
          'Allow "Always" to keep sharing your location with your chosen buddies while your phone is in your pocket. Sharing always turns off automatically.',
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      'expo-audio',
      {
        microphonePermission: 'Snow Buddies uses the microphone for voice messages and calls with your buddies.',
      },
    ],
    '@livekit/react-native-expo-plugin',
    [
      '@config-plugins/react-native-webrtc',
      {
        cameraPermission: 'Snow Buddies uses the camera for video calls with your buddies.',
        microphonePermission: 'Snow Buddies uses the microphone for voice messages and calls with your buddies.',
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
