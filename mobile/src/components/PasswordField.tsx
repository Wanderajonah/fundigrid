import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInputProps, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import InputField from './InputField';
import { colors, fonts, radius, spacing } from '../theme';
import { evaluatePassword } from '../services/passwordRules';

type Props = TextInputProps & {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  containerStyle?: ViewStyle;
  /** Live "8+ characters / uppercase / …" checklist under the input. */
  showRules?: boolean;
  /** Draw the checklist in a soft tinted card with a heading above it. */
  rulesCard?: boolean;
};

export default function PasswordField({
  label = 'Password',
  placeholder = 'Enter password',
  value,
  onChangeText,
  containerStyle,
  showRules,
  rulesCard,
  ...rest
}: Props) {
  const [hidden, setHidden] = useState(true);

  return (
    <View style={containerStyle}>
      <InputField
        label={label}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={hidden}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType={rest.textContentType ?? 'password'}
        right={
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={12} accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.muted} />
          </Pressable>
        }
        {...rest}
      />
      {showRules && (
        <View style={[styles.rules, rulesCard && styles.rulesCard]}>
          {rulesCard && <Text style={styles.rulesTitle}>Your password must have:</Text>}
          {evaluatePassword(value).map((rule) => (
            <View key={rule.key} style={styles.rule}>
              <Ionicons
                name={rule.ok ? 'checkmark-circle' : 'ellipse-outline'}
                size={14}
                color={rule.ok ? colors.success : colors.muted}
              />
              <Text style={[styles.ruleText, rule.ok && styles.ruleOk]}>{rule.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rules: { gap: 4, marginTop: spacing.sm },
  rulesCard: {
    backgroundColor: colors.primaryFaint,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: 6,
  },
  rulesTitle: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.ink },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  ruleOk: { color: colors.success },
});
