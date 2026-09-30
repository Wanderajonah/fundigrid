import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../src/theme';
import { TERMS_BLOCKS, TermsBlock } from '../src/content/terms';

export default function TermsScreen() {
  const router = useRouter();

  const renderBlock = (block: TermsBlock, index: number) => {
    switch (block.kind) {
      case 'title':
        return (
          <Text key={index} style={styles.title}>
            {block.text}
          </Text>
        );
      case 'meta':
        return (
          <Text key={index} style={styles.meta}>
            {block.text}
          </Text>
        );
      case 'heading':
        return (
          <Text key={index} style={styles.heading}>
            {block.text}
          </Text>
        );
      case 'bullet':
        return (
          <View key={index} style={styles.row}>
            <Text style={styles.marker}>•</Text>
            <Text style={styles.item}>{block.text}</Text>
          </View>
        );
      case 'number':
        return (
          <View key={index} style={styles.row}>
            <Text style={styles.marker}>{block.n}.</Text>
            <Text style={styles.item}>{block.text}</Text>
          </View>
        );
      case 'checkbox':
        return (
          <View key={index} style={styles.row}>
            <Text style={styles.marker}>☐</Text>
            <Text style={styles.item}>{block.text}</Text>
          </View>
        );
      default:
        return (
          <Text key={index} style={styles.paragraph}>
            {block.text}
          </Text>
        );
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Terms &amp; Conditions</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {TERMS_BLOCKS.map(renderBlock)}
        <View style={styles.end} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  headerSpacer: { width: 30 },
  body: { paddingHorizontal: spacing.xxl, paddingTop: spacing.xl, paddingBottom: spacing.xxxxl, gap: spacing.sm },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink, lineHeight: 28, marginBottom: spacing.xs },
  meta: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, lineHeight: 19 },
  heading: {
    fontFamily: fonts.semibold,
    fontSize: 15.5,
    color: colors.ink,
    marginTop: spacing.lg,
    lineHeight: 22,
  },
  paragraph: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft, lineHeight: 22 },
  row: { flexDirection: 'row', gap: spacing.sm, paddingLeft: spacing.sm },
  marker: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary, width: 20, lineHeight: 22 },
  item: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft, lineHeight: 22 },
  end: { height: spacing.xxl },
});
