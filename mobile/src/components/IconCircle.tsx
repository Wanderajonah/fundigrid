import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  size?: number;
};

export default function IconCircle({ icon, color = colors.primary, size = 56 }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={size * 0.45} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
