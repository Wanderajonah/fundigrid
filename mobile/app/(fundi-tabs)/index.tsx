import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IMAGES } from '../../src/assets';
import { colors, fonts, radius, spacing, shadowSm } from '../../src/theme';
import { useAuth } from '../../src/contexts/AuthContext';
import { getProfile, updateProfile, getFundiBookings } from '../../src/services/api';
import { startFundiLocationShare, stopFundiLocationShare } from '../../src/services/fundiLocation';

const ACTIVE_STATUSES = ['ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];

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

  // Refetch on every focus so a request answered in the detail screen is gone
  // from the dashboard as soon as the fundi comes back.
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

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

  const displayName = (profile?.name || user?.name || '').trim();
  const firstName = (profile?.firstName || user?.firstName || displayName.split(' ')[0] || '').trim();
  const nameInitial = displayName.charAt(0).toUpperCase() || 'U';
  const isOnline = profile?.isOnline === true;
  const pendingBooking = bookings.find((b: any) => b.status === 'PENDING' || b.status === 'pending');
  const tagline = useMemo(() => TAGLINES[Math.floor(Math.random() * TAGLINES.length)], []);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const completedBookings = bookings.filter((b: any) => b.status === 'COMPLETED');
  const earningsToday = bookings
    .filter((b: any) => b.status === 'COMPLETED' && b.completedAt && new Date(b.completedAt) >= startOfDay)
    .reduce((sum: number, b: any) => sum + Number(b.agreedPrice ?? b.proposedPrice ?? 0), 0);
  // The profile counter is the source of truth; the live list covers rows
  // finished before the counter existed.
  const jobsDone = Math.max(Number(profile?.jobsCompleted ?? 0), completedBookings.length);
  const ratingValue = Number(profile?.rating ?? 0);
  const ratingText = ratingValue > 0 ? ratingValue.toFixed(1) : '0';

  const setPresence = async (next: boolean) => {
    if (!token) return;
    const previous = profile;
    setProfile((p: any) => (p ? { ...p, isOnline: next } : p));
    try {
      await updateProfile(token, { isOnline: next });
    } catch (e: any) {
      setProfile(previous);
      Alert.alert('Could not update', e.message || 'Please try again.');
    }
  };

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
            <Text style={styles.fundiName}>{firstName || 'there'}</Text>
            <Text style={styles.profileText}>{tagline}</Text>
          </View>
        </View>

        {/* Online / Offline */}
        <View style={styles.onlineCard}>
          <View style={styles.onlineInfo}>
            <View style={styles.onlineTitleRow}>
              <View style={[styles.onlineDot, !isOnline && styles.onlineDotOff]} />
              <Text style={styles.onlineTitle}>{isOnline ? "You're online" : "You're offline"}</Text>
            </View>
            <Text style={styles.onlineSub}>
              {isOnline
                ? 'Nearby clients can see you and send booking requests.'
                : 'Go online to receive booking requests from clients.'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={setPresence}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
            ios_backgroundColor={colors.border}
            accessibilityLabel="Toggle online status"
          />
        </View>

        {/* Statistics */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9}>
              Earnings today
            </Text>
            <Text style={styles.statValueAccent} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              UGX {earningsToday.toLocaleString()}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel} numberOfLines={1}>Jobs done</Text>
            <Text style={styles.statValue}>{jobsDone}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel} numberOfLines={1}>Rating</Text>
            <Text style={styles.statValue}>{ratingText}</Text>
          </View>
        </View>

        {/* A live client request takes this slot over from the presence card */}
        {pendingBooking ? (
          <Pressable
            style={styles.bookingCard}
            onPress={() =>
              router.push({
                pathname: '/fundi-job-details',
                params: { bookingId: String(pendingBooking.id || pendingBooking._id) },
              })
            }
          >
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
              <Text style={styles.bookingHint}>Read the full brief before you respond</Text>
              <View style={styles.bookingCta}>
                <Text style={styles.bookingCtaText}>View details</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.white} />
              </View>
            </View>
          </Pressable>
        ) : (
          <View style={styles.statusCard}>
            <View style={styles.statusIconCircle}>
              <Ionicons
                name={isOnline ? 'radio' : 'radio-outline'}
                size={34}
                color={isOnline ? colors.primary : colors.muted}
              />
            </View>
            <Text style={styles.statusTitle}>{isOnline ? "You're online" : "You're offline"}</Text>
            <Text style={styles.statusSub}>
              {isOnline
                ? 'Keep yourself online to receive booking requests from clients.'
                : 'Go online to receive booking requests from clients.'}
            </Text>
          </View>
        )}
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
    opacity: 0.8,
  },

  /* Stats */
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 84,
    ...shadowSm,
  },
  statLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: -0.2,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  statValue: {
    fontFamily: fonts.extrabold,
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  statValueAccent: {
    fontFamily: fonts.extrabold,
    fontSize: 17,
    color: colors.primary,
    letterSpacing: -0.3,
    textAlign: 'center',
  },

  /* Presence status */
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 260,
    justifyContent: 'center',
    ...shadowSm,
  },
  statusIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statusTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink },
  statusSub: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },

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
  bookingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bookingHint: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  bookingCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    height: 38,
    borderRadius: radius.pill,
  },
  bookingCtaText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.white },

  /* Online / Offline */
  onlineCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadowSm,
  },
  onlineInfo: { flex: 1, gap: spacing.xs },
  onlineTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  onlineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.success },
  onlineDotOff: { backgroundColor: colors.muted },
  onlineTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  onlineSub: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.muted },
});
