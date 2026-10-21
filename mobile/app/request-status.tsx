import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import PrimaryButton from '../src/components/PrimaryButton';
import Timeline from '../src/components/Timeline';
import { IMAGES } from '../src/assets';
import { getRequestProgress } from '../src/services/api';
import { isKnownCategory } from '../src/data/categories';
import { useAuth } from '../src/contexts/AuthContext';
import { colors, fonts, radius, shadowSm, spacing } from '../src/theme';

const POLL_MS = 8000;

type Step = { key: string; label: string; at: string | null; done: boolean; status: 'completed' | 'current' | 'pending' };

// Statuses that mean a fundi is actually on the job.
const ACTIVE_STATUSES = ['ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'];

function stamp(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString(
    undefined,
    { hour: '2-digit', minute: '2-digit' },
  )}`;
}

function money(value: any, currency = 'UGX'): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${currency} ${n.toLocaleString()}`;
}

export default function RequestStatusScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = params.bookingId ? String(params.bookingId) : '';

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token || !bookingId) {
      setLoading(false);
      return;
    }
    try {
      const res = await getRequestProgress(token, bookingId);
      setData(res);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Could not load this request.');
    } finally {
      setLoading(false);
    }
  }, [token, bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep watching while the request still waits on a fundi, so the screen
  // flips the moment one accepts. After that the job has its own screen.
  const booking = data?.booking ?? null;
  const status: string = booking?.status || 'PENDING';
  const closed = status === 'CANCELLED' || status === 'DISPUTED';
  const pickedFundi: string = booking?.fundiName || '';
  const active = ACTIVE_STATUSES.includes(status);
  const waiting = !active && !closed;

  useEffect(() => {
    if (!waiting || loading) return;
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [waiting, loading, load]);

  const priceAgreed = Boolean(booking?.priceAgreed) && Number(booking?.agreedPrice) > 0;
  const quote = Number(booking?.proposedPrice) || 0;
  const quotePending = !priceAgreed && quote > 0;

  // What the screen is about right now: finding a fundi, waiting for one to
  // accept, or watching the job run.
  const stageTitle = closed
    ? 'Request closed'
    : active
      ? 'Fundi on the job'
      : pickedFundi
        ? 'Fundi selected'
        : 'Request received';
  const stageSub = closed
    ? 'This request was cancelled. You can post a new one any time.'
    : active
      ? `${pickedFundi || 'Your fundi'} is handling this job. Track it from My Requests.`
      : pickedFundi
        ? `Waiting for ${pickedFundi} to accept your request.`
        : 'Your request is with fundis nearby. Pick one and they will confirm the job.';

  const steps = ((data?.steps as Step[]) || []).map((step) => {
    let hint = '';
    if (step.key === 'submitted') hint = stamp(step.at);
    else if (step.key === 'fundi') hint = step.done ? pickedFundi || 'Chosen' : 'Pick a fundi below';
    else if (step.key === 'accepted')
      hint = step.done ? 'Confirmed' : pickedFundi ? `Waiting for ${pickedFundi}` : 'Waiting for a fundi';
    else if (step.key === 'priced')
      hint = step.done
        ? money(booking?.agreedPrice)
        : active
          ? 'Waiting for the fundi to quote'
          : 'The fundi quotes after seeing the site';
    else if (step.key === 'started') hint = step.done ? 'Work in progress' : 'Starts once the price is agreed';
    else if (step.key === 'completed') hint = step.done ? 'Done' : 'When the work is finished';
    return { label: step.label, status: step.status, hint };
  });

  // The request is live from the moment it is posted, so this is where the
  // client walks straight into picking a fundi.
  const findFundi = () => {
    const area = String(booking?.address || '').split(',')[0].trim();
    router.push({
      pathname: '/available-fundis',
      params: {
        bookingId,
        ...(isKnownCategory(booking?.category || '') ? { category: booking.category } : {}),
        ...(area ? { area } : {}),
      },
    });
  };

  const trackJob = () => router.push({ pathname: '/job-tracking', params: { bookingId } });

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
          <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
          <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.muted} />
          <Text style={styles.errorText}>{error || 'Request not found.'}</Text>
          <Pressable onPress={() => { setLoading(true); load(); }} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.stageCard, active && styles.stageCardReady]}>
          <View style={[styles.stageIcon, active && styles.stageIconReady]}>
            <Ionicons
              name={
                active
                  ? 'checkmark-circle'
                  : closed
                    ? 'close-circle-outline'
                    : pickedFundi
                      ? 'person-outline'
                      : 'hourglass-outline'
              }
              size={26}
              color={active ? colors.white : colors.primaryDark}
            />
          </View>
          <View style={styles.stageCopy}>
            <Text style={styles.stageTitle}>{stageTitle}</Text>
            <Text style={styles.stageSub}>{stageSub}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Progress</Text>
          <Timeline steps={steps} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Price</Text>
          {priceAgreed ? (
            <>
              <View style={styles.amountRow}>
                <Text style={styles.totalLabel}>Agreed price</Text>
                <Text style={styles.totalValue}>{money(booking?.agreedPrice)}</Text>
              </View>
              <Text style={styles.note}>
                You and your fundi settled on this amount. You pay after the work is done.
              </Text>
            </>
          ) : quotePending ? (
            <>
              <View style={styles.amountRow}>
                <Text style={styles.totalLabel}>Quote from {pickedFundi || 'your fundi'}</Text>
                <Text style={styles.totalValue}>{money(quote)}</Text>
              </View>
              <Text style={styles.note}>
                Accept it from the job screen to lock the price in — the work starts once you do.
              </Text>
            </>
          ) : (
            <View style={styles.waiting}>
              <Ionicons name="pricetag-outline" size={22} color={colors.muted} />
              <Text style={styles.waitingText}>
                Your fundi quotes after seeing the site. You agree the price before any work starts, and you
                pay once the job is done.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Request details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Service</Text>
            <Text style={styles.detailValue}>{booking.category || 'Service request'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Requested</Text>
            <Text style={styles.detailValue}>{stamp(booking.created_at) || '—'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{booking.address || '—'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={styles.detailValue}>
              {closed ? 'Cancelled' : active ? 'Under way' : pickedFundi ? 'Waiting for fundi' : 'Looking for a fundi'}
            </Text>
          </View>
          {pickedFundi ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Fundi</Text>
              <Text style={styles.detailValue}>{pickedFundi}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {active ? (
          <PrimaryButton title="Track Job" onPress={trackJob} />
        ) : !closed && !pickedFundi ? (
          <PrimaryButton title="Find a Fundi" onPress={findFundi} />
        ) : (
          <PrimaryButton title="View My Requests" onPress={() => router.push('/(tabs)/jobs')} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.offWhite },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { position: 'absolute', left: spacing.xxl, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 85, height: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xxl },
  errorText: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft, textAlign: 'center' },
  retryBtn: { paddingHorizontal: spacing.xl, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.primary },
  retryText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.black },

  body: { padding: spacing.xxl, gap: spacing.lg, paddingBottom: spacing.xxxxl },

  stageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadowSm,
  },
  stageCardReady: { backgroundColor: colors.successSoft, borderColor: '#CDEBDC' },
  stageIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageIconReady: { backgroundColor: colors.success },
  stageCopy: { flex: 1, gap: 2 },
  stageTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  stageSub: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18, color: colors.inkSoft },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.sm,
    ...shadowSm,
  },
  cardTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, marginBottom: spacing.xs },

  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  totalLabel: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.ink },
  totalValue: { fontFamily: fonts.bold, fontSize: 17, color: colors.primaryDark, letterSpacing: -0.3 },
  note: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: spacing.sm },

  waiting: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  waitingText: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18, color: colors.muted, textAlign: 'center' },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg, paddingVertical: 3 },
  detailLabel: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.inkSoft },
  detailValue: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.ink, flexShrink: 1, textAlign: 'right' },

  footer: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl, paddingTop: spacing.md, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
});
