import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"InterVariable"', 'system-ui', 'sans-serif']
      },
      colors: {
        surface: 'var(--color-surface)',
        background: 'var(--color-background)',
        primary: 'var(--color-primary)',
        muted: 'var(--color-muted)',
        accent: 'var(--color-accent)',
        border: 'var(--color-border)',
        danger: 'var(--color-danger)'
      },
      boxShadow: {
        floating: 'var(--shadow-floating)'
      },
      spacing: {
        18: '4.5rem'
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
        sm: 'var(--radius-sm)'
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'slide-in-from-top': {
          from: { transform: 'translateY(-0.5rem)' },
          to: { transform: 'translateY(0)' }
        },
        'slide-in-from-bottom': {
          from: { transform: 'translateY(0.5rem)' },
          to: { transform: 'translateY(0)' }
        }
      },
      animation: {
        'in': 'fade-in 180ms ease-out',
        'fade-in': 'fade-in 180ms ease-out',
        'slide-in-from-top-2': 'slide-in-from-top 180ms ease-out',
        'slide-in-from-bottom-2': 'slide-in-from-bottom 180ms ease-out'
      }
    }
  },
  plugins: []
};

export default config;
