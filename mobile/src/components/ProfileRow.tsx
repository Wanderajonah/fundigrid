import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fonts, spacing } from '../theme';

type Props = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  divider?: boolean;
  showChevron?: boolean;
  danger?: boolean;
};

export default function ProfileRow({ icon, title, subtitle, right, onPress, style, divider, showChevron = true, danger }: Props) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        divider && styles.divider,
        pressed && onPress ? { backgroundColor: colors.lightBg } : null,
        style,
      ]}
    >
      <View style={styles.iconWrap}>{icon}</View>
      <View style={styles.info}>
        <Text style={[styles.title, danger && styles.titleDanger]}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right !== undefined
        ? right
        : showChevron && <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 16,
    minHeight: 56,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  iconWrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 1 },
  title: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  titleDanger: { color: colors.danger },
  subtitle: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
});
