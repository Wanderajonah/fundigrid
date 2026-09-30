import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import ProfileRow from '../../src/components/ProfileRow';
import PrimaryButton from '../../src/components/PrimaryButton';
import Screen from '../../src/components/Screen';
import { colors, fonts, radius, shadowSoft, spacing } from '../../src/theme';
import { useAuth } from '../../src/contexts/AuthContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, refreshUser } = useAuth();

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Details come from the account stored against this phone number. Only fall
  // back to the number itself if the profile was never completed.
  const displayName = user?.name?.trim() || user?.phone || 'Client';
  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/role');
        },
      },
    ]);
  };

  const handleRefer = async () => {
    try {
      await Share.share({
        message: 'Join me on FundiGrid — find and book trusted fundis near you.',
      });
    } catch {
      // The share sheet was dismissed or is unavailable on this device.
    }
  };

  return (
    <Screen bg={colors.white} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.h1}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Pressable
          onPress={() => router.push({ pathname: '/profile-setup', params: { mode: 'edit' } })}
          style={({ pressed }) => [styles.userCard, pressed && { opacity: 0.7 }]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">{displayName}</Text>
            {user?.phone ? (
              <Text style={styles.phone}>+{user.phone.slice(0, 3)} {user.phone.slice(3, 6)} {user.phone.slice(6)}</Text>
            ) : null}
            <Text style={styles.role}>{user?.role === 'fundi' ? 'Fundi' : 'Client'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>

        <View style={styles.group}>
          <ProfileRow
            onPress={handleRefer}
            icon={<Ionicons name="person-add-outline" size={24} color={colors.primary} />}
            title="Refer a Friend"
          />
          <ProfileRow
            divider
            onPress={() => router.push('/(tabs)/jobs')}
            icon={<Ionicons name="briefcase-outline" size={24} color={colors.primary} />}
            title="My Requests"
          />
          <ProfileRow
            divider
            onPress={() => router.push({ pathname: '/location', params: { from: 'profile' } })}
            icon={<Ionicons name="location-outline" size={24} color={colors.primary} />}
            title="Service Radius"
          />
          <ProfileRow
            divider
            onPress={() => router.push('/support')}
            icon={<Ionicons name="help-circle-outline" size={24} color={colors.primary} />}
            title="Help & Support"
          />
          <ProfileRow
            divider
            onPress={() => router.push('/settings')}
            icon={<Ionicons name="settings-outline" size={24} color={colors.primary} />}
            title="Settings"
          />
        </View>

        <View style={styles.logoutWrap}>
          <PrimaryButton
            variant="danger"
            title="Log Out"
            onPress={handleLogout}
            icon={<Ionicons name="log-out-outline" size={18} color={colors.danger} />}
          />
          <Text style={styles.version}>Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl },
  h1: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 36, color: colors.ink },
  body: { paddingHorizontal: spacing.xxl, paddingTop: spacing.xl, paddingBottom: spacing.xxxxl, gap: spacing.lg },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    ...shadowSoft,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 20, color: colors.primary },
  info: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.ink },
  phone: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.inkSoft },
  role: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  group: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    ...shadowSoft,
  },
  logoutWrap: { gap: spacing.md, paddingTop: spacing.sm },
  version: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: 'center' },
});
