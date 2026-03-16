/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f4f6f1',
          100: '#e7ebdf',
          200: '#d1d8c3',
          300: '#b0bc9a',
          400: '#8b9a72',
          500: '#5f6f52',
          600: '#4f5e45',
          700: '#404d39',
          800: '#333f2f',
          900: '#283226',
        },
        sidebar: {
          dark: '#2f3b2f',
          light: '#3a473b',
        },
        background: {
          light: '#f3f4f1',
          DEFAULT: '#FFFFFF',
        },
      },
    },
  },
  plugins: [],
}
