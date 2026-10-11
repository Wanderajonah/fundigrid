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

const HOLD_BEFORE_POP = 220;
const STAGGER = 140;
const NAVIGATE_AFTER = 4000;
const CITY_ASPECT = 793 / 1983;

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkShift = useRef(new Animated.Value(12)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineShift = useRef(new Animated.Value(14)).current;
  const cityOpacity = useRef(new Animated.Value(0)).current;
  const cityShift = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    let active = true;

    const reveal = async () => {
      try {
        await ExpoSplashScreen.hideAsync();
      } catch {
        // native splash already hidden
      }
      if (!active) return;
      Animated.sequence([
        Animated.delay(HOLD_BEFORE_POP),
        Animated.stagger(STAGGER, [
          Animated.parallel([
            Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
            Animated.timing(logoOpacity, {
              toValue: 1,
              duration: 240,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.spring(wordmarkShift, { toValue: 0, friction: 6, tension: 95, useNativeDriver: true }),
            Animated.timing(wordmarkOpacity, {
              toValue: 1,
              duration: 260,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.spring(taglineShift, { toValue: 0, friction: 6, tension: 90, useNativeDriver: true }),
            Animated.timing(taglineOpacity, {
              toValue: 1,
              duration: 260,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.spring(cityShift, { toValue: 0, friction: 7, tension: 70, useNativeDriver: true }),
            Animated.timing(cityOpacity, {
              toValue: 1,
              duration: 320,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    };

    reveal();

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
      active = false;
      clearTimeout(timer);
    };
  }, []);

  const cityWidth = width;
  const cityHeight = Math.round(cityWidth * CITY_ASPECT);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      <NavigationBar style="light" />

      <View style={styles.center}>
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
            marginBottom: spacing.sm,
          }}
        >
          <Image source={IMAGES.logoWhite} style={styles.logo} resizeMode="contain" />
        </Animated.View>

        <Animated.View
          style={[
            styles.wordmark,
            {
              opacity: wordmarkOpacity,
              transform: [{ translateY: wordmarkShift }],
              marginBottom: spacing.lg,
            },
          ]}
        >
          <Text style={styles.fundi}>Fundi</Text>
          <Text style={styles.grid}>Grid</Text>
        </Animated.View>

        <Animated.View
          style={{
            opacity: taglineOpacity,
            transform: [{ translateY: taglineShift }],
          }}
        >
          <Text style={styles.tagline}>Skilled Artisans. Near You.</Text>
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.cityWrap,
          {
            paddingBottom: Math.max(insets.bottom, 20),
            opacity: cityOpacity,
            transform: [{ translateY: cityShift }],
          },
        ]}
      >
        <Image
          source={IMAGES.city}
          style={{ width: cityWidth, height: cityHeight }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
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
