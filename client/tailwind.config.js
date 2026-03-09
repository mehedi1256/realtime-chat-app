/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  darkMode: 'class',
  theme: {
    screens: {
      xs: '320px',
      sm: '481px',
      md: '768px',
      lg: '1025px',
      xl: '1441px',
      '2xl': '1536px',
    },
    extend: {
      fontSize: {
        'fluid-xs': ['0.75rem', { lineHeight: '1rem' }],
        'fluid-sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'fluid-base': ['1rem', { lineHeight: '1.5rem' }],
        'fluid-lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'fluid-xl': ['1.25rem', { lineHeight: '1.75rem' }],
        'fluid-2xl': ['1.5rem', { lineHeight: '2rem' }],
      },
      spacing: {
        'touch': '44px',
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        chat: {
          bg: '#e5ddd5',
          'bg-dark': '#0b141a',
          sender: '#dcf8c6',
          'sender-dark': '#005c4b',
          receiver: '#ffffff',
          'receiver-dark': '#202c33',
          sidebar: '#f0f2f5',
          'sidebar-dark': '#111b21',
          header: '#008069',
          'header-dark': '#202c33',
          input: '#f0f2f5',
          'input-dark': '#2a3942',
        },
      },
    },
  },
  plugins: [],
};
