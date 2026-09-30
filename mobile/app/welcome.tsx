import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import PrimaryButton from '../src/components/PrimaryButton';
import { IMAGES } from '../src/assets';
import { colors, fonts, spacing } from '../src/theme';

type Feature = { icon: keyof typeof Ionicons.glyphMap; label: string };

type Slide = {
  id: string;
  title: string;
  body: string;
  image: ImageSourcePropType;
  features: Feature[];
  cta: string | null;
  showSkip: boolean;
};

const SLIDES: Slide[] = [
  {
    id: 'fundi',
    title: 'Get More Jobs,\nGrow Your Business',
    body: 'FundiGrid connects skilled artisans with customers who need reliable and professional services.',
    image: IMAGES.welcome1,
    features: [
      { icon: 'location-outline', label: 'Find nearby Jobs' },
      { icon: 'cash-outline', label: 'Get fair\n pay' },
      { icon: 'star-outline', label: 'Grow your reputation' },
    ],
    cta: null,
    showSkip: true,
  },
  {
    id: 'client',
    title: 'Find Skilled Artisans\nNear You',
    body: 'Get trusted, verified and experienced fundis for all your home and business needs.',
    image: IMAGES.welcome2,
    features: [
      { icon: 'shield-checkmark-outline', label: 'Verified\nFundis' },
      { icon: 'star-outline', label: 'Real\nReviews' },
      { icon: 'lock-closed-outline', label: 'Secure\nPayments' },
    ],
    cta: null,
    showSkip: true,
  },
  {
    id: 'community',
    title: 'Crafting Stronger Communities',
    body: 'Connecting people, skills and opportunities for a better tomorrow.',
    image: IMAGES.welcome3,
    features: [
      { icon: 'people-outline', label: 'Skilled\nArtisans' },
      { icon: 'location-outline', label: 'Local\nService' },
      { icon: 'shield-checkmark-outline', label: 'Trusted\n& Verified' },
    ],
    cta: 'Get Started',
    showSkip: false,
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [listHeight, setListHeight] = useState(0);

  const proceed = () => {
    router.push('/location');
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const renderFeatureBadge = (feature: Feature) => (
    <View style={styles.badge}>
      <Ionicons name={feature.icon} size={20} color={colors.primary} />
    </View>
  );

  const renderSlide = ({ item }: { item: Slide }) => {
    return (
      <View style={[styles.slide, { width, height: listHeight || undefined }]}>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />

        <Text style={styles.h1}>{item.title}</Text>
        <Text style={styles.sub}>{item.body}</Text>

        <View style={styles.mediaBleed}>
          <Image source={item.image} style={styles.mediaFull} resizeMode="contain" />
        </View>

        <View style={styles.featureRow}>
          {item.features.map((f) => (
            <View key={f.label} style={styles.featureCell}>
              {renderFeatureBadge(f)}
              <Text style={styles.featureCellText}>{f.label}</Text>
            </View>
          ))}
        </View>

        {item.cta ? (
          <PrimaryButton
            title={item.cta}
            onPress={proceed}
            trailingIcon={<Ionicons name="arrow-forward" size={18} color={colors.black} />}
            style={{ marginTop: spacing.xs }}
          />
        ) : (
          <View style={styles.ctaSpacer} />
        )}

        {item.showSkip ? (
          <Pressable onPress={() => proceed()} hitSlop={10} style={styles.skipWrap}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        ) : (
          <View style={styles.skipWrap} />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <FlatList
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
        style={styles.list}
        contentContainerStyle={{ flexGrow: 1 }}
      />

      <View style={styles.footer}>
        {SLIDES.map((slide, i) => (
          <View key={slide.id} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  list: { flex: 1 },
  slide: { flex: 1, paddingHorizontal: spacing.xxl, paddingBottom: spacing.sm },
  logo: { width: 110, height: 40, alignSelf: 'center', marginTop: spacing.xs },
  h1: {
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 33,
    color: colors.ink,
    marginTop: spacing.sm,
    letterSpacing: -0.5,
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkSoft,
    marginTop: spacing.xs,
  },
  mediaBleed: {
    flex: 1,
    marginHorizontal: -spacing.xxl,
    marginBottom: spacing.xs,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mediaFull: { width: '100%', height: '100%' },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.md,
    zIndex: 1,
  },
  featureCell: { width: '28%', alignItems: 'center', gap: 4 },
  featureCellText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 15,
    color: colors.ink,
    textAlign: 'center',
  },
  ctaSpacer: { height: 50, marginTop: spacing.xs },
  skipWrap: { height: 36, alignItems: 'center', justifyContent: 'center' },
  skip: { fontFamily: fonts.medium, fontSize: 15, color: colors.inkSoft },
  footer: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
});
