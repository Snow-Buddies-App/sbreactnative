import { Tabs } from 'expo-router';
import { Text } from 'react-native';

const AppLayout = () => {
  return (
    <Tabs screenOptions={{ headerShown: false}}>
      <Tabs.Screen
        // for dynamic routes - "name=[user]"
        name="home"
        options={{
          tabBarIcon: () => <Text>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="login"
        options={{
          tabBarIcon: () => <Text>👤</Text>,
        }}
      />
    </Tabs>
  );
};

export default AppLayout;
