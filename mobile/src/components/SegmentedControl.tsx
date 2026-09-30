import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';

type Props = {
  options: string[];
  selected: number;
  onChange: (index: number) => void;
  style?: ViewStyle;
};

export default function SegmentedControl({ options, selected, onChange, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      {options.map((opt, i) => {
        const active = i === selected;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(i)}
            style={[styles.segment, active && styles.active]}
          >
            <Text style={[styles.text, active && styles.textActive]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.lightBg,
    borderRadius: radius.pill,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  active: { backgroundColor: colors.primary },
  text: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
  textActive: { color: colors.black, fontFamily: fonts.semibold },
});
