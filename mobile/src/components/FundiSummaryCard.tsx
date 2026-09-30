import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../theme';

type Props = {
  name: string;
  trade: string;
  rating: number;
  image?: any;
};

export default function FundiSummaryCard({ name, trade, rating, image }: Props) {
  return (
    <View style={styles.card}>
      <Image source={image} style={styles.img} resizeMode="cover" />
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.trade}>{trade}</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={14} color={colors.star} />
          <Text style={styles.rating}>{rating}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  img: { width: 56, height: 56, borderRadius: radius.sm },
  info: { flex: 1, justifyContent: 'center', gap: 2 },
  name: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  trade: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
});
