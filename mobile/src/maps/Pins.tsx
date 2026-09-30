import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme';
import type { MapPin } from './config';

export function MapPinView({ pin }: { pin: MapPin }) {
  if (pin.kind === 'price') {
    return (
      <View style={styles.wrap}>
        <View style={[styles.pricePin, pin.active && styles.pricePinActive]}>
          <Text style={styles.priceText}>{pin.label}</Text>
        </View>
        <View style={[styles.priceArrow, pin.active && { borderTopColor: colors.black }]} />
      </View>
    );
  }

  if (pin.kind === 'user' || pin.kind === 'client') {
    return (
      <View style={styles.userWrap}>
        <View style={styles.userPulse} />
        <View style={[styles.userBadge, pin.color ? { backgroundColor: pin.color } : null]}>
          <Ionicons name="person" size={13} color={colors.white} />
        </View>
      </View>
    );
  }

  const bg = pin.color || (pin.kind === 'fundi' ? colors.primary : colors.blue);
  return (
    <View style={styles.wrap}>
      <View style={[styles.dotPin, { backgroundColor: bg }]}>
        <Ionicons name={pin.kind === 'fundi' ? 'construct' : 'location'} size={14} color={colors.white} />
      </View>
      {pin.kind === 'fundi' ? (
        <View style={[styles.pinTail, { borderTopColor: bg }]} />
      ) : null}
      {!!pin.label && (
        <View style={styles.labelPin}>
          <Text style={styles.labelText} numberOfLines={1}>
            {pin.label}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  pricePin: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    minWidth: 52,
    alignItems: 'center',
  },
  pricePinActive: { backgroundColor: colors.black },
  priceText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.white },
  priceArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.primary,
  },
  userWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  userPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(47,128,237,0.16)',
  },
  userBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.blue,
    borderWidth: 2.5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  labelPin: {
    marginTop: 4,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 120,
  },
  labelText: { fontFamily: fonts.medium, fontSize: 10, color: colors.ink },
});
