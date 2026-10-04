import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IMAGES } from '../src/assets';
import { categoryImage } from '../src/data/categories';
import { colors, fonts, radius, spacing } from '../src/theme';
import { useAuth } from '../src/contexts/AuthContext';
import { acceptBooking, declineBooking, getFundiBookingById, updateBookingStatus } from '../src/services/api';
import StatusBadge from '../src/components/StatusBadge';

const STATUS_LABELS: Record<string, string> = {
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
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function FundiJobDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token || !bookingId) {
      setError('Job not found.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getFundiBookingById(token, String(bookingId));
      setBooking(data?.booking ?? null);
      if (!data?.booking) setError('Job not found.');
    } catch (e: any) {
      setError(e?.message || 'Could not load this job.');
    } finally {
      setLoading(false);
    }
  }, [token, bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAccept = async () => {
    if (!token || !bookingId) return;
    setActionLoading(true);
    try {
      await acceptBooking(token, String(bookingId));
      // Accepted jobs open straight into the navigation map.
      router.replace({ pathname: '/fundi-navigation', params: { bookingId: String(bookingId) } });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to accept.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!token || !bookingId) return;
    setActionLoading(true);
    try {
      await declineBooking(token, String(bookingId));
      Alert.alert('Declined', 'You have declined this booking.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to decline.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdvance = async (next: string) => {
    if (!token || !bookingId) return;
    setActionLoading(true);
    try {
      await updateBookingStatus(token, String(bookingId), next);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not update this job.');
    } finally {
      setActionLoading(false);
    }
  };

  const category = booking?.category || 'Job Request';
  const status = booking?.status || 'PENDING';
  const isPending = status === 'PENDING';
  // Closed jobs must outrank the "waiting for the client" note, otherwise a
  // client-confirmed completion still reads as pending on the fundi's side.
  const isClosed = status === 'COMPLETED' || status === 'CANCELLED' || status === 'DISPUTED';
  // The client confirms completion, so the fundi's last action is reporting
  // the work finished — nothing after that belongs to them.
  const workFinished = Boolean(booking?.fundiCompleted);
  const STEPS = [
    { from: 'ACCEPTED', next: 'ON_THE_WAY', label: 'Start travelling' },
    { from: 'ON_THE_WAY', next: 'ARRIVED', label: "I've arrived" },
    { from: 'ARRIVED', next: 'IN_PROGRESS', label: 'Start work' },
    { from: 'IN_PROGRESS', next: 'COMPLETED', label: 'Mark work complete' },
  ];
  const nextStep = STEPS.find(s => s.from === status);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error || !booking ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.muted} />
          <Text style={styles.centerText}>{error || 'Job not found.'}</Text>
          <Pressable onPress={load} style={styles.retry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.imageContainer}>
              <Image
                source={categoryImage(category) ?? IMAGES.plumbing}
                style={styles.jobImage}
                resizeMode="cover"
              />
              {booking.address ? (
                <View style={styles.imageOverlay}>
                  <View style={styles.priceTag}>
                    <Text style={styles.priceText}>{booking.address}</Text>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.section}>
              <View style={styles.titleRow}>
                <Text style={styles.jobTitle}>{category}</Text>
                <StatusBadge
                  status={STATUS_LABELS[status] || status}
                  variant={status === 'COMPLETED' ? 'success' : status === 'CANCELLED' ? 'error' : isPending ? 'info' : 'warning'}
                />
              </View>
              <Text style={styles.subtitle}>
                {booking.fundiName ? `Requested by a client · ${formatDate(booking.created_at)}` : formatDate(booking.created_at)}
              </Text>
            </View>

            <View style={styles.detailCard}>
              {[
                { icon: 'calendar-outline', label: 'Scheduled', value: formatDate(booking.scheduledFor) || 'ASAP' },
                {
                  icon: 'hourglass-outline',
                  label: 'Est. time',
                  value: `${Math.round(Number(booking.estimatedDuration || 60))} min`,
                },
                { icon: 'location-outline', label: 'Location', value: booking.address || 'Kampala' },
              ].map((row, i, arr) => (
                <View
                  key={row.label}
                  style={[styles.detailRow, i < arr.length - 1 && styles.detailRowDivider]}
                >
                  <View style={styles.detailIcon}>
                    <Ionicons name={row.icon as any} size={16} color={colors.primary} />
                  </View>
                  <Text style={styles.detailLabel}>{row.label}</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Client Message</Text>
              <Text style={styles.messageText}>
                {booking.description?.trim() || 'No extra details provided.'}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Payment</Text>
              <Text style={styles.messageText}>
                {booking.agreedPrice
                  ? `Agreed price: UGX ${Number(booking.agreedPrice).toLocaleString()}`
                  : Number(booking.estimate?.total) > 0
                    ? `Client estimate: UGX ${Number(booking.estimate.total).toLocaleString()} — agree the final price with the client on site. Payment is collected after the job is completed.`
                    : 'Agree a price with the client after inspection. Payment is collected after the job is completed.'}
              </Text>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 16, spacing.xxxl) }]}>
            {isPending ? (
              <>
                <Pressable style={styles.acceptBtn} onPress={handleAccept} disabled={actionLoading}>
                  <Text style={styles.acceptText}>{actionLoading ? 'Processing...' : 'Accept Job'}</Text>
                </Pressable>
                <Pressable style={styles.declineBtn} onPress={handleDecline} disabled={actionLoading}>
                  <Text style={styles.declineText}>Decline</Text>
                </Pressable>
              </>
            ) : isClosed ? (
              <View style={styles.statusRow}>
                <Ionicons
                  name={status === 'COMPLETED' ? 'checkmark-done' : 'close-circle'}
                  size={18}
                  color={status === 'COMPLETED' ? colors.success : colors.danger}
                />
                <Text style={styles.statusText}>
                  {status === 'COMPLETED'
                    ? 'Job completed — the client confirmed it'
                    : status === 'CANCELLED'
                      ? 'This job was cancelled'
                      : 'This job is under dispute'}
                </Text>
              </View>
            ) : workFinished ? (
              <View style={styles.statusRow}>
                <Ionicons name="checkmark-done" size={18} color={colors.primary} />
                <Text style={styles.statusText}>Work reported finished — waiting for the client to confirm</Text>
              </View>
            ) : nextStep ? (
              <Pressable style={styles.acceptBtn} onPress={() => handleAdvance(nextStep.next)} disabled={actionLoading}>
                <Text style={styles.acceptText}>{actionLoading ? 'Updating…' : nextStep.label}</Text>
              </Pressable>
            ) : (
              <View style={styles.statusRow}>
                <Text style={styles.statusText}>Status: {STATUS_LABELS[status] || status}</Text>
              </View>
            )}
          </View>
        </>
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xxl },
  centerText: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center' },
  retry: { marginTop: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.primary },
  retryText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.black },
  content: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: spacing.xxxxl, gap: spacing.xl },
  imageContainer: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    height: 220,
    backgroundColor: colors.lightBg,
  },
  jobImage: { width: '100%', height: '100%' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, flexDirection: 'row', justifyContent: 'flex-end' },
  priceTag: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.sm },
  priceText: { fontFamily: fonts.bold, fontSize: 14, color: colors.black },
  section: { gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  jobTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.ink, flex: 1 },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  detailRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, width: 78 },
  detailValue: { flex: 1, fontFamily: fonts.medium, fontSize: 13.5, color: colors.ink, textAlign: 'right' },
  card: {
    backgroundColor: colors.lightBg,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  messageText: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft, lineHeight: 21 },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusRow: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.lightBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  statusText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  acceptBtn: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
  declineBtn: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  declineText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.inkSoft },
});
