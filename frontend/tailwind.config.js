/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080705",
        surface: "#121012",
        "surface-elevated": "#1E1A1E",
        "text-primary": "#FFFFFF",
        "text-secondary": "#C9A9DD",
        border: "rgba(255,255,255,0.08)",
        accent: {
          main: "#9D4EDD",
          hover: "#E0AAFF",
          light: "#F3E8FF",
        },
        state: {
          success: "#28C76F",
          warning: "#FF9F43",
          error: "#EA5455",
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "sans-serif"],
      },
      fontSize: {
        h1: ["32px", { lineHeight: "1.1" }],
        h2: ["24px", { lineHeight: "1.1" }],
        h3: ["20px", { lineHeight: "1.35" }],
        subtitle: ["18px", { lineHeight: "1.35" }],
        body: ["16px", { lineHeight: "1.35" }],
        small: ["14px", { lineHeight: "1.35" }],
        caption: ["12px", { lineHeight: "1.6" }],
      },
      fontWeight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      spacing: {
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        6: "24px",
        8: "32px",
        10: "40px",
        16: "64px",
      },
      borderRadius: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "20px",
        pill: "9999px",
      },
      boxShadow: {
        card: "0 4px 16px rgba(0,0,0,0.35)",
        "glow-accent": "0 0 8px #640160, 0 0 16px #640160",
      },
      animation: {
        "fade-in": "fadeIn 250ms cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-in": "slideIn 250ms cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      transitionDuration: {
        fast: "150ms",
        normal: "250ms",
        slow: "400ms",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
}