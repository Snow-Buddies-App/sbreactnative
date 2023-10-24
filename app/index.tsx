import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { ImageBackground } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { Link } from 'expo-router';

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
          {/* CARD COMPONENT HERE */}
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
  textInput: {
    width: 300,
    height: 145,
    marginBottom: 10,
    backgroundColor: '#90BDE1',
    opacity: 0.6,
  },
  button: {
    backgroundColor: '#04448C',
    borderRadius: 8,
    width: 300,
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
