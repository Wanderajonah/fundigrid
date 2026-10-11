import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import PrimaryButton from '../src/components/PrimaryButton';
import PasswordField from '../src/components/PasswordField';
import { IMAGES } from '../src/assets';
import { colors, fonts, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/contexts/AuthContext';
import { resetPassword } from '../src/services/api';
import { PASSWORD_MESSAGE, validatePassword } from '../src/services/passwordRules';
import { goBackSafe } from '../src/services/navigation';
import { formatUgPhone } from '../src/services/phone';

// Final step of the reset: the code from the SMS plus a brand new password.
// Success signs the user in and clears any lockout on the account.
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { phone, code, role } = useLocalSearchParams<{ phone?: string; code?: string; role?: string }>();
  const { applySession } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    if (!validatePassword(password)) {
      setError(PASSWORD_MESSAGE);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!phone || !code) {
      setError('Missing verification code — request a new one.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await resetPassword(phone, code, password);
      applySession(res);
      const landingRole = res?.user?.role || role || 'client';
      router.replace(landingRole === 'fundi' ? '/(fundi-tabs)' : '/(tabs)');
    } catch (e: any) {
      const expired = /expired|No OTP found/i.test(e?.message || '');
      setError(e.message || 'Could not reset the password.');
      if (expired) {
        Alert.alert('Code expired', 'Request a new code and try again.', [
          { text: 'OK', onPress: () => router.replace('/forgot-password') },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => goBackSafe('/phone')} hitSlop={12} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.body}>
        <Text style={styles.h1}>Set a New Password</Text>
        <Text style={styles.sub}>
          Code verified for {formatUgPhone(phone) || 'your number'}. Choose a password you haven't used before.
        </Text>

        <PasswordField
          label="New password"
          placeholder="Enter a new password"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setError(null);
          }}
          showRules
          containerStyle={styles.field}
        />
        <PasswordField
          label="Confirm password"
          placeholder="Re-enter the new password"
          value={confirm}
          onChangeText={(t) => {
            setConfirm(t);
            setError(null);
          }}
          containerStyle={styles.field}
          onSubmitEditing={handleReset}
          returnKeyType="go"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <PrimaryButton title="Reset Password" onPress={handleReset} loading={loading} style={styles.submit} />
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
  field: { marginTop: spacing.lg },
  error: { fontFamily: fonts.regular, fontSize: 13, color: colors.danger, marginTop: spacing.md },
  submit: { marginTop: spacing.xl },
});
