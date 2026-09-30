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
import { REQUESTABLE_CATEGORIES, CATEGORY_LABELS } from '../src/data/categories';
import { setRequestDraft } from '../src/services/requestDraft';
import { resolveCurrentLocation } from '../src/services/location';
import { colors, fonts, radius, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const MAX_PHOTOS = 3;

export default function RequestJobScreen() {
  const router = useRouter();
  const { service } = useLocalSearchParams<{ service?: string }>();
  const [serviceType, setServiceType] = useState(service ?? '');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [gpsAddress, setGpsAddress] = useState('');
  const [locating, setLocating] = useState(true);
  const [date, setDate] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

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

  const handleSubmit = () => {
    if (!serviceType) {
      Alert.alert('Choose a service', 'Pick the type of work you need done.');
      return;
    }
    // One place collects the details; the booking screen pre-fills from here.
    setRequestDraft({ photos, service: serviceType, description, location, date });
    // GPS labels look like "Nakawa, Kampala, Uganda" — the first part is the
    // locality the area filter can match against a fundi's district.
    const area = location.split(',')[0].trim();
    router.push({
      pathname: '/available-fundis',
      params: { category: serviceType, area },
    });
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
          options={CATEGORY_LABELS.filter((l) => REQUESTABLE_CATEGORIES.some((c) => c.label === l))}
          placeholder="Select service"
        />
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
            <TextInput
              style={styles.gpsInput}
              value={location}
              onChangeText={setLocation}
              placeholder={locating ? 'Reading GPS…' : 'Type an address if location is off'}
              placeholderTextColor={colors.muted}
              multiline
            />
            <Pressable onPress={locate} hitSlop={10} style={styles.gpsRefresh} accessibilityLabel="Refresh GPS location">
              <Ionicons name="refresh" size={18} color={locating ? colors.muted : colors.primary} />
            </Pressable>
          </View>
          <Text style={styles.gpsHint}>
            {locating
              ? 'Getting your location from GPS…'
              : gpsAddress
                ? `Picked from GPS · ${gpsAddress}`
                : 'Location access is off — allow it or type the address.'}
          </Text>
        </View>
        <CalendarField label="Preferred Date" value={date} onChange={setDate} />
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="Find Fundis" onPress={handleSubmit} />
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
  footer: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl },
});
