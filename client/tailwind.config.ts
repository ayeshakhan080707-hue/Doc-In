import type { Config } from 'tailwindcss';
import { docInTheme } from './src/theme/theme';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: docInTheme.colors.background.canvas,
        surface: docInTheme.colors.background.surface,
        'surface-subtle': docInTheme.colors.background.subtle,
        'surface-hover': docInTheme.colors.background.hover,
        primary: docInTheme.colors.primary,
        medical: docInTheme.colors.medical,
        gold: docInTheme.colors.gold,
        'text-main': docInTheme.colors.text.primary,
        'text-muted': docInTheme.colors.text.secondary,
        'border-subtle': docInTheme.colors.border.subtle,
      },
      boxShadow: {
        card: docInTheme.shadows.card,
        elevated: docInTheme.shadows.elevated,
      },
      borderRadius: {
        card: docInTheme.radius.card,
        pill: docInTheme.radius.button,
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.18s ease-out both',
        slideUp: 'slideUp 0.22s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config;
