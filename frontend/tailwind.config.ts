import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#d73672", // Magenta
        secondary: "#f5b64d", // Light Tangerine
        accentBlue: "#3458c9", // Sapphire
        accentPink: "#d03e6e", // Fuchsia
        background: "#e9e5dd", // Sand
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
