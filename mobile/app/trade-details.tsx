import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../src/components/PrimaryButton';
import SelectField from '../src/components/SelectField';
import TradeCard from '../src/components/TradeCard';
import SectionHeader from '../src/components/SectionHeader';
import { CATEGORIES, toCategoryLabel } from '../src/data/categories';
import { IMAGES } from '../src/assets';
import { colors, fonts, radius, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TradeDetailsScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const [selected, setSelected] = useState<string[]>([]);
  const [customTrade, setCustomTrade] = useState('');
  const [experience, setExperience] = useState('');
  const [radius, setRadius] = useState('Within 5 km');

  useEffect(() => {
    if (role !== 'fundi') router.replace('/role');
  }, [role, router]);

  const toggle = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleNext = () => {
    // Skills are stored as labels ("Plumbing") so they match the category the
    // client filters on when searching for a fundi.
    const labels = selected.filter((k) => k !== 'other').map((k) => toCategoryLabel(k)).filter(Boolean) as string[];
    if (selected.includes('other') && customTrade.trim()) {
      labels.push(customTrade.trim());
    }

    if (labels.length === 0) {
      Alert.alert('Required', 'Please select at least one trade specialization.');
      return;
    }
    if (!experience) {
      Alert.alert('Required', 'Please select your experience level.');
      return;
    }
    router.push({
      pathname: '/rate-availability',
      params: { role: 'fundi', trades: labels.join(','), experience, radius },
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
        <SectionHeader title="What service do you offer?" subtitle="Select your trades and add more details." />

        <Text style={styles.label}>Trade Specialization</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((t) => (
            <TradeCard key={t.key} trade={t.label} image={t.image} active={selected.includes(t.key)} onPress={() => toggle(t.key)} />
          ))}
        </View>

        {selected.includes('other') && (
          <TextInput
            style={styles.customInput}
            placeholder="Enter your trade (e.g. Painting)"
            placeholderTextColor={colors.muted}
            value={customTrade}
            onChangeText={setCustomTrade}
          />
        )}

        <SelectField
          label="Experience Level"
          value={experience}
          onChange={setExperience}
          options={['1-2 years', '3-5 years', '5-10 years', '10+ years']}
          placeholder="Select experience"
        />
        <SelectField
          label="Service Radius"
          value={radius}
          onChange={setRadius}
          options={['Within 2 km', 'Within 5 km', 'Within 10 km', 'Within 20 km']}
          placeholder="Select radius"
        />
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  customInput: {
    height: 50,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.regular,
    fontSize: 14.5,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  footer: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl },
});
