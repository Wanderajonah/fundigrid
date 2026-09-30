import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IMAGES } from '../src/assets';
import { categoryImage } from '../src/data/categories';
import { colors, fonts, radius, spacing } from '../src/theme';
import { useAuth } from '../src/contexts/AuthContext';
import { acceptBooking, declineBooking, getFundiBookingById } from '../src/services/api';
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
      Alert.alert('Accepted', 'You have accepted this booking.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
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

  const category = booking?.category || 'Job Request';
  const status = booking?.status || 'PENDING';
  const isPending = status === 'PENDING';

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

            <View style={styles.infoGrid}>
              <View style={styles.infoBox}>
                <View style={styles.infoIcon}>
                  <Ionicons name="time" size={16} color={colors.primary} />
                </View>
                <Text style={styles.infoValue}>{formatDate(booking.scheduledFor) || 'ASAP'}</Text>
                <Text style={styles.infoLabel}>Scheduled</Text>
              </View>
              <View style={styles.infoBox}>
                <View style={styles.infoIcon}>
                  <Ionicons name="hourglass" size={16} color={colors.primary} />
                </View>
                <Text style={styles.infoValue}>{Math.round(Number(booking.estimatedDuration || 60))} min</Text>
                <Text style={styles.infoLabel}>Est. Time</Text>
              </View>
              <View style={styles.infoBox}>
                <View style={styles.infoIcon}>
                  <Ionicons name="location" size={16} color={colors.primary} />
                </View>
                <Text style={styles.infoValue}>{booking.address || 'Kampala'}</Text>
                <Text style={styles.infoLabel}>Location</Text>
              </View>
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
  infoGrid: { flexDirection: 'row', gap: spacing.md },
  infoBox: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoValue: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, textAlign: 'center' },
  infoLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
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
  statusRow: { height: 52, borderRadius: radius.md, backgroundColor: colors.lightBg, alignItems: 'center', justifyContent: 'center' },
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
