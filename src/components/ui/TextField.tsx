import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  findNodeHandle,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { useFormScroll } from '@/components/ui/FormScrollContext';
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
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const theme = useAppTheme();
  const formScroll = useFormScroll();
  const inputRef = useRef<TextInput>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [focused, setFocused] = useState(false);
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
          ref={inputRef}
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            isPassword && styles.inputWithToggle,
            {
              color: theme.text,
              backgroundColor: theme.surface,
              borderColor: error
                ? theme.danger
                : focused
                  ? theme.brand
                  : theme.border,
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
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
            const tag = findNodeHandle(inputRef.current);
            formScroll?.scrollToFocused(tag);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
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
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  inputRow: { position: 'relative', justifyContent: 'center' },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  inputWithToggle: { paddingRight: 48 },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: { fontSize: 12 },
});
