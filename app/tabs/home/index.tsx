import React from 'react';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
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
import store from '../../../store';
import rootTheme from '../../../rootTheme';

// this is a comment - jared
// test main branch

export default function Home() {
  // using useRouter to navigate through screens 
  const navigation = useRouter();
  
  return (
    <PaperProvider theme={rootTheme}>
      <Provider store={store}>
      <Stack.Screen options={{ title: "Home" }} />
        <SafeAreaView>
          <Text>Welcome To Snow Buddies App Test New Branch</Text>
        </SafeAreaView>
      </Provider>
    </PaperProvider>
  );
}
