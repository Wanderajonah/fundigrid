import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import PrimaryButton from '../src/components/PrimaryButton';
import Screen from '../src/components/Screen';
import { IMAGES } from '../src/assets';
import { colors, fonts, radius, spacing, shadowSoft } from '../src/theme';

// Support details live here so they can be filled in without touching the UI.
const SUPPORT_PHONE = '';
const SUPPORT_EMAIL = '';

const FAQ = [
  {
    q: 'How do I request a job?',
    a: 'Tap Request a Job, choose the service you need, add your location and a short description, then send. Fundis who cover that trade and are close to you receive the request straight away.',
  },
  {
    q: 'How is a fundi picked for me?',
    a: 'We rank fundis by category match, distance and rating, so the list you see is already filtered to people who can actually take the job.',
  },
  {
    q: 'How do I follow the work?',
    a: 'Open the job from your Requests. The timeline updates live — Accepted, On the way, Arrived, In progress — and your fundi shares their location on the map while they travel.',
  },
  {
    q: 'How do I talk to my fundi?',
    a: 'Use the Messages tab to chat with the fundi handling your job. Everything for that job stays in one thread.',
  },
  {
    q: 'Can I change my phone number?',
    a: 'Yes. Go to Profile → Settings → Change Number. We send a fresh OTP to confirm the new number, then sign you back in.',
  },
  {
    q: 'Why does my location matter?',
    a: 'Distance is one of the things we sort by, so a current location gets you fundis who can reach you. Update it any time from Profile → Service Radius.',
  },
];

export default function SupportScreen() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleCall = async () => {
    if (!SUPPORT_PHONE) {
      Alert.alert('Not available yet', 'The support number has not been added to the app yet.');
      return;
    }
    try {
      await Linking.openURL(`tel:${SUPPORT_PHONE}`);
    } catch {
      Alert.alert('Unable to call', 'There is no dialler available on this device.');
    }
  };

  const handleEmail = async () => {
    if (!SUPPORT_EMAIL) {
      Alert.alert('Not available yet', 'The support email has not been added to the app yet.');
      return;
    }
    try {
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Help%20with%20FundiGrid`);
    } catch {
      Alert.alert('Unable to open email', 'There is no email app available on this device.');
    }
  };

  return (
    <Screen bg={colors.white} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Help & Support</Text>
        <Text style={styles.sub}>Answers to the questions we get most.</Text>

        <View style={styles.group}>
          {FAQ.map((item, i) => (
            <View key={item.q} style={i > 0 ? styles.faqDivider : undefined}>
              <Pressable
                onPress={() => setOpenIndex(openIndex === i ? null : i)}
                style={({ pressed }) => [styles.faqQ, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.faqQText}>{item.q}</Text>
                <Ionicons name={openIndex === i ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
              </Pressable>
              {openIndex === i && <Text style={styles.faqA}>{item.a}</Text>}
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Still need help?</Text>
        <View style={styles.contact}>
          <PrimaryButton
            variant="secondary"
            title="Call support"
            onPress={handleCall}
            icon={<Ionicons name="call-outline" size={18} color={colors.ink} />}
          />
          <PrimaryButton
            variant="secondary"
            title="Email support"
            onPress={handleEmail}
            icon={<Ionicons name="mail-outline" size={18} color={colors.ink} />}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { height: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  backBtn: { position: 'absolute', left: spacing.xxl, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 85, height: 85 },
  body: { paddingHorizontal: spacing.xxl, paddingTop: spacing.md, paddingBottom: spacing.xxxxl, gap: spacing.lg },
  h1: { fontFamily: fonts.bold, fontSize: 24, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft, marginTop: -spacing.sm },
  group: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    ...shadowSoft,
  },
  faqDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  faqQ: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 16, minHeight: 56 },
  faqQText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  faqA: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.inkSoft, paddingBottom: 16 },
  sectionLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted, marginTop: spacing.sm },
  contact: { gap: spacing.md },
});
