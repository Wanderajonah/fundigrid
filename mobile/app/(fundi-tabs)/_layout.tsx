import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../src/theme';

export default function FundiTabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.ink,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 10, marginTop: 0 },
        tabBarItemStyle: { paddingVertical: 0 },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 3,
          height: 58 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 3),
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, size }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={colors.olive} />,
        }}
      />
      <Tabs.Screen
        name="nearby-jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ focused, size }) => <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={size} color={colors.olive} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused, size }) => <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={size} color={colors.olive} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, size }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={colors.olive} />,
        }}
      />
    </Tabs>
  );
}
