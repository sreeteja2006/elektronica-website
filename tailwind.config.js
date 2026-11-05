const defaultTheme = require('tailwindcss/defaultTheme')

// Elektronica: dark "bench" theme. The logo's LED-cyan is the brand colour,
// phosphor green is for live signals, copper/amber is for highlights.
module.exports = {
  content: [
    './layouts/**/*.html',
    './content/**/*.md',
    './assets/js/**/*.js',
    '!./assets/js/vendor/**',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#04070b',
          900: '#070c12',
          800: '#0c141c',
          700: '#121d28',
          600: '#1b2a38',
          500: '#2a3d4f',
          400: '#4a6178',
          300: '#7890a6',
        },
        volt: {
          300: '#7df3ff',
          400: '#3de6ff',
          500: '#14c8e6',
          600: '#0aa3bf',
        },
        phos: {
          300: '#8dffb9',
          400: '#3dff8f',
          500: '#1fd96f',
        },
        copper: {
          300: '#ffd37a',
          400: '#ffb020',
          500: '#e8930c',
        },
      },
      fontFamily: {
        sans: ['"Space Grotesk"', ...defaultTheme.fontFamily.sans],
        mono: ['"JetBrains Mono"', ...defaultTheme.fontFamily.mono],
      },
      keyframes: {
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
      },
      animation: {
        blink: 'blink 1.1s steps(1) infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
