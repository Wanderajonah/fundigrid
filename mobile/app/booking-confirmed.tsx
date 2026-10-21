import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NavigationBar } from 'expo-navigation-bar';

import PrimaryButton from '../src/components/PrimaryButton';
import { colors, fonts, radius, spacing } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BookingConfirmedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    bookingId?: string;
    fundiName?: string;
    category?: string;
    date?: string;
    time?: string;
  }>();

  const fundiName = params.fundiName ? String(params.fundiName) : 'your fundi';
  const category = params.category ? String(params.category) : 'Service';
  const date = params.date ? String(params.date) : '';
  const time = params.time ? String(params.time) : '';
  const bookingId = params.bookingId ? String(params.bookingId) : '';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <NavigationBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor={colors.darkBlack} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
        </View>
        <Text style={styles.h1}>Request Sent!</Text>
        <Text style={styles.sub}>
          Your {category} request is with {fundiName}. They quote the price after seeing the site — you
          accept before any work starts.
        </Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Service</Text>
            <Text style={styles.value}>{category}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Fundi</Text>
            <Text style={styles.value}>{fundiName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{date || 'As soon as possible'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Time</Text>
            <Text style={styles.value}>{time || 'Flexible'}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {bookingId ? (
          <PrimaryButton
            title="Track Request"
            onPress={() => router.push({ pathname: '/request-status', params: { bookingId } })}
          />
        ) : null}
        <PrimaryButton title="View Details" variant="secondary" onPress={() => router.push('/(tabs)/jobs')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.darkBlack },
  body: { alignItems: 'center', paddingHorizontal: spacing.xxl, gap: spacing.lg, paddingTop: spacing.xxxxl, paddingBottom: spacing.xl },
  iconWrap: { marginBottom: spacing.md },
  h1: { fontFamily: fonts.bold, fontSize: 24, color: colors.white, textAlign: 'center' },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center' },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.lg,
    padding: spacing.xxl,
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg },
  label: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  value: { fontFamily: fonts.medium, fontSize: 14, color: colors.white, flexShrink: 1, textAlign: 'right' },
  footer: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxxl, gap: spacing.md },
});
