import { type ReactNode, type RefObject } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  scrollRef?: RefObject<ScrollView | null>;
  /** Extra offset under a stack header (iOS). */
  keyboardVerticalOffset?: number;
} & Pick<ScrollViewProps, 'keyboardShouldPersistTaps'>;

/**
 * Non-sticky form shell: keyboard adjusts scroll so the focused field stays visible.
 * Put Save / action buttons inside the scroll — not a fixed footer.
 */
export function FormKeyboardScroll({
  children,
  contentContainerStyle,
  style,
  scrollRef,
  keyboardVerticalOffset = Platform.OS === 'ios' ? 64 : 0,
  keyboardShouldPersistTaps = 'handled',
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 32 },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, gap: 12 },
});
