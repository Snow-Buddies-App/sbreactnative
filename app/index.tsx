import React from 'react';
import { View, Image, StyleSheet, ImageBackground } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { Link } from 'expo-router';

import CardComponent from '../features/Register/cardComponent';

/*TODO: 
  MAKE BUTTONS REUSABLE COMPONENTS  

  Possibly make card with pagination a separate component to keep Onboarding from becoming too cluttered
*/

const Onboarding = () => {
  const image = require('../assets/OnboardingBack.png');

  return (
    <View style={styles.container}>
      <ImageBackground source={image} style={styles.imageBackground}>
        <View style={styles.topContainer}>
          <Image source={require('../assets/sblogo-sm.png')} />
        </View>
        <View style={styles.bottomContainer}>
          <CardComponent />
          <Link href="/Register/RegisterScreen">
            <Button style={styles.button} mode="contained">
              Register
            </Button>
          </Link>
          <Text style={styles.loginText}>
            Already have an account?
            <Link href="/Login/LoginScreen">
              <Text style={styles.loginLink}>Log in</Text>
            </Link>
          </Text>
        </View>
      </ImageBackground>
    </View>
  );
};

export default Onboarding;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageBackground: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'space-between',
  },
  topContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  bottomContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 30,
  },
  button: {
    backgroundColor: '#04448C',
    borderRadius: 5,
    width: 315,
  },
  loginText: {
    fontSize: 16,
    marginTop: 10,
    color: '#04448C',
  },
  loginLink: {
    color: '#04448C',
    textDecorationLine: 'underline',
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
