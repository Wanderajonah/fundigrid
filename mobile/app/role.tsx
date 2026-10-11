import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { IMAGES } from '../src/assets';
import { colors, fonts, radius, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

type Card = {
  icon: React.ReactNode;
  title: string;
  sub: string;
  bg: string;
  role: 'client' | 'fundi';
};

const CARDS: Card[] = [
  {
    icon: <MaterialCommunityIcons name="hammer-wrench" size={26} color={colors.primary} />,
    title: 'Find a Fundi',
    sub: 'Get skilled artisans for your home or business',
    bg: colors.primarySoft,
    role: 'client',
  },
  {
    icon: <MaterialCommunityIcons name="account-hard-hat" size={26} color={colors.primary} />,
    title: 'I am a Fundi',
    sub: 'Offer your services to clients',
    bg: colors.primarySoft,
    role: 'fundi',
  },
];

export default function RoleScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.body}>
        <Text style={styles.h1}>What do you need?</Text>
        <Text style={styles.sub}>Choose what you want to do</Text>

        <View style={styles.cards}>
          {CARDS.map((c) => (
            <Pressable
              key={c.title}
              onPress={() => router.push({ pathname: '/phone', params: { role: c.role } })}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: c.bg }]}>
                {c.icon}
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardSub}>{c.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </View>

      <Image source={IMAGES.skyline} style={styles.skyline} resizeMode="cover" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: { height: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  logo: { width: 85, height: 85 },
  body: { flex: 1, paddingHorizontal: spacing.xxl },
  h1: { fontFamily: fonts.bold, fontSize: 24, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft, marginTop: 4 },
  cards: { marginTop: spacing.xxl, gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  iconWrap: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, gap: 2 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  cardSub: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted },
  skyline: { width: '100%', height: 90, opacity: 0.3 },
});
