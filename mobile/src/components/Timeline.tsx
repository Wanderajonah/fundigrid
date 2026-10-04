import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';

type Props = {
  steps: { label: string; status: 'completed' | 'current' | 'pending'; hint?: string }[];
};

export default function Timeline({ steps }: Props) {
  return (
    <View style={styles.wrap}>
      {steps.map((step, i) => {
        const isCompleted = step.status === 'completed';
        const isCurrent = step.status === 'current';
        return (
          <View key={i} style={styles.step}>
            <View style={styles.indicatorCol}>
              <View style={[styles.dot, isCompleted && styles.dotCompleted, isCurrent && styles.dotCurrent]}>
                {isCompleted && <Text style={styles.check}>✓</Text>}
                {isCurrent && <View style={styles.currentInner} />}
              </View>
              {i < steps.length - 1 && (
                <View style={[styles.line, isCompleted && styles.lineCompleted]} />
              )}
            </View>
            <View style={styles.content}>
              <Text style={[styles.label, isCompleted && styles.labelCompleted, isCurrent && styles.labelCurrent]}>
                {step.label}
              </Text>
              {step.hint ? <Text style={styles.hint}>{step.hint}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  step: { flexDirection: 'row', gap: spacing.md },
  indicatorCol: { alignItems: 'center', width: 24 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCompleted: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotCurrent: { borderColor: colors.primary },
  currentInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  check: { color: colors.white, fontSize: 12, fontWeight: '700' },
  line: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 4 },
  lineCompleted: { backgroundColor: colors.primary },
  content: { flex: 1, paddingBottom: spacing.xl },
  label: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  labelCompleted: { color: colors.ink, fontFamily: fonts.medium },
  labelCurrent: { color: colors.primary, fontFamily: fonts.semibold },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
});
