import type { Config } from 'tailwindcss';
import tailwindAnimate from 'tailwindcss-animate';
import tailwindTypography from '@tailwindcss/typography';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    container: {
      center: true,
      padding: '2rem'
    },
    extend: {
      colors: {
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)'
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)'
        },
        epic: 'hsl(var(--epic) / <alpha-value>)',
        'epic-foreground': 'hsl(var(--epic-foreground) / <alpha-value>)',
        'epic-secondary': 'hsl(var(--epic-secondary) / <alpha-value>)',
        'epic-secondary-foreground': 'hsl(var(--epic-secondary-foreground) / <alpha-value>)',
        'epic-muted': 'hsl(var(--epic-muted) / <alpha-value>)',
        'epic-muted-foreground': 'hsl(var(--epic-muted-foreground) / <alpha-value>)',
        'epic-accent': 'hsl(var(--epic-accent) / <alpha-value>)',
        'epic-accent-foreground': 'hsl(var(--epic-accent-foreground) / <alpha-value>)',
        'surface-alt': 'hsl(var(--surface-alt) / <alpha-value>)'
      }
    }
  },
  plugins: [tailwindAnimate, tailwindTypography]
};

export default config;
