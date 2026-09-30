import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NavigationBar } from 'expo-navigation-bar';

import PrimaryButton from '../src/components/PrimaryButton';
import { colors, fonts, radius, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function JobCompletedScreen() {
  const router = useRouter();
  const { fundiName, fundiTrade, rating, amount, bookingId, paid } = useLocalSearchParams<{
    fundiName?: string;
    fundiTrade?: string;
    rating?: string;
    amount?: string;
    bookingId?: string;
    paid?: string;
  }>();

  const amountValue = Number(amount);
  const hasAmount = amount !== undefined && amount !== '' && Number.isFinite(amountValue);
  const jobId = bookingId ? String(bookingId) : '';
  const isPaid = paid === '1' || paid === 'true';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <NavigationBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor={colors.darkBlack} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
        </View>
        <Text style={styles.h1}>Job Completed!</Text>
        <Text style={styles.sub}>The work has been successfully completed.</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Fundi</Text>
            <Text style={styles.value}>{fundiName?.trim() || 'Your fundi'}</Text>
          </View>
          {fundiTrade?.trim() ? (
            <View style={styles.row}>
              <Text style={styles.label}>Service</Text>
              <Text style={styles.value}>{fundiTrade}</Text>
            </View>
          ) : null}
          {hasAmount ? (
            <View style={styles.row}>
              <Text style={styles.label}>Total Amount</Text>
              <Text style={styles.amount}>UGX {amountValue.toLocaleString()}</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.label}>Payment</Text>
            <Text style={[styles.value, isPaid ? styles.paidText : styles.unpaidText]}>
              {isPaid ? 'Paid' : 'Pending'}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {jobId ? (
          <PrimaryButton
            title={isPaid ? 'View Receipt' : hasAmount ? `Pay UGX ${amountValue.toLocaleString()}` : 'Pay Now'}
            onPress={() =>
              router.push({
                pathname: isPaid ? '/receipt' : '/payment',
                params: { bookingId: jobId, fundiName: fundiName || '', fundiTrade: fundiTrade || '', amount: hasAmount ? String(amountValue) : '' },
              })
            }
          />
        ) : null}
        <PrimaryButton
          title="Leave a Review"
          variant={jobId ? 'secondary' : 'primary'}
          onPress={() =>
            router.push({
              pathname: '/review',
              params: { fundiName: fundiName || '', trade: fundiTrade || '', rating: rating || '' },
            })
          }
        />
        {jobId ? null : <PrimaryButton title="Back to Home" variant="secondary" onPress={() => router.replace('/(tabs)')} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.darkBlack },
  body: { alignItems: 'center', paddingHorizontal: spacing.xxl, gap: spacing.lg, paddingTop: spacing.xxxxl, paddingBottom: spacing.xl },
  iconWrap: { marginBottom: spacing.md },
  h1: { fontFamily: fonts.bold, fontSize: 24, color: colors.white, textAlign: 'center' },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center' },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.lg,
    padding: spacing.xxl,
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  value: { fontFamily: fonts.medium, fontSize: 14, color: colors.white },
  amount: { fontFamily: fonts.bold, fontSize: 16, color: colors.primary },
  paidText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.success },
  unpaidText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
  footer: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl, gap: spacing.md },
});
