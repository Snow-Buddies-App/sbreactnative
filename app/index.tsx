import { useRouter, Stack } from 'expo-router';
import { View, Button } from 'react-native';

// replacing WelcomeScreen with this will bypass the Welcome screen and make the /home screen the initial screen on load

/* 
import { Redirect } from "expo-router";

const Index = () => {
  return <Redirect href="/home" />;
};
export default Index;

*/

const WelcomeScreen = () => {
  const navigation = useRouter();
  return (
    <View>
      <Stack.Screen
        options={{
          title: 'Welcome',
        }}
      />
      <Button title="Home screen" onPress={() => navigation.push('/home')} />
    </View>
  );
};

export default WelcomeScreen;
