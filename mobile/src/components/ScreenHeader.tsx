import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FundiGridLogo from './FundiGridLogo';
import { colors, spacing } from '../theme';
import { goBackSafe } from '../services/navigation';

type Props = {
  back?: boolean;
  onBack?: () => void;
  showLogo?: boolean;
  right?: React.ReactNode;
  title?: string;
};

export default function ScreenHeader({ back = true, onBack, showLogo = true, right, title }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {back && (
          <Pressable
            onPress={onBack ?? (() => goBackSafe('/'))}
            hitSlop={12}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
        )}
      </View>
      <View style={styles.center}>
        {showLogo && <FundiGridLogo size={22} compact />}
        {title && <Text style={styles.title}>{title}</Text>}
      </View>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  side: { width: 44, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  center: { flex: 1, alignItems: 'center' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: colors.ink },
});
