import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Avatar from '../src/components/Avatar';
import PrimaryButton from '../src/components/PrimaryButton';
import InputField from '../src/components/InputField';
import SelectField from '../src/components/SelectField';
import { goBackSafe } from '../src/services/navigation';
import { IMAGES } from '../src/assets';
import { colors, fonts, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/contexts/AuthContext';
import { updateLocation, updateProfile } from '../src/services/api';
import { resolveCurrentLocation, type ResolvedLocation } from '../src/services/location';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isEdit = mode === 'edit';
  const { user, token, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [place, setPlace] = useState<ResolvedLocation | null>(null);
  const [locating, setLocating] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  // Camera badge on the avatar: pick a photo, store it as a data URL like the
  // fundi portfolio does, and refresh so the new picture shows immediately.
  const changePhoto = async () => {
    if (!token || photoSaving) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.base64) {
      Alert.alert('Could not read that photo', 'Try a different image.');
      return;
    }
    setPhotoSaving(true);
    try {
      await updateProfile(token, { profilePhoto: `data:image/jpeg;base64,${asset.base64}` });
      await refreshUser();
    } catch (e: any) {
      Alert.alert('Could not save photo', e?.message || 'Please try again.');
    } finally {
      setPhotoSaving(false);
    }
  };

  // Editing starts from the record already on file — never from a blank form.
  useEffect(() => {
    if (!isEdit || !user) return;
    const legacy = String(user.name || '').trim();
    setFirstName(user.firstName || legacy.split(' ')[0] || '');
    setLastName(user.lastName || legacy.split(' ').slice(1).join(' ') || '');
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
    if (!firstName.trim()) {
      Alert.alert('Required', 'Please enter your first name.');
      return;
    }
    if (!token) {
      Alert.alert('Session expired', 'Please sign in again.');
      return;
    }
    setLoading(true);
    try {
      await updateProfile(token, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
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
        goBackSafe('/settings');
        return;
      }
      // Legacy accounts that signed in without a name still land here once.
      router.replace(user?.role === 'fundi' ? '/(fundi-tabs)' : '/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => goBackSafe(isEdit ? '/settings' : '/(tabs)')} hitSlop={12} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
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
          <Avatar
            source={user?.profilePhoto ? { uri: user.profilePhoto } : IMAGES.profileIcon}
            showBadge={!photoSaving}
            onPress={changePhoto}
          />
          {photoSaving && <ActivityIndicator size="small" color={colors.primary} style={styles.photoSaving} />}
        </View>

        <InputField
          label="First Name"
          placeholder="Enter first name"
          value={firstName}
          onChangeText={setFirstName}
        />
        <InputField
          label="Second Name"
          placeholder="Enter second name"
          value={lastName}
          onChangeText={setLastName}
        />
        <SelectField
          label="Gender"
          value={gender}
          onChange={setGender}
          options={['Male', 'Female']}
          placeholder="Select Gender"
        />
        <View>
          {/* The address comes from GPS only — it stays as captured until the
              person asks for a fresh fix, so typing is disabled. */}
          <Pressable
            onPress={() => { if (!locating) captureLocation(); }}
            accessibilityLabel="Update location from GPS"
          >
            <View pointerEvents="none">
              <InputField
                label="Location"
                placeholder={locating ? 'Finding your location…' : 'Waiting for GPS'}
                value={location}
                editable={false}
                icon={<Ionicons name="location-outline" size={18} color={colors.primary} />}
              />
            </View>
          </Pressable>
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
                  ? 'Location access is off — turn it on in system settings, then tap the button'
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
          title="Save"
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
  photoSaving: { marginTop: spacing.sm },
  footer: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, paddingLeft: spacing.xs },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gpsText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primary },
  gpsHint: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, flexShrink: 1 },
});
