import { Link } from 'expo-router';
import { Image, ImageBackground, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import OnboardingCarousel from '@/components/OnboardingCarousel';
import { brand } from '@/theme';

export default function Welcome() {
  return (
    <ImageBackground
      source={require('@/assets/OnboardingBack.png')}
      style={styles.imageBackground}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topContainer}>
          <Image source={require('@/assets/sblogo-sm.png')} accessibilityLabel="Snow Buddies" />
        </View>
        <View style={styles.bottomContainer}>
          <OnboardingCarousel />
          <Link href="/register" asChild>
            <Button style={styles.button} mode="contained">
              Register
            </Button>
          </Link>
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <Link href="/login" asChild>
              <Button compact textColor={brand.navy} labelStyle={styles.loginLink}>
                Log in
              </Button>
            </Link>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  imageBackground: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'space-between' },
  topContainer: { alignItems: 'center', marginTop: 30 },
  bottomContainer: { alignItems: 'center', marginBottom: 30, paddingHorizontal: 30 },
  button: { backgroundColor: brand.navy, borderRadius: 5, width: 315 },
  loginRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  loginText: { fontSize: 16, color: brand.navy },
  loginLink: { fontWeight: 'bold', textDecorationLine: 'underline', fontSize: 16 },
});
