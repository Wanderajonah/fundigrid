import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../theme';

type Props = {
  label?: string;
  /** 'YYYY-MM-DD', or '' when nothing is chosen. */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseISO(value?: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value?.trim() ?? '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toISO(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export default function CalendarField({ label, value, onChange, placeholder = 'Choose a date' }: Props) {
  const selected = parseISO(value);
  const today = startOfToday();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const base = selected ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const startDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = Math.ceil((startDow + daysInMonth) / 7) * 7;
    const out: (Date | null)[] = [];
    for (let i = 0; i < total; i++) {
      const day = i - startDow + 1;
      out.push(day >= 1 && day <= daysInMonth ? new Date(year, month, day) : null);
    }
    return out;
  }, [cursor]);

  const shift = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => [styles.field, pressed && { opacity: 0.7 }]}
      >
        <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? selected.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
      </Pressable>

      {open && (
        <View style={styles.panel}>
          <View style={styles.monthRow}>
            <Pressable onPress={() => shift(-1)} hitSlop={10} style={({ pressed }) => pressed && { opacity: 0.5 }}>
              <Ionicons name="chevron-back" size={18} color={colors.inkSoft} />
            </Pressable>
            <Text style={styles.month}>
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </Text>
            <Pressable onPress={() => shift(1)} hitSlop={10} style={({ pressed }) => pressed && { opacity: 0.5 }}>
              <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => (
              <Text key={`wd-${i}`} style={styles.weekday}>{w}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((d, i) => {
              if (!d) return <View key={`pad-${i}`} style={styles.cell} />;
              const isPast = d.getTime() < today.getTime();
              const isToday = d.getTime() === today.getTime();
              const isSelected = !!selected && d.getTime() === selected.getTime();
              return (
                <Pressable
                  key={toISO(d)}
                  disabled={isPast}
                  onPress={() => {
                    onChange(toISO(d));
                    setOpen(false);
                  }}
                  style={styles.cell}
                >
                  <View style={[styles.day, isSelected && styles.daySelected, !isSelected && isToday && styles.dayToday]}>
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        isPast && styles.dayTextDisabled,
                      ]}
                    >
                      {d.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {selected ? (
            <Pressable
              onPress={() => onChange('')}
              hitSlop={8}
              style={({ pressed }) => [styles.clear, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.clearText}>Clear date</Text>
            </Pressable>
          ) : null}
        </View>
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  value: { flex: 1, fontFamily: fonts.regular, fontSize: 14.5, color: colors.ink },
  placeholder: { color: colors.muted },
  panel: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.xs,
  },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs },
  month: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, height: 28, textAlign: 'center', textAlignVertical: 'center', fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', height: 40, alignItems: 'center', justifyContent: 'center' },
  day: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: colors.primary },
  dayToday: { borderWidth: 1, borderColor: colors.primary },
  dayText: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  dayTextSelected: { fontFamily: fonts.semibold, color: colors.black },
  dayTextDisabled: { color: colors.border },
  clear: { alignSelf: 'center', paddingVertical: spacing.sm },
  clearText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted, textDecorationLine: 'underline' },
});
