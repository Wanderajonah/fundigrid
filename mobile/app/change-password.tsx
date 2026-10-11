import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import PrimaryButton from '../src/components/PrimaryButton';
import PasswordField from '../src/components/PasswordField';
import { IMAGES } from '../src/assets';
import { colors, fonts, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/contexts/AuthContext';
import { setPassword } from '../src/services/api';
import { PASSWORD_MESSAGE, validatePassword } from '../src/services/passwordRules';
import { goBackSafe } from '../src/services/navigation';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { token, hasPassword, applySession } = useAuth();

  const [current, setCurrent] = useState('');
  const [password, setPasswordValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async () => {
    if (!token) {
      Alert.alert('Session expired', 'Please sign in again.');
      return;
    }
    if (!validatePassword(password)) {
      setError(PASSWORD_MESSAGE);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (hasPassword && !current) {
      setError('Enter your current password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await setPassword(token, password, hasPassword ? current : undefined);
      applySession(res);
      Alert.alert('Password updated', 'Use your new password the next time you sign in.');
      goBackSafe('/settings');
    } catch (e: any) {
      setError(e.message || 'Could not update the password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => goBackSafe('/settings')} hitSlop={12} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.body}>
        <Text style={styles.h1}>Change Password</Text>
        <Text style={styles.sub}>Use at least 8 characters with upper and lower case letters, a number and a symbol.</Text>

        {hasPassword && (
          <PasswordField
            label="Current password"
            placeholder="Enter current password"
            value={current}
            onChangeText={(t) => {
              setCurrent(t);
              setError(null);
            }}
            containerStyle={styles.field}
            autoComplete="password"
          />
        )}
        <PasswordField
          label="New password"
          placeholder="Enter a new password"
          value={password}
          onChangeText={(t) => {
            setPasswordValue(t);
            setError(null);
          }}
          showRules
          containerStyle={styles.field}
        />
        <PasswordField
          label="Confirm new password"
          placeholder="Re-enter the new password"
          value={confirm}
          onChangeText={(t) => {
            setConfirm(t);
            setError(null);
          }}
          containerStyle={styles.field}
          onSubmitEditing={handleChange}
          returnKeyType="go"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <PrimaryButton title="Update Password" onPress={handleChange} loading={loading} style={styles.submit} />
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
