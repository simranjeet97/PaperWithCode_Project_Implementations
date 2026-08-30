/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#2563EB",
          blueHover: "#1D4ED8",
          blueLight: "#EFF6FF",
          emerald: "#059669",
          emeraldLight: "#ECFDF5",
          violet: "#7C3AED",
          violetLight: "#F5F3FF",
          amber: "#D97706",
          amberLight: "#FFFBEB",
          rose: "#DC2626",
          roseLight: "#FEF2F2",
          cyan: "#0284C7",
          cyanLight: "#F0F9FF",
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        display: ["var(--font-outfit)", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        soft: "0 2px 10px -2px rgba(0, 0, 0, 0.04), 0 1px 3px -1px rgba(0, 0, 0, 0.02)",
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
        cardHover: "0 12px 28px -6px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.03)",
        inputGlow: "0 0 0 4px rgba(37, 99, 235, 0.12)",
      },
    },
  },
  plugins: [],
};
