import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';

type Variant = 'primary' | 'secondary' | 'dark' | 'ghost' | 'danger';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  compact?: boolean;
  fullWidth?: boolean;
};

export default function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  trailingIcon,
  disabled,
  loading,
  style,
  compact,
  fullWidth = true,
}: Props) {
  const getBg = () => {
    switch (variant) {
      case 'primary': return colors.primary;
      case 'secondary': return colors.white;
      case 'dark': return colors.black;
      case 'ghost': return 'transparent';
      case 'danger': return colors.white;
      default: return colors.primary;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary': return colors.black;
      case 'secondary': return colors.ink;
      case 'dark': return colors.white;
      case 'ghost': return colors.ink;
      case 'danger': return colors.danger;
      default: return colors.black;
    }
  };

  const getBorder = () => {
    if (variant === 'secondary') return { borderWidth: 1, borderColor: colors.border };
    if (variant === 'danger') return { borderWidth: 1.5, borderColor: colors.danger };
    return {};
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        fullWidth && { width: '100%' },
        compact && styles.compact,
        { backgroundColor: getBg(), ...getBorder() },
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.text, { color: getTextColor() }, compact && styles.textCompact]}>
            {title}
          </Text>
          {trailingIcon}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  compact: { height: 40, borderRadius: radius.sm, paddingHorizontal: spacing.lg },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  text: { fontFamily: fonts.semibold, fontSize: 15 },
  textCompact: { fontSize: 13 },
});
