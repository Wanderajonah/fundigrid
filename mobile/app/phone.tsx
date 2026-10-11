import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import PrimaryButton from '../src/components/PrimaryButton';
import PasswordField from '../src/components/PasswordField';
import LegalFooter from '../src/components/LegalFooter';
import { IMAGES } from '../src/assets';
import { colors, fonts, radius, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/contexts/AuthContext';
import { goBackSafe } from '../src/services/navigation';
import { sendOtp } from '../src/services/api';
import { toFullPhone } from '../src/services/phone';

// Full-bleed banner: the body adds horizontal padding, so the illustration is
// pulled back out to the screen edges.
const SCREEN_WIDTH = Dimensions.get('window').width;

// The source PNG carries a large white band above the artwork. The banner is
// clipped to the bottom of the image so the drawing starts where the box starts
// and the legal text can sit right on top of it.
const ILLUSTRATION_HEIGHT = Math.round(SCREEN_WIDTH * 0.21);
const ILLUSTRATION_FULL_HEIGHT = Math.round(SCREEN_WIDTH * 0.45);

// Password sign-in. OTP lives on the sign-up and forgot-password flows only.
export default function PhoneScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: 'client' | 'fundi' }>();
  const { signIn } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [lockedFor, setLockedFor] = useState(0); // seconds until the lock expires

  useEffect(() => {
    if (lockedFor <= 0) return;
    const t = setInterval(() => setLockedFor((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [lockedFor > 0]);

  const startReset = async (fullPhone: string) => {
    try {
      await sendOtp(fullPhone, 'reset');
    } catch {
      // A failed send surfaces on the next screen when it tries again.
    }
    router.push({ pathname: '/otp', params: { role: role ?? 'client', phone: fullPhone, purpose: 'reset' } });
  };

  const handleSignIn = async () => {
    const fullPhone = toFullPhone(phone);
    if (fullPhone.length < 9) {
      Alert.alert('Invalid number', 'Please enter a valid phone number.');
      return;
    }
    if (!password) {
      Alert.alert('Password required', 'Enter your password to sign in.');
      return;
    }
    if (lockedFor > 0 || loading) return;

    setLoading(true);
    setNotice(null);
    try {
      const res = await signIn(fullPhone, password);
      const signedIn = res.user;
      // Never drop a returning user on the tabs with an empty profile.
      if (!signedIn?.name?.trim()) {
        router.replace({
          pathname: '/profile-setup',
          params: { role: signedIn?.role ?? role ?? 'client', phone: fullPhone },
        });
        return;
      }
      const landingRole = signedIn?.role || role || 'client';
      router.replace(landingRole === 'fundi' ? '/(fundi-tabs)' : '/(tabs)');
    } catch (e: any) {
      const code = e?.code;
      if (code === 'PASSWORD_NOT_SET') {
        Alert.alert(
          'No password yet',
          'This account has never used a password. We can send a code to your number so you can set one now.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Send code', onPress: () => startReset(fullPhone) },
          ]
        );
        return;
      }
      if (code === 'LOCKED') {
        setLockedFor(e.retryAfterSeconds || 600);
        setNotice({ tone: 'info', text: e.message });
        return;
      }
      if (code === 'PASSWORD_BLOCKED') {
        setBlocked(true);
        setNotice({ tone: 'error', text: e.message });
        return;
      }
      if (typeof e?.attemptsRemaining === 'number') {
        setAttemptsLeft(e.attemptsRemaining);
      }
      setNotice({
        tone: 'error',
        text: e?.code === 'NETWORK' ? e.message : e?.message || 'Sign-in failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const mmss = `${String(Math.floor(lockedFor / 60)).padStart(2, '0')}:${String(lockedFor % 60).padStart(2, '0')}`;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => goBackSafe('/role')} hitSlop={12} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.body}>
        <Text style={styles.h1}>Welcome Back</Text>
        <Text style={styles.subtitle}>Log in to Your FundiGrid account and get things done.</Text>

        <View style={styles.phoneGroup}>
          <Text style={styles.fieldLabel}>Phone number</Text>
          <View style={styles.phoneRow}>
            <Pressable style={styles.countryCode}>
              <Text style={styles.flag}>🇺🇬</Text>
              <Text style={styles.code}>+256</Text>
              <Ionicons name="chevron-down" size={14} color={colors.inkSoft} />
            </Pressable>
            <TextInput
              style={styles.input}
              placeholder="712 345678"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={10}
            />
          </View>
        </View>

        <PasswordField
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            if (attemptsLeft !== null) setAttemptsLeft(null);
          }}
          containerStyle={styles.password}
          onSubmitEditing={handleSignIn}
          returnKeyType="go"
        />

        {attemptsLeft !== null && !blocked && lockedFor === 0 && (
          <Text style={styles.attempts}>
            {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} left before sign-in is locked for 10 minutes.
          </Text>
        )}

        {notice && (
          <View style={[styles.notice, notice.tone === 'error' ? styles.noticeError : styles.noticeInfo]}>
            <Ionicons
              name={notice.tone === 'error' ? 'alert-circle' : 'information-circle'}
              size={16}
              color={notice.tone === 'error' ? colors.danger : colors.inkSoft}
            />
            <Text style={[styles.noticeText, notice.tone === 'error' && styles.noticeTextError]}>{notice.text}</Text>
          </View>
        )}

        <PrimaryButton
          title={lockedFor > 0 ? `Try again in ${mmss}` : 'Sign In'}
          onPress={handleSignIn}
          loading={loading}
          disabled={lockedFor > 0}
          style={styles.signIn}
        />

        <Pressable
          onPress={() =>
            router.push({ pathname: '/forgot-password', params: { phone: toFullPhone(phone) } })
          }
          style={styles.forgotWrap}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Pressable>

        <View style={styles.signUpWrap}>
          <Text style={styles.signUpText}>New to FundiGrid? </Text>
          <Pressable onPress={() => router.push({ pathname: '/signup', params: { role: role ?? 'client' } })} hitSlop={8}>
            <Text style={styles.signUpLink}>Create account</Text>
          </Pressable>
        </View>

        <LegalFooter />

        <View style={styles.illustration}>
          <Image source={IMAGES.loginIllustration} style={styles.illustrationImg} resizeMode="cover" />
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
  body: { flex: 1, paddingHorizontal: spacing.xxl, paddingTop: spacing.xl },
  illustration: {
    width: SCREEN_WIDTH,
    marginLeft: -spacing.xxl,
    height: ILLUSTRATION_HEIGHT,
    flexShrink: 1,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginTop: 0,
    marginBottom: 0,
  },
  illustrationImg: { width: SCREEN_WIDTH, height: ILLUSTRATION_FULL_HEIGHT },
  h1: { fontFamily: fonts.bold, fontSize: 24, color: colors.ink },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkSoft,
    marginTop: spacing.xs,
  },
  phoneGroup: { marginTop: spacing.xxl, gap: 6 },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.ink },
  phoneRow: { flexDirection: 'row', gap: spacing.sm },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    height: 50,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  flag: { fontSize: 18 },
  code: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  input: {
    flex: 1,
    height: 50,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.regular,
    fontSize: 14.5,
    color: colors.ink,
  },
  password: { marginTop: spacing.xl },
  signIn: { marginTop: spacing.xl },
  attempts: { fontFamily: fonts.regular, fontSize: 12, color: colors.warning, marginTop: spacing.sm },
  notice: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  noticeError: { backgroundColor: colors.dangerSoft },
  noticeInfo: { backgroundColor: colors.primaryFaint },
  noticeText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft, lineHeight: 19 },
  noticeTextError: { color: colors.danger },
  forgotWrap: { paddingVertical: spacing.md, alignItems: 'center' },
  forgotText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft, textDecorationLine: 'underline' },
  signUpWrap: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.sm },
  signUpText: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
  signUpLink: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
});
