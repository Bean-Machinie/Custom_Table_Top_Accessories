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
      }
    }
  },
  plugins: []
};

export default config;
