import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Platform, StyleProp, ViewStyle } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { MAP_PROVIDER, MapPin, MapRadius, MapRegion } from './config';
import { MapPinView } from './Pins';
import type { AppMapHandle } from './MapLibreMap';
import { RADIUS_FILL, RADIUS_STROKE } from './radiusStyle';

type Props = {
  region: MapRegion;
  pins?: MapPin[];
  radius?: MapRadius | null;
  showsUserLocation?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const RnMapsMap = forwardRef<AppMapHandle, Props>(function RnMapsMap(
  { region, pins = [], radius, showsUserLocation = true, style },
  ref
) {
  const mapRef = useRef<MapView>(null);

  useImperativeHandle(ref, () => ({
    flyTo: (r: MapRegion) => {
      mapRef.current?.animateToRegion(r, 600);
    },
  }));

  useEffect(() => {
    mapRef.current?.animateToRegion(region, 400);
  }, [region.latitude, region.longitude, region.latitudeDelta, region.longitudeDelta]);

  const provider =
    MAP_PROVIDER === 'google' && Platform.OS !== 'ios' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

  return (
    <MapView
      ref={mapRef}
      style={style}
      provider={provider}
      region={region}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
      loadingEnabled
    >
      {radius ? (
        <Circle
          center={{ latitude: radius.center.latitude, longitude: radius.center.longitude }}
          radius={radius.radiusMeters}
          fillColor={RADIUS_FILL}
          strokeColor={RADIUS_STROKE}
          strokeWidth={2}
        />
      ) : null}
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
          onPress={pin.onPress}
        >
          <MapPinView pin={pin} />
        </Marker>
      ))}
    </MapView>
  );
});

export default RnMapsMap;
