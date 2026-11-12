import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../src/components/PrimaryButton';
import RatingStars from '../src/components/RatingStars';
import VerifiedBadge from '../src/components/VerifiedBadge';
import { IMAGES } from '../src/assets';
import { colors, fonts, radius, spacing } from '../src/theme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFundiById, getReviewsByFundi } from '../src/services/api';
import { useAuth } from '../src/contexts/AuthContext';
import { getCurrentLocation } from '../src/services/location';
import { formatKm, haversineKm } from '../src/maps/config';

type Fundi = {
  id: string;
  name: string;
  skills?: string[];
  rating?: number;
  reviewCount?: number;
  verified?: boolean;
  experience?: number;
  bio?: string;
  profilePhoto?: string;
  portfolioImages?: string[];
  locationLabel?: string;
  location?: { lat: number; lng: number };
  availableDays?: string[];
  availableStartTime?: string;
  availableEndTime?: string;
  isAvailable?: boolean;
};

type Review = {
  id?: string;
  rating?: number;
  comment?: string;
  service?: string;
  photoUrls?: string[];
  createdAt?: string;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function FundiProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, bookingId } = useLocalSearchParams<{ id?: string; bookingId?: string }>();
  const { token } = useAuth();

  const [fundi, setFundi] = useState<Fundi | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [distance, setDistance] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) {
      setError('Fundi not selected.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await getFundiById(String(id));
      const record = data?.fundi;
      if (!record) {
        setError('Fundi not found.');
      } else {
        setFundi(record);
        const loc = record.location;
        if (loc && Number(loc.lat)) {
          const device = await getCurrentLocation();
          if (device) {
            const km = haversineKm(
              { latitude: device.latitude, longitude: device.longitude },
              { latitude: Number(loc.lat), longitude: Number(loc.lng) }
            );
            setDistance(formatKm(km));
          }
        }
      }
      try {
        const reviewRes = await getReviewsByFundi(String(id), token);
        setReviews(reviewRes?.reviews ?? []);
      } catch {
        setReviews([]);
      }
    } catch (e: any) {
      setError(e?.message || 'Could not load fundi.');
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    load();
  }, [load]);

  const skills = fundi?.skills ?? [];
  const trade = skills.length ? skills.join(', ') : 'Service provider';
  const initials = (fundi?.name || 'FG')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const workPhotos = [
    ...(fundi?.portfolioImages ?? []),
    ...reviews.flatMap((r) => (Array.isArray(r.photoUrls) ? r.photoUrls : [])),
  ];
  const reviewPhotos = new Set(workPhotos);

  const bookNow = () => {
    if (!fundi) return;
    router.push({
      pathname: '/booking',
      params: {
        fundiId: String(fundi.id),
        name: fundi.name,
        trade,
        rating: String(fundi.rating ?? 0),
        ...(bookingId ? { bookingId } : {}),
      },
    });
  };

  const days = (fundi?.availableDays ?? []).filter(Boolean);
  const timeWindow =
    fundi?.availableStartTime && fundi?.availableEndTime
      ? `${fundi.availableStartTime} – ${fundi.availableEndTime}`
      : '';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerText}>Loading profile…</Text>
        </View>
      ) : error || !fundi ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.muted} />
          <Text style={styles.centerText}>{error || 'Fundi not found.'}</Text>
          <Pressable onPress={load} style={styles.retry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <View style={styles.avatarWrap}>
                {fundi.profilePhoto ? (
                  <Image source={{ uri: fundi.profilePhoto }} style={styles.avatar} resizeMode="cover" />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarFallbackText}>{initials}</Text>
                  </View>
                )}
                {fundi.verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  </View>
                )}
              </View>

              <Text style={styles.name}>{fundi.name}</Text>
              <View style={styles.heroMeta}>
                <RatingStars rating={Number(fundi.rating ?? 0)} size={16} showCount count={fundi.reviewCount ?? 0} />
                <VerifiedBadge verified={fundi.verified} />
              </View>
              {(distance || fundi.locationLabel) && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={15} color={colors.muted} />
                  <Text style={styles.location}>{[distance, fundi.locationLabel].filter(Boolean).join(' · ')}</Text>
                </View>
              )}
              {fundi.isAvailable === false && (
                <View style={styles.offlinePill}>
                  <Text style={styles.offlineText}>Currently unavailable</Text>
                </View>
              )}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Experience</Text>
                <Text style={styles.statValue}>{Number(fundi.experience ?? 0)} yrs</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Jobs Done</Text>
                <Text style={styles.statValue}>{fundi.reviewCount ?? 0}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Rating</Text>
                <Text style={styles.statValue}>{Number(fundi.rating ?? 0).toFixed(1)}</Text>
              </View>
            </View>

            <View style={styles.tags}>
              {skills.slice(0, 4).map((skill) => (
                <View key={skill} style={styles.tag}>
                  <Text style={styles.tagText}>{skill}</Text>
                </View>
              ))}
              {skills.length > 4 && (
                <View style={[styles.tag, styles.tagMore]}>
                  <Text style={styles.tagTextMore}>+{skills.length - 4}</Text>
                </View>
              )}
              {skills.length === 0 && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{trade}</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Previous work</Text>
                {workPhotos.length > 0 && <Text style={styles.sectionCount}>{workPhotos.length} photos</Text>}
              </View>
              {workPhotos.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.workRow}
                >
                  {workPhotos.map((uri, index) => (
                    <View key={`${index}-${uri.slice(0, 24)}`} style={styles.workItem}>
                      <Image source={{ uri }} style={styles.workImage} resizeMode="cover" />
                      <View style={styles.workCaption}>
                        <Ionicons name="pricetag-outline" size={11} color={colors.inkSoft} />
                        <Text style={styles.workCaptionText} numberOfLines={1}>
                          {reviewPhotos.has(uri) ? 'Reviewed job' : 'Completed job'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.workEmpty}>
                  <Ionicons name="images-outline" size={22} color={colors.muted} />
                  <Text style={styles.workEmptyText}>No work photos yet — ask {fundi.name.split(' ')[0]} to add samples of finished jobs.</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Reviews</Text>
                <Text style={styles.sectionCount}>{reviews.length} total</Text>
              </View>
              {reviews.length > 0 ? (
                <View style={styles.reviewList}>
                  {reviews.map((review, index) => (
                    <View key={review.id || String(index)} style={styles.reviewCard}>
                      <View style={styles.reviewHead}>
                        <RatingStars rating={Number(review.rating ?? 0)} size={14} />
                        <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
                      </View>
                      {!!review.service && <Text style={styles.reviewService}>{review.service}</Text>}
                      {!!review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                      {(review.photoUrls ?? []).map((photo, i) => (
                        <Image key={`${index}-${i}`} source={{ uri: photo }} style={styles.reviewPhoto} resizeMode="cover" />
                      ))}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.workEmpty}>
                  <Ionicons name="chatbox-ellipses-outline" size={22} color={colors.muted} />
                  <Text style={styles.workEmptyText}>No reviews yet. Completed bookings show up here.</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.about}>
                {fundi.bio?.trim() || `${fundi.name} is an active fundi on FundiGrid. Send a booking request to get a quote.`}
              </Text>
            </View>

            {(days.length > 0 || timeWindow) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Availability</Text>
                <View style={styles.availRow}>
                  {days.map((day) => (
                    <View key={day} style={styles.availPill}>
                      <Text style={styles.availPillText}>{day}</Text>
                    </View>
                  ))}
                  {!!timeWindow && (
                    <View style={[styles.availPill, styles.availTimePill]}>
                      <Ionicons name="time-outline" size={12} color={colors.primary} />
                      <Text style={styles.availTimeText}>{timeWindow}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
            <PrimaryButton title="Choose this fundi" onPress={bookNow} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: { height: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  backBtn: { position: 'absolute', left: spacing.xxl, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 85, height: 85 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xxl },
  centerText: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center' },
  retry: { marginTop: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.primary },
  retryText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.black },
  body: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl, gap: spacing.xl },
  hero: {
    backgroundColor: colors.primaryFaint,
    borderRadius: radius.lg,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  avatarWrap: { position: 'relative', marginBottom: spacing.xs },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.lightBg },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  avatarFallbackText: { fontFamily: fonts.bold, fontSize: 26, color: colors.primary },
  verifiedBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: colors.white, borderRadius: 12 },
  name: { fontFamily: fonts.bold, fontSize: 22, color: colors.ink, textAlign: 'center' },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  location: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  offlinePill: { marginTop: spacing.xs, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  offlineText: { fontFamily: fonts.medium, fontSize: 11, color: colors.danger || '#E5484D' },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: colors.lightBg,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  statLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  statValue: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  tags: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  tagMore: { backgroundColor: colors.primaryFaint, borderColor: colors.primary },
  tagText: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkSoft },
  tagTextMore: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary },
  section: { gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  sectionCount: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  workRow: { gap: spacing.sm, paddingRight: spacing.lg },
  workItem: {
    width: 150,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  workImage: { width: '100%', height: 104, backgroundColor: colors.lightBg },
  workCaption: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 7 },
  workCaptionText: { fontFamily: fonts.medium, fontSize: 11, color: colors.inkSoft, flex: 1 },
  workEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.lightBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.lg,
  },
  workEmptyText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, flex: 1, lineHeight: 17 },
  reviewList: { gap: spacing.sm },
  reviewCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewDate: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  reviewService: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary },
  reviewComment: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  reviewPhoto: { width: '100%', height: 140, borderRadius: radius.sm, backgroundColor: colors.lightBg, marginTop: spacing.xs },
  about: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.inkSoft },
  availRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  availPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.lightBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  availPillText: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkSoft },
  availTimePill: { backgroundColor: colors.primaryFaint, borderColor: colors.primarySoft },
  availTimeText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primary },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
