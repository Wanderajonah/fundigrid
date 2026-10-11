import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fonts, spacing } from '../theme';

// Footnote under the sign-up / sign-in forms.
export default function LegalFooter() {
  const router = useRouter();
  const openLegal = () => router.push('/terms');

  return (
    <Text style={styles.text}>
      By continuing, you agree to our{'\n'}
      <Text style={styles.link} onPress={openLegal} suppressHighlighting>
        Terms &amp; Conditions
      </Text>
      {'\n'}
      and{' '}
      <Text style={styles.link} onPress={openLegal} suppressHighlighting>
        Privacy Policy
      </Text>
      .
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 15,
    includeFontPadding: false,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: 'auto',
    paddingTop: spacing.lg,
    paddingBottom: 0,
  },
  link: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primary,
  },
});
