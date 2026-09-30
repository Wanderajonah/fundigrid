import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';

type Props = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  imageUri?: string | null;
  onPress?: () => void;
};

export default function UploadRow({
  icon,
  title,
  subtitle,
  imageUri,
  onPress,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.iconBox}>{icon}</View>
        <View style={styles.info}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}>
          <Ionicons name="camera" size={14} color={colors.primary} />
          <Text style={styles.btnText}>{imageUri ? 'Change' : 'Tap to upload'}</Text>
        </Pressable>
      </View>
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.lightBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.ink },
  subtitle: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.muted },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  btnText: { fontFamily: fonts.medium, fontSize: 11, color: colors.primary },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: radius.sm,
    backgroundColor: colors.lightBg,
  },
});
