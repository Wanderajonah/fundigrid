import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import PrimaryButton from '../src/components/PrimaryButton';
import SectionHeader from '../src/components/SectionHeader';
import UploadRow from '../src/components/UploadRow';
import PhotoSourceSheet from '../src/components/PhotoSourceSheet';
import InputField from '../src/components/InputField';
import { IMAGES } from '../src/assets';
import { colors, fonts, radius, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/contexts/AuthContext';
import { updateProfile } from '../src/services/api';

type Uploads = {
  nationalIdFront: string | null;
  nationalIdBack: string | null;
  certificate: string | null;
};

type Referee = { name: string; phone: string };

const MAX_REFEREES = 5;
const emptyReferee = (): Referee => ({ name: '', phone: '' });

export default function VerificationScreen() {
  const router = useRouter();
  const { role, trades, experience, radius, days, startTime, endTime } = useLocalSearchParams<{
    role?: string;
    trades?: string;
    experience?: string;
    radius?: string;
    days?: string;
    startTime?: string;
    endTime?: string;
  }>();
  const { token, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [picker, setPicker] = useState<{ key: keyof Uploads; title: string } | null>(null);
  const [uploads, setUploads] = useState<Uploads>({
    nationalIdFront: null,
    nationalIdBack: null,
    certificate: null,
  });
  // The form needs two referees, but it opens with a single slot so two empty
  // "Referee" cards are not sitting there looking like duplicates. The second
  // slot appears as soon as the first one is filled in.
  const [referees, setReferees] = useState<Referee[]>([emptyReferee()]);
  const [autoAddedSecond, setAutoAddedSecond] = useState(false);

  const refereeComplete = (referee: Referee) =>
    Boolean(referee.name.trim() && referee.phone.trim());

  useEffect(() => {
    if (!autoAddedSecond && referees.length === 1 && refereeComplete(referees[0])) {
      setAutoAddedSecond(true);
      setReferees((prev) => [...prev, emptyReferee()]);
    }
  }, [referees, autoAddedSecond]);

  const updateReferee = (index: number, field: keyof Referee, text: string) => {
    setReferees((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: text } : r)));
  };

  const addReferee = () => {
    setReferees((prev) => (prev.length >= MAX_REFEREES ? prev : [...prev, emptyReferee()]));
  };

  const removeReferee = (index: number) => {
    setReferees((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  useEffect(() => {
    if (role !== 'fundi') router.replace('/role');
  }, [role, router]);

  // Every document slot offers both routes: snap it with the camera or pick
  // an existing photo, so a scanned copy works as well as a live shot.
  const capturePhoto = async (key: keyof Uploads, source: 'camera' | 'library') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow camera access to photograph your document.');
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photo library.');
        return;
      }
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      const uri = result.assets[0].uri;
      setUploads((prev) => ({ ...prev, [key]: uri }));
    }
  };

  const choosePhoto = (key: keyof Uploads, title: string) => {
    setPicker({ key, title });
  };

  const handleSubmit = async () => {
    if (!uploads.nationalIdFront) {
      Alert.alert('Required', 'Please add a photo of the front of your National ID.');
      return;
    }
    if (!uploads.nationalIdBack) {
      Alert.alert('Required', 'Please add a photo of the back of your National ID.');
      return;
    }
    if (!uploads.certificate) {
      Alert.alert('Required', 'Please upload your Certificate of Trade.');
      return;
    }
    const complete = referees.filter((r) => r.name.trim() && r.phone.trim());
    const halfFilled = referees.some((r) => Boolean(r.name.trim()) !== Boolean(r.phone.trim()));
    if (complete.length < 2 || halfFilled) {
      Alert.alert(
        'Required',
        'Add at least two referees — each one needs a name and a phone number.',
      );
      return;
    }
    setLoading(true);
    try {
      if (token) {
        const experienceYears = parseInt(experience ?? '', 10);
        const radiusKm = parseInt(radius ?? '', 10);
        await updateProfile(token, {
          role: 'fundi',
          skills: trades ? trades.split(',') : [],
          experience: Number.isFinite(experienceYears) ? experienceYears : 0,
          serviceRadius: Number.isFinite(radiusKm) ? radiusKm : 10,
          availableDays: days ? days.split(',') : [],
          availableStartTime: startTime,
          availableEndTime: endTime,
          verificationDocs: [uploads.nationalIdFront, uploads.nationalIdBack, uploads.certificate].filter(Boolean),
          referees: complete.map((r) => ({ name: r.name.trim(), phone: r.phone.trim() })),
          onboardingComplete: true,
        });
        await refreshUser();
      }
      router.replace('/(fundi-tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save. Please try again.');
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
        <SectionHeader title="Verify Your Identity" subtitle="Upload the required documents to get verified and build trust with clients." />

        <View style={styles.uploads}>
          {/* Front and back of the national ID, each snapped with the camera
              or picked from the gallery. */}
          <View style={styles.docCard}>
            <View style={styles.docHead}>
              <View style={styles.docIcon}>
                <MaterialCommunityIcons name="card-account-details-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.docInfo}>
                <Text style={styles.docTitle}>National ID *</Text>
                <Text style={styles.docSubtitle}>A clear photo of the front and the back</Text>
              </View>
            </View>
            <View style={styles.idSlots}>
              {([
                { key: 'nationalIdFront' as const, label: 'Front' },
                { key: 'nationalIdBack' as const, label: 'Back' },
              ]).map(({ key, label }) => {
                const uri = uploads[key];
                return (
                  <Pressable
                    key={key}
                    onPress={() => choosePhoto(key, `${label} of National ID`)}
                    accessibilityLabel={`National ID ${label} photo`}
                    style={({ pressed }) => [styles.idSlot, !uri && styles.idSlotEmpty, pressed && { opacity: 0.75 }]}
                  >
                    <View style={styles.idMedia}>
                      {uri ? (
                        <>
                          <Image source={{ uri }} style={styles.idThumb} resizeMode="cover" />
                          <View style={styles.idCheck}>
                            <Ionicons name="checkmark" size={12} color={colors.white} />
                          </View>
                        </>
                      ) : (
                        <View style={styles.idEmpty}>
                          <Ionicons name="camera-outline" size={22} color={colors.primary} />
                          <Text style={styles.idEmptyText}>Tap to upload</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.idSlotFooter}>
                      <Text style={styles.idSlotLabel}>{label}</Text>
                      <Text style={styles.idSlotAction}>{uri ? 'Change' : 'Add'}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <UploadRow
            icon={<MaterialCommunityIcons name="certificate-outline" size={24} color={colors.primary} />}
            title="Certificate of Trade *"
            subtitle="Trade certificate or license"
            imageUri={uploads.certificate}
            onPress={() => choosePhoto('certificate', 'Certificate of Trade')}
          />
        </View>

        <View style={styles.refereesBlock}>
          <View style={styles.refereesHead}>
            <Text style={styles.label}>Referees *</Text>
            <Text style={styles.hint}>
              Minimum two people we can contact to vouch for your work.
            </Text>
          </View>

          {referees.map((referee, index) => (
            <View key={index} style={styles.refCard}>
              <View style={styles.refHead}>
                <Text style={styles.refTitle}>Referee {index + 1}</Text>
                {referees.length > 1 && (
                  <Pressable onPress={() => removeReferee(index)} hitSlop={8} accessibilityLabel={`Remove referee ${index + 1}`}>
                    <Ionicons name="close-circle" size={20} color={colors.muted} />
                  </Pressable>
                )}
              </View>
              <InputField
                label="Name"
                placeholder="Full name"
                value={referee.name}
                onChangeText={(t) => updateReferee(index, 'name', t)}
                autoComplete="off"
                importantForAutofill="no"
              />
              <InputField
                label="Phone"
                placeholder="07xx xxx xxx"
                keyboardType="phone-pad"
                value={referee.phone}
                onChangeText={(t) => updateReferee(index, 'phone', t)}
                autoComplete="off"
                importantForAutofill="no"
              />
            </View>
          ))}

          {referees.length < MAX_REFEREES &&
            refereeComplete(referees[referees.length - 1]) && (
              <Pressable onPress={addReferee} style={({ pressed }) => [styles.addRef, pressed && { opacity: 0.7 }]}>
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.addRefText}>Add referee</Text>
              </Pressable>
            )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="Submit" onPress={handleSubmit} loading={loading} />
      </View>

      <PhotoSourceSheet
        visible={picker !== null}
        title={picker?.title ?? ''}
        onPick={(source) => {
          const target = picker;
          setPicker(null);
          if (target) capturePhoto(target.key, source);
        }}
        onClose={() => setPicker(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: { height: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  backBtn: { position: 'absolute', left: spacing.xxl, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 85, height: 85 },
  body: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl, paddingTop: spacing.md, gap: spacing.lg },
  uploads: { gap: spacing.md },
  refereesBlock: { gap: spacing.md },
  refereesHead: { gap: 2 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  refCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  refHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  refTitle: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.ink },
  docCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  docHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  docIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.lightBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: { flex: 1, gap: 2 },
  docTitle: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.ink },
  docSubtitle: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.muted },
  idSlots: { flexDirection: 'row', gap: spacing.md },
  idSlot: {
    flex: 1,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  idSlotEmpty: { borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.primaryFaint },
  idMedia: { backgroundColor: colors.lightBg },
  idThumb: { width: '100%', height: 104 },
  idEmpty: { height: 104, alignItems: 'center', justifyContent: 'center', gap: 6 },
  idEmptyText: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary },
  idCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idSlotFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  idSlotLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink },
  idSlotAction: { fontFamily: fonts.medium, fontSize: 11, color: colors.primary },
  addRef: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.xs },
  addRefText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  footer: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl },
});
