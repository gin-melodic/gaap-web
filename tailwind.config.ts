import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // Enable dark mode support for future theme switching
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // GAAP Brand Colors - can be customized via plugins later
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // Additional color variables from shadcn/ui
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
      },
      // Mobile-first breakpoints
      screens: {
        'xs': '475px',
        // Existing breakpoints: sm, md, lg, xl, 2xl
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
