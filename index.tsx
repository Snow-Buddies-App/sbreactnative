import "expo-router/entry";
import React from "react";
import { SafeAreaView, Text } from "react-native";
import { Provider } from "react-redux";
import { PaperProvider } from "react-native-paper";
import store from "./store";
import rootTheme from "./rootTheme";

export default function App() {
  return (
    <Provider store={store}>
      <PaperProvider theme={rootTheme}>
        <SafeAreaView>
          <Text>Welcome To Snow Buddies</Text>
        </SafeAreaView>
      </PaperProvider>
    </Provider>
  );
}
