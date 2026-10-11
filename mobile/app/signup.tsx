import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import PrimaryButton from '../src/components/PrimaryButton';
import InputField from '../src/components/InputField';
import PasswordField from '../src/components/PasswordField';
import SelectField from '../src/components/SelectField';
import Avatar from '../src/components/Avatar';
import { IMAGES } from '../src/assets';
import { colors, fonts, radius, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendOtp } from '../src/services/api';
import { toFullPhone } from '../src/services/phone';
import { goBackSafe } from '../src/services/navigation';
import { PASSWORD_MESSAGE, validatePassword } from '../src/services/passwordRules';
import { resolveCurrentLocation, type ResolvedLocation } from '../src/services/location';
import { setPendingProfile } from '../src/services/pendingProfile';

// Full-bleed banner, same crop as the login screen: the source PNG carries a
// large white band above the artwork, so the box is clipped to its bottom.
const SCREEN_WIDTH = Dimensions.get('window').width;
const ILLUSTRATION_HEIGHT = Math.round(SCREEN_WIDTH * 0.21);
const ILLUSTRATION_FULL_HEIGHT = Math.round(SCREEN_WIDTH * 0.45);

// Create-account flow, one screen, three steps:
//   ① profile (photo, names, gender, location)  →  ② phone  →  ③ password + terms
// The account itself is only created at the end, when the OTP is verified; the
// profile collected here is applied to the fresh session right after.
export default function SignupScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: 'client' | 'fundi' }>();
  const landingRole = role ?? 'client';

  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [place, setPlace] = useState<ResolvedLocation | null>(null);
  const [locating, setLocating] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [photoSaving, setPhotoSaving] = useState(false);

  const back = () => {
    if (step > 1) {
      setStep(step - 1);
      return;
    }
    goBackSafe('/role');
  };

  // The avatar is picked before the account exists, so it is held as a data
  // URL and uploaded once the OTP gives us a session.
  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload a profile picture.');
      return;
    }
    setPhotoSaving(true);
    try {
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
      setPhoto(`data:image/jpeg;base64,${asset.base64}`);
    } finally {
      setPhotoSaving(false);
    }
  };

  // Registration reads the GPS fix for you — nobody should have to type an
  // address they are already standing in.
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
    captureLocation();
  }, [captureLocation]);

  const continueFromDetails = () => {
    if (!firstName.trim()) {
      Alert.alert('Required', 'Please enter your first name.');
      return;
    }
    setPendingProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      locationLabel: location.trim(),
      lat: place?.latitude,
      lng: place?.longitude,
      profilePhoto: photo,
    });
    setStep(2);
  };

  const continueFromPhone = () => {
    const fullPhone = toFullPhone(phone);
    if (fullPhone.length < 9) {
      Alert.alert('Invalid number', 'Please enter a valid phone number.');
      return;
    }
    setStep(3);
  };

  const createAccount = async () => {
    if (!validatePassword(password)) {
      setPasswordError(PASSWORD_MESSAGE);
      return;
    }
    if (!agreed) {
      Alert.alert('Terms & Conditions', 'Please agree to the Terms & Conditions and Privacy Policy to continue.');
      return;
    }
    setPasswordError(null);

    const fullPhone = toFullPhone(phone);
    setLoading(true);
    try {
      await sendOtp(fullPhone, 'register');
      router.push({
        pathname: '/otp',
        params: {
          role: landingRole,
          phone: fullPhone,
          purpose: 'register',
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          password,
        },
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send the code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={back} hitSlop={12} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.body}>
        {step === 1 && (
          <ScrollView contentContainerStyle={styles.stepScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.h1}>Set Up Your Profile</Text>
            <Text style={styles.sub}>Help us personalize your experience.</Text>

            <View style={styles.avatarWrap}>
              <Avatar
                source={photo ? { uri: photo } : IMAGES.profileIcon}
                showBadge={!photoSaving}
                onPress={pickPhoto}
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
              {/* The address comes from GPS only — it stays as captured until
                  the person asks for a fresh fix, so typing is disabled. */}
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
                      {locationDenied ? 'Try GPS again' : place ? 'Update from GPS' : 'Use my current location'}
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
                        : 'Location helps clients and fundis find each other'}
                </Text>
              </View>
            </View>

            <PrimaryButton title="Continue" onPress={continueFromDetails} />
          </ScrollView>
        )}

        {step === 2 && (
          <>
            <Text style={styles.h1}>Enter Your Phone Number</Text>
            <Text style={styles.sub}>We'll send a 4-digit code to verify your number.</Text>

            <View style={styles.phoneRow}>
              <Pressable style={styles.countryCode}>
                <Text style={styles.flag}>🇺🇬</Text>
                <Text style={styles.code}>+256</Text>
                <Ionicons name="chevron-down" size={14} color={colors.inkSoft} />
              </Pressable>
              <TextInput
                style={styles.input}
                placeholder="712 345678"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={10}
              />
            </View>

            <PrimaryButton title="Continue" onPress={continueFromPhone} />
          </>
        )}

        {step === 3 && (
          <ScrollView contentContainerStyle={styles.stepScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.h1}>Set a Password</Text>
            <Text style={styles.sub}>Choose a strong password for your account.</Text>

            <View style={styles.fields}>
              <PasswordField
                label="Password"
                placeholder="Choose a password"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setPasswordError(null);
                }}
                showRules
                rulesCard
              />
              {passwordError && <Text style={styles.passwordError}>{passwordError}</Text>}
            </View>

            <PrimaryButton title="Create Account" onPress={createAccount} loading={loading} style={styles.createBtn} />

            <Pressable onPress={() => setAgreed((a) => !a)} style={styles.agreeRow} hitSlop={8}>
              <Ionicons
                name={agreed ? 'checkbox' : 'square-outline'}
                size={22}
                color={agreed ? colors.primary : colors.muted}
              />
              <Text style={styles.agreeText}>
                I agree to the{' '}
                <Text style={styles.agreeLink} onPress={() => router.push('/terms')} suppressHighlighting>
                  Terms &amp; Conditions
                </Text>{' '}
                and{' '}
                <Text style={styles.agreeLink} onPress={() => router.push('/terms')} suppressHighlighting>
                  Privacy Policy
                </Text>
              </Text>
            </Pressable>
          </ScrollView>
        )}

        <View style={styles.illustration}>
          <Image source={IMAGES.loginIllustration} style={styles.illustrationImg} resizeMode="cover" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: { height: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  backBtn: { position: 'absolute', left: spacing.xxl, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 85, height: 85 },
  body: { flex: 1, paddingHorizontal: spacing.xxl, paddingTop: spacing.xl, backgroundColor: colors.white },
  stepScroll: { paddingBottom: spacing.xl, gap: spacing.lg, backgroundColor: colors.white },
  avatarWrap: { alignItems: 'center', paddingVertical: spacing.md },
  photoSaving: { marginTop: spacing.sm },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, paddingLeft: spacing.xs },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gpsText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primary },
  gpsHint: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, flexShrink: 1 },
  h1: { fontFamily: fonts.bold, fontSize: 24, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft, marginTop: 4 },
  fields: { marginTop: spacing.xl, gap: spacing.lg },
  passwordError: { fontFamily: fonts.regular, fontSize: 13, color: colors.danger },
  createBtn: { marginTop: spacing.xl },
  phoneRow: { flexDirection: 'row', marginTop: spacing.xxl, marginBottom: spacing.xl, gap: spacing.sm },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    height: 50,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  flag: { fontSize: 18 },
  code: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  input: {
    flex: 1,
    height: 50,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.regular,
    fontSize: 14.5,
    color: colors.ink,
  },
  agreeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  agreeText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft, lineHeight: 19 },
  agreeLink: { fontFamily: fonts.semibold, color: colors.primary },
  illustration: {
    width: SCREEN_WIDTH,
    marginLeft: -spacing.xxl,
    height: ILLUSTRATION_HEIGHT,
    flexShrink: 1,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginTop: 'auto',
    marginBottom: 0,
  },
  illustrationImg: { width: SCREEN_WIDTH, height: ILLUSTRATION_FULL_HEIGHT },
});
