import { type ReactNode, type RefObject, useCallback, useMemo, useRef } from 'react';
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

import { FormScrollContext, type FormScrollApi } from '@/components/ui/FormScrollContext';

type Props = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  scrollRef?: RefObject<ScrollView | null>;
  /** Extra offset under a stack header (iOS). */
  keyboardVerticalOffset?: number;
} & Pick<ScrollViewProps, 'keyboardShouldPersistTaps'>;

/**
 * Scrollable form shell that keeps the focused field above the keyboard.
 * Works with Android `softwareKeyboardLayoutMode: 'resize'` + Expo Go.
 */
export function FormKeyboardScroll({
  children,
  contentContainerStyle,
  style,
  scrollRef: externalRef,
  keyboardVerticalOffset = Platform.OS === 'ios' ? 88 : 0,
  keyboardShouldPersistTaps = 'handled',
}: Props) {
  const insets = useSafeAreaInsets();
  const internalRef = useRef<ScrollView>(null);
  const scrollRef = externalRef ?? internalRef;

  const scrollToFocused = useCallback<FormScrollApi['scrollToFocused']>(
    (nativeTag) => {
      const scroll = scrollRef.current;
      if (nativeTag == null || !scroll) return;

      const run = () => {
        const responder = scroll.getScrollResponder?.() as
          | {
              scrollResponderScrollNativeHandleToKeyboard?: (
                n: number,
                offset: number,
                preventNegative?: boolean
              ) => void;
            }
          | undefined;
        if (responder?.scrollResponderScrollNativeHandleToKeyboard) {
          responder.scrollResponderScrollNativeHandleToKeyboard(nativeTag, 140, true);
          return;
        }
        scroll.scrollToEnd({ animated: true });
      };

      requestAnimationFrame(run);
      setTimeout(run, 120);
      setTimeout(run, 320);
    },
    [scrollRef]
  );

  const api = useMemo(() => ({ scrollToFocused }), [scrollToFocused]);

  return (
    <FormScrollContext.Provider value={api}>
      <KeyboardAvoidingView
        style={[styles.flex, style]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 24) + 96 },
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </FormScrollContext.Provider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, gap: 14 },
});
