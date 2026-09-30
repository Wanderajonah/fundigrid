import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import ProfileRow from '../src/components/ProfileRow';
import Screen from '../src/components/Screen';
import { IMAGES } from '../src/assets';
import { colors, fonts, radius, spacing, shadowSoft } from '../src/theme';
import { useAuth } from '../src/contexts/AuthContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const roleLabel = user?.role === 'fundi' ? 'Fundi' : 'Client';

  const handleChangeNumber = () => {
    Alert.alert(
      'Change number',
      'We will send a new OTP to confirm your new number. You will be signed out on this device first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            const role = user?.role ?? 'client';
            await signOut();
            router.replace({ pathname: '/phone', params: { role } });
          },
        },
      ],
    );
  };

  const handleLocation = async () => {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert('Unable to open settings', 'Open your phone settings manually to allow location.');
    }
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen bg={colors.white} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Settings</Text>

        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.group}>
          <ProfileRow
            onPress={() => router.push({ pathname: '/profile-setup', params: { mode: 'edit' } })}
            icon={<Ionicons name="person-outline" size={24} color={colors.primary} />}
            title="Edit Profile"
          />
          <ProfileRow
            divider
            onPress={handleChangeNumber}
            icon={<Ionicons name="phone-portrait-outline" size={24} color={colors.primary} />}
            title="Change Number"
          />
          <ProfileRow
            divider
            showChevron={false}
            icon={<Ionicons name="swap-horizontal-outline" size={24} color={colors.primary} />}
            title="Account Type"
            right={<Text style={styles.rowValue}>{roleLabel}</Text>}
          />
        </View>

        <Text style={styles.sectionLabel}>App</Text>
        <View style={styles.group}>
          <ProfileRow
            onPress={handleLocation}
            icon={<Ionicons name="location-outline" size={24} color={colors.primary} />}
            title="Location Access"
            subtitle="Opens your phone settings"
          />
          <ProfileRow
            divider
            onPress={() => router.push('/terms')}
            icon={<Ionicons name="document-text-outline" size={24} color={colors.primary} />}
            title="Terms & Conditions"
          />
          <ProfileRow
            divider
            showChevron={false}
            icon={<Ionicons name="information-circle-outline" size={24} color={colors.primary} />}
            title="App Version"
            right={<Text style={styles.rowValue}>v{appVersion}</Text>}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { height: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  backBtn: { position: 'absolute', left: spacing.xxl, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 85, height: 85 },
  body: { paddingHorizontal: spacing.xxl, paddingTop: spacing.md, paddingBottom: spacing.xxxxl, gap: spacing.lg },
  h1: { fontFamily: fonts.bold, fontSize: 24, color: colors.ink },
  sectionLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted, marginTop: spacing.sm },
  group: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    ...shadowSoft,
  },
  rowValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft },
});
