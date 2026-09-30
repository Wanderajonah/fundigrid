import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, shadowSm, spacing } from '../theme';

type Props = {
  name: string;
  trade: string;
  rating: number;
  reviews: number;
  distance: string;
  verified?: boolean;
  photo?: string | null;
  selected?: boolean;
  onPress?: () => void;
};

function initialsOf(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function FundiCard({ name, trade, rating, reviews, distance, verified = true, photo, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && { opacity: 0.92 }]}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={styles.avatar} resizeMode="cover" />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.initials}>{initialsOf(name)}</Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {verified ? <Ionicons name="checkmark-circle" size={15} color={colors.success} /> : null}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {trade} · {distance}
        </Text>
      </View>

      <View style={styles.right}>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={15} color={colors.star} />
          <Text style={styles.ratingValue}>{rating > 0 ? rating.toFixed(1) : 'New'}</Text>
        </View>
        <Text style={styles.reviews}>
          {reviews > 0 ? `${reviews} ${reviews === 1 ? 'job' : 'jobs'}` : 'No jobs yet'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md + 2,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadowSm,
  },
  cardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryFaint },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.lightBg },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  initials: { fontFamily: fonts.semibold, fontSize: 17, color: colors.primary },
  body: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  right: { alignItems: 'flex-end', gap: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingValue: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  reviews: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
});
