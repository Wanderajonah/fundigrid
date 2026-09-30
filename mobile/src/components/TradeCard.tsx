import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../theme';

type Props = {
  trade: string;
  image: any;
  active?: boolean;
  onPress?: () => void;
};

export default function TradeCard({ trade, image, active, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, active && styles.active, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
        {image ? (
          <Image source={image} style={styles.tradeImage} resizeMode="contain" />
        ) : (
          <MaterialCommunityIcons name="dots-horizontal" size={28} color={active ? colors.white : colors.primary} />
        )}
      </View>
      <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
        {trade}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  active: { borderColor: colors.primary, backgroundColor: colors.primaryFaint },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconWrapActive: { backgroundColor: colors.primary },
  tradeImage: { width: 36, height: 36 },
  label: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkSoft },
  labelActive: { color: colors.primary, fontFamily: fonts.semibold },
});
