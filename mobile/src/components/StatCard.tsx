import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  color?: string;
};

export default function StatCard({ icon, title, value, color = colors.primary }: Props) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  title: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: 'center' },
});
