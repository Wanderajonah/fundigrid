import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import PrimaryButton from '../src/components/PrimaryButton';
import SectionHeader from '../src/components/SectionHeader';
import UploadRow from '../src/components/UploadRow';
import { IMAGES } from '../src/assets';
import { colors, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/contexts/AuthContext';
import { updateProfile } from '../src/services/api';

type Uploads = {
  nationalId: string | null;
  selfie: string | null;
  certificate: string | null;
};

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
  const [uploads, setUploads] = useState<Uploads>({
    nationalId: null,
    selfie: null,
    certificate: null,
  });

  useEffect(() => {
    if (role !== 'fundi') router.replace('/role');
  }, [role, router]);

  const pickImage = async (key: keyof Uploads) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setUploads((prev) => ({ ...prev, [key]: result.assets[0].uri }));
    }
  };

  const handleSubmit = async () => {
    if (!uploads.nationalId) {
      Alert.alert('Required', 'Please upload your National ID.');
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
          verificationDocs: [uploads.nationalId, uploads.selfie, uploads.certificate].filter(Boolean),
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
          <UploadRow
            icon={<MaterialCommunityIcons name="card-account-details-outline" size={24} color={colors.primary} />}
            title="National ID *"
            subtitle="Front and back (clear photo)"
            imageUri={uploads.nationalId}
            onPress={() => pickImage('nationalId')}
          />
          <UploadRow
            icon={<Ionicons name="camera" size={24} color={colors.primary} />}
            title="Selfie"
            subtitle="Photo with your ID"
            imageUri={uploads.selfie}
            onPress={() => pickImage('selfie')}
          />
          <UploadRow
            icon={<MaterialCommunityIcons name="certificate-outline" size={24} color={colors.primary} />}
            title="Certificate"
            subtitle="Trade certificate or license"
            imageUri={uploads.certificate}
            onPress={() => pickImage('certificate')}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="Submit" onPress={handleSubmit} loading={loading} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: { height: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  backBtn: { position: 'absolute', left: spacing.xxl, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 85, height: 85 },
  body: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl, paddingTop: spacing.md },
  uploads: { gap: spacing.md },
  footer: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl },
});
