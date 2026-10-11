import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View, type NativeSyntheticEvent, type TextInputKeyPressEventData } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import PrimaryButton from '../src/components/PrimaryButton';
import { IMAGES } from '../src/assets';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/contexts/AuthContext';
import { goBackSafe } from '../src/services/navigation';
import { updateLocation, updateProfile } from '../src/services/api';
import { takePendingProfile } from '../src/services/pendingProfile';

export default function OtpScreen() {
  const router = useRouter();
  const { role, phone, purpose, firstName, lastName, password } = useLocalSearchParams<{
    role?: string;
    phone?: string;
    purpose?: string;
    firstName?: string;
    lastName?: string;
    password?: string;
  }>();
  const { signUp, refreshUser, signOut } = useAuth();
  const [code, setCode] = useState(['', '', '', '']);
  const [seconds, setSeconds] = useState(300);
  const [loading, setLoading] = useState(false);
  const refs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) { clearInterval(t); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => refs.current[0]?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  const handleChange = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    const old = code[i];
    // Without a text selection, typing into a filled box appends instead of
    // replacing, and the caret can sit before the existing digit. Read that
    // extra character as the keystroke so the box overwrites instead of
    // refusing input at maxLength. Longer input is treated as a paste.
    let typed = digits;
    if (old && digits.length === old.length + 1) {
      typed = digits.startsWith(old) ? digits.slice(old.length) : digits.slice(0, 1);
    }

    const next = [...code];
    let last = i;
    if (!typed.length) {
      next[i] = '';
    } else {
      for (let k = 0; k < typed.length && i + k < 4; k++) {
        next[i + k] = typed[k];
        last = i + k;
      }
    }
    setCode(next);
    if (typed.length && last < 3) refs.current[last + 1]?.focus();
    // The 4th digit verifies itself — nobody should hunt for the button.
    if (next.every((d) => d !== '')) handleVerify(next.join(''));
  };

  const handleKeyPress = (i: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key !== 'Backspace' || code[i] || i === 0) return;
    const next = [...code];
    next[i - 1] = '';
    setCode(next);
    refs.current[i - 1]?.focus();
  };

  const handleVerify = async (otpOverride?: string) => {
    const otpCode = otpOverride ?? code.join('');
    if (otpCode.length < 4) {
      Alert.alert('Invalid code', 'Please enter the full 4-digit code.');
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      // The forgot-password flow hands the code to the new-password screen
      // rather than consuming it here, so that screen owns both checks.
      if (purpose === 'reset') {
        router.replace({ pathname: '/reset-password', params: { role, phone, code: otpCode } });
        return;
      }

      const res = await signUp({
        phone: phone ?? '',
        code: otpCode,
        role: role ?? 'client',
        firstName,
        lastName,
        password,
      });
      const signedUp = res.user;
      const landingRole = signedUp?.role || role || 'client';

      // The number already belongs to a password-protected account — send them
      // to sign in instead of silently signing them in behind a new "account".
      // `accountExisted` is the discriminator: a brand-new account also comes
      // back with `hasPassword` (the sign-up form just set one).
      if (res.accountExisted && res.hasPassword && signedUp?.name?.trim()) {
        takePendingProfile();
        // The session the server handed out must not survive this refusal —
        // otherwise the app is signed in behind a login screen.
        await signOut();
        Alert.alert(
          'Account already exists',
          'This number is already registered. Sign in with your password instead.',
          [{ text: 'OK', onPress: () => router.replace({ pathname: '/phone', params: { role: landingRole } }) }]
        );
        return;
      }

      // The profile collected on step ① (photo, gender, location) rides along
      // now that there is a session to put it on. Best effort: the account is
      // already created, and Settings → Edit profile can fix anything later.
      const pending = takePendingProfile();
      if (res.token && pending) {
        try {
          await updateProfile(res.token, {
            gender: pending.gender,
            locationLabel: pending.locationLabel,
            profilePhoto: pending.profilePhoto,
          });
          if (pending.lat != null && pending.lng != null) {
            await updateLocation(res.token, {
              lat: pending.lat,
              lng: pending.lng,
              address: pending.locationLabel || '',
            });
          }
        } catch {
          // Profile extras are nice-to-have; never block the way home.
        }
        await refreshUser(res.token);
      }

      // Straight home. Fundis stop once at trade details so their profile has
      // skills on it; everything else lives in Settings → Edit profile.
      if (landingRole === 'fundi') {
        router.replace({ pathname: '/trade-details', params: { role: 'fundi' } });
        return;
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Verification failed', e.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const displayPhone = phone ? `+${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}` : '+256 712 345678';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => goBackSafe('/phone')} hitSlop={12} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.body}>
        <Text style={styles.h1}>{purpose === 'reset' ? 'Verify It’s You' : 'Verify Your Number'}</Text>
        <Text style={styles.sub}>Enter the 4-digit code sent to{'\n'}{displayPhone}</Text>

        <View style={styles.boxes}>
          {code.map((v, i) => (
            <Pressable
              key={i}
              onPress={() => refs.current[i]?.focus()}
              style={[styles.box, code[i] !== '' && styles.boxFilled]}
            >
              <TextInput
                ref={(r) => { refs.current[i] = r; }}
                value={v}
                onChangeText={(t) => handleChange(i, t)}
                onKeyPress={(e) => handleKeyPress(i, e)}
                keyboardType="number-pad"
                maxLength={4}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                selectTextOnFocus={false}
                returnKeyType={i === 3 ? 'done' : 'next'}
                blurOnSubmit={false}
                style={styles.boxText}
              />
            </Pressable>
          ))}
        </View>

        <Pressable disabled={seconds > 0} style={styles.resendWrap}>
          <Text style={[styles.resend, seconds > 0 && { opacity: 0.5 }]}>
            Resend code in {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
          </Text>
        </Pressable>

        <View style={styles.bottom}>
          <PrimaryButton title="Verify" onPress={() => handleVerify()} loading={loading} />
          <Pressable onPress={() => goBackSafe('/phone')} style={styles.change}>
            <Text style={styles.changeText}>Change number</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: { height: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  backBtn: { position: 'absolute', left: spacing.xxl, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 85, height: 85 },
  body: { flex: 1, paddingHorizontal: spacing.xxl, paddingTop: spacing.xl, alignItems: 'center' },
  h1: { fontFamily: fonts.bold, fontSize: 24, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft, marginTop: 4, lineHeight: 22, textAlign: 'center' },
  boxes: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xxl },
  box: {
    width: 56,
    height: 60,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: { borderColor: colors.primary, backgroundColor: colors.primaryFaint },
  boxText: { width: '100%', height: '100%', fontFamily: fonts.bold, fontSize: 24, color: colors.ink, textAlign: 'center', textAlignVertical: 'center', padding: 0 },
  resendWrap: { marginTop: spacing.lg },
  resend: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  bottom: { width: '100%', marginTop: spacing.xxl },
  change: { paddingVertical: spacing.md, alignItems: 'center' },
  changeText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft, textDecorationLine: 'underline' },
});
