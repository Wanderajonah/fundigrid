import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';

type Props = {
  label?: string;
  value?: string;
  placeholder?: string;
  options: string[];
  onChange?: (value: string) => void;
  icon?: React.ReactNode;
  helper?: string;
  containerStyle?: ViewStyle;
};

export default function SelectField({
  label,
  value,
  placeholder = 'Select',
  options,
  onChange,
  icon,
  helper,
  containerStyle,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.field, pressed && { opacity: 0.8 }]}
      >
        {icon && <View>{icon}</View>}
        <Text style={[styles.value, !value && { color: colors.muted }]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.inkSoft} />
      </Pressable>
      {helper && <Text style={styles.helper}>{helper}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            {label && <Text style={styles.sheetTitle}>{label}</Text>}
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const active = item === value;
                return (
                  <Pressable
                    style={styles.option}
                    onPress={() => {
                      onChange?.(item);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.optionText, active && styles.optionActive]}>{item}</Text>
                    {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.ink },
  field: {
    minHeight: 50,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  value: { flex: 1, fontFamily: fonts.regular, fontSize: 14.5, color: colors.ink },
  helper: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxxl,
    maxHeight: '60%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: spacing.lg,
  },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, marginBottom: spacing.sm },
  option: {
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  optionText: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  optionActive: { fontFamily: fonts.semibold, color: colors.primary },
});
