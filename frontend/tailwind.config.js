/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8edf4',
          100: '#c5d1e3',
          200: '#9fb3d0',
          300: '#7995bd',
          400: '#5c7eae',
          500: '#1e3a5f',
          600: '#1b3556',
          700: '#162c49',
          800: '#11233b',
          900: '#0b1728',
        },
        accent: {
          50: '#fff8e1',
          100: '#ffecb3',
          200: '#ffe082',
          300: '#ffd54f',
          400: '#ffca28',
          500: '#f59e0b',
          600: '#f59e0b',
          700: '#d48806',
          800: '#b87305',
          900: '#8c5803',
        },
      },
    },
  },
  plugins: [],
};
