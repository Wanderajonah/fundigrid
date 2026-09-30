import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Avatar from '../src/components/Avatar';
import PrimaryButton from '../src/components/PrimaryButton';
import InputField from '../src/components/InputField';
import SelectField from '../src/components/SelectField';
import { IMAGES } from '../src/assets';
import { colors, fonts, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/contexts/AuthContext';
import { updateLocation, updateProfile } from '../src/services/api';
import { resolveCurrentLocation, type ResolvedLocation } from '../src/services/location';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { role, phone, mode } = useLocalSearchParams<{ role?: string; phone?: string; mode?: string }>();
  const isEdit = mode === 'edit';
  const { user, token, refreshUser } = useAuth();
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [place, setPlace] = useState<ResolvedLocation | null>(null);
  const [locating, setLocating] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Editing starts from the record already on file — never from a blank form.
  useEffect(() => {
    if (!isEdit || !user) return;
    setFullName(user.name || '');
    setGender(user.gender || '');
    setLocation(user.locationLabel || '');
  }, [isEdit, user]);

  // Registration reads the GPS fix for you — nobody should have to type an
  // address they are already standing in. Editing keeps the saved label until
  // the person asks for a new fix.
  const captureLocation = useCallback(async () => {
    setLocating(true);
    try {
      const resolved = await resolveCurrentLocation();
      if (resolved) {
        setPlace(resolved);
        setLocation(resolved.address);
        setLocationDenied(false);
      } else {
        setLocationDenied(true);
      }
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    if (isEdit) {
      setLocating(false);
      return;
    }
    captureLocation();
  }, [captureLocation, isEdit]);

  const handleNext = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }
    if (!token) {
      Alert.alert('Session expired', 'Please sign in again.');
      return;
    }
    setLoading(true);
    try {
      await updateProfile(token, {
        name: fullName.trim(),
        gender,
        locationLabel: location.trim(),
      });
      // Coordinates drive the distance sort, so store them alongside the label.
      if (place) {
        try {
          await updateLocation(token, {
            lat: place.latitude,
            lng: place.longitude,
            address: location.trim() || place.address,
          });
        } catch {
          // Label is already saved above; coordinates are a bonus.
        }
      }
      await refreshUser();
      if (isEdit) {
        router.back();
        return;
      }
      if (role === 'fundi') {
        router.push({ pathname: '/trade-details', params: { role } });
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>{isEdit ? 'Edit Profile' : 'Complete Your Profile'}</Text>
        <Text style={styles.sub}>
          {isEdit ? 'Update the details on your account.' : 'Help us personalize your experience.'}
        </Text>

        <View style={styles.avatarWrap}>
          <Avatar showBadge />
        </View>

        <InputField
          label="Full Name"
          placeholder="Enter your full name"
          value={fullName}
          onChangeText={setFullName}
        />
        <SelectField
          label="Gender"
          value={gender}
          onChange={setGender}
          options={['Male', 'Female']}
          placeholder="Select Gender"
        />
        <View>
          <InputField
            label="Location"
            placeholder={locating ? 'Finding your location…' : 'Enter your location'}
            value={location}
            onChangeText={setLocation}
            icon={<Ionicons name="location-outline" size={18} color={colors.primary} />}
          />
          <View style={styles.gpsRow}>
            {locating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Pressable onPress={captureLocation} hitSlop={8} style={({ pressed }) => [styles.gpsBtn, pressed && { opacity: 0.6 }]}>
                <Ionicons name="locate-outline" size={15} color={colors.primary} />
                <Text style={styles.gpsText}>
                  {locationDenied
                    ? 'Try GPS again'
                    : place || isEdit
                      ? 'Update from GPS'
                      : 'Use my current location'}
                </Text>
              </Pressable>
            )}
            <Text style={styles.gpsHint}>
              {locating
                ? 'Reading your GPS…'
                : locationDenied
                  ? 'Location access is off — type your area instead'
                  : place
                    ? 'Captured from your GPS'
                    : isEdit
                      ? 'Tap to refresh with GPS'
                      : 'Captured from your GPS'}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={isEdit ? 'Save' : 'Next'}
          onPress={handleNext}
          loading={loading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: { height: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  backBtn: { position: 'absolute', left: spacing.xxl, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 85, height: 85 },
  body: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl, paddingTop: spacing.md, gap: spacing.lg },
  h1: { fontFamily: fonts.bold, fontSize: 24, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
  avatarWrap: { alignItems: 'center', paddingVertical: spacing.lg },
  footer: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: -spacing.xs, paddingLeft: spacing.xs },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gpsText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primary },
  gpsHint: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, flexShrink: 1 },
});
