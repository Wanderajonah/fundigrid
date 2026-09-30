import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import locationIcon from '../assets/location.png';
import PrimaryButton from '../src/components/PrimaryButton';
import { colors, fonts, radius, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resolveCurrentLocation } from '../src/services/location';
import { getToken, updateLocation } from '../src/services/api';

export default function LocationScreen() {
  const router = useRouter();
  // Reached from Profile it is a settings stop, not an onboarding step — go
  // back instead of dumping the person into role selection.
  const { from } = useLocalSearchParams<{ from?: string }>();
  const finish = () => (from ? router.back() : router.push('/role'));
  const [loading, setLoading] = useState(false);

  const handleAllow = async () => {
    setLoading(true);
    try {
      const loc = await resolveCurrentLocation();
      if (loc) {
        const token = await getToken();
        if (token) {
          try {
            await updateLocation(token, {
              lat: loc.latitude,
              lng: loc.longitude,
              address: loc.address,
            });
          } catch {
            // Location is cached even if the backend update fails.
          }
        }
      } else {
        Alert.alert(
          'Location unavailable',
          'Could not read your location. You can allow it later from system settings.'
        );
      }
    } finally {
      setLoading(false);
      finish();
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <Image source={locationIcon} style={styles.pinIcon} resizeMode="contain" />
        <Text style={styles.h1}>Enable Location</Text>
        <Text style={styles.sub}>
          We use your location to connect you with nearby artisans and jobs, and show them on the
          map.
        </Text>

        <View style={styles.mapCard}>
          <View style={styles.mapGrid}>
            {Array.from({ length: 25 }).map((_, i) => (
              <View key={i} style={[styles.cell, i === 12 && styles.cellGreen]} />
            ))}
          </View>
          <View style={styles.blueDot}>
            <View style={styles.bluePulse} />
            <View style={styles.blueInner} />
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton title="Allow Location" loading={loading} onPress={handleAllow} />
        <PrimaryButton title="Not Now" variant="secondary" onPress={finish} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
  pinIcon: { width: 160, height: 160 },
  h1: { fontFamily: fonts.bold, fontSize: 24, color: colors.ink, textAlign: 'center' },
  sub: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.inkSoft, textAlign: 'center', marginTop: spacing.md },
  mapCard: { marginTop: spacing.xxl, width: 200, height: 200, borderRadius: radius.lg, backgroundColor: '#F0EDE8', overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  mapGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', padding: 2 },
  cell: { width: '20%', height: '20%', borderWidth: 0.5, borderColor: '#FEFDFB' },
  cellGreen: { backgroundColor: '#D6E8D2' },
  blueDot: { position: 'absolute', alignSelf: 'center', top: '50%', marginTop: -12 },
  bluePulse: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: colors.blue, opacity: 0.2, left: -12, top: -12 },
  blueInner: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue, left: -5, top: -5, borderWidth: 2, borderColor: colors.white },
  footer: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl, gap: spacing.md },
});
