/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    'index.html',
    'G1-工作台.html',
    'G2-消息会话列表.html',
    'G4-推荐商品页.html',
    'G8-移动端业绩管理.html',
    'M3-PC业绩管理.html',
    'M4-消息管理.html'
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
