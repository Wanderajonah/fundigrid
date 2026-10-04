import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IMAGES } from '../../src/assets';
import { useAuth } from '../../src/contexts/AuthContext';
import { getFundiBookings } from '../../src/services/api';
import SegmentedControl from '../../src/components/SegmentedControl';
import StatusBadge from '../../src/components/StatusBadge';
import { colors, fonts, radius, spacing } from '../../src/theme';

const STATUS_MAP: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'error' | 'neutral' }> = {
  PENDING: { label: 'New', variant: 'info' },
  ACCEPTED: { label: 'Accepted', variant: 'warning' },
  ON_THE_WAY: { label: 'On the Way', variant: 'warning' },
  ARRIVED: { label: 'Arrived', variant: 'warning' },
  IN_PROGRESS: { label: 'In Progress', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'error' },
  DISPUTED: { label: 'Disputed', variant: 'error' },
};

const TABS = ['Ongoing', 'New', 'Completed'] as const;

const BUCKETS: Record<string, string[]> = {
  Ongoing: ['ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'],
  New: ['PENDING'],
  Completed: ['COMPLETED', 'CANCELLED', 'DISPUTED'],
};

const EMPTY: Record<string, { title: string; sub: string }> = {
  Ongoing: { title: 'No ongoing jobs', sub: 'Jobs you accept show up here until they are finished.' },
  New: { title: 'No new requests', sub: 'New client requests will appear here.' },
  Completed: { title: 'Nothing finished yet', sub: 'Completed and cancelled jobs will appear here.' },
};

// Tap a job to read the brief, then accept it — that opens the navigation map.
export default function NearbyJobsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [tab, setTab] = useState(0);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  // Refetch on focus so a job accepted in details lands in the right bucket.
  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  }, [fetchBookings]);

  const counts = useMemo(
    () => TABS.map((name) => bookings.filter((b) => BUCKETS[name].includes(b.status)).length),
    [bookings]
  );

  const visible = useMemo(
    () => bookings.filter((b) => BUCKETS[TABS[tab]].includes(b.status)),
    [bookings, tab]
  );

  const labels = TABS.map((name, i) => (counts[i] > 0 ? `${name} (${counts[i]})` : name));
  const empty = EMPTY[TABS[tab]];

  const openJob = (id: string) =>
    router.push({ pathname: '/fundi-job-details', params: { bookingId: String(id) } });

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
        <SegmentedControl options={labels} selected={tab} onChange={setTab} style={styles.segment} />

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xxl }} />
          ) : visible.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={48} color={colors.muted} />
              <Text style={styles.emptyTitle}>{empty.title}</Text>
              <Text style={styles.emptySub}>{empty.sub}</Text>
            </View>
          ) : (
            visible.map((job: any) => {
              const statusInfo = STATUS_MAP[job.status] || { label: job.status, variant: 'neutral' as const };
              const price = Number(job.agreedPrice || job.proposedPrice) || null;
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
                      {price != null && (
                        <View style={styles.listCardMeta}>
                          <Ionicons name="pricetag-outline" size={13} color={colors.muted} />
                          <Text style={styles.listMetaText}>UGX {price.toLocaleString()}</Text>
                        </View>
                      )}
                    </View>
                    <StatusBadge status={statusInfo.label} variant={statusInfo.variant} />
                  </View>
                  <View style={styles.viewDetails}>
                    <Text style={styles.viewDetailsText}>
                      {job.status === 'PENDING' ? 'View request' : 'View details'}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
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
  list: { gap: spacing.md, paddingBottom: spacing.xxxxl || spacing.xxl, flexGrow: 1 },
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
  listMetaText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, flexShrink: 1 },
  viewDetails: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  viewDetailsText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxxxl, gap: spacing.md, flexGrow: 1 },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  emptySub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: 'center' },
});
