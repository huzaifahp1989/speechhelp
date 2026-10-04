import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
        fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-amiri)', 'Amiri', 'serif'],
        quran: ['var(--font-amiri)', 'Amiri', 'Noto Naskh Arabic', 'serif'],
        indopak: ['var(--font-mushaf)', 'var(--font-noto-nastaliq)', 'var(--font-amiri)', 'serif'],
        mushaf: ['var(--font-mushaf)', 'var(--font-noto-nastaliq)', 'var(--font-amiri)', 'serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#12336b',
          light: '#214f8d',
          dark: '#0b234a',
        },
        accent: {
          DEFAULT: '#48a4d8',
          light: '#75bee5',
        },
        parchment: {
          DEFAULT: '#f2f7fd',
          dark: '#e6eff9',
        },
        surface: '#ffffff',
      },
    },
  },
  plugins: [],
};

export default config;
