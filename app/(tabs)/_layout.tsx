import { Tabs } from 'expo-router';
import { Text } from 'react-native';

const AppLayout = () => {
  return (
    <Tabs>
      <Tabs.Screen
        // for dynamic routes - "name=[user]"
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: () => <Text>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="login"
        options={{
          title: 'Login',
          tabBarIcon: () => <Text>👤</Text>,
        }}
      />
    </Tabs>
  );
};

export default AppLayout;
