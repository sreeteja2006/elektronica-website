const defaultTheme = require('tailwindcss/defaultTheme')

// Elektronica: dark, plain "bench" theme. Neutral graphite greys and ONE
// muted accent (signal teal, taken from the logo and toned down). No other hues.
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
          950: '#0b0d0e', // page
          900: '#101314',
          800: '#161a1c',
          700: '#1e2326',
          600: '#2a3034', // hairlines
          500: '#3b4348',
          400: '#7d878d', // muted text (5.4:1 on the page colour)
          300: '#a3acb1',
          200: '#c8cfd3', // body text
          100: '#e8ecee', // headings
        },
        signal: {
          300: '#8fd0d9',
          400: '#62b8c4', // the accent
          500: '#4a9ba7',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', ...defaultTheme.fontFamily.sans],
        mono: ['"IBM Plex Mono"', ...defaultTheme.fontFamily.mono],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
