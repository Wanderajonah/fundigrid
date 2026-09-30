import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../src/components/PrimaryButton';
import FundiSummaryCard from '../src/components/FundiSummaryCard';
import { IMAGES } from '../src/assets';
import { colors, fonts, radius, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ReviewScreen() {
  const router = useRouter();
  const { fundiName, trade, rating } = useLocalSearchParams<{
    fundiName?: string;
    trade?: string;
    rating?: string;
  }>();
  const [selected, setSelected] = useState(0);
  const [review, setReview] = useState('');

  const name = fundiName?.trim() || 'Your fundi';
  const stars = Number(rating) || 0;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <FundiSummaryCard
          name={name}
          trade={trade?.trim() || 'Fundi'}
          rating={stars}
          image={IMAGES.fundi}
        />

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Pressable key={i} onPress={() => setSelected(i)}>
              <Ionicons
                name={i <= selected ? 'star' : 'star-outline'}
                size={36}
                color={i <= selected ? colors.star : colors.border}
              />
            </Pressable>
          ))}
        </View>

        <TextInput
          style={styles.textArea}
          placeholder="Share your experience..."
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={5}
          value={review}
          onChangeText={setReview}
        />
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="Submit Review" onPress={() => router.push('/(tabs)')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: { height: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  backBtn: { position: 'absolute', left: spacing.xxl, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 85, height: 85 },
  body: { paddingHorizontal: spacing.xxl, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.xl },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
  textArea: {
    height: 120,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  footer: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl },
});
