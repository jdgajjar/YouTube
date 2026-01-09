import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'yt-red': '#FF0000',
        'yt-black': '#0F0F0F',
        'yt-dark': '#181818',
        'yt-gray': '#272727',
        'yt-light-gray': '#3F3F3F',
        'yt-white': '#F1F1F1',
        'yt-text': '#AAAAAA',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
