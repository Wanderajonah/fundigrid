import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IMAGES } from '../../src/assets';
import { colors, fonts, spacing } from '../../src/theme';

export default function FundiMessagesScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Image source={IMAGES.logoLight} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.empty}>
        <View style={styles.iconWrap}>
          <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.muted} />
        </View>
        <Text style={styles.title}>No Messages Yet</Text>
        <Text style={styles.sub}>When you get messages from clients, they will appear here.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: {
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  logo: { width: 80, height: 48 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxxxl, gap: spacing.md },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.lightBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink, textAlign: 'center' },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
