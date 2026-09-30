export const COLORS = {
  primary: '#F5A623',
  primaryDark: '#E08E0B',
  primarySoft: '#FEF1DC',
  primaryFaint: '#FFF8EC',
  orange: '#FFAA1F',

  black: '#0D0D0D',
  darkBlack: '#111111',
  white: '#FFFFFF',
  offWhite: '#F7F7F7',
  lightBg: '#FAFAFA',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  ink: '#111111',
  inkSoft: '#6B7280',
  muted: '#9CA3AF',

  success: '#20B26B',
  successSoft: '#E7F4EE',
  danger: '#D64545',
  dangerSoft: '#FEE7E7',
  warning: '#F5A623',
  blue: '#2F80ED',
} as const;

export const SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24,
  xxxl: 32, xxxxl: 40, xxxxxl: 48,
} as const;

export const RADIUS = {
  xs: 6, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999,
} as const;

export const BREAKPOINTS = {
  sm: 640, md: 768, lg: 1024, xl: 1280, xxl: 1440,
} as const;
