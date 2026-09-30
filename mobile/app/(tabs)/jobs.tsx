import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SegmentedControl from '../../src/components/SegmentedControl';
import JobCard from '../../src/components/JobCard';
import Screen from '../../src/components/Screen';
import { getClientBookings } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { colors, fonts, radius, spacing } from '../../src/theme';

const TABS = ['All', 'Active', 'Completed'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ACTIVE = ['PENDING', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];

function statusKey(status: string): 'pending' | 'active' | 'completed' | 'cancelled' {
  if (status === 'PENDING') return 'pending';
  if (status === 'COMPLETED') return 'completed';
  if (status === 'CANCELLED' || status === 'DISPUTED') return 'cancelled';
  if (ACTIVE.includes(status)) return 'active';
  return 'pending';
}

function formatDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function JobsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!token) {
      setBookings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getClientBookings(token);
      setBookings(Array.isArray(data) ? data : data?.bookings ?? []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = bookings.filter((b) => {
    const key = statusKey(b.status);
    if (tab === 1) return key === 'pending' || key === 'active';
    if (tab === 2) return key === 'completed';
    return true;
  });

  return (
    <Screen bg={colors.white} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.h1}>My Jobs</Text>
      </View>

      <View style={styles.body}>
        <SegmentedControl options={TABS} selected={tab} onChange={setTab} />
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xxl }} />
          ) : visible.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="briefcase-outline" size={44} color={colors.muted} />
              <Text style={styles.emptyTitle}>No jobs yet</Text>
              <Text style={styles.emptySub}>Find a fundi and book them — your requests show up here.</Text>
              <Pressable style={styles.emptyBtn} onPress={() => router.push('/available-fundis')}>
                <Text style={styles.emptyBtnText}>Find a Fundi</Text>
              </Pressable>
            </View>
          ) : (
            visible.map((b) => (
              <JobCard
                key={String(b.id)}
                service={b.category || 'Service request'}
                location={b.address || 'Kampala'}
                date={formatDate(b.scheduledFor) || formatDate(b.created_at)}
                status={statusKey(b.status)}
                onPress={() =>
                  router.push({ pathname: '/job-tracking', params: { bookingId: String(b.id) } })
                }
              />
            ))
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg },
  h1: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: colors.ink },
  body: { flex: 1, paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, gap: spacing.lg },
  list: { gap: spacing.md, paddingBottom: spacing.xxxxl },
  empty: { alignItems: 'center', paddingTop: spacing.xxxl, gap: spacing.sm },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  emptySub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: 'center' },
  emptyBtn: { marginTop: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.primary },
  emptyBtnText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.black },
});
