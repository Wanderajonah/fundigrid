import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing, shadowSm } from '../theme';

type Source = 'camera' | 'library';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onPick: (source: Source) => void;
  onClose: () => void;
};

/**
 * Bottom sheet for choosing where a document photo comes from, so the
 * camera/gallery/cancel choice matches the rest of the app instead of
 * relying on the platform alert.
 */
export default function PhotoSourceSheet({ visible, title, subtitle, onPick, onClose }: Props) {
  const options: { key: Source; icon: keyof typeof Ionicons.glyphMap; label: string; hint: string }[] = [
    { key: 'camera', icon: 'camera-outline', label: 'Take photo', hint: 'Use your camera' },
    { key: 'library', icon: 'image-outline', label: 'Choose from library', hint: 'Pick an existing photo' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.head}>
            <Text style={styles.title}>{title}</Text>
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>

          {options.map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => onPick(opt.key)}
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.optionIcon}>
                <Ionicons name={opt.icon} size={22} color={colors.primary} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>{opt.label}</Text>
                <Text style={styles.optionHint}>{opt.hint}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17,17,17,0.45)',
  },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxxl,
    gap: spacing.md,
    ...shadowSm,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: spacing.xs,
  },
  head: { alignItems: 'center', gap: 2, marginBottom: spacing.xs },
  title: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, textAlign: 'center' },
  subtitle: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, textAlign: 'center' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInfo: { flex: 1, gap: 2 },
  optionLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  optionHint: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.muted },
  cancelBtn: {
    height: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  cancelText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft },
});
