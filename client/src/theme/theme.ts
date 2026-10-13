/**
 * DocIn Design System & Theme Tokens
 * LinkedIn Light Theme Architecture + Google Minimalist Clean Aesthetics
 */

export const docInTheme = {
  colors: {
    // Canvas & Surfaces
    background: {
      canvas: '#F3F2EF',       // Standard LinkedIn feed background
      surface: '#FFFFFF',      // Pure Google White for cards
      subtle: '#F8FAFC',       // Clean cool slate for hover and input backgrounds
      hover: '#EBEBEB',        // LinkedIn classic hover gray
      active: '#E2E8F0',
    },
    // Primary LinkedIn Blue
    primary: {
      50: '#EBF5FF',
      100: '#E1EFFE',
      200: '#C3DDFD',
      500: '#0A66C2',          // Official LinkedIn Blue
      600: '#004182',          // Darker active blue
      700: '#083B66',
    },
    // Healthcare & Medical Trust Accents
    medical: {
      50: '#F0FDFA',
      100: '#CCFBF1',
      500: '#0D9488',          // Medical Teal Trust
      600: '#0F766E',
      700: '#115E59',
      badge: '#0D9488',
    },
    // Premium Gold Membership (Separate from Clinical Verified)
    gold: {
      badge: '#C59B27',
      bg: '#FEF9C3',
      text: '#854D0E',
      border: '#FDE047',
    },
    // Typography Grayscale (High accessibility contrast)
    text: {
      primary: 'rgba(0, 0, 0, 0.9)',    // 90% black
      secondary: 'rgba(0, 0, 0, 0.6)',  // 60% black
      tertiary: 'rgba(0, 0, 0, 0.4)',   // 40% black
      inverse: '#FFFFFF',
    },
    // Border tokens
    border: {
      subtle: 'rgba(0, 0, 0, 0.08)',    // Subtle card border
      default: '#E0E0E0',
      focus: '#0A66C2',
    },
  },
  typography: {
    fontSans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    fontHeading: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  },
  radius: {
    card: '8px',
    button: '9999px', // LinkedIn rounded pill buttons
    badge: '4px',
    input: '4px',
  },
  shadows: {
    card: '0 0 0 1px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
    elevated: '0 4px 12px rgba(0,0,0,0.12)',
    dropdown: '0 8px 24px rgba(0,0,0,0.15)',
  },
} as const;

export type DocInTheme = typeof docInTheme;
