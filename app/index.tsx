import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  SafeAreaView,
  StyleSheet,
  Platform,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import store from '../store';
import rootTheme from '../rootTheme';

// this is a comment - jared
// test main branch
// test main branch 2

export default function App() {
  return (
    <PaperProvider theme={rootTheme}>
      <Provider store={store}>
        <SafeAreaView>
          <Text>Welcome To Snow Buddies App Test</Text>
        </SafeAreaView>
      </Provider>
    </PaperProvider>
  );
}
