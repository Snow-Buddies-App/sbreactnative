import { View, Image } from 'react-native';
import React from 'react';
import { Button, Text } from 'react-native-paper';
import { Link } from 'expo-router';

const Onboarding = () => {
  return (
    <View>
      <Image source={require('../assets/sblogo.png')} />
      <Text>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Officiis non
        accusantium repudiandae, aliquam fuga vitae dolor similique cumque
        facere aperiam magni doloremque ea fugit delectus? Laborum blanditiis
        nesciunt nam veniam.
      </Text>
      <Link href="/Register/RegisterScreen">
        <Button mode="contained">Register</Button>
      </Link>
      <Text>
        Already have an account?
        <Link href="/Login/LoginScreen">
          <Button>Log in</Button>
        </Link>
      </Text>
    </View>
  );
};

export default Onboarding;
