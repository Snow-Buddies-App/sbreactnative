import { useRouter, Stack } from 'expo-router';
import { View, Text } from 'react-native';

const Home = () => {
  const navigation = useRouter();
  return (
    <View>
      <Stack.Screen options={{headerShown: true, title: "Home"}} />
      <Text>This is the home screen</Text>
      <Text>
        Lorem ipsum dolor sit amet consectetur, adipisicing elit. Voluptates
        velit temporibus sed porro harum accusamus, autem beatae quas quasi
        ullam sequi hic id quam. Doloribus laborum voluptatem sed alias
        expedita. lorem
      </Text>
    </View>
  );
};

export default Home;
