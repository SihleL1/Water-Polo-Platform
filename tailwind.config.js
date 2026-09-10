/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  theme: {
    extend: {
      colors: {
        veldt: {
          green: '#234723',
          ochre: '#D8913B',
          'ochre-dark': '#B87B2E',

          background: '#F8F9FA',
          card: '#FFFFFF',

          border: '#E2E8F0',
          muted: '#64748B',
        },
      },

      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
      },
    },
  },

  plugins: [],
};

