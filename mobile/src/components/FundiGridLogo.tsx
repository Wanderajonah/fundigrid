import React from 'react';
import { Text, View, ViewStyle } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors, fonts } from '../theme';

type Props = {
  size?: number;
  variant?: 'dark' | 'light';
  showText?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
  style?: ViewStyle;
};

export default function FundiGridLogo({
  size = 28,
  variant = 'light',
  showText = true,
  compact = false,
  iconOnly = false,
  style,
}: Props) {
  const iconSize = compact ? size * 0.85 : size;
  const textColor = variant === 'dark' ? colors.white : colors.ink;

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: compact ? 5 : 7 }, style]}>
      <View style={{ width: iconSize, height: iconSize }}>
        <Svg viewBox="0 0 48 48" width={iconSize} height={iconSize}>
          <Path
            d="M12 8h18v4H16v6h12v4H16v14h-4V8z"
            fill={variant === 'dark' ? colors.white : colors.ink}
          />
          <Path
            d="M28 12c5.5 0 10 4.5 10 10 0 6-10 18-10 18S18 28 18 22c0-5.5 4.5-10 10-10z"
            fill={colors.primary}
          />
          <Circle cx="28" cy="22" r="4" fill={variant === 'dark' ? colors.black : colors.white} />
          <Circle cx="28" cy="22" r="1.5" fill={colors.primary} />
        </Svg>
      </View>
      {showText && !iconOnly && (
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={{ fontSize: compact ? size * 0.65 : size * 0.78, fontFamily: fonts.extrabold, color: textColor, letterSpacing: -0.5 }}>Fundi</Text>
          <Text style={{ fontSize: compact ? size * 0.65 : size * 0.78, fontFamily: fonts.extrabold, color: colors.primary, letterSpacing: -0.5 }}>Grid</Text>
        </View>
      )}
    </View>
  );
}
