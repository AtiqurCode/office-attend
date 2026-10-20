import { createContext, useContext } from 'react';

export type FormScrollApi = {
  /** Scroll so the focused native input sits above the keyboard. */
  scrollToFocused: (nativeTag: number | null) => void;
};

export const FormScrollContext = createContext<FormScrollApi | null>(null);

export function useFormScroll(): FormScrollApi | null {
  return useContext(FormScrollContext);
}
