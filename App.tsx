import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView, StyleSheet, Platform, StatusBar, Text, View } from 'react-native';
import { Provider } from "react-redux";
import { PaperProvider } from 'react-native-paper';
import store from "./store";
import rootTheme from './rootTheme';

export default function App() {
  return (
    <PaperProvider theme={rootTheme}>
      <Provider store={store}>
        <SafeAreaView>
          <Text>Welcome To Snow Buddies</Text>
        </SafeAreaView>
      </Provider>
    </PaperProvider>
  );
}