import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing, shadowSm } from '../theme';

type Props = {
  label?: string;
  /** 24-hour value stored as "HH:mm" — the format the backend keeps. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string;
};

const ITEM_HEIGHT = 44;
const WHEEL_HEIGHT = ITEM_HEIGHT * 3;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

function parse(value: string) {
  const [h, m] = String(value || '').split(':');
  const hh = parseInt(h, 10);
  const mm = parseInt(m, 10);
  return {
    h: Number.isFinite(hh) ? Math.min(23, Math.max(0, hh)) : 0,
    m: Number.isFinite(mm) ? Math.min(59, Math.max(0, mm)) : 0,
  };
}

/**
 * Tap-to-pick clock field: shows the current time and opens two snapping
 * wheels (hours + minutes) instead of letting people mistype "8:00am".
 */
export default function TimePickerField({
  label,
  value,
  onChange,
  placeholder = '--:--',
  title = 'Select time',
}: Props) {
  const [open, setOpen] = useState(false);
  const parsed = parse(value);
  const [hour, setHour] = useState(parsed.h);
  const [minute, setMinute] = useState(parsed.m);
  const hourRef = useRef<ScrollView>(null);
  const minRef = useRef<ScrollView>(null);

  // Sync the wheels with the saved value every time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setHour(parsed.h);
    setMinute(parsed.m);
    const id = requestAnimationFrame(() => {
      hourRef.current?.scrollTo({ y: parsed.h * ITEM_HEIGHT, animated: false });
      minRef.current?.scrollTo({ y: parsed.m * ITEM_HEIGHT, animated: false });
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const jumpTo = (ref: React.RefObject<ScrollView | null>, v: number) => {
    ref.current?.scrollTo({ y: v * ITEM_HEIGHT, animated: true });
  };

  const indexFromEvent = (offsetY: number, count: number) =>
    Math.max(0, Math.min(count - 1, Math.round(offsetY / ITEM_HEIGHT)));

  const renderWheel = (
    items: number[],
    selected: number,
    onSelect: (v: number) => void,
    ref: React.RefObject<ScrollView | null>,
  ) => (
    <View style={styles.wheelWrap}>
      <View style={styles.band} />
      <ScrollView
        ref={ref}
        style={styles.wheel}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={styles.wheelContent}
        onMomentumScrollEnd={(e) => {
          const idx = indexFromEvent(e.nativeEvent.contentOffset.y, items.length);
          onSelect(items[idx]);
        }}
      >
        {items.map((v) => (
          <Pressable
            key={v}
            style={styles.wheelItem}
            onPress={() => {
              onSelect(v);
              jumpTo(ref, v);
            }}
          >
            <Text style={[styles.wheelText, v === selected && styles.wheelTextActive]}>{pad(v)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${title}. Current value ${value || placeholder}`}
        style={({ pressed }) => [styles.field, pressed && { opacity: 0.7 }]}
      >
        {!!label && <Text style={styles.label}>{label}</Text>}
        <View style={styles.fieldRow}>
          <Ionicons name="time-outline" size={18} color={colors.primary} />
          <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
            {value || placeholder}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.muted} />
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{title}</Text>

            <View style={styles.wheels}>
              {renderWheel(HOURS, hour, setHour, hourRef)}
              <Text style={styles.colon}>:</Text>
              {renderWheel(MINUTES, minute, setMinute, minRef)}
            </View>

            <View style={styles.actions}>
              <Pressable onPress={() => setOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onChange(`${pad(hour)}:${pad(minute)}`);
                  setOpen(false);
                }}
                style={styles.doneBtn}
              >
                <Text style={styles.doneText}>Set time</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink, marginBottom: 4 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  value: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  placeholder: { color: colors.muted, fontFamily: fonts.regular },

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
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxxl,
    gap: spacing.lg,
    ...shadowSm,
  },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, textAlign: 'center' },

  wheels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  wheelWrap: { height: WHEEL_HEIGHT, justifyContent: 'center' },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryFaint,
  },
  wheel: { width: 78, height: WHEEL_HEIGHT },
  wheelContent: { paddingVertical: (WHEEL_HEIGHT - ITEM_HEIGHT) / 2 },
  wheelItem: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  wheelText: { fontFamily: fonts.medium, fontSize: 20, color: colors.muted },
  wheelTextActive: { fontFamily: fonts.bold, fontSize: 22, color: colors.ink },
  colon: { fontFamily: fonts.bold, fontSize: 22, color: colors.ink, marginHorizontal: spacing.xs },

  actions: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft },
  doneBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.white },
});
