import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../src/components/PrimaryButton';
import InputField from '../src/components/InputField';
import { IMAGES } from '../src/assets';
import { colors, fonts, radius, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { payForBooking } from '../src/services/api';
import { useAuth } from '../src/contexts/AuthContext';

type MethodKey = 'mtn' | 'airtel' | 'cash';

const METHODS: { key: MethodKey; label: string; hint: string; icon: any }[] = [
  { key: 'mtn', label: 'MTN Mobile Money', hint: 'Charged to your registered number', icon: 'phone-portrait-outline' },
  { key: 'airtel', label: 'Airtel Money', hint: 'Charged to your registered number', icon: 'call-outline' },
  { key: 'cash', label: 'Cash', hint: 'Pay the fundi directly', icon: 'cash-outline' },
];

export default function PaymentScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const params = useLocalSearchParams<{
    bookingId?: string;
    fundiName?: string;
    fundiTrade?: string;
    amount?: string;
  }>();

  const bookingId = params.bookingId ? String(params.bookingId) : '';
  const fundiName = params.fundiName?.trim() || 'Your fundi';
  const fundiTrade = params.fundiTrade?.trim() || 'Service';
  const agreed = Number(params.amount ?? 0);
  const hasAgreed = Number.isFinite(agreed) && agreed > 0;

  const [method, setMethod] = useState<MethodKey>('mtn');
  const [phone, setPhone] = useState(user?.phone || '');
  const [customAmount, setCustomAmount] = useState('');
  const [paying, setPaying] = useState(false);

  const amount = hasAgreed ? agreed : Number(customAmount.replace(/[^\d]/g, '')) || 0;
  const amountLabel = useMemo(() => `UGX ${amount.toLocaleString()}`, [amount]);

  const pay = async () => {
    if (!bookingId) {
      Alert.alert('Job missing', 'Go back and open the job you want to pay for.');
      return;
    }
    if (!token) {
      Alert.alert('Sign in required', 'Please sign in to pay.');
      return;
    }
    if (amount <= 0) {
      Alert.alert('Enter an amount', 'Type the amount you are paying for this job.');
      return;
    }
    if (method !== 'cash' && !phone.trim()) {
      Alert.alert('Phone number needed', 'Add the mobile money number to charge.');
      return;
    }

    setPaying(true);
    try {
      await payForBooking(token, {
        bookingId,
        method,
        ...(method !== 'cash' ? { phone: phone.trim() } : {}),
        ...(hasAgreed ? {} : { amount }),
      });
      router.replace({
        pathname: '/receipt',
        params: { bookingId, fundiName, fundiTrade },
      });
    } catch (e: any) {
      Alert.alert('Payment failed', e?.message || 'Could not complete the payment. Try again.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount to pay</Text>
          <Text style={styles.amount}>{amountLabel}</Text>
          <Text style={styles.amountMeta}>
            {fundiName} · {fundiTrade}
          </Text>
        </View>

        {!hasAgreed && (
          <InputField
            label="Amount (UGX)"
            placeholder="e.g. 150000"
            value={customAmount}
            onChangeText={(v) => setCustomAmount(v.replace(/[^\d]/g, ''))}
            keyboardType="number-pad"
          />
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment method</Text>
          <View style={styles.methods}>
            {METHODS.map((option) => {
              const active = method === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setMethod(option.key)}
                  style={[styles.methodRow, active && styles.methodRowActive]}
                >
                  <View style={[styles.methodIcon, active && styles.methodIconActive]}>
                    <Ionicons name={option.icon} size={18} color={active ? colors.ink : colors.muted} />
                  </View>
                  <View style={styles.methodText}>
                    <Text style={styles.methodLabel}>{option.label}</Text>
                    <Text style={styles.methodHint}>{option.hint}</Text>
                  </View>
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={active ? colors.primary : colors.border}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {method !== 'cash' && (
          <InputField
            label="Mobile Money Number"
            placeholder="07XXXXXXXX"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            icon={<Ionicons name="call-outline" size={18} color={colors.muted} />}
          />
        )}

        <View style={styles.note}>
          <Ionicons name="lock-closed-outline" size={15} color={colors.muted} />
          <Text style={styles.noteText}>
            {method === 'cash'
              ? 'Hand the cash to your fundi — the job is marked paid once you confirm.'
              : 'You will get a receipt right after the charge is confirmed. The fundi is paid instantly.'}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title={`Pay ${amountLabel}`} loading={paying} onPress={pay} disabled={amount <= 0} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: { height: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  backBtn: { position: 'absolute', left: spacing.xxl, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 85, height: 85 },
  body: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl, paddingTop: spacing.md, gap: spacing.lg },
  amountCard: {
    backgroundColor: colors.primaryFaint,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: 2,
  },
  amountLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkSoft },
  amount: { fontFamily: fonts.bold, fontSize: 30, color: colors.ink, letterSpacing: -0.5 },
  amountMeta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  section: { gap: spacing.sm },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  methods: { gap: spacing.sm },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.white,
  },
  methodRowActive: { borderColor: colors.primary, backgroundColor: colors.primaryFaint },
  methodIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.lightBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconActive: { backgroundColor: colors.white },
  methodText: { flex: 1 },
  methodLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  methodHint: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.muted, marginTop: 1 },
  note: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  noteText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.muted, lineHeight: 17 },
  footer: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl },
});
