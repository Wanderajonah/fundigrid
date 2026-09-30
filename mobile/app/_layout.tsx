import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import { NavigationBar } from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import { StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../src/theme';
import { AuthProvider } from '../src/contexts/AuthContext';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  if (fontError) {
    console.warn('Font failed to load', fontError);
  }

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.black }}>
        <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationBar style="dark" />
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.white },
          }}
        >
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="location" />
        <Stack.Screen name="role" />
        <Stack.Screen name="phone" />
        <Stack.Screen name="otp" />
        <Stack.Screen name="profile-setup" />
        <Stack.Screen name="trade-details" />
        <Stack.Screen name="rate-availability" />
        <Stack.Screen name="verification" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(fundi-tabs)" />
        <Stack.Screen name="fundi-job-details" />
        <Stack.Screen name="request-job" />
        <Stack.Screen name="available-fundis" />
        <Stack.Screen name="fundi-profile" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="booking" />
        <Stack.Screen name="booking-confirmed" options={{ animation: 'fade' }} />
        <Stack.Screen name="job-tracking" />
        <Stack.Screen name="job-completed" options={{ animation: 'fade' }} />
        <Stack.Screen name="payment" />
        <Stack.Screen name="receipt" options={{ animation: 'fade' }} />
        <Stack.Screen name="review" />
        <Stack.Screen name="support" />
        <Stack.Screen name="terms" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="settings" />
      </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
