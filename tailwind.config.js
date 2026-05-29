/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          background: '#1A1A1A',
          card: '#2C2C2C',
          outgoing: '#34C759',
          incoming: '#3A3A3A',
          text: '#F5F5F5',
          muted: '#A3A3A3',
        },
      },
    },
  },
  plugins: [],
};
