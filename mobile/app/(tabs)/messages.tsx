import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import EmptyState from '../../src/components/EmptyState';
import Screen from '../../src/components/Screen';
import { colors, spacing } from '../../src/theme';

export default function MessagesScreen() {
  return (
    <Screen bg={colors.white} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.h1}>Messages</Text>
      </View>
      <EmptyState title="No messages yet" message="Start a conversation with a Fundi after booking a service." icon="chatbubble-ellipses-outline" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg },
  h1: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: colors.ink },
});
