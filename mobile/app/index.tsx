import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { NavigationBar } from 'expo-navigation-bar';
import { IMAGES } from '../src/assets';
import { isLocationAvailable } from '../src/services/location';
import { getLocationState, hasSeenWelcome, setLocationState } from '../src/services/welcome';
import { getToken, getUser } from '../src/services/api';
import { colors, fonts, spacing } from '../src/theme';

ExpoSplashScreen.preventAutoHideAsync();

const NAVIGATE_AFTER = 4000;
const FADE_IN_MS = 450;
const FADE_OUT_MS = 350;
const CITY_ASPECT = 793 / 1983;

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const reveal = async () => {
      try {
        await ExpoSplashScreen.hideAsync();
      } catch {
        // native splash already hidden
      }
      // Gentle cross-fade from the native splash — opacity only, no movement.
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_IN_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    };

    reveal();

    // Start the fade-out just before navigating so the hand-off is seamless.
    const fadeTimer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_OUT_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start();
    }, NAVIGATE_AFTER - FADE_OUT_MS);

    // First launch shows onboarding once. Later launches skip it and go
    // straight to sign-in. Enable Location comes back only when it has never
    // been answered, or when a working location was switched off again — a
    // decline that never changed is not nagged about.
    const timer = setTimeout(async () => {
      // A restored session skips auth entirely.
      const token = await getToken();
      if (token) {
        const cached = await getUser();
        router.replace(cached?.role === 'fundi' ? '/(fundi-tabs)' : '/(tabs)');
        return;
      }

      const seen = await hasSeenWelcome();
      if (!seen) {
        router.replace('/welcome');
        return;
      }
      const locationOk = await isLocationAvailable();
      const previous = await getLocationState();

      if (locationOk) {
        await setLocationState('available');
        router.replace('/role');
        return;
      }

      await setLocationState('unavailable');
      const firstAsk = previous === null;
      const lostIt = previous === 'available';
      router.replace(firstAsk || lostIt ? '/location' : '/role');
    }, NAVIGATE_AFTER);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(timer);
      opacity.stopAnimation();
    };
  }, []);

  const cityWidth = width;
  const cityHeight = Math.round(cityWidth * CITY_ASPECT);

  return (
    <Animated.View style={[styles.root, { opacity }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      <NavigationBar style="light" />

      <View style={styles.center}>
        <View style={{ marginBottom: spacing.sm }}>
          <Image source={IMAGES.logoWhite} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={[styles.wordmark, { marginBottom: spacing.lg }]}>
          <Text style={styles.fundi}>Fundi</Text>
          <Text style={styles.grid}>Grid</Text>
        </View>

        <View>
          <Text style={styles.tagline}>Skilled Artisans. Near You.</Text>
        </View>
      </View>

      <View
        style={[
          styles.cityWrap,
          {
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
      >
        <Image
          source={IMAGES.city}
          style={{ width: cityWidth, height: cityHeight }}
          resizeMode="contain"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.black,
  },
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 92,
    height: 97,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  fundi: {
    fontFamily: fonts.extrabold,
    fontSize: 46,
    color: colors.white,
    letterSpacing: -1.5,
  },
  grid: {
    fontFamily: fonts.extrabold,
    fontSize: 46,
    color: colors.primary,
    letterSpacing: -1.5,
  },
  tagline: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.white,
    textAlign: 'center',
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  cityWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
});
