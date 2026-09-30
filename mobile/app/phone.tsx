import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import PrimaryButton from '../src/components/PrimaryButton';
import { IMAGES } from '../src/assets';
import { colors, fonts, radius, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendOtp } from '../src/services/api';

export default function PhoneScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: 'client' | 'fundi' }>();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (phone.length < 9) {
      Alert.alert('Invalid number', 'Please enter a valid phone number.');
      return;
    }
    setLoading(true);
    try {
      const fullPhone = `256${phone.replace(/\s/g, '')}`;
      // Try login first — if user doesn't exist, fall back to register
      try {
        await sendOtp(fullPhone, 'login');
        router.push({ pathname: '/otp', params: { role: role ?? 'client', phone: fullPhone, purpose: 'login' } });
      } catch (loginErr: any) {
        const msg = loginErr.message || '';
        if (msg.includes('not found') || msg.includes('Account not found') || msg.includes('No user')) {
          await sendOtp(fullPhone, 'register');
          router.push({ pathname: '/otp', params: { role: role ?? 'client', phone: fullPhone, purpose: 'register' } });
        } else {
          throw loginErr;
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.body}>
        <Text style={styles.h1}>Enter Your Phone Number</Text>
        <Text style={styles.sub}>We'll send a 4-digit OTP to verify your number.</Text>

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

        <PrimaryButton title="Send OTP" onPress={handleSendOtp} loading={loading} />

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.divText}>or</Text>
          <View style={styles.line} />
        </View>

        <PrimaryButton
          title="Continue with Google"
          variant="secondary"
          icon={<Image source={IMAGES.google} style={styles.googleIcon} resizeMode="contain" />}
        />

        <Text style={styles.terms}>
          By continuing, you agree to our{'\n'}
          <Text style={styles.link} onPress={() => router.push('/terms')}>
            Terms &amp; Conditions
          </Text>{' '}
          and <Text style={styles.link}>Privacy Policy</Text>.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: { height: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  backBtn: { position: 'absolute', left: spacing.xxl, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 85, height: 85 },
  googleIcon: { width: 20, height: 20 },
  body: { flex: 1, paddingHorizontal: spacing.xxl, paddingTop: spacing.xl },
  h1: { fontFamily: fonts.bold, fontSize: 24, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft, marginTop: 4 },
  phoneRow: { flexDirection: 'row', marginTop: spacing.xxl, marginBottom: spacing.xl, gap: spacing.sm },
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
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.xl },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  divText: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  terms: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 'auto', paddingTop: spacing.xxl, paddingBottom: spacing.xl, lineHeight: 20 },
  link: { fontFamily: fonts.semibold, color: colors.primary, textDecorationLine: 'underline' },
});
