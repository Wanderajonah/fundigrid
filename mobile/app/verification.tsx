import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import PrimaryButton from '../src/components/PrimaryButton';
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

type Referee = { name: string; phone: string; relationship?: string };

const MAX_REFEREES = 5;
const emptyReferee = (): Referee => ({ name: '', phone: '', relationship: '' });

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
  const { token, refreshUser, user } = useAuth();
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
  // Which referee card is open for editing — one at a time keeps the list
  // scannable: a collapsed row just shows who it is.
  const [openReferee, setOpenReferee] = useState(0);

  const refereeComplete = (referee: Referee) =>
    Boolean(referee.name.trim() && referee.phone.trim());

  useEffect(() => {
    if (!autoAddedSecond && referees.length === 1 && refereeComplete(referees[0])) {
      setAutoAddedSecond(true);
      setReferees((prev) => [...prev, emptyReferee()]);
      setOpenReferee(1);
    }
  }, [referees, autoAddedSecond]);

  const updateReferee = (index: number, field: keyof Referee, text: string) => {
    setReferees((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: text } : r)));
  };

  const addReferee = () => {
    if (referees.length >= MAX_REFEREES) return;
    setReferees((prev) => [...prev, emptyReferee()]);
    setOpenReferee(referees.length);
  };

  const removeReferee = (index: number) => {
    if (referees.length <= 1) return;
    setReferees((prev) => prev.filter((_, i) => i !== index));
    setOpenReferee((open) => (open > index ? open - 1 : open === index ? -1 : open));
  };

  // Onboarding hands `role` in the params; the profile screen opens this
  // screen for a re-submission with nothing to pass but the route itself.
  useEffect(() => {
    if (role && role !== 'fundi') router.replace('/role');
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
    // The admin reviews these in the web console, so the photo has to travel
    // as image data — a local file:// path means nothing on their screen.
    const opts = { quality: 0.6, base64: true } as const;
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], ...opts });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert('Could not read that photo', 'Try a smaller image or pick a different one.');
      return;
    }
    const dataUri = `data:image/jpeg;base64,${asset.base64}`;
    if (dataUri.length > 2500000) {
      Alert.alert('Photo too large', 'Take a closer, sharper shot instead of a full-page photo.');
      return;
    }
    setUploads((prev) => ({ ...prev, [key]: dataUri }));
  };

  const choosePhoto = (key: keyof Uploads, title: string) => {
    setPicker({ key, title });
  };

  const handleSubmit = async () => {
    if (!uploads.nationalIdFront) {
      Alert.alert('Required', 'Please add the front photo of your profile photo (or work ID).');
      return;
    }
    if (!uploads.nationalIdBack) {
      Alert.alert('Required', 'Please add the back photo of your profile photo (or work ID).');
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
        // Reached from the onboarding flow the trade/schedule params are all
        // here; reopened from the profile they are not — send only what we
        // actually know so a resubmission never wipes the fundi's setup.
        const setup: Record<string, unknown> = {};
        if (trades) setup.skills = trades.split(',');
        if (Number.isFinite(experienceYears)) setup.experience = experienceYears;
        if (Number.isFinite(radiusKm)) setup.serviceRadius = radiusKm;
        if (days) setup.availableDays = days.split(',');
        if (startTime) setup.availableStartTime = startTime;
        if (endTime) setup.availableEndTime = endTime;
        await updateProfile(token, {
          ...setup,
          role: 'fundi',
          verificationDocs: [uploads.nationalIdFront, uploads.nationalIdBack, uploads.certificate].filter(Boolean),
          referees: complete.map((r) => ({
            name: r.name.trim(),
            phone: r.phone.trim(),
            relationship: (r.relationship || '').trim(),
          })),
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

  const status = user?.verificationStatus || 'unverified';
  const statusBanner = (() => {
    if (status === 'verified') {
      return (
        <View style={[styles.banner, styles.bannerOk]}>
          <Ionicons name="shield-checkmark" size={18} color={colors.success} />
          <Text style={styles.bannerText}>
            You are verified. Clients can see you on the map.
          </Text>
        </View>
      );
    }
    if (status === 'pending') {
      return (
        <View style={[styles.banner, styles.bannerPending]}>
          <Ionicons name="hourglass-outline" size={18} color={colors.primary} />
          <Text style={styles.bannerText}>
            Documents received. Our team is reviewing them — you will show on the
            map once approved.
          </Text>
        </View>
      );
    }
    if (status === 'rejected') {
      return (
        <View style={[styles.banner, styles.bannerRejected]}>
          <Ionicons name="alert-circle" size={18} color={colors.danger} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerText}>Changes needed before we can verify you.</Text>
            {!!user?.verificationNote && <Text style={styles.bannerNote}>{user.verificationNote}</Text>}
          </View>
        </View>
      );
    }
    return null;
  })();

  const submitTitle =
    status === 'pending' ? 'Resubmit' : status === 'rejected' ? 'Resubmit Documents' : 'Submit';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <Text style={styles.h1}>Upload Your Documents</Text>
            <Text style={styles.sub}>
              Help us verify your identity and make you more trusted on the platform.
            </Text>
          </View>
          <View style={styles.titleArt}>
            <MaterialCommunityIcons name="file-document-outline" size={32} color={colors.primary} />
          </View>
        </View>

        {/* Where the admin's decision lands: pending, approved (live on the
            map), or sent back with the reason they wrote. */}
        {statusBanner}

        {/* Front and back of the profile / ID photo, each snapped with the
            camera or picked from the gallery. */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.iconChip}>
              <MaterialCommunityIcons name="card-account-details-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Profile Photos *</Text>
              <Text style={styles.cardDesc}>
                Upload a clear photo of the front and back of your profile photo (or work ID photo).
              </Text>
            </View>
            <Pressable
              onPress={() =>
                uploads.nationalIdFront
                  ? choosePhoto('nationalIdBack', 'Back of profile photo')
                  : choosePhoto('nationalIdFront', 'Front of profile photo')
              }
              style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.pillText}>Tap to upload</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primary} />
            </Pressable>
          </View>
          <View style={styles.idSlots}>
              {([
                { key: 'nationalIdFront' as const, label: 'Front' },
                { key: 'nationalIdBack' as const, label: 'Back' },
              ]).map(({ key, label }) => {
                const uri = uploads[key];
                return (
                  <View key={key} style={styles.idSlotCol}>
                    <Pressable
                      onPress={() => choosePhoto(key, `${label} of profile photo`)}
                      accessibilityLabel={`Profile photo ${label}, ${uri ? 'change photo' : 'tap to upload'}`}
                      style={({ pressed }) => [
                        styles.idSlot,
                        uri ? styles.idSlotFilled : styles.idSlotEmpty,
                        pressed && { opacity: 0.75 },
                      ]}
                    >
                      {uri ? (
                        <>
                          <Image source={{ uri }} style={styles.idThumb} resizeMode="cover" />
                          <View style={styles.idCheck}>
                            <Ionicons name="checkmark" size={12} color={colors.white} />
                          </View>
                        </>
                      ) : (
                        <>
                          <Ionicons name="cloud-upload-outline" size={26} color={colors.primary} />
                          <Text style={styles.idEmptyText}>Tap to upload</Text>
                        </>
                      )}
                    </Pressable>
                    <Text style={styles.idSlotLabel}>{label}</Text>
                  </View>
                );
              })}
          </View>
        </View>

        <UploadRow
          icon={<MaterialCommunityIcons name="certificate-outline" size={24} color={colors.primary} />}
          title="Certificate of Trade *"
          subtitle="Upload your trade certificate or license."
          imageUri={uploads.certificate}
          onPress={() => choosePhoto('certificate', 'Certificate of Trade')}
        />

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.iconChip}>
              <Ionicons name="people-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Referees *</Text>
              <Text style={styles.cardDesc}>
                Minimum two people we can contact to vouch for your work.
              </Text>
            </View>
            {referees.length < MAX_REFEREES && (
              <Pressable onPress={addReferee} style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }]}>
                <Text style={styles.pillText}>Add referees</Text>
                <Ionicons name="chevron-forward" size={13} color={colors.primary} />
              </Pressable>
            )}
          </View>

          {referees.map((referee, index) => {
            const open = openReferee === index;
            const summary = [referee.name, referee.phone, referee.relationship]
              .filter(Boolean)
              .join('  ·  ');
            return (
              <View key={index} style={styles.refRow}>
                <View style={styles.refRowHead}>
                  <Pressable
                    onPress={() => setOpenReferee(open ? -1 : index)}
                    style={({ pressed }) => [styles.refRowBtn, pressed && { opacity: 0.7 }]}
                  >
                    <View style={styles.refRowInfo}>
                      <Text style={styles.refRowTitle}>Referee {index + 1}</Text>
                      <Text style={styles.refRowSub}>
                        {summary || 'Name, phone number and relationship.'}
                      </Text>
                    </View>
                    <Ionicons name={open ? 'chevron-up' : 'chevron-forward'} size={18} color={colors.muted} />
                  </Pressable>
                  {referees.length > 1 && (
                    <Pressable
                      onPress={() => removeReferee(index)}
                      hitSlop={8}
                      accessibilityLabel={`Remove referee ${index + 1}`}
                    >
                      <Ionicons name="close-circle" size={18} color={colors.muted} />
                    </Pressable>
                  )}
                </View>

                {open && (
                  <View style={styles.refRowForm}>
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
                    <InputField
                      label="Relationship"
                      placeholder="e.g. Former client, employer"
                      value={referee.relationship || ''}
                      onChangeText={(t) => updateReferee(index, 'relationship', t)}
                      autoComplete="off"
                      importantForAutofill="no"
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title={submitTitle} onPress={handleSubmit} loading={loading} />
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
  root: { flex: 1, backgroundColor: colors.lightBg },
  header: { height: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  backBtn: { position: 'absolute', left: spacing.xxl, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 85, height: 85 },
  body: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl, paddingTop: spacing.md, gap: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  titleCol: { flex: 1, gap: 6 },
  h1: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 30, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.inkSoft },
  titleArt: {
    width: 68,
    height: 68,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, gap: 4 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  cardDesc: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.muted },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    flexShrink: 0,
  },
  pillText: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.primary },
  idSlots: { flexDirection: 'row', gap: spacing.md },
  idSlotCol: { flex: 1, gap: spacing.sm },
  idSlot: {
    height: 112,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  idSlotEmpty: { borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.primaryFaint },
  idSlotFilled: { borderColor: colors.success, borderStyle: 'solid' },
  idThumb: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
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
  idSlotLabel: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.ink },
  refRow: {
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  refRowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  refRowBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  refRowInfo: { flex: 1, gap: 2 },
  refRowTitle: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.ink },
  refRowSub: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.muted },
  refRowForm: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  bannerOk: { backgroundColor: colors.successSoft, borderColor: colors.success },
  bannerPending: { backgroundColor: colors.primaryFaint, borderColor: colors.primary },
  bannerRejected: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
  bannerText: { flex: 1, fontFamily: fonts.medium, fontSize: 12.5, color: colors.ink, lineHeight: 18 },
  bannerNote: { fontFamily: fonts.regular, fontSize: 12, color: colors.danger, marginTop: 4, lineHeight: 17 },
  footer: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl },
});
