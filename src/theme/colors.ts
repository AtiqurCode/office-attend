/**
 * Office Attend palette — workplace kiosk, not SaaS-dashboard green.
 * Forest ink + warm paper. Avoid purple gradients / cream-terracotta tropes.
 */
export const Palette = {
  brand: '#1F5C45',
  brandDark: '#143D2E',
  brandSoft: '#E2EDE7',
  accent: '#9A4D1C',
  accentSoft: '#F3E8DF',
  warning: '#8A5A00',
  danger: '#9B2C2C',
  dangerSoft: '#F8E8E8',
  info: '#1F4E79',
  infoSoft: '#E4EEF6',
  neutral0: '#FFFEFC',
  neutral50: '#F3F1EC',
  neutral100: '#E7E4DC',
  neutral200: '#CFCBC0',
  neutral500: '#5C5A54',
  neutral700: '#2F2E2A',
  neutral900: '#1A1916',
  darkBg: '#141613',
  darkSurface: '#1E221F',
  darkBorder: '#323832',
} as const;

export const LightTheme = {
  background: Palette.neutral50,
  surface: Palette.neutral0,
  surfaceMuted: Palette.neutral100,
  text: Palette.neutral900,
  textSecondary: Palette.neutral500,
  border: Palette.neutral200,
  brand: Palette.brand,
  brandSoft: Palette.brandSoft,
  accent: Palette.accent,
  accentSoft: Palette.accentSoft,
  danger: Palette.danger,
  dangerSoft: Palette.dangerSoft,
  warning: Palette.warning,
  info: Palette.info,
  infoSoft: Palette.infoSoft,
  success: Palette.brand,
  overlay: 'rgba(26, 25, 22, 0.45)',
} as const;

export const DarkTheme = {
  background: Palette.darkBg,
  surface: Palette.darkSurface,
  surfaceMuted: Palette.darkBorder,
  text: '#F4F2EC',
  textSecondary: '#A8A59C',
  border: Palette.darkBorder,
  brand: '#6FBF9A',
  brandSoft: '#1A3328',
  accent: '#D08955',
  accentSoft: '#3A2818',
  danger: '#E07A7A',
  dangerSoft: '#3A1C1C',
  warning: '#E0B45A',
  info: '#8CB4D9',
  infoSoft: '#1A2A38',
  success: '#6FBF9A',
  overlay: 'rgba(0, 0, 0, 0.55)',
} as const;

export type AppTheme = typeof LightTheme;
