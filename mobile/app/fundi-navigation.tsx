import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IMAGES } from '../src/assets';
import { useAuth } from '../src/contexts/AuthContext';
import {
  AppMap,
  DEFAULT_REGION,
  MapPin,
  MapRegion,
  formatKm,
  hasCoords,
  haversineKm,
  regionFromPoints,
} from '../src/maps';
import { DeviceLocation, getCurrentLocation } from '../src/services/location';
import {
  acceptBooking,
  declineBooking,
  getFundiBookingById,
  updateBookingStatus,
} from '../src/services/api';
import StatusBadge from '../src/components/StatusBadge';
import { colors, fonts, radius, spacing } from '../src/theme';

const SPEED_KMH = 25;

const STEPS = [
  { from: 'ACCEPTED', next: 'ON_THE_WAY', label: 'Start travelling' },
  { from: 'ON_THE_WAY', next: 'ARRIVED', label: "I've arrived" },
  { from: 'ARRIVED', next: 'IN_PROGRESS', label: 'Start work' },
  { from: 'IN_PROGRESS', next: 'COMPLETED', label: 'Mark work complete' },
];

const BADGES: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'error' | 'neutral' }> = {
  PENDING: { label: 'New', variant: 'info' },
  ACCEPTED: { label: 'Accepted', variant: 'warning' },
  ON_THE_WAY: { label: 'On the Way', variant: 'warning' },
  ARRIVED: { label: 'Arrived', variant: 'warning' },
  IN_PROGRESS: { label: 'In Progress', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'error' },
  DISPUTED: { label: 'Disputed', variant: 'error' },
};

