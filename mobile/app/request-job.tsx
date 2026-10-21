import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import PrimaryButton from '../src/components/PrimaryButton';
import TextArea from '../src/components/TextArea';
import InputField from '../src/components/InputField';
import SelectField from '../src/components/SelectField';
import CalendarField from '../src/components/CalendarField';
import { IMAGES } from '../src/assets';
import { CATEGORY_LABELS } from '../src/data/categories';
import { setRequestDraft } from '../src/services/requestDraft';
import { resolveCurrentLocation, getCurrentLocation } from '../src/services/location';
import { createBooking } from '../src/services/api';
import { useAuth } from '../src/contexts/AuthContext';
import { DEFAULT_REGION } from '../src/maps/config';
import { colors, fonts, radius, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const MAX_PHOTOS = 3;

// CalendarField hands back "YYYY-MM-DD"; the booking only needs the day, so
// we book the default morning slot and the client can pick a time later.
function dateToScheduled(date: string): string | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 9, 0, 0);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export default function RequestJobScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { service } = useLocalSearchParams<{ service?: string }>();
  const [serviceType, setServiceType] = useState(service ?? '');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [gpsAddress, setGpsAddress] = useState('');
  const [locating, setLocating] = useState(true);
  const [date, setDate] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // "Other" means the client names the trade themselves, so the category sent
  // to the directory and stored on the booking is whatever they type.
  const isCustomService = serviceType === 'Other';
  const category = isCustomService ? customCategory.trim() : serviceType;

  // The address is read from the device GPS so nobody has to type it.
  const locate = useCallback(async () => {
    setLocating(true);
    const resolved = await resolveCurrentLocation();
    if (resolved) {
      setGpsAddress(resolved.address);
      setLocation(resolved.address);
    } else {
      setGpsAddress('');
    }
    setLocating(false);
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  const pickPhotos = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo access needed', 'Allow photo access so you can attach pictures of the job.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.7,
    });
    if (result.canceled) return;
    const uris = result.assets.map((a) => a.uri);
    setPhotos((prev) => Array.from(new Set([...prev, ...uris])).slice(0, MAX_PHOTOS));
  };

  const handleSubmit = async () => {
    if (!serviceType) {
      Alert.alert('Choose a service', 'Pick the type of work you need done.');
      return;
    }
    if (isCustomService && !category) {
      Alert.alert('Name your service', 'Type the kind of work you need done.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Describe the job', 'Add a short description so fundis know what the job involves.');
      return;
    }
    if (!location.trim()) {
      Alert.alert(
        'Location needed',
        'Turn on location access and tap the refresh icon to pick your job location.',
      );
      return;
    }
    if (!token) {
      Alert.alert('Sign in required', 'Please sign in to send a request.');
      return;
    }

    setSubmitting(true);
    try {
      const device = await getCurrentLocation();
      const coords = device
        ? { lat: device.latitude, lng: device.longitude }
        : { lat: DEFAULT_REGION.latitude, lng: DEFAULT_REGION.longitude };
      const scheduledFor = dateToScheduled(date);

      // One place collects the details; the confirm screen pre-fills from here.
      setRequestDraft({ photos, service: category, description, location, date });

      // Sent straight to nearby fundis — the fundi quotes after a site visit.
      const data = await createBooking(token, {
        category,
        description: description.trim(),
        address: location.trim(),
        location: coords,
        ...(photos.length ? { images: photos } : {}),
        ...(scheduledFor ? { scheduledFor } : {}),
      });

      const booking = data?.booking;
      router.replace({
        pathname: '/request-status',
        params: { bookingId: booking?.id ? String(booking.id) : '' },
      });
    } catch (e: any) {
      Alert.alert('Request failed', e?.message || 'Could not send your request. Try again.');
    } finally {
      setSubmitting(false);
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

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>Tell us what you need and we'll handle the rest.</Text>

        <SelectField
          label="Service Type"
          value={serviceType}
          onChange={setServiceType}
          options={CATEGORY_LABELS}
          placeholder="Select service"
          helper={isCustomService ? 'Pick Other, then name the service below.' : undefined}
        />
        {isCustomService ? (
          <InputField
            label="Service Category"
            value={customCategory}
            onChangeText={setCustomCategory}
            placeholder="e.g. Painting, gardening, welding"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            helper="We use this to describe your job to fundis."
          />
        ) : null}
        <TextArea
          label="Job Description"
          placeholder="Describe the work needed..."
          value={description}
          onChangeText={setDescription}
        />

        <View>
          <Text style={styles.photoLabel}>
            Photos <Text style={styles.optional}>(optional)</Text>
          </Text>
          <Text style={styles.photoHint}>Pictures help the fundi understand the job before arriving.</Text>

          <Pressable
            onPress={pickPhotos}
            disabled={photos.length >= MAX_PHOTOS}
            style={({ pressed }) => [
              styles.dropzone,
              photos.length >= MAX_PHOTOS && styles.dropzoneFull,
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={styles.dropzoneIcon}>
              <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.dropzoneText}>
              <Text style={styles.dropzoneTitle}>Add photos</Text>
              <Text style={styles.dropzoneHint}>
                {photos.length >= MAX_PHOTOS
                  ? 'Limit reached'
                  : photos.length
                    ? `${photos.length} of ${MAX_PHOTOS} added`
                    : `Up to ${MAX_PHOTOS} pictures`}
              </Text>
            </View>
            <Ionicons name="add" size={22} color={colors.primary} />
          </Pressable>

          {photos.length > 0 && (
            <View style={styles.photoRow}>
              {photos.map((uri, i) => (
                <View key={`${uri}-${i}`} style={styles.thumb}>
                  <Image source={{ uri }} style={styles.thumbImg} resizeMode="cover" />
                  <Pressable
                    onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    hitSlop={6}
                    style={({ pressed }) => [styles.thumbRemove, pressed && { opacity: 0.7 }]}
                  >
                    <Ionicons name="close" size={12} color={colors.white} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.gpsBlock}>
          <Text style={styles.gpsLabel}>Job Location</Text>
          <View style={styles.gpsCard}>
            <Ionicons
              name={gpsAddress ? 'location' : 'navigate-outline'}
              size={18}
              color={gpsAddress ? colors.primary : colors.muted}
            />
            {/* GPS-only field: it holds whatever the last fix returned and can
                be refreshed from the icon (or by tapping the text) but never
                typed into. */}
            <Pressable style={styles.gpsInputWrap} onPress={() => { if (!locating) locate(); }}>
              <View pointerEvents="none">
                <TextInput
                  style={styles.gpsInput}
                  value={location}
                  editable={false}
                  placeholder={locating ? 'Reading GPS…' : 'Waiting for GPS'}
                  placeholderTextColor={colors.muted}
                  multiline
                />
              </View>
            </Pressable>
            <Pressable onPress={locate} hitSlop={10} style={styles.gpsRefresh} accessibilityLabel="Refresh GPS location">
              <Ionicons name="refresh" size={18} color={locating ? colors.muted : colors.primary} />
            </Pressable>
          </View>
          <Text style={styles.gpsHint}>
            {locating
              ? 'Getting your location from GPS…'
              : gpsAddress
                ? `Picked from GPS · ${gpsAddress}`
                : 'Location access is off — allow it in settings, then tap the refresh icon.'}
          </Text>
        </View>
        <CalendarField label="Preferred Date" value={date} onChange={setDate} />
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="Submit Request" loading={submitting} onPress={handleSubmit} />
        <Text style={styles.footerNote}>
          Your request goes to nearby fundis — the one you pick quotes the price after a site visit.
        </Text>
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
  intro: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft, lineHeight: 21 },
  photoLabel: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.ink },
  optional: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  gpsBlock: { gap: 6 },
  gpsLabel: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.ink },
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  gpsInputWrap: { flex: 1, justifyContent: 'flex-start' },
  gpsInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
    padding: 0,
    minHeight: 20,
  },
  gpsRefresh: { paddingTop: 1 },
  gpsHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  photoHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  dropzone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 68,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  dropzoneFull: { opacity: 0.55 },
  dropzoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropzoneText: { flex: 1 },
  dropzoneTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  dropzoneHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 1 },
  thumb: { width: 72, height: 72, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.lightBg },
  thumbImg: { width: '100%', height: '100%' },
  thumbRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl, gap: spacing.sm },
  footerNote: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.muted, textAlign: 'center' },
});
