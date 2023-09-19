import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

const rootTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    myOwnColor: '#BADA55',
  },
};

export default rootTheme;
