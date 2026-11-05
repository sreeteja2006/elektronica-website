const defaultTheme = require('tailwindcss/defaultTheme')

// Elektronica: warm near-black "bench at night" theme with ONE accent,
// solder orange. Type is Instrument Serif (display) + Instrument Sans (text).
// There is no monospace anywhere on purpose.
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
          950: '#0d0b09', // page
          900: '#131110',
          800: '#1a1815',
          700: '#23201c',
          600: '#2f2b26', // hairlines
          500: '#4a443c',
          400: '#8c8478', // muted text (5.3:1 on the page colour)
          300: '#b3ab9e',
          200: '#d4cec3', // body text
          100: '#f1ece2', // headings, "paper"
        },
        solder: {
          300: '#ffb066',
          400: '#f08a2a', // the accent
          500: '#cf6f12',
        },
      },
      fontFamily: {
        sans: ['"Instrument Sans"', ...defaultTheme.fontFamily.sans],
        serif: ['"Instrument Serif"', '"Times New Roman"', ...defaultTheme.fontFamily.serif],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
