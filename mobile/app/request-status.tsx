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

const STAGE_COPY: Record<string, { title: string; sub: (name: string) => string }> = {
  AWAITING_ASSIGNMENT: {
    title: 'Request received',
    sub: () => 'An admin is assigning a quantity surveyor to price your job.',
  },
  SURVEYOR_ASSIGNED: {
    title: 'Surveyor assigned',
    sub: (name) => `${name || 'Your surveyor'} is measuring the job and preparing your estimate.`,
  },
  ESTIMATE_READY: {
    title: 'Estimate ready',
    sub: () => 'Your request is with fundis nearby. We will tell you the moment one accepts.',
  },
};

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

  // Keep watching until the surveyor's figure lands, then stop polling.
  const ready = data?.ready === true;
  useEffect(() => {
    if (ready || loading) return;
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [ready, loading, load]);

  const booking = data?.booking ?? null;
  const stage: string = data?.stage || 'AWAITING_ASSIGNMENT';
  const surveyorName: string = data?.surveyorName || '';
  const estimate = data?.estimate ?? null;
  const copy = STAGE_COPY[stage] || STAGE_COPY.AWAITING_ASSIGNMENT;

  // Once the client has chosen someone the screen is really about waiting
  // for that fundi to accept, not about the surveyor any more.
  const pickedFundi: string = booking?.fundiName || '';
  const waitingOnFundi = ready && !!pickedFundi;
  const stageTitle = waitingOnFundi ? 'Fundi selected' : copy.title;
  const stageSub = waitingOnFundi
    ? `Waiting for ${pickedFundi} to accept your request.`
    : copy.sub(surveyorName);

  const steps = ((data?.steps as Step[]) || []).map((step) => {
    let hint = '';
    if (step.key === 'submitted') hint = stamp(step.at);
    else if (step.key === 'review') hint = step.done ? `Completed${step.at ? ` ${stamp(step.at)}` : ''}` : 'Waiting for an admin to assign a surveyor';
    else if (step.key === 'survey') {
      hint = step.done
        ? `${surveyorName || 'The surveyor'} measured the job`
        : surveyorName
          ? `${surveyorName} is measuring the job`
          : 'Waiting for a surveyor';
    } else if (step.key === 'estimate') hint = step.done ? money(estimate?.total) : 'Pending';
    return { label: step.label, status: step.status, hint };
  });

  // The directory stays closed until the estimate lands, so this is the only
  // place a client walks from the tracking screen into picking a fundi.
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
        <View style={[styles.stageCard, ready && styles.stageCardReady]}>
          <View style={[styles.stageIcon, ready && styles.stageIconReady]}>
            <Ionicons
              name={
                waitingOnFundi
                  ? 'person-outline'
                  : ready
                    ? 'checkmark-circle'
                    : stage === 'SURVEYOR_ASSIGNED'
                      ? 'calculator-outline'
                      : 'hourglass-outline'
              }
              size={26}
              color={ready ? colors.white : colors.primaryDark}
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
          <Text style={styles.cardTitle}>Estimate</Text>
          {ready && estimate ? (
            <>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Labour</Text>
                <Text style={styles.amountValue}>{money(estimate.labour, estimate.currency)}</Text>
              </View>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Materials</Text>
                <Text style={styles.amountValue}>{money(estimate.materials, estimate.currency)}</Text>
              </View>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Service fee</Text>
                <Text style={styles.amountValue}>{money(estimate.serviceFee, estimate.currency)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.amountRow}>
                <Text style={styles.totalLabel}>Total estimate</Text>
                <Text style={styles.totalValue}>{money(estimate.total, estimate.currency)}</Text>
              </View>
              <Text style={styles.note}>
                {estimate.source === 'surveyor'
                  ? `Prepared by ${surveyorName || 'your quantity surveyor'}. You can still agree a different amount with your fundi on site — you pay after the work is done.`
                  : 'Indicative price for this job while the surveyor prepares the final figure. You pay after the work is done.'}
              </Text>
              {estimate.notes ? <Text style={styles.notes}>“{estimate.notes}”</Text> : null}
            </>
          ) : (
            <View style={styles.waiting}>
              <Ionicons name="time-outline" size={22} color={colors.muted} />
              <Text style={styles.waitingText}>
                Your quantity surveyor is still costing this job. The figure appears here as soon as it is ready.
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
              {pickedFundi ? 'Waiting for fundi' : ready ? 'Looking for a fundi' : 'With the surveyor'}
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
        {ready && !pickedFundi ? (
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
  amountLabel: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.inkSoft },
  amountValue: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  totalLabel: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.ink },
  totalValue: { fontFamily: fonts.bold, fontSize: 17, color: colors.primaryDark, letterSpacing: -0.3 },
  note: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: spacing.sm },
  notes: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 18, color: colors.inkSoft, marginTop: spacing.xs },

  waiting: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  waitingText: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18, color: colors.muted, textAlign: 'center' },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg, paddingVertical: 3 },
  detailLabel: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.inkSoft },
  detailValue: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.ink, flexShrink: 1, textAlign: 'right' },

  footer: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl, paddingTop: spacing.md, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
});
