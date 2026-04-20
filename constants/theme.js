/**
 * Hisab Design System — Theme Constants
 */

export const Colors = {
  // Primary palette
  primary: '#6C63FF',
  primaryDark: '#5A52D5',
  primaryLight: '#8B83FF',
  primaryGhost: 'rgba(108, 99, 255, 0.08)',

  // Accent
  accent: '#FF6B6B',
  accentLight: '#FF8E8E',
  success: '#2ED573',
  successLight: 'rgba(46, 213, 115, 0.1)',
  successBg: 'rgba(46, 213, 115, 0.12)',
  warning: '#FFA502',
  warningLight: 'rgba(255, 165, 2, 0.1)',
  danger: '#FF4757',
  dangerLight: 'rgba(255, 71, 87, 0.1)',

  // Neutrals
  background: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceLight: '#242440',
  card: '#16213E',
  border: '#2A2A4A',
  borderLight: '#3A3A5A',

  // Text
  text: '#EAEAEA',
  textSecondary: '#A0A0B0',
  textMuted: '#6B6B80',
  textInverse: '#0F0F1A',

  // Credit / Debit colors
  credit: '#FF6B6B',
  creditBg: 'rgba(255, 107, 107, 0.1)',
  debit: '#2ED573',
  debitBg: 'rgba(46, 213, 115, 0.1)',

  white: '#FFFFFF',
  black: '#000000',
};

export const Fonts = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    hero: 36,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  button: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
};
