import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  /** Convenience: email keyboard + autofill hints. */
  email?: boolean;
}

export function TextField({
  label,
  error,
  style,
  email,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  autoComplete,
  textContentType,
  inputMode,
  ...rest
}: Props) {
  const theme = useAppTheme();
  const [showSecret, setShowSecret] = useState(false);
  const isPassword = !!secureTextEntry;
  const isEmail =
    email ||
    keyboardType === 'email-address' ||
    inputMode === 'email' ||
    autoComplete === 'email';

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            isPassword && styles.inputWithToggle,
            {
              color: theme.text,
              backgroundColor: theme.surface,
              borderColor: error ? theme.danger : theme.border,
            },
            style,
          ]}
          secureTextEntry={isPassword && !showSecret}
          keyboardType={isEmail ? 'email-address' : keyboardType}
          autoCapitalize={isEmail ? 'none' : autoCapitalize}
          autoCorrect={isEmail ? false : autoCorrect}
          autoComplete={
            isEmail ? 'email' : (autoComplete ?? (isPassword ? 'password' : undefined))
          }
          textContentType={
            isEmail
              ? 'emailAddress'
              : (textContentType ?? (isPassword ? 'password' : undefined))
          }
          inputMode={isEmail ? 'email' : inputMode}
          importantForAutofill="yes"
          {...rest}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showSecret ? 'Hide password' : 'Show password'}
            hitSlop={8}
            onPress={() => setShowSecret((v) => !v)}
            style={styles.eyeBtn}
          >
            <Ionicons
              name={showSecret ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={theme.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  inputRow: { position: 'relative', justifyContent: 'center' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  inputWithToggle: { paddingRight: 48 },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: { fontSize: 12 },
});
