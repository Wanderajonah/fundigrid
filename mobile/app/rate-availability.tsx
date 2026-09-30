import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import PrimaryButton from '../src/components/PrimaryButton';
import Chip from '../src/components/Chip';
import InputField from '../src/components/InputField';
import SectionHeader from '../src/components/SectionHeader';
import { IMAGES } from '../src/assets';
import { colors, fonts, radius, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AvailabilityScreen() {
  const router = useRouter();
  const { role, trades, experience, radius } = useLocalSearchParams<{
    role?: string;
    trades?: string;
    experience?: string;
    radius?: string;
  }>();
  const [days, setDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');

  useEffect(() => {
    if (role !== 'fundi') router.replace('/role');
  }, [role, router]);

  const toggleDay = (d: string) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((k) => k !== d) : [...prev, d]));
  };

  const handleNext = () => {
    if (days.length === 0) {
      Alert.alert('Required', 'Please select at least one available day.');
      return;
    }
    router.push({
      pathname: '/verification',
      params: {
        role: 'fundi',
        trades,
        experience,
        radius,
        days: days.join(','),
        startTime,
        endTime,
      },
    });
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
        <SectionHeader title="Set Your Availability" subtitle="Let clients know when you're available." />

        <Text style={styles.label}>Available Days</Text>
        <View style={styles.days}>
          {DAYS.map((d) => (
            <Chip key={d} label={d} active={days.includes(d)} compact onPress={() => toggleDay(d)} />
          ))}
        </View>

        <Text style={styles.label}>Available Time</Text>
        <View style={styles.timeRow}>
          <InputField
            style={styles.timeInput}
            value={startTime}
            onChangeText={setStartTime}
            placeholder="08:00"
            keyboardType="numbers-and-punctuation"
          />
          <Text style={styles.timeDash}>-</Text>
          <InputField
            style={styles.timeInput}
            value={endTime}
            onChangeText={setEndTime}
            placeholder="17:00"
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="Next" onPress={handleNext} />
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
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  timeInput: { flex: 1, height: 50 },
  timeDash: { fontFamily: fonts.semibold, fontSize: 16, color: colors.muted },
  footer: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl },
});
