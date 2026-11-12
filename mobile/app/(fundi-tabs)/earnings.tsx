import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PrimaryButton from '../../src/components/PrimaryButton';
import { useAuth } from '../../src/contexts/AuthContext';
import { getTransactions, getWallet } from '../../src/services/api';
import { colors, fonts, radius, shadowSm, spacing } from '../../src/theme';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BAR_MAX_HEIGHT = 112;
const BAR_WIDTH = 16;

const startOfWeek = (now: Date) => {
  const day = (now.getDay() + 6) % 7;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day);
  return start;
};

export default function FundiEarningsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!token) {
          setLoading(false);
          return;
        }
        try {
          const [walletRes, txRes] = await Promise.all([
            getWallet(token),
            getTransactions(token).catch(() => ({ transactions: [] })),
          ]);
          if (cancelled) return;
          setBalance(Number(walletRes?.wallet?.balance ?? 0));
          setTransactions(Array.isArray(txRes) ? txRes : txRes?.transactions ?? []);
        } catch (e: any) {
          console.log('Earnings fetch error:', e?.message);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [token]),
  );

  const now = new Date();
  const todayIndex = (now.getDay() + 6) % 7;
  const weekStart = startOfWeek(now);

  const { daily, weekTotal } = useMemo(() => {
    const totals = new Array(7).fill(0);
    for (const t of transactions) {
      if (t?.type !== 'payment_received') continue;
      if (t.status && t.status !== 'completed') continue;
      const created = new Date(t.createdAt ?? 0);
      if (Number.isNaN(created.getTime()) || created < weekStart) continue;
      const idx = (created.getDay() + 6) % 7;
      totals[idx] += Number(t.amount || 0);
    }
    return { daily: totals as number[], weekTotal: totals.reduce((sum, v) => sum + v, 0) };
  }, [transactions, weekStart]);

  const maxDay = Math.max(...daily, 1);

  const handleCashOut = () => {
    Alert.alert('Cash out', 'Contact support to withdraw your earnings to mobile money.');
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.loading]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Earnings</Text>
        <Text style={styles.weekLine}>
          <Text style={styles.weekLabel}>This week:{' '}</Text>
          <Text style={styles.weekValue}>UGX {weekTotal.toLocaleString()}</Text>
        </Text>

        <View style={styles.card}>
          <View style={styles.chart}>
            {daily.map((value, index) => {
              const isToday = index === todayIndex;
              const isFuture = index > todayIndex;
              const height = isFuture
                ? 10
                : Math.max(10, Math.round((value / maxDay) * BAR_MAX_HEIGHT));
              return (
                <View key={DAY_LABELS[index]} style={styles.col}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        { height, backgroundColor: isFuture ? colors.surface : isToday ? colors.primary : colors.border },
                      ]}
                    />
                  </View>
                  <Text style={[styles.dayLabel, isToday && styles.dayLabelActive]}>
                    {isToday ? 'Today' : DAY_LABELS[index]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.walletRow}>
            <View style={styles.walletIcon}>
              <Ionicons name="wallet" size={22} color={colors.primary} />
            </View>
            <View style={styles.walletCopy}>
              <Text style={styles.walletLabel}>Available to withdraw</Text>
              <Text style={styles.walletValue}>UGX {balance.toLocaleString()}</Text>
            </View>
            <PrimaryButton
              title="Cash out"
              variant="primary"
              compact
              fullWidth={false}
              onPress={handleCashOut}
              style={styles.cashBtn}
            />
          </View>
        </View>
      </ScrollView>

      <PressableFab onPress={() => router.push('/(fundi-tabs)/messages')} bottom={spacing.xl} />
    </View>
  );
}

function PressableFab({ onPress, bottom }: { onPress: () => void; bottom: number }) {
  return (
    <View style={[styles.fab, { bottom }]} pointerEvents="box-none">
      <Pressable onPress={onPress} style={({ pressed }) => [styles.fabBtn, pressed && styles.fabPressed]}>
        <Ionicons name="chatbubble" size={24} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.lightBg },
  loading: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 110 },
  title: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 34, color: colors.ink },
  weekLine: { marginTop: spacing.xs },
  weekLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
  weekValue: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadowSm,
  },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  col: { alignItems: 'center', flex: 1 },
  barTrack: { height: BAR_MAX_HEIGHT + 8, justifyContent: 'flex-end' },
  bar: { width: BAR_WIDTH, borderRadius: BAR_WIDTH / 2 },
  dayLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, marginTop: spacing.sm },
  dayLabelActive: { fontFamily: fonts.semibold, fontSize: 11, color: colors.ink },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  walletIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletCopy: { flex: 1 },
  walletLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  walletValue: { fontFamily: fonts.bold, fontSize: 17, color: colors.primary, marginTop: 2 },
  cashBtn: { borderRadius: radius.pill, paddingHorizontal: spacing.lg },
  fab: { position: 'absolute', right: spacing.lg },
  fabBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowSm,
  },
  fabPressed: { opacity: 0.85 },
});
