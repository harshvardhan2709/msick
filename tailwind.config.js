/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#190419ff",
        accent: "#7f19e6",
        "accent-light": "#a855f7",
        "accent-glow": "#b86dff",
        surface: "#0a0a0a",
        "surface-light": "#141414",
        "surface-card": "#1a1a2e",
        "glass-border": "rgba(127, 25, 230, 0.3)",
        "glass-bg": "rgba(25, 4, 25, 0.7)",
        "neon-purple": "#c084fc",
        "neon-pink": "#f472b6",
      },
    },
  },
  plugins: [],
};
