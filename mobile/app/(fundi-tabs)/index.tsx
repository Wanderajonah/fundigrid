import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IMAGES } from '../../src/assets';
import { colors, fonts, radius, spacing, shadowSm } from '../../src/theme';
import { useAuth } from '../../src/contexts/AuthContext';
import { getProfile, getFundiBookings, acceptBooking, declineBooking } from '../../src/services/api';
import { startFundiLocationShare, stopFundiLocationShare } from '../../src/services/fundiLocation';

const ACTIVE_STATUSES = ['ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];

const QUICK_ACTIONS = [
  { icon: 'person-outline' as const, label: 'Update Profile', desc: 'Keep your information up to date', route: '/(fundi-tabs)/profile' },
  { icon: 'briefcase-outline' as const, label: 'My Jobs', desc: 'View and manage your job listings', route: '/(fundi-tabs)/nearby-jobs' },
  { icon: 'wallet-outline' as const, label: 'Earnings', desc: 'Track your income and payments', route: '/(fundi-tabs)/profile' },
  { icon: 'ellipsis-horizontal' as const, label: 'More', desc: 'Settings, support and more', route: '/(fundi-tabs)/profile' },
];

const TAGLINES = [
  'Ready for your next job?',
  'Let\'s get you earning today.',
  'Great work starts here.',
  'Your next gig is waiting.',
  'Time to build something great.',
];

export default function FundiDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const [profileData, bookingsData] = await Promise.all([
        getProfile(token),
        getFundiBookings(token).catch(() => ({ bookings: [] })),
      ]);
      setProfile(profileData.user ?? profileData);
      setBookings(Array.isArray(bookingsData) ? bookingsData : bookingsData.bookings ?? []);
    } catch (e: any) {
      console.log('Dashboard fetch error:', e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeBooking = bookings.find((b: any) => ACTIVE_STATUSES.includes(b.status));

  useEffect(() => {
    if (!token) return;
    const bookingId =
      activeBooking && (activeBooking.id || activeBooking._id)
        ? String(activeBooking.id || activeBooking._id)
        : undefined;
    if (!bookingId) {
      stopFundiLocationShare();
      return;
    }
    startFundiLocationShare({ token, bookingId });
    return () => stopFundiLocationShare();
  }, [token, activeBooking?.id, activeBooking?._id, activeBooking?.status]);

  const handleAccept = async (bookingId: string) => {
    if (!token) return;
    try {
      await acceptBooking(token, bookingId);
      Alert.alert('Accepted', 'You have accepted this booking.');
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to accept booking.');
    }
  };

  const handleDecline = async (bookingId: string) => {
    if (!token) return;
    try {
      await declineBooking(token, bookingId);
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to decline booking.');
    }
  };

  const displayName = (profile?.name || user?.name || '').trim();
  const nameInitial = displayName.charAt(0).toUpperCase() || 'U';
  const pendingBooking = bookings.find((b: any) => b.status === 'PENDING' || b.status === 'pending');
  const tagline = useMemo(() => TAGLINES[Math.floor(Math.random() * TAGLINES.length)], []);

  if (loading) {
    return (
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          hitSlop={12}
          accessibilityLabel="Open profile"
          onPress={() => router.push('/(fundi-tabs)/profile')}
          style={styles.avatarBtn}
        >
          {profile?.profilePhoto ? (
            <Image source={{ uri: profile.profilePhoto }} style={styles.avatar} resizeMode="cover" />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{nameInitial}</Text>
            </View>
          )}
        </Pressable>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
        <View style={styles.avatarBtn} accessibilityElementsHidden importantForAccessibility="no" />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <Image source={IMAGES.foreground} style={styles.foregroundBg} resizeMode="contain" />
          <View style={styles.welcomeText}>
            <Text style={styles.helloLabel}>Hello,</Text>
            <Text style={styles.fundiName}>{displayName || 'there'}</Text>
            <Text style={styles.profileText}>{tagline}</Text>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FFF3DD' }]}>
              <Ionicons name="briefcase-outline" size={15} color={colors.primaryDark} />
            </View>
            <Text style={styles.statValue}>{profile?.jobsCompleted ?? bookings.length}</Text>
            <Text style={styles.statLabel}>Total Jobs</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FFF8E0' }]}>
              <Ionicons name="star" size={15} color={colors.star} />
            </View>
            <Text style={styles.statValue}>{profile?.rating?.toFixed(1) ?? '0.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#E9F3FF' }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.blue} />
            </View>
            <Text style={styles.statValue}>{profile?.reviewCount ?? 0}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>

        {/* Pending Booking */}
        {pendingBooking && (
          <View style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <View style={styles.bookingDot} />
              <Text style={styles.bookingTitle}>New Client Request</Text>
            </View>
            <View style={styles.bookingBody}>
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingCategory}>{pendingBooking.category || 'Service Request'}</Text>
                <Text style={styles.bookingMeta}>{pendingBooking.address || pendingBooking.description?.slice(0, 50)}</Text>
              </View>
              {pendingBooking.proposedPrice && (
                <Text style={styles.bookingPrice}>UGX {pendingBooking.proposedPrice?.toLocaleString()}</Text>
              )}
            </View>
            <View style={styles.bookingActions}>
              <Pressable style={styles.declineBtn} onPress={() => handleDecline(pendingBooking.id)}>
                <Text style={styles.declineText}>Decline</Text>
              </Pressable>
              <Pressable style={styles.acceptBtn} onPress={() => handleAccept(pendingBooking.id)}>
                <Text style={styles.acceptText}>Accept</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />
          <View>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <Text style={styles.sectionDesc}>Access key features and manage your account</Text>
          </View>
        </View>

        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.label}
              style={styles.actionCard}
              onPress={() => router.push(action.route as any)}
            >
              <View style={styles.actionLeft}>
                <View style={styles.actionIconWrap}>
                  <Ionicons name={action.icon} size={20} color={colors.primary} />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                  <Text style={styles.actionDesc}>{action.desc}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.offWhite },
  header: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  logo: { width: 80, height: 36 },
  avatarBtn: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.primary },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxxl,
    gap: spacing.xl,
  },

  /* Welcome Card */
  welcomeCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 160,
    position: 'relative',
    marginHorizontal: -spacing.sm,
  },
  welcomeText: { flex: 1, zIndex: 1 },
  helloLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  fundiName: { fontFamily: fonts.bold, fontSize: 24, color: colors.ink },
  profileText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted, marginTop: 2 },
  foregroundBg: {
    position: 'absolute',
    right: -10,
    bottom: -155,
    width: 330,
    height: 420,
    zIndex: 0,
    opacity: 0.4,
  },

  /* Stats */
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...shadowSm,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.ink, letterSpacing: -0.5 },
  statLabel: { fontFamily: fonts.medium, fontSize: 9, color: colors.inkSoft, textAlign: 'center' },

  /* Booking */
  bookingCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  bookingHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bookingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  bookingTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  bookingBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bookingInfo: { flex: 1, gap: 2 },
  bookingCategory: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  bookingMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  bookingPrice: { fontFamily: fonts.bold, fontSize: 16, color: colors.primary },
  bookingActions: { flexDirection: 'row', gap: spacing.md },
  declineBtn: {
    flex: 1,
    height: 42,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkSoft },
  acceptBtn: {
    flex: 1,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.white },

  /* Section Header */
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sectionAccent: { width: 3, height: 28, borderRadius: 2, backgroundColor: colors.primary },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  sectionDesc: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },

  /* Quick Actions */
  actionsGrid: { gap: spacing.md },
  actionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, flex: 1 },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextWrap: { flex: 1 },
  actionLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  actionDesc: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, marginTop: 2 },
});
