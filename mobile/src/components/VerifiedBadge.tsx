import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../theme';

type Props = {
  verified?: boolean;
  size?: number;
};

export default function VerifiedBadge({ verified = true, size = 14 }: Props) {
  if (!verified) return null;
  return (
    <View style={styles.badge}>
      <Ionicons name="checkmark-circle" size={size} color={colors.success} />
      <Text style={styles.text}>Verified</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  text: { fontFamily: fonts.semibold, fontSize: 11, color: colors.success },
});
