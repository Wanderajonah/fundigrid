import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

type Props = {
  rating: number;
  size?: number;
  showValue?: boolean;
  showCount?: boolean;
  count?: number;
};

export default function RatingStars({ rating, size = 14, showValue = true, showCount = false, count }: Props) {
  return (
    <View style={styles.row}>
      <Ionicons name="star" size={size} color={colors.star} />
      {showValue && <Text style={styles.value}>{rating.toFixed(1)}</Text>}
      {showCount && count !== undefined && <Text style={styles.count}>({count})</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  value: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  count: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
});
