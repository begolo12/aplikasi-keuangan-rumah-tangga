import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--color-bg) / <alpha-value>)",
        surface: {
          DEFAULT: "hsl(var(--color-surface) / <alpha-value>)",
          2: "hsl(var(--color-surface-2) / <alpha-value>)",
          3: "hsl(var(--color-surface-3) / <alpha-value>)",
        },
        border: "hsl(var(--color-border) / <alpha-value>)",
        text: {
          DEFAULT: "hsl(var(--color-text) / <alpha-value>)",
          muted: "hsl(var(--color-text-muted) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--color-primary) / <alpha-value>)",
          fg: "hsl(var(--color-primary-fg) / <alpha-value>)",
          hover: "hsl(var(--color-primary-hover) / <alpha-value>)",
          subtle: "hsl(var(--color-primary-subtle) / <alpha-value>)",
        },
        income: {
          DEFAULT: "hsl(var(--color-income) / <alpha-value>)",
          subtle: "hsl(var(--color-income-subtle) / <alpha-value>)",
        },
        expense: {
          DEFAULT: "hsl(var(--color-expense) / <alpha-value>)",
          subtle: "hsl(var(--color-expense-subtle) / <alpha-value>)",
        },
        transfer: {
          DEFAULT: "hsl(var(--color-transfer) / <alpha-value>)",
          subtle: "hsl(var(--color-transfer-subtle) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--color-warning) / <alpha-value>)",
          subtle: "hsl(var(--color-warning-subtle) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "Manrope", "sans-serif"],
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        DEFAULT: "0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)",
      },
      borderRadius: {
        "xl": "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
