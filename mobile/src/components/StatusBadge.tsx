import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';

type Props = {
  status: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
};

const VARIANT_MAP: Record<string, { bg: string; text: string }> = {
  success: { bg: colors.successSoft, text: colors.success },
  warning: { bg: colors.primarySoft, text: colors.primary },
  error: { bg: colors.dangerSoft, text: colors.danger },
  info: { bg: '#EBF5FF', text: colors.blue },
  neutral: { bg: colors.lightBg, text: colors.inkSoft },
};

export default function StatusBadge({ status, variant = 'neutral' }: Props) {
  const v = VARIANT_MAP[variant] || VARIANT_MAP.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }]}>
      <Text style={[styles.text, { color: v.text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15 },
});
