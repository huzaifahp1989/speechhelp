import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
        fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-amiri)', 'serif'],
        indopak: ['var(--font-mushaf)', 'var(--font-noto-nastaliq)', 'var(--font-amiri)', 'serif'],
        mushaf: ['var(--font-mushaf)', 'var(--font-noto-nastaliq)', 'var(--font-amiri)', 'serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#0d4f4f',
          light: '#146356',
          dark: '#0a3d3d',
        },
        accent: {
          DEFAULT: '#c9a227',
          light: '#dbb84a',
        },
        parchment: {
          DEFAULT: '#faf6ef',
          dark: '#f0e8d8',
        },
        surface: '#fffef9',
      },
    },
  },
  plugins: [],
};

export default config;
