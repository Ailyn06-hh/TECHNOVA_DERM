import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        wine: {
          50: "#FAF0F5",
          100: "#F3DDE8",
          200: "#E6BCCE",
          300: "#D394B1",
          400: "#B8678F",
          500: "#9C4270",
          600: "#802B57",
          700: "#6B1F4A", // Color principal del panel izquierdo
          800: "#58183D",
          900: "#44122F",
          DEFAULT: "#6B1F4A",
        },
        cream: {
          50: "#FCFAF7",
          100: "#F8F5F0", // Fondo del panel derecho
          200: "#EFE9DE",
          300: "#E2D8C7",
        },
        nacar: {
          50: "#FAF7F5",
          100: "#F5EFEB",
          200: "#EADFD7",
          300: "#DBC8BC",
          400: "#C4A897",
          500: "#B08B74",
          600: "#98725C",
          700: "#7C5A47",
          800: "#634738",
          900: "#4D362B",
          dark: "#1A1715",
          accent: "#2A9D8F",
          warning: "#E76F51",
          gold: "#D4A373",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "DM Serif Display", "Fraunces", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