// The fundi's way to the job: where it is, how far, and the next step to report.
export default function FundiNavigationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [device, setDevice] = useState<DeviceLocation | null>(null);
  const [region, setRegion] = useState<MapRegion>(DEFAULT_REGION);

  const load = useCallback(async () => {
    if (!token || !bookingId) {
      setLoading(false);
      return;
    }
    try {
      const data = await getFundiBookingById(token, String(bookingId));
      setBooking(data?.booking ?? null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not load this job.');
    } finally {
      setLoading(false);
    }
  }, [token, bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const loc = await getCurrentLocation();
      if (alive && loc) setDevice(loc);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const jobLoc = hasCoords(booking?.location) ? booking.location : null;
  const status = booking?.status as string | undefined;
  const badge = status ? BADGES[status] || { label: status, variant: 'neutral' as const } : null;
  const workFinished = Boolean(booking?.fundiCompleted);
  const isPending = status === 'PENDING';
  const isClosed = status === 'CANCELLED' || status === 'DISPUTED' || status === 'COMPLETED';
  const nextStep = STEPS.find((s) => s.from === status);

  const points = useMemo(() => {
    const list: { latitude: number; longitude: number }[] = [];
    if (jobLoc) list.push({ latitude: Number(jobLoc.lat), longitude: Number(jobLoc.lng) });
    if (device) list.push({ latitude: device.latitude, longitude: device.longitude });
    return list;
  }, [jobLoc, device]);

  const pins: MapPin[] = useMemo(() => {
    const list: MapPin[] = [];
    if (device) {
      list.push({ id: 'me', latitude: device.latitude, longitude: device.longitude, kind: 'user', label: 'You' });
    }
    if (jobLoc) {
      list.push({
        id: 'job',
        latitude: Number(jobLoc.lat),
        longitude: Number(jobLoc.lng),
        kind: 'default',
        label: booking?.category || 'Job',
        color: colors.primary,
        active: true,
      });
    }
    return list;
  }, [device, jobLoc, booking?.category]);

  useEffect(() => {
    if (points.length > 0) setRegion(regionFromPoints(points));
  }, [points]);

  const distanceKm =
    device && jobLoc
      ? haversineKm({ latitude: device.latitude, longitude: device.longitude }, { latitude: Number(jobLoc.lat), longitude: Number(jobLoc.lng) })
      : null;
  const etaMin = distanceKm != null ? Math.max(1, Math.round((distanceKm / SPEED_KMH) * 60)) : null;

  const withToken = (fn: (t: string) => Promise<unknown>) => {
    if (!token) return;
    return run(() => fn(token));
  };

  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'That action failed.');
    } finally {
      setBusy(false);
    }
  };

  const openExternalMaps = async () => {
    if (!jobLoc) return;
    const dest = `${Number(jobLoc.lat)},${Number(jobLoc.lng)}`;
    const candidates =
      Platform.OS === 'ios'
        ? [`http://maps.apple.com/?daddr=${dest}`, `https://www.google.com/maps/dir/?api=1&destination=${dest}`]
        : [`google.navigation:q=${dest}`, `https://www.google.com/maps/dir/?api=1&destination=${dest}`];

    for (const url of candidates) {
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          return;
        }
      } catch {
        // try the next scheme
      }
    }
    Alert.alert('No maps app', 'Install a maps app to get turn-by-turn directions.');
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>Navigate</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Navigate</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.mapWrap}>
        <AppMap region={region} pins={pins} showsUserLocation style={styles.map} />
        {distanceKm != null && (
          <View style={styles.floatingChip}>
            <Ionicons name="navigate" size={13} color={colors.ink} />
            <Text style={styles.floatingChipText}>
              {formatKm(distanceKm)}
              {etaMin != null ? ` · ≈ ${etaMin} min` : ''}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.card, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardHead}>
          <Image source={IMAGES.fundi} style={styles.avatar} resizeMode="cover" />
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{booking?.category || 'Job Request'}</Text>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={13} color={colors.muted} />
              <Text style={styles.cardMeta} numberOfLines={2}>
                {booking?.address || 'Address not shared'}
              </Text>
            </View>
          </View>
          {badge && <StatusBadge status={badge.label} variant={badge.variant} />}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="map-outline" size={15} color={colors.inkSoft} />
            <Text style={styles.statText}>{distanceKm != null ? formatKm(distanceKm) : 'Distance unknown'}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={15} color={colors.inkSoft} />
            <Text style={styles.statText}>{etaMin != null ? `≈ ${etaMin} min` : 'ETA unknown'}</Text>
          </View>
        </View>

        <Pressable style={styles.navigateBtn} onPress={openExternalMaps} disabled={!jobLoc}>
          <Ionicons name="navigate" size={16} color={colors.ink} />
          <Text style={styles.navigateText}>Open directions</Text>
        </Pressable>

        {isPending ? (
          <View style={styles.actions}>
            <Pressable style={styles.declineBtn} onPress={() => withToken((t) => declineBooking(t, String(bookingId)))} disabled={busy}>
              <Text style={styles.declineText}>Decline</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={() => withToken((t) => acceptBooking(t, String(bookingId)))} disabled={busy}>
              <Text style={styles.primaryText}>{busy ? 'Working…' : 'Accept Job'}</Text>
            </Pressable>
          </View>
        ) : isClosed ? (
          <View style={styles.finishedNote}>
            <Ionicons
              name={status === 'COMPLETED' ? 'checkmark-done' : 'close-circle'}
              size={18}
              color={status === 'COMPLETED' ? colors.success : colors.danger}
            />
            <Text style={styles.finishedText}>
              {status === 'COMPLETED'
                ? 'Job completed — the client confirmed it'
                : status === 'CANCELLED'
                  ? 'This job was cancelled'
                  : 'This job is under dispute'}
            </Text>
          </View>
        ) : workFinished ? (
          <View style={styles.finishedNote}>
            <Ionicons name="checkmark-done" size={18} color={colors.success} />
            <Text style={styles.finishedText}>Work reported finished — waiting for the client to confirm.</Text>
          </View>
        ) : nextStep ? (
          <Pressable style={styles.primaryBtn} onPress={() => withToken((t) => updateBookingStatus(t, String(bookingId), nextStep.next))} disabled={busy}>
            <Text style={styles.primaryText}>{busy ? 'Updating…' : nextStep.label}</Text>
          </Pressable>
        ) : (
          <View style={styles.finishedNote}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.inkSoft} />
            <Text style={styles.finishedText}>This job is closed.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.md,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  headerTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapWrap: { flex: 1, marginHorizontal: spacing.xxl, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  map: { flex: 1 },
  floatingChip: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  floatingChipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink },
  card: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, gap: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.lightBg },
  cardInfo: { flex: 1, gap: 3 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  cardMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, flex: 1 },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.lightBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink, flexShrink: 1 },
  navigateBtn: {
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  navigateText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  actions: { flexDirection: 'row', gap: spacing.md },
  primaryBtn: {
    flex: 1,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
  declineBtn: {
    flex: 1,
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  declineText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.inkSoft },
  finishedNote: {
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.lightBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  finishedText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkSoft, flexShrink: 1, textAlign: 'center' },
});
