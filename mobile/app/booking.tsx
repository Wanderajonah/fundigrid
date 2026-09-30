import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../src/components/PrimaryButton';
import FundiSummaryCard from '../src/components/FundiSummaryCard';
import InputField from '../src/components/InputField';
import SelectField from '../src/components/SelectField';
import { IMAGES } from '../src/assets';
import { colors, fonts, radius, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createBooking, getJobEstimate } from '../src/services/api';
import { useAuth } from '../src/contexts/AuthContext';
import { getCurrentLocation } from '../src/services/location';
import { clearRequestDraft, getRequestDraft } from '../src/services/requestDraft';
import { DEFAULT_REGION } from '../src/maps/config';

const TIME_OPTIONS = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM'];

function buildScheduledFor(date: string, time: string): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!dateMatch || !timeMatch) return null;
  let hour = parseInt(timeMatch[1], 10) % 12;
  if (/pm/i.test(timeMatch[3])) hour += 12;
  const d = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    hour,
    Number(timeMatch[2])
  );
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function BookingScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const params = useLocalSearchParams<{ fundiId?: string; name?: string; trade?: string; rating?: string }>();

  // Details typed on the request screen are pre-filled here so the client
  // never answers the same question twice.
  const draft = getRequestDraft();

  const fundiId = params.fundiId ? String(params.fundiId) : '';
  const fundiName = params.name ? String(params.name) : 'Your fundi';
  const trade = params.trade ? String(params.trade) : 'Service';
  const rating = Number(params.rating ?? 0);

  const [date, setDate] = useState(draft.date);
  const [time, setTime] = useState('');
  const [description, setDescription] = useState(draft.description);
  const [address, setAddress] = useState(draft.location);
  const [submitting, setSubmitting] = useState(false);
  const attachedPhotos = draft.photos;

  const category = draft.service || trade.split(',')[0].trim();
  const [estimate, setEstimate] = useState<{
    labour: number;
    materials: number;
    serviceFee: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    getJobEstimate(token, category)
      .then((res) => {
        if (alive && res?.estimate) setEstimate(res.estimate);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [token, category]);

  const summary = useMemo(
    () => ({ name: fundiName, trade, rating, image: IMAGES.fundi }),
    [fundiName, trade, rating]
  );

  const confirm = async () => {
    if (!fundiId) {
      Alert.alert('Fundi missing', 'Go back and pick a fundi to book.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Describe the job', 'Add a short description so the fundi knows what to expect.');
      return;
    }
    if (!token) {
      Alert.alert('Sign in required', 'Please sign in to book a fundi.');
      return;
    }

    setSubmitting(true);
    try {
      const device = await getCurrentLocation();
      const location = device
        ? { lat: device.latitude, lng: device.longitude }
        : { lat: DEFAULT_REGION.latitude, lng: DEFAULT_REGION.longitude };

      const scheduledFor = buildScheduledFor(date, time);
      const data = await createBooking(token, {
        fundiId,
        category,
        description: description.trim(),
        address: address.trim() || (device ? device.address || '' : ''),
        location,
        ...(draft.photos.length ? { images: draft.photos } : {}),
        ...(scheduledFor ? { scheduledFor } : {}),
      });
      clearRequestDraft();

      const booking = data?.booking;
      router.replace({
        pathname: '/booking-confirmed',
        params: {
          bookingId: booking?.id ? String(booking.id) : '',
          fundiName,
          category,
          date,
          time,
          estimate: estimate ? String(estimate.total) : '',
        },
      });
    } catch (e: any) {
      Alert.alert('Booking failed', e?.message || 'Could not create the booking. Try again.');
    } finally {
      setSubmitting(false);
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

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <FundiSummaryCard {...summary} />

        {draft.service || draft.description || draft.location || draft.date ? (
          <View style={styles.fromRequest}>
            <Ionicons name="checkmark-circle" size={15} color={colors.success} />
            <Text style={styles.fromRequestText}>Details from your request — edit anything below before confirming.</Text>
          </View>
        ) : null}

        <InputField
          label="Job Description"
          placeholder="e.g. Kitchen sink is leaking under the cabinet"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          style={styles.textarea}
        />
        <InputField
          label="Address"
          placeholder="e.g. Plot 12, Ntinda, Kampala"
          value={address}
          onChangeText={setAddress}
        />

        <InputField
          label="Preferred Date"
          placeholder="YYYY-MM-DD"
          value={date}
          onChangeText={setDate}
          keyboardType="numbers-and-punctuation"
        />
        <SelectField label="Preferred Time" value={time} onChange={setTime} options={TIME_OPTIONS} placeholder="Select time" />

        {attachedPhotos.length > 0 && (
          <View style={styles.photoBlock}>
            <Text style={styles.photoLabel}>Photos from your request</Text>
            <View style={styles.photoRow}>
              {attachedPhotos.map((uri, i) => (
                <Image key={`${uri}-${i}`} source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
              ))}
            </View>
          </View>
        )}

        {estimate ? (
          <View style={styles.estimateCard}>
            <View style={styles.estimateHead}>
              <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
              <Text style={styles.paymentTitle}>Cost Estimate</Text>
            </View>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Labour</Text>
              <Text style={styles.estimateValue}>UGX {estimate.labour.toLocaleString()}</Text>
            </View>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Materials</Text>
              <Text style={styles.estimateValue}>UGX {estimate.materials.toLocaleString()}</Text>
            </View>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Service fee</Text>
              <Text style={styles.estimateValue}>UGX {estimate.serviceFee.toLocaleString()}</Text>
            </View>
            <View style={styles.estimateDivider} />
            <View style={styles.estimateRow}>
              <Text style={styles.estimateTotalLabel}>Total estimate</Text>
              <Text style={styles.estimateTotal}>UGX {estimate.total.toLocaleString()}</Text>
            </View>
            <Text style={styles.estimateNote}>
              Indicative price for this job — you can agree a different amount with your fundi on site. You pay after the work is done.
            </Text>
          </View>
        ) : null}

        <View style={styles.paymentCard}>
          <Text style={styles.paymentTitle}>Payment Method</Text>
          <Text style={styles.paymentNote}>Payment will be processed after the job is completed. You can pay via Mobile Money or Cash.</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="Confirm Booking" loading={submitting} onPress={confirm} />
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
  textarea: { minHeight: 72, textAlignVertical: 'top', paddingTop: 10 },
  fromRequest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  fromRequestText: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft, flex: 1, lineHeight: 17 },
  photoBlock: { gap: 6 },
  photoLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  photoRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  photoThumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.lightBg },
  estimateCard: {
    backgroundColor: colors.primaryFaint,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  estimateHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  estimateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  estimateLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft },
  estimateValue: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  estimateDivider: { height: 1, backgroundColor: colors.primary, opacity: 0.25, marginVertical: 2 },
  estimateTotalLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  estimateTotal: { fontFamily: fonts.bold, fontSize: 16, color: colors.primary },
  estimateNote: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft, lineHeight: 18 },
  paymentCard: {
    backgroundColor: colors.lightBg,
    borderRadius: 12,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  paymentTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  paymentNote: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 20 },
  footer: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl },
});
