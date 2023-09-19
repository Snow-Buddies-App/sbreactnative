import { Stack } from 'expo-router';

const HomeLayout = () => {
  // template for the layout of navigation  -- renders elements
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: 'midnightblue',
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >Stuff</Stack>
  );
};

export default HomeLayout;
