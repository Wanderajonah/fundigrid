import { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  primary: '#F5A623',
  primaryDark: '#E08E0B',
  primarySoft: '#FEF1DC',
  primaryFaint: '#FFF8EC',
  brightOrange: '#FFAA1F',

  black: '#0D0D0D',
  darkBlack: '#111111',
  white: '#FFFFFF',
  offWhite: '#F7F7F7',
  lightBg: '#FAFAFA',
  border: '#E5E7EB',

  ink: '#111111',
  inkSoft: '#6B7280',
  muted: '#9CA3AF',
  line: '#E5E7EB',
  surface: '#F6F7F8',
  olive: '#322C25',

  success: '#20B26B',
  successSoft: '#E7F4EE',
  danger: '#D64545',
  dangerSoft: '#FEE7E7',
  warning: '#F5A623',
  blue: '#2F80ED',
  star: '#F5A623',
};

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
  xxxxxl: 48,
  xxxxxxl: 56,
};

export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extrabold: 'Poppins_800ExtraBold',
};

type TypeKey =
  | 'hero'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'bodyStrong'
  | 'small'
  | 'tiny'
  | 'label'
  | 'caption'
  | 'button'
  | 'price'
  | 'nav';

export const type: Record<TypeKey, TextStyle> = {
  hero: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 38, color: colors.ink },
  h1: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 30, color: colors.ink },
  h2: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 26, color: colors.ink },
  h3: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink },
  h4: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.inkSoft },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.ink },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  tiny: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 15, color: colors.muted },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.ink },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.muted },
  button: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.ink },
  price: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.ink },
  nav: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, color: colors.muted },
};

export const shadow: ViewStyle = {
  shadowColor: '#1A1A1A',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 4,
};

export const shadowSoft: ViewStyle = {
  shadowColor: '#1A1A1A',
  shadowOpacity: 0.05,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

export const shadowSm: ViewStyle = {
  shadowColor: '#1A1A1A',
  shadowOpacity: 0.04,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
};
