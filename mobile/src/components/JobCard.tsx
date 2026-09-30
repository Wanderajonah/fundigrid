import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../theme';

type Props = {
  service: string;
  location: string;
  distance?: string;
  date?: string;
  amount?: string;
  status?: string;
  onPress?: () => void;
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: colors.primarySoft, text: colors.primary },
  active: { bg: '#EBF5FF', text: colors.blue },
  completed: { bg: colors.successSoft, text: colors.success },
  'in-progress': { bg: '#EBF5FF', text: colors.blue },
};

export default function JobCard({ service, location, distance, date, amount, status = 'pending', onPress }: Props) {
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.pending;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.95 }]}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="wrench-outline" size={20} color={colors.primary} />
        <Text style={styles.service}>{service}</Text>
        {status && (
          <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.badgeText, { color: statusColor.text }]}>{status}</Text>
          </View>
        )}
      </View>
      <View style={styles.details}>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={14} color={colors.muted} />
          <Text style={styles.location}>{location}</Text>
        </View>
        {distance && (
          <View style={styles.row}>
            <Ionicons name="navigate-outline" size={14} color={colors.muted} />
            <Text style={styles.distance}>{distance}</Text>
          </View>
        )}
        {date && (
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={14} color={colors.muted} />
            <Text style={styles.date}>{date}</Text>
          </View>
        )}
      </View>
      {amount && <Text style={styles.amount}>{amount}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  service: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontFamily: fonts.semibold, fontSize: 11 },
  details: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  location: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft },
  distance: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  date: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  amount: { fontFamily: fonts.bold, fontSize: 16, color: colors.primary, marginTop: spacing.xs },
});
