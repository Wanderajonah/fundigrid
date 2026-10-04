import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList,
  Image,
  ImageSourcePropType,
  ImageStyle,
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
import { markWelcomeSeen } from '../src/services/welcome';
import { colors, fonts, spacing } from '../src/theme';

type Slide = {
  id: string;
  title: string;
  body: string;
  image: ImageSourcePropType;
  /** Smaller artwork box (still seated on the Skip row), e.g. '90%'. */
  mediaHeight?: `${number}%`;
  cta: string | null;
  showSkip: boolean;
};

const SLIDES: Slide[] = [
  {
    id: 'fundi',
    title: 'Get More Jobs,\nGrow Your Business',
    body: 'FundiGrid connects skilled artisans with customers who need reliable and professional services.',
    image: IMAGES.onboarding1,
    mediaHeight: '80%',
    cta: null,
    showSkip: true,
  },
  {
    id: 'client',
    title: 'Find Skilled Artisans\nNear You',
    body: 'Get trusted, verified and experienced fundis for all your home and business needs.',
    image: IMAGES.onboarding2,
    cta: null,
    showSkip: true,
  },
  {
    id: 'community',
    title: 'Crafting Stronger Communities',
    body: 'Connecting people, skills and opportunities for a better tomorrow.',
    image: IMAGES.onboarding3,
    cta: 'Get Started',
    showSkip: false,
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [listHeight, setListHeight] = useState(0);

  const proceed = async () => {
    await markWelcomeSeen();
    router.push('/location');
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const renderSlide = ({ item }: { item: Slide }) => {
    // Slides without a CTA give up the button gap so the artwork fills the
    // media box down to just above the Skip row (cover crops the overflow).
    // mediaHeight shrinks the box without moving its bottom edge up.
    const fillToSkip = !item.cta;
    const mediaBox: ImageStyle = !fillToSkip
      ? styles.mediaFull
      : {
          width: '100%',
          height: item.mediaHeight ?? '100%',
          // Shrunk artwork gets breathing room above the Skip row.
          marginBottom: item.mediaHeight ? spacing.lg : 0,
        };

    return (
      <View style={[styles.slide, { width, height: listHeight || undefined }]}>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />

        <Text style={styles.h1}>{item.title}</Text>
        <Text style={styles.sub}>{item.body}</Text>

        <View style={[styles.mediaBleed, fillToSkip && styles.mediaBleedSeated]}>
          <Image source={item.image} style={mediaBox} resizeMode={fillToSkip ? 'cover' : 'contain'} />
        </View>

        {item.cta ? (
          <PrimaryButton
            title={item.cta}
            onPress={proceed}
            trailingIcon={<Ionicons name="arrow-forward" size={18} color={colors.black} />}
            style={{ marginTop: spacing.xs }}
          />
        ) : null}

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
  mediaBleedSeated: { justifyContent: 'flex-end' },
  mediaFull: { width: '100%', height: '100%' },
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
