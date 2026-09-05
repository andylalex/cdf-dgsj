/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    'G3-导购IM会话页.html',
    'U1-用户端IM会话页.html',
    'U2-购物袋.html'
  ],
  theme: {
    extend: {
      colors: {
        coral: {
          50:  '#fff5f5',
          100: '#ffe5e5',
          200: '#ffcccc',
          300: '#ffaaaa',
          400: '#ff7a7a',
          500: '#ff6b6b',
          600: '#e85d5d',
          700: '#d14949',
          800: '#b33b3b',
          900: '#8f2e2e'
        },
        brand: '#E02E24'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
