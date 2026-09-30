import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

type Props = {
  children: React.ReactNode;
  bg?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  style?: ViewStyle;
};

export default function Screen({ children, bg = colors.white, edges = ['top', 'bottom'], style }: Props) {
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bg }, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
