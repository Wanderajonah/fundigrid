import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';

type Props = {
  items: { label: string; amount: string }[];
  total: string;
};

export default function PriceBreakdown({ items, total }: Props) {
  return (
    <View style={styles.wrap}>
      {items.map((item, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.amount}>{item.amount}</Text>
        </View>
      ))}
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>{total}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
  amount: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.border },
  totalLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  totalAmount: { fontFamily: fonts.bold, fontSize: 18, color: colors.primary },
});
