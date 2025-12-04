/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary palette - Tech Blue theme
        primary: {
          50: '#D2E4FA',
          100: '#A5C9F5',
          200: '#78AEF0',
          300: '#4A93EB',
          400: '#1D78E6',
          500: '#1560BD', // Main primary
          600: '#11509D',
          700: '#0E407D',
          800: '#0A305E',
          900: '#07203F',
        },
        // Accent palette - Smart Blue
        accent: {
          50: '#DAE5F7',
          100: '#B6CBEE',
          200: '#91B1E6',
          300: '#6C98DE',
          400: '#477ED5',
          500: '#2D68C4', // Main accent
          600: '#2555A3',
          700: '#1E4482',
          800: '#163362',
          900: '#0F2241',
        },
        // Success, warning, error (keep existing)
        success: {
          50: '#ECFDF5',
          500: '#4ade80',
          600: '#22c55e',
          700: '#16a34a',
        },
        warning: {
          50: '#FFFBEB',
          500: '#fbbf24',
          600: '#f59e0b',
          700: '#d97706',
        },
        error: {
          50: '#FEF2F2',
          500: '#f87171',
          600: '#ef4444',
          700: '#dc2626',
        },
        // Neutral palette - Cool Steel inspired
        neutral: {
          50: '#F8FAFB',
          100: '#EDF0F2',
          200: '#DBE0E5',
          300: '#C8D1D7',
          400: '#B6C2CA',
          500: '#91A3B0',
          600: '#728999',
          700: '#5A6E7C',
          800: '#43525D',
          900: '#2D373E',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['Source Sans 3', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        'sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        'base': ['1rem', { lineHeight: '1.6', letterSpacing: '0' }],
        'lg': ['1.125rem', { lineHeight: '1.6', letterSpacing: '-0.01em' }],
        'xl': ['1.25rem', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        '2xl': ['1.5rem', { lineHeight: '1.4', letterSpacing: '-0.02em' }],
        '3xl': ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.02em' }],
        '4xl': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.03em' }],
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'strong': '0 8px 24px rgba(0, 0, 0, 0.16)',
        'glow': '0 0 20px rgba(21, 96, 189, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(5px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}