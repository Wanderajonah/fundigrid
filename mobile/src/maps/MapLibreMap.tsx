import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import {
  Camera,
  CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
  UserLocation,
} from '@maplibre/maplibre-react-native';
import { MAPLIBRE_STYLE_URL, MapPin, MapRadius, MapRegion } from './config';
import { MapPinView } from './Pins';
import { RADIUS_FILL, RADIUS_STROKE, metersPerPixel } from './radiusStyle';

export type AppMapHandle = {
  flyTo: (region: MapRegion) => void;
};

type Props = {
  region: MapRegion;
  pins?: MapPin[];
  radius?: MapRadius | null;
  showsUserLocation?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

function zoomFor(region: MapRegion) {
  const d = Math.max(region.latitudeDelta, region.longitudeDelta, 0.001);
  if (d > 0.5) return 11;
  if (d > 0.2) return 12;
  if (d > 0.08) return 13;
  if (d > 0.04) return 14;
  if (d > 0.02) return 15;
  return 16;
}

const MapLibreMap = forwardRef<AppMapHandle, Props>(function MapLibreMap(
  { region, pins = [], radius, showsUserLocation = true, style },
  ref
) {
  const cameraRef = useRef<CameraRef>(null);
  const center: [number, number] = [region.longitude, region.latitude];
  const zoom = zoomFor(region);
  // Circle layers are sized in screen pixels, so convert metres → pixels and
  // recompute whenever the camera zoom changes.
  const radiusPx = radius
    ? Math.max(4, radius.radiusMeters / metersPerPixel(radius.center.latitude, zoom))
    : 0;

  useImperativeHandle(ref, () => ({
    flyTo: (r: MapRegion) => {
      cameraRef.current?.flyTo({
        center: [r.longitude, r.latitude],
        zoom: zoomFor(r),
        duration: 600,
      });
    },
  }));

  useEffect(() => {
    cameraRef.current?.jumpTo({ center, zoom });
  }, [center[0], center[1], zoom]);

  return (
    <Map mapStyle={MAPLIBRE_STYLE_URL} style={style} logo compass scaleBar attribution>
      <Camera ref={cameraRef} initialViewState={{ center, zoom }} />
      {showsUserLocation ? <UserLocation animated /> : null}
      {radius ? (
        <GeoJSONSource
          id="search-radius"
          data={{
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [radius.center.longitude, radius.center.latitude],
                },
                properties: {},
              },
            ],
          }}
        >
          <Layer
            id="search-radius-circle"
            type="circle"
            style={{
              circleRadius: radiusPx,
              circleColor: RADIUS_FILL,
              circleStrokeColor: RADIUS_STROKE,
              circleStrokeWidth: 2,
            }}
          />
        </GeoJSONSource>
      ) : null}
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          id={pin.id}
          lngLat={[pin.longitude, pin.latitude]}
          anchor="bottom"
          onPress={pin.onPress ? () => pin.onPress?.() : undefined}
        >
          <MapPinView pin={pin} />
        </Marker>
      ))}
    </Map>
  );
});

export default MapLibreMap;
