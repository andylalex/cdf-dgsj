/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    'index.html',
    'G1.html',
    'G2.html',
    'G4.html',
    'G8.html',
    'M3.html',
    'M4.html'
  ],
  theme: {
    extend: {
      colors: {
        coral: {
          50:  '#fff5f2',
          100: '#ffe6e0',
          200: '#ffd0c5',
          300: '#ffb0a0',
          400: '#ff8a75',
          500: '#ff6b52',
          600: '#ff5a42',
          700: '#e64e39',
          800: '#bf3f2e',
          900: '#9c3628'
        }
      },
      fontFamily: {
        sans: ['Noto Sans SC', 'sans-serif']
      }
    }
  },
  plugins: []
};
