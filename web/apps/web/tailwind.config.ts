/**
 * Tailwind config — все токены из docs/design.md.
 * Никаких хардкодов цвета/тени/скругления вне этого файла.
 */
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#FFF4ED',
          100: '#FFE6D5',
          200: '#FFC9A8',
          300: '#FF9F70',
          400: '#FF7A3D',
          500: '#FF6B35',
          600: '#ED5320',
          700: '#C53D17',
          800: '#9C3215',
          900: '#7E2C16',
        },
        accent: {
          400: '#FFD23F',
          500: '#F5B800',
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger:  '#EF4444',
        surface: {
          base:    'var(--surface-base)',
          raised:  'var(--surface-raised)',
          sunken:  'var(--surface-sunken)',
          overlay: 'rgba(15, 23, 42, 0.6)',
        },
        ink: {
          900: 'var(--ink-900)',
          700: 'var(--ink-700)',
          500: 'var(--ink-500)',
          300: 'var(--ink-300)',
          100: 'var(--ink-100)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['3rem',     { lineHeight: '3.5rem',  fontWeight: '800', letterSpacing: '-0.025em' }],
        h1:      ['2rem',     { lineHeight: '2.5rem',  fontWeight: '700', letterSpacing: '-0.02em' }],
        h2:      ['1.5rem',   { lineHeight: '2rem',    fontWeight: '700', letterSpacing: '-0.015em' }],
        h3:      ['1.25rem',  { lineHeight: '1.75rem', fontWeight: '600', letterSpacing: '-0.01em' }],
        body:    ['1rem',     { lineHeight: '1.5rem',  fontWeight: '400' }],
        caption: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        micro:   ['0.75rem',  { lineHeight: '1rem',    fontWeight: '500', letterSpacing: '0.01em' }],
      },
      borderRadius: {
        md:     '8px',
        lg:     '12px',
        xl:     '16px',
        '2xl':  '20px',
        '3xl':  '28px',
      },
      boxShadow: {
        soft:  '0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.06)',
        pop:   '0 4px 8px rgba(15,23,42,0.08), 0 12px 32px rgba(15,23,42,0.12)',
        glow:  '0 8px 24px rgba(255,107,53,0.35)',
        sheet: '0 -8px 32px rgba(15,23,42,0.16)',
      },
      keyframes: {
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer:      'shimmer 1.6s linear infinite',
        'fade-in-up': 'fade-in-up 240ms cubic-bezier(0.22,1,0.36,1) both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
