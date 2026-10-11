import { MD3LightTheme } from 'react-native-paper';

export const brand = {
  navy: '#04448C',
  sky: '#90BDE1',
  lime: '#A1C42C',
  snow: '#F5F9FC',
};

const theme = {
  ...MD3LightTheme,
  roundness: 2,
  colors: {
    ...MD3LightTheme.colors,
    primary: brand.navy,
    onPrimary: '#FFFFFF',
    primaryContainer: '#D6E6F5',
    onPrimaryContainer: '#02264F',
    secondary: '#5F8A00',
    secondaryContainer: '#E3F0B8',
    onSecondaryContainer: '#2A3D00',
    background: brand.snow,
    surface: '#FFFFFF',
    surfaceVariant: '#E6EEF5',
  },
};

export type AppTheme = typeof theme;
export default theme;
