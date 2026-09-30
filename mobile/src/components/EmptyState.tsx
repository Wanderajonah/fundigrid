import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../theme';

type Props = {
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export default function EmptyState({ title, message, icon = 'folder-open-outline' }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={40} color={colors.muted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.lightBg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  title: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink, textAlign: 'center' },
  message: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
