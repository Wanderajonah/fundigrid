import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { ScrollView as ScrollViewType } from 'react-native';
import Screen from '../../src/components/Screen';
import { IMAGES } from '../../src/assets';
import { REQUESTABLE_CATEGORIES, categoryLabel, categoryImage } from '../../src/data/categories';
import { getClientBookings } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { colors, fonts, radius, shadowSoft, spacing } from '../../src/theme';

const SERVICES = REQUESTABLE_CATEGORIES.filter((c) => c.image).map((c) => ({
  image: c.image as number,
  label: c.label,
}));

const RECENT_STATUS: Record<string, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  ON_THE_WAY: 'On the Way',
  ARRIVED: 'Arrived',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  DISPUTED: 'Disputed',
};

function formatDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// The current mobile app has no wallet store or API client. Keep this null until
// the authenticated wallet response is connected, rather than displaying a mock balance.
const walletBalance: number | null = null;

export default function ClientHome() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const [recent, setRecent] = useState<any[]>([]);
  const { token, user, refreshUser } = useAuth();
  const scrollRef = useRef<ScrollViewType>(null);
  const cardWidth = Math.max(width - spacing.md * 2, 0);
  const displayedBalance = walletBalance == null ? (isBalanceVisible ? 'UGX 000' : '*****') : isBalanceVisible ? `UGX ${walletBalance.toLocaleString()}` : '*****';
  const profileInitials = (user?.name?.trim() || user?.phone || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!token) {
      setRecent([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const data = await getClientBookings(token);
        const rows = Array.isArray(data) ? data : (data?.bookings ?? []);
        if (alive) setRecent(rows.slice(0, 3));
      } catch {
        if (alive) setRecent([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  // Keep the header avatar in sync with the profile saved during onboarding.
  useEffect(() => {
    if (token) refreshUser();
  }, [token, refreshUser]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % 3;
        scrollRef.current?.scrollTo({ x: next * cardWidth, animated: true });
        return next;
      });
    }, 7000);
    return () => clearInterval(interval);
  }, [cardWidth]);

  return (
    <Screen bg={colors.white} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          hitSlop={12}
          accessibilityLabel="Open profile"
          onPress={() => router.push('/(tabs)/profile')}
          style={styles.headerAvatarBtn}
        >
          {user?.profilePhoto ? (
            <Image source={{ uri: user.profilePhoto }} style={styles.headerAvatar} resizeMode="cover" />
          ) : (
            <View style={styles.headerAvatarFallback}>
              <Text style={styles.headerAvatarText}>{profileInitials}</Text>
            </View>
          )}
        </Pressable>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
        <Pressable hitSlop={12} accessibilityLabel="Notifications" style={styles.headerButton}>
          <Ionicons name="notifications-outline" size={23} color={colors.ink} />
          <View style={styles.notificationDot} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.searchBar} accessibilityRole="search">
          <Ionicons name="search" size={20} color={colors.inkSoft} />
          <Text style={styles.searchPlaceholder}>Search services or location...</Text>
          <View style={styles.filterIcon}><Ionicons name="options-outline" size={19} color={colors.ink} /></View>
        </Pressable>

        <View style={styles.walletCard}>
          <View style={styles.walletGlowOne} /><View style={styles.walletGlowTwo} />
          <View style={styles.walletMain}>
            <View style={styles.walletTitleRow}>
              <View style={styles.walletIcon}><Ionicons name="wallet-outline" size={22} color={colors.ink} /></View>
              <Text style={styles.walletTitle}>Fundi Wallet</Text>
            </View>
            <View style={styles.balanceRow}>
              <Text style={styles.balance}>{displayedBalance}</Text>
              <Pressable onPress={() => setIsBalanceVisible((visible) => !visible)} hitSlop={10} accessibilityLabel="Toggle wallet balance visibility">
                <Ionicons name={isBalanceVisible ? 'eye-outline' : 'eye-off-outline'} size={19} color="#FFFFFF" />
              </Pressable>
            </View>
            <Text style={styles.availableBalance}>Available balance</Text>
          </View>
          <Pressable style={styles.addFunds} accessibilityLabel="Add funds" disabled>
            <View style={styles.addFundsIcon}><Ionicons name="add" size={24} color={colors.ink} /></View>
            <Text style={styles.addFundsText}>Add Funds</Text>
          </Pressable>
        </View>

        <View>
          <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} decelerationRate="fast" style={{ overflow: 'hidden', borderRadius: 26 }} onMomentumScrollEnd={(event) => setActiveSlide(Math.round(event.nativeEvent.contentOffset.x / cardWidth))}>
            <LinearGradient colors={[colors.primary, '#FFBB3E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { width: cardWidth }]}>
              <View style={styles.heroWaveOne} /><View style={styles.heroWaveTwo} />
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle} numberOfLines={2}>Reliable Skilled{`\n`}Professionals</Text>
                <Text style={styles.heroText}>Plumbing, electrical, carpentry and more — right at your fingertips.</Text>
                <Pressable onPress={() => router.push('/request-job')} style={styles.heroCta}><Text style={styles.heroCtaText}>Request a Job</Text><Ionicons name="arrow-forward" size={16} color={colors.ink} /></Pressable>
              </View>
              <Image source={IMAGES.sliderAvatar} style={styles.heroFundi} resizeMode="contain" />
            </LinearGradient>
            <LinearGradient colors={[colors.ink, '#26364A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { width: cardWidth }]}>
              <View style={styles.heroCopy}>
                <Text style={[styles.heroTitle, { color: colors.white }]} numberOfLines={2}>Help is closer{`\n`}than you think</Text>
                <Text style={[styles.heroText, { color: '#D7DEE7' }]}>Find skilled Fundis nearby, get estimates, and book with confidence.</Text>
                <Pressable onPress={() => router.push('/available-fundis')} style={styles.heroCta}><Text style={styles.heroCtaText}>Find a Fundi</Text><Ionicons name="arrow-forward" size={16} color={colors.ink} /></Pressable>
              </View>
              <MaterialCommunityIcons name="map-marker-radius-outline" size={116} color="rgba(255,255,255,0.13)" style={styles.heroPattern} />
            </LinearGradient>
            <LinearGradient colors={['#FFF4DD', '#FFE1A7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { width: cardWidth }]}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle} numberOfLines={2}>Simple requests.{`\n`}Trusted work.</Text>
                <Text style={styles.heroText}>Tell us what you need, compare nearby fundis, and book the one you trust.</Text>
                <Pressable onPress={() => router.push('/request-job')} style={styles.heroCta}><Text style={styles.heroCtaText}>Start a Request</Text><Ionicons name="arrow-forward" size={16} color={colors.ink} /></Pressable>
              </View>
              <MaterialCommunityIcons name="clipboard-check-outline" size={110} color="rgba(17,17,17,0.10)" style={styles.heroPattern} />
            </LinearGradient>
          </ScrollView>
          <View style={styles.pagination}>{[0, 1, 2].map((index) => <View key={index} style={[styles.dot, activeSlide === index && styles.dotActive]} />)}</View>
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Quick Services</Text><Pressable onPress={() => router.push('/request-job')} style={styles.sectionLink}><Text style={styles.sectionLinkText}>View All</Text><Ionicons name="chevron-forward" size={15} color={colors.primaryDark} /></Pressable></View>
        <View style={styles.services}>
          {SERVICES.map((service) => (
            <Pressable key={service.label} onPress={() => router.push({ pathname: '/request-job', params: { service: service.label } })} style={styles.serviceItem}>
              <View style={styles.serviceIcon}><Image source={service.image} style={styles.serviceImage} resizeMode="contain" /></View>
              <Text style={styles.serviceLabel}>{service.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Recent Requests</Text><Pressable onPress={() => router.push('/(tabs)/jobs')} style={styles.sectionLink}><Text style={styles.sectionLinkText}>See All</Text><Ionicons name="chevron-forward" size={15} color={colors.primaryDark} /></Pressable></View>
        {recent.length === 0 ? (
          <Pressable onPress={() => router.push('/request-job')} style={styles.requestCard}>
            <View style={styles.requestIcon}><Ionicons name="briefcase-outline" size={22} color={colors.primaryDark} /></View>
            <View style={styles.requestDetails}>
              <Text style={styles.requestTitle}>No requests yet</Text>
              <Text style={styles.requestMeta}>Tap here to send your first request</Text>
            </View>
          </Pressable>
        ) : (
          recent.map((b) => {
            const image = categoryImage(b.category);
            const when = formatDate(b.scheduledFor) || formatDate(b.created_at);
            return (
              <Pressable key={String(b.id)} onPress={() => router.push('/(tabs)/jobs')} style={styles.requestCard}>
                <View style={styles.requestIcon}>
                  {image ? <Image source={image} style={styles.requestImage} resizeMode="contain" /> : <Ionicons name="briefcase-outline" size={22} color={colors.primaryDark} />}
                </View>
                <View style={styles.requestDetails}>
                  <View style={styles.requestTitleRow}>
                    <Text style={styles.requestTitle}>{categoryLabel(b.category) || 'Service request'}</Text>
                    <View style={styles.statusBadge}><Text style={styles.statusText}>{RECENT_STATUS[b.status] || b.status}</Text></View>
                  </View>
                  {b.address ? <Text style={styles.requestLocation}>{b.address}</Text> : null}
                  {when ? <Text style={styles.requestMeta}>Requested • {when}</Text> : null}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 60, paddingHorizontal: spacing.xxl }, headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, logo: { width: 92, height: 54 },
  headerAvatarBtn: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerAvatarFallback: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.primary }, notificationDot: { position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary, borderWidth: 1.5, borderColor: colors.white },
  content: { paddingHorizontal: spacing.xxl, paddingTop: spacing.sm, paddingBottom: spacing.xxxxl, gap: spacing.xl }, searchBar: { height: 56, borderRadius: 18, backgroundColor: '#F7F8FA', flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingLeft: spacing.lg, paddingRight: 6, borderWidth: 1, borderColor: '#EEF0F3' }, searchPlaceholder: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.muted }, filterIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', ...shadowSoft },
  walletCard: { minHeight: 80, borderRadius: 14, backgroundColor: '#162235', padding: spacing.sm, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' }, walletGlowOne: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(245,166,35,0.17)', right: 40, top: -45 }, walletGlowTwo: { position: 'absolute', width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.05)', right: -15, bottom: -20 }, walletMain: { flex: 1, gap: 1 }, walletTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, walletIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }, walletTitle: { fontFamily: fonts.semibold, fontSize: 11, color: '#E8EDF3' }, balanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2, paddingLeft: 32 }, balance: { fontFamily: fonts.bold, fontSize: 17, color: colors.white, letterSpacing: -0.4 }, availableBalance: { fontFamily: fonts.regular, fontSize: 9, color: '#AEB9C8', paddingLeft: 32 }, addFunds: { alignItems: 'center', gap: 3, marginLeft: spacing.sm, opacity: 0.72 }, addFundsIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, addFundsText: { fontFamily: fonts.medium, fontSize: 8, color: colors.white },
  hero: { height: 200, borderRadius: 26, marginRight: spacing.md, position: 'relative' }, heroWaveOne: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.22)', right: -99, top: -53 }, heroWaveTwo: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.17)', right: -50, bottom: -132 }, heroCopy: { width: '61%', zIndex: 2, padding: spacing.xl, flex: 1, justifyContent: 'flex-end' }, heroTitle: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 25, color: colors.ink, letterSpacing: -0.3 }, heroText: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: '#573C08', marginTop: spacing.sm }, heroCta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 9, marginTop: spacing.md }, heroCtaText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.ink }, heroFundi: { position: 'absolute', width: 380, height: 380, right: -10, bottom: -95, zIndex: 1 }, heroPattern: { position: 'absolute', right: -12, bottom: -13 }, pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: spacing.md }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D4D9DF' }, dotActive: { width: 19, backgroundColor: colors.primary },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sectionTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, letterSpacing: -0.2 }, sectionLink: { flexDirection: 'row', alignItems: 'center' }, sectionLinkText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primaryDark }, services: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.xl }, serviceItem: { width: '33.333%', alignItems: 'center', gap: spacing.sm }, serviceIcon: { width: 85, height: 85, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF3DD' }, serviceImage: { width: 52, height: 52 }, serviceLabel: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.inkSoft },
  requestCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.white, borderRadius: 20, padding: spacing.lg, ...shadowSoft },   requestIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFF3DD', alignItems: 'center', justifyContent: 'center' }, requestImage: { width: 28, height: 28 }, requestDetails: { flex: 1, gap: 3 }, requestTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, requestTitle: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.ink }, requestLocation: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.inkSoft }, requestMeta: { fontFamily: fonts.regular, fontSize: 10.5, color: colors.muted }, statusBadge: { backgroundColor: '#E9F3FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill }, statusText: { fontFamily: fonts.semibold, fontSize: 9.5, color: colors.blue },
});
