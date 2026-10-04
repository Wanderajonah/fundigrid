import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, PanResponder, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import FundiCard from '../src/components/FundiCard';
import PrimaryButton from '../src/components/PrimaryButton';
import Chip from '../src/components/Chip';
import { AppMap, DEFAULT_REGION, MapPin, MapRegion, formatKm, haversineKm, hasCoords, regionFromPoints } from '../src/maps';
import { getCurrentLocation, DeviceLocation } from '../src/services/location';
import { getNearbyFundis } from '../src/services/api';
import { useAuth } from '../src/contexts/AuthContext';
import { colors, fonts, radius, shadowSm, spacing } from '../src/theme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type NearbyFundi = {
  id: string;
  name: string;
  trade: string;
  rating: number;
  reviews: number;
  verified: boolean;
  distance: string;
  photo?: string | null;
  location?: { lat: number; lng: number };
};

const MAP_MAX = Math.max(340, Math.round(Dimensions.get('window').height * 0.62));
const RADII = [5, 10, 25, 50, 100];

export default function AvailableFundisScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const params = useLocalSearchParams<{ category?: string; area?: string; bookingId?: string }>();
  const bookingId = params.bookingId ? String(params.bookingId) : '';
  const [radiusIdx, setRadiusIdx] = useState(1);
  const radius = RADII[radiusIdx];
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [category, setCategory] = useState(() => (params.category ? String(params.category) : ''));
  const [area, setArea] = useState(() => (params.area ? String(params.area) : ''));
  const [loading, setLoading] = useState(true);
  const [fundis, setFundis] = useState<NearbyFundi[]>([]);
  const [device, setDevice] = useState<DeviceLocation | null>(null);
  const [region, setRegion] = useState<MapRegion>(DEFAULT_REGION);
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number }>({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });

  useEffect(() => {
    setCategory(params.category ? String(params.category) : '');
    setArea(params.area ? String(params.area) : '');
  }, [params.category, params.area]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const loc = await getCurrentLocation();
      setDevice(loc);
      const origin = loc
        ? { latitude: loc.latitude, longitude: loc.longitude }
        : { latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude };
      setOrigin(origin);
      setRegion({ ...origin, latitudeDelta: 0.1, longitudeDelta: 0.1 });

      // Everything below comes from the database: category and area narrow the
      // directory, then distance decides the order.
      const query: { lat: number; lng: number; radius: number; category?: string; area?: string } = {
        lat: origin.latitude,
        lng: origin.longitude,
        radius,
      };
      if (category.trim()) query.category = category.trim();
      if (area.trim()) query.area = area.trim();

      let rows: any[] = [];
      try {
        const near = await getNearbyFundis(query);
        rows = near.fundis ?? [];
      } catch {
        rows = [];
      }

      const mapped: NearbyFundi[] = rows
        .filter((f) => f && f.name)
        .map((f) => {
          const loc = f.location;
          const has = hasCoords(loc);
          const km = has
            ? haversineKm(origin, { latitude: Number(loc.lat), longitude: Number(loc.lng) })
            : Number.NaN;
          const skills = Array.isArray(f.skills) ? f.skills : [];
          return {
            id: String(f.id),
            name: f.name,
            trade: skills.length ? skills.join(', ') : 'Fundi',
            rating: Number(f.rating ?? 0),
            reviews: Number(f.reviewCount ?? 0),
            verified: Boolean(f.verified),
            distance: Number.isFinite(km) ? formatKm(km) : 'Nearby',
            photo: f.profilePhoto ? String(f.profilePhoto) : null,
            location: has ? { lat: Number(loc.lat), lng: Number(loc.lng) } : undefined,
          };
        });

      // Nearest first — the radius stepper decides how far we look.
      mapped.sort((a, b) => {
        const av = a.location
          ? haversineKm(origin, { latitude: a.location.lat, longitude: a.location.lng })
          : 1e9;
        const bv = b.location
          ? haversineKm(origin, { latitude: b.location.lat, longitude: b.location.lng })
          : 1e9;
        return av - bv;
      });
      setFundis(mapped);

      // Fit the client, the radius circle and every fundi inside the viewport.
      const degLat = radius / 111.32;
      const degLng = radius / (111.32 * Math.max(0.2, Math.cos((origin.latitude * Math.PI) / 180)));
      const circleEdge = [
        { latitude: origin.latitude + degLat, longitude: origin.longitude },
        { latitude: origin.latitude - degLat, longitude: origin.longitude },
        { latitude: origin.latitude, longitude: origin.longitude + degLng },
        { latitude: origin.latitude, longitude: origin.longitude - degLng },
      ];
      const points = [
        origin,
        ...circleEdge,
        ...mapped.filter((f) => f.location).map((f) => ({
          latitude: f.location!.lat,
          longitude: f.location!.lng,
        })),
      ];
      setRegion(regionFromPoints(points));
    } finally {
      setLoading(false);
    }
  }, [radius, token, category, area]);

  useEffect(() => {
    load();
  }, [load]);

  const openFundi = (id: string) =>
    router.push({
      pathname: '/fundi-profile',
      params: { id, ...(bookingId ? { bookingId } : {}) },
    });

  const term = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!term) return fundis;
    return fundis.filter((f) => f.name.toLowerCase().includes(term) || f.trade.toLowerCase().includes(term));
  }, [fundis, term]);

  const selectedFundi = visible.find((f) => f.id === selected) ?? null;
  const sheetLabel = loading
    ? 'Finding fundis near you…'
    : term
      ? `${visible.length} ${visible.length === 1 ? 'match' : 'matches'} for “${query.trim()}”`
      : `${visible.length} ${visible.length === 1 ? 'fundi' : 'fundis'} within ${radius} km`;

  const pins: MapPin[] = useMemo(() => {
    const list: MapPin[] = [];
    if (device) {
      list.push({
        id: 'me',
        latitude: device.latitude,
        longitude: device.longitude,
        kind: 'user',
        label: 'You',
      });
    }
    fundis.forEach((f) => {
      if (!f.location) return;
      list.push({
        id: f.id,
        latitude: f.location.lat,
        longitude: f.location.lng,
        kind: 'fundi',
        label: f.name.split(' ')[0],
        onPress: () => openFundi(f.id),
      });
    });
    return list;
  }, [fundis, device, router]);

  const hasFilters = Boolean(category || area);
  const insets = useSafeAreaInsets();
  const searchTop = insets.top + 12;

  // The sheet is adjustable: drag (or tap) the handle to slide the map between
  // its resting height and a short strip so more fundis fit on screen.
  const mapMin = Math.max(Math.round(Dimensions.get('window').height * 0.22), insets.top + 92);
  const mapHeight = useRef(new Animated.Value(MAP_MAX)).current;
  const mapHRef = useRef(MAP_MAX);
  const dragStart = useRef(MAP_MAX);
  const dragged = useRef(false);

  useEffect(() => {
    const id = mapHeight.addListener(({ value }) => {
      mapHRef.current = value;
    });
    return () => mapHeight.removeListener(id);
  }, [mapHeight]);

  const snapTo = (to: number) => {
    Animated.spring(mapHeight, { toValue: to, useNativeDriver: false, friction: 7, tension: 70 }).start();
  };

  const pan = useMemo(() => {
    const midpoint = () => (MAP_MAX + mapMin) / 2;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        dragStart.current = mapHRef.current;
        dragged.current = false;
      },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dy) > 6) dragged.current = true;
        mapHeight.setValue(Math.min(MAP_MAX, Math.max(mapMin, dragStart.current + g.dy)));
      },
      onPanResponderRelease: (_, g) => {
        if (!dragged.current) {
          snapTo(mapHRef.current > midpoint() ? mapMin : MAP_MAX);
          return;
        }
        const expand = Math.abs(g.vy) > 0.35 ? g.vy < 0 : mapHRef.current < midpoint();
        snapTo(expand ? mapMin : MAP_MAX);
      },
      onPanResponderTerminate: () => {
        snapTo(mapHRef.current < midpoint() ? mapMin : MAP_MAX);
      },
    });
  }, [mapMin]);

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <Animated.View style={[styles.mapContainer, { height: mapHeight }]}>
        {loading ? (
          <View style={styles.mapOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.mapSubtext}>Finding fundis near you…</Text>
          </View>
        ) : (
          <AppMap
            region={region}
            pins={pins}
            radius={{ center: origin, radiusMeters: radius * 1000 }}
            showsUserLocation={!device}
            style={styles.map}
          />
        )}

        <View style={[styles.searchWrap, { top: searchTop }]}>
          <View style={styles.searchBar}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
              <Ionicons name="chevron-back" size={24} color={colors.ink} />
            </Pressable>
            <Ionicons name="search" size={20} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search name or trade"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="never"
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </Animated.View>

      <View style={styles.sheet}>
        <View style={styles.grabber} {...pan.panHandlers}>
          <View style={styles.handle} />
          <Text style={styles.sheetLabel}>{sheetLabel}</Text>
        </View>

        <View style={styles.filterRowWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {category ? (
              <Chip key="chip-category" label={`${category}  ×`} active compact onPress={() => setCategory('')} />
            ) : null}
            {area ? (
              <Chip key="chip-area" label={`${area}  ×`} active compact onPress={() => setArea('')} />
            ) : null}
            {hasFilters ? <View style={styles.filterDivider} /> : null}
            <View style={styles.radiusBox}>
              <Pressable
                accessibilityLabel="Decrease search radius"
                hitSlop={6}
                disabled={radiusIdx === 0}
                onPress={() => setRadiusIdx((i) => Math.max(0, i - 1))}
                style={[styles.radiusBtn, radiusIdx === 0 && styles.radiusBtnOff]}
              >
                <Ionicons name="remove" size={16} color={colors.ink} />
              </Pressable>
              <Text style={styles.radiusValue}>{radius} km</Text>
              <Pressable
                accessibilityLabel="Increase search radius"
                hitSlop={6}
                disabled={radiusIdx === RADII.length - 1}
                onPress={() => setRadiusIdx((i) => Math.min(RADII.length - 1, i + 1))}
                style={[styles.radiusBtn, radiusIdx === RADII.length - 1 && styles.radiusBtnOff]}
              >
                <Ionicons name="add" size={16} color={colors.ink} />
              </Pressable>
            </View>
          </ScrollView>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <View style={styles.listLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.listLoadingText}>Finding fundis near you…</Text>
            </View>
          ) : visible.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name={term ? 'search-outline' : 'people-outline'} size={48} color={colors.muted} />
              <Text style={styles.emptyTitle}>{term ? 'No matches' : 'No fundis found'}</Text>
              <Text style={styles.emptySub}>
                {term
                  ? `Nothing here matches “${query.trim()}”.`
                  : hasFilters
                    ? 'Nothing matches these filters nearby. Clear them to widen the search.'
                    : 'No fundis are registered near you yet.'}
              </Text>
              {term || hasFilters ? (
                <Pressable
                  onPress={() => {
                    if (term) setQuery('');
                    if (hasFilters) {
                      setCategory('');
                      setArea('');
                    }
                  }}
                  style={styles.emptyBtn}
                >
                  <Text style={styles.emptyBtnText}>
                    {term && hasFilters ? 'Clear search and filters' : term ? 'Clear search' : 'Clear filters'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            visible.map((f) => (
              <FundiCard
                key={f.id}
                name={f.name}
                trade={f.trade}
                rating={f.rating}
                reviews={f.reviews}
                distance={f.distance}
                verified={f.verified}
                photo={f.photo}
                selected={f.id === selected}
                onPress={() => setSelected(f.id)}
              />
            ))
          )}
        </ScrollView>
      </View>

      {selectedFundi ? (
        <View style={styles.footer}>
          <PrimaryButton
            title={`Continue with ${selectedFundi.name.split(' ')[0]}`}
            onPress={() => openFundi(selectedFundi.id)}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  backBtn: { width: 36, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  mapContainer: {
    overflow: 'hidden',
    backgroundColor: colors.lightBg,
  },
  map: { width: '100%', height: '100%' },
  mapOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(250,250,250,0.9)', gap: spacing.sm },
  mapSubtext: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: spacing.xs },
  searchWrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, zIndex: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 54,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadowSm,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, padding: 0 },
  sheet: {
    flex: 1,
    marginTop: -radius.xl,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  grabber: { paddingTop: spacing.sm + 2, paddingBottom: spacing.xs },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border },
  sheetLabel: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink, textAlign: 'center', marginTop: spacing.md },
  filterRowWrap: { marginTop: spacing.lg },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xxl },
  filterDivider: { width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: spacing.xs },
  radiusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 2,
  },
  radiusBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
  radiusBtnOff: { opacity: 0.4 },
  radiusValue: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink, minWidth: 54, textAlign: 'center' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.xxl, paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  listLoading: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xxxl },
  listLoadingText: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  empty: { alignItems: 'center', paddingTop: spacing.xxxl, gap: spacing.sm },
  emptyBtn: { marginTop: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm + 2, borderRadius: radius.pill, backgroundColor: colors.primary },
  emptyBtnText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.black },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  emptySub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: 'center' },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
