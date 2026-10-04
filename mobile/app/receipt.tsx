import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../src/components/PrimaryButton';
import { IMAGES } from '../src/assets';
import { colors, fonts, radius, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPaymentReceipt } from '../src/services/api';
import { useAuth } from '../src/contexts/AuthContext';

type Receipt = {
  reference?: string;
  method?: string;
  amount?: number;
  currency?: string;
  status?: string;
  paidAt?: string;
  bookingId?: string;
  fundiName?: string;
  category?: string;
  phone?: string;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatWhen(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || '—'}</Text>
    </View>
  );
}

export default function ReceiptScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { bookingId, fundiName, fundiTrade } = useLocalSearchParams<{
    bookingId?: string;
    fundiName?: string;
    fundiTrade?: string;
  }>();

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token || !bookingId) {
      setError('Job not selected.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await getPaymentReceipt(token, String(bookingId));
      setReceipt(data?.receipt ?? null);
    } catch (e: any) {
      setError(e?.message || 'No payment found for this job.');
      setReceipt(null);
    } finally {
      setLoading(false);
    }
  }, [token, bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  const shareReceipt = async () => {
    if (!receipt) return;
    const lines = [
      'FundiGrid Payment Receipt',
      `Reference: ${receipt.reference}`,
      `Amount: ${receipt.currency || 'UGX'} ${Number(receipt.amount || 0).toLocaleString()}`,
      `Method: ${receipt.method}`,
      `Date: ${formatWhen(receipt.paidAt)}`,
      `Job: ${receipt.category || 'Service'} with ${receipt.fundiName || 'fundi'}`,
      `Status: Paid`,
    ];
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      // user dismissed the share sheet
    }
  };

  const amount = Number(receipt?.amount || 0);

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
          <Text style={styles.centerText}>Loading receipt…</Text>
        </View>
      ) : !receipt ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={44} color={colors.muted} />
          <Text style={styles.centerText}>{error || 'No payment for this job yet.'}</Text>
          <Pressable
            onPress={() =>
              router.replace({
                pathname: '/payment',
                params: { bookingId: String(bookingId || ''), fundiName: fundiName || '', fundiTrade: fundiTrade || '' },
              })
            }
            style={styles.retry}
          >
            <Text style={styles.retryText}>Pay now</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <View style={styles.checkWrap}>
                <Ionicons name="checkmark" size={30} color={colors.white} />
              </View>
              <Text style={styles.heroTitle}>Payment received</Text>
              <Text style={styles.amount}>UGX {amount.toLocaleString()}</Text>
              <View style={styles.paidPill}>
                <Text style={styles.paidPillText}>Paid</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Row label="Reference" value={receipt.reference} />
              <Row label="Method" value={receipt.method} />
              <Row label="Paid on" value={formatWhen(receipt.paidAt)} />
              {receipt.phone ? <Row label="Mobile Money" value={receipt.phone} /> : null}
              <Row label="Job" value={receipt.category || 'Service'} />
              <Row label="Fundi" value={receipt.fundiName || fundiName || undefined} />
              <Row label="Booking ID" value={receipt.bookingId ? String(receipt.bookingId).slice(0, 8) : undefined} />
            </View>

            <Pressable onPress={shareReceipt} style={styles.shareRow} hitSlop={8}>
              <Ionicons name="share-outline" size={16} color={colors.primary} />
              <Text style={styles.shareText}>Share receipt</Text>
            </Pressable>
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton
              title="Leave a Review"
              onPress={() =>
                router.push({
                  pathname: '/review',
                  params: {
                    fundiName: receipt.fundiName || fundiName || '',
                    trade: receipt.category || fundiTrade || '',
                    rating: '',
                    bookingId: receipt.bookingId || bookingId || '',
                  },
                })
              }
            />
            <PrimaryButton title="Back to Home" variant="secondary" onPress={() => router.replace('/(tabs)')} />
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
  retryText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  body: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl, gap: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.xs },
  checkWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  heroTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.inkSoft },
  amount: { fontFamily: fonts.bold, fontSize: 30, color: colors.ink, letterSpacing: -0.5 },
  paidPill: { marginTop: 4, backgroundColor: colors.successSoft, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 4 },
  paidPillText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.success },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  value: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink, flexShrink: 1, textAlign: 'right' },
  shareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  shareText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  footer: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl, gap: spacing.sm },
});
