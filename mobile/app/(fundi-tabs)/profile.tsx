import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import ProfileRow from '../../src/components/ProfileRow';
import PrimaryButton from '../../src/components/PrimaryButton';
import Screen from '../../src/components/Screen';
import VerifiedBadge from '../../src/components/VerifiedBadge';
import RatingStars from '../../src/components/RatingStars';
import { colors, fonts, radius, shadowSoft, spacing } from '../../src/theme';
import { useAuth } from '../../src/contexts/AuthContext';
import { updateProfile } from '../../src/services/api';

const MAX_PHOTOS = 6;

export default function FundiProfileScreen() {
  const router = useRouter();
  const { user, token, signOut, refreshUser } = useAuth();
  const [savingWork, setSavingWork] = useState(false);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Details come from the account stored against this phone number. Only fall
  // back to the number itself if the profile was never completed.
  const displayName = user?.name?.trim() || user?.phone || 'Fundi account';
  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const trades = user?.skills?.join(' • ') || 'No trades set';

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

  const portfolio = user?.portfolioImages ?? [];

  const savePortfolio = async (next: string[]) => {
    if (!token) return false;
    setSavingWork(true);
    try {
      await updateProfile(token, { portfolioImages: next });
      await refreshUser();
      return true;
    } catch (e: any) {
      Alert.alert('Could not save', e?.message || 'Please try again.');
      return false;
    } finally {
      setSavingWork(false);
    }
  };

  const addWorkPhotos = async () => {
    if (!token || savingWork) return;
    if (portfolio.length >= MAX_PHOTOS) {
      Alert.alert('Limit reached', 'Clients see up to 6 work photos.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to show your work.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - portfolio.length,
      quality: 0.4,
      base64: true,
    });
    if (result.canceled) return;
    const picked = (result.assets ?? [])
      .filter((a) => a.base64)
      .map((a) => `data:image/jpeg;base64,${a.base64}`);
    if (picked.length === 0) {
      Alert.alert('Could not read that photo', 'Try a different image.');
      return;
    }
    await savePortfolio([...portfolio, ...picked].slice(0, MAX_PHOTOS));
  };

  const removeWorkPhoto = (index: number) => {
    Alert.alert('Remove photo', 'Delete this photo from your previous work?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => savePortfolio(portfolio.filter((_, i) => i !== index)),
      },
    ]);
  };

  const editProfile = () => router.push({ pathname: '/profile-setup', params: { mode: 'edit' } });

  return (
    <Screen bg={colors.white} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.h1}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Pressable onPress={editProfile} style={({ pressed }) => [styles.userCard, pressed && { opacity: 0.7 }]}>
          {user?.profilePhoto ? (
            <Image source={{ uri: user.profilePhoto }} style={styles.avatar} resizeMode="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarFallbackText}>{initials}</Text>
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">{displayName}</Text>
            {user?.phone ? (
              <Text style={styles.phone}>+{user.phone.slice(0, 3)} {user.phone.slice(3, 6)} {user.phone.slice(6)}</Text>
            ) : null}
            <Text style={styles.role}>{user?.role === 'fundi' ? 'Fundi' : 'Client'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>

        <View style={styles.statsCard}>
          <View style={styles.statsTop}>
            <RatingStars rating={user?.rating || 0} showCount count={user?.reviewCount || 0} />
            <VerifiedBadge />
          </View>
          <Text style={styles.trades}>{trades}</Text>
        </View>

        <View style={styles.workCard}>
          <Text style={styles.workTitle}>My previous work</Text>
          <Text style={styles.workHint}>
            Clients book you faster when they can see finished jobs. Up to {MAX_PHOTOS} photos.
          </Text>
          <View style={styles.workGrid}>
            {portfolio.map((uri: string, index: number) => (
              <View key={`${index}-${uri.slice(0, 24)}`} style={styles.workThumbWrap}>
                <Image source={{ uri }} style={styles.workThumb} />
                <Pressable style={styles.workRemove} onPress={() => removeWorkPhoto(index)} hitSlop={8}>
                  <Ionicons name="close" size={13} color={colors.white} />
                </Pressable>
              </View>
            ))}
            {portfolio.length < MAX_PHOTOS && (
              <Pressable
                style={[styles.workThumb, styles.workTile, savingWork && { opacity: 0.5 }]}
                onPress={addWorkPhotos}
                disabled={savingWork}
              >
                <Ionicons name="camera-outline" size={22} color={colors.primary} />
                <Text style={styles.workTileText}>{savingWork ? 'Saving…' : 'Add'}</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.group}>
          <ProfileRow
            divider={false}
            onPress={editProfile}
            icon={<Ionicons name="person-outline" size={24} color={colors.primary} />}
            title="Edit Profile"
          />
          <ProfileRow
            divider
            onPress={() => router.push('/(fundi-tabs)/nearby-jobs')}
            icon={<Ionicons name="briefcase-outline" size={24} color={colors.primary} />}
            title="My Jobs"
          />
          <ProfileRow
            divider
            icon={<Ionicons name="wallet-outline" size={24} color={colors.primary} />}
            title="Earnings"
          />
          <ProfileRow
            divider
            icon={<Ionicons name="notifications-outline" size={24} color={colors.primary} />}
            title="Notifications"
          />
          <ProfileRow
            divider
            onPress={() => router.push('/support')}
            icon={<Ionicons name="help-circle-outline" size={24} color={colors.primary} />}
            title="Help & Support"
          />
          <ProfileRow
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
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontFamily: fonts.bold, fontSize: 20, color: colors.primary },
  info: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.ink },
  phone: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.inkSoft },
  role: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  statsCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
    ...shadowSoft,
  },
  statsTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  trades: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  group: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    ...shadowSoft,
  },
  workCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadowSoft,
  },
  workTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  workHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, lineHeight: 17 },
  workGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  workThumbWrap: { position: 'relative' },
  workThumb: { width: 92, height: 92, borderRadius: radius.md, backgroundColor: colors.lightBg },
  workTile: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  workTileText: { fontFamily: fonts.medium, fontSize: 11, color: colors.primary },
  workRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  logoutWrap: { gap: spacing.md, paddingTop: spacing.sm },
  version: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: 'center' },
});
