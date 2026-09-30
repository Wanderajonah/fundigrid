import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IMAGES } from '../../src/assets';
import { colors, fonts, radius, shadowSoft, spacing } from '../../src/theme';
import { useAuth } from '../../src/contexts/AuthContext';
import { acceptBooking, declineBooking, getFundiBookings } from '../../src/services/api';
import { AppMap, DEFAULT_REGION, MapPin, MapRegion, hasCoords, regionFromPoints } from '../../src/maps';
import { DeviceLocation, getCurrentLocation } from '../../src/services/location';
import { connectSocket } from '../../src/services/socket';
import SegmentedControl from '../../src/components/SegmentedControl';
import StatusBadge from '../../src/components/StatusBadge';

const STATUS_MAP: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'error' | 'neutral' }> = {
  PENDING: { label: 'Pending', variant: 'info' },
  ACCEPTED: { label: 'Accepted', variant: 'warning' },
  ON_THE_WAY: { label: 'On the Way', variant: 'warning' },
  ARRIVED: { label: 'Arrived', variant: 'warning' },
  IN_PROGRESS: { label: 'In Progress', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'error' },
};

function activeBookingLocation(b: any) {
  if (hasCoords(b?.location)) return b.location;
  if (hasCoords(b?.fundiLocation)) return b.fundiLocation;
  return null;
}

export default function NearbyJobsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [viewMode, setViewMode] = useState(0);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<DeviceLocation | null>(null);
  const [region, setRegion] = useState<MapRegion>(DEFAULT_REGION);

  const fetchBookings = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await getFundiBookings(token);
      setBookings(Array.isArray(data) ? data : data.bookings ?? []);
    } catch (e) {
      console.log('Bookings fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const openJob = (id: string) =>
    router.push({ pathname: '/fundi-job-details', params: { bookingId: String(id) } });

  const handleAccept = async (id: string) => {
    if (!token) return;
    try {
      await acceptBooking(token, String(id));
      fetchBookings();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to accept the job.');
    }
  };

  const handleDecline = async (id: string) => {
    if (!token) return;
    try {
      await declineBooking(token, String(id));
      fetchBookings();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to decline the job.');
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const loc = await getCurrentLocation();
      if (alive && loc) {
        setDevice(loc);
        setRegion({
          latitude: loc.latitude,
          longitude: loc.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    try {
      connectSocket(token);
    } catch {}
  }, [token]);

  const pins: MapPin[] = useMemo(() => {
    const list: MapPin[] = [];
    if (device) {
      list.push({
        id: 'me',
        latitude: device.latitude,
        longitude: device.longitude,
        kind: 'user',
        label: 'You',
      });
    }
    bookings.forEach((job) => {
      const loc = activeBookingLocation(job);
      if (!loc) return;
      const price =
        job.proposedPrice || job.agreedPrice
          ? `${Math.round(Number(job.proposedPrice || job.agreedPrice) / 1000)}k`
          : job.category?.slice(0, 4) || 'Job';
      list.push({
        id: String(job.id),
        latitude: Number(loc.lat),
        longitude: Number(loc.lng),
        kind: 'price',
        label: String(price),
        active: job.status === 'PENDING',
        onPress: () => openJob(String(job.id)),
      });
    });
    return list;
  }, [bookings, device, router]);

  useEffect(() => {
    if (pins.length > 1) {
      setRegion(
        regionFromPoints(pins.map((p) => ({ latitude: p.latitude, longitude: p.longitude })))
      );
    }
  }, [pins]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable hitSlop={12} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color={colors.ink} />
        </Pressable>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <SegmentedControl
          options={['Map', 'List']}
          selected={viewMode}
          onChange={setViewMode}
          style={styles.segment}
        />

        {viewMode === 0 ? (
          <>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <Text style={styles.searchPlaceholder}>Search nearby jobs...</Text>
            </View>

            <View style={styles.mapContainer}>
              {loading ? (
                <View style={styles.mapLoading}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                <AppMap region={region} pins={pins} showsUserLocation style={styles.map} />
              )}
            </View>

            {bookings.length > 0 && (
              <Pressable style={styles.bottomCard} onPress={() => openJob(String(bookings[0].id))}>
                <View style={styles.cardTop}>
                  <Image source={IMAGES.fundi} style={styles.cardAvatar} resizeMode="cover" />
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{bookings[0].category || 'Job Request'}</Text>
                    <Text style={styles.cardMeta}>{bookings[0].address || 'Nearby'}</Text>
                  </View>
                  {bookings[0].proposedPrice && (
                    <Text style={styles.cardPrice}>UGX {bookings[0].proposedPrice?.toLocaleString()}</Text>
                  )}
                </View>
                {bookings[0].status === 'PENDING' && (
                  <View style={styles.cardActions}>
                    <Pressable style={styles.declineBtn} onPress={() => handleDecline(String(bookings[0].id))}>
                      <Text style={styles.declineText}>Decline</Text>
                    </Pressable>
                    <Pressable style={styles.acceptBtn} onPress={() => handleAccept(String(bookings[0].id))}>
                      <Text style={styles.acceptText}>Accept</Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>
            )}
          </>
        ) : (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xxl }} />
            ) : bookings.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="briefcase-outline" size={48} color={colors.muted} />
                <Text style={styles.emptyTitle}>No Jobs Yet</Text>
                <Text style={styles.emptySub}>New client requests will appear here.</Text>
              </View>
            ) : (
              bookings.map((job: any) => {
                const statusInfo = STATUS_MAP[job.status] || { label: job.status, variant: 'neutral' as const };
                return (
                  <Pressable key={job.id} style={styles.listCard} onPress={() => openJob(String(job.id))}>
                    <View style={styles.listCardTop}>
                      <View style={styles.listCardIcon}>
                        <Ionicons name="briefcase" size={20} color={colors.primary} />
                      </View>
                      <View style={styles.listCardInfo}>
                        <Text style={styles.listCardTitle}>{job.category || 'Service Request'}</Text>
                        <View style={styles.listCardMeta}>
                          <Ionicons name="location-outline" size={13} color={colors.muted} />
                          <Text style={styles.listMetaText}>{job.address || 'Location'}</Text>
                        </View>
                      </View>
                      <StatusBadge status={statusInfo.label} variant={statusInfo.variant} />
                    </View>
                    <Pressable style={styles.viewDetails}>
                      <Text style={styles.viewDetailsText}>View Details</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </Pressable>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  menuBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 80, height: 48 },
  content: { flex: 1, paddingHorizontal: spacing.xxl, paddingTop: spacing.md, gap: spacing.md },
  segment: { height: 40 },
  searchBar: {
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  searchPlaceholder: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  mapContainer: { flex: 1, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  map: { flex: 1 },
  mapLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lightBg },
  bottomCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadowSoft,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.lightBg },
  cardInfo: { flex: 1, gap: 2 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  cardMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  cardPrice: { fontFamily: fonts.bold, fontSize: 16, color: colors.primary },
  cardActions: { flexDirection: 'row', gap: spacing.md },
  declineBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkSoft },
  acceptBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.black },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  listCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  listCardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  listCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCardInfo: { flex: 1, gap: 4 },
  listCardTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  listCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listMetaText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  viewDetailsText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxxxl, gap: spacing.md },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  emptySub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: 'center' },
});
