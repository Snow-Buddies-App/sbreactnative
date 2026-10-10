import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'sbreactnative',
  slug: 'sbreactnative',
  scheme: 'sb',
  splash: {
    image: './assets/sblogo.png',
    resizeMode: 'contain',
    backgroundColor: '#90BDE1',
  },
  // extra: {
  //   eas: {
  //     projectId: 'ce00ff74-5750-4062-9985-736df2572fd7',
  //   },
  // },
};

export default config;
