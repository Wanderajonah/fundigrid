import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, spacing } from '../theme';

type Props = {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
  center?: boolean;
};

export default function SectionHeader({ title, subtitle, style, center }: Props) {
  return (
    <View style={[styles.wrap, center && { alignItems: 'center' }, style]}>
      <Text style={[styles.title, center && styles.center]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, center && styles.center]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4, marginBottom: spacing.xl },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 22, lineHeight: 30, color: colors.ink },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 21, color: colors.inkSoft },
  center: { textAlign: 'center' },
});
