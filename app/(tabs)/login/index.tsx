import { Text, View } from 'react-native';
import { Stack } from 'expo-router';

const Login = () => {
  return (
    <View>
      <Stack.Screen options={{headerShown: true, title: "Login"}} />
      <Text>This is the Login screen</Text>
      <Text>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Iste dolore,
        maxime voluptatibus nostrum aspernatur id harum quisquam illum aliquam
        numquam sapiente cum, doloribus non earum commodi corporis, atque
        consequatur ullam. Lorem ipsum dolor sit amet consectetur adipisicing
        elit. Repellendus dolore quasi commodi ipsa temporibus similique numquam
        obcaecati nobis, rem iure libero quod itaque? Quidem nesciunt vel ipsam
        voluptatem, molestias eveniet?
      </Text>
    </View>
  );
};

export default Login;
