import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';

type Props = TextInputProps & {
  label?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  helper?: string;
  error?: string;
  containerStyle?: ViewStyle;
};

export default function InputField({
  label,
  icon,
  right,
  helper,
  error,
  containerStyle,
  style,
  ...rest
}: Props) {
  return (
    <View style={[styles.wrap, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.field, error && styles.fieldError]}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <TextInput
          placeholderTextColor={colors.muted}
          style={[styles.input, style]}
          {...rest}
        />
        {right}
      </View>
      {helper && !error && <Text style={styles.helper}>{helper}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.ink },
  field: {
    minHeight: 50,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  fieldError: { borderColor: colors.danger },
  icon: { justifyContent: 'center', alignItems: 'center' },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14.5,
    color: colors.ink,
    paddingVertical: 12,
  },
  helper: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  error: { fontFamily: fonts.regular, fontSize: 12, color: colors.danger, marginTop: 2 },
});
