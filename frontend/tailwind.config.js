/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: '#0f6b5c',
        'accent-2': '#14b8a6',
        'accent-soft': '#e4f2ee',
      },
    },
  },
  plugins: [],
};
