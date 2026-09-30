import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { IMAGES } from '../../src/assets';
import { colors, fonts, radius, spacing } from '../../src/theme';
import VerifiedBadge from '../../src/components/VerifiedBadge';
import RatingStars from '../../src/components/RatingStars';
import { useAuth } from '../../src/contexts/AuthContext';
import { updateProfile } from '../../src/services/api';

const MENU_ITEMS = [
  { icon: 'person-outline' as const, label: 'Edit Profile' },
  { icon: 'wallet-outline' as const, label: 'Earnings' },
  { icon: 'briefcase-outline' as const, label: 'My Jobs' },
  { icon: 'notifications-outline' as const, label: 'Notifications' },
  { icon: 'help-circle-outline' as const, label: 'Help & Support' },
  { icon: 'log-out-outline' as const, label: 'Log Out', danger: true },
];

const MAX_PHOTOS = 6;

export default function FundiProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, signOut, refreshUser } = useAuth();
  const [savingWork, setSavingWork] = useState(false);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const displayName = user?.name?.trim() || user?.phone || 'Fundi account';
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

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          {user?.profilePhoto ? (
            <Image source={{ uri: user.profilePhoto }} style={styles.avatar} resizeMode="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarFallbackText}>{initials}</Text>
            </View>
          )}
          <Text style={styles.name}>{displayName}</Text>
          <VerifiedBadge />
          <RatingStars rating={user?.rating || 0} showCount count={user?.reviewCount || 0} />
          <Text style={styles.trade}>{user?.skills?.join(' • ') || 'No trades set'}</Text>
        </View>

        <View style={styles.workCard}>
          <View style={styles.workHeader}>
            <Text style={styles.workTitle}>My previous work</Text>
            <Pressable style={styles.workAddBtn} onPress={addWorkPhotos} disabled={savingWork} hitSlop={8}>
              <Ionicons name="add" size={15} color={colors.ink} />
              <Text style={styles.workAddLabel}>{savingWork ? 'Saving…' : 'Add photos'}</Text>
            </Pressable>
          </View>
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
                <Text style={styles.workTileText}>Add</Text>
              </Pressable>
            )}
          </View>
          {portfolio.length === 0 && <Text style={styles.workEmpty}>No photos yet — add a few of your best jobs.</Text>}
        </View>

        <View style={styles.menu}>
          {MENU_ITEMS.map((item) => (
            <Pressable key={item.label} style={styles.menuItem} onPress={item.danger ? handleLogout : undefined}>
              <View style={styles.menuLeft}>
                <Ionicons name={item.icon} size={20} color={item.danger ? colors.danger : colors.inkSoft} />
                <Text style={[styles.menuLabel, item.danger && { color: colors.danger }]}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: {
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  logo: { width: 80, height: 48 },
  content: { paddingHorizontal: spacing.xxl, paddingTop: spacing.xl, paddingBottom: spacing.xxxxl, gap: spacing.xl },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.lightBg },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  avatarFallbackText: { fontFamily: fonts.bold, fontSize: 24, color: colors.primary },
  name: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  trade: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  workCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  workHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  workTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  workAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  workAddLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
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
  workEmpty: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: spacing.xs },
  menu: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  menuLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
});
