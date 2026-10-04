import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Dimensions, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../src/components/PrimaryButton';
import Timeline from '../src/components/Timeline';
import VerifiedBadge from '../src/components/VerifiedBadge';
import RatingStars from '../src/components/RatingStars';
import { AppMap, DEFAULT_REGION, MapPin, MapRegion, formatKm, haversineKm, regionFromPoints } from '../src/maps';
import { getCurrentLocation } from '../src/services/location';
import { connectSocket } from '../src/services/socket';
import { confirmCompletion, getClientBookings, getFundiById } from '../src/services/api';
import { useAuth } from '../src/contexts/AuthContext';
import { colors, fonts, radius, spacing } from '../src/theme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: WINDOW_H } = Dimensions.get('window');
const MAP_HEIGHT = Math.min(380, Math.max(250, Math.round(WINDOW_H * 0.4)));
const SPEED_KMH = 25; // city driving estimate for the ETA chip

const ACTIVE_STATUSES = ['ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];

const STEP_LABELS = [
  { label: 'Job accepted', status: 'ACCEPTED' },
  { label: 'Fundi on the way', status: 'ON_THE_WAY' },
  { label: 'Fundi arrived', status: 'ARRIVED' },
  { label: 'Work in progress', status: 'IN_PROGRESS' },
  { label: 'Completed', status: 'COMPLETED' },
];

type Tone = 'pending' | 'active' | 'done' | 'bad';

const STATUS_META: Record<string, { title: string; tone: Tone }> = {
  PENDING: { title: 'Waiting for the fundi to accept', tone: 'pending' },
  ACCEPTED: { title: 'Booking accepted', tone: 'active' },
  ON_THE_WAY: { title: 'Fundi is on the way', tone: 'active' },
  ARRIVED: { title: 'Fundi has arrived', tone: 'active' },
  IN_PROGRESS: { title: 'Work in progress', tone: 'active' },
  COMPLETED: { title: 'Job completed', tone: 'done' },
  CANCELLED: { title: 'Booking cancelled', tone: 'bad' },
  DISPUTED: { title: 'Booking under dispute', tone: 'bad' },
};

function stepsFor(bookingStatus?: string) {
  const order = STEP_LABELS.map((s) => s.status);
  const current = order.indexOf(bookingStatus || '');
  return STEP_LABELS.map((step, i) => ({
    label: step.label,
    status: (current >= 0 && i < current ? 'completed' : current === i ? 'current' : 'pending') as
      | 'completed'
      | 'current'
      | 'pending',
  }));
}

function hasCoords(loc?: any): loc is { lat: number; lng: number } {
  if (!loc) return false;
  const lat = Number(loc.lat);
  const lng = Number(loc.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;
}

export default function JobTrackingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [fundi, setFundi] = useState<any>(null);
  const [fundiLoc, setFundiLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [clientLoc, setClientLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [region, setRegion] = useState<MapRegion>(DEFAULT_REGION);
  const [confirming, setConfirming] = useState(false);

  const loadBooking = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getClientBookings(token);
      const list = Array.isArray(data) ? data : data.bookings ?? [];
      const active = bookingId
        ? list.find((b: any) => String(b.id) === String(bookingId) || String(b._id) === String(bookingId))
        : list.find((b: any) => ACTIVE_STATUSES.includes(b.status)) || list[0];
      if (active) {
        setBooking(active);
        if (hasCoords(active.fundiLocation)) setFundiLoc(active.fundiLocation);
        if (hasCoords(active.location)) setClientLoc(active.location);
        if (active.fundiId) {
          try {
            const detail = await getFundiById(String(active.fundiId));
            setFundi(detail?.fundi ?? null);
          } catch {
            setFundi(null);
          }
        } else {
          setFundi(null);
        }
      }
    } catch (e) {
      console.log('Job tracking load error:', e);
    }
  }, [token, bookingId]);

  useEffect(() => {
    loadBooking();
    const interval = setInterval(loadBooking, 15000);
    return () => clearInterval(interval);
  }, [loadBooking]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const loc = await getCurrentLocation();
      if (alive && loc) setClientLoc({ lat: loc.latitude, lng: loc.longitude });
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);
    const onFundiLocation = (payload: any) => {
      if (!payload?.lat || !payload?.lng) return;
      if (bookingId && payload.bookingId && String(payload.bookingId) !== String(bookingId)) return;
      setFundiLoc({ lat: Number(payload.lat), lng: Number(payload.lng) });
    };
    socket.on('fundi_location', onFundiLocation);
    return () => {
      socket.off('fundi_location', onFundiLocation);
    };
  }, [token, bookingId]);

  const jobPoint = booking && hasCoords(booking.location) ? booking.location : null;
  const fundiBase = fundi && hasCoords(fundi.location) ? fundi.location : null;

  useEffect(() => {
    const points = [
      ...(fundiLoc ? [{ latitude: fundiLoc.lat, longitude: fundiLoc.lng }] : []),
      ...(fundiBase ? [{ latitude: fundiBase.lat, longitude: fundiBase.lng }] : []),
      ...(clientLoc ? [{ latitude: clientLoc.lat, longitude: clientLoc.lng }] : []),
      ...(jobPoint ? [{ latitude: jobPoint.lat, longitude: jobPoint.lng }] : []),
    ];
    if (points.length > 0) setRegion(regionFromPoints(points));
  }, [fundiLoc, fundiBase, clientLoc, jobPoint]);

  const fundiPoint = fundiLoc || fundiBase;
  const distanceKm = useMemo(() => {
    if (!fundiPoint) return null;
    const target = jobPoint || clientLoc;
    if (!target) return null;
    const km = haversineKm(
      { latitude: fundiPoint.lat, longitude: fundiPoint.lng },
      { latitude: target.lat, longitude: target.lng }
    );
    return Number.isFinite(km) ? km : null;
  }, [fundiPoint, jobPoint, clientLoc]);

  const status = booking?.status as string | undefined;
  const meta = STATUS_META[status || ''] || { title: 'Tracking your job', tone: 'pending' as Tone };
  const moving = status === 'ON_THE_WAY' || status === 'ARRIVED' || status === 'IN_PROGRESS';
  const etaMin =
    distanceKm != null && status === 'ON_THE_WAY' ? Math.max(1, Math.round((distanceKm / SPEED_KMH) * 60)) : null;

  const pins: MapPin[] = [];
  if (clientLoc) {
    pins.push({ id: 'client', latitude: clientLoc.lat, longitude: clientLoc.lng, kind: 'client', label: 'You' });
  }
  if (fundiLoc) {
    pins.push({ id: 'fundi-live', latitude: fundiLoc.lat, longitude: fundiLoc.lng, kind: 'fundi', label: 'Fundi', active: true });
  } else if (fundiBase) {
    pins.push({ id: 'fundi-base', latitude: fundiBase.lat, longitude: fundiBase.lng, kind: 'fundi', label: 'Fundi' });
  } else if (jobPoint) {
    pins.push({ id: 'job', latitude: jobPoint.lat, longitude: jobPoint.lng, kind: 'default', label: 'Job', color: colors.primary });
  }

  const fundiName = booking?.fundiName || fundi?.name || 'Your Fundi';
  const initials = fundiName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const fundiTrade =
    (Array.isArray(fundi?.skills) && fundi.skills.length && fundi.skills.join(', ')) ||
    booking?.category ||
    'Service provider';
  const fundiRating = Number(fundi?.rating ?? 0);
  const priceCandidate = booking?.agreedPrice ?? booking?.proposedPrice ?? null;
  const agreedAmount = Number(priceCandidate) > 0 ? Number(priceCandidate) : null;
  const estimateAmount =
    booking?.estimate && Number(booking.estimate.total) > 0 ? Number(booking.estimate.total) : null;
  // Until a price is agreed in chat, the job estimate is what gets paid.
  const payableAmount = agreedAmount ?? estimateAmount;
  const isPending = status === 'PENDING';
  const isCancelled = status === 'CANCELLED' || status === 'DISPUTED';
  const isCompleted = status === 'COMPLETED';
  const isPaid = booking?.paymentStatus === 'held' || booking?.paymentStatus === 'released';
  const awaitingSignoff = status === 'IN_PROGRESS' && Boolean(booking?.fundiCompleted);

  const callFundi = async () => {
    const phone = String(fundi?.phone || '').trim();
    if (!phone) {
      Alert.alert('Number not shared', 'The fundi’s phone number is not available for this job yet.');
      return;
    }
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      Alert.alert('Cannot dial', 'No phone app available on this device.');
    }
  };

  const openMessages = () => router.push('/(tabs)/messages');

  // Nothing is completed until the client says so — this is their only step.
  const confirmDone = () => {
    if (!token || !booking) return;
    Alert.alert(
      'Confirm the job is done?',
      'This tells FundiGrid the work is finished and releases payment to the fundi.',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Confirm done',
          onPress: async () => {
            setConfirming(true);
            try {
              await confirmCompletion(token, String(booking.id || bookingId || ''));
              await loadBooking();
            } catch (e: any) {
              Alert.alert('Could not confirm', e?.message || 'Please try again.');
            } finally {
              setConfirming(false);
            }
          },
        },
      ],
    );
  };

  const scheduled = booking?.scheduledFor ? new Date(booking.scheduledFor) : null;
  const scheduledLabel = scheduled && !Number.isNaN(scheduled.getTime())
    ? scheduled.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  const toneStyle = {
    pending: { bg: colors.lightBg, fg: colors.inkSoft, icon: 'time-outline' },
    active: { bg: colors.primaryFaint, fg: colors.ink, icon: 'navigate' },
    done: { bg: colors.successSoft, fg: colors.success, icon: 'checkmark-circle' },
    bad: { bg: '#FDECEC', fg: colors.danger, icon: 'close-circle-outline' },
  }[meta.tone];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Track Job</Text>
      </View>

      <View style={styles.mapWrap}>
        <AppMap region={region} pins={pins} showsUserLocation style={styles.map} />
        <View style={[styles.statusChip, { backgroundColor: toneStyle.bg }]}>
          <Ionicons name={toneStyle.icon as any} size={14} color={toneStyle.fg} />
          <Text style={[styles.statusChipText, { color: toneStyle.fg }]}>
            {awaitingSignoff ? 'Waiting for your confirmation' : meta.title}
          </Text>
        </View>
        {etaMin != null && (
          <View style={styles.etaChip}>
            <Ionicons name="car-outline" size={13} color={colors.ink} />
            <Text style={styles.etaChipText}>≈ {etaMin} min</Text>
          </View>
        )}
        {moving && !fundiLoc && (
          <View style={styles.waitChip}>
            <Ionicons name="navigate-outline" size={13} color={colors.ink} />
            <Text style={styles.waitChipText}>Live location updates on the way</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.banner, { backgroundColor: toneStyle.bg }]}>
          <Ionicons name={toneStyle.icon as any} size={18} color={toneStyle.fg} />
          <Text style={[styles.bannerText, { color: toneStyle.fg }]}>{meta.title}</Text>
          {distanceKm != null && !isCompleted && !isCancelled ? (
            <Text style={styles.bannerMeta}>{formatKm(distanceKm)}</Text>
          ) : null}
        </View>

        <View style={styles.fundiCard}>
          <View style={styles.fundiRow}>
            {fundi?.profilePhoto ? (
              <Image source={{ uri: fundi.profilePhoto }} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarFallbackText}>{initials}</Text>
              </View>
            )}
            <View style={styles.fundiInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.fundiName}>{fundiName}</Text>
                <VerifiedBadge verified={fundi?.verified} size={13} />
              </View>
              <Text style={styles.fundiTrade} numberOfLines={1}>
                {fundiTrade}
              </Text>
              <View style={styles.metaRow}>
                <RatingStars rating={fundiRating} size={13} showCount count={Number(fundi?.reviewCount ?? 0)} />
                {distanceKm != null && <Text style={styles.distance}>· {formatKm(distanceKm)}</Text>}
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton title="Call" variant="secondary" compact icon={<Ionicons name="call" size={17} color={colors.ink} />} onPress={callFundi} style={{ flex: 1 }} />
            <PrimaryButton title="Message" variant="secondary" compact icon={<Ionicons name="chatbubble" size={17} color={colors.ink} />} onPress={openMessages} style={{ flex: 1 }} />
          </View>
        </View>

        <View style={styles.detailsCard}>
          {[
            { icon: 'briefcase-outline', label: 'Service', value: booking?.category || 'Service' },
            { icon: 'location-outline', label: 'Address', value: booking?.address || '—' },
            ...(scheduledLabel ? [{ icon: 'calendar-outline', label: 'Scheduled', value: scheduledLabel }] : []),
            {
              icon: 'pricetag-outline',
              label: 'Price',
              value:
                agreedAmount != null
                  ? `UGX ${agreedAmount.toLocaleString()}`
                  : estimateAmount != null
                    ? `Estimate UGX ${estimateAmount.toLocaleString()}`
                    : 'Not agreed yet',
            },
            {
              icon: 'card-outline',
              label: 'Payment',
              value: isPaid ? 'Paid' : isCompleted ? 'Due now' : 'After completion',
            },
          ].map((row) => (
            <View key={row.label} style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name={row.icon as any} size={15} color={colors.inkSoft} />
              </View>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.timelineCard}>
          <Text style={styles.cardTitle}>Progress</Text>
          <Timeline steps={stepsFor(status)} />
        </View>

        {awaitingSignoff && (
          <View style={styles.signoffCard}>
            <View style={styles.signoffHead}>
              <Ionicons name="checkmark-done" size={18} color={colors.success} />
              <Text style={styles.signoffTitle}>The fundi says the work is finished</Text>
            </View>
            <Text style={styles.signoffText}>
              Check everything is right, then confirm. Payment is released to the fundi once you do.
            </Text>
            <PrimaryButton title="Confirm job is done" onPress={confirmDone} loading={confirming} />
          </View>
        )}

        {!booking && <Text style={styles.hint}>Loading your booking…</Text>}
        {isPending && <Text style={styles.hint}>We’ll notify you the moment the fundi accepts.</Text>}
        {isCancelled && <Text style={styles.hint}>Request another fundi to get started again.</Text>}

        {isCompleted && (
          <PrimaryButton
            title={isPaid ? 'View Receipt' : payableAmount != null ? `Pay UGX ${payableAmount.toLocaleString()}` : 'Pay for this job'}
            onPress={() =>
              router.push({
                pathname: isPaid ? '/receipt' : '/payment',
                params: {
                  bookingId: bookingId ? String(bookingId) : booking ? String(booking.id) : '',
                  fundiName,
                  fundiTrade,
                  amount: payableAmount != null ? String(payableAmount) : '',
                },
              })
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 16, color: colors.ink, marginRight: 30 },
  mapWrap: {
    height: MAP_HEIGHT,
    marginHorizontal: spacing.xxl,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.lightBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: { flex: 1 },
  statusChip: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  statusChipText: { fontFamily: fonts.semibold, fontSize: 12, flex: 1 },
  etaChip: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  etaChipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink },
  waitChip: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  waitChipText: { fontFamily: fonts.medium, fontSize: 11, color: colors.inkSoft },
  sheet: { flex: 1, marginTop: spacing.lg },
  sheetContent: {
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bannerText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13 },
  bannerMeta: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkSoft },
  fundiCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.white,
  },
  fundiRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.lightBg },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  avatarFallbackText: { fontFamily: fonts.bold, fontSize: 18, color: colors.primary },
  fundiInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  fundiName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  fundiTrade: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  distance: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  actions: { flexDirection: 'row', gap: spacing.sm },
  detailsCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.lightBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, width: 78 },
  detailValue: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.ink, textAlign: 'right' },
  signoffCard: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.success,
    padding: spacing.lg,
    gap: spacing.md,
  },
  signoffHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  signoffTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, flex: 1 },
  signoffText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  timelineCard: {
    backgroundColor: colors.lightBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: 'center', paddingVertical: spacing.xs },
});
