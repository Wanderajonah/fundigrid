import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import PrimaryButton from '../src/components/PrimaryButton';
import { IMAGES } from '../src/assets';
import { colors, fonts, radius, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendOtp } from '../src/services/api';
import { toFullPhone } from '../src/services/phone';
import { goBackSafe } from '../src/services/navigation';

// Step 1 of the password reset: ask for the number, send the code. The
// endpoint never says whether an account exists, so the copy doesn't either.
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { phone: phoneParam } = useLocalSearchParams<{ phone?: string }>();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const fullPhone = toFullPhone(phone);
    if (fullPhone.length < 9) {
      Alert.alert('Invalid number', 'Please enter a valid phone number.');
      return;
    }
    setLoading(true);
    try {
      await sendOtp(fullPhone, 'reset');
      router.push({ pathname: '/otp', params: { phone: fullPhone, purpose: 'reset' } });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send the code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Prefill what came from the sign-in screen, but let it be edited.
  React.useEffect(() => {
    if (phoneParam) setPhone(phoneParam.replace(/^256/, '0').replace(/\s/g, ''));
  }, [phoneParam]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => goBackSafe('/phone')} hitSlop={12} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.body}>
        <Text style={styles.h1}>Forgot Password</Text>
        <Text style={styles.sub}>
          Enter your phone number and we'll send a code to set a new password.
        </Text>

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

        <PrimaryButton title="Send Code" onPress={handleSend} loading={loading} />

        <Pressable onPress={() => goBackSafe('/phone')} style={styles.backWrap}>
          <Text style={styles.backText}>Back to sign in</Text>
        </Pressable>
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
  h1: { fontFamily: fonts.bold, fontSize: 24, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft, marginTop: 4, lineHeight: 20 },
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
  backWrap: { alignItems: 'center', paddingVertical: spacing.lg, marginTop: spacing.sm },
  backText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
});
