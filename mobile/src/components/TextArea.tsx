import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';

type Props = TextInputProps & {
  label?: string;
  helper?: string;
  error?: string;
  containerStyle?: ViewStyle;
};

export default function TextArea({ label, helper, error, containerStyle, style, ...rest }: Props) {
  return (
    <View style={[styles.wrap, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.field, error && styles.fieldError]}>
        <TextInput
          placeholderTextColor={colors.muted}
          multiline
          style={[styles.input, style]}
          {...rest}
        />
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
    minHeight: 132,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  fieldError: { borderColor: colors.danger },
  input: {
    width: '100%',
    minHeight: 104,
    fontFamily: fonts.regular,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.ink,
    padding: 0,
    textAlignVertical: 'top',
  },
  helper: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  error: { fontFamily: fonts.regular, fontSize: 12, color: colors.danger, marginTop: 2 },
});
