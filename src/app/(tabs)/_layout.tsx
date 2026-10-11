import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import theme from '@/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

function icon(name: IconName) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <MaterialCommunityIcons name={name} color={color} size={size} />;
  }
  return TabIcon;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        headerTintColor: theme.colors.primary,
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Discover', tabBarIcon: icon('account-search') }} />
      <Tabs.Screen name="trips" options={{ title: 'Trips', tabBarIcon: icon('calendar-star') }} />
      <Tabs.Screen name="map" options={{ title: 'Ski Map', tabBarIcon: icon('map-marker-radius') }} />
      <Tabs.Screen name="buddies" options={{ title: 'Buddies', tabBarIcon: icon('account-group') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('account-circle') }} />
    </Tabs>
  );
}
