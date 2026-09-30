import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../theme';

type Props = {
  label: string;
  active?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
};

export default function CategoryChip({ label, active, icon, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.active, pressed && { opacity: 0.8 }]}
    >
      {icon && <Ionicons name={icon} size={16} color={active ? colors.white : colors.ink} />}
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { fontFamily: fonts.medium, fontSize: 12, color: colors.ink },
  labelActive: { color: colors.white },
});
