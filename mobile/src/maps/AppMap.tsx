import React, { forwardRef } from 'react';
import { Platform, StyleProp, StyleSheet, Text, TurboModuleRegistry, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../theme';
import { MapPin, MapRadius, MapRegion, USE_MAPLIBRE } from './config';
import type { AppMapHandle } from './MapLibreMap';
import { MapPinView } from './Pins';

export type { AppMapHandle };

/**
 * MapLibre ships native modules that are absent from Expo Go and from dev
 * clients built without it. Evaluating `./MapLibreMap` in that case throws from
 * `TurboModuleRegistry.getEnforcing`, so probe first with `get` (null instead of
 * an invariant violation) and only then require the module — wrapped in a
 * try/catch as a second line of defence.
 */
function hasMapLibreNative(): boolean {
  try {
    return TurboModuleRegistry.get('MLRNCameraModule') != null;
  } catch {
    return false;
  }
}

let MapLibreMap: typeof import('./MapLibreMap').default | null = null;
if (USE_MAPLIBRE && hasMapLibreNative()) {
  try {
    MapLibreMap = require('./MapLibreMap').default;
  } catch (e) {
    console.warn('[maps] MapLibre unavailable, falling back to react-native-maps.', e);
    MapLibreMap = null;
  }
}

type Props = {
  region: MapRegion;
  pins?: MapPin[];
  radius?: MapRadius | null;
  showsUserLocation?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Provider switch:
 * - development: react-native-maps (native maps) — works in Expo Go and dev clients
 * - production: MapLibre + OpenStreetMap/OpenFreeMap tiles, `apple` on iOS
 * - web: lightweight placeholder (native map SDKs unavailable)
 */
const AppMap = forwardRef<AppMapHandle, Props>(function AppMap(props, ref) {
  const { region, pins = [], style } = props;

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.web, style]}>
        <Ionicons name="map-outline" size={40} color={colors.muted} />
        <Text style={styles.webTitle}>Map</Text>
        <Text style={styles.webSub}>
          {region.latitude.toFixed(4)}, {region.longitude.toFixed(4)}
        </Text>
        <View style={styles.webPins}>
          {pins.slice(0, 6).map((pin) => (
            <View key={pin.id} style={styles.webPinRow}>
              <MapPinView pin={pin} />
              {!!pin.label && <Text style={styles.webPinLabel}>{pin.label}</Text>}
            </View>
          ))}
        </View>
        <Text style={styles.webHint}>Native map SDKs run on iOS/Android builds.</Text>
      </View>
    );
  }

  if (USE_MAPLIBRE && MapLibreMap) {
    return <MapLibreMap ref={ref} {...props} />;
  }

  const RnMapsMap = require('./RnMapsMap').default as typeof import('./RnMapsMap').default;
  return <RnMapsMap ref={ref} {...props} />;
});

export default AppMap;

const styles = StyleSheet.create({
  web: {
    flex: 1,
    backgroundColor: '#F0F2F5',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  webTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  webSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  webPins: { marginTop: spacing.md, gap: spacing.sm, alignItems: 'center' },
  webPinRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  webPinLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkSoft },
  webHint: { marginTop: spacing.md, fontFamily: fonts.regular, fontSize: 11, color: colors.muted, textAlign: 'center' },
});
