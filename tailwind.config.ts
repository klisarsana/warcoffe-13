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
        espresso: {
          50: "#faf6f3",
          100: "#f3ebe3",
          200: "#e5d3c5",
          300: "#d3b59f",
          400: "#bc9073",
          500: "#a97555",
          600: "#966046",
          700: "#7c4c3a",
          800: "#4a2c20",
          900: "#2c1810",
          950: "#1a0e09",
        },
        cream: {
          50: "#fdfbf7",
          100: "#f9f4eb",
          200: "#f2e8d5",
          300: "#e6d5b8",
        },
        caramel: {
          400: "#d4945a",
          500: "#c67d3b",
          600: "#ad6528",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
