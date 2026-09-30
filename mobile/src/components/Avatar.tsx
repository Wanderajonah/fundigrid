import React from 'react';
import { Image, ImageSourcePropType, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { IMAGES } from '../assets';

type Props = {
  source?: ImageSourcePropType;
  size?: number;
  onPress?: () => void;
  showBadge?: boolean;
};

export default function Avatar({ source, size = 96, onPress, showBadge = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Image
        source={source ?? IMAGES.fundi}
        style={[styles.img, { width: size, height: size, borderRadius: size / 2 }]}
        resizeMode="cover"
      />
      {showBadge && (
        <View style={styles.badge}>
          <Ionicons name="camera" size={14} color={colors.white} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  img: {},
  badge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
});
