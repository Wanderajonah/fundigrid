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
  const badgeSize = Math.round(size * 0.3);
  const badgeInset = Math.max(2, Math.round(size * 0.03));
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
        style={[
          styles.img,
          { width: size, height: size, borderRadius: size / 2, overflow: 'hidden' },
        ]}
        resizeMode="cover"
      />
      {showBadge && (
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              bottom: badgeInset,
              right: badgeInset,
            },
          ]}
        >
          <Ionicons name="camera" size={Math.round(badgeSize * 0.55)} color={colors.white} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  img: {},
  badge: {
    position: 'absolute',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: colors.white,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});
