import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, fonts, radius } from '../theme';

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  compact?: boolean;
};

export default function Chip({ label, active, onPress, style, compact }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        active ? styles.active : styles.idle,
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      <Text style={[styles.text, compact && styles.textCompact, active && styles.textActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  compact: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  idle: { backgroundColor: colors.white, borderColor: colors.border },
  text: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
  textCompact: { fontSize: 12 },
  textActive: { color: colors.black, fontFamily: fonts.semibold },
});
