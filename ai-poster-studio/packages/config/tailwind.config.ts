import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-warm": "var(--surface-warm)",
        "surface-cream": "var(--surface-cream)",
        fg: "var(--fg)",
        "fg-2": "var(--fg-2)",
        muted: "var(--muted)",
        meta: "var(--meta)",
        border: "var(--border)",
        "border-soft": "var(--border-soft)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          active: "var(--accent-active)",
          soft: "var(--accent-soft)",
        },
        success: "var(--success)",
        warn: "var(--warn)",
        danger: "var(--danger)",
        ws: {
          canvas: "var(--ws-canvas)",
          panel: "var(--ws-panel)",
          "panel-2": "var(--ws-panel-2)",
          hairline: "var(--ws-hairline)",
          active: "var(--ws-active)",
        },
        timeline: {
          reading: "var(--timeline-reading)",
          extracting: "var(--timeline-extracting)",
          planning: "var(--timeline-planning)",
          rendering: "var(--timeline-rendering)",
          critique: "var(--timeline-critique)",
          done: "var(--timeline-done)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        raised: "var(--shadow-raised)",
        elevated: "var(--shadow-elevated)",
        floating: "var(--shadow-floating)",
      },
      maxWidth: {
        marketing: "1280px",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
}

export default config